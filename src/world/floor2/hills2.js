// VÀNH NÚI BAO 4 PHÍA CỦA TẦNG 2 (f=1; sàn 150x150m, trần cao 29.6m, đỉnh núi dưới ~26.5m). Thay 4 bức tường bao của level.js.
// Tệp này CHỈ chứa cấu hình riêng của tầng 2; thuật toán dựng nằm ở world/common/hills-core.js (HillsKit). Dáng núi theo seed nên dựng lại vẫn y hệt.
// Nạp SAU hills-core.js, TRƯỚC nature/ (xem loader.js). floors.js gọi Hills2.build() khi tầng 2 được nạp, tự dỡ khi tầng 2 bị dỡ.
// Chỉnh nhanh: Hills2.cfg.* (cần chơi lại / nạp lại tầng) · tắt hẳn: on:false (trả lại 4 tường phẳng) · kiểm tra Console: Hills2.info()
(function(){
if(!window.HillsKit)return;
window.Hills2=FloorHills[1]=HillsKit.make({
  f:1,
  cfg:{
    on:true,
    seed:101,              // đổi số này = đổi dáng núi tầng 2
    cs:.8,                 // khối .8m (sàn rộng 150m nên to hơn tầng 1 (.6) một chút cho nhẹ máy)
    D:34,
    crest:[16,20],         // sống núi phía trước cao 16-20m
    crestU:[11,17],
    peakGap:24,peakH:[4,7],peakW:[5.5,8.5],   // đỉnh nhô lên (tự rải đều dọc mỗi tường)
    top:26.5,              // đỉnh cao nhất (trần tầng 2 ở 29.6m)
    rough:1.25,
    snow:20.5,             // tuyết phủ từ độ cao này
    pines:95,pineU:[5,18],pineH:[3,16],pineSlope:4.4
  }
  // pal:{...}              // đổi màu: rock / warm / moss / dirt / snow / bark / leaf (mảng màu hex), xem PAL0 trong hills-core.js
});
})();
