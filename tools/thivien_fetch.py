#!/usr/bin/env python3
"""
Lấy bài thơ từ thivien.net để nạp vào kho thơ của ứng dụng Thi Bút.

Chỉ dùng thư viện chuẩn của Python 3 (không cần cài thêm gì).

Cách dùng:
  # 1 hoặc nhiều bài thơ cụ thể
  python3 thivien_fetch.py "https://www.thivien.net/.../poem-xxxx" -o tho.json

  # Toàn bộ bài thơ trên trang một tác giả
  python3 thivien_fetch.py "https://www.thivien.net/.../author-xxxx" -o tacgia.json

  # Toàn bộ thơ của một hay nhiều tác giả (tìm theo tên, đi vào cả các tập thơ)
  python3 thivien_fetch.py --author "Xuân Quỳnh" --author "Huy Cận" -o kho.json

  # Một trang tìm kiếm (ví dụ theo thể thơ), lấy 3 trang kết quả, tối đa 60 bài
  python3 thivien_fetch.py "https://www.thivien.net/search-poem.php?PoemType=..." --pages 3 --max 60

Sau đó mở Poenote → ⚙ Cài đặt → "Nhập tệp JSON" và chọn tệp vừa tạo.
Nếu bị ngắt giữa chừng, chạy lại đúng lệnh cũ: script lấy tiếp phần còn thiếu.

Lưu ý:
  - Script tự giãn cách giữa các lần tải (mặc định 2.5 giây) để không làm phiền máy chủ.
  - Nhiều bài thơ hiện đại còn bản quyền của tác giả. Hãy dùng kho thơ cho mục đích
    tham khảo cá nhân (dò trùng, học vần), không đăng tải lại.
"""
import argparse
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request

BASE = "https://www.thivien.net"
UA = "Mozilla/5.0 (Macintosh) ThiBut-personal-reader/1.0"


def fetch(url, retries=2):
    last = None
    for i in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "vi"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", errors="replace")
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(3 * (i + 1))
    raise RuntimeError(f"Không tải được {url}: {last}")


