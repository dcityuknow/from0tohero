// CHU KỲ NGÀY - ĐÊM THEO GIỜ THẬT CỦA NGƯỜI CHƠI (mọi tầng dùng chung 1 mặt trời / 1 mặt trăng).
//  - Giờ: tra múi giờ từ ĐỊA CHỈ IP (ipapi.co -> ipwho.is -> worldtimeapi.org), rồi tính giờ địa phương bằng Intl. Tra lỗi / bị chặn -> dùng múi giờ của trình duyệt.
//    Kết quả cache 12h trong localStorage nên lần sau vào game có giờ ngay, không phải chờ mạng.
//  - Buổi sáng (6-10h): nắng vàng ấm, góc thấp · Trưa (10-14h): nắng gắt, trắng, chói · Chiều (14-18h): nắng dịu dần, ngả cam
//    · Tối (sau ~19h): TẮT NẮNG, chỉ còn ánh trăng xanh nhạt + đèn lồng / đèn đá sáng lên (có quầng sáng, vài đèn có PointLight).
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
  stars:420,
  shadows:qsShadow(),        // bóng đổ thật (mặt trời). ?shadow=0 để tắt
  shadowSize:/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)?1024:2048,   // độ phân giải bản đồ bóng
  shadowRange:/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)?30:32,      // nửa cạnh vùng đổ bóng quanh người chơi (m). Trước là 44; sương mù đã che dần từ 18m (kín ở 55m)
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
const cur={sun:0,sunC:[1,1,1],amb:1,hS:[1,1,1],hG:[1,1,1],hor:[1,1,1],mid:[1,1,1],top:[1,1,1],moon:0,lamp:0,tint:[1,1,1],glare:0};
function sample(h){
  let i=0;while(i<KEYS.length-2&&h>=KEYS[i+1].h)i++;
  const a=KEYS[i],b=KEYS[i+1],t=sm(clamp((h-a.h)/(b.h-a.h),0,1));
  for(const k of['sun','amb','moon','lamp','glare'])cur[k]=lerp(a[k],b[k],t);
  for(const k of['sunC','hS','hG','hor','mid','top','tint'])cur[k]=lerpC(a[k],b[k],t);
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
const lamps=[];let _gt=null;
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


// ================= BÓNG ĐỔ THẬT (shadow map bám theo người chơi) =================
const SH={on:false,f:0,empty:false,off:false,ema:.016,slow:0,age:0,flags:new WeakSet(),tops:new WeakSet(),casters:[],bandFl:-9,scanT:0,fullT:0};
const _L0=new THREE.Layers(),_bx=new THREE.Box3(),_sn=new THREE.Vector3(),_rr=new THREE.Vector3(),_uu=new THREE.Vector3();
(function initShadow(){
  if(!CFG.shadows||typeof R==='undefined'||!R.shadowMap)return;
  R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;R.shadowMap.autoUpdate=false;R.shadowMap.needsUpdate=true;
  const D=CFG.shadowRange,sh=sun.shadow;sun.castShadow=true;sh.mapSize.set(CFG.shadowSize,CFG.shadowSize);
  Object.assign(sh.camera,{left:-D,right:D,top:D,bottom:-D,near:1,far:300});sh.camera.updateProjectionMatrix();
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
  const day=cur.sun>.06&&!SH.off;
  if(day){
    const tx=2*CFG.shadowRange/CFG.shadowSize;
    _rr.set(sl.z,0,-sl.x).normalize();_uu.crossVectors(sl,_rr);
    _sn.set(C.position.x,C.position.y,C.position.z);
    const a=Math.round(_sn.dot(_rr)/tx)*tx,b=Math.round(_sn.dot(_uu)/tx)*tx,c=_sn.dot(sl);
    _sn.set(0,0,0).addScaledVector(_rr,a).addScaledVector(_uu,b).addScaledVector(sl,c);
    sun.target.position.copy(_sn);sun.position.copy(_sn).addScaledVector(sl,130);
    if(SH.empty||(++SH.f%CFG.shadowStride===0)){R.shadowMap.needsUpdate=true}SH.empty=false;
  }else{   // đêm / máy yếu: dời vùng bóng ra chỗ trống (bản đồ bóng rỗng = không bóng) nhưng GIỮ NGUYÊN hướng đèn
    if(!SH.empty){sun.target.position.set(0,-5000,0);sun.position.copy(sun.target.position).addScaledVector(sl,130);R.shadowMap.needsUpdate=true;SH.empty=true}
  }
  sun.target.updateMatrixWorld();
  return true;
}

// ================= ĐỐI TƯỢNG TRỜI (dựng lười ở khung đầu, khi _sk đã có) =================
const fogCol=new THREE.Color(),_w=new THREE.Color(1,1,1),_v=new THREE.Vector3(),_d=new THREE.Vector3(),_p=new THREE.Vector3();
let X=null;
function build(){
  const mk=(draw,sz)=>{const c=document.createElement('canvas');c.width=c.height=sz;draw(c.getContext('2d'),sz);const t=new THREE.CanvasTexture(c);return t};
  const spr=(tex,op)=>{const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false,opacity:op||1}));s.renderOrder=0;s.frustumCulled=false;S.add(s);return s};
  const sunGlow=mk((g,n)=>{const r=g.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.08,'rgba(255,248,225,.95)');r.addColorStop(.2,'rgba(255,225,160,.45)');r.addColorStop(.5,'rgba(255,200,120,.12)');r.addColorStop(1,'rgba(255,190,100,0)');g.fillStyle=r;g.fillRect(0,0,n,n)},128);
  const moonTex=mk((g,n)=>{
    let r=g.createRadialGradient(n/2,n/2,n*.18,n/2,n/2,n/2);r.addColorStop(0,'rgba(190,210,255,.5)');r.addColorStop(1,'rgba(150,175,255,0)');g.fillStyle=r;g.fillRect(0,0,n,n);   // quầng
    g.fillStyle='#eef3ff';g.beginPath();g.arc(n/2,n/2,n*.2,0,6.283);g.fill();
    g.fillStyle='rgba(150,165,205,.35)';for(const[a,b,c]of[[.46,.46,.045],[.55,.52,.06],[.5,.6,.035],[.42,.55,.03]]){g.beginPath();g.arc(n*a,n*b,n*c,0,6.283);g.fill()}
  },128);
  const ceilTex=mk((g,n)=>{const r=g.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);r.addColorStop(0,'rgba(255,252,232,1)');r.addColorStop(.1,'rgba(255,240,175,.95)');r.addColorStop(.28,'rgba(255,214,120,.6)');r.addColorStop(.6,'rgba(255,196,100,.2)');r.addColorStop(1,'rgba(255,190,100,0)');g.fillStyle=r;g.fillRect(0,0,n,n)},128);
  const sun=spr(sunGlow),moon=spr(moonTex),ceil=new THREE.Sprite(new THREE.SpriteMaterial({map:ceilTex,depthWrite:false,transparent:true,fog:false}));   // đĩa nắng NORMAL blend: cộng sáng lên sương trắng sẽ không thấy
  ceil.renderOrder=2;ceil.frustumCulled=false;S.add(ceil);
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
  return {sun,moon,ceil,stars,moonL,gl,bd,sunGlow,lastPaint:'',paintT:0,bdT:0,bdTxt:''};
}
const emoji=h=>h<5.5||h>=19.5?'🌙':h<7?'🌅':h<10?'🌤️':h<14?'☀️':h<17.5?'🌤️':'🌇';

