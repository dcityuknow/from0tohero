// CHU KỲ NGÀY - ĐÊM THEO GIỜ THẬT CỦA NGƯỜI CHƠI (mọi tầng dùng chung 1 mặt trời / 1 mặt trăng).
//  - Giờ: tra múi giờ từ ĐỊA CHỈ IP (ipapi.co -> ipwho.is -> worldtimeapi.org), rồi tính giờ địa phương bằng Intl. Tra lỗi / bị chặn -> dùng múi giờ của trình duyệt.
//    Kết quả cache 12h trong localStorage nên lần sau vào game có giờ ngay, không phải chờ mạng.
//  - Buổi sáng (6-10h): nắng vàng ấm, góc thấp · Trưa (10-14h): nắng gắt, trắng, chói · Chiều (14-18h): nắng dịu dần, ngả cam
//    · Tối (sau ~19h): TẮT NẮNG, chỉ còn ánh trăng xanh nhạt + đèn lồng / đèn đá sáng lên (có quầng sáng, vài đèn có PointLight).
//  - MỖI TẦNG LÀ 1 THẾ GIỚI RIÊNG (bảng WORLDS ở dưới): mặt trời / mặt trăng / chu kỳ ngày-đêm / màu trời / sương mù / ánh sáng riêng.
//  - Ảnh hưởng: DirectionalLight mặt trời + mặt trăng, HemisphereLight, màu vòm trời / sương mù, màu trần sương + mây các tầng, quầng nắng,
//    mặt trời / mặt trăng / sao ở tầng cao nhất (thấy trời), vệt sáng mặt trời xuyên lớp sương ở các tầng có trần, quầng chói khi nhìn thẳng vào mặt trời.
//  - BÓNG ĐỔ THẬT: mặt trời là đèn có shadow map bám theo người chơi (vùng ~88m quanh bạn). Mọi khối Lambert đục của tầng hiện tại vừa đổ vừa nhận bóng;
//    sàn / trần tấm (vật liệu mảng) chỉ NHẬN bóng, nếu không trần sẽ che tối cả tầng. Ban đêm tắt bóng. Máy yếu (<30fps kéo dài) tự tắt bóng.
//    Tắt thủ công: ?shadow=0 · hoặc DayCycle.shadows(false).
//  - Thử nhanh: thêm vào URL ?hour=13.5 (đứng yên ở 13:30) · ?hour=5&speed=600 (chạy nhanh, 1 giây = 10 phút) · ?tz=Asia/Tokyo ·
//    hoặc trong console: DayCycle.setHour(21) / DayCycle.setHour(null) (về giờ thật).
// Nạp SAU sky.js (cần HAZE / CEILMATS / paintDome), TRƯỚC house.js (house.js đăng ký đèn qua DayCycle.reg). Chỉnh nhanh ở CFG + bảng KEYS.
(function(){
function qsShadow(){const v=new URLSearchParams(location.search).get('shadow');return v!=='0'}
const CFG={
  sunrise:6, sunset:18,      // mặt trời mọc / lặn (giờ địa phương): chỉ quyết định VỊ TRÍ mặt trời trên cung; độ sáng theo bảng KEYS
  nightLight:1,              // nhân độ sáng môi trường ban đêm (1 = mặc định; tăng 1.2-1.5 nếu thấy tối khó chơi)
  pointLights:!/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent),   // PointLight ở đèn mới (bàn trà / chòi / bể tắm); điện thoại chỉ dùng quầng sáng cho nhẹ
  badge:true,                // hiện đồng hồ nhỏ góc phải (🌙 21:05 · VN)
  geoTimeout:2500,           // ms chờ mỗi dịch vụ tra IP
  cacheHours:12,
  stars:900,                 // số sao trên vòm trời (tầng hở trời). Trước là 420
  ceilStars:1,               // độ sáng sao trong "cửa sổ sao" ở các tầng có trần (0 = tắt sao + không khoét sương)
  holeOpen:[20.5,22.5],      // cửa sổ sao mở dần từ giờ này tới giờ kia (giờ tối). Trước 20h30 chưa mở, từ 22h30 mở hẳn
  holeClose:[4,5.4],         // sáng sớm: cửa sổ khép lại dần trong khoảng giờ này
  sunSize:.8,sunCells:9,sunMid:.5,sunDrift:9,   // mặt trời VOXEL hình cầu treo sát trần (tầng có trần): bán kính (m) · số ô voxel trên 1 đường kính · độ cao tâm mặt trời trong chồng sương: 0 = sát trần, 1 = ngang lớp sương thấp nhất, .5 = giữa · trôi quanh tâm trần tối đa bao nhiêu m theo giờ
  holeCenter:null,moonDrift:7,moonBelow:2.8,holeEdge:[16,34],holeHalf:null,   // holeCenter:[x,z] = tâm cửa sổ sao trên trần (null = chỗ đứng đầu tiên mỗi tầng) · moonDrift: trăng lệch khỏi tâm tối đa bao nhiêu m · moonBelow: trăng treo thấp hơn trần bao nhiêu m (nhỏ = sát trần) · holeEdge: [m,m] cách MÉP trần (tường 4 góc): trong khoảng đầu sương trắng kín hoàn toàn, tới khoảng sau mới được khoét · holeHalf:[nửa rộng x, nửa rộng z] ép tay vùng được khoét (null = tự dò theo tấm trần)
  holeR:[24,64],             // cửa sổ trên trần: bán kính [lõi luôn mở quanh tâm, hết hẳn] (m): rộng hơn trước vì giờ cửa sổ đứng yên, bạn đi quanh nó. Hình dạng KHÔNG còn là hình tròn: mép bị nhiễu (noise) bẻ thành các mảng hở trời loang lổ như khe mây
  holeNoise:[.075,.04],       // tần số nhiễu của mép cửa sổ [theo hướng nhìn ra trăng, theo chiều ngang màn hình]. Số nhỏ = mảng to hơn · tỉ lệ 2:1 -> mảng dẹt, kéo dài ngang trời
  moonDist:30,moonSize:1.3,moonCells:10,  // trăng VOXEL lơ lửng: cách người chơi bao nhiêu m · bán kính (m) · số ô voxel trên 1 đường kính (ô = 2*moonSize/moonCells m; tăng = mịn hơn, giảm = khối to hơn)
  shadows:qsShadow(),        // bóng đổ thật (mặt trời). ?shadow=0 để tắt
  shadowSize:/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)?1024:2048,   // độ phân giải bản đồ bóng
  shadowRange:/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)?30:32,      // nửa cạnh vùng đổ bóng quanh người chơi (m). Trước là 44; sương mù đã che dần từ 18m (kín ở 55m)
  shadowDist:90,             // khoảng cách đặt "camera bóng" tới người chơi (m). Trước là 130 và far=300: lúc mặt trời thấp (chiều tà / bình minh) khối nhìn của bóng
                             // kéo dài thành dải ~220m nên phải vẽ vào bản đồ bóng gấp ~3 lần số vật so với buổi trưa. 90 + far=shadowDist+60 cắt bớt phần dải thừa (sương đã che từ ~55m)
  shadowMinSun:.15,          // chỉ vẽ bóng khi cường độ nắng > số này (trước .06). Chiều tà nắng yếu + môi trường sáng nên bóng gần như không thấy, tắt sớm cho đỡ nặng
  maxPointLights:5,          // tối đa số PointLight bật cùng lúc, chỉ giữ các đèn GẦN camera nhất (mỗi PointLight bắt MỌI vật liệu ăn đèn tính thêm 1 lần cho từng đỉnh). 0 = không giới hạn
  shadowStride:3,            // cập nhật bóng mỗi N khung (3 = còn 1/3 tải; vật đứng yên không thấy khác, chỉ bóng bot trễ chút). Trước là 2
  dist:400                   // khoảng cách vẽ mặt trời / mặt trăng / sao quanh camera (vòm trời bán kính 450, far=600)
};
const hx=h=>[(h>>16&255)/255,(h>>8&255)/255,(h&255)/255];
// ---- bảng keyframe theo GIỜ: [giờ, nắng, màu nắng, môi trường, trời(hemi), đất(hemi), chân trời, giữa, đỉnh, trăng, đèn(0..1), màu phủ đồ không đèn (trần sương/mây/thác), chói] ----
const KEYS=[
  [0,   0,  0xffffff,.50,0x6f82c8,0x2b2f55,0x1c2650,0x101a3c,0x070c24,.42,1,  0x4d5a8c,0],
  [4.8, 0,  0xffffff,.50,0x6f82c8,0x2b2f55,0x1c2650,0x101a3c,0x070c24,.42,1,  0x4d5a8c,0],
  [5.7, .30,0xff9a5a,.70,0xffc8a8,0x7a5a78,0xffb08a,0xb48fc8,0x4a62b8,.10,.7, 0xffcfb0,.2],   // rạng đông
  [7.0, .95,0xffdcae,.74,0xfff4e6,0xffd6e6,0xdbeaff,0x9ccdf8,0x4a95e8,0,  .15,0xfff1dc,.45],  // sáng: nắng vàng ấm
  [9.5, 1.05,0xffecc8,.70,0xffffff,0xffd6e6,0xe2efff,0x92c8fa,0x3f8fe6,0,  .05,0xfff8ee,.7],
  [11.5,1.2,0xfffaf0,.62,0xffffff,0xffe8f0,0xe9f5ff,0x78bcff,0x2b7be6,0,  0,  0xffffff,1],    // trưa: NẮNG GẮT, trắng chói
  [13.5,1.2,0xfffaf0,.62,0xffffff,0xffe8f0,0xe9f5ff,0x78bcff,0x2b7be6,0,  0,  0xffffff,1],
  [15.5,.85,0xffe2b8,.72,0xfffaf0,0xffd6e6,0xe3edf8,0x9acbf2,0x4f90dc,0,  .05,0xfff6e8,.5],   // chiều: nắng vừa
  [17.2,.6, 0xffc690,.74,0xffeedd,0xe8b8c8,0xffd4a8,0xa9bfe8,0x5a82d2,0,  .25,0xffe6cc,.3],
  [18.1,.25,0xff8a50,.70,0xffc0a0,0x6a4a78,0xff9a6b,0xd98fb0,0x5568c0,.12,.65,0xffc2a0,.15],  // hoàng hôn
  [19.1,0,  0xffa060,.55,0x8a8ad0,0x34386a,0x6a5a9a,0x35407a,0x151d4a,.30,.95,0x6a6fa0,0],    // chạng vạng: tắt nắng
  [20.2,0,  0xffffff,.50,0x6f82c8,0x2b2f55,0x1c2650,0x101a3c,0x070c24,.42,1,  0x4d5a8c,0],
  [24,  0,  0xffffff,.50,0x6f82c8,0x2b2f55,0x1c2650,0x101a3c,0x070c24,.42,1,  0x4d5a8c,0]
].map(a=>({h:a[0],sun:a[1],sunC:hx(a[2]),amb:a[3],hS:hx(a[4]),hG:hx(a[5]),hor:hx(a[6]),mid:hx(a[7]),top:hx(a[8]),moon:a[9],lamp:a[10],tint:hx(a[11]),glare:a[12]}));
const lerp=(a,b,t)=>a+(b-a)*t,lerpC=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
const sm=t=>t*t*(3-2*t),clamp=(x,a,b)=>x<a?a:x>b?b:x,ss=(a,b,x)=>sm(clamp((x-a)/(b-a),0,1));
// ================= THẾ GIỚI RIÊNG CỦA TỪNG TẦNG =================
// WORLDS[f] = bầu trời của tầng f (f = 0..3). SỬA Ở ĐÂY để chỉnh từng thế giới. Chỉ cần ghi các trường muốn khác mặc định.
//  cycles   : số "ngày-đêm" trong 1 ngày thật (số NGUYÊN). 1 = giống giờ thật · 3 = 1 ngày chỉ dài 8 tiếng · 0 = đứng yên mãi ở giờ `offset`
//  offset   : lệch giờ của thế giới này so với giờ thật (giờ). 12 = ngược hẳn (bạn chơi ban đêm thì tầng này đang ban ngày)
//  sunrise / sunset : giờ mặt trời mọc / lặn của thế giới (sunset - sunrise = độ dài ban ngày; vd 8 -> 16 = ngày ngắn, đêm dài)
//  fog      : [gần, xa] của sương mù (m)
//  sunTint  : màu nhuộm ánh nắng · hemiTint: màu nhuộm ánh sáng môi trường · ceilMul: màu nhuộm trần sương + mây
//  skyK     : 0..1 độ ngả sang bảng màu `sky` (0 = bầu trời xanh mặc định). sky = {day:[chân trời,giữa,đỉnh], night:[...]}
//  ambK / glareK / moonK : nhân độ sáng môi trường / độ chói / độ sáng trăng · moonLight: màu ánh trăng · starCol, starSize: màu + cỡ sao
//  suns[]   : các mặt trời (cái ĐẦU TIÊN là cái chiếu sáng thật, đổ bóng; các cái sau chỉ để trang trí).
//             {size nhân cỡ, col màu, style:'glow'|'disc', z lệch hướng ngang, az xoay quỹ đạo (rad), dh lệch giờ so với cái đầu, bright độ sáng}
//  moons[]  : các mặt trăng. {size, col, phase 0..1 (1 = tròn, nhỏ hơn = lưỡi liềm), ring:true = có vành đai, z, az, dh, bright}
// Chỉ TẦNG CAO NHẤT (tầng 4) hở trời nên thấy trực tiếp mặt trời / trăng / sao; tầng 1-3 có trần, thấy quầng sáng của chúng xuyên lớp sương trên trần
// + toàn bộ màu nắng, màu ánh sáng, sương mù, màu trần / mây đều theo thế giới của tầng đó.
// TẤT CẢ CÁC TẦNG CHẠY ĐÚNG GIỜ THẬT (cycles:1, offset:0, mọc 6h - lặn 18h): chỉ khác nhau về màu sắc / sương / trăng. Muốn tầng nào đi giờ riêng thì sửa cycles / offset / sunrise / sunset của tầng đó.
const WORLDS=[
  {name:'Đồng cỏ',moons:[{phase:.32}]},   // thế giới gốc: giờ thật, nắng vàng, trăng LƯỠI LIỀM (phase: 1 = tròn, nhỏ hơn = mảnh hơn)
  {name:'Rừng anh đào',cycles:1,offset:0,fog:[40,150],
    sunTint:0xffc4d4,hemiTint:0xfff0f6,ceilMul:0xffe2ec,glareK:.8,moonLight:0xd8b0ff,starCol:0xffd9f0,
    skyK:.55,sky:{day:[0xffe3ee,0xf7b8da,0xb48ae8],night:[0x45345f,0x2c2150,0x130d2e]},
    suns:[{size:1.4,col:0xffb8cc}],
    moons:[{size:1.5,col:0xffe0ee,phase:.38},{size:.55,col:0xd6b8ff,phase:.45,dh:5,z:.15,az:.9}]},
  {name:'Mùa thu',cycles:1,offset:0,
    sunTint:0xffa860,hemiTint:0xffe6cc,ceilMul:0xffe2c4,ambK:1.05,glareK:.9,moonLight:0xffc890,starCol:0xffd6a8,
    skyK:.5,sky:{day:[0xffd8a0,0xf2a46e,0xb0606e],night:[0x3c2234,0x26142c,0x0e0818]},
    suns:[{size:1.7,col:0xff9a50},{size:.5,col:0xff5a34,dh:.7,z:.5,az:.4}],
    moons:[{size:1.2,col:0xffd08a,phase:.4}]},
  {name:'Tuyết',cycles:1,offset:0,fog:[16,52],
    sunTint:0xcfe6ff,hemiTint:0xe8f4ff,ceilMul:0xe6f2ff,glareK:.5,moonK:1.3,moonLight:0xaad4ff,starCol:0xd8f0ff,starSize:3,
    skyK:.6,sky:{day:[0xe8f7ff,0xaad6f6,0x5c9ce2],night:[0x17324c,0x0b1d38,0x040a1e]},
    suns:[{size:.75,col:0xd8ecff,style:'disc'}],
    moons:[{size:2,col:0xdcecff,phase:.55,ring:true},{size:.5,col:0xbfe0ff,phase:.5,dh:-4,z:-.5,az:-.8}]}
].map(w=>{
  const hc=a=>hx(a),d={cycles:1,offset:0,sunrise:6,sunset:18,fog:[18,55],sunTint:0xffffff,hemiTint:0xffffff,ceilMul:0xffffff,ambK:1,glareK:1,moonK:1,
    moonLight:0x9bb4ff,starCol:0xffffff,starSize:2.2,skyK:0,sky:null,suns:[{}],moons:[{}]};
  const o=Object.assign({},d,w);
  for(const k of['sunTint','hemiTint','ceilMul','moonLight','starCol'])o[k+'A']=hc(o[k]);
  if(o.sky)o.sky={day:o.sky.day.map(hc),night:o.sky.night.map(hc)};
  o.suns=o.suns.slice(0,3).map(b=>Object.assign({size:1,col:0xffffff,style:'glow',z:.33,az:0,dh:0,bright:1},b));
  o.moons=o.moons.slice(0,3).map(b=>Object.assign({size:1,col:0xffffff,phase:1,ring:false,z:-.3,az:0,dh:0,bright:1},b));
  for(const b of o.suns.concat(o.moons))b.c=hc(b.col);
  return o;
});
const WN=WORLDS.length;
// giờ thật -> giờ của thế giới, đã co giãn để mặt trời luôn mọc lúc 6 và lặn lúc 18 (bảng KEYS bên dưới dùng mốc này)
function worldHour(h,W){
  let wh=W.cycles===0?W.offset:h*W.cycles+W.offset;wh=((wh%24)+24)%24;
  const dl=W.sunset-W.sunrise;if(dl===12&&W.sunrise===6)return wh;
  const t=(((wh-W.sunrise)%24)+24)%24;
  return (t<dl?6+t/dl*12:18+(t-dl)/(24-dl)*12)%24;
}
const mkC=()=>({sun:0,sunC:[1,1,1],amb:1,hS:[1,1,1],hG:[1,1,1],hor:[1,1,1],mid:[1,1,1],top:[1,1,1],moon:0,lamp:0,tint:[1,1,1],glare:0});
const cur=mkC(),tgt=mkC();   // cur = giá trị đang dùng (làm mượt khi đổi tầng) · tgt = giá trị đích của thế giới hiện tại
const SC=['sun','amb','moon','lamp','glare'],CC=['sunC','hS','hG','hor','mid','top','tint'];
const mulC=(a,b)=>{a[0]*=b[0];a[1]*=b[1];a[2]*=b[2]};
function sample(h,W){
  let i=0;while(i<KEYS.length-2&&h>=KEYS[i+1].h)i++;
  const a=KEYS[i],b=KEYS[i+1],t=sm(clamp((h-a.h)/(b.h-a.h),0,1));
  for(const k of SC)tgt[k]=lerp(a[k],b[k],t);
  for(const k of CC)tgt[k]=lerpC(a[k],b[k],t);
  // nhuộm theo thế giới
  tgt.amb*=W.ambK;tgt.glare*=W.glareK;tgt.moon*=W.moonK;
  mulC(tgt.sunC,W.sunTintA);mulC(tgt.hS,W.hemiTintA);mulC(tgt.hG,W.hemiTintA);mulC(tgt.tint,W.ceilMulA);
  if(W.skyK>0&&W.sky){const d=clamp(1-tgt.lamp,0,1);['hor','mid','top'].forEach((n,j)=>{tgt[n]=lerpC(tgt[n],lerpC(W.sky.night[j],W.sky.day[j],d),W.skyK)})}
}
function blend(k){
  for(const n of SC)cur[n]=lerp(cur[n],tgt[n],k);
  for(const n of CC){const a=cur[n],b=tgt[n];a[0]+=(b[0]-a[0])*k;a[1]+=(b[1]-a[1])*k;a[2]+=(b[2]-a[2])*k}
}

