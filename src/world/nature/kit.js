// ============================================================================
// nature/kit.js - Nền tảng chung của thiên nhiên: cấu hình CFG, chủ đề màu từng tầng (THM), RNG, hàm tiện ích, bộ nhớ đệm hình dùng chung.
// (Tách ra từ nature.js cũ. Chia sẻ với các file nature/ khác qua NK = window.NatureKit.)
// ============================================================================
(function(){
const NK=window.NatureKit=window.NatureKit||{};
const CLK={tm:0};   // đồng hồ chung (giây) cho sóng nước, cá, bướm


if(window.FM)FM.close('set0');
   // nhà / chòi / tượng / bàn trà đã dựng xong: ghi nhận để dỡ / dựng lại khi rời / quay lại tầng 1
const MOBILE=('ontouchstart' in window)||navigator.maxTouchPoints>0;

const CFG={
  quality:1,     // 1 = mặc định · 1.5 = mảnh nhỏ hơn, đẹp hơn, nặng hơn · 0.6 = mảnh to, nhẹ máy
  treeDetail:1.35,         // độ chi tiết của CÂY (thân, cành, tán lá): càng cao khối rubik càng nhỏ, cây càng chi tiết nhưng nặng hơn (1 = như cũ)
  density:1,     // nhân số lượng vật thể
  seed:2025,               // đổi số này để ra bố cục khác
  scaleExp:1.8,            // số lượng vật thể tăng theo (diện tích tầng)^scaleExp; 2 = mật độ không đổi khi map to ra, nhỏ hơn = thưa hơn (nhẹ máy)
  litter:140,              // lá / cánh hoa rơi vãi trên mặt đất (chi tiết nhỏ, rất nhẹ)
  waves:true,              // mặt hồ nhấp nhô
  splash:true,             // tóe nước khi lội
  critters:true,           // bướm bay
  fishJump:true,           // thỉnh thoảng cá nhảy vòng cung lên khỏi mặt nước rồi lặn xuống (1-3 con một lượt)
  jumpEvery:[8,20],        // khoảng cách giữa 2 lượt nhảy (giây, ngẫu nhiên trong khoảng này, mỗi tầng)
  jumpH:[.6,1.2],          // độ cao đỉnh vòng cung so với mặt nước (m)
  fish:24,                 // số CÁ bơi trong sông (tầng 1 ~24 con, tầng rộng hơn nhiều hơn; 0 = tắt). Tầng tuyết (sông đóng băng) không có cá
  wade:.6,                 // tốc độ khi lội nước tới ngang đùi (1 = không chậm)
  deepWade:.8,             // nhân thêm khi nước sâu quá 0.6m (0.8 = chậm thêm 20% ở giữa hồ)
  viewDist:60,             // xa hơn mức này thì ẩn bớt vật thể
  carpet:.4,               // kích thước mảnh rubik của thảm cỏ (m): .25 = rất chi tiết (nặng) · .4 = mặc định · .5 · 1 = thô, nhẹ nhất
  detail:1,                // nhân số lượng cỏ nhỏ / hoa / đá vụn rải trên nền (0 = tắt, 2 = gấp đôi)
  terrain:true,            // thảm cỏ 3 tông xanh + địa hình nhấp nhô (false = sàn phẳng, giữ nguyên như cũ)
  hill:2.2,                // độ cao tối đa của đồi (m). 0 = mặt phẳng nhưng vẫn có thảm màu. Quanh sông, cầu, thang, vật cản luôn phẳng
  // ---- Chiều sâu hồ (MỚI) ----
  depth:3.2,               // độ SÂU đáy sông ở giữa dòng (m dưới mặt sàn). Tầng 1 tùy ý; tầng 2-4 tối đa SLAB-.3 (SLAB = độ dày sàn, khai báo ở level.js)
  shelf:4,                 // bề rộng dốc từ mép sông tới chỗ sâu nhất (m); lớn hơn = dốc thoải hơn
  level:.08,               // mặt nước nằm thấp hơn mặt sàn bao nhiêu m (hồ lõm thật, người chơi lún xuống đáy)
  eye:1.6,                 // chiều cao mắt so với chân người chơi (chỉnh khớp game của bạn để nhận đúng lúc "chìm hẳn")
  underwater:true,         // lớp màu nước + sương mù + bọt khí khi đầu ngập dưới mặt nước
  // ---- Sông & bơi (MỚI) ----
  riverW:5,                // NỬA bề rộng sông (m): 5 = sông rộng ~10m (tầng cao hơn rộng hơn chút)
  riverBend:1,             // độ uốn lượn của dòng sông (0 = thẳng tắp, 1.5 = uốn nhiều)
  swimOn:1.25,             // nước sâu từ mức này (m) -> TỰ ĐỘNG chuyển sang chế độ bơi
  swimOff:.85,             // nước nông hơn mức này -> thôi bơi, lội bộ
  swimSpeed:.68,           // tốc độ bơi trên mặt nước (1 = như đi bộ)
  diveSpeed:.55,           // tốc độ khi lặn (đầu chìm dưới nước)
  air:10,                  // số giây nín thở tối đa khi đầu chìm dưới nước
  drownDmg:6,              // máu mất mỗi nhịp khi đã hết hơi
  drownTick:.6             // khoảng cách giữa 2 nhịp mất máu (giây)  => mặc định mất 10 máu/giây
};

const SLT=typeof SLAB==='number'?SLAB:1;
   // độ dày sàn tầng 2-4 (level.js)
const V=s=>s/CFG.quality;

const TV=s=>s/(CFG.quality*CFG.treeDetail);
   // như V nhưng riêng cho cây
const WC=2;
   // cỡ ô của bản đồ 'gần nước' (m)
const CELL=.5,ck=(ci,cj)=>(ci+600)*2048+(cj+600);
   // lưới ô của hồ căn theo tọa độ thế giới (ô .5m)
const clamp01=x=>x<0?0:x>1?1:x;

const smooth=t=>t*t*(3-2*t);

function RNG(seed){let a=seed>>>0;const r=()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
  r.range=(lo,hi)=>lo+(hi-lo)*r();r.int=(lo,hi)=>Math.floor(lo+r()*(hi-lo+1));r.pick=a=>a[Math.floor(r()*a.length)];return r}

// ---- Chủ đề từng tầng. Bảng lá/thông: [chính, sáng, tối] ----
// water = [trung bình, sáng, tối, bọt mép]  (màu tối [2] dùng cho vùng sâu giữa hồ)
const THM=[
 {name:'Đồng cỏ',trunk:[0x8a5a3c,0x6f452c,0x9b6a48],leaf:[0x4fc36a,0x6fdc7f,0x3aa856],leafB:[0xffa8c8,0xffc2d8,0xff8fb8],pine:[0x2f9a5a,0x3fb56b,0x2a8a50],cap:null,
  rock:[0x9a9ca8,0xb0b2bd,0x80828e],moss:0x6fcf7f,ground:[0x7fd18a,0x6fc47c,0x8fdc99],tuft:[0x5fc46c,0x7fdc84,0x4aa85a],water:[0x4da6ff,0x6fc0ff,0x3d8fe8,0x8fd3ff],
  sand:[0xf3e3b0,0xead89e],reed:[0x5fc46c,0x4aa85a],pad:[0x4fc36a,0x3aa856],flower:[0xff7fa8,0xffd23f,0xffffff,0xc9a7ff],shroom:[0xff4d5e,0xff9a3c],
  kinds:['oak','oak','pine','cherry'],trees:13,rocks:8,bushes:11,logs:2,stumps:3,shrooms:7,patches:9,tufts:230,flowers:80},
 {name:'Rừng anh đào',trunk:[0x7a4a52,0x633b43,0x8c5a62],leaf:[0xffa8c8,0xffc2d8,0xff8fb8],leafB:[0xc9a7ff,0xd9bfff,0xb08fff],pine:[0x3f9a8a,0x55b5a3,0x2f8578],cap:null,
  rock:[0xb7a7d6,0xcbbfe6,0xa08fc4],moss:0xa8e6cf,ground:[0xa8e6cf,0x97dcc0,0xb9f0d8],tuft:[0x8fd8b8,0xa8e6cf,0x7fc9a8],water:[0x6fd6e0,0x8fe6ee,0x55c0cc,0xb0f2f6],
  sand:[0xf4dcc8,0xecd0b8],reed:[0x8fd8b8,0x7fc9a8],pad:[0x6fd6a0,0x55c088],flower:[0xffffff,0xffb3a7,0xfff2a3,0xff7fa8],shroom:[0xc9a7ff,0xff7fa8],
  kinds:['cherry','cherry','oak','pine'],trees:13,rocks:8,bushes:11,logs:2,stumps:3,shrooms:9,patches:9,tufts:230,flowers:90},
 {name:'Mùa thu',trunk:[0x7a5236,0x5f3e28,0x8e6644],leaf:[0xff9a3c,0xffb56b,0xe0801f],leafB:[0xffd166,0xffe08a,0xf2b84b],pine:[0x8a9a3a,0xa4b44e,0x76862f],cap:null,
  rock:[0xd9b38c,0xe6c7a4,0xc49e76],moss:0xc9d86b,ground:[0xd8c56b,0xc9b45a,0xe6d67f],tuft:[0xc9b45a,0xd8c56b,0xb9a44a],water:[0x5fd0c0,0x7fe0d0,0x45b8a8,0xa0f0e4],
  sand:[0xead9a0,0xdfcb8c],reed:[0xb8a44a,0x8e7a30],pad:[0x9aa83a,0x7f8e2a],flower:[0xff5a1f,0xffd23f,0xe23a2b,0xffffff],shroom:[0xe23a2b,0xff9a3c],
  kinds:['oak','oak','oak','pine'],trees:13,rocks:9,bushes:11,logs:3,stumps:4,shrooms:8,patches:9,tufts:230,flowers:60},
 {name:'Tuyết',trunk:[0x6a5a5a,0x574848,0x7a6a6a],leaf:[0xe6f4f8,0xffffff,0xb8d8e6],leafB:[0xdaeaf4,0xf4faff,0xa8c8dc],pine:[0x2f7a6a,0x3f9a86,0x266a5a],cap:[0xffffff,0xeaf4ff],
  rock:[0xaab4c8,0xc4cee0,0x8f9ab0],moss:0xf4f8ff,ground:[0xf4f8ff,0xe4eef8,0xffffff],tuft:[0xdce8f4,0xf4f8ff,0xc4d4e6],water:[0xbfefff,0xd8f6ff,0xa4e0f4,0xeafcff],ice:true,
  sand:[0xffffff,0xeef4fb],reed:[0xd8c8a0,0xb8a880],pad:[0xffffff,0xeef4fb],flower:[0x9ad8ff,0xffffff,0xc9a7ff,0xff9fbf],shroom:[0x9ad8ff,0xc9a7ff],
  kinds:['pine','pine','pine','oak'],trees:13,rocks:9,bushes:8,logs:3,stumps:4,shrooms:5,patches:9,tufts:160,flowers:40}
];

// ---- Hàm dựng hình dùng chung ----
const geoOf=vb=>vb.mesh().geometry;

const bandFn=(cols,ny)=>(i,j,k)=>{let b=j<ny*.33?2:j<ny*.7?0:1;if((i*5+j*3+k*7)%7===0)b=(b+1)%3;return cols[b]};
   // tối ở dưới, sáng ở trên
const rockFn=(T,ny)=>(i,j,k)=>{if(T.moss&&j>ny*.7&&(i*7+k*11)%4)return T.moss;const b=j<ny*.34?2:j<ny*.7?0:1;return T.rock[((i*3+k*5+j)%9===0)?(b+1)%3:b]};
   // độ sâu NƯỚC (từ đáy lên mặt nước)

// ---- Dựng cả 1 tầng ----
const _m=new THREE.Matrix4(),_p=new THREE.Vector3(),_q=new THREE.Quaternion(),_s=new THREE.Vector3(),cache={};

const variants=(key,mk,cnt=3)=>cache[key]||(cache[key]=Array.from({length:cnt},mk));

Object.assign(NK,{clamp01,TV,bandFn,geoOf,V,rockFn,CFG,smooth,_p,_s,_m,_q,ck,CELL,SLT,THM,RNG,variants,MOBILE,WC,CLK});
})();