// ================= MỖI KHUNG (sky.js: tickSky gọi cuối hàm) =================
function tick(dt){
  if(!_sk)return;
  if(!X)X=build();
  const h=nowH();sample(h);
  const th=(h-CFG.sunrise)/(CFG.sunset-CFG.sunrise)*Math.PI,e=Math.sin(th),me=-e;     // e = độ cao mặt trời (1 = đỉnh đầu, <0 = dưới chân trời); trăng ngược pha
  const nightK=cur.lamp,amb=cur.amb*(1+(CFG.nightLight-1)*nightK);
  // --- ánh sáng ---
  hemi.intensity=amb;hemi.color.setRGB(...cur.hS);hemi.groundColor.setRGB(...cur.hG);
  const sl=_v.set(Math.cos(th)*.9,Math.max(e,.3),.4).normalize();   // hướng đèn nắng: không để chạm đất hẳn (góc thấp tối thiểu) cho mặt đứng vẫn sáng
  if(!stepShadow(dt,sl))sun.position.copy(sl).multiplyScalar(100);
  scanShadow(dt);
  sun.intensity=cur.sun;sun.color.setRGB(...cur.sunC);
  const ml=_v.set(-Math.cos(th)*.8,Math.max(me,.35),-.3).normalize();
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
  for(const q of _sk.fl)for(const l of q.lay)l.m.material.color.setRGB(T[0],T[1],T[2]);
  for(const m of unlits)m.color.setRGB(m.userData._dc.r*T[0],m.userData._dc.g*T[1],m.userData._dc.b*T[2]);
  // --- mặt trời / mặt trăng / sao (chỉ thấy khi đang ở tầng cao nhất có trời) ---
  const sky=_sk.dome.visible;
  X.stars.position.copy(C.position);X.stars.rotation.y=h*.26;X.stars.material.opacity=sky?ss(.55,1,nightK)*.95:0;X.stars.visible=sky&&nightK>.5;
  const sd_=_d.set(Math.cos(th)*.95,e,.33).normalize();
  const sVis=sky&&e>-.1;X.sun.visible=sVis;
  if(sVis){
    const low=1-clamp(e,0,1),sz=(34+190*(1+.6*low))*(.9+.25*cur.glare);
    X.sun.position.copy(C.position).addScaledVector(sd_,CFG.dist);X.sun.scale.set(sz,sz,1);
    X.sun.material.color.setRGB(...cur.sunC).lerp(_w,.35*cur.glare);X.sun.material.opacity=ss(-.1,.08,e)*(cur.sun>0?1:.6)*clamp(cur.sun*2.2,0,1);
  }
  const mVis=sky&&me>-.08&&cur.moon>0;X.moon.visible=mVis;
  if(mVis){const md=_p.set(-Math.cos(th)*.95,me,-.3).normalize();X.moon.position.copy(C.position).addScaledVector(md,CFG.dist);X.moon.scale.set(70,70,1);X.moon.material.opacity=ss(-.08,.15,me)*clamp(cur.moon*2.4,0,1)}
  // vệt nắng xuyên sương trần (các tầng có trần: mặt trời không thấy trực tiếp, chỉ thấy quầng sáng trên lớp sương theo hướng nắng)
  const cg=!sky&&cur.sun>.05&&e>-.05;X.ceil.visible=cg;
  if(cg){
    const cy=FY(curFl+1)-SLAB-2.2,R_=12+34*(1-clamp(e,0,1)),hd=Math.hypot(sd_.x,sd_.z)||1;
    X.ceil.position.set(C.position.x+sd_.x/hd*R_,cy,C.position.z+sd_.z/hd*R_);const s=24+12*(1-clamp(e,0,1));X.ceil.scale.set(s,s,1);
    X.ceil.material.color.setRGB(1,1,1);X.ceil.material.opacity=clamp(cur.sun*.85,0,.95);
  }
  // --- quầng chói (nhìn thẳng mặt trời, nhất là buổi trưa) ---
  let gA=0;
  if(sVis&&cur.glare>.05){
    C.getWorldDirection(_p);const dt_=_p.dot(sd_);
    if(dt_>.45){_p.copy(C.position).addScaledVector(sd_,CFG.dist).project(C);gA=ss(.45,.97,dt_)*cur.glare*.8;
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
      l.pl.visible=nightK>.03;   // ban ngày gỡ hẳn PointLight khỏi shader (Lambert tính sáng theo từng ĐỈNH, mỗi đèn nhân với hàng triệu đỉnh). Đổi số đèn làm three biên dịch lại shader 1 lần mỗi biến thể, sau đó dùng lại từ cache
    }
  }
  // --- đồng hồ ---
  if(X.bd){X.bdT-=dt;if(X.bdT<=0){X.bdT=.5;const hh=Math.floor(h),mm=Math.floor((h-hh)*60),t=emoji(h)+' '+String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0')+(country?' · '+country:'');if(t!==X.bdTxt){X.bdTxt=t;X.bd.textContent=t;X.bd.title=tz}}}
}
window.DayCycle={tick,reg,lamp,unlit,shadows(on){SH.off=!on;if(on){SH.slow=0;SH.ema=.016}},fog:fogCol,hour:nowH,cur,KEYS,
  info:()=>({tz,country,hour:nowH()}),
  setHour(h,spd){if(h==null){ovr=false;frozen=false;speed=1;resync();return}baseH=((h%24)+24)%24;baseT=performance.now();ovr=true;speed=spd||0;frozen=!speed}
};
})();