// ================= GIỜ: IP -> múi giờ -> giờ địa phương =================
const KEY='bk_daycycle_v1',qs=new URLSearchParams(location.search);
let tz=null,country='',baseH=0,baseT=performance.now(),speed=1,frozen=false,ovr=false,fmts={};
const okTz=z=>{try{new Intl.DateTimeFormat('en-GB',{timeZone:z});return true}catch(e){return false}};
function hourIn(z){
  const f=fmts[z]||(fmts[z]=new Intl.DateTimeFormat('en-GB',{timeZone:z,hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}));
  const p={};for(const x of f.formatToParts(new Date()))p[x.type]=+x.value;
  return (p.hour%24)+p.minute/60+p.second/3600;
}
function resync(){baseH=hourIn(tz);baseT=performance.now()}
function nowH(){if(frozen)return baseH;return(((baseH+(performance.now()-baseT)/3.6e6*speed)%24)+24)%24}
function setTz(z,cc,name){if(!z||!okTz(z))return false;tz=z;country=cc||country;if(!ovr)resync();return true}
async function getJSON(url,ms){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
  try{const r=await fetch(url,{signal:c.signal,cache:'no-store'});if(!r.ok)throw new Error(r.status);return await r.json()}finally{clearTimeout(t)}
}
const GEO=[   // các dịch vụ tra IP (đều cho phép gọi từ trình duyệt); thử lần lượt tới khi có kết quả
  ['https://ipapi.co/json/',j=>({tz:j.timezone,cc:j.country_code})],
  ['https://ipwho.is/',j=>j.success===false?null:({tz:j.timezone&&j.timezone.id,cc:j.country_code})],
  ['https://worldtimeapi.org/api/ip',j=>({tz:j.timezone,cc:''})]
];
async function geolocate(){
  for(const [u,fn] of GEO){
    try{
      const r=fn(await getJSON(u,CFG.geoTimeout));
      if(r&&setTz(r.tz,r.cc)){try{localStorage.setItem(KEY,JSON.stringify({tz,cc:country,t:Date.now()}))}catch(e){}return}
    }catch(e){}
  }
}
(function init(){
  const own=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
  setTz(own,'');                                                 // mặc định: múi giờ trình duyệt (luôn có)
  let c=null;try{c=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
  if(c&&c.tz&&Date.now()-c.t<CFG.cacheHours*3.6e6)setTz(c.tz,c.cc);   // cache IP còn mới -> dùng ngay
  const qz=qs.get('tz');if(qz&&setTz(qz,''))ovr=false;
  const qh=parseFloat(qs.get('hour'));
  if(!isNaN(qh)){baseH=((qh%24)+24)%24;baseT=performance.now();ovr=true;speed=parseFloat(qs.get('speed'))||0;frozen=!speed}
  else if(qs.get('speed')){speed=parseFloat(qs.get('speed'))||1}
  if(!ovr&&!qz&&!(c&&Date.now()-c.t<CFG.cacheHours*3.6e6))geolocate();   // chưa có cache mới: tra IP ngầm (không chặn game)
})();
setInterval(()=>{if(!ovr&&speed===1)resync()},60000);   // khớp lại đồng hồ hệ thống mỗi phút

// ================= ĐÈN: quầng sáng (+ PointLight) bật theo đêm =================
const lamps=[],PLC=[];let _gt=null;   // PLC: danh sách tạm các đèn có PointLight (dùng lại mỗi khung, khỏi tạo rác)
function glowTex(){
  if(_gt)return _gt;const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d'),gr=g.createRadialGradient(32,32,2,32,32,32);
  gr.addColorStop(0,'rgba(255,236,160,.95)');gr.addColorStop(.35,'rgba(255,205,95,.40)');gr.addColorStop(1,'rgba(255,180,60,0)');
  g.fillStyle=gr;g.fillRect(0,0,64,64);return _gt=new THREE.CanvasTexture(cv);
}
function reg(sp,pl,op){lamps.push({sp,pl:pl||null,pI:pl?pl.intensity:0,op:op||1})}   // house.js đã tự tạo sprite / PointLight, chỉ cần đăng ký để bật tắt theo giờ
function lamp(x,y,z,size,o){
  o=o||{};
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex(),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false}));
  sp.scale.set(size,size,1);sp.position.set(x,y,z);S.add(sp);
  let pl=null;if(o.light&&CFG.pointLights){pl=new THREE.PointLight(0xffc860,o.I||1,o.dist||8,2);pl.position.set(x,y-.1,z);S.add(pl)}
  reg(sp,pl,o.op);return sp;
}
// vật liệu KHÔNG ăn đèn (MeshBasic: thác nước, bọt...) cần nhân thêm màu theo giờ, nếu không ban đêm vẫn trắng sáng
const unlits=[];function unlit(m){m.userData._dc=m.color.clone();unlits.push(m)}
// vật liệu PHÁT SÁNG về đêm (mắt bot...): ngược với unlit(). Dùng cùng "độ tối" nightK với đèn lồng. nightK <= lo: material.visible=false (không vẽ, không tốn draw call);
// lo -> hi: màu nội suy từ day sang night (vẽ ra thì khớp với vật thường ban ngày, sáng dần lên); >= hi: sáng hết cỡ. Mặc định lo=.25, hi=.9
const glows=[];function glow(m,day,night,lo,hi){m.visible=false;glows.push({m,d:day,n:night,lo:lo==null?.25:lo,hi:hi==null?.9:hi})}