def strip_tags(s):
    s = re.sub(r"<br\s*/?>", "\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s).replace("\xa0", " ")
    lines = [ln.strip() for ln in s.split("\n")]
    return "\n".join(lines).strip()


def poem_links(page_html):
    links = re.findall(r'href="(/[^"]*?/poem-[A-Za-z0-9_\-]+)"', page_html)
    seen, out = set(), []
    for l in links:
        if l not in seen:
            seen.add(l)
            out.append(urllib.parse.urljoin(BASE, l))
    return out


VI_LETTERS = re.compile(r"[ăâđêôơưàáảãạèéẻẽẹìíỉĩịòóỏõọùúủũụỳýỷỹỵ]", re.I)


def parse_poem(page_html, url):
    m = re.search(r"<h1>(.*?)</h1>", page_html, re.S)
    title = strip_tags(re.sub(r"<small>.*?</small>", "", m.group(1), flags=re.S)) if m else ""
    author = ""
    m = re.search(r'"author":\{"@type":"Person","name":"(.*?)"', page_html)
    if m:
        author = json.loads('"' + m.group(1) + '"')
    the_tho = ""
    m = re.search(r"Thể thơ:\s*<a[^>]*>(.*?)</a>", page_html)
    if m:
        the_tho = strip_tags(m.group(1))
    ngon_ngu = ""
    m = re.search(r"Ngôn ngữ:\s*<a[^>]*>(.*?)</a>", page_html)
    if m:
        ngon_ngu = strip_tags(m.group(1))

    text = ""
    m = re.search(r'<div class="poem-content">(.*?)<div class="(?:small|clearfix)', page_html, re.S)
    if m:
        block = m.group(1)
        # bỏ chữ Hán và phần dịch nghĩa (màu xám)
        block = re.sub(r'<[^>]+class="[^"]*han-chinese[^"]*"[^>]*>.*?</(?:p|span|strong)>', "", block, flags=re.S)
        block = re.sub(r'<span class="gray">.*?</span>', "", block, flags=re.S)
        paras = re.findall(r"<p[^>]*>(.*?)</p>", block, re.S)
        for p in paras:
            t = strip_tags(p)
            if len(t) > 10 and VI_LETTERS.search(t):
                text = t
                break
        if not text:
            text = strip_tags(block)
    return {
        "title": title,
        "author": author,
        "the_tho": the_tho,
        "ngon_ngu": ngon_ngu,
        "url": url,
        "text": text,
    }


def find_author(name):
    """Tìm trang tác giả theo tên (khớp đúng tên hiển thị trước dấu ' - ')."""
    q = urllib.parse.quote_plus(name)
    page = fetch(f"{BASE}/search-author.php?Name={q}")
    cands = re.findall(r'href="(/[^"]*/author-[A-Za-z0-9_\-]+)"[^>]*>([^<]*)', page)
    norm = lambda x: re.sub(r"\s+", " ", html.unescape(x)).strip().lower()
    for href, label in cands:
        if norm(label.split(" - ")[0]) == norm(name):
            return urllib.parse.urljoin(BASE, href)
    return urllib.parse.urljoin(BASE, cands[0][0]) if cands else None


def author_poem_links(author_url, delay):
    """Mọi bài của một tác giả: bài lẻ trên trang tác giả + bài trong từng tập thơ."""
    slug = urllib.parse.urlparse(author_url).path.split("/")[1]
    page = fetch(author_url)
    mine = lambda links: [l for l in links if urllib.parse.urlparse(l).path.split("/")[1] == slug]
    links = mine(poem_links(page))
    groups = sorted(set(re.findall(r'href="(/' + re.escape(slug) + r'/[^"]*/group-[A-Za-z0-9_\-]+)"', page)))
    for g in groups:
        time.sleep(delay)
        try:
            links += mine(poem_links(fetch(urllib.parse.urljoin(BASE, g))))
        except Exception as e:  # noqa: BLE001
            print(f"  lỗi tập thơ {g}: {e}", file=sys.stderr)
    return links, len(groups)


def save(path, poems):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump({"source": "thivien.net", "poems": poems}, f, ensure_ascii=False, indent=1)
    import os
    os.replace(tmp, path)


def main():
    ap = argparse.ArgumentParser(description="Lấy thơ từ thivien.net cho Thi Bút / Poenote")
    ap.add_argument("urls", nargs="*", help="Link bài thơ, trang tác giả hoặc trang tìm kiếm")
    ap.add_argument("--author", action="append", default=[], help="Tên tác giả (lặp lại được), lấy toàn bộ bài kể cả trong các tập thơ")
    ap.add_argument("-o", "--out", default="kho-tho-thivien.json")
    ap.add_argument("--pages", type=int, default=1, help="Số trang kết quả với link tìm kiếm")
    ap.add_argument("--max", type=int, default=100000, help="Số bài tối đa")
    ap.add_argument("--delay", type=float, default=2.5, help="Giây chờ giữa các lần tải")
    ap.add_argument("--han", action="store_true", help="Lấy cả thơ chữ Hán (mặc định bỏ qua)")
    a = ap.parse_args()

    # chạy tiếp: giữ các bài đã lấy trong tệp cũ
    poems, done = [], set()
    try:
        with open(a.out, encoding="utf-8") as f:
            poems = json.load(f).get("poems", [])
        done = {p["url"] for p in poems}
        print(f"Đã có {len(poems)} bài trong {a.out}, sẽ lấy tiếp phần còn lại.", file=sys.stderr)
    except (OSError, ValueError):
        pass

    targets = []
    for name in a.author:
        url = find_author(name)
        if not url:
            print(f"Không tìm thấy tác giả: {name}", file=sys.stderr)
            continue
        links, ng = author_poem_links(url, a.delay)
        print(f"{name}: {len(set(links))} bài ({ng} tập thơ) — {url}", file=sys.stderr)
        targets += links
        time.sleep(a.delay)
    for u in a.urls:
        if "/poem-" in u:
            targets.append(u)
        elif "/author-" in u:
            targets += author_poem_links(u, a.delay)[0]
        else:
            for page in range(1, a.pages + 1):
                pu = u if page == 1 else u + ("&" if "?" in u else "?") + f"Page={page}"
                print(f"Đọc danh sách: {pu}", file=sys.stderr)
                targets.extend(poem_links(fetch(pu)))
                time.sleep(a.delay)
    seen, uniq = set(done), []
    for t in targets:
        if t not in seen:
            seen.add(t)
            uniq.append(t)
    uniq = uniq[: a.max]
    print(f"Cần tải {len(uniq)} bài mới.", file=sys.stderr)

    for i, u in enumerate(uniq, 1):
        try:
            p = parse_poem(fetch(u), u)
        except Exception as e:  # noqa: BLE001
            print(f"  [{i}/{len(uniq)}] lỗi: {e}", file=sys.stderr)
            continue
        if not a.han and p["ngon_ngu"] == "Chữ Hán":
            print(f"  [{i}/{len(uniq)}] bỏ qua (chữ Hán): {p['title']}", file=sys.stderr)
        elif p["text"]:
            poems.append(p)
            print(f"  [{i}/{len(uniq)}] {p['author']} – {p['title']} ({p['the_tho'] or '?'})", file=sys.stderr)
        if i % 10 == 0:
            save(a.out, poems)
        time.sleep(a.delay)

    save(a.out, poems)
    print(f"Đã lưu {len(poems)} bài vào {a.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
