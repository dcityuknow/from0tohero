// ============================================================================
// BỘ NẠP MODULE - danh sách file JS của game theo ĐÚNG THỨ TỰ nạp.
// Các file dùng chung biến toàn cục (không dùng import/export) nên chạy được cả khi
// mở thẳng index.html (file://). Thêm file mới = thêm 1 dòng vào nhóm phù hợp.
// Thứ tự trong mảng CHÍNH LÀ thứ tự thực thi - đừng đảo bừa.
// ============================================================================
(function(){
  const SRC='src/';
  const MODULES=[
    // Lõi: renderer/scene/camera
    'core/core.js',
    // Thế giới: bản đồ tầng 1, 4 tầng của tòa nhà, vật lý va chạm
    'world/world.js','world/level.js','world/physics.js',
    // Cấu hình + trạng thái người chơi
    'core/config.js','core/state.js',
    // Đa ngôn ngữ
    'i18n/lang-data.js','i18n/i18n.js',
    // Engine dùng chung: nhập liệu, âm thanh, lõi voxel
    'engine/input.js','engine/sound.js','engine/voxel.js',
    // Người chơi (góc nhìn thứ nhất): tay, vũ khí, viewmodel
    'player/player.js','player/weapons.js','player/viewmodel.js',
    // Thiên nhiên (phải nạp SAU viewmodel, TRƯỚC bot)
    'world/house.js',   // nhà rubik (thay khối dài) - phải nạp trước nature.js để cây/đá né nhà
    'world/nature.js',
    // Kẻ địch: mô hình bot/boss, di chuyển, boss, bộ sinh quái, thoại boss, quản lý tầng
    'entities/bot-model.js','entities/boss-model.js','entities/steering.js','entities/boss.js',
    'entities/spawner.js','entities/boss-talk.js','entities/floor-manager.js',
    'entities/bot-throw.js',   // bot nhặt đá ở thảm thực vật rồi ném (nạp sau floor-manager)
    // Gameplay: bắn, hiệu ứng, vật phẩm, lựu đạn
    'gameplay/combat.js','gameplay/effects.js','ui/minimap.js','gameplay/items.js','gameplay/grenade.js',
    // Cảm ứng điện thoại
    'ui/mobile.js',
    // Vòng lặp chính + màn hình bắt đầu (luôn cuối cùng)
    'main.js','ui/ui.js'
  ];
  for(const m of MODULES)document.write('<script src="'+SRC+m+'"><\/script>');
})();
