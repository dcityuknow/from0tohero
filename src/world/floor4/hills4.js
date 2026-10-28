// VÀNH NÚI BAO 4 PHÍA CỦA TẦNG 4 (f=3; sàn nhỏ hơn: ~106x106m, KHÔNG có trần - hở ra vòm trời nên núi cao được hơn). Núi đá xanh xám, tuyết xuống thấp.
// Tệp này CHỈ chứa cấu hình riêng của tầng 4; thuật toán dựng nằm ở world/common/hills-core.js (HillsKit).
// Nạp SAU hills-core.js (xem loader.js). floors.js gọi Hills4.build() khi tầng 4 được nạp, tự dỡ khi tầng 4 bị dỡ.
// Chỉnh nhanh: Hills4.cfg.* · tắt hẳn: on:false · kiểm tra Console: Hills4.info()
(function(){
if(!window.HillsKit)return;
window.Hills4=FloorHills[3]=HillsKit.make({
  f:3,
  cfg:{
    on:true,
    seed:303,
    cs:.7,                 // sàn nhỏ hơn tầng 2-3 nên khối mịn hơn một chút
    D:34,
    crest:[16,22],
    crestU:[10,15],        // sườn dốc hơn
    peakGap:22,peakH:[5,9],peakW:[5,8],
    top:29,                // không có trần nên cho cao hơn (tường bao cao 31m)
    rough:1.4,
    snow:15.5,             // tuyết phủ từ giữa sườn
    pines:60,pineU:[5,16],pineH:[3,17],pineSlope:5.2
  },
  pal:{
    rock:[0x7d8794,0x6c7683,0x8c97a5,0x5b6572,0x76808d],
    warm:[0x858a94,0x777c87,0x91969f],
    moss:[0x6f9a78,0x7eaa86,0x5e8a69,0x8cb994],
    leaf:[0x24604a,0x2f735a,0x3e8769,0x55a07d]
  }
});
})();
