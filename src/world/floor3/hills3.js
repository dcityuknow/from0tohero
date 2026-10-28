// VÀNH NÚI BAO 4 PHÍA CỦA TẦNG 3 (f=2; sàn 150x150m, trần cao 29.6m). Núi đá sa thạch ấm + rừng thông lá thu để khác tầng 2.
// Tệp này CHỈ chứa cấu hình riêng của tầng 3; thuật toán dựng nằm ở world/common/hills-core.js (HillsKit).
// Nạp SAU hills-core.js (xem loader.js). floors.js gọi Hills3.build() khi tầng 3 được nạp, tự dỡ khi tầng 3 bị dỡ.
// Chỉnh nhanh: Hills3.cfg.* · tắt hẳn: on:false · kiểm tra Console: Hills3.info()
(function(){
if(!window.HillsKit)return;
window.Hills3=FloorHills[2]=HillsKit.make({
  f:2,
  cfg:{
    on:true,
    seed:202,
    cs:.8,
    D:34,
    crest:[15,19],
    crestU:[12,18],        // sườn thoải hơn tầng 2 một chút
    peakGap:26,peakH:[4.5,7.5],peakW:[6,9],
    top:26.5,
    rough:1.3,
    snow:23.5,             // chỉ các đỉnh cao nhất mới có tuyết
    pines:80,pineU:[5,18],pineH:[3,15],pineSlope:3.6
  },
  pal:{
    rock:[0x9a7b63,0x8a6c57,0xa88b72,0x7a5f4d,0x946f5a],
    warm:[0xb0845a,0xa3784f,0xbf9468],
    moss:[0x7a8f4a,0x8ea255,0x6b8040,0x9aab62],
    dirt:[0x7d5a3a,0x6b4a30],
    leaf:[0x8f5a1e,0xb8741f,0xc98a2b,0xd9a441]   // lá thu; muốn thông xanh như tầng 2 thì xóa dòng này
  }
});
})();
