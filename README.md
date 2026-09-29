# 🧱 Block Arena

Game bắn súng góc nhìn thứ nhất (FPS) chạy ngay trên trình duyệt, đồ họa **voxel pastel**. Viết bằng JavaScript thuần + [Three.js](https://threejs.org/) r128. Toàn bộ nhân vật, súng, hộp đồ đều được dựng bằng code, **không dùng file ảnh hay model ngoài**.

Chơi được trên máy tính (chuột + bàn phím) và điện thoại (cảm ứng).

---

## 🎮 Lối chơi

Bạn đứng trong một tòa nhà **4 tầng**. Mỗi tầng là một đấu trường riêng, càng lên cao càng rộng.

1. Bot đỏ liên tục xuất hiện và lao vào đánh bạn (càng lên tầng càng sinh nhanh).
2. Hạ đủ số bot của tầng thì **Boss** xuất hiện.
3. Hạ Boss để mở cổng ở chân cầu thang, leo lên tầng tiếp theo.
4. Hạ Boss tầng 4 là **thắng**.

| Tầng | Bot cần hạ để gọi boss | Bot sinh mỗi | Boss |
|:---:|:---:|:---:|---|
| 1 | 50 | 3 giây | **FLASH** – 500 máu, dùng súng ngắn |
| 2 | 100 | 2,4 giây | 800 máu, súng dài + súng ngắn |
| 3 | 150 | 1,8 giây | 1100 máu, thêm súng ngắm |
| 4 | 200 | 1,2 giây | 1400 máu, dùng cả 3 súng + **ném lựu đạn** |

Mỗi tầng có bố cục riêng: khối trung tâm và cột (tầng 2), chia 4 phòng có cửa (tầng 3), đấu trường vòng cột với đồi bậc thang (tầng 4).

---

## ⌨️ Điều khiển

### Máy tính

| Phím / Chuột | Chức năng |
|---|---|
| `W` `A` `S` `D` / phím mũi tên | Di chuyển |
| Chuột | Nhìn quanh |
| Chuột trái | Bắn |
| `R` | Nạp đạn |
| `Space` | Nhảy |
| `Shift` | Trượt (né đòn) |
| `1` `2` `3` | Súng ngắn / súng dài / súng ngắm |
| `4` | Cầm lựu đạn (giữ chuột trái để giật chốt, thả để ném, giữ lâu ném xa hơn) |
| Chuột phải hoặc `F` | Ngắm zoom (súng ngắm) |
| `Esc` | Tạm dừng |

> Khi đang chơi, các phím tắt của trình duyệt (Ctrl+S, Ctrl+P, F5, Ctrl+cuộn chuột...) bị chặn để không làm gián đoạn trận đấu.

### Điện thoại

Joystick bên trái để di chuyển, kéo màn hình bên phải để nhìn, và các nút `FIRE`, `JUMP`, `SLIDE`, `R`, `ADS`, `⇄` (đổi súng).

---

## 🔫 Vũ khí

| Súng | Băng đạn | Sát thương | Headshot | Ghi chú |
|---|:---:|:---:|:---:|---|
| Súng ngắn | 12 | 34 | 100 | Bắn từng phát |
| Súng dài | 30 | 20 | 60 | Bắn tự động |
| Súng ngắm | 5 | 100 | 100 | Zoom, gần như không lệch đạn khi ngắm |
| Lựu đạn | – | tối đa 160 (bot) | – | Nổ diện rộng bán kính 10m, rung camera, **sát thương cả bạn** |

Bạn bắt đầu với 3 lựu đạn, tối đa cầm 9.

## 🎁 Vật phẩm rơi

Bot bị hạ có **30%** rơi đồ (chia đều 6 loại). Chạy qua để nhặt, đồ biến mất sau 45 giây.

- Hộp đạn súng ngắn / súng dài / súng ngắm
- Lựu đạn
- Hộp máu (+40 máu)
- **Hộp vàng**: đầy đạn cho mọi súng + 1 lựu đạn

---

## 🚀 Cách chạy

Game là web tĩnh, không cần build.

```bash
# trong thư mục chứa index.html
python -m http.server 8000
# rồi mở http://localhost:8000
```

Bạn cũng có thể mở thẳng `index.html`, nhưng khi đó trình duyệt thường chặn việc đọc `talking.txt`, nên Boss sẽ nói các câu mặc định thay vì câu của bạn.

**Yêu cầu:** trình duyệt hiện đại có WebGL, và có internet (Three.js được tải từ cdnjs; dịch câu Boss và tự nhận ngôn ngữ theo IP cũng dùng mạng).

---

## 🌍 Ngôn ngữ

11 ngôn ngữ, đổi bằng các nút ở màn hình bắt đầu. Game tự chọn theo ngôn ngữ trình duyệt / quốc gia của IP, và nhớ lựa chọn của bạn.

Tiếng Việt · English · Русский · Nigerian Pidgin · বাংলা · Bahasa Indonesia · हिन्दी · 中文 · Filipino · Українська · 한국어

Thiếu bản dịch ở ngôn ngữ nào thì game dùng tiếng Anh. Muốn sửa hoặc thêm chữ, chỉnh `js/lang-data.js`.

## 💬 Boss biết nói

Boss cứ vài giây lại nói một câu ngẫu nhiên, hiện thành bong bóng chữ trên đầu.

- Câu nói lấy từ **`talking.txt`**, mỗi dòng một câu, viết bằng ngôn ngữ nào cũng được.
- Game tự **dịch** câu sang ngôn ngữ người chơi đang chọn (Google Translate, dự phòng MyMemory), lưu lại để mỗi câu chỉ dịch một lần.
- Không có mạng hoặc không đọc được file thì Boss nói nguyên văn, hoặc dùng vài câu mặc định.

---

## 📁 Cấu trúc thư mục

```
├── index.html
├── talking.txt          # lời thoại của Boss
├── css/
│   └── style.css
└── js/
    ├── core.js          # renderer, scene, camera, ánh sáng
    ├── world.js         # tầng 1: sàn, tường, khối chắn
    ├── level.js         # tầng 2-4, cầu thang, cổng khóa, điểm sinh quái
    ├── physics.js       # va chạm, tự bước lên bậc thấp
    ├── config.js        # thông số súng, đạn, tỉ lệ rơi đồ
    ├── state.js         # trạng thái người chơi
    ├── lang-data.js     # bản dịch
    ├── i18n.js          # đa ngôn ngữ, tự nhận theo IP
    ├── input.js         # bàn phím, chuột, chặn phím tắt trình duyệt
    ├── sound.js         # âm thanh tổng hợp bằng Web Audio (có định hướng 3D)
    ├── voxel.js         # lõi dựng mô hình bằng khối voxel
    ├── player.js        # cánh tay góc nhìn thứ nhất
    ├── weapons.js       # mô hình súng và lựu đạn
    ├── viewmodel.js     # súng cầm tay, hoạt ảnh nạp đạn / giật chốt
    ├── bots.js          # bot thường và Boss
    ├── ai.js            # AI né vật cản, Boss, bộ sinh quái, lời thoại
    ├── combat.js        # bắn, tia đạn, sát thương
    ├── effects.js       # máu, vỡ mảnh, vết đạn, rung camera
    ├── minimap.js       # bản đồ nhỏ
    ├── items.js         # hạ bot, vật phẩm rơi, nhặt đồ
    ├── grenade.js       # ném và nổ lựu đạn
    ├── mobile.js        # điều khiển cảm ứng
    ├── game.js          # vòng lặp chính
    └── ui.js            # màn hình bắt đầu / tạm dừng
```

> Thứ tự nạp script trong `index.html` quan trọng vì các file dùng chung biến toàn cục. Đừng đổi thứ tự.

## 🛠️ Tùy chỉnh nhanh

| Muốn chỉnh | Sửa ở |
|---|---|
| Sát thương, băng đạn, tốc độ bắn | `js/config.js` (`W`) |
| Tỉ lệ rơi đồ, lượng máu mỗi hộp | `js/config.js` (`DROP_CHANCE`, `HP_BOX`) |
| Số bot cần hạ để gọi boss | `js/level.js` (`need`) |
| Tốc độ sinh bot, số bot tối đa | `js/ai.js` (`SP_IV`, `MAXBOT`) |
| Máu Boss, tên Boss | `js/ai.js` (`onKill`, `bname`) |
| Câu Boss nói | `talking.txt` |
| Chữ hiển thị / thêm ngôn ngữ | `js/lang-data.js`, `js/i18n.js` |

---

## 🧩 Điểm kỹ thuật

- Mỗi bộ phận mô hình gộp thành **một mesh** dù gồm hàng nghìn khối voxel, và các bot dùng chung geometry nên game vẫn nhẹ khi có hàng chục bot.
- Bot chết **vỡ thành từng mảnh voxel** đúng màu của chúng.
- AI biết né vật cản và nhảy qua khối thấp; Boss tự giữ khoảng cách, bắn theo loạt và chọn súng theo khoảng cách tới bạn.
- Âm thanh được tổng hợp bằng Web Audio API (không có file âm thanh), có định vị 3D, vang vọng và dội tiếng cho vụ nổ và tiếng súng ngắm.
