// Poenote — phần lõi của API lưu thư viện trên Netlify.
// Tách khỏi @netlify/blobs để chạy thử được bằng một kho giả trong bộ nhớ.
//
//   GET    /api/status          { claimed, count }
//   POST   /api/claim           { code }   đặt mã chủ sổ (chỉ một lần)
//   POST   /api/login           { code }   kiểm tra mã
//   GET    /api/library         { title, poems }
//   PUT    /api/poems/:id       { poem }   thêm / sửa (cần mã)
//   DELETE /api/poems/:id                  xoá (cần mã)
//   GET    /api/media/:key                 ảnh / nhạc đã tải lên

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const LIB_TITLE = "Laint's Poem";
const MAX_IMAGE = 3 * 1024 * 1024;
const MAX_AUDIO = 3.5 * 1024 * 1024;
const MAX_FAILS = 8;
const LOCK_MS = 15 * 60 * 1000;
const ID_RE = /^[A-Za-z0-9-]{6,64}$/;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,PUT,POST,DELETE,OPTIONS',
  'access-control-allow-headers': 'content-type,x-owner-code',
  'access-control-max-age': '86400',
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...CORS, ...extra },
  });
}
const fail = (status, message) => json({ error: message }, status);

function hashCode(code, salt) { return scryptSync(String(code), salt, 32).toString('hex'); }

function str(v, max) { return typeof v === 'string' ? v.slice(0, max) : ''; }

