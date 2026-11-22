/* Thi Bút — bộ máy phân tích thơ tiếng Việt
 * Thanh điệu, vần, luật bằng trắc, niêm, gieo vần, gợi ý từ, dò trùng.
 * Dùng được trong trình duyệt (window.ThiBut) và Node (module.exports).
 */
(function (root) {
  'use strict';

  /* ---------- 1. Âm tiết ---------- */
  var TONE_MARKS = { '̀': 2, '́': 3, '̉': 4, '̃': 5, '̣': 6 };
  var TONE_NAMES = ['', 'ngang', 'huyền', 'sắc', 'hỏi', 'ngã', 'nặng'];
  var TONE_MARK_OF = { 1: '', 2: '̀', 3: '́', 4: '̉', 5: '̃', 6: '̣' };
  var INITIALS = ['ngh', 'ng', 'nh', 'ch', 'gh', 'gi', 'kh', 'ph', 'qu', 'th', 'tr',
    'b', 'c', 'd', 'đ', 'g', 'h', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'x'];
  var NUCLEI = ['iê', 'yê', 'uô', 'ươ', 'ia', 'ya', 'ua', 'ưa', 'a', 'ă', 'â', 'e', 'ê', 'i', 'y', 'o', 'ô', 'ơ', 'u', 'ư'];
  var NUC_NORM = { 'yê': 'iê', 'ia': 'iê', 'ya': 'iê', 'ua': 'uô', 'ưa': 'ươ', 'y': 'i' };
  var END_CLASS = { '': 'open', n: 'n', ng: 'n', nh: 'n', t: 't', c: 't', ch: 't', m: 'm', p: 'p', i: 'i', y: 'i', o: 'u', u: 'u' };
  var VOWELS = 'aăâeêioôơuưy';

  function toneOf(word) {
    var d = word.normalize('NFD');
    for (var i = 0; i < d.length; i++) if (TONE_MARKS[d[i]]) return TONE_MARKS[d[i]];
    return 1;
  }
  function stripTone(word) {
    return word.normalize('NFD').replace(/[̣̀́̉̃]/g, '').normalize('NFC');
  }
  function isVietWord(w) { return /[a-zA-ZÀ-ỹđĐ]/.test(w); }

  function splitInitial(s) {
    for (var i = 0; i < INITIALS.length; i++) {
      var c = INITIALS[i];
      if (s.indexOf(c) === 0 && s.length > c.length) {
        if (c === 'gi') {
          var nx = s[2];
          if (VOWELS.indexOf(nx) < 0) return ['g', s.slice(1)]; // gì, gìn
        }
        if (c === 'qu' && s.length === 2) continue;
        return [c, s.slice(c.length)];
      }
    }
    return ['', s];
  }

  function parseRime(r) {
    var medial = '';
    if (r[0] === 'o' && 'aăe'.indexOf(r[1]) >= 0 && r.length > 1) { medial = 'o'; r = r.slice(1); }
    else if (r[0] === 'u' && 'yêâơ'.indexOf(r[1]) >= 0 && r.length > 1) { medial = 'u'; r = r.slice(1); }
    var nuc = '', rest = r;
    for (var i = 0; i < NUCLEI.length; i++) {
      var n = NUCLEI[i];
      if (r.indexOf(n) === 0) {
        // 'ia','ua','ưa','ya' chỉ là nguyên âm đôi khi đứng cuối (kia, mua, mưa, khuya)
        if ((n === 'ia' || n === 'ua' || n === 'ưa' || n === 'ya') && r.length > 2) continue;
        nuc = n; rest = r.slice(n.length); break;
      }
    }
    if (!nuc) return null;
    var nn = NUC_NORM[nuc] || nuc;
    if (!(rest in END_CLASS)) return null;
    // "anh/ach" phát âm gần "ênh/êch"
    var phon = nn;
    if (nn === 'a' && (rest === 'nh' || rest === 'ch')) phon = 'ɛ';
    return { medial: medial, nucleus: nn, phon: phon, ending: rest, endClass: END_CLASS[rest] };
  }

  var _cache = Object.create(null);
  function analyzeSyllable(raw) {
    var lower = raw.toLowerCase();
    if (_cache[lower]) return _cache[lower];
    var tone = toneOf(lower);
    var bare = stripTone(lower);
    var sp = splitInitial(bare);
    var rime = sp[1];
    var p = parseRime(rime) || { medial: '', nucleus: rime, phon: rime, ending: '', endClass: '?' };
    var res = {
      text: raw, lower: lower, bare: bare, tone: tone, toneName: TONE_NAMES[tone],
      bt: (tone === 1 || tone === 2) ? 'B' : 'T',
      initial: sp[0], rime: rime,
      medial: p.medial, nucleus: p.nucleus, phon: p.phon, ending: p.ending, endClass: p.endClass,
      key: p.phon + '|' + p.ending
    };
    _cache[lower] = res;
    return res;
  }

  /* ---------- 2. So vần ---------- */
  var NEAR = {};
  [['a', 'ă'], ['ă', 'â'], ['a', 'â'], ['â', 'ơ'], ['e', 'ê'], ['ê', 'i'], ['i', 'iê'], ['iê', 'ê'], ['ɛ', 'ê'], ['ɛ', 'i'], ['ɛ', 'e'], ['a', 'ɛ'],
   ['o', 'ô'], ['ô', 'ơ'], ['ô', 'uô'], ['u', 'uô'], ['u', 'ô'], ['u', 'o'], ['ư', 'ươ'], ['ơ', 'ươ'], ['a', 'ươ'], ['ư', 'ơ']]
    .forEach(function (p) { NEAR[p[0] + '-' + p[1]] = NEAR[p[1] + '-' + p[0]] = 1; });

  /** 2 = vần chính, 1 = vần thông, 0.5 = vần ép (lỏng), 0 = không vần. Không xét thanh. */
  function rhymeScore(a, b) {
    if (typeof a === 'string') a = analyzeSyllable(a);
    if (typeof b === 'string') b = analyzeSyllable(b);
    if (a.endClass === '?' || b.endClass === '?') return 0;
    if (a.phon === b.phon && a.ending === b.ending) return 2;
    if (a.endClass !== b.endClass) return 0;
    if (a.phon === b.phon) return 1;
    if (NEAR[a.phon + '-' + b.phon]) return 1;
    if ((a.medial === 'o' && b.phon === 'o') || (b.medial === 'o' && a.phon === 'o')) return 1;
    return 0.5;
  }
  function rhymeLabel(s) { return s >= 2 ? 'vần chính' : s >= 1 ? 'vần thông' : s > 0 ? 'vần ép' : 'không vần'; }

  /* ---------- 3. Tách bài ---------- */
  function tokenizeLine(line) {
    var parts = line.split(/[\s\-–—]+/), out = [];
    var re = /[^0-9a-zA-ZÀ-ỹđĐ̀-ͯ]+/g;
    for (var i = 0; i < parts.length; i++) {
      var w = parts[i].replace(re, '');
      if (w && isVietWord(w)) out.push(w);
    }
    return out;
  }
  function parsePoem(text) {
    var raw = String(text || '').replace(/\r/g, '').split('\n');
    var lines = [], stanza = 0, prevBlank = false;
    for (var i = 0; i < raw.length; i++) {
      var t = raw[i].trim();
      if (!t) { if (lines.length && !prevBlank) stanza++; prevBlank = true; continue; }
      var toks = tokenizeLine(t);
      if (!toks.length) continue;
      prevBlank = false;
      lines.push({ idx: lines.length, src: i, text: t, stanza: stanza, syl: toks.map(analyzeSyllable) });
    }
    return lines;
  }

  /* ---------- 4. Thể thơ ---------- */
  var FORMS = {
    auto: { name: 'Tự nhận diện' },
    lucbat: { name: 'Lục bát', desc: 'Cặp câu 6 – 8. Chữ 2, 6, 8 bằng; chữ 4 trắc. Chữ 6 câu lục vần với chữ 6 câu bát; chữ 8 câu bát vần với chữ 6 câu lục sau.' },
    stlb: { name: 'Song thất lục bát', desc: 'Khổ 4 câu 7 – 7 – 6 – 8. Câu thất đầu: chữ 3 T, 5 B, 7 T; câu thất sau: 3 B, 5 T, 7 B. Chữ 7 câu đầu vần chữ 5 câu sau (vần trắc).' },
    that_tu: { name: 'Thất ngôn tứ tuyệt', desc: '4 câu × 7 chữ, Đường luật. “Nhất tam ngũ bất luận, nhị tứ lục phân minh.” Vần bằng ở cuối câu 1, 2, 4. Niêm 1–4, 2–3.' },
    that_bat: { name: 'Thất ngôn bát cú', desc: '8 câu × 7 chữ, Đường luật. Vần bằng ở cuối câu 1, 2, 4, 6, 8. Niêm 1–8, 2–3, 4–5, 6–7.' },
    ngu_tu: { name: 'Ngũ ngôn tứ tuyệt', desc: '4 câu × 5 chữ. Chữ 2 và 4 đối thanh; vần bằng ở cuối câu 1 (tùy), 2, 4.' },
    tam: { name: 'Thơ 8 chữ', desc: 'Mỗi câu 8 chữ, thường ngắt 3/5 hoặc 3/2/3. Gieo vần chân: liền (AABB), chéo (ABAB) hoặc ôm (ABBA); vần bằng – trắc xen kẽ.' },
    bay: { name: 'Thơ 7 chữ (thơ mới)', desc: 'Mỗi câu 7 chữ, ngắt 4/3. Thường gieo vần chéo hoặc vần liền theo khổ.' },
    nam: { name: 'Thơ 5 chữ', desc: 'Mỗi câu 5 chữ, ngắt 2/3 hoặc 3/2. Vần chân linh hoạt theo khổ.' },
    bon: { name: 'Thơ 4 chữ', desc: 'Mỗi câu 4 chữ, nhịp 2/2, gieo vần chân hoặc vần lưng.' },
    tudo: { name: 'Thơ tự do', desc: 'Không gò số chữ, vần, luật. Công cụ chỉ thống kê nhịp, vần và từ lặp để bạn tự cân nhắc.' }
  };

  function detectForm(lines) {
    var n = lines.length;
    if (!n) return 'tudo';
    var c = lines.map(function (l) { return l.syl.length; });
    function ratio(pred) { var k = 0; for (var i = 0; i < n; i++) if (pred(c[i], i)) k++; return k / n; }
    if (n >= 2 && ratio(function (x, i) { return x === (i % 2 ? 8 : 6); }) >= 0.75) return 'lucbat';
    if (n >= 4 && ratio(function (x, i) { return x === [7, 7, 6, 8][i % 4]; }) >= 0.75) return 'stlb';
    if (n === 4 && ratio(function (x) { return x === 7; }) >= 0.75) return 'that_tu';
    if (n === 8 && ratio(function (x) { return x === 7; }) >= 0.75) return 'that_bat';
    if (n === 4 && ratio(function (x) { return x === 5; }) >= 0.75) return 'ngu_tu';
    var counts = {}; c.forEach(function (x) { counts[x] = (counts[x] || 0) + 1; });
    var best = 0, bestN = 0; for (var k in counts) if (counts[k] > bestN) { bestN = counts[k]; best = +k; }
    if (bestN / n >= 0.7) {
      if (best === 8) return 'tam';
      if (best === 7) return 'bay';
      if (best === 5) return 'nam';
      if (best === 4) return 'bon';
    }
    return 'tudo';
  }

  /* ---------- 5. Kiểm tra luật ---------- */
  // Mỗi vị trí: exp = 'B' | 'T' | null ; rhyme slot: {group, role}
  function newState(lines) {
    return lines.map(function (l) { return l.syl.map(function () { return { exp: null, why: '', rhyme: null }; }); });
  }

  function checkPoem(text, formKey) {
    var lines = parsePoem(text);
    var detected = detectForm(lines);
    var form = (formKey && formKey !== 'auto') ? formKey : detected;
    var st = newState(lines);
    var issues = [];
    var links = []; // {a:[l,p], b:[l,p], kind}
    var meta = { luat: null };

    function L(i) { return lines[i]; }
    function setExp(li, pos, bt, why) {
      if (!lines[li] || pos > lines[li].syl.length) return;
      st[li][pos - 1].exp = bt; st[li][pos - 1].why = why;
    }
    function link(a, b, kind, tone) {
      if (!lines[a[0]] || !lines[b[0]]) return;
      if (a[1] > lines[a[0]].syl.length || b[1] > lines[b[0]].syl.length) return;
      links.push({ a: a, b: b, kind: kind || 'vần', tone: tone || null });
    }
    function wantLen(li, n, label) {
      var k = L(li).syl.length;
      if (k !== n) issues.push({ level: 'error', line: li, msg: 'Câu ' + (li + 1) + (label ? ' (' + label + ')' : '') + ' có ' + k + ' chữ, cần ' + n + ' chữ.' });
    }

    if (form === 'lucbat') {
      for (var i = 0; i < lines.length; i++) {
        var isLuc = i % 2 === 0;
        wantLen(i, isLuc ? 6 : 8, isLuc ? 'lục' : 'bát');
        setExp(i, 2, 'B', 'Chữ 2 câu ' + (isLuc ? 'lục' : 'bát') + ' phải bằng');
        setExp(i, 4, 'T', 'Chữ 4 phải trắc');
        setExp(i, 6, 'B', 'Chữ 6 phải bằng');
        if (!isLuc) {
          setExp(i, 8, 'B', 'Chữ 8 câu bát phải bằng');
          link([i - 1, 6], [i, 6], 'vần lục – bát', 'B');
          if (i + 1 < lines.length) link([i, 8], [i + 1, 6], 'vần bát – lục', 'B');
          var s6 = L(i).syl[5], s8 = L(i).syl[7];
          if (s6 && s8 && s6.bt === 'B' && s8.bt === 'B' && s6.tone === s8.tone) {
            issues.push({ level: 'info', line: i, pos: 8, msg: 'Câu ' + (i + 1) + ': chữ 6 và chữ 8 cùng thanh ' + s6.toneName + '. Thường nên đổi một chữ huyền, một chữ ngang cho câu bát êm hơn.' });
          }
        }
      }
      if (lines.length % 2 === 1 && lines.length > 1) issues.push({ level: 'warn', line: lines.length - 1, msg: 'Bài lục bát nên kết bằng câu bát (8 chữ).' });
    }
    else if (form === 'stlb') {
      for (var j = 0; j < lines.length; j++) {
        var r = j % 4;
        var lab = ['thất 1', 'thất 2', 'lục', 'bát'][r];
        wantLen(j, [7, 7, 6, 8][r], lab);
        if (r === 0) { setExp(j, 3, 'T', 'Câu thất đầu: chữ 3 trắc'); setExp(j, 5, 'B', 'Câu thất đầu: chữ 5 bằng'); setExp(j, 7, 'T', 'Câu thất đầu: chữ 7 trắc'); link([j, 7], [j + 1, 5], 'vần trắc thất – thất', 'T'); }
        if (r === 1) { setExp(j, 3, 'B', 'Câu thất sau: chữ 3 bằng'); setExp(j, 5, 'T', 'Câu thất sau: chữ 5 trắc'); setExp(j, 7, 'B', 'Câu thất sau: chữ 7 bằng'); link([j, 7], [j + 1, 6], 'vần thất – lục', 'B'); }
        if (r === 2) { setExp(j, 2, 'B', 'Chữ 2 câu lục bằng'); setExp(j, 4, 'T', 'Chữ 4 câu lục trắc'); setExp(j, 6, 'B', 'Chữ 6 câu lục bằng'); link([j, 6], [j + 1, 6], 'vần lục – bát', 'B'); }
        if (r === 3) { setExp(j, 2, 'B', 'Chữ 2 câu bát bằng'); setExp(j, 4, 'T', 'Chữ 4 câu bát trắc'); setExp(j, 6, 'B', 'Chữ 6 câu bát bằng'); setExp(j, 8, 'B', 'Chữ 8 câu bát bằng'); link([j, 8], [j + 1, 5], 'vần bát – thất', 'B'); }
      }
    }
    else if (form === 'that_tu' || form === 'that_bat' || form === 'ngu_tu') {
      var len = form === 'ngu_tu' ? 5 : 7;
      var need = form === 'that_bat' ? 8 : 4;
      if (lines.length !== need) issues.push({ level: 'error', msg: FORMS[form].name + ' cần đúng ' + need + ' câu, bài hiện có ' + lines.length + ' câu.' });
      var first = lines[0] && lines[0].syl[1];
      var s0 = first ? first.bt : 'B';
      meta.luat = s0 === 'B' ? 'luật bằng' : 'luật trắc';
      var posList = len === 7 ? [2, 4, 6] : [2, 4];
      var rhymeLines = form === 'that_bat' ? [0, 1, 3, 5, 7] : [0, 1, 3];
      for (var k = 0; k < lines.length; k++) {
        wantLen(k, len);
        var s = (((k + 1) >> 1) % 2 === 0) ? s0 : (s0 === 'B' ? 'T' : 'B');
        posList.forEach(function (p, pi) {
          var want = pi % 2 === 0 ? s : (s === 'B' ? 'T' : 'B');
          var why = 'Chữ ' + p + ' câu ' + (k + 1) + ' phải ' + (want === 'B' ? 'bằng' : 'trắc') + ' (' + meta.luat + (k ? ', niêm và đối' : '') + ')';
          setExp(k, p, want, why);
        });
        var isRhyme = rhymeLines.indexOf(k) >= 0;
        setExp(k, len, isRhyme ? 'B' : 'T', isRhyme ? 'Chữ cuối câu ' + (k + 1) + ' gieo vần bằng' : 'Chữ cuối câu không vần nên là trắc');
        if (isRhyme && k !== 1) link([1, len], [k, len], 'vần chân', 'B');
      }
    }
    else {
      // thơ mới / tự do: vần chân trong từng khổ
      var target = { tam: 8, bay: 7, nam: 5, bon: 4 }[form];
      if (target) {
        lines.forEach(function (l, li) {
          var d = l.syl.length - target;
          if (d) issues.push({ level: Math.abs(d) > 1 ? 'warn' : 'info', line: li, msg: 'Câu ' + (li + 1) + ' có ' + l.syl.length + ' chữ (thể ' + FORMS[form].name.toLowerCase() + ' thường ' + target + ' chữ).' });
        });
      }
    }

    // Đánh dấu nhóm vần
    var groups = [];
    links.forEach(function (lk, gi) {
      lk.id = gi;
      var A = lines[lk.a[0]].syl[lk.a[1] - 1], B = lines[lk.b[0]].syl[lk.b[1] - 1];
      lk.score = rhymeScore(A, B);
      [lk.a, lk.b].forEach(function (pt) { var c = st[pt[0]][pt[1] - 1]; c.rhyme = c.rhyme || []; c.rhyme.push(gi); });
      var where = 'câu ' + (lk.a[0] + 1) + ' chữ ' + lk.a[1] + ' «' + A.text + '» và câu ' + (lk.b[0] + 1) + ' chữ ' + lk.b[1] + ' «' + B.text + '»';
      if (lk.score === 0) issues.push({ level: 'error', line: lk.b[0], pos: lk.b[1], link: gi, msg: 'Lạc vần: ' + where + ' không hiệp vần (' + lk.kind + ').' });
      else if (lk.score < 1) issues.push({ level: 'warn', line: lk.b[0], pos: lk.b[1], link: gi, msg: 'Vần ép: ' + where + ' chỉ gần vần.' });
      else if (A.bare === B.bare) issues.push({ level: 'info', line: lk.b[0], pos: lk.b[1], link: gi, msg: 'Trùng chữ gieo vần: ' + where + '.' });
    });

    // So thanh
    var total = 0, ok = 0;
    lines.forEach(function (l, li) {
      l.syl.forEach(function (s, pi) {
        var c = st[li][pi];
        if (!c.exp) return;
        total++;
        if (s.bt === c.exp) { ok++; c.ok = true; }
        else { c.ok = false; issues.push({ level: 'error', line: li, pos: pi + 1, msg: 'Thất luật: ' + c.why + ', nhưng «' + s.text + '» là thanh ' + s.toneName + ' (' + (s.bt === 'B' ? 'bằng' : 'trắc') + ').' }); }
      });
    });
    links.forEach(function (lk) { total++; if (lk.score >= 1) ok++; else if (lk.score > 0) ok += 0.5; });

    // Sơ đồ vần chân theo khổ (cho mọi thể)
    var scheme = rhymeScheme(lines);
    if (!links.length && lines.length > 1) {
      lines.forEach(function (l, li) {
        if (scheme.letters[li] && scheme.single[li] && lines.length > 2) {
          issues.push({ level: 'info', line: li, pos: l.syl.length, msg: 'Câu ' + (li + 1) + ': chữ cuối «' + l.syl[l.syl.length - 1].text + '» chưa hiệp vần với câu nào trong khổ.' });
        }
      });
    }

    // Từ lặp
    var freq = {};
    lines.forEach(function (l) { l.syl.forEach(function (s) { if (!STOP[s.lower]) freq[s.lower] = (freq[s.lower] || 0) + 1; }); });
    var reps = Object.keys(freq).filter(function (w) { return freq[w] >= 3; });
    if (reps.length) issues.push({ level: 'info', msg: 'Chữ lặp nhiều lần: ' + reps.map(function (w) { return '«' + w + '» ×' + freq[w]; }).join(', ') + '. Nếu không phải điệp từ có chủ ý, cân nhắc thay từ đồng nghĩa.' });

    var order = { error: 0, warn: 1, info: 2 };
    issues.sort(function (a, b) { return order[a.level] - order[b.level] || (a.line || 0) - (b.line || 0); });
    return { lines: lines, state: st, links: links, issues: issues, form: form, detected: detected, meta: meta, scheme: scheme,
      score: total ? Math.round(ok / total * 100) : null, checks: total };
  }

  function rhymeScheme(lines) {
    var letters = [], single = [], ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var byStanza = {};
    lines.forEach(function (l, i) { (byStanza[l.stanza] = byStanza[l.stanza] || []).push(i); });
    Object.keys(byStanza).forEach(function (k) {
      var idx = byStanza[k], used = [];
      idx.forEach(function (i) {
        var last = lines[i].syl[lines[i].syl.length - 1];
        var found = -1;
        for (var u = 0; u < used.length; u++) if (rhymeScore(used[u].s, last) >= 1 && used[u].s.bt === last.bt) { found = u; break; }
        if (found < 0) { used.push({ s: last, n: 1 }); found = used.length - 1; } else used[found].n++;
        letters[i] = ABC[found % 26];
        lines[i]._g = found;
      });
      idx.forEach(function (i) { single[i] = used[lines[i]._g].n === 1; });
    });
    var str = Object.keys(byStanza).map(function (k) { return byStanza[k].map(function (i) { return letters[i]; }).join(''); }).join(' / ');
    return { letters: letters, single: single, text: str };
  }

  var STOP = {};
  ('và với của là thì mà cho có không những các một hai ta em anh tôi người đã đang sẽ ra vào lên xuống ai này kia đâu nào còn như cũng lại rằng thế vì nên được bao chi gì đi về trong ngoài trên dưới sao ơi ôi hỡi ấy đó nữa mấy bấy để từ cùng')
    .split(' ').forEach(function (w) { STOP[w] = 1; });

  /* ---------- 6. Từ vựng ---------- */
  var LEXICON = (
    'trăng vàng,trăng thanh,trăng khuya,ánh trăng,vầng trăng,bóng trăng,mây trời,mây trắng,mây bay,mây ngàn,gió đông,gió heo may,gió thu,gió chiều,gió ngàn,làn gió,' +
    'mưa phùn,mưa bay,mưa ngâu,giọt mưa,cơn mưa,nắng vàng,nắng hồng,nắng mai,nắng chiều,nắng hạ,sương mai,sương khói,sương đêm,sương mờ,sương sa,' +
    'sông dài,dòng sông,bến sông,con đò,bến đò,đò ngang,bờ tre,lũy tre,cây đa,mái đình,giếng nước,sân đình,cánh đồng,đồng xanh,lúa vàng,ruộng lúa,' +
    'núi non,non xanh,non cao,núi rừng,đầu non,rừng sâu,suối reo,thác đổ,biển xanh,biển cả,sóng biển,con sóng,cánh buồm,thuyền câu,con thuyền,mái chèo,' +
    'hoa đào,hoa mai,hoa sen,hoa cúc,hoa lan,hoa sữa,hoa cau,hoa bưởi,hoa súng,hoa gạo,cánh hoa,nhành mai,cành đào,lá vàng,lá rơi,lá thu,lá xanh,lá me,' +
    'mùa xuân,mùa hạ,mùa thu,mùa đông,xuân sang,thu sang,đông về,hè về,ngày xuân,chiều thu,đêm đông,chiều tà,hoàng hôn,bình minh,ban mai,canh khuya,đêm khuya,' +
    'quê hương,quê nhà,làng quê,xóm làng,đường làng,ngõ nhỏ,mái tranh,khói bếp,mẹ cha,mẹ hiền,cha già,ông bà,anh em,bè bạn,cố nhân,cố hương,' +
    'tình yêu,tình duyên,mối tình,ân tình,nghĩa tình,thương yêu,yêu thương,nhớ thương,thương nhớ,mong chờ,đợi chờ,chờ mong,hẹn hò,lời hẹn,ước hẹn,' +
    'nỗi buồn,nỗi nhớ,niềm vui,hạnh phúc,ngậm ngùi,bùi ngùi,xót xa,đau thương,chia ly,biệt ly,chia xa,ly biệt,xa cách,cách xa,xa xôi,xa vời,' +
    'mênh mang,mênh mông,bao la,bát ngát,thênh thang,lang thang,mơ màng,mơ hồ,mong manh,lênh đênh,chênh vênh,bâng khuâng,ngẩn ngơ,thẫn thờ,bơ vơ,lẻ loi,cô đơn,quạnh hiu,hiu hắt,' +
    'êm đềm,dịu dàng,nhẹ nhàng,thướt tha,mặn mà,đậm đà,thiết tha,tha thiết,nồng nàn,say đắm,đắm say,ngọt ngào,ấm áp,dạt dào,rộn ràng,xôn xao,' +
    'lặng lẽ,lặng im,im lìm,vắng lặng,tĩnh lặng,thầm lặng,âm thầm,lặng thầm,xào xạc,rì rào,thì thầm,thầm thì,róc rách,lao xao,líu lo,véo von,' +
    'thời gian,năm tháng,tháng năm,ngày tháng,ngày mai,hôm qua,ngày xưa,thuở xưa,thuở nào,ngàn năm,muôn đời,trọn đời,một đời,cuộc đời,kiếp người,' +
    'trái tim,con tim,tâm hồn,linh hồn,ánh mắt,đôi mắt,mắt biếc,môi hồng,má hồng,tóc mây,mái tóc,tóc thề,bàn tay,vòng tay,bờ vai,dáng hình,bóng hình,' +
    'áo dài,áo trắng,nón lá,khăn tay,chiếc khăn,trang thư,lá thư,phong thư,câu thơ,vần thơ,bài thơ,trang giấy,ngọn bút,cung đàn,tiếng đàn,lời ca,câu hò,điệu ru,lời ru,' +
    'tiếng chim,cánh chim,cánh cò,con cò,cánh én,chim én,con ve,tiếng ve,tiếng gà,con bướm,cánh bướm,đàn ong,chú dế,' +
    'xanh xanh,xanh biếc,xanh thẳm,xanh ngắt,biếc xanh,vàng vọt,vàng úa,đỏ thắm,hồng hồng,trắng trong,tím biếc,tím ngắt,mờ mờ,mờ xa,nhạt nhòa,' +
    'đi về,trở về,quay về,ra đi,lên đường,dặm trường,đường xa,muôn nẻo,ngã ba,ngã tư,chân trời,góc trời,bầu trời,trời xanh,trời cao,đất trời,non sông,đất nước,giang sơn,' +
    'nước non,sông núi,tổ quốc,quê cha,biển đông,trường sơn,cửu long,' +
    'mây trôi,nước trôi,thuyền trôi,lững lờ,lơ lửng,chơi vơi,rơi rơi,bay bay,phất phơ,lả lơi,chập chờn,lấp lánh,long lanh,lung linh,rực rỡ,huy hoàng,' +
    'ngân nga,thong thả,ung dung,nhàn nhã,thảnh thơi,thanh thản,bình yên,yên bình,an nhiên,thanh bình,thái bình,' +
    'ước mơ,giấc mơ,mộng mơ,giấc mộng,mơ mộng,hoài bão,khát khao,ước ao,mong ước,hy vọng,niềm tin,ánh sáng,ngọn đèn,ánh đèn,ngọn lửa,bếp lửa,' +
    'nhớ nhung,tương tư,thầm yêu,thương thầm,nhớ nhà,nhớ quê,nhớ mẹ,nhớ em,nhớ anh,chờ em,đợi anh,người ơi,em ơi,anh ơi,mình ơi,' +
    'duyên phận,định mệnh,số phận,phận người,ba sinh,nợ duyên,tơ hồng,trầu cau,cau trầu,miếng trầu,se tơ,kết tóc,' +
    'nghìn trùng,muôn trùng,ngàn trùng,ngàn dặm,muôn dặm,vạn dặm,ngút ngàn,trùng khơi,biển khơi,ra khơi,' +
    'phố cũ,phố xưa,hàng cây,góc phố,con đường,lối nhỏ,lối mòn,quán nhỏ,ly cà phê,hiên nhà,thềm xưa,bậc thềm,ô cửa,song cửa,rèm thưa,' +
    'mỏi mòn,héo hon,hao gầy,gầy guộc,phôi pha,nhạt phai,phai tàn,tàn phai,úa tàn,héo úa,vỡ tan,tan vỡ,rã rời,tơi bời,' +
    'mai sau,về sau,muôn thuở,ngàn thu,thiên thu,vĩnh hằng,mãi mãi,vẹn nguyên,trọn vẹn,son sắt,thủy chung,chung thủy,sắt son,' +
    'trầm ngâm,đăm chiêu,trầm tư,suy tư,ngẫm nghĩ,lắng nghe,lặng nhìn,ngắm nhìn,dõi theo,trông theo,ngóng trông,trông chờ,' +
    'chiều buông,hoàng hôn buông,nắng tắt,trăng lên,sao mờ,sao khuya,ngàn sao,vì sao,ngôi sao,dải ngân,sông ngân,ngân hà,' +
    'đêm thâu,đêm trường,canh dài,canh thâu,năm canh,giọt sầu,mối sầu,u sầu,sầu thương,buồn thương,buồn tênh,buồn hiu,man mác,mênh mang buồn,' +
    'cười vang,nụ cười,tiếng cười,giọt lệ,lệ rơi,nước mắt,khóc thầm,nghẹn ngào,thổn thức,rưng rưng,' +
    'tre xanh,trúc xanh,hàng cau,vườn cau,bờ ao,ao sen,ao thu,ruộng đồng,cánh diều,con trâu,trâu cày,đồng chiêm,mùa gặt,' +
    'chim bay,ngựa phi,kiếm cung,gươm đao,chiến chinh,sa trường,biên ải,quan san,ải xa,' +
    'thơ ngây,ngây thơ,dại khờ,khờ dại,hồn nhiên,trong veo,trong xanh,trong lành,tinh khôi,thanh khiết,thơm tho,ngát hương,hương thơm,mùi hương,hương sen,hương cau,hương bưởi,' +
    'vấn vương,vương vấn,bâng quơ,vu vơ,ngập ngừng,bối rối,e ấp,thẹn thùng,ngại ngùng,bẽn lẽn,lặng câm,ngỡ ngàng,sững sờ,' +
    'ngàn hoa,vườn hoa,muôn hoa,trăm hoa,hoa rơi,hoa tàn,hoa nở,nụ hoa,búp non,lộc biếc,chồi non,mầm xanh,' +
    'thương ai,nhớ ai,vì ai,cho ai,ai về,ai đi,ai ơi,bến xưa,người xưa,chuyện xưa,tình xưa,lối xưa,mái xưa'
  ).split(',');

  function buildInventory(corpusPoems) {
    var inv = Object.create(null), next = Object.create(null), lastSyl = Object.create(null), endings = [];
    function add(s, w) { var a = analyzeSyllable(s); var k = a.lower; inv[k] = (inv[k] || 0) + (w || 1); }
    LEXICON.forEach(function (ph) { ph.split(' ').forEach(function (s) { add(s, 2); }); });
    corpusPoems.forEach(function (p, pi) {
      parsePoem(p.text).forEach(function (l, li) {
        for (var i = 0; i < l.syl.length; i++) {
          var s = l.syl[i];
          add(s.lower, 1);
          if (i > 0) { var prev = l.syl[i - 1].lower; var m = next[prev] || (next[prev] = Object.create(null)); m[s.lower] = (m[s.lower] || 0) + 1; }
        }
        var last = l.syl[l.syl.length - 1];
        if (last) (lastSyl[last.lower] = lastSyl[last.lower] || []).push([pi, li]);
      });
    });
    var phrases = Object.create(null); // âm tiết cuối -> cụm 2 chữ
    LEXICON.forEach(function (ph) {
      var parts = ph.split(' ');
      var k = parts[parts.length - 1].toLowerCase();
      (phrases[k] = phrases[k] || []).push(ph);
    });
    return { inv: inv, next: next, lastSyl: lastSyl, phrases: phrases };
  }

  /** Gợi ý âm tiết vần với `target`, lọc theo thanh `bt` ('B','T' hoặc null). */
  function suggestRhymes(target, bt, index, opts) {
    opts = opts || {};
    var t = typeof target === 'string' ? analyzeSyllable(target) : target;
    var out = [];
    for (var w in index.inv) {
      var a = analyzeSyllable(w);
      if (bt && a.bt !== bt) continue;
      var sc = rhymeScore(t, a);
      if (sc < (opts.min || 1)) continue;
      if (a.bare === t.bare && a.tone === t.tone) continue;
      out.push({ syl: w, score: sc, freq: index.inv[w], tone: a.toneName, bt: a.bt, phrases: (index.phrases[w] || []).slice(0, 6) });
    }
    out.sort(function (x, y) { return y.score - x.score || y.freq - x.freq || x.syl.localeCompare(y.syl, 'vi'); });
    return out.slice(0, opts.limit || 80);
  }

  /** Gợi ý từ theo ngữ cảnh: chữ hay đứng sau `prev` trong kho thơ, lọc thanh. */
  function suggestNext(prev, bt, index, limit) {
    var m = index.next[(prev || '').toLowerCase()];
    if (!m) return [];
    var out = [];
    for (var w in m) { var a = analyzeSyllable(w); if (bt && a.bt !== bt) continue; out.push({ syl: w, freq: m[w], bt: a.bt, tone: a.toneName }); }
    out.sort(function (x, y) { return y.freq - x.freq; });
    return out.slice(0, limit || 24);
  }

  /** Tạo các dạng thanh khác của cùng một âm tiết (đổi thanh giữ vần). */
  function toneVariants(word) {
    var bare = stripTone(word.toLowerCase());
    var d = bare.normalize('NFD');
    // vị trí đặt dấu: nguyên âm có dấu phụ ưu tiên, sau đó quy tắc kiểu mới đơn giản
    var chars = Array.from(bare), vIdx = [];
    chars.forEach(function (c, i) { if ('aăâeêioôơuưy'.indexOf(c) >= 0) vIdx.push(i); });
    if (!vIdx.length) return [];
    var sp = splitInitial(bare);
    var offset = sp[0].length;
    vIdx = vIdx.filter(function (i) { return i >= offset; });
    if (!vIdx.length) return [];
    var pos = vIdx[0];
    var special = vIdx.filter(function (i) { return 'ăâêôơư'.indexOf(chars[i]) >= 0; });
    if (special.length) pos = special[special.length - 1];
    else if (vIdx.length >= 2) {
      var endsWithVowel = vIdx[vIdx.length - 1] === chars.length - 1;
      pos = endsWithVowel ? vIdx[vIdx.length - 2] : vIdx[vIdx.length - 1];
      if (endsWithVowel && vIdx.length === 3) pos = vIdx[1];
    }
    var out = [];
    for (var t = 1; t <= 6; t++) {
      var c2 = chars.slice();
      c2[pos] = (c2[pos] + TONE_MARK_OF[t]).normalize('NFC');
      out.push({ syl: c2.join(''), tone: TONE_NAMES[t], bt: t <= 2 ? 'B' : 'T' });
    }
    return out;
  }

  /* ---------- 7. Dò trùng ---------- */
  function grams(syls, n) {
    var g = [];
    for (var i = 0; i + n <= syls.length; i++) g.push(syls.slice(i, i + n).join(' '));
    return g;
  }
  function buildSimIndex(corpusPoems) {
    var idx = Object.create(null), lines = [];
    corpusPoems.forEach(function (p, pi) {
      parsePoem(p.text).forEach(function (l, li) {
        var syls = l.syl.map(function (s) { return s.bare; });
        var id = lines.length;
        lines.push({ poem: pi, line: li, text: l.text, syls: syls });
        var gs = grams(syls, 3);
        if (!gs.length && syls.length >= 2) gs = grams(syls, 2);
        gs.forEach(function (g) { (idx[g] = idx[g] || []).push(id); });
      });
    });
    return { idx: idx, lines: lines };
  }
  function findSimilar(text, sim, opts) {
    opts = opts || {};
    var min = opts.min || 0.34;
    var res = [];
    parsePoem(text).forEach(function (l, li) {
      var syls = l.syl.map(function (s) { return s.bare; });
      if (syls.length < 3) return;
      var gs = grams(syls, 3), uniq = {}, hits = Object.create(null);
      gs.forEach(function (g) { if (uniq[g]) return; uniq[g] = 1; (sim.idx[g] || []).forEach(function (id) { hits[id] = (hits[id] || 0) + 1; }); });
      var n = Object.keys(uniq).length, best = null;
      for (var id in hits) {
        var c = sim.lines[id];
        var denom = Math.max(n, Math.max(1, c.syls.length - 2));
        var sc = hits[id] / denom;
        if (c.syls.join(' ') === syls.join(' ')) sc = 1;
        if (!best || sc > best.score) best = { score: sc, ref: c };
      }
      if (best && best.score >= min) res.push({ line: li, text: l.text, score: best.score, ref: best.ref });
    });
    return res;
  }

  var api = {
    analyzeSyllable: analyzeSyllable, toneOf: toneOf, stripTone: stripTone, rhymeScore: rhymeScore, rhymeLabel: rhymeLabel,
    parsePoem: parsePoem, detectForm: detectForm, checkPoem: checkPoem, rhymeScheme: rhymeScheme, FORMS: FORMS, TONE_NAMES: TONE_NAMES,
    LEXICON: LEXICON, buildInventory: buildInventory, suggestRhymes: suggestRhymes, suggestNext: suggestNext, toneVariants: toneVariants,
    buildSimIndex: buildSimIndex, findSimilar: findSimilar
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ThiBut = api;
})(this);