// ================= BÓNG ĐỔ THẬT (shadow map bám theo người chơi) =================
const SH={on:false,f:0,empty:false,off:false,ema:.016,slow:0,age:0,flags:new WeakSet(),tops:new WeakSet(),casters:[],bandFl:-9,scanT:0,fullT:0};
const _L0=new THREE.Layers(),_bx=new THREE.Box3(),_sn=new THREE.Vector3(),_rr=new THREE.Vector3(),_uu=new THREE.Vector3();
(function initShadow(){
  if(!CFG.shadows||typeof R==='undefined'||!R.shadowMap)return;
  R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;R.shadowMap.autoUpdate=false;R.shadowMap.needsUpdate=true;
  const D=CFG.shadowRange,sh=sun.shadow;sun.castShadow=true;sh.mapSize.set(CFG.shadowSize,CFG.shadowSize);
  Object.assign(sh.camera,{left:-D,right:D,top:D,bottom:-D,near:1,far:CFG.shadowDist+60});sh.camera.updateProjectionMatrix();
  sh.bias=-.0004;sh.normalBias=.05;sh.radius=1.5;S.add(sun.target);SH.on=true;
})();
// gắn cờ đổ / nhận bóng cho mesh mới xuất hiện (quét định kỳ vì cây, nhà, bot... được dựng rải rác theo từng tầng)
function inBand(m,f){   // vật có nằm trong tầng f (giữa sàn tầng f và trần) không: vật tầng khác không được đổ bóng xuống đây
  const lo=FY(f)-.3,hi=(f<NF-1?FY(f+1)-SLAB:FY(NF)+6)+.2;
  return m._y1>lo&&m._y0<hi;
}
function flagMesh(m){
  if(SH.flags.has(m))return;SH.flags.add(m);
  if(!m.isMesh||!m.layers.test(_L0))return;                   // súng / tay (layer 1) không tham gia
  const arr=Array.isArray(m.material),mat=arr?m.material[0]:m.material;
  if(!mat||!(mat.isMeshLambertMaterial||mat.isMeshStandardMaterial||mat.isMeshPhongMaterial))return;   // nước / sương / mây / hiệu ứng (Basic, Shader) bỏ qua
  if(mat.transparent)return;                                  // vật trong mờ (nước, cổng, kính): không nhận không đổ
  m.receiveShadow=true;
  if(arr||m.userData.cx!==undefined)return;                   // sàn / trần tấm: CHỈ nhận (nếu đổ thì trần che tối cả tầng dưới) · cỏ hoa đá vụn: chỉ nhận cho nhẹ
  if(m.isInstancedMesh||m.userData.bot){m.castShadow=true;return}   // cây (instanced) + bot: tầng khác đã bị ẩn sẵn nên không đổ bóng sai
  try{m.updateWorldMatrix(true,false);if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();_bx.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld);m._y0=_bx.min.y;m._y1=_bx.max.y}catch(e){m._y0=-1e9;m._y1=1e9}
  m.castShadow=inBand(m,curFl);SH.casters.push(m);
}
function scanShadow(dt){
  if(!SH.on)return;
  SH.scanT-=dt;SH.fullT-=dt;
  if(SH.scanT<=0){SH.scanT=.25;for(const c of S.children)if(!SH.tops.has(c)){SH.tops.add(c);c.traverse(flagMesh)}}   // nhóm mới thêm vào cảnh
  if(SH.fullT<=0){SH.fullT=1.5;S.traverse(flagMesh);SH.casters=SH.casters.filter(m=>m.parent)}                        // mesh thêm muộn vào nhóm cũ (bot...)
  if(SH.bandFl!==curFl){SH.bandFl=curFl;for(const m of SH.casters)m.castShadow=inBand(m,curFl);SH.f=0;R.shadowMap.needsUpdate=true}   // đổi tầng: chọn lại vật được đổ bóng
}
// vị trí + cập nhật bóng; sl = hướng tới mặt trời (đã chuẩn hoá). Dịch tâm vùng bóng theo từng "texel" để bóng không rung khi đi.
function stepShadow(dt,sl){
  if(!SH.on)return false;
  const dc=Math.min(dt,.1);SH.age+=dc;SH.ema+=(dc-SH.ema)*.05;   // 8 giây đầu (nạp tầng, biên dịch shader) không tính; dt bị chặn 0.1 để tab nền không làm lệch
  SH.slow=SH.age<8?0:SH.ema>.036?SH.slow+dc:Math.max(0,SH.slow-dc);
  if(SH.slow>8&&!SH.off){SH.off=true;console.warn('[DayCycle] máy chậm -> tự tắt bóng đổ')}
  const day=cur.sun>CFG.shadowMinSun&&!SH.off;
  if(day){
    const tx=2*CFG.shadowRange/CFG.shadowSize;
    _rr.set(sl.z,0,-sl.x).normalize();_uu.crossVectors(sl,_rr);
    _sn.set(C.position.x,C.position.y,C.position.z);
    const a=Math.round(_sn.dot(_rr)/tx)*tx,b=Math.round(_sn.dot(_uu)/tx)*tx,c=_sn.dot(sl);
    _sn.set(0,0,0).addScaledVector(_rr,a).addScaledVector(_uu,b).addScaledVector(sl,c);
    sun.target.position.copy(_sn);sun.position.copy(_sn).addScaledVector(sl,CFG.shadowDist);
    if(SH.empty||(++SH.f%CFG.shadowStride===0)){R.shadowMap.needsUpdate=true}SH.empty=false;
  }else{   // đêm / máy yếu: dời vùng bóng ra chỗ trống (bản đồ bóng rỗng = không bóng) nhưng GIỮ NGUYÊN hướng đèn
    if(!SH.empty){sun.target.position.set(0,-5000,0);sun.position.copy(sun.target.position).addScaledVector(sl,CFG.shadowDist);R.shadowMap.needsUpdate=true;SH.empty=true}
  }
  sun.target.updateMatrixWorld();
  return true;
}

