# Poenote

Sổ tay làm thơ trên điện thoại: viết bằng font Labrada, gắn ảnh bìa và nhạc,
kiểm tra luật bằng trắc và gieo vần (lục bát, song thất lục bát, Đường luật,
thơ 8 chữ, thơ tự do…), rồi bấm **+** để cất bài vào thư viện **Laint's Poem**.

| Trang | Dành cho | Địa chỉ (sau khi bật GitHub Pages) |
|---|---|---|
| `index.html` | Mọi người (link chia sẻ) | https://laint9.github.io/Poetry/ |
| `write.html` | Laint (soạn thơ) | https://laint9.github.io/Poetry/write.html |

Mỗi bài có link riêng dạng `https://laint9.github.io/Poetry/#poem-<mã bài>`.

## Cài đặt lần đầu (khoảng 5 phút)

1. **Đưa mã nguồn lên repo `laint9/Poetry`**
   - Cách dễ nhất: mở https://github.com/laint9/Poetry → *uploading an existing file* →
     kéo **toàn bộ nội dung** thư mục `Poenote` (không kéo chính thư mục) vào → *Commit changes*.
   - Hoặc dùng GitHub Desktop / dòng lệnh `git push`.
2. **Bật GitHub Pages**: repo → *Settings* → *Pages* → *Source: Deploy from a branch* →
   chọn `main` và thư mục `/ (root)` → *Save*. Khoảng 1 phút sau, link
   `https://laint9.github.io/Poetry/` hoạt động.
   (Repo phải để *Public* thì người khác mới xem được.)
3. **Tạo mã truy cập để nút + lưu thẳng lên thư viện**: GitHub → ảnh đại diện → *Settings* →
   *Developer settings* → *Personal access tokens* → *Fine-grained tokens* → *Generate new token*.
   - Repository access: *Only select repositories* → `Poetry`
   - Permissions → Repository permissions → **Contents: Read and write**
   - Chép mã vừa tạo.
4. Trên điện thoại, mở `https://laint9.github.io/Poetry/write.html` → bấm ⚙ → dán mã →
   *Lưu & kiểm tra*. Mã chỉ nằm trong trình duyệt của điện thoại đó.
5. (Tuỳ chọn) Safari → *Chia sẻ* → *Thêm vào MH chính* để Poenote hiện như một ứng dụng.

Chưa có mã thì nút + vẫn chạy: bài được giữ trên máy và tự đồng bộ khi bạn kết nối.

## Netlify và cài lên iPhone

- Repo đã có `netlify.toml`: trên Netlify chọn *Add new site → Import from GitHub → laint9/Poetry*,
  để trống build command, publish directory `.`. Mỗi lần nút + lưu bài (một commit mới),
  Netlify tự đăng lại sau vài giây.
- Cài như ứng dụng: mở `…/write.html` bằng **Safari** trên iPhone → nút *Chia sẻ* →
  *Thêm vào MH chính* → *Thêm*. Biểu tượng Poenote hiện trên màn hình chính, mở toàn màn hình
  và vẫn mở được khi mất mạng.
- Ứng dụng đã cài có bộ nhớ riêng, tách khỏi Safari: mở nó lên rồi dán lại mã GitHub ở ⚙.

## Nhạc

- Dán link **Spotify**, **YouTube / YouTube Music**, **Apple Music** hoặc **SoundCloud**:
  Poenote nhúng trình phát ngay trong bài. Với Spotify, người xem chưa đăng nhập nghe đoạn
  30 giây, người đã đăng nhập nghe trọn bài.
- Hoặc tải lên tệp MP3/M4A (tối đa 15 MB). Tệp được lưu trong `library/media/` của repo
  công khai, nên chỉ dùng nhạc bạn có quyền chia sẻ.
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
assets/common.js      lưu trữ GitHub, nhạc, ảnh, cuốn sổ
assets/engine.js      phân tích thanh điệu, vần, luật thơ
assets/seed.js        bài mẫu đã hết bản quyền (ca dao, thơ trung đại…)
assets/fonts/         Labrada (giấy phép SIL OFL, xem OFL.txt)
library/poems.json    dữ liệu thư viện (nút + ghi vào đây)
library/media/        ảnh bìa và tệp nhạc
tools/thivien_fetch.py  công cụ lấy thơ tham khảo
```