function cleanMusic(m) {
  if (!m || typeof m !== 'object') return null;
  const out = { type: str(m.type, 20), label: str(m.label, 40), title: str(m.title, 200) };
  if (m.url) out.url = str(m.url, 1000);
  if (m.embed) out.embed = str(m.embed, 1000);
  if (m.height) out.height = Math.min(600, Math.max(80, Number(m.height) || 152));
  if (m.src) out.src = str(m.src, 6 * 1024 * 1024);
  if (out.url && !/^https?:\/\//.test(out.url)) delete out.url;
  if (out.embed && !/^https:\/\//.test(out.embed)) delete out.embed;
  return out;
}

function cleanPoem(p, id) {
  const now = new Date().toISOString();
  return {
    id,
    title: str(p.title, 200).trim() || 'Không tên',
    text: str(p.text, 30000),
    form: str(p.form, 40),
    color: ['lime', 'mint', 'beige', 'blush', 'sky'].includes(p.color) ? p.color : 'lime',
    image: str(p.image, 6 * 1024 * 1024),
    music: cleanMusic(p.music),
    createdAt: str(p.createdAt, 40) || now,
    updatedAt: now,
  };
}

function parseDataUrl(u) {
  const m = /^data:([a-z0-9.+/-]+)(?:;[^,]*)?;base64,(.*)$/is.exec(u || '');
  if (!m) return null;
  return { type: m[1].toLowerCase(), bytes: Buffer.from(m[2], 'base64') };
}

/**
 * store: { get(key, {type:'json'|'arrayBuffer'}), getWithMetadata(key,{type}), setJSON(key,val), set(key,data,{metadata}), delete(key) }
 */
export function makeHandler(getStores) {
  return async function handle(req) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const { data, media } = getStores();
    const url = new URL(req.url);
    const parts = url.pathname.replace(/^\/(\.netlify\/functions\/api|api)\/?/, '').split('/').filter(Boolean);
    const route = parts[0] || '';

    const readLib = async () => (await data.get('library', { type: 'json' })) || { title: LIB_TITLE, poems: [] };
    const owner = () => data.get('owner', { type: 'json' });

    async function body() {
      try { return await req.json(); } catch { return {}; }
    }
    async function checkCode(code) {
      const o = await owner();
      if (!o) return { ok: false, status: 409, message: 'Sổ chưa có mã chủ sổ.' };
      const lock = (await data.get('fails', { type: 'json' })) || { n: 0, until: 0 };
      if (lock.until > Date.now()) return { ok: false, status: 429, message: 'Nhập sai nhiều lần. Thử lại sau 15 phút.' };
      const got = Buffer.from(hashCode(code || '', o.salt), 'hex');
      const want = Buffer.from(o.hash, 'hex');
      if (code && got.length === want.length && timingSafeEqual(got, want)) {
        if (lock.n) await data.setJSON('fails', { n: 0, until: 0 });
        return { ok: true };
      }
      const n = lock.n + 1;
      await data.setJSON('fails', n >= MAX_FAILS ? { n: 0, until: Date.now() + LOCK_MS } : { n, until: 0 });
      return { ok: false, status: 401, message: 'Mã chủ sổ không đúng.' };
    }
    async function needOwner() {
      const r = await checkCode(req.headers.get('x-owner-code'));
      return r.ok ? null : fail(r.status, r.message);
    }
    async function storeMedia(key, dataUrl, kind) {
      const f = parseDataUrl(dataUrl);
      if (!f) throw Object.assign(new Error('Tệp không hợp lệ.'), { status: 400 });
      if (kind === 'image' && !/^image\/(jpeg|png|webp|gif)$/.test(f.type)) throw Object.assign(new Error('Ảnh phải là JPG, PNG, WEBP hoặc GIF.'), { status: 400 });
      if (kind === 'audio' && !/^audio\//.test(f.type)) throw Object.assign(new Error('Tệp nhạc không hợp lệ.'), { status: 400 });
      const max = kind === 'image' ? MAX_IMAGE : MAX_AUDIO;
      if (f.bytes.length > max) throw Object.assign(new Error(kind === 'image' ? 'Ảnh lớn hơn 3 MB.' : 'Tệp nhạc lớn hơn 3,5 MB.'), { status: 413 });
      await media.set(key, f.bytes, { metadata: { type: f.type } });
      return 'api/media/' + key + '?v=' + Date.now().toString(36);
    }

    try {
      if (route === 'status' && req.method === 'GET') {
        const lib = await readLib();
        return json({ claimed: !!(await owner()), count: lib.poems.length });
      }

      if (route === 'claim' && req.method === 'POST') {
        if (await owner()) return fail(409, 'Sổ đã có mã chủ sổ.');
        const { code } = await body();
        if (typeof code !== 'string' || code.trim().length < 6) return fail(400, 'Mã cần ít nhất 6 ký tự.');
        const salt = randomBytes(16).toString('hex');
        await data.setJSON('owner', { salt, hash: hashCode(code.trim(), salt), at: new Date().toISOString() });
        return json({ ok: true });
      }

      if (route === 'login' && req.method === 'POST') {
        const { code } = await body();
        const r = await checkCode(typeof code === 'string' ? code.trim() : '');
        return r.ok ? json({ ok: true }) : fail(r.status, r.message);
      }

      if (route === 'library' && req.method === 'GET') {
        return json(await readLib());
      }

      if (route === 'media' && req.method === 'GET' && parts[1]) {
        const r = await media.getWithMetadata(parts[1], { type: 'arrayBuffer' });
        if (!r || !r.data) return fail(404, 'Không tìm thấy tệp.');
        return new Response(r.data, { headers: { 'content-type': (r.metadata && r.metadata.type) || 'application/octet-stream', 'cache-control': 'public, max-age=31536000, immutable', ...CORS } });
      }

      if (route === 'poems' && parts[1]) {
        const id = parts[1];
        if (!ID_RE.test(id)) return fail(400, 'Mã bài không hợp lệ.');
        const denied = await needOwner();
        if (denied) return denied;

        if (req.method === 'PUT') {
          const { poem } = await body();
          if (!poem || typeof poem !== 'object') return fail(400, 'Thiếu bài thơ.');
          if (!String(poem.text || '').trim()) return fail(400, 'Bài thơ còn trống.');
          const p = cleanPoem(poem, id);
          if (/^data:/.test(p.image)) p.image = await storeMedia(id + '-img', p.image, 'image');
          else if (p.image && !/^(api\/media\/|library\/media\/|https:\/\/)/.test(p.image)) p.image = '';
          if (p.music && p.music.type === 'file') {
            if (/^data:/.test(p.music.src || '')) p.music.src = await storeMedia(id + '-audio', p.music.src, 'audio');
            else if (!/^(api\/media\/|library\/media\/)/.test(p.music.src || '')) p.music = null;
          }
          const lib = await readLib();
          const old = lib.poems.find((q) => q.id === id);
          if (old) p.createdAt = old.createdAt || p.createdAt;
          lib.title = LIB_TITLE;
          lib.poems = [p, ...lib.poems.filter((q) => q.id !== id)].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
          await data.setJSON('library', lib);
          return json({ ok: true, poem: p, updated: !!old });
        }

        if (req.method === 'DELETE') {
          const lib = await readLib();
          const victim = lib.poems.find((q) => q.id === id);
          if (!victim) return json({ ok: true, missing: true });
          lib.poems = lib.poems.filter((q) => q.id !== id);
          await data.setJSON('library', lib);
          await Promise.all([media.delete(id + '-img'), media.delete(id + '-audio')].map((p) => p.catch(() => {})));
          return json({ ok: true });
        }
      }

      return fail(404, 'Không có đường này.');
    } catch (e) {
      return fail(e.status || 500, e.status ? e.message : 'Máy chủ gặp lỗi: ' + (e.message || e));
    }
  };
}
