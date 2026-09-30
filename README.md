# Block Arena

Game bắn súng góc nhìn thứ nhất dựng bằng Three.js (r128), toàn bộ mô hình là voxel.

## Chạy game
- **Cách nhanh nhất:** bấm đúp `index.html` (cần Internet để tải Three.js từ CDN).
- **Khuyên dùng khi phát triển** (để đọc được `talking.txt`, không bị chặn `fetch`): `npm start`
  hoặc `python -m http.server 8000` rồi mở http://localhost:8000

## Cấu trúc
```
block-arena/
├─ index.html
├─ assets/
│  ├─ css/style.css
│  └─ data/talking.txt        câu thoại của boss (mỗi dòng 1 câu, ngôn ngữ nào cũng được)
└─ src/
   ├─ loader.js               DANH SÁCH file JS theo thứ tự nạp (thêm file mới ở đây)
   ├─ main.js                 vòng lặp chính, nhận sát thương, chơi lại
   ├─ core/                   core.js (renderer/camera) · config.js (thông số súng, rơi đồ) · state.js
   ├─ world/                  world.js (tầng 1, MAPK) · level.js (4 tầng, thang, cổng) · physics.js · nature.js
   ├─ i18n/                   lang-data.js (bản dịch) · i18n.js (chọn ngôn ngữ)
   ├─ engine/                 input.js · sound.js · voxel.js (lõi dựng voxel)
   ├─ player/                 player.js (tay) · weapons.js (4 vũ khí) · viewmodel.js (nạp đạn, giật chốt)
   ├─ entities/               bot-model · boss-model · steering · boss · spawner · boss-talk · floor-manager
   ├─ gameplay/               combat · effects · items · grenade
   └─ ui/                     minimap · mobile (cảm ứng) · ui (màn hình bắt đầu/tạm dừng)
```

## Chỉnh nhanh
| Muốn đổi | Sửa ở |
|---|---|
| Cỡ bản đồ cả 4 tầng | `MAPK` trong `src/world/world.js` |
| Sát thương, băng đạn, tốc độ bắn | `src/core/config.js` |
| Tỉ lệ rơi đồ, hồi máu | `src/core/config.js` |
| Số bot tối đa, tốc độ sinh quái | `MAXBOT`, `SP_IV` trong `src/entities/spawner.js` |
| Máu / vũ khí boss theo tầng | `src/entities/boss.js` |
| Số bot cần hạ để gọi boss | `need()` trong `src/world/level.js` |
| Thêm/sửa chữ, ngôn ngữ | `src/i18n/lang-data.js` |
| Câu thoại boss | `assets/data/talking.txt` |

## Quy ước
- Không dùng import/export: mọi file chia sẻ biến toàn cục nên **thứ tự trong `src/loader.js` rất quan trọng**
  (file dùng gì phải nạp SAU file định nghĩa cái đó).
- Mỗi thư mục = một nhóm trách nhiệm; đặt file mới vào nhóm phù hợp rồi khai báo trong `loader.js`.
