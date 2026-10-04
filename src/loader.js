// ============================================================================
// BỘ NẠP MODULE - danh sách file JS của game theo ĐÚNG THỨ TỰ thực thi.
// Các file dùng chung biến toàn cục (không import/export). Thêm file mới = thêm 1 dòng vào nhóm phù hợp.
// File được TẢI SONG SONG (nhanh) nhưng CHẠY theo đúng thứ tự mảng (script.async=false).
// Màn hình loading (index.html, window.BOOT) hiện cho tới khi: mọi file đã tải + tầng 1 đã dựng xong.
// ============================================================================
(function(){
  const SRC='src/';
  const MODULES=[
    // Lõi: renderer/scene/camera
    'core/core.js',
    // Thế giới: bản đồ tầng 1, 4 tầng của tòa nhà, vật lý va chạm
    'world/common/world.js','world/common/sky.js','world/common/level.js','world/common/physics.js',
    // Cấu hình + trạng thái người chơi
    'core/config.js','core/state.js',
    // Đa ngôn ngữ
    'i18n/lang-data.js','i18n/i18n.js',
    // Engine dùng chung: nhập liệu, âm thanh, lõi voxel
    'engine/input.js','engine/sound.js','engine/music.js','engine/voxel.js',
    // Người chơi (góc nhìn thứ nhất): tay, vũ khí, viewmodel
    'player/player.js','player/weapons.js','player/viewmodel.js',
    // Thiên nhiên (phải nạp SAU viewmodel, TRƯỚC bot)
    'world/common/floors.js',   // nạp / dỡ tầng theo yêu cầu - phải nạp TRƯỚC house.js
    'world/floor1/house.js','world/floor1/pavilion.js','world/floor1/statues.js',
    'world/floor1/teaset.js',
    'world/floor1/bath.js',
    'world/floor1/stairgrove.js',   // rừng cây cao + hàng bụi che tường thang lên tầng 2
    'world/floor2/greatwall.js',   // Vạn Lý Trường Thành tầng 2 (dựng lười qua floors.js)
    // nature/: thiên nhiên dùng chung mọi tầng. THỨ TỰ quan trọng (file sau dùng thứ file trước định nghĩa qua NatureKit)
    'world/nature/kit.js',
    'world/nature/placement.js',
    'world/nature/plants.js',
    'world/nature/lake.js',
    'world/nature/state.js',
    'world/nature/fx.js',
    'world/nature/fish.js',
    'world/nature/swim.js',
    'world/nature/build.js',
    'world/nature/runtime.js',
    // Kẻ địch: mô hình bot/boss, di chuyển, boss, bộ sinh quái, thoại boss, quản lý tầng
    'entities/bot-model.js','entities/boss-model.js','entities/boss2-model.js','entities/steering.js','entities/boss.js',
    'entities/spawner.js','entities/ai-talk.js','entities/boss-talk.js','entities/floor-manager.js',
    'entities/bot-throw.js',
    'entities/ally.js','entities/archer.js',
    // Gameplay: bắn, hiệu ứng, vật phẩm, lựu đạn
    'gameplay/combat.js','gameplay/effects.js','ui/minimap.js','gameplay/items.js','gameplay/grenade.js','gameplay/fall.js',
    'gameplay/engrave.js',
    // Occlusion culling
    'engine/occlusion.js',
    // Cảm ứng điện thoại
    'ui/mobile.js',
    // Vòng lặp chính + màn hình bắt đầu (luôn cuối cùng)
    'main.js','ui/ui.js',
    'ui/profile.js'
  ];
  const B=window.BOOT||{set(){},done(f){f&&f()}};
  const W_JS=.85;          // 85% tiến độ = tải file JS, 15% còn lại = dựng tầng 1
  let loaded=0,failed=[];
  const total=MODULES.length;
  function onFile(m,ok){
    if(!ok){failed.push(m);console.error('[Block Arena] không tải được '+SRC+m)}
    loaded++;B.set(loaded/total*W_JS);
    if(loaded===total)afterScripts();
  }
  // Sau khi mọi file đã tải VÀ chạy xong (theo thứ tự): chờ tầng 1 (cây, sông, nhà...) dựng xong rồi mới mở game
  function afterScripts(){
    const t0=performance.now();
    (function wait(){
      const N=window.Nature,ready=!!(N&&N.floors&&N.floors.length>=1);
      if(ready||performance.now()-t0>20000){B.set(1);B.done();return}   // quá 20 giây vẫn mở để không kẹt
      B.set(W_JS+.1);setTimeout(wait,100);
    })();
  }
  for(const m of MODULES){
    const s=document.createElement('script');
    s.src=SRC+m;s.async=false;                       // tải song song, chạy đúng thứ tự mảng
    s.onload=()=>onFile(m,true);
    s.onerror=()=>onFile(m,false);
    document.body.appendChild(s);
  }
})();