// ================= ĐỐI TƯỢNG TRỜI (dựng lười ở khung đầu, khi _sk đã có) =================
const fogCol=new THREE.Color(),_w=new THREE.Color(1,1,1),_v=new THREE.Vector3(),_d=new THREE.Vector3(),_p=new THREE.Vector3(),_e=new THREE.Vector3(),_f=new THREE.Vector3();
const MAXB=3,TEXC={};
function mkTex(key,draw,sz){
  if(TEXC[key])return TEXC[key];
  const c=document.createElement('canvas');c.width=c.height=sz||128;draw(c.getContext('2d'),c.width);return TEXC[key]=new THREE.CanvasTexture(c);
}
const rg=(g,n,stops,r0)=>{const r=g.createRadialGradient(n/2,n/2,r0||0,n/2,n/2,n/2);for(const[s,c]of stops)r.addColorStop(s,c);g.fillStyle=r;g.fillRect(0,0,n,n)};
const SUNTEX={
  glow:()=>mkTex('sun:glow',(g,n)=>rg(g,n,[[0,'rgba(255,255,255,1)'],[.08,'rgba(255,248,225,.95)'],[.2,'rgba(255,225,160,.45)'],[.5,'rgba(255,200,120,.12)'],[1,'rgba(255,190,100,0)']])),
  disc:()=>mkTex('sun:disc',(g,n)=>rg(g,n,[[0,'rgba(255,255,255,1)'],[.15,'rgba(255,255,255,1)'],[.18,'rgba(255,245,220,.5)'],[.4,'rgba(255,225,170,.16)'],[1,'rgba(255,200,120,0)']]))
};
function moonTex(b){
  return mkTex('moon:'+b.phase+(b.ring?'r':''),(g,n)=>{
    rg(g,n,[[0,'rgba(190,210,255,.5)'],[1,'rgba(150,175,255,0)']],n*.18);   // quầng
    const oc=document.createElement('canvas');oc.width=oc.height=n;const o=oc.getContext('2d'),r=n*.2;
    o.fillStyle='#eef3ff';o.beginPath();o.arc(n/2,n/2,r,0,6.283);o.fill();
    o.fillStyle='rgba(150,165,205,.35)';for(const[a,bb,c]of[[.46,.46,.045],[.55,.52,.06],[.5,.6,.035],[.42,.55,.03]]){o.beginPath();o.arc(n*a,n*bb,n*c,0,6.283);o.fill()}
    if(b.phase<.98){o.globalCompositeOperation='destination-out';o.beginPath();o.arc(n/2+2*r*b.phase,n/2-r*.15*b.phase,r*1.02,0,6.283);o.fill()}   // lưỡi liềm
    g.drawImage(oc,0,0);
    if(b.ring){g.strokeStyle='rgba(205,225,255,.6)';g.lineWidth=n*.012;g.beginPath();g.ellipse(n/2,n/2,r*1.9,r*.5,-.35,0,6.283);g.stroke()}
  });
}
const ceilSunTex=()=>mkTex('ceil:sun',(g,n)=>rg(g,n,[[0,'rgba(255,252,232,1)'],[.1,'rgba(255,240,175,.95)'],[.28,'rgba(255,214,120,.6)'],[.6,'rgba(255,196,100,.2)'],[1,'rgba(255,190,100,0)']]));
const ceilMoonTex=()=>mkTex('ceil:moon',(g,n)=>rg(g,n,[[0,'rgba(240,246,255,1)'],[.12,'rgba(225,235,255,.9)'],[.3,'rgba(195,212,255,.5)'],[.6,'rgba(170,190,255,.16)'],[1,'rgba(150,175,255,0)']]));
// ---- cửa sổ sao: HOLE = (tâm x, tâm z, bán kính lõi, bán kính ngoài) · HOLEK = mức mở 0..1 · HOLED = hướng từ người chơi ra trăng · HOLET = thời gian (mép trôi rất chậm). Dùng chung cho mọi vật liệu đã vá ----
const HOLEB={value:new THREE.Vector4(0,0,1e5,1e5)},HOLE={value:new THREE.Vector4(0,0,24,64)},HOLEK={value:0},HOLED={value:new THREE.Vector2(1,0)},HOLET={value:0};
// holeM(xz thế giới) -> 0..1 (1 = hở trời). KHÔNG phải hình tròn: nhiễu (noise) neo theo TOẠ ĐỘ THẾ GIỚI (đi bộ thì khe mây trượt qua như thật) nhân với độ mở giảm dần theo khoảng cách tới trăng,
// nên lõi quanh trăng luôn hở, còn xa ra thì chỉ còn các mảng / dải loang lổ. Nhiễu bị kéo dẹt vuông góc hướng trăng -> dải trải ngang bầu trời.
const HOLE_GLSL='varying vec3 vHW;uniform vec4 uHole;uniform float uOpen;uniform vec2 uDir;uniform float uTm;uniform vec4 uBox;\n'+
'float hH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n'+
'float hN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hH(i),hH(i+vec2(1.0,0.0)),f.x),mix(hH(i+vec2(0.0,1.0)),hH(i+vec2(1.0,1.0)),f.x),f.y);}\n'+
'float holeM(vec2 wp){\n'+
' vec2 q=wp-uHole.xy;float d=length(q);\n'+
' if(uOpen<=0.0||d>=uHole.w)return 0.0;\n'+
' vec2 uv=vec2(dot(wp,uDir),dot(wp,vec2(-uDir.y,uDir.x)));\n'+
' vec2 s=uv*vec2('+CFG.holeNoise[0]+','+CFG.holeNoise[1]+')+vec2(uTm*0.006,uTm*0.002);\n'+
' s+=1.5*vec2(hN(s*1.3+4.3),hN(s*1.3+9.7))-0.75;\n'+                                  // bẻ cong miền -> mép ngoằn ngoèo như nét vẽ tay
' float n=hN(s)*0.5+hN(s*2.07+7.1)*0.3+hN(s*4.3+2.9)*0.2;\n'+
' float g=1.0-smoothstep(0.0,uHole.w,d);\n'+
' float nc=clamp((n-0.45)*2.4+0.5,0.0,1.0);\n'+
' float m=smoothstep(0.55,0.70,nc*0.8+g*0.7);\n'+
' vec2 eb=uBox.zw-abs(wp-uBox.xy);m*=smoothstep('+CFG.holeEdge[0].toFixed(2)+','+CFG.holeEdge[1].toFixed(2)+',min(eb.x,eb.y));\n'+
' return m*(1.0-smoothstep(uHole.w*0.8,uHole.w,d))*uOpen;\n'+
'}\n';
// mode 0: lớp sương trần -> trong suốt trong cửa sổ · mode 2: mặt dưới tấm trần -> tối hơn trong cửa sổ (nền trời đêm) · mode 3: chấm sao -> chỉ hiện trong cửa sổ
function patchHole(m,mode){
  if(m._holeP)return;m._holeP=true;
  m.onBeforeCompile=sh=>{
    sh.uniforms.uHole=HOLE;sh.uniforms.uOpen=HOLEK;sh.uniforms.uDir=HOLED;sh.uniforms.uTm=HOLET;sh.uniforms.uBox=HOLEB;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vHW;').replace('#include <begin_vertex>','#include <begin_vertex>\nvHW=(modelMatrix*vec4(transformed,1.0)).xyz;');
    const hook=mode===3?'#include <color_fragment>':'#include <map_fragment>',
      code=mode===0?'diffuseColor.a*=1.0-holeM(vHW.xz);':mode===2?'diffuseColor.rgb*=1.0-0.6*holeM(vHW.xz);':'diffuseColor.a*=holeM(vHW.xz);';
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+HOLE_GLSL).replace(hook,hook+'\n{'+code+'}');
  };
  m.customProgramCacheKey=()=>'holeMode'+mode;m.needsUpdate=true;
}
// sao rải trên đĩa bán kính R (toạ độ cục bộ quanh tâm cửa sổ); mờ dần về mép đĩa
function starsDisc(n,R,seed){
  let sd=seed*7919+13;const rn=()=>(sd=(sd*1664525+1013904223)>>>0)/4294967296;
  const pos=new Float32Array(n*3),col=new Float32Array(n*3);
  for(let i=0;i<n;i++){
    const r=R*Math.sqrt(rn()),a=rn()*6.283185,k=(1-ss(CFG.holeR[1]*.75,CFG.holeR[1],r))*(.5+.5*rn()),t=rn();
    pos[i*3]=Math.cos(a)*r;pos[i*3+1]=0;pos[i*3+2]=Math.sin(a)*r;
    col[i*3]=k*(t<.2?1:t<.5?.82:.95);col[i*3+1]=k*(t<.2?.9:t<.5?.9:.97);col[i*3+2]=k*(t<.2?.75:1);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));return g;
}
// trăng khuyết VOXEL: lấy mẫu hình khuyết (đĩa bán kính 1 khoét bởi đĩa lệch, phase 1 = tròn, nhỏ = mảnh) trên lưới CFG.moonCells x CFG.moonCells, mỗi ô giữ lại thành 1 khối lập phương (dày 2 ô).
// Hình khuyết được nghiêng ngay lúc lấy mẫu nên các khối vẫn thẳng hàng với lưới như mọi vật voxel khác trong game. Mỗi khối sáng tối hơi khác nhau (vài khối sẫm làm "hố" trăng). Mặt giấu kín bị bỏ.
const _cg={};
const VFACES=[[[1,0,0],[0,1,0],[0,0,1]],[[-1,0,0],[0,0,1],[0,1,0]],[[0,1,0],[0,0,1],[1,0,0]],[[0,-1,0],[1,0,0],[0,0,1]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[0,1,0],[1,0,0]]];   // [pháp tuyến, trục a, trục b] (a x b = pháp tuyến -> mặt quay ra ngoài)
function voxelCrescent(phase){
  const N=CFG.moonCells,key=phase.toFixed(2)+'_'+N;if(_cg[key])return _cg[key];
  const s=2/N,h=s/2,c=2*clamp(phase,.12,.95),rB=1.02,ph=.4,cp=Math.cos(ph),sp=Math.sin(ph);
  let sd=11;const rn=()=>(sd=(sd*1664525+1013904223)>>>0)/4294967296;
  const cells=[],has=new Set();let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){
    const x=-1+(i+.5)*s,y=-1+(j+.5)*s,u=x*cp-y*sp,v=x*sp+y*cp;
    if(u*u+v*v>1||Math.hypot(u-c,v)<=rB)continue;
    const r=rn(),br=r<.16?.7:.86+.14*rn();
    for(let k=0;k<2;k++){cells.push([i,j,k,br]);has.add(i+','+j+','+k)}
    x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
  }
  const ox=(x0+x1)/2,oy=(y0+y1)/2,P=[],NR=[],V=[],I=[];
  for(const[i,j,k,br]of cells){
    const cx=-1+(i+.5)*s-ox,cy=-1+(j+.5)*s-oy,cz=(k-.5)*s;
    for(const[n,a,b]of VFACES){
      if(has.has((i+n[0])+','+(j+n[1])+','+(k+n[2])))continue;   // có khối kề -> mặt này bị che
      const o=P.length/3;
      for(const[sa,sb]of[[-1,-1],[1,-1],[1,1],[-1,1]]){
        P.push(cx+(n[0]+a[0]*sa+b[0]*sb)*h,cy+(n[1]+a[1]*sa+b[1]*sb)*h,cz+(n[2]+a[2]*sa+b[2]*sb)*h);NR.push(n[0],n[1],n[2]);V.push(br);
      }
      I.push(o,o+1,o+2,o,o+2,o+3);
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(NR,3));g.setAttribute('aV',new THREE.Float32BufferAttribute(V,1));g.setIndex(I);
  return _cg[key]=g;
}
// mặt trời VOXEL: quả cầu ghép từ các khối lập phương (lưới N x N x N, giữ ô có tâm trong bán kính 1), mặt giấu kín bị bỏ. Cầu đối xứng nên không cần xoay về phía người chơi -> khối luôn thẳng hàng lưới.
const SUN_SHELLS=[[1.9,.62],[3,.45],[4.4,.3]];   // các lớp sương vàng quanh lõi voxel: [cỡ x bán kính lõi, độ đặc]
let _sg=null;
function voxelSphere(){
  if(_sg)return _sg;
  const N=CFG.sunCells,s=2/N,h=s/2;let sd=5;const rn=()=>(sd=(sd*1664525+1013904223)>>>0)/4294967296;
  const cells=[],has=new Set();
  for(let i=0;i<N;i++)for(let j=0;j<N;j++)for(let k=0;k<N;k++){
    const x=-1+(i+.5)*s,y=-1+(j+.5)*s,z=-1+(k+.5)*s;if(x*x+y*y+z*z>1)continue;
    cells.push([x,y,z,i,j,k,.88+.12*rn()]);has.add(i+','+j+','+k);
  }
  const P=[],NR=[],V=[],I=[];
  for(const[x,y,z,i,j,k,br]of cells)for(const[n,a,b]of VFACES){
    if(has.has((i+n[0])+','+(j+n[1])+','+(k+n[2])))continue;
    const o=P.length/3;
    for(const[sa,sb]of[[-1,-1],[1,-1],[1,1],[-1,1]]){P.push(x+(n[0]+a[0]*sa+b[0]*sb)*h,y+(n[1]+a[1]*sa+b[1]*sb)*h,z+(n[2]+a[2]*sa+b[2]*sb)*h);NR.push(n[0],n[1],n[2]);V.push(br)}
    I.push(o,o+1,o+2,o,o+2,o+3);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(NR,3));g.setAttribute('aV',new THREE.Float32BufferAttribute(V,1));g.setIndex(I);
  return _sg=g;
}
// tâm cửa sổ / mặt trời / trăng của tầng đang đứng: giữa trần (0,0), tạo 1 lần cho mỗi tầng
function getAnch(){
  let an=X.anch[curFl];
  if(!an){const q=_sk.fl.find(o=>o.f===curFl),A=q?q.A:60;an={x:0,z:0,bx:0,bz:0,hx:A,hz:A,A};
    if(CFG.holeCenter){an.x=an.bx=CFG.holeCenter[0];an.z=an.bz=CFG.holeCenter[1]}
    if(CFG.holeHalf){an.hx=CFG.holeHalf[0];an.hz=CFG.holeHalf[1]}
    X.anch[curFl]=an}
  return an;
}
let X=null;
function build(){
  const add=(tex,additive)=>{const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,depthWrite:false,transparent:true,fog:false}));
    s.renderOrder=additive?0:2;s.frustumCulled=false;s.visible=false;S.add(s);return s};
  const pool=(tex,add_)=>Array.from({length:MAXB},()=>add(tex,add_));
  // Quầng nắng / trăng dưới trần: tấm NẰM NGANG sát trần (như các lớp sương). Bản cũ là Sprite dựng đứng to 18-36m đặt cách trần 2,2m nên nửa trên chui vào tấm trần và bị cắt thẳng.
  const flat=tex=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide,fog:false}));
    m.rotation.order='YXZ';m.rotation.x=Math.PI/2;m.renderOrder=2;m.frustumCulled=false;m.visible=false;S.add(m);return m};
  const fpool=tex=>Array.from({length:MAXB},()=>flat(tex));
  // ---- CỬA SỔ SAO: khoét 1 vùng mềm trong các lớp sương trần (và tối nền trần) để lộ bầu trời đêm + sao. Mây nhỏ lơ lửng KHÔNG bị đụng tới. ----
  for(const q of _sk.fl)for(const l of q.lay)patchHole(l.m.material,0);
  for(const m of CEILMATS)patchHole(m,2);
  // sao trong cửa sổ: 2 lớp chấm tròn (nhỏ nhiều / to ít) nhấp nháy xen kẽ, nằm sát trần, đi theo tâm cửa sổ
  const cStars=[];
  for(const q of _sk.fl){if(q.f>=NF-1)continue;   // tầng cao nhất hở trời: đã có sao trên vòm
    const grp=new THREE.Group();grp.position.y=FY(q.f+1)-SLAB-.1;grp.visible=false;q.g.add(grp);
    [[3000,1.9,3],[340,2.9,5]].forEach(([n,sz,sd],j)=>{
      const pts=new THREE.Points(starsDisc(n,CFG.holeR[1]+2,sd),new THREE.PointsMaterial({size:sz,sizeAttenuation:false,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,opacity:0}));patchHole(pts.material,3);   // chấm sao chỉ hiện đúng trong phần hở trời (cùng mặt nạ với sương trần)
      pts.renderOrder=3;pts.frustumCulled=false;grp.add(pts);cStars.push({pts,grp,q,j});
    });
  }
  // trăng khuyết 3D lơ lửng (như hạt mây): khối vát tròn, luôn quay mặt về người chơi, có quầng sáng nhỏ
  const mm=new THREE.ShaderMaterial({transparent:true,uniforms:{uC:{value:new THREE.Color(1,.96,.85)},uO:{value:1}},
    vertexShader:'attribute float aV;varying vec3 vN;varying float vV;void main(){vN=normalize(normalMatrix*normal);vV=aV;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'uniform vec3 uC;uniform float uO;varying vec3 vN;varying float vV;void main(){float c=clamp(dot(normalize(vN),vec3(0.0,0.0,1.0)),0.0,1.0);vec3 col=uC*(0.55+0.45*c)*vV+vec3(0.10,0.11,0.16)*pow(1.0-c,2.0);gl_FragColor=vec4(col,uO);}'});
  const cres=new THREE.Mesh(voxelCrescent(.32),mm);cres.scale.setScalar(CFG.moonSize);cres.renderOrder=2;cres.frustumCulled=false;
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:ceilMoonTex(),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false}));
  halo.scale.set(CFG.moonSize*6,CFG.moonSize*6,1);halo.position.z=-.6;halo.renderOrder=1;
  // hào quang trên trần: tấm sáng NẰM NGANG sát mặt dưới trần, ngay trên đầu trăng (không bị tấm trần cắt như sprite đứng)
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:ceilMoonTex(),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}));
  glow.rotation.x=Math.PI/2;glow.scale.set(CFG.moonSize*16,CFG.moonSize*16,1);glow.renderOrder=1;glow.frustumCulled=false;
  const mg=new THREE.Group();mg.visible=false;mg.add(glow,halo,cres);S.add(mg);
  const moon={g:mg,mesh:cres,mat:mm,halo,glow};
  // sao: điểm trên nửa vòm trời, đi theo camera
  const N=CFG.stars,pos=new Float32Array(N*3),col=new Float32Array(N*3);let sd=7;const rn=()=>(sd=(sd*1664525+1013904223)>>>0)/4294967296;
  for(let i=0;i<N;i++){const u=rn()*6.283,y=.05+rn()*.95,r=Math.sqrt(1-y*y),R_=CFG.dist+20;pos.set([Math.cos(u)*r*R_,y*R_,Math.sin(u)*r*R_],i*3);const w=.75+rn()*.25,t=rn();col.set([w*(.85+.15*t),w*.95,w],i*3)}
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(pos,3));sg.setAttribute('color',new THREE.BufferAttribute(col,3));
  const stars=new THREE.Points(sg,new THREE.PointsMaterial({size:2.2,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:0,depthWrite:false,fog:false}));
  stars.renderOrder=-.5;stars.frustumCulled=false;S.add(stars);
  const moonL=new THREE.DirectionalLight(0x9bb4ff,0);moonL.layers.enable(1);S.add(moonL);
  // quầng chói khi nhìn thẳng vào mặt trời (CSS, đặt DƯỚI HUD)
  const gl=document.createElement('div');gl.style.cssText='position:fixed;inset:0;pointer-events:none;opacity:0';
  const hud=document.getElementById('hud');hud?hud.parentNode.insertBefore(gl,hud):document.body.appendChild(gl);
  // đồng hồ nhỏ
  let bd=null;
  if(CFG.badge&&hud){bd=document.createElement('div');bd.style.cssText='position:absolute;right:16px;top:calc(62px + env(safe-area-inset-top,0px));background:rgba(255,255,255,.85);color:#2b2a3a;border:2px solid #fff;border-radius:12px;padding:3px 10px;font:700 13px "Trebuchet MS",Verdana,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.18)';hud.appendChild(bd)}
  const sun3=Array.from({length:MAXB},()=>{
    const mat=new THREE.ShaderMaterial({transparent:true,uniforms:{uC:{value:new THREE.Color(1,1,1)},uO:{value:1}},
      vertexShader:'attribute float aV;varying vec3 vN;varying float vV;void main(){vN=normalize(normalMatrix*normal);vV=aV;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'uniform vec3 uC;uniform float uO;varying vec3 vN;varying float vV;void main(){float c=clamp(dot(normalize(vN),vec3(0.0,0.0,1.0)),0.0,1.0);gl_FragColor=vec4(uC*(0.93+0.07*c)*vV,uO);}'});
    const mesh=new THREE.Mesh(voxelSphere(),mat);mesh.renderOrder=3;mesh.frustumCulled=false;
    // quầng = các lớp SƯƠNG VÀNG hình cầu lồng nhau (như mây trong sky.js): giữa đặc, mép loãng dần, không viền. [tỉ lệ so với bán kính lõi, độ đặc]
    const gs=new THREE.SphereGeometry(1,24,16);
    const shells=SUN_SHELLS.map(([k,a])=>{
      const m=new THREE.Mesh(gs,new THREE.ShaderMaterial({transparent:true,depthWrite:false,fog:false,uniforms:{uC:{value:new THREE.Color(1,.9,.4)},uO:{value:1}},
        vertexShader:'varying vec3 vN;varying vec3 vP;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vP=mv.xyz;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*mv;}',
        fragmentShader:'uniform vec3 uC;uniform float uO;varying vec3 vN;varying vec3 vP;void main(){float c=clamp(dot(normalize(vN),-normalize(vP)),0.0,1.0);gl_FragColor=vec4(uC,'+a.toFixed(3)+'*uO*smoothstep(0.0,0.8,c));}'}));
      m.userData.k=k;m.renderOrder=2;m.frustumCulled=false;return m});
    const g=new THREE.Group();g.visible=false;g.add(mesh,...shells);S.add(g);return {g,mesh,mat,shells};
  });
  return {sun3,sunB:pool(SUNTEX.glow(),true),moonB:pool(moonTex({phase:1}),true),cSun:fpool(ceilSunTex()),cMoon:fpool(ceilMoonTex()),
    anch:{},stars,moonL,gl,bd,lastPaint:'',paintT:0,bdT:0,bdTxt:'',wi:-1,fade:1,cStars,moon,tt:0};
}
// gán kiểu (ảnh) mặt trời / mặt trăng của thế giới W cho các sprite
function assignWorld(wi,W){
  X.wi=wi;
  W.suns.forEach((b,i)=>{X.sunB[i].material.map=SUNTEX[b.style]?SUNTEX[b.style]():SUNTEX.glow()});
  W.moons.forEach((b,i)=>{X.moonB[i].material.map=moonTex(b)});
  {const b=W.moons[0];X.moon.mesh.geometry=voxelCrescent(b.phase);X.moon.mat.uniforms.uC.value.setRGB(b.c[0],b.c[1]*.97,b.c[2]*.9)}   // trăng 3D dưới trần: khối voxel khuyết theo thế giới
  X.stars.material.color.setRGB(...W.starColA);X.stars.material.size=W.starSize;X.moonL.color.setRGB(...W.moonLightA);
}
// hướng của 1 thiên thể trên quỹ đạo: góc th (0 = mọc, π/2 = đỉnh đầu), z = lệch ngang, az = xoay quỹ đạo quanh trục dọc
function arc(out,th,z,az){
  out.set(Math.cos(th)*.95,Math.sin(th),z).normalize();
  if(az){const c=Math.cos(az),s=Math.sin(az),x=out.x;out.x=x*c-out.z*s;out.z=x*s+out.z*c}
  return out;
}
const emoji=h=>h<5.5||h>=19.5?'🌙':h<7?'🌅':h<10?'🌤️':h<14?'☀️':h<17.5?'🌤️':'🌇';
let lastFl=-1,trans=0;

// ================= MỖI KHUNG (sky.js: tickSky gọi cuối hàm) =================
function tick(dt){
  if(!_sk)return;
  if(!X)X=build();
  const wi=Math.min(Math.max(curFl,0),WN-1),W=WORLDS[wi];
  if(X.wi!==wi)assignWorld(wi,W);
  let k=1;
  if(lastFl===-1){lastFl=wi}
  else if(lastFl!==wi){lastFl=wi;trans=1.5;X.fade=0}   // sang thế giới khác: màu trời chuyển mượt, thiên thể hiện dần
  if(trans>0){trans-=dt;k=Math.min(1,dt*3)}
  X.fade=Math.min(1,X.fade+dt*1.2);
  const h=worldHour(nowH(),W);sample(h,W);blend(k);
  const th=(h-CFG.sunrise)/(CFG.sunset-CFG.sunrise)*Math.PI,e=Math.sin(th),me=-e;     // e = độ cao mặt trời chính (1 = đỉnh đầu, <0 = dưới chân trời); trăng ngược pha
  const nightK=cur.lamp,amb=cur.amb*(1+(CFG.nightLight-1)*nightK),S0=W.suns[0],M0=W.moons[0];
  // --- ánh sáng ---
  hemi.intensity=amb;hemi.color.setRGB(...cur.hS);hemi.groundColor.setRGB(...cur.hG);
  const sl=_v.set(Math.cos(th)*.9,Math.max(e,.3),.4).normalize();   // hướng đèn nắng: không để chạm đất hẳn (góc thấp tối thiểu) cho mặt đứng vẫn sáng
  if(S0.az){const c=Math.cos(S0.az),s=Math.sin(S0.az),x=sl.x;sl.x=x*c-sl.z*s;sl.z=x*s+sl.z*c}
  if(!stepShadow(dt,sl))sun.position.copy(sl).multiplyScalar(100);
  scanShadow(dt);
  sun.intensity=cur.sun;sun.color.setRGB(...cur.sunC);
  const ml=_v.set(-Math.cos(th)*.8,Math.max(me,.35),-.3).normalize();
  if(M0.az){const c=Math.cos(M0.az),s=Math.sin(M0.az),x=ml.x;ml.x=x*c-ml.z*s;ml.z=x*s+ml.z*c}
  X.moonL.position.copy(ml).multiplyScalar(100);X.moonL.intensity=cur.moon*ss(-.05,.25,me);
  // --- màu trời, sương mù ---
  const under=window.Nature&&Nature.wading||P.under;
  fogCol.setRGB(...cur.hor);
  if(S.background&&S.background.isColor)S.background.copy(fogCol);
  if(S.fog&&!under)S.fog.color.copy(fogCol);
  DayCycle.fog=fogCol;
  X.paintT-=dt;
  if(X.paintT<=0){   // vẽ lại gradient vòm trời ~4 lần / giây (693 đỉnh, rẻ)
    X.paintT=.25;const sig=[cur.hor,cur.mid,cur.top].map(c=>c.map(v=>Math.round(v*255)).join()).join('|');
    if(sig!==X.lastPaint){X.lastPaint=sig;paintDome(_sk.dome.geometry,cur.hor.map(v=>v*255),cur.mid.map(v=>v*255),cur.top.map(v=>v*255))}
  }
  // --- đồ không ăn đèn / sương trần / mây ---
  const T=cur.tint;
  for(const m of HAZE)m.uniforms.uT.value.setRGB(T[0],T[1],T[2]);
  for(const m of CEILMATS)m.color.setRGB(.949*T[0],.965*T[1],.988*T[2]);
  // cửa sổ sao: mức mở theo giờ (mở dần ~20h30 -> 22h30, khép lại ~4h -> 5h30). Mây nhỏ lơ lửng và các lớp sương NGOÀI cửa sổ giữ nguyên.
  X.tt+=dt;HOLET.value=X.tt;
  const open=h>=12?ss(CFG.holeOpen[0],CFG.holeOpen[1],h):1-ss(CFG.holeClose[0],CFG.holeClose[1],h);
  for(const q of _sk.fl)for(const l of q.lay)l.m.material.color.setRGB(T[0],T[1],T[2]);
  for(const m of CEILMATS)patchHole(m,2);   // tấm trần tạo muộn (nếu có) cũng được vá
  for(const m of unlits)m.color.setRGB(m.userData._dc.r*T[0],m.userData._dc.g*T[1],m.userData._dc.b*T[2]);
  // --- mặt trời / mặt trăng / sao ---
  const sky=_sk.dome.visible;   // chỉ tầng cao nhất thấy trời trực tiếp
  X.stars.position.copy(C.position);X.stars.rotation.y=h*.26;X.stars.material.opacity=sky?ss(.55,1,nightK)*.95*(.88+.12*Math.sin(X.tt*2.7)):0;   // nhấp nháy nhẹX.stars.visible=sky&&nightK>.5;
  // ---- tầng có trần: trăng khuyết 3D lơ lửng + cửa sổ sao ngay sau lưng trăng (nhìn từ người chơi) ----
  {const m0=M0,thm=th+Math.PI+m0.dh*Math.PI/12,em=Math.sin(thm),mo=X.moon,vis=!sky&&cur.moon>0&&em>-.05&&CFG.ceilStars>0;
   let holeK=0;
   if(vis){
    // CỬA SỔ CỐ ĐỊNH TRÊN TRẦN (toạ độ thế giới), KHÔNG đi theo người chơi: chạy tới đâu thì nhìn nó từ góc đó (xa -> thấy nhỏ / lệch như cửa sổ thật).
    // Tâm = giữa trần (0,0) (đổi bằng CFG.holeCenter nếu cần).
    const dir=arc(_f,thm,m0.z,m0.az),hd=Math.hypot(dir.x,dir.z)||1,ceil=FY(curFl+1)-SLAB;
    const an=getAnch();
    const hRo=Math.min(CFG.holeR[1],an.A*.72),hRi=Math.min(CFG.holeR[0],hRo*.5);   // cửa sổ không bao giờ to quá nửa trần: luôn chừa viền sương quanh 4 cạnh
    const mx=an.x+dir.x/hd*CFG.moonDrift,mz=an.z+dir.z/hd*CFG.moonDrift,my=ceil-CFG.moonBelow+Math.sin(X.tt*.5)*.3;   // trăng treo dưới trần, trôi nhẹ quanh tâm theo giờ
    mo.g.position.set(mx,my,mz);mo.g.rotation.y=Math.atan2(C.position.x-mx,C.position.z-mz);mo.g.rotation.z=0;   // quay mặt về người chơi (như mây)
    const op=ss(-.05,.25,em)*clamp(cur.moon*2.4,0,1)*m0.bright*X.fade;
    mo.mat.uniforms.uO.value=op;mo.halo.material.opacity=op*.85;mo.halo.material.color.setRGB(m0.c[0],m0.c[1],m0.c[2]);mo.glow.position.y=ceil-.35-my;mo.glow.material.opacity=op*.9;mo.glow.material.color.setRGB(m0.c[0],m0.c[1],m0.c[2]);
    HOLE.value.set(an.x,an.z,hRi,hRo);HOLED.value.set(.6,.8);HOLEB.value.set(an.bx,an.bz,an.hx,an.hz);   // tâm cố định · hướng kéo dẹt cố định
    holeK=open*ss(-.05,.25,em)*CFG.ceilStars;
   }
   mo.g.visible=vis;HOLEK.value=holeK;
   const sOp=ss(.55,1,nightK)*holeK;
   for(const s of X.cStars){
    const on=vis&&curFl===s.q.f&&sOp>.01;s.grp.visible=on;if(!on)continue;
    s.grp.position.x=HOLE.value.x;s.grp.position.z=HOLE.value.y;
    s.pts.material.opacity=sOp*(.62+.38*Math.sin(X.tt*(1.1+s.j*.7)+s.j*2.4));
   }}
  const sdp=arc(_d,th,S0.z,S0.az);   // hướng mặt trời chính (dùng cho quầng chói)
  const sVis=sky&&e>-.1;
  const ceilY=FY(curFl+1)-SLAB-2.2;
  for(let i=0;i<MAXB;i++){
    // ---- mặt trời i ----
    const b=W.suns[i],sp=X.sunB[i],cs=X.cSun[i];
    if(!b){sp.visible=cs.visible=false;X.sun3[i].g.visible=false}
    else{
      const thb=th+b.dh*Math.PI/12,eb=Math.sin(thb),dir=arc(_e,thb,b.z,b.az);
      sp.visible=sky&&eb>-.1;
      if(sp.visible){
        const low=1-clamp(eb,0,1),sz=(34+190*(1+.6*low))*(.9+.25*cur.glare)*b.size;
        sp.position.copy(C.position).addScaledVector(dir,CFG.dist);sp.scale.set(sz,sz,1);
        sp.material.color.setRGB(cur.sunC[0]*b.c[0],cur.sunC[1]*b.c[1],cur.sunC[2]*b.c[2]).lerp(_w,.35*cur.glare);
        sp.material.opacity=ss(-.1,.08,eb)*(cur.sun>0?1:.6)*clamp(cur.sun*2.2,0,1)*b.bright*X.fade;
      }
      // vệt nắng xuyên sương trần (các tầng có trần: không thấy mặt trời trực tiếp, chỉ thấy quầng sáng trên lớp sương theo hướng nắng)
      cs.visible=false;   // tấm nắng phẳng cũ đã bỏ: thay bằng quả cầu voxel lơ lửng
      const s3=X.sun3[i],on3=!sky&&cur.sun>.05&&eb>-.05;s3.g.visible=on3;
      if(on3){
        const an=getAnch(),hd=Math.hypot(dir.x,dir.z)||1,ceil=FY(curFl+1)-SLAB,R=Math.min(CFG.sunSize*b.size,2.4),fa=curFl===1?SKYFOG.layers2:SKYFOG.layers,lowDy=fa[fa.length-1][0],
          sy=ceil-lowDy*CFG.sunMid+Math.sin(X.tt*.4+i)*.15,   // tâm quả cầu nằm ở khoảng GIỮA chồng lớp sương trắng (sky.js: SKYFOG.layers)
          op=ss(-.1,.08,eb)*(cur.sun>0?1:.6)*clamp(cur.sun*2.2,0,1)*b.bright*X.fade;
        s3.g.position.set(an.x+dir.x/hd*CFG.sunDrift,sy,an.z+dir.z/hd*CFG.sunDrift);   // treo sát trần, trôi vòng quanh tâm trần theo giờ
        s3.mesh.scale.setScalar(R);
        // màu mặt trời theo giờ thật: cam đậm lúc bình minh / hoàng hôn (mặt trời thấp) -> vàng nắng lúc trưa (mặt trời cao)
        const lw=1-ss(.02,.55,eb),cr=lerp(1,1,lw),cg=lerp(.88,.46,lw),cb=lerp(.32,.14,lw),tr=(1+b.c[0])/2,tg=(1+b.c[1])/2,tb=(1+b.c[2])/2;
        s3.mat.uniforms.uC.value.setRGB(cr*tr,cg*tg,cb*tb);s3.mat.uniforms.uO.value=op;
        for(const sh of s3.shells){sh.scale.setScalar(Math.min(R*sh.userData.k,ceil-sy-.3));   // lớp ngoài không chạm trần
          sh.material.uniforms.uC.value.setRGB(lerp(cr*tr,1,.25),lerp(cg*tg,1,.25),lerp(cb*tb,1,.25));sh.material.uniforms.uO.value=op}
      }
    }
    // ---- mặt trăng i ----
    const m=W.moons[i],mp=X.moonB[i],cm=X.cMoon[i];
    if(!m){mp.visible=cm.visible=false}
    else{
      const thm=th+Math.PI+m.dh*Math.PI/12,em=Math.sin(thm),dir=arc(_f,thm,m.z,m.az);
      mp.visible=sky&&em>-.08&&cur.moon>0;
      if(mp.visible){
        const s=70*m.size;mp.position.copy(C.position).addScaledVector(dir,CFG.dist);mp.scale.set(s,s,1);
        mp.material.color.setRGB(m.c[0],m.c[1],m.c[2]);mp.material.opacity=ss(-.08,.15,em)*clamp(cur.moon*2.4,0,1)*m.bright*X.fade;
      }
      cm.visible=false;   // trăng dưới trần giờ là khối 3D (X.moon, bên dưới), không dùng tấm phẳng
      if(cm.visible){
        const R_=12+34*(1-clamp(em,0,1)),hd=Math.hypot(dir.x,dir.z)||1,s=(18+10*(1-clamp(em,0,1)))*m.size;
        cm.position.set(C.position.x+dir.x/hd*R_,ceilY,C.position.z+dir.z/hd*R_);cm.scale.set(s,s,1);cm.rotation.y=Math.atan2(dir.x,dir.z);
        cm.material.color.setRGB(m.c[0],m.c[1],m.c[2]);cm.material.opacity=clamp(cur.moon*2,0,.85)*ss(-.05,.2,em)*m.bright*X.fade;
      }
    }
  }
  // --- quầng chói (nhìn thẳng mặt trời, nhất là buổi trưa) ---
  let gA=0;
  if(sVis&&cur.glare>.05){
    C.getWorldDirection(_p);const dt_=_p.dot(sdp);
    if(dt_>.45){_p.copy(C.position).addScaledVector(sdp,CFG.dist).project(C);gA=ss(.45,.97,dt_)*cur.glare*.8;
      const px=((_p.x+1)/2*100).toFixed(1),py=((1-_p.y)/2*100).toFixed(1),c=cur.sunC.map(v=>Math.round(255*(.6+.4*v))).join();
      X.gl.style.background='radial-gradient(circle at '+px+'% '+py+'%,rgba('+c+',1) 0,rgba('+c+',.55) 14%,rgba('+c+',.15) 38%,rgba('+c+',0) 65%)'}
  }
  X.gl.style.opacity=gA.toFixed(2);
  // --- đèn ---
  for(let i=lamps.length-1;i>=0;i--){
    const l=lamps[i];if(!l.sp.parent){lamps.splice(i,1);continue}   // tầng đã dỡ -> bỏ
    l.sp.material.opacity=l.op*(.16+.9*nightK);
    if(l.pl){
      l.pl.intensity=l.pI*(.08+1.55*nightK);
      PLC.push(l);
    }
  }
  // PointLight: ban ngày gỡ hẳn khỏi shader (Lambert tính sáng theo từng ĐỈNH, mỗi đèn nhân với hàng triệu đỉnh). Ban đêm chỉ bật các đèn GẦN camera nhất
  // (số đèn bật luôn giữ cố định nên three.js không phải biên dịch lại shader khi đổi đèn). Đèn xa vẫn còn quầng sáng (sprite) nên nhìn không khác.
  {const on=nightK>.03,cap=CFG.maxPointLights;
    if(!on||!cap||PLC.length<=cap){for(const l of PLC)l.pl.visible=on}
    else{
      const cx=C.position.x,cy=C.position.y,cz=C.position.z;
      for(const l of PLC){const e=l.pl.matrixWorld.elements,dx=e[12]-cx,dy=e[13]-cy,dz=e[14]-cz;l.dk=Math.sqrt(dx*dx+dy*dy+dz*dz)-(l.pl.visible?2:0)}   // đèn đang bật được cộng ưu tiên 2m: tránh nhấp nháy khi 2 đèn cách camera xấp xỉ nhau
      PLC.sort((a,b)=>a.dk-b.dk);
      for(let i=0;i<PLC.length;i++)PLC[i].pl.visible=i<cap;
    }
    PLC.length=0}
  // --- vật liệu phát sáng về đêm (mắt bot...) ---
  for(const g of glows){
    if(nightK<=g.lo){g.m.visible=false;continue}
    g.m.visible=true;const t=ss(g.lo,g.hi,nightK);
    g.m.color.setRGB(lerp(g.d[0],g.n[0],t),lerp(g.d[1],g.n[1],t),lerp(g.d[2],g.n[2],t));
  }
  // --- đồng hồ (giờ của thế giới đang đứng; tầng 1 hiện thêm quốc gia) ---
  if(X.bd){X.bdT-=dt;if(X.bdT<=0){X.bdT=.5;const hh=Math.floor(h),mm=Math.floor((h-hh)*60),t=emoji(h)+' '+String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0')+' · '+(wi===0&&country?country:W.name||('T'+(wi+1)));if(t!==X.bdTxt){X.bdTxt=t;X.bd.textContent=t;X.bd.title=tz}}}
}
window.DayCycle={tick,reg,lamp,unlit,glow,shadows(on){SH.off=!on;if(on){SH.slow=0;SH.ema=.016}},fog:fogCol,hour:nowH,cur,KEYS,
  worlds:WORLDS,world:f=>WORLDS[f],
  info:()=>({tz,country,hour:nowH()}),
  setHour(h,spd){if(h==null){ovr=false;frozen=false;speed=1;resync();return}baseH=((h%24)+24)%24;baseT=performance.now();ovr=true;speed=spd||0;frozen=!speed}
};
})();