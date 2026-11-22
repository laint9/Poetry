# Poenote

Sổ tay làm thơ trên điện thoại: viết bằng font Labrada, gắn ảnh bìa và nhạc,
kiểm tra luật bằng trắc và gieo vần (lục bát, song thất lục bát, Đường luật,
thơ 8 chữ, thơ tự do…), rồi bấm **+** để cất bài vào thư viện **Laint's Poem**.

| Trang | Dành cho | Địa chỉ |
|---|---|---|
| `index.html` | Mọi người (link chia sẻ) | https://poenote.netlify.app/ |
| `write.html` | Laint (soạn thơ, cài lên iPhone) | https://poenote.netlify.app/write.html |

Bản GitHub Pages (https://laint9.github.io/Poetry/) vẫn chạy và đọc cùng thư viện trên Netlify.

Mỗi bài có link riêng dạng `https://poenote.netlify.app/#poem-<mã bài>`.

## Thư viện lưu ở đâu

Thư viện (bài thơ, ảnh bìa, tệp nhạc) nằm trong **Netlify Blobs** của site `poenote`,
qua hàm `netlify/functions/api.mjs` (lõi ở `netlify/lib/core.mjs`):

| Đường | Việc |
|---|---|
| `GET /api/library` | danh sách bài (công khai) |
| `GET /api/media/<mã>` | ảnh / nhạc (công khai) |
| `PUT` / `DELETE /api/poems/<mã bài>` | lưu, sửa, xoá: cần mã chủ sổ |
| `POST /api/claim` | đặt mã chủ sổ lần đầu (chỉ một lần) |

**Mở khoá sổ:** lần đầu mở `write.html`, bấm ⚙ → *Đặt mã và mở khoá*. Mỗi máy (kể cả ứng dụng
đã cài trên màn hình chính) nhập mã này một lần. Nhập sai 8 lần thì khoá 15 phút.
Mã chỉ lưu dạng băm (scrypt) trên máy chủ. Quên mã: vào Netlify → project *poenote* →
*Blobs* → store `poenote` → xoá khoá `owner`, rồi đặt mã mới.

## Netlify và cài lên iPhone

- Site Netlify `poenote` lấy mã nguồn từ repo `laint9/Poetry` (nhánh `main`) và tự đăng lại mỗi khi
  repo có commit mới. Bài thơ không nằm trong repo nên lưu bài không cần đăng lại site.
- Cài như ứng dụng: mở `…/write.html` bằng **Safari** trên iPhone → nút *Chia sẻ* →
  *Thêm vào MH chính* → *Thêm*. Biểu tượng Poenote hiện trên màn hình chính, mở toàn màn hình
  và vẫn mở được khi mất mạng.
- Ứng dụng đã cài có bộ nhớ riêng, tách khỏi Safari: mở nó lên rồi nhập mã chủ sổ ở ⚙.

## Nhạc

- Dán link **Spotify**, **YouTube / YouTube Music**, **Apple Music** hoặc **SoundCloud**:
  Poenote nhúng trình phát ngay trong bài. Với Spotify, người xem chưa đăng nhập nghe đoạn
  30 giây, người đã đăng nhập nghe trọn bài.
- Hoặc tải lên tệp MP3/M4A (tối đa 3,5 MB). Ai có link thư viện đều nghe được, nên chỉ dùng
  nhạc bạn có quyền chia sẻ.
- Instagram không mở kho nhạc cho ứng dụng ngoài, nên không lấy nhạc từ đó được.

## Kho thơ tham khảo (gợi ý vần, dò trùng)

`tools/thivien_fetch.py` lấy thơ từ thivien.net thành tệp JSON:

```bash
python3 tools/thivien_fetch.py --author "Xuân Quỳnh" --author "Huy Cận" -o kho.json
```

Rồi trong Poenote: ⚙ → *Nhập tệp JSON*. Kho này chỉ nằm trên máy (IndexedDB).
**Đừng đưa tệp kho lên repo**: phần lớn thơ hiện đại còn bản quyền tác giả.
`.gitignore` đã chặn sẵn các tệp `kho*.json`.

## Cấu trúc

```
index.html            thư viện Laint's Poem (trang công khai)
write.html            trình soạn Poenote
assets/poenote.css    giao diện cuốn sổ
assets/common.js      gọi API thư viện, nhạc, ảnh, cuốn sổ
assets/engine.js      phân tích thanh điệu, vần, luật thơ
assets/seed.js        bài mẫu đã hết bản quyền (ca dao, thơ trung đại…)
assets/fonts/         Labrada (giấy phép SIL OFL, xem OFL.txt)
netlify/functions/api.mjs  API thư viện (Netlify Blobs)
netlify/lib/core.mjs  phần lõi API: mã chủ sổ, lưu, xoá, ảnh, nhạc
library/poems.json    bản thư viện cũ (chỉ dùng khi mất mạng lần đầu)
tools/thivien_fetch.py  công cụ lấy thơ tham khảo
```
