// Thiên nhiên: cây, tảng đá, hồ nước, bụi cây, hoa cỏ, nấm, khúc gỗ, bướm... tất cả dựng bằng mảnh rubik (VB) như phần còn lại của game.
// Nạp SAU src/player/viewmodel.js và TRƯỚC src/entities/bot-model.js (để bot không sinh ra trong thân cây / tảng đá).
// Mỗi tầng 1 chủ đề: 1 đồng cỏ · 2 rừng anh đào · 3 mùa thu · 4 tuyết.
// Chỉnh nhanh ở CFG bên dưới: quality (càng cao càng nhiều mảnh nhỏ), density (số lượng cây/đá/hoa).
(function(){
if(window.FM)FM.close('set0');   // nhà / chòi / tượng / bàn trà đã dựng xong: ghi nhận để dỡ / dựng lại khi rời / quay lại tầng 1
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
const SLT=typeof SLAB==='number'?SLAB:1;   // độ dày sàn tầng 2-4 (level.js)
const V=s=>s/CFG.quality;
const TV=s=>s/(CFG.quality*CFG.treeDetail);   // như V nhưng riêng cho cây
const WC=2;   // cỡ ô của bản đồ 'gần nước' (m)
const CELL=.5,ck=(ci,cj)=>(ci+600)*2048+(cj+600);   // lưới ô của hồ căn theo tọa độ thế giới (ô .5m)
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
const bandFn=(cols,ny)=>(i,j,k)=>{let b=j<ny*.33?2:j<ny*.7?0:1;if((i*5+j*3+k*7)%7===0)b=(b+1)%3;return cols[b]};   // tối ở dưới, sáng ở trên
const rockFn=(T,ny)=>(i,j,k)=>{if(T.moss&&j>ny*.7&&(i*7+k*11)%4)return T.moss;const b=j<ny*.34?2:j<ny*.7?0:1;return T.rock[((i*3+k*5+j)%9===0)?(b+1)%3:b]};

// ---- Cây: thân thẳng hoặc cong/nghiêng, cành chính + cành phụ xòe ra, tán lá là các cụm ở đầu cành ----
function bendFn(rand,amt){   // đường cong của thân: amt = độ lệch tối đa ở ngọn (m); 0 = thẳng tắp
  const a=rand()*6.283,c=Math.cos(a),sn=Math.sin(a),ph=rand()*6.283;
  return u=>{u=clamp01(u);const m=amt*(Math.pow(u,1.5)+.3*Math.sin(u*4.4+ph)*u),p=amt*.25*Math.sin(u*3.4+ph*1.7)*u;return[c*m-sn*p,sn*m+c*p]};
}
function bTrunk(v,T,r,H,off,tp=.6){   // thân: các đốt trụ xếp chồng, mỗi đốt lệch theo đường cong, thu nhỏ dần + 4 rễ
  const ts=TV(.1),hs=.3,col=(a,b,l)=>T.trunk[(a*3+b*5+l*7)%T.trunk.length];
  for(let y=-.15;y<H;y+=hs){const u=(y+hs/2)/H,rr=r*(1.35-tp*Math.min(1,u*1.5)),[ox,oz]=off(u);
    v.cyl(ox,y+hs/2,oz,rr,hs*1.25,col,ts,'y',Math.max(0,rr-ts*1.6))}
  for(const [x,z,w,d] of [[1,0,.3,.16],[-1,0,.3,.16],[0,1,.16,.3],[0,-1,.16,.3]])v.box(x*r*1.45,.09,z*r*1.45,w,.18,d,T.trunk[0],ts);
}
function limb(v,T,a,b,r0,r1,ts){   // 1 cành: dãy khối nhỏ nối từ a tới b, mảnh dần
  const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz),n=Math.max(2,Math.ceil(len/(ts*.8)));
  for(let k=0;k<=n;k++){const t=k/n,r=r0+(r1-r0)*t,d=Math.max(ts*.9,2*r);
    v.cube(a[0]+dx*t,a[1]+dy*t,a[2]+dz*t,d,d,d,T.trunk[(k+(k>>2))%T.trunk.length],k,k>>1,n)}
}
function roundTree(T,rand,cols,vi=0,wide=false){   // vi: 0,1 = thân thẳng · 2 = cong nhẹ · 3 = cong/nghiêng mạnh; wide = anh đào (cành xòe ngang, rủ)
  const v=new VB(),s=TV(.22),ts=TV(.1),tr=rand.range(.2,.27),H=rand.range(2.6,3.4),
    amt=[0,0,rand.range(.5,.8),rand.range(.95,1.4)][vi%4],off=bendFn(rand,amt);let ext=1,top=H;
  bTrunk(v,T,tr,H,off);
  const blob=(x,y,z,rx,ry,rz)=>{v.ell(x,y,z,rx,ry,rz,bandFn(cols,Math.round(2*ry/s)),s,true);ext=Math.max(ext,Math.hypot(x,z)+rx);top=Math.max(top,y+ry)};
  const n=rand.int(wide?5:4,wide?7:6),a0=rand()*6.283;
  for(let i=0;i<n;i++){
    const a=a0+i/n*6.283+rand.range(-.35,.35),hb=H*rand.range(.5,.92),[ox,oz]=off(hb/H),hl=rand.range(.85,1.5)*(wide?1.2:1),
      rise=hl*rand.range(wide?.05:.3,wide?.45:.85),p0=[ox,hb,oz],p1=[ox+Math.cos(a)*hl,hb+rise,oz+Math.sin(a)*hl],
      r0=tr*(1.35-.6*Math.min(1,hb/H*1.5))*.55;
    limb(v,T,p0,p1,r0,r0*.4,ts);                                         // cành chính
    const R=rand.range(.55,.85);blob(p1[0],p1[1]+R*.35,p1[2],R,R*.8,R);   // cụm lá ở đầu cành
    const sa=a+rand.range(.5,.9)*(rand()<.5?1:-1),m=[(p0[0]+p1[0])/2,(p0[1]+p1[1])/2,(p0[2]+p1[2])/2],sl=hl*rand.range(.5,.75),
      p2=[m[0]+Math.cos(sa)*sl,m[1]+sl*rand.range(.2,.7),m[2]+Math.sin(sa)*sl];
    limb(v,T,m,p2,r0*.6,r0*.3,ts);                                       // cành phụ tách ra từ giữa cành chính
    const R2=R*rand.range(.6,.85);blob(p2[0],p2[1]+R2*.3,p2[2],R2,R2*.8,R2);
  }
  const [tx,tz]=off(1),R3=rand.range(.75,1);blob(tx,H+R3*.35,tz,R3,R3*.8,R3);   // cụm lá trên ngọn
  return {geo:geoOf(v),crown:Math.max(1.3,ext*.8),tr,th:H,h:top+.05,off,tp:.6,Ht:H};   // off/tp/Ht: để solidTrunk() dựng va chạm bám theo thân cong
}
function pineTree(T,rand,vi=0){   // thông: mỗi tầng là 1 vòng cành rủ xuống, đầu cành có cụm kim; thân thẳng hoặc hơi nghiêng
  const v=new VB(),tr=rand.range(.16,.21),H=rand.range(2.2,2.6),s=TV(.18),ts=TV(.1),tiers=rand.int(6,7),step=rand.range(.58,.68),R0=rand.range(1.2,1.5),cols=T.pine,
    Ht=H-.25+tiers*step+.3,amt=[0,0,rand.range(.3,.5),rand.range(.6,.9)][vi%4],off=bendFn(rand,amt);
  bTrunk(v,T,tr,Ht,off,.95);   // thân chạy suốt chiều cao cây, mảnh dần về ngọn
  for(let q=0;q<tiers;q++){
    const u=q/(tiers-1),rr=R0*(1-u*.86)+.12,y=H-.25+q*step,base=q%2?0:2,[ox,oz]=off(y/Ht),nb=Math.max(4,Math.round(3+rr*3.2)),a0=rand()*6.283;
    for(let k=0;k<nb;k++){
      const a=a0+k/nb*6.283+rand.range(-.25,.25),hl=rr*rand.range(.85,1.05),dr=hl*rand.range(.12,.3),ca=Math.cos(a),sa=Math.sin(a);
      if(hl>.45)limb(v,T,[ox,y,oz],[ox+ca*hl,y-dr,oz+sa*hl],tr*.3,tr*.15,ts);
      const cw=Math.max(.32,hl*.45),cx=ox+ca*hl*.72,cz=oz+sa*hl*.72,cy=y-dr*.7;
      v.ell(cx,cy,cz,cw,TV(.15),cw,(i,j,kk)=>cols[((i*5+j*3+q*2+k)%7===0)?1:base],s,true);
      if(T.cap)v.ell(cx,cy+TV(.12),cz,cw*.85,TV(.07),cw*.85,(i,j,kk)=>T.cap[(i+kk)&1],TV(.09),false);
    }
    v.cyl(ox,y,oz,rr*.38,s,(a,b)=>cols[((a*5+b*3+q*2)%7===0)?1:base],s,'y');
    if(T.cap)v.cyl(ox,y+s*.85,oz,rr*.3,s*.8,(a,b)=>T.cap[(a+b)&1],s,'y');
  }
  const top=H-.25+tiers*step,[tx,tz]=off(top/Ht);v.cyl(tx,top-.1,tz,.1,.5,cols[1],TV(.08),'y');
  return {geo:geoOf(v),crown:R0,tr,th:H,h:top+.2,off,tp:.95,Ht};
}
function boulder(T,rand){
  const v=new VB(),s=V(.16),rx=rand.range(.65,1),ry=rx*rand.range(.65,.9),rz=rx*rand.range(.85,1.1);
  const blob=(x,y,z,a,b,c)=>v.ell(x,y,z,a,b,c,rockFn(T,Math.round(2*b/s)),s,true);
  blob(0,ry*.8,0,rx,ry,rz);
  for(let i=0,n=rand.int(1,2);i<n;i++){const a=rand()*6.283;blob(Math.cos(a)*rx*.65,ry*.5,Math.sin(a)*rz*.65,rx*.55,ry*.6,rz*.55)}
  return {geo:geoOf(v),half:Math.max(rx,rz)*1.15,ch:ry*1.8};   // hộp phủ hết đá kể cả blob phụ; chiều cao = đỉnh đá thật (1.8*ry)
}
function pillar(T,rand){   // trụ đá đứng, làm chỗ nấp
  const v=new VB(),s=V(.14),w=rand.range(.55,.75);let y=0;
  for(const [k,h] of [[1,1.05],[.85,.95],[.65,.85]]){const ww=w*k;
    v.box(rand.range(-.05,.05),y+h/2,rand.range(-.05,.05),ww,h,ww,(i,j,kk,nx,ny)=>(T.moss&&j>=ny-2)?T.moss:T.rock[(i+j*2+kk)%3],s,true);y+=h}
  return {geo:geoOf(v),half:w*.5+.06,ch:2.85};   // nửa cạnh đáy = w/2 (+ độ lệch ngẫu nhiên .05); cao 1.05+.95+.85
}
function pebbles(T,rand){
  const v=new VB(),s=V(.07);
  for(let i=0,n=rand.int(3,5);i<n;i++){const r=rand.range(.09,.2);v.ell(rand.range(-.4,.4),r*.5,rand.range(-.4,.4),r,r*.65,r,rockFn(T,4),s,false)}
  return {geo:geoOf(v)};
}
function bush(T,rand,cols){
  const v=new VB(),s=V(.14);let r0=.4,y0=.3;
  for(let i=0,n=rand.int(2,3);i<n;i++){
    const rr=rand.range(.36,.52),ry=rr*.8,x=i?rand.range(-.4,.4):0,z=i?rand.range(-.4,.4):0;
    v.ell(x,ry*.9,z,rr,ry,rr,bandFn(cols,Math.round(2*ry/s)),s,true);if(!i){r0=rr;y0=ry}}
  for(let i=0;i<8;i++){const th=rand()*6.283,ph=rand.range(0,1.2);   // hoa / quả trên mặt bụi
    v.cube(Math.cos(th)*Math.sin(ph)*r0*1.02,y0*.9+Math.cos(ph)*y0*1.02,Math.sin(th)*Math.sin(ph)*r0*1.02,.09,.09,.09,rand.pick(T.flower),i,3,7)}
  return {geo:geoOf(v)};
}
function logMesh(T,rand){   // BÃI GỖ: nhiều khúc gỗ xếp chồng thành đống (dưới rộng, trên hẹp), đầu khúc lộ vòng năm
  const v=new VB(),s=V(.09),r=rand.range(.24,.3),Lb=rand.range(1.7,2.3),rows=rand.int(2,3),n0=rand.int(3,4);
  let W=0,Hh=0,idx=0;
  for(let row=0;row<rows;row++){
    const cnt=n0-row,y=r+row*r*1.72;
    for(let i=0;i<cnt;i++){
      const z=(i-(cnt-1)/2)*r*2.02,Li=Lb*rand.range(.82,1),x=rand.range(-.12,.12),rr=r*rand.range(.92,1.04),id=idx++,
        nl=Math.max(1,Math.round(2*rr/s)),c2=(nl-1)/2,ring=(a,b)=>((Math.hypot(a-c2,b-c2)|0)&1)?0xd9b38c:0xb8895f;
      v.cyl(x,y,z,rr,Li,(a,b,l)=>T.trunk[(a+b*2+l*3+id)%T.trunk.length],s,'x',rr-s*1.6);
      for(const sx of[-1,1])v.cyl(x+sx*(Li/2-s*.4),y,z,rr,s*.8,ring,s,'x');
      W=Math.max(W,Math.abs(z)*2+2*rr);Hh=Math.max(Hh,y+rr);
    }
  }
  if(T.moss)v.box(rand.range(-.3,.3),Hh+.02,0,.5,.07,.24,T.moss,s);
  return {geo:geoOf(v),L:Lb,W,H:Hh};
}
function stumpMesh(T){
  const v=new VB(),s=V(.07),r=.38;
  v.cyl(0,.24,0,r,.48,(a,b,l)=>T.trunk[(a+b*2+l*3)%T.trunk.length],s,'y',r-s*1.6);
  v.cyl(0,.48,0,r,s*.8,(a,b)=>((Math.hypot(a-4,b-4)|0)&1)?0xd9b38c:0xb8895f,s,'y');
  return {geo:geoOf(v)};
}

// ---- Vùng cấm đặt vật thể: chỗ người chơi xuất hiện, chân/đầu thang, cổng ----
const circleRect=(x,z,r,k)=>{const dx=Math.max(k.x0-x,0,x-k.x1),dz=Math.max(k.z0-z,0,z-k.z1);return dx*dx+dz*dz<r*r};
function keepOuts(f){
  const k=[];
  if(f===0)k.push({x0:-3.5*MAPK,x1:3.5*MAPK,z0:12.5*MAPK,z1:19.5*MAPK});
  if(f===0)k.push({x0:-9.2,x1:9.2,z0:10.5,z1:22});   // nhà rubik (world/house.js) + cây cảnh quanh nhà: không mọc cây / đá / sông đè lên
  if(f===0&&window.PavilionKeep)k.push(window.PavilionKeep);   // chòi Nhật (world/pavilion.js): không mọc cây / đá, không đào sông, không đặt đầu cầu đè lên chòi
  if(f===0&&window.TeaKeeps)k.push(...window.TeaKeeps);   // 2 bộ bàn trà (world/teaset.js): cây / đá / sông / đầu cầu né ra
  if(f===0&&window.BathKeeps)k.push(...window.BathKeeps);   // 2 hồ tắm đá (world/bath.js): cây / đá / sông / đầu cầu né ra
  if(f<NF-1){const A=AS(f),cx=(f%2?1:-1)*(A-2);k.push({x0:cx-3.2,x1:cx+3.2,z0:A-STLf(f)-5,z1:A-.5})}
  if(f>0){const Af=AS(f-1),s=(f-1)%2,a=s?Af-4:-Af,b=s?Af:-Af+4;k.push({x0:a-2,x1:b+2,z0:Af-STLf(f-1)-6,z1:Af-2})}
  return k;
}

// ---- Độ sâu hồ: mực nước (m so với sàn) tại điểm (x,z). Dốc dần từ mép (0.1m) tới CFG.depth ở giữa ----
function lakeH(l,x,z){   // ĐỘ SÂU đáy hồ (m dưới mặt sàn) tại (x,z)
  if(l.ice)return .1;
  const m=Math.min(l.rx,l.rz),sh=Math.max(.5,Math.min(CFG.shelf,m*.7));
  const dist=(1-l.rho(x,z))*m;
  return .1+(l.dmax-.1)*smooth(clamp01(dist/sh));
}
const wdep=(l,x,z)=>Math.max(0,lakeH(l,x,z)-CFG.level);   // độ sâu NƯỚC (từ đáy lên mặt nước)

// ---- Dựng cả 1 tầng ----
const _m=new THREE.Matrix4(),_p=new THREE.Vector3(),_q=new THREE.Quaternion(),_s=new THREE.Vector3(),cache={};
const variants=(key,mk,cnt=3)=>cache[key]||(cache[key]=Array.from({length:cnt},mk));
function waveLake(l,t,px,pz){   // px,pz (tùy chọn): chỉ cập nhật ô trong bán kính 60m quanh người chơi (sông dài nhiều ô)
  const s=l.g*.995,cull=px!==undefined;
  for(let i=0;i<l.tiles.length;i++){const q=l.tiles[i];
    if(l.ice){_p.set(q.x,l.y+q.h0/2,q.z);_s.set(s,q.h0,s)}
    else{if(cull){const dx=q.x-px,dz=q.z-pz;if(dx*dx+dz*dz>3600)continue}
      const w=.018*(Math.sin(q.u*1.1-t*2.1)+Math.sin(q.v*1.5+t*1.2)+Math.sin((q.u+q.v)*.7-t*1.3)*.6)*Math.min(1,q.h0*2.5);   // sóng chạy xuôi dòng
      _p.set(q.x,l.y-CFG.level+w-.03,q.z);_s.set(s,.06,s)}   // mặt nước mỏng, nằm THẤP hơn sàn
    _m.compose(_p,_q,_s);l.mesh.setMatrixAt(i,_m)}
  l.mesh.instanceMatrix.needsUpdate=true;
}
// ---- Đào hồ: dựng hình học tùy biến (lát sàn có lỗ, đáy hồ bậc thang, thành hồ) ----
function GB(){return{p:[],n:[],c:[],u:[],a:[],b:[],k:0}}
function gq(g,pts,n,col,uv,top){   // 1 mặt phẳng 4 điểm, tự chỉnh chiều quay theo pháp tuyến n
  let [a,b,c,d]=pts;
  const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
  if((uy*vz-uz*vy)*n[0]+(uz*vx-ux*vz)*n[1]+(ux*vy-uy*vx)*n[2]<0)[b,d]=[d,b];
  const k=g.k,r=col?col.r:1,gr=col?col.g:1,bl=col?col.b:1;
  for(const q of[a,b,c,d]){g.p.push(q[0],q[1],q[2]);g.n.push(n[0],n[1],n[2]);g.c.push(r,gr,bl);g.u.push(uv?q[0]:0,uv?q[2]:0)}
  (top?g.b:g.a).push(k,k+1,k+2,k,k+2,k+3);g.k+=4;
}
function gfin(g,grouped){
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(g.p,3));
  geo.setAttribute('normal',new THREE.Float32BufferAttribute(g.n,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(g.c,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(g.u,2));
  geo.setIndex(g.a.concat(g.b));
  if(grouped){if(g.a.length)geo.addGroup(0,g.a.length,0);if(g.b.length)geo.addGroup(g.a.length,g.b.length,2)}
  return geo;
}
function topRuns(g,i0,i1,j0,j1,y,cells){   // mặt trên: mỗi hàng ô gộp thành các đoạn liền, bỏ những ô thuộc hồ
  for(let cj=j0;cj<j1;cj++){let run=null;
    for(let ci=i0;ci<=i1;ci++){
      const open=ci<i1&&!cells.has(ck(ci,cj));
      if(open&&run===null)run=ci;
      else if(!open&&run!==null){const xa=run*CELL,xb=ci*CELL,za=cj*CELL,zb=za+CELL;
        gq(g,[[xa,y,za],[xa,y,zb],[xb,y,zb],[xb,y,za]],[0,1,0],null,true,true);run=null}
    }}
}
const _bc1=new THREE.Color(),_bc2=new THREE.Color();
function bedColor(l,ci,cj,d,out){   // cát ở mép -> xanh đậm ở chỗ sâu
  const dd=clamp01((d-.1)/(l.dmax-.1));
  _bc1.setHex(l.T.sand[(ci+cj)&1]);_bc2.setHex(l.T.water[2]).multiplyScalar(.5);
  return out.copy(_bc1).lerp(_bc2,Math.pow(dd,.6));
}
function bedGeometry(l,Fl){   // đáy hồ dạng bậc thang (mỗi ô 1 độ sâu) + thành hồ dựng đứng
  const g=GB(),col=new THREE.Color(),wc=new THREE.Color(),y0=l.y;
  const dOf=(ci,cj)=>Fl.cells.get(ck(ci,cj))===l?lakeH(l,(ci+.5)*CELL,(cj+.5)*CELL):0;
  for(const [ci,cj] of l.cl){
    const d=dOf(ci,cj),xa=ci*CELL,xb=xa+CELL,za=cj*CELL,zb=za+CELL,yb=y0-d;
    bedColor(l,ci,cj,d,col);
    gq(g,[[xa,yb,za],[xa,yb,zb],[xb,yb,zb],[xb,yb,za]],[0,1,0],col,false,false);
    for(const [di,dj] of[[1,0],[-1,0],[0,1],[0,-1]]){
      const nd=dOf(ci+di,cj+dj);if(nd>=d-1e-4)continue;
      const yh=y0-nd;wc.copy(col).multiplyScalar(.8);let pts,n;
      if(di===1){pts=[[xb,yb,za],[xb,yb,zb],[xb,yh,zb],[xb,yh,za]];n=[-1,0,0]}
      else if(di===-1){pts=[[xa,yb,za],[xa,yb,zb],[xa,yh,zb],[xa,yh,za]];n=[1,0,0]}
      else if(dj===1){pts=[[xa,yb,zb],[xb,yb,zb],[xb,yh,zb],[xa,yh,zb]];n=[0,0,-1]}
      else{pts=[[xa,yb,za],[xb,yb,za],[xb,yh,za],[xa,yh,za]];n=[0,0,1]}
      gq(g,pts,n,wc,false,false);
    }
  }
  return gfin(g,false);
}
function carve(Fl,f,y0){   // cắt lỗ trên sàn ở chỗ có hồ
  if(!Fl.cells.size)return;
  const cells=Fl.cells,lk=(x,z)=>cells.has(ck(Math.floor(x/CELL),Math.floor(z/CELL)));
  if(f===0){
    const n=Math.round((HALF0+1)/CELL),g=GB();
    topRuns(g,-n,n,-n,n,0,cells);
    floor.geometry.dispose();floor.geometry=gfin(g,false);floor.rotation.set(0,0,0);floor.position.set(0,0,0);
    // lưới ô 2m: bỏ các đoạn nằm hoàn toàn trong lòng hồ
    const gp=grid.geometry.attributes.position,gc=grid.geometry.attributes.color,np=[],nc=[],gy=gp.getY(0),has=(a,b)=>cells.has(ck(a,b));
    for(let s=0;s+1<gp.count;s+=2){
      const ax=gp.getX(s),az=gp.getZ(s),bx=gp.getX(s+1),bz=gp.getZ(s+1),alongZ=Math.abs(bz-az)>Math.abs(bx-ax),
        cnt=Math.round((alongZ?Math.abs(bz-az):Math.abs(bx-ax))/CELL);
      for(let i=0;i<cnt;i++){
        const t0=i/cnt,t1=(i+1)/cnt,x0=ax+(bx-ax)*t0,z0=az+(bz-az)*t0,x1=ax+(bx-ax)*t1,z1=az+(bz-az)*t1,
          ci=Math.floor((x0+x1)/2/CELL),cj=Math.floor((z0+z1)/2/CELL),
          inside=alongZ?(has(Math.round(ax/CELL)-1,cj)&&has(Math.round(ax/CELL),cj)):(has(ci,Math.round(az/CELL)-1)&&has(ci,Math.round(az/CELL)));
        if(inside)continue;
        np.push(x0,gy,z0,x1,gy,z1);
        const r=gc?gc.getX(s):.42,gg=gc?gc.getY(s):.43,bl=gc?gc.getZ(s):.47;nc.push(r,gg,bl,r,gg,bl);
      }
    }
    const ng=new THREE.BufferGeometry();
    ng.setAttribute('position',new THREE.Float32BufferAttribute(np,3));ng.setAttribute('color',new THREE.Float32BufferAttribute(nc,3));
    grid.geometry.dispose();grid.geometry=ng;
    return;
  }
  // tầng 2-4: sàn là các tấm dày 1m (level.js). Tấm nào có hồ -> dựng lại mặt trên có lỗ + cho va chạm bỏ qua ô hồ
  const cl=[];for(const l of Fl.lakes)if(l.cl)for(const c of l.cl)cl.push(c);
  const tx=gridTex().clone();tx.needsUpdate=true;tx.repeat.set(.5,.5);tx._own=true;   // _own: floors.js giải phóng texture này khi dỡ tầng
  const topMat=new THREE.MeshLambertMaterial({map:tx});
  for(const b of boxes){
    if(Math.abs(b.y1-y0)>1e-6||Math.abs(b.y0-(y0-SLT))>1e-6)continue;
    const i0=Math.round(b.x0/CELL),i1=Math.round(b.x1/CELL),j0=Math.round(b.z0/CELL),j1=Math.round(b.z1/CELL);
    if(!cl.some(([ci,cj])=>ci>=i0&&ci<i1&&cj>=j0&&cj<j1))continue;
    const cx=(b.x0+b.x1)/2,cy=(b.y0+b.y1)/2,cz=(b.z0+b.z1)/2,
      m=meshes.find(q=>q.geometry&&q.geometry.type==='BoxGeometry'&&Array.isArray(q.material)&&Math.abs(q.position.x-cx)<1e-6&&Math.abs(q.position.y-cy)<1e-6&&Math.abs(q.position.z-cz)<1e-6);
    if(!m)continue;
    const g=GB(),yb=b.y0,yt=b.y1;
    topRuns(g,i0,i1,j0,j1,yt,cells);
    gq(g,[[b.x0,yb,b.z0],[b.x1,yb,b.z0],[b.x1,yb,b.z1],[b.x0,yb,b.z1]],[0,-1,0],null,false,false);
    gq(g,[[b.x0,yb,b.z0],[b.x0,yb,b.z1],[b.x0,yt,b.z1],[b.x0,yt,b.z0]],[-1,0,0],null,false,false);
    gq(g,[[b.x1,yb,b.z0],[b.x1,yb,b.z1],[b.x1,yt,b.z1],[b.x1,yt,b.z0]],[1,0,0],null,false,false);
    gq(g,[[b.x0,yb,b.z0],[b.x1,yb,b.z0],[b.x1,yt,b.z0],[b.x0,yt,b.z0]],[0,0,-1],null,false,false);
    gq(g,[[b.x0,yb,b.z1],[b.x1,yb,b.z1],[b.x1,yt,b.z1],[b.x0,yt,b.z1]],[0,0,1],null,false,false);
    const old=m.material;m.geometry.dispose();m.geometry=gfin(g,true);m.position.set(0,0,0);
    m.material=[old[0],old[0],topMat];
    b.hole=lk;   // physics.js: va chạm với tấm sàn này bỏ qua nếu tâm vật thể nằm trong ô hồ
  }
}
function butterfly(col){
  const g=new THREE.Group(),b=new THREE.Mesh(UG,M(0x2b2a3a));b.scale.set(.03,.03,.12);g.add(b);
  const mk=sd=>{const p=new THREE.Group();p.position.x=sd*.02;const w=new THREE.Mesh(UG,M(col));w.scale.set(.12,.012,.1);w.position.x=sd*.06;p.add(w);g.add(p);return p};
  S.add(g);return {g,wl:mk(-1),wr:mk(1)};
}
// ==== CÁ BƠI (bắt đầu) ====
// Con cá voxel bạc: thân hình "vòng số 8" (hai thùy nối bằng eo hẹp) như logo, đầu nhọn có mắt + khe mang, đuôi xòe chẻ đôi có vạch vây.
// Mô hình dựng 1 lần (đầu quay về +x, dài 1 đơn vị, đuôi là mesh riêng gắn khớp để vẫy), rồi mọi con dùng chung geometry.
let _fg=null;
function fishGeos(){
  if(_fg)return _fg;
  const sm=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k/4};
  const R=.175,C1=.334,C2=.639,TJ=.79;   // bán kính thùy, tâm 2 thùy, vị trí khớp đuôi (theo chiều dài 0..1, 0 = mũi cá)
  const hh=u=>R*Math.pow(Math.sin(Math.min(1,u/C1)*Math.PI/2),.85);
  const dOut=(u,v)=>{if(u<0||u>C2+R)return 1;const av=Math.abs(v);if(u<C1)return(av-hh(u))*.8;return sm(Math.hypot(u-C1,v)-R,Math.hypot(u-C2,v)-R,.114)};
  const dHole=(u,v)=>sm(Math.hypot((u-C1)*.88,v)-.105,Math.hypot((u-C2)*.88,v)-.105,.185);   // lỗ tròn giữa thân
  const dTail=(u,v)=>{if(u<TJ-.02||u>1)return 1;const t=Math.max(0,(u-TJ)/(1-TJ)),av=Math.abs(v),h=.03+.145*Math.pow(t,.9),n=t>.38?(t-.38)*.2:-1;return Math.max(av-h,n-av)};
  const sd=(u,v)=>Math.max(Math.min(dOut(u,v),dTail(u,v)),-dHole(u,v));
  const fmx=(a,b,t)=>{const r=((a>>16)&255)*(1-t)+((b>>16)&255)*t,g=((a>>8)&255)*(1-t)+((b>>8)&255)*t,l=(a&255)*(1-t)+(b&255)*t;return((r|0)<<16)|((g|0)<<8)|(l|0)};
  const s=.022,TH=.03,B=new VB(),Tl=new VB();
  for(let i=0;i*s<=1;i++)for(let j=-11;j<=11;j++){
    const u=(i+.5)*s,v=j*s,q=sd(u,v);
    if(q>=0){if(u<TJ&&dHole(u,v)<=0&&dOut(u,v)<0)B.cube(.5-u,v,0,s*.95,s*.95,TH*.95,0x050508,i,j,1);continue}   // phần rỗng giữa thân: lấp bằng mảng đen đặc (nhìn được từ cả 2 mặt)
    const t=clamp01((v+.18)/.36),tail=u>=TJ,ring=dOut(u,v)<0;
    const lay=(!tail||ring)?[-1,0,1]:[0];
    for(const k of lay){
      const face=k!==0;if(face&&q>-.012)continue;   // 2 lớp mặt chỉ nằm lùi vào trong 1 chút -> viền cạnh bo tròn, tối hơn
      let hex=face?fmx(0xaab2bd,0xf3f5f9,t):fmx(0x7e8794,0xc4cad3,t);
      if(face&&!tail){
        const e=Math.hypot(u-.106,v-.035);if(e<.012)hex=0xf4f6fa;else if(e<.03)hex=0x3b414d;   // mắt
        const ug=.16+.03*(1-(v/.115)*(v/.115));if(Math.abs(v)<.115&&Math.abs(u-ug)<.011)hex=0x3a3f4b;   // khe mang
      }
      if(tail&&!ring){const a=Math.atan2(v,u-(TJ-.03)),ri=Math.round(a/.17);
        hex=(Math.abs(a-ri*.17)<.03&&u>TJ+.03)?0x858d9b:fmx(0xb7bec9,0xf1f4f8,t)}   // vạch vây đuôi
      if(tail)Tl.cube(TJ-u,v,k*TH,s*.95,s*.95,TH*.95,hex,i,j,k+1);   // tọa độ tương đối so với khớp đuôi
      else B.cube(.5-u,v,k*TH,s*.95,s*.95,TH*.95,hex,i,j,k+1);
    }
  }
  const tint=c=>{const m=VMAT.clone();m.color.setHex(c);return m};
  return _fg={body:B.mesh().geometry,tail:Tl.mesh().geometry,px:.5-TJ,mats:[tint(0xffffff),tint(0xffffff),tint(0xd6e8ff),tint(0xfff0d6)]};
}
const fishOK=(Fl,l,x,z)=>Fl.cells.get(ck(Math.floor(x/CELL),Math.floor(z/CELL)))===l&&lakeH(l,x,z)-CFG.level>=.6;   // chỉ bơi ở chỗ nước sâu >= .6m
function makeFish(G,rand){
  const g=new THREE.Group(),m=rand.pick(G.mats),body=new THREE.Mesh(G.body,m),tail=new THREE.Mesh(G.tail,m),tp=new THREE.Group(),sz=rand.range(.65,1.25)*.9;   // dài ~.6-1.1m
  body.frustumCulled=tail.frustumCulled=false;tp.position.x=G.px;tp.add(tail);g.add(body,tp);
  g.scale.setScalar(sz);g.rotation.order='YZX';g.visible=false;S.add(g);
  return {g,tp,sz};
}
// Mỗi khung: lượn ngẫu nhiên, thấy bờ (nước nông) thì quay đầu, giật mình bơi nhanh ra xa khi người chơi lại gần, lên xuống theo độ sâu, đuôi vẫy
function tickFish(Fl,dt){
  const wr=a=>Math.atan2(Math.sin(a),Math.cos(a));
  fishJumpTick(Fl,dt);
  for(const q of Fl.fish){
    if(q.jp){jumpStep(Fl,q,dt);continue}   // đang nhảy: bay theo đường vòng cung, bỏ qua bơi thường
    const l=q.l,dx=q.x-P.x,dz=q.z-P.z;let spd=q.sp,rate=2.4;
    if(dx*dx+dz*dz<9&&Math.abs(P.y+.9-q.y)<3&&q.hold<=0){q.tt=Math.atan2(dz,dx);q.tw=.9;spd*=2.4;rate=5}
    else if((q.tw-=dt)<=0){q.tw=1.5+Math.random()*3;q.tt=q.th+(Math.random()-.5)*1.5}
    const ah=.6+q.sz*.6;
    if(!fishOK(Fl,l,q.x+Math.cos(q.th)*ah,q.z+Math.sin(q.th)*ah)){
      if((q.hold-=dt)<=0){q.tt=q.th+(Math.random()<.5?-1:1)*(1.7+Math.random());q.hold=.6;q.tw=1.2}
      spd*=.35}
    else q.hold=0;
    q.th+=Math.max(-rate*dt,Math.min(rate*dt,wr(q.tt-q.th)));
    const nx=q.x+Math.cos(q.th)*spd*dt,nz=q.z+Math.sin(q.th)*spd*dt;
    if(fishOK(Fl,l,nx,nz)){q.x=nx;q.z=nz}else{q.tt=q.th+Math.PI*(.6+Math.random()*.4);q.hold=.6}
    const bed=l.y-lakeH(l,q.x,q.z),surf=l.y-CFG.level-.05,ty=Math.max(bed+.25,Math.min(surf-.3,bed+(surf-bed)*q.dp));
    q.y+=(ty-q.y)*Math.min(1,dt*1.5);
    q.g.position.set(q.x,q.y+Math.sin(tm*1.5+q.ph)*.03,q.z);
    q.g.rotation.y=-q.th;q.g.rotation.z=Math.max(-.35,Math.min(.35,(ty-q.y)*.9));
    q.tp.rotation.y=Math.sin(tm*(4+spd*3)+q.ph)*(.28+.1*spd);
  }
}
// ---- CÁ NHẢY: mỗi vài giây (ngẫu nhiên) có 1-3 con cá gần người chơi quẫy mình, phóng lên khỏi mặt nước theo đường vòng cung rồi lặn xuống lại ----
// Mỗi con: pha 0 = trồi lên sát mặt nước + ngóc đầu · pha 1 = bay (parabol, đầu ngẩng lên rồi chúc xuống theo vận tốc) · chạm nước lại = tóe nước + gợn sóng + tiếng "tũm"
function fishJumpTick(Fl,dt){
  if(!CFG.fishJump||!Fl.fish.length)return;
  if(Fl.jq&&Fl.jq.length){   // đang xếp hàng cho cả đàn: các con nhảy lệch nhau một nhịp ngắn
    if((Fl.jqT-=dt)<=0){const q=Fl.jq.shift();startJump(q);Fl.jqT=.12+Math.random()*.35}
    return;
  }
  if(Fl.jt===undefined)Fl.jt=2+Math.random()*5;
  if((Fl.jt-=dt)>0)return;
  const c=[];for(const q of Fl.fish){if(q.jp)continue;const d=Math.hypot(q.x-P.x,q.z-P.z);if(d>4&&d<40)c.push(q)}
  if(!c.length){Fl.jt=2;return}   // không có cá nào gần người chơi: thử lại sau
  const r=Math.random(),n=r<.5?1:r<.8?2:3,a=c[Math.floor(Math.random()*c.length)];
  c.sort((p,q)=>Math.hypot(p.x-a.x,p.z-a.z)-Math.hypot(q.x-a.x,q.z-a.z));   // cả đàn: lấy các con ở gần nhau
  Fl.jq=c.slice(0,n);Fl.jqT=0;
  const e=CFG.jumpEvery;Fl.jt=e[0]+Math.random()*(e[1]-e[0]);
}
function startJump(q){
  const Fl=q.Fl,l=q.l,surf=l.y-CFG.level-.05,T=.65+Math.random()*.35,v=1.3+Math.random()*1.2,hr=CFG.jumpH,H=hr[0]+Math.random()*(hr[1]-hr[0]);
  const reach=v*(T+.3)+.4;   // quãng đường bay + trồi lên: chỗ rơi xuống phải còn là nước sâu
  for(const o of[0,.5,-.5,1,-1,2.2,-2.2]){
    const th=q.th+o;let ok=true;
    for(const u of[.35,.7,1])if(!fishOK(Fl,l,q.x+Math.cos(th)*reach*u,q.z+Math.sin(th)*reach*u)){ok=false;break}
    if(ok){const g=8*H/(T*T);q.jp={ph:0,t:0,T,g,vy0:g*T/2,v,th,sy:surf,y0:q.y};q.th=q.tt=th;return}
  }
}
function jumpStep(Fl,q,dt){
  const J=q.jp,l=q.l,sy=J.sy,cs=Math.cos(J.th),sn=Math.sin(J.th);let vy=0,hv=J.v;
  J.t+=dt;
  if(J.ph===0){   // trồi lên sát mặt nước, tăng tốc
    const u=Math.min(1,J.t/.3),e=u*u*(3-2*u);hv=J.v*(.4+.6*e);
    q.y=J.y0+(sy-.08-J.y0)*e;vy=3*e;
    if(u>=1){J.ph=1;J.t=0;q.y=sy;
      const pos={x:q.x,y:sy,z:q.z};splash(q.x,q.z,l,7);ripple(q.x,q.z,l,1.1);snd(420,.09,'sine',.07,pos);snd(220,.13,'triangle',.05,pos)}
  }else{          // bay: y = mặt nước + vy0*t - g*t²/2
    const t=Math.min(J.t,J.T);q.y=sy+J.vy0*t-.5*J.g*t*t;vy=J.vy0-J.g*t;
    if(J.t>=J.T){   // chạm nước
      q.y=sy-.05;q.jp=null;q.hold=0;q.tw=1.5+Math.random()*2;
      const pos={x:q.x,y:sy,z:q.z};splash(q.x,q.z,l,12);ripple(q.x,q.z,l,1.6);snd(260,.16,'sine',.09,pos);snd(130,.2,'triangle',.07,pos);
      q.g.position.set(q.x,q.y,q.z);q.g.rotation.z=-.5;return}
  }
  q.x+=cs*hv*dt;q.z+=sn*hv*dt;
  q.g.position.set(q.x,q.y,q.z);
  q.g.rotation.y=-J.th;q.g.rotation.z=Math.max(-1.25,Math.min(1.25,Math.atan2(vy,hv)));   // đầu ngẩng lên khi bay lên, chúc xuống khi rơi
  q.tp.rotation.y=Math.sin(tm*26+q.ph)*.5;                                                   // quẫy đuôi mạnh
}
// ==== CÁ BƠI (kết thúc) ====
let _ct=null;
function carpetTex(){   // viền nhạt quanh mỗi mảnh 0.5m -> nhìn như miếng dán rubik
  if(_ct)return _ct;const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d');
  x.fillStyle='#fff';x.fillRect(0,0,32,32);x.fillStyle='rgba(0,0,0,.16)';x.fillRect(0,0,32,2);x.fillRect(0,0,2,32);x.fillRect(0,30,32,2);x.fillRect(30,0,2,32);
  _ct=new THREE.CanvasTexture(c);_ct.anisotropy=4;return _ct}
function buildFloor(f){
  const T=THM[f],A=AF(f),y0=FY(f),rand=RNG(CFG.seed*131+f*7919+1),k=Math.pow(A/20,CFG.scaleExp)*CFG.density;
  const Fl={f,y:y0,objs:[],lakes:[],crit:[],deco:null,cells:new Map(),terr:[],detail:[],hg:false,hAt:null,bridges:[],stones:[]},keep=keepOuts(f),placed=[],d=new VB(),lim=A-1.2;
  let cn=0,pn=0;
  const dkC=new THREE.Color(),dkG=(h,m)=>dkC.setHex(h).multiplyScalar(m).getHex();
  let hAt=()=>0;   // độ cao địa hình tại (x,z) - gán ở bước 1d
  const dc=(x,y,z,sx,sy,sz,hex)=>d.cube(x,y+hAt(x,z),z,sx,sy,sz,hex,cn++,(cn*7)&63,(cn*13)&31);   // 1 mảnh rubik gộp vào mesh trang trí
  const sup=(x,z,r)=>f===0||[[0,0],[r,0],[-r,0],[0,r],[0,-r]].every(([a,b])=>hitAny({x:x+a,y:y0-.6,z:z+b,r:.05,h:.3}));   // có sàn đỡ bên dưới (tầng trên có lỗ thang)
  const inLk=(x,z)=>Fl.cells.has(ck(Math.floor(x/CELL),Math.floor(z/CELL)));
  const wet=(x,z,m)=>inLk(x,z)||Fl.lakes.some(l=>l.rho(x,z)<1+m/Math.min(l.rx,l.rz));
  const okAt=(x,z,rad,edge)=>{
    if(Math.abs(x)>lim-edge||Math.abs(z)>lim-edge)return false;
    if(keep.some(q=>circleRect(x,z,rad+.3,q)))return false;
    if(wet(x,z,rad+.8))return false;
    for(const p of placed)if(Math.hypot(x-p.x,z-p.z)<rad+p.r+.25)return false;
    if(hitAny({x,y:y0+.02,z,r:rad,h:1.7}))return false;
    if(f===1&&hAt(x,z)>6.5)return false;   // tầng 2: cây chỉ mọc ở thung lũng / chân núi
    return sup(x,z,rad+.4);
  };
  const spot=(rad,edge)=>{for(let n=0;n<50;n++){const x=rand.range(-lim,lim),z=rand.range(-lim,lim);if(okAt(x,z,rad,edge))return{x,z}}return null};
  const inst=(geo,x,y,z,sc,ry,solid)=>{const m=new THREE.Mesh(geo,VMAT);m.position.set(x,y+hAt(x,z),z);m.rotation.y=ry;m.scale.setScalar(sc);S.add(m);if(solid)meshes.push(m);Fl.objs.push(m);return m};
  const solidBox=(x,z,hx,hz,h)=>boxes.push({x0:x-hx,x1:x+hx,y0:y0,y1:y0+hAt(x,z)+h,z0:z-hz,z1:z+hz});
  // Va chạm thân cây: chia thân thành các hộp xếp chồng, mỗi hộp bao trọn đoạn thân (kể cả thân cong), có tính góc xoay ry và tỉ lệ sc
  const solidTrunk=(x,z,v,sc,ry)=>{
    const c=Math.cos(ry),s=Math.sin(ry),n=Math.max(1,Math.round(v.th/1.1)),gy=hAt(x,z),seg=v.th*sc/n;
    for(let i=0;i<n;i++){
      let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
      for(let q=0;q<=2;q++){   // lấy mẫu đầu / giữa / cuối đoạn
        const u=(i+q/2)/n*v.th/v.Ht,[ox,oz]=v.off(u),rr=v.tr*(1.35-v.tp*Math.min(1,u*1.5))*sc+.05,
          wx=x+(ox*c+oz*s)*sc,wz=z+(-ox*s+oz*c)*sc;   // cùng phép xoay quanh trục Y như mesh (rotation.y=ry)
        x0=Math.min(x0,wx-rr);x1=Math.max(x1,wx+rr);z0=Math.min(z0,wz-rr);z1=Math.max(z1,wz+rr)}
      boxes.push({x0,x1,z0,z1,y0:i?y0+gy+i*seg:y0,y1:y0+gy+(i+1)*seg})}   // đoạn dưới cùng cao >= .9m nên stp() không tự leo lên gốc cây
  };
  const patch=(px,pz,pr)=>{   // mảng cỏ / rêu / tuyết: lát mảnh mỏng
    const g=V(.34),yy=y0+.045+.008*(pn++%4);
    for(let x=px-pr*1.3;x<=px+pr*1.3;x+=g)for(let z=pz-pr*1.3;z<=pz+pr*1.3;z+=g){
      const dx=x-px,dz=z-pz,a=Math.atan2(dz,dx),rr=pr*(1+.18*Math.sin(a*3+px)+.1*Math.sin(a*5+pz));
      if(Math.hypot(dx,dz)>=rr||wet(x,z,1.6)||(f&&!hitAny({x,y:y0-.6,z,r:.05,h:.3})))continue;
      dc(x,yy,z,g*.94,.05,g*.94,T.ice?T.ground[Math.floor(rand()*3)]:dkG(T.ground[Math.floor(rand()*3)],.55));
    }
  };
  const shroom=(x,z)=>{
    const cap=rand.pick(T.shroom);
    for(let i=0,n=rand.int(2,4);i<n;i++){const mx=x+rand.range(-.25,.25),mz=z+rand.range(-.25,.25),h=rand.range(.15,.32),cr=rand.range(.1,.18);
      d.cyl(mx,y0+hAt(mx,mz)+h/2,mz,.035,h,0xf4ecd8,.035,'y');
      d.ell(mx,y0+hAt(mx,mz)+h+cr*.3,mz,cr,cr*.6,cr,(a,b,c)=>((a+b*2+c)%4===0)?0xffffff:cap,.05,true)}
  };

  // 1) Sông (đặt trước để mọi thứ khác tránh ra): 1 dải nước dài, uốn lượn, chạy xuyên hết map từ tường này sang tường kia.
  //    Chỗ có vật cản (cột, bục...) của map thì chừa lại thành "đảo"; chỗ có lỗ thang / vùng cấm thì tự tránh.
  const inm=(x,z)=>Math.abs(x)<A-.5&&Math.abs(z)<A-.5;
  const blocked=(x,z)=>hitAny({x,y:y0+.02,z,r:.05,h:.5})||keep.some(q=>circleRect(x,z,.5,q))||(f>0&&!sup(x,z,1));
  const mkRiver=()=>{
    const W=CFG.riverW*(1+.04*f),dmax=f>0?Math.min(Math.max(.2,CFG.depth),SLT-.3):Math.max(.2,CFG.depth),bend=CFG.riverBend;
    let best=null,bs=1e9;
    for(let n=0;n<160&&bs>=1;n++){   // thử nhiều đường đi ngẫu nhiên, lấy đường ít đụng vật cản / vùng cấm nhất
      const th=(rand()<.5?0:Math.PI/2)+rand.range(-.2,.2),ux=Math.cos(th),uz=Math.sin(th),nx=-uz,nz=ux,c0=rand.range(-.5,.5)*A,
        a1=rand.range(1.6,3.4)*bend,k1=6.283/rand.range(30,46),p1=rand()*6.283,a2=rand.range(.4,1.1)*bend,k2=6.283/rand.range(13,19),p2=rand()*6.283,
        wv=rand.range(.08,.16),kw=6.283/rand.range(16,28),pw=rand()*6.283,cx=nx*c0,cz=nz*c0,
        cv=u=>a1*Math.sin(u*k1+p1)+a2*Math.sin(u*k2+p2),dv=u=>a1*k1*Math.cos(u*k1+p1)+a2*k2*Math.cos(u*k2+p2),wf=u=>W*(1+wv*Math.sin(u*kw+pw));
      let sc=0;
      for(let u=-A*1.3;u<=A*1.3;u+=2){
        const c=cv(u),w=wf(u),sl=dv(u),il=1/Math.sqrt(1+sl*sl);
        for(const q of[-1,-.5,0,.5,1]){
          const x=cx+ux*u+nx*c+(nx-ux*sl)*il*q*w,z=cz+uz*u+nz*c+(nz-uz*sl)*il*q*w;
          if(Math.abs(x)>A-.3||Math.abs(z)>A-.3)continue;
          if(hitAny({x,y:y0+.02,z,r:.45,h:.5}))sc+=1;
          if(keep.some(k=>circleRect(x,z,1.2,k)))sc+=40;
          if(f>0&&!sup(x,z,1.2))sc+=40;
        }
      }
      sc+=rand()*.5;
      if(sc<bs){bs=sc;best={ux,uz,nx,nz,cx,cz,cv,dv,wf}}
    }
    const {ux,uz,nx,nz,cx,cz,cv,dv,wf}=best;
    const loc=(x,z)=>{const X=x-cx,Z=z-cz;return[X*ux+Z*uz,X*nx+Z*nz]};   // toạ độ (dọc dòng, ngang dòng)
    // at(góc,p): điểm dọc theo bờ sông; p=1 đúng mép, p>1 ngoài bờ, p<1 trong lòng sông (góc<π: bờ này, còn lại: bờ kia)
    const at=(a,p)=>{const side=a<Math.PI?1:-1,u=(((a%Math.PI)/Math.PI)*2-1)*A*1.15,c=cv(u),sl=dv(u),il=1/Math.sqrt(1+sl*sl),w=wf(u)*p*side;
      return[cx+ux*u+nx*c+(nx-ux*sl)*il*w,cz+uz*u+nz*c+(nz-uz*sl)*il*w]};
    return {cx,cz,ux,uz,rx:A*1.2,rz:W,y:y0,f,dmax,ice:!!T.ice,T,loc,at,
      rho:(x,z)=>{const [u,v]=loc(x,z),sl=dv(u);return Math.abs(v-cv(u))/Math.sqrt(1+sl*sl)/wf(u)}};   // <1: trong lòng sông
  };
  if(f===1&&window.GreatWall&&GreatWall.makeLakes)Fl.lakes.push(...GreatWall.makeLakes({y:y0,f,dmax:Math.min(Math.max(.2,CFG.depth),SLT-.3),T,A}));   // tầng 2: các dòng suối uốn theo thung lũng núi (world/greatwall.js)
  else Fl.lakes.push(mkRiver());
  if(f===0&&window.BathPools)for(const sp of window.BathPools)Fl.lakes.push(Object.assign({},sp,{y:y0,f,ice:false,T:Object.assign({},T,{water:sp.water,sand:sp.sand})}));   // hồ tắm lõm (world/bath.js): đào sàn, đáy hồ, nước, lội nước dùng chung hệ thống với sông
  // 1b) Khối vật cản (của map) nằm giữa lòng sông -> gỡ bỏ cả va chạm lẫn mô hình. Không đụng tường ngoài, sàn, thang, cổng.
  if(f!==1){const rv=Fl.lakes[0],M=A-.6,
     cand=b=>b.y0>=y0-.05&&b.y0<y0+FHT[f]-3&&b.y1-y0<8&&b.x0>-M&&b.x1<M&&b.z0>-M&&b.z1<M&&b.x1-b.x0<=20&&b.z1-b.z0<=20&&!keep.some(k=>b.x1>k.x0&&b.x0<k.x1&&b.z1>k.z0&&b.z0<k.z1),
     inRv=b=>{const nx=Math.max(1,Math.ceil((b.x1-b.x0)/.5)),nz=Math.max(1,Math.ceil((b.z1-b.z0)/.5));
       for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++)if(rv.rho(b.x0+(b.x1-b.x0)*i/nx,b.z0+(b.z1-b.z0)*j/nz)<1.05)return true;return false},
     rem=boxes.filter(b=>cand(b)&&inRv(b));
   for(let ch=true;ch;){ch=false;   // khối xếp chồng lên khối bị gỡ cũng gỡ theo (khỏi lơ lửng)
     for(const b of boxes)if(!rem.includes(b)&&b.y0>y0+.05&&cand(b)&&rem.some(r=>Math.abs(b.y0-r.y1)<.02&&b.x0>=r.x0-.02&&b.x1<=r.x1+.02&&b.z0>=r.z0-.02&&b.z1<=r.z1+.02)){rem.push(b);ch=true}}
   for(const b of rem){const cx=(b.x0+b.x1)/2,cy=(b.y0+b.y1)/2,cz=(b.z0+b.z1)/2,
       mi=meshes.findIndex(q=>q.isMesh&&!q.isInstancedMesh&&Math.abs(q.position.x-cx)<.01&&Math.abs(q.position.y-cy)<.01&&Math.abs(q.position.z-cz)<.01);
     if(mi>=0){S.remove(meshes[mi]);meshes.splice(mi,1)}
     boxes.splice(boxes.indexOf(b),1)}}
  for(const l of Fl.lakes){
    const g=CELL,pos=[],edge=.9/l.rz,nC=Math.floor(A/g);l.g=g;l.cl=[];
    for(let ci=-nC;ci<nC;ci++)for(let cj=-nC;cj<nC;cj++){
      const x=(ci+.5)*g,z=(cj+.5)*g,p=l.rho(x,z);
      if(p<1){
        if(l.pool?hitAny({x,y:y0+.02,z,r:.05,h:.5}):blocked(x,z))continue;   // vật cản / lỗ thang -> không có nước (thành đảo)
        const [u,v]=l.loc(x,z);
        pos.push({x,z,p,u,v,ix:ci,iz:cj,h0:.1});
        if(!l.ice){Fl.cells.set(ck(ci,cj),l);l.cl.push([ci,cj])}
      }
      else if(!l.pool&&p<1+edge&&(f===0||hitAny({x,y:y0-.6,z,r:.05,h:.3}))&&!hitAny({x,y:y0+.02,z,r:.05,h:.5}))dc(x,y0+.045,z,g*.94,.05,g*.94,T.sand[(ci+cj)&1]);   // bãi cát / tuyết ven sông
    }
    if(!l.ice&&l.cl.length){   // đáy hồ lõm xuống (raycast được để đạn để lại vết)
      const bed=new THREE.Mesh(bedGeometry(l,Fl),new THREE.MeshLambertMaterial({vertexColors:true}));
      bed.frustumCulled=false;S.add(bed);meshes.push(bed);l.bed=bed;
    }
    if(pos.length){
      // mặt nước mỏng, trong; màu đáy hồ (cát -> xanh đậm) hiện xuyên qua nên càng sâu càng tối
      const mesh=new THREE.InstancedMesh(UG,new THREE.MeshLambertMaterial({color:0xffffff,transparent:!T.ice,opacity:T.ice?1:.62,depthWrite:!!T.ice,emissive:0x000000}),pos.length),col=new THREE.Color(),deep=new THREE.Color(),shal=new THREE.Color();
      pos.forEach((q,i)=>{const w=T.water;
        q.h0=lakeH(l,q.x,q.z);const dd=T.ice?Math.min(1,(1-q.p)/.85):clamp01((q.h0-.1)/(l.dmax-.1));
        if(T.ice){shal.setHex(w[3]);deep.setHex(w[2]).multiplyScalar(.85);col.copy(shal).lerp(deep,Math.pow(dd,.7))}
        else{shal.setHex(w[1]);deep.setHex(w[2]).multiplyScalar(.7);col.copy(shal).lerp(deep,dd*.85)}
        if((q.ix+q.iz)&1)col.multiplyScalar(.95);mesh.setColorAt(i,col)});
      mesh.frustumCulled=false;S.add(mesh);l.mesh=mesh;l.tiles=pos;waveLake(l,0);
    }
    // đá cuội, lau sậy, lá súng ven và trên hồ
    const per=l.pool?0:Math.round((l.rx+l.rz)*2.2*CFG.density);
    for(let i=0;i<per;i++){const [x,z]=l.at(rand()*6.283,1+rand.range(.04,.32)),sz=rand.range(.1,.26);
      if(inm(x,z)&&(f===0||hitAny({x,y:y0-.6,z,r:.05,h:.3}))&&!inLk(x,z)&&!hitAny({x,y:y0+.02,z,r:.05,h:.5}))dc(x,y0+sz*.4,z,sz,sz*.8,sz,T.rock[rand.int(0,2)])}
    for(let i=0,n=Math.round(per*.35);i<n;i++){const [cx,cz]=l.at(rand()*6.283,1+rand.range(.06,.22));
      if(!inm(cx,cz)||(f&&!hitAny({x:cx,y:y0-.6,z:cz,r:.05,h:.3})))continue;
      for(let b=0,m=rand.int(3,5);b<m;b++){const x=cx+rand.range(-.25,.25),z=cz+rand.range(-.25,.25),h=rand.range(1,1.7);
        if(inLk(x,z)||!inm(x,z))continue;
        dc(x,y0+h/2,z,.045,h,.045,rand.pick(T.reed));if(rand()<.5)dc(x,y0+h-.12,z,.075,.24,.075,0x6b4a32)}}
    // lá súng nổi trên mặt nước
    if(!T.ice)for(let i=0,n=l.pool?0:Math.round(A*l.rz*.12*CFG.density);i<n;i++){const [x,z]=l.at(rand()*6.283,rand.range(.1,.8)),r=rand.range(.22,.32),wy=y0-CFG.level;
      if(!inLk(x,z))continue;
      d.cyl(x,wy+.03,z,r,.03,rand.pick(T.pad),V(.075),'y');if(rand()<.4)dc(x,wy+.07,z,.09,.07,.09,rand()<.5?0xff9fbf:0xffffff)}
  }

  const flat=[];   // vùng phải phẳng (đầu cầu)
  // 1c) Cầu vòm gỗ bắc ngang sông (lưng cầu cong lên, lan can gỗ 2 bên). Tầng 4 sông đóng băng nên không cần cầu.
  //     Cầu chạy vuông góc (theo trục x hoặc z) với dòng sông, chọn chỗ hẹp nhất mà 2 đầu cầu có đất trống.
  for(const rv of Fl.lakes.filter(l=>!l.pool)){
   if(rv&&!rv.ice){
    const along=Math.abs(rv.ux)>Math.abs(rv.uz),pt=(q,w)=>along?[q,w]:[w,q],wat=(q,w)=>{const [x,z]=pt(q,w);return rv.rho(x,z)<1},
      okLand=(q,w)=>{const [x,z]=pt(q,w);return Math.abs(x)<lim-.3&&Math.abs(z)<lim-.3&&!keep.some(k=>circleRect(x,z,1.9,k))&&!hitAny({x,y:y0+.02,z,r:.5,h:.5})&&(f===0||sup(x,z,.6))},
      HW=1.25,OFF=[-1.4,0,1.4],bq=[];
    const plan=q=>{
      let w1=1e9,w2=-1e9;
      for(const o of OFF)for(let w=-lim;w<=lim;w+=.25)if(wat(q+o,w)){if(w<w1)w1=w;if(w>w2)w2=w}
      if(w2<w1||w2-w1>rv.rz*4.2)return null;
      const wa=w1-2.6,wb=w2+2.6;if(wa<-lim+.6||wb>lim-.6)return null;
      for(const o of OFF)for(let w=wa;w<=wb;w+=.5)if(!wat(q+o,w)&&!okLand(q+o,w))return null;
      return {q,wa,wb,sp:w2-w1};
    };
    const build=c=>{
      const {q,wa,wb}=c,Lt=wb-wa,N=Math.max(8,Math.round(Lt/.6)),sl=Lt/N,Hh=Math.max(1.2,Math.min(1.9,Lt*.12)),   // Hh: độ cao lưng cầu
        top=i=>y0+.14+Hh*Math.sin(Math.PI*(i+.5)/N),                                                          // mặt cầu: cung sin, bước lên mỗi tấm chỉ ~0.2m
        cb=(qq,ww,yy,dq,dw,dy,hex)=>{const [x,z]=pt(qq,ww);if(along)dc(x,yy,z,dq,dy,dw,hex);else dc(x,yy,z,dw,dy,dq,hex)},
        bx=(q0,q1,w0,w1,ya,yb)=>boxes.push(along?{x0:q0,x1:q1,z0:w0,z1:w1,y0:ya,y1:yb}:{x0:w0,x1:w1,z0:q0,z1:q1,y0:ya,y1:yb});
      for(let i=0;i<N;i++){
        const w=wa+(i+.5)*sl,tp=top(i);
        cb(q,w,tp-.09,2*HW,sl*.94,.18,i&1?0xa8794a:0x93653b);                       // ván cầu
        bx(q-HW,q+HW,w-sl/2,w+sl/2,tp-.4,tp);                                        // va chạm mặt cầu
        for(const sd of[-1,1]){
          const qq=q+sd*(HW-.08);
          cb(q+sd*(HW-.14),w,tp-.36,.24,sl*1.02,.36,0x5e4029);                        // dầm gỗ dưới ván
          cb(qq,w,tp+.98,.13,sl*1.04,.13,0xc08a52);                                   // tay vịn trên
          cb(qq,w,tp+.5,.09,sl*1.04,.09,0xa8794a);                                    // thanh giữa
          if(i%2===0||i===N-1){cb(qq,w,tp+.5,.16,.16,1.05,0x6b4a2b);cb(qq,w,tp+1.1,.22,.22,.1,0xd9a066)}   // cột + mũ cột
          if(i%2===0){const w1=Math.min(w+sl*1.5,wb),t2=top(Math.min(N-1,i+1));   // va chạm lan can (mỗi 2 tấm 1 khối)
            bx(qq-.09,qq+.09,w-sl/2,w1,Math.min(tp,t2),Math.max(tp,t2)+1.05)}
        }
      }
      for(let w=wa-2;w<=wb+2;w+=2){const [x,z]=pt(q,w);placed.push({x,z,r:2.2});flat.push({x,z,r:3.4})}Fl.bridges.push({along,q,wa,wb});   // đăng ký cầu cho AI bot (steering.js) · cây / đá tránh đầu cầu, địa hình phẳng quanh cầu
    };
    for(let nb=rv.nb||(A>=30?2:1);nb>0;nb--){
      let best=null;
      for(let q=-lim+5;q<=lim-5;q+=1){
        if(bq.some(p=>Math.abs(p-q)<16))continue;
        const c=plan(q);if(!c)continue;
        c.s=c.sp+Math.abs(q)*.08+rand()*1.5;if(!best||c.s<best.s)best=c;
      }
      if(!best)break;
      bq.push(best.q);build(best);
    }
   }}

  // 1d) ĐỊA HÌNH: bản đồ độ cao lưới .5m (tra bằng nội suy). Phẳng hẳn quanh sông, đầu cầu, thang, vật cản, sát tường.
  const HS=.5,NH=Math.round(2*A/HS)+1,HG=new Float32Array(NH*NH),hz=(x,z)=>HG[Math.round((z+A)/HS)*NH+Math.round((x+A)/HS)];
  const GWH=(f===1&&window.GreatWall&&GreatWall.terrainGrid)?GreatWall.terrainGrid():null;   // tầng 2: độ cao núi + sống tường + thung lũng suối do greatwall.js tính sẵn (lưới .5m)
  if(CFG.terrain&&(CFG.hill>0||GWH)){
    const rv=Fl.lakes[0],rvs=Fl.lakes.filter(l=>!l.pool),ph=[0,1,2,3].map(()=>rand()*6.283),
      ob=boxes.filter(b=>b.y0>=y0-.05&&b.y0<y0+FHT[f]-3&&!b.gw),   // b.gw: khối của tường thành (greatwall.js) - địa hình ở đó do chính greatwall.js tạo
      dR=(x,z,b)=>Math.hypot(Math.max(b.x0-x,0,x-b.x1),Math.max(b.z0-z,0,z-b.z1));
    for(let j=0;j<NH;j++)for(let i=0;i<NH;i++){
      const x=-A+i*HS,z=-A+j*HS;
      let m=clamp01((Math.min(A-Math.abs(x),A-Math.abs(z))-1)/5);
      if(GWH){for(const l of rvs){if(m<=0)break;m=Math.min(m,clamp01(((l.rho(x,z)-1)*l.rz-1.5)/3))}}   // suối: thung lũng đã phẳng sẵn, chỉ cần bảo đảm sát bờ = 0
      else m=Math.min(m,clamp01(((rv.rho(x,z)-1)*rv.rz-2.5)/7));
      if(m>0)for(const k of keep){m=Math.min(m,clamp01((dR(x,z,k)-1.5)/6));if(m<=0)break}
      if(m>0)for(const c of flat){m=Math.min(m,clamp01((Math.hypot(x-c.x,z-c.z)-c.r)/5));if(m<=0)break}
      if(m>0)for(const b of ob){m=Math.min(m,clamp01((dR(x,z,b)-1.2)/5));if(m<=0)break}
      if(m<=0){HG[j*NH+i]=0;continue}
      if(GWH){HG[j*NH+i]=GWH[j*NH+i]*m;continue}
      const n=.5*Math.sin(x*.11+ph[0])*Math.sin(z*.10+ph[1])+.3*Math.sin(x*.19+z*.15+ph[2])+.2*Math.sin(x*.31-z*.26+ph[3]);   // sóng dài -> đồi rộng
      HG[j*NH+i]=CFG.hill*smooth(clamp01((n+.1)/1.0))*m;
    }
    hAt=(x,z)=>{let u=(x+A)/HS,v=(z+A)/HS;const mx=NH-1.001;u=u<0?0:u>mx?mx:u;v=v<0?0:v>mx?mx:v;
      const i=u|0,j=v|0,fu=u-i,fv=v-j,a=HG[j*NH+i],b=HG[j*NH+i+1],c=HG[(j+1)*NH+i],e=HG[(j+1)*NH+i+1];
      return a+(b-a)*fu+(c-a)*fv+(a-b-c+e)*fu*fv};
    Fl.hAt=hAt;Fl.hg=true;
  }

  // 2) Tảng đá (kể cả vài tảng sát mép hồ)
  const putRock=(x,z,ok)=>{
    const q=rand();
    if(q<.62){const v=rand.pick(variants(f+'boulder',()=>boulder(T,rand))),sc=rand.range(.8,1.3),hh=v.half*sc;
      if(!ok&&!(ok=spot(hh+.2,hh)))return;
      if(ok===true)ok={x,z};
      inst(v.geo,ok.x,y0-.05,ok.z,sc,rand()*6.283,true);solidBox(ok.x,ok.z,hh,hh,v.ch*sc);placed.push({x:ok.x,z:ok.z,r:hh*1.1});Fl.stones.push({x:ok.x,z:ok.z,r:hh+.2,n:3,max:3,t:0})}   // nguồn đá cho bot nhặt
    else if(q<.8){const v=rand.pick(variants(f+'pillar',()=>pillar(T,rand))),hh=v.half,pt=spot(hh+.3,hh+.3);
      if(!pt)return;inst(v.geo,pt.x,y0-.05,pt.z,1,rand()*6.283,true);solidBox(pt.x,pt.z,hh,hh,v.ch);placed.push({x:pt.x,z:pt.z,r:hh*1.2})}
    else{const v=rand.pick(variants(f+'pebbles',()=>pebbles(T,rand))),pt=spot(.5,.5);if(!pt)return;inst(v.geo,pt.x,y0,pt.z,rand.range(.9,1.4),rand()*6.283,false);placed.push({x:pt.x,z:pt.z,r:.4});Fl.stones.push({x:pt.x,z:pt.z,r:.25,n:5,max:5,t:0})}
  };
  for(let i=0,n=Math.round(T.rocks*k);i<n;i++)putRock();
  for(const l of Fl.lakes)if(!l.pool)for(let j=0;j<7;j++){   // đá to ngay bờ sông
    const [x,z]=l.at(rand()*6.283,1.3+rand()*.15),v=rand.pick(variants(f+'boulder',()=>boulder(T,rand))),sc=rand.range(.8,1.2),hh=v.half*sc;
    if(okAt(x,z,hh+.1,hh)){inst(v.geo,x,y0-.05,z,sc,rand()*6.283,true);solidBox(x,z,hh,hh,v.ch*sc);placed.push({x,z,r:hh*1.1});Fl.stones.push({x,z,r:hh+.2,n:3,max:3,t:0})}
  }

  // 3) Cây
  for(let i=0,n=Math.round(T.trees*k);i<n;i++){
    const kind=rand.pick(T.kinds),v=rand.pick(variants(f+kind,(_,vi)=>kind==='pine'?pineTree(T,rand,vi):roundTree(T,rand,kind==='cherry'?T.leafB:T.leaf,vi,kind==='cherry'),4));
    const sc=Math.min(rand.range(.85,1.3),8.3/v.h),pt=spot(v.crown*sc*.5,v.crown*sc*.7);if(!pt)continue;
    const ry=rand()*6.283;inst(v.geo,pt.x,y0-.05,pt.z,sc,ry,true);
    solidTrunk(pt.x,pt.z,v,sc,ry);   // chỉ thân cây có va chạm (bám theo thân cong), tán lá đi xuyên được
    placed.push({x:pt.x,z:pt.z,r:v.crown*sc*.5});
    if(rand()<.65)patch(pt.x,pt.z,v.crown*sc*.7);
  }

  // 4) Bụi cây, khúc gỗ, gốc cây, nấm
  for(let i=0,n=Math.round(T.bushes*k);i<n;i++){
    const pal=rand()<.5?T.leaf:T.leafB,v=rand.pick(variants(f+'bush'+(pal===T.leaf?0:1),()=>bush(T,rand,pal))),pt=spot(.55,.6);if(!pt)continue;
    inst(v.geo,pt.x,y0-.03,pt.z,rand.range(.8,1.3),rand()*6.283,true);placed.push({x:pt.x,z:pt.z,r:.5});Fl.stones.push({x:pt.x,z:pt.z,r:.55,n:2,max:2,t:0});
  }
  for(let i=0,n=Math.max(1,Math.round(T.logs*k*.6));i<n;i++){   // mỗi "log" giờ là 1 đống gỗ nhiều khúc nên đặt ít đống hơn
    const v=rand.pick(variants(f+'log',()=>logMesh(T,rand))),rad=Math.hypot(v.L,v.W)/2*.9,pt=spot(rad,rad);if(!pt)continue;
    const o=rand()<.5?0:Math.PI/2,hl=v.L/2*.95,hw=v.W/2*.95;
    inst(v.geo,pt.x,y0-.02,pt.z,1,o,true);solidBox(pt.x,pt.z,o?hw:hl,o?hl:hw,v.H*.95);placed.push({x:pt.x,z:pt.z,r:rad});
  }
  for(let i=0,n=Math.round(T.stumps*k);i<n;i++){
    const v=rand.pick(variants(f+'stump',()=>stumpMesh(T))),pt=spot(.5,.5);if(!pt)continue;
    inst(v.geo,pt.x,y0-.02,pt.z,rand.range(.9,1.3),rand()*6.283,true);solidBox(pt.x,pt.z,.28,.28,.47);placed.push({x:pt.x,z:pt.z,r:.45});
  }
  for(let i=0,n=Math.round(T.shrooms*k);i<n;i++){const pt=spot(.3,.3);if(!pt)continue;shroom(pt.x,pt.z);placed.push({x:pt.x,z:pt.z,r:.3})}

  // 5) Mảng cỏ, bụi cỏ, hoa
  for(let i=0,n=Math.round(T.patches*k);i<n;i++){const x=rand.range(-lim,lim),z=rand.range(-lim,lim),pr=rand.range(2.2,3.8);
    if(!wet(x,z,pr+.5)&&(f===0||sup(x,z,pr*.6)))patch(x,z,pr)}
  for(let i=0,n=Math.round(T.tufts*k);i<n;i++){const x=rand.range(-lim,lim),z=rand.range(-lim,lim);
    if(wet(x,z,.2)||hitAny({x,y:y0+.02,z,r:.08,h:.2})||(f&&!sup(x,z,0)))continue;
    for(let b=0,m=rand.int(3,5);b<m;b++){const h=rand.range(.16,.42);dc(x+rand.range(-.1,.1),y0+h/2,z+rand.range(-.1,.1),.05,h,.05,rand.pick(T.tuft))}}
  for(let i=0,n=Math.round(T.flowers*k);i<n;i++){const x=rand.range(-lim,lim),z=rand.range(-lim,lim);
    if(wet(x,z,.3)||hitAny({x,y:y0+.02,z,r:.08,h:.3})||(f&&!sup(x,z,0)))continue;
    const c=rand.pick(T.flower);dc(x,y0+.11,z,.03,.22,.03,T.tuft[2]);dc(x,y0+.25,z,.1,.07,.1,c);dc(x,y0+.27,z,.04,.05,.04,0xffd23f)}
  // 5b) Lá / cánh hoa rơi vãi (mảnh phẳng nhỏ, gộp chung mesh trang trí)
  for(let i=0,n=Math.round(CFG.litter*k);i<n;i++){const x=rand.range(-lim,lim),z=rand.range(-lim,lim);
    if(wet(x,z,.2)||hitAny({x,y:y0+.02,z,r:.08,h:.3})||(f&&!sup(x,z,0)))continue;
    const s=rand.range(.06,.13);dc(x,y0+.105,z,s,.02,s*rand.range(.7,1.2),rand.pick(rand()<.55?T.leaf:T.leafB))}
  const dm=d.mesh();dm.frustumCulled=false;S.add(dm);Fl.deco=dm;

  // 6) Bướm bay
  if(CFG.critters&&!T.ice)for(let i=0,n=3+f*2;i<n;i++){
    const cx=rand.range(-lim*.8,lim*.8),cz=rand.range(-lim*.8,lim*.8);
    if(hitAny({x:cx,y:y0+.02,z:cz,r:.5,h:1})||!sup(cx,cz,.5))continue;
    const b=butterfly(rand.pick([0xffd23f,0xff7fa8,0x7fbfff,0xffffff,0xc9a7ff]));
    Fl.crit.push({...b,cx,cz,rr:rand.range(1.2,2.8),sp:rand.range(.5,1),ph:rand()*6.283,by:y0});
  }
  // 6b) CÁ: rải trong sông (chỗ nước sâu >= .6m). Sông đóng băng (tầng tuyết) thì không có cá.
  Fl.fish=[];
  if(CFG.fish>0)for(const l of Fl.lakes){
    if(l.pool||l.ice||!l.cl||!l.cl.length)continue;
    const n=Math.min(60,Math.round(CFG.fish*(MOBILE?.6:1)*A/30)),G=fishGeos();
    for(let i=0,tries=0;i<n&&tries<n*40;tries++){
      const c=l.cl[Math.floor(rand()*l.cl.length)],x=(c[0]+.5)*CELL,z=(c[1]+.5)*CELL;
      if(!fishOK(Fl,l,x,z))continue;i++;
      const q=makeFish(G,rand),dp=rand.range(.2,.8),bed=l.y-lakeH(l,x,z),surf=l.y-CFG.level-.05,th=rand()*6.283;
      Object.assign(q,{Fl,l,x,z,th,tt:th,tw:rand.range(0,3),hold:0,sp:rand.range(.5,1.1),dp,ph:rand()*6.283,y:Math.max(bed+.25,Math.min(surf-.3,bed+(surf-bed)*dp))});
      q.g.position.set(x,q.y,z);Fl.fish.push(q);
    }
  }
  // 7) THẢM CỎ: mỗi "mảnh rubik" 0.5m (CFG.carpet) có màu riêng + viền nhạt như miếng dán. 3 tông: xanh nhạt · xanh đậm · xanh cực đậm, loang thành dải,
  //    rải thêm vài mảnh lệch tông sang tông kế bên cho có chi tiết.
  if(CFG.terrain){
    const Pal=T.ice?[0xf2f7ff,0xd6e6f7,0xaec6e4]:f===2?[0x92b24c,0x5b8a34,0x2c501f]:[0x62b85c,0x2f8a45,0x113f26],   // [nhạt, đậm, cực đậm]
      q=[0,1,2,3].map(()=>rand()*6.283),col=new THREE.Color(),CH=16,chunks=new Map(),ty=y0+.03,CS0=f===1?Math.max(.8,CFG.carpet):(CFG.carpet>=1?1:Math.max(.2,CFG.carpet)),NC=Math.round(2*A/CS0),CS=2*A/NC,
      band=(x,z)=>{const v=.55*Math.sin(x*.085+q[0])*Math.sin(z*.075+q[1])+.35*Math.sin(x*.16-z*.12+q[2])+.25*Math.sin(x*.29+z*.24+q[3]);
        return v<-.35?2:v<.2?1:0};
    const GRC=[0x6aa14b,0x4a8340,0x2f5a2d],RKC=[0x8c8478,0x756d62,0x9d9488],_rc=new THREE.Color();   // tầng 2: màu rừng / màu đá
    const CAP=Math.pow(Math.ceil(CH/Math.min(CS,.5))+1,2);   // số ô tối đa / khối 16m (bộ nhớ cấp phát 1 lần, dạng số nguyên 8-bit cho nhẹ)
    const emit=(xa,za,s,i,j)=>{
      const xb=xa+s,zb=za+s,ya=ty+hAt(xa,za),yb=ty+hAt(xb,za),yc=ty+hAt(xb,zb),yd=ty+hAt(xa,zb),
        hh=(ya+yb+yc+yd)/4-ty,h1=(Math.imul(i,73856093)^Math.imul(j,19349663))>>>0,jt=(h1%1000)/1000,sp=((h1>>>10)%1000)/1000;
      let bi=band(xa+s/2,za+s/2);if(sp<.14)bi=Math.max(0,Math.min(2,bi+(sp<.07?-1:1)));   // ~14% mảnh lệch tông
      if(f===1){   // núi: rừng xanh ở thấp, đá xám nâu ở cao / dốc
        const sl=Math.max(Math.abs(ya-yc),Math.abs(yb-yd))/(s*1.414),rk=clamp01((hh-5)/10+(sl-.55)*.9);
        col.setHex(GRC[bi]);_rc.setHex(RKC[(h1>>>3)%3]);col.lerp(_rc,rk*rk*(3-2*rk)).multiplyScalar(.9+.2*jt);
      }else col.setHex(Pal[bi]).multiplyScalar((.88+.16*jt)*(1+.1*hh/Math.max(.1,CFG.hill)));
      const R=Math.round(Math.min(1,col.r)*255),G=Math.round(Math.min(1,col.g)*255),B=Math.round(Math.min(1,col.b)*255);
      const key=Math.floor((xa+A)/CH)*1000+Math.floor((za+A)/CH);let c=chunks.get(key);
      if(!c)chunks.set(key,c={n:0,p:new Float32Array(CAP*18),c:new Uint8Array(CAP*18),u:new Uint8Array(CAP*12),nr:new Int8Array(CAP*18)});
      let pi=c.n*18,ui=c.n*12;c.n++;
      const tri=(a,b,e)=>{
        const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=e[0]-a[0],vy=e[1]-a[1],vz=e[2]-a[2],
          nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,l=Math.hypot(nx,ny,nz)||1;
        for(const v of[a,b,e]){c.p[pi]=v[0];c.p[pi+1]=v[1];c.p[pi+2]=v[2];c.c[pi]=R;c.c[pi+1]=G;c.c[pi+2]=B;
          c.nr[pi]=Math.round(nx/l*127);c.nr[pi+1]=Math.round(ny/l*127);c.nr[pi+2]=Math.round(nz/l*127);pi+=3;c.u[ui++]=v[3]*255;c.u[ui++]=v[4]*255}};
      const a=[xa,ya,za,0,0],b=[xb,yb,za,1,0],cc=[xb,yc,zb,1,1],dd=[xa,yd,zb,0,1];
      if(Math.abs(ya-yc)<Math.abs(yb-yd)){tri(a,cc,b);tri(a,dd,cc)}else{tri(a,dd,b);tri(b,dd,cc)}
    };
    const holeRects=f>0?keep.map(k=>({x0:k.x0-1,x1:k.x1+1,z0:k.z0-1,z1:k.z1+1})):[],
      noSlab=(x,z)=>holeRects.length&&holeRects.some(k=>x>k.x0&&x<k.x1&&z>k.z0&&z<k.z1)&&!hitAny({x,y:y0-.6,z,r:.05,h:.3});   // lỗ thang: không trải thảm
    for(let j=0;j<NC;j++)for(let i=0;i<NC;i++){
      const xa=-A+i*CS,za=-A+j*CS;
      if(CS<1){const h=CS/2;if(inLk(xa+h,za+h)||noSlab(xa+h,za+h))continue;emit(xa,za,CS,i,j);continue}
      const w=[inLk(xa+.25,za+.25),inLk(xa+.75,za+.25),inLk(xa+.25,za+.75),inLk(xa+.75,za+.75)],nw=w[0]+w[1]+w[2]+w[3];   // chế độ nhẹ (1m): chỗ sát nước chia nhỏ .5m
      if(nw===0){if(!noSlab(xa+.5,za+.5))emit(xa,za,1,i,j)}
      else if(nw<4)for(let k=0;k<4;k++)if(!w[k])emit(xa+(k&1)*.5,za+(k>>1)*.5,.5,i*2+(k&1),j*2+(k>>1));
    }
    const tm=new THREE.MeshLambertMaterial({vertexColors:true,map:carpetTex()});
    for(const c of chunks.values()){
      const n=c.n,g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.BufferAttribute(c.p.slice(0,n*18),3));
      g.setAttribute('color',new THREE.BufferAttribute(c.c.slice(0,n*18),3,true));
      g.setAttribute('normal',new THREE.BufferAttribute(c.nr.slice(0,n*18),3,true));
      g.setAttribute('uv',new THREE.BufferAttribute(c.u.slice(0,n*12),2,true));
      const m=new THREE.Mesh(g,tm);S.add(m);meshes.push(m);Fl.terr.push(m);
    }
    // 8) CỎ NHỎ DỰNG ĐỨNG · HOA · ĐÁ VỤN rải trên nền. Gộp thành khối 16m, chỉ vẽ khối ở gần; không có va chạm, đạn xuyên qua.
    if(CFG.detail>0){
      const DG=new Map(),cvt=(hex,m)=>{col.setHex(hex).multiplyScalar(m);return[Math.min(1,col.r),Math.min(1,col.g),Math.min(1,col.b)]};
      const bx8=(x,y,z,sx,sy,sz,cb,ct)=>{   // hộp không đáy: (x,z) tâm, y = đáy, màu đáy -> màu đỉnh
        const kx=Math.floor((x+A)/CH),kz=Math.floor((z+A)/CH),key=kx*1000+kz;let c=DG.get(key);
        if(!c)DG.set(key,c={p:[],c:[],n:[],cx:(kx+.5)*CH-A,cz:(kz+.5)*CH-A});
        const P=c.p,C=c.c,N=c.n,x0=x-sx/2,x1=x+sx/2,z0=z-sz/2,z1=z+sz/2,y1=y+sy;
        const face=(n,vs)=>{for(const k of[0,1,2,0,2,3]){const v=vs[k],cc=v[3]?ct:cb;P.push(v[0],v[1],v[2]);C.push(cc[0],cc[1],cc[2]);N.push(n[0],n[1],n[2])}};
        face([0,1,0],[[x0,y1,z0,1],[x0,y1,z1,1],[x1,y1,z1,1],[x1,y1,z0,1]]);
        face([1,0,0],[[x1,y,z0,0],[x1,y1,z0,1],[x1,y1,z1,1],[x1,y,z1,0]]);
        face([-1,0,0],[[x0,y,z1,0],[x0,y1,z1,1],[x0,y1,z0,1],[x0,y,z0,0]]);
        face([0,0,1],[[x1,y,z1,0],[x1,y1,z1,1],[x0,y1,z1,1],[x0,y,z1,0]]);
        face([0,0,-1],[[x0,y,z0,0],[x0,y1,z0,1],[x1,y1,z0,1],[x1,y,z0,0]]);
      };
      const ar=4*lim*lim*CFG.detail,ok=(x,z,m)=>Math.abs(x)<lim&&Math.abs(z)<lim&&(f!==1||hAt(x,z)<9)&&!wet(x,z,m)&&!(f===0&&window.BathKeeps&&BathKeeps.some(q=>x>q.x0&&x<q.x1&&z>q.z0&&z<q.z1))&&!noSlab(x,z)&&!hitAny({x,y:y0+.02,z,r:.06,h:.3}),
        gY=(x,z)=>y0+.02+hAt(x,z);
      for(let i=0,n=Math.round(ar*.22);i<n;i++){   // cụm cỏ 3-5 lá
        const x=rand.range(-lim,lim),z=rand.range(-lim,lim);if(!ok(x,z,1.2))continue;
        const gy=gY(x,z),top=rand.pick(T.tuft),m=rand.range(.85,1.15)*(T.ice?1:.72);
        for(let b=0,nb=rand.int(3,5);b<nb;b++){const h=rand.range(.13,.34),w=rand.range(.035,.06);
          bx8(x+rand.range(-.1,.1),gy,z+rand.range(-.1,.1),w,h,w,cvt(top,.5*m),cvt(top,1.1*m))}
      }
      for(let i=0,n=Math.round(ar*.05);i<n;i++){   // hoa
        const x=rand.range(-lim,lim),z=rand.range(-lim,lim);if(!ok(x,z,1.2))continue;
        const gy=gY(x,z),h=rand.range(.2,.38),hc=rand.pick(T.flower),st=T.tuft[2];
        bx8(x,gy,z,.03,h,.03,cvt(st,.7),cvt(st,1));bx8(x,gy+h,z,.11,.07,.11,cvt(hc,.8),cvt(hc,1.05));bx8(x,gy+h+.07,z,.05,.03,.05,cvt(0xffd23f,1),cvt(0xffd23f,1));
      }
      for(let i=0,n=Math.round(ar*.06);i<n;i++){   // cụm đá vụn (4-6 viên)
        const cx=rand.range(-lim,lim),cz=rand.range(-lim,lim);
        for(let b=0,nb=rand.int(4,6);b<nb;b++){
          const x=cx+rand.range(-.4,.4),z=cz+rand.range(-.4,.4);if(!ok(x,z,.8))continue;
          const sz=rand.range(.05,.13),c=rand.pick(T.rock),m=rand.range(.85,1.15);
          bx8(x,gY(x,z)-.01,z,sz*rand.range(.8,1.3),sz*.6,sz*rand.range(.8,1.3),cvt(c,.8*m),cvt(c,1.05*m));
        }
      }
      const dmat=new THREE.MeshLambertMaterial({vertexColors:true});
      for(const c of DG.values()){
        const g=new THREE.BufferGeometry();
        g.setAttribute('position',new THREE.Float32BufferAttribute(c.p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c.c,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(c.n,3));
        const m=new THREE.Mesh(g,dmat);m.userData={cx:c.cx,cz:c.cz};S.add(m);Fl.detail.push(m);
      }
    }
    if(f===0&&typeof grid!=='undefined'&&grid)grid.visible=false;   // bỏ lưới caro xám của tầng 1
  }
  carve(Fl,f,y0);   // đào hồ thật sự (sau khi mọi vật thể khác đã đặt xong)
  // bản đồ thô (ô 2m) đánh dấu chỗ GẦN nước (<= ~3m quanh mép hồ). wetAt() gọi rất nhiều lần mỗi khung (AI bot), ở ô không đánh dấu thì trả lời ngay mà khỏi tính rho
  {const NW=Math.ceil(2*A/WC)+1,wc=new Uint8Array(NW*NW);
    for(const l of Fl.lakes){if(l.ice)continue;
      for(let j=0;j<NW;j++)for(let i=0;i<NW;i++){if(wc[j*NW+i])continue;
        if(l.rho(-A+(i+.5)*WC,-A+(j+.5)*WC)<1+3/l.rz)wc[j*NW+i]=1}}
    Fl.wc=wc;Fl.wn=NW;Fl.wA=A}
  return Fl;
}

// ---- Chạy: tầng 1 dựng ngay, 3 tầng còn lại dựng dần sau khi tải ----
const FL=[];
const act=f=>P.y>FY(f)-6&&P.y<FY(f+1)-3;   // tầng đang gần người chơi
function vis(){
  for(const Fl of FL){const a=act(Fl.f);
    const VD=CFG.viewDist*(Fl.f===1?1.7:1);
    for(const m of Fl.objs){const b=a&&Math.hypot(m.position.x-P.x,m.position.z-P.z)<VD;m._vb=b;m.visible=b&&!m._oc}   // _oc: bị tường / nhà che khuất (engine/occlusion.js)
    if(Fl.deco)Fl.deco.visible=a;
    for(const m of Fl.terr)m.visible=a;
    for(const m of Fl.detail){const b=a&&Math.hypot(m.userData.cx-P.x,m.userData.cz-P.z)<VD+14;m._vb=b;m.visible=b&&!m._oc}   // cỏ/hoa/đá vụn: chỉ vẽ khối ở gần
    for(const l of Fl.lakes){if(l.mesh)l.mesh.visible=a;if(l.bed)l.bed.visible=a}
    for(const c of Fl.crit)c.g.visible=a;
    if(Fl.fish)for(const q of Fl.fish)q.g.visible=a&&Math.hypot(q.x-P.x,q.z-P.z)<VD;
  }
}
function lakeAt(x,y,z){   // đang lội trong hồ nào (chân thấp hơn mặt nước)
  const ci=Math.floor(x/CELL),cj=Math.floor(z/CELL);
  for(const Fl of FL){const l=Fl.cells.size&&Fl.cells.get(ck(ci,cj));
    if(l&&y<l.y-CFG.level+.15&&y>l.y-l.dmax-.6)return l}
  return null;
}
// physics.js gọi hàm này: độ cao ĐÁY HỒ tại (x,z) nếu đang ở trong hồ, ngược lại null -> người/bot/lựu đạn thật sự lún xuống đáy
lakeGround=function(x,z,y){
  const ci=Math.floor(x/CELL),cj=Math.floor(z/CELL);
  for(const Fl of FL){if(!Fl.cells.size)continue;const l=Fl.cells.get(ck(ci,cj));
    if(l&&y>l.y-l.dmax-1.2&&y<l.y+FHT[l.f]-SLT-.1)return l.y-lakeH(l,x,z)}
  // không phải lòng sông -> mặt đồi (chỉ khi chân đang gần/dưới mặt đồi; đứng trên khối cao thì để physics tự xử lý)
  for(const Fl of FL){if(!Fl.hg)continue;
    if(y>Fl.y-1.2&&y<Fl.y+FHT[Fl.f]-3){const h=Fl.hAt(x,z);return h>.005&&y<Fl.y+h+1?Fl.y+h:null}}
  return null;
};
function splash(x,z,l,n){
  for(let i=0;i<n;i++){const m=new THREE.Mesh(UG,M(i&1?0x9fd8ff:0xffffff)),s=.04+Math.random()*.05;
    m.scale.set(s,s,s);m.position.set(x+(Math.random()-.5)*.5,l.y-CFG.level+.05,z+(Math.random()-.5)*.5);
    spawnPart(m,(Math.random()-.5)*2.5,1.5+Math.random()*2,(Math.random()-.5)*2.5,.5+Math.random()*.3,false,.02)}
}
function bubble(x,y,z){
  const m=new THREE.Mesh(UG,M(0xeafcff)),s=.02+Math.random()*.03;
  m.scale.set(s,s,s);m.position.set(x,y,z);
  spawnPart(m,(Math.random()-.5)*.3,.9+Math.random()*.6,(Math.random()-.5)*.3,.8+Math.random()*.4,false,.02);
}

// ---- Đạn bắn xuống nước: nước tóe lên + gợn sóng + tiếng tõm ----
function rayWater(ray,maxD){   // tia bắn cắt mặt nước ở đâu (chỉ tính khi bắn từ phía trên xuống)
  const dy=ray.direction.y,o=ray.origin;if(dy>=-1e-5)return null;let best=null;
  for(const Fl of FL){if(!Fl.cells.size||!act(Fl.f))continue;
    const sy=Fl.y-CFG.level;if(o.y<=sy)continue;
    const t=(sy-o.y)/dy;if(t<=0||t>=maxD||(best&&t>=best.dist))continue;
    const x=o.x+ray.direction.x*t,z=o.z+ray.direction.z*t,l=Fl.cells.get(ck(Math.floor(x/CELL),Math.floor(z/CELL)));
    if(l)best={dist:t,point:new THREE.Vector3(x,sy,z),lake:l};
  }
  return best;
}
function shotSplash(x,z,l){
  const sy=l.y-CFG.level,pos={x,y:sy,z};
  for(let i=0;i<18;i++){const m=new THREE.Mesh(UG,M(i%3?0x9fd8ff:0xffffff)),sz=.05+Math.random()*.07;
    m.scale.set(sz,sz,sz);m.position.set(x+(Math.random()-.5)*.25,sy+.05,z+(Math.random()-.5)*.25);
    spawnPart(m,(Math.random()-.5)*2.2,4+Math.random()*4.5,(Math.random()-.5)*2.2,.6+Math.random()*.4,false,.02)}
  ripple(x,z,l,1.6);
  snd(650,.08,'sine',.12,pos);snd(260,.16,'triangle',.1,pos);
}
function bulletSplash(x,y,z){   // đạn (của mình hoặc của boss) chạm mặt nước tại (x,y,z)
  const ci=Math.floor(x/CELL),cj=Math.floor(z/CELL);
  for(const Fl of FL){const l=Fl.cells.size&&Fl.cells.get(ck(ci,cj));
    if(l&&y<l.y+1&&y>l.y-l.dmax-1){shotSplash(x,z,l);return true}}
  return false;
}

// ---- Lựu đạn nổ dưới nước: cột nước phun lên + vòng bọt bắn ra + nhiều lớp sóng + tiếng tõm lớn (to và nhiều hơn bọt đạn nhiều lần) ----
function explosionSplash(x,y,z){
  const ci=Math.floor(x/CELL),cj=Math.floor(z/CELL);
  for(const Fl of FL){const l=Fl.cells.size&&Fl.cells.get(ck(ci,cj));
    if(!(l&&y<l.y+1&&y>l.y-l.dmax-1))continue;
    const sy=l.y-CFG.level,pos={x,y:sy,z},col=i=>M(i%3?0x9fd8ff:0xffffff);
    const add=(n,size,jit,vh,vy0,vy1,life)=>{for(let i=0;i<n;i++){
      const a=Math.random()*6.283,r=Math.random()*jit,sz=size[0]+Math.random()*(size[1]-size[0]),m=new THREE.Mesh(UG,col(i)),v=vh[0]+Math.random()*(vh[1]-vh[0]);
      m.scale.set(sz,sz,sz);m.position.set(x+Math.cos(a)*r,sy+.05,z+Math.sin(a)*r);
      spawnPart(m,Math.cos(a)*v,vy0+Math.random()*(vy1-vy0),Math.sin(a)*v,life[0]+Math.random()*(life[1]-life[0]),false,.02)}};
    add(45,[.12,.28],.5,[0,1.2],9,16,[1.1,1.6]);       // cột nước phun cao ở giữa
    add(70,[.08,.2],.8,[3,8],4,9,[.9,1.4]);            // vòng bọt lớn tóe ra xung quanh
    add(80,[.04,.1],1.6,[1,10],2,7,[.6,1.1]);          // bụi nước mịn bay tứ tung
    ripple(x,z,l,3.5);ripple(x,z,l,5.5);ripple(x,z,l,8);
    setTimeout(()=>{ripple(x,z,l,10);add(25,[.08,.18],1.2,[1,6],3,7,[.7,1.1])},220);   // đợt bọt thứ hai khi cột nước đổ xuống
    setTimeout(()=>{ripple(x,z,l,12)},450);
    splashSnd(true);snd(220,.3,'sine',.14,pos);snd(120,.5,'triangle',.12,pos);
    return true;
  }
  return false;
}

// Lội / bơi (bọc hàm move của physics.js; áp dụng cho người chơi và bot - bot có mảng .parts)
//  - nước nông: đi chậm dần theo độ sâu
//  - đang bơi (e.sw): tốc độ ngang giảm, chiều dọc do e.swv điều khiển (nổi lên / lặn xuống), KHÔNG rơi theo trọng lực
const _mv=move;
move=function(e,dx,dy,dz){
  if(e===P||e.parts){
    if(e.sw){
      const now=performance.now(),dtm=Math.min(.05,Math.max(0,(now-(e._mt||now-16))/1000));e._mt=now;
      const k=e.under?CFG.diveSpeed:CFG.swimSpeed;
      e.vy=0;return _mv(e,dx*k,(e.swv||0)*dtm,dz*k);
    }
    const l=lakeAt(e.x,e.y,e.z);
    if(l){const wd=wdep(l,e.x,e.z),a=1-(1-CFG.wade)*clamp01(wd/.6),kk=a*(1-(1-CFG.deepWade)*clamp01((wd-.6)/.5));dx*=kk;dz*=kk}
  }
  return _mv(e,dx,dy,dz);
};

// ---- CHẾ ĐỘ BƠI + NÍN THỞ (người chơi và bot dùng chung) ----
// Vào chỗ nước sâu >= CFG.swimOn -> tự động bơi: nổi trên mặt nước, đầu ló lên. Giữ Shift = lặn, Space = trồi lên nhanh.
// Khi ĐẦU chìm dưới mặt nước thì cạn dần hơi thở (CFG.air giây); hết hơi thì mất máu từng nhịp cho tới khi ngoi lên.
// Bot: cũng bơi, thỉnh thoảng tự lặn 3-15 giây; lặn quá CFG.air giây cũng bị mất máu (có thể chết đuối).
function drown(e,isP){
  const y=e.y+e.h-.3;
  for(let i=0;i<4;i++)bubble(e.x+(Math.random()-.5)*.5,y,e.z+(Math.random()-.5)*.5);
  if(isP){if(!dead)hurt(CFG.drownDmg);snd(110,.3,'sawtooth',.07)}
  else{e.hp-=CFG.drownDmg;snd(130,.25,'sawtooth',.05,{x:e.x,y,z:e.z});if(e.hp<=0)killBot(e,new THREE.Vector3(0,1,0))}
}
function swimUpdate(e,isP,dt,dive,up){
  if(e.air===undefined)e.air=CFG.air;
  const l=lakeAt(e.x,e.y,e.z);
  if(!l){if(e.sw){e.sw=0;e._mt=0;e.dive=false}e.under=false;e.air=Math.min(CFG.air,e.air+dt*4);e.dmT=0;return null}
  const wd=wdep(l,e.x,e.z),sy=l.y-CFG.level;
  if(!e.sw){if(wd>=CFG.swimOn&&e.y<=sy-.2){e.sw=1;e.swv=0;e._mt=0}}
  else if(wd<CFG.swimOff){e.sw=0;e._mt=0;e.dive=false}
  if(!e.sw){e.under=false;e.air=Math.min(CFG.air,e.air+dt*4);e.dmT=0;return l}
  const off=isP?.95:e.h*.55,ty=sy-off,bed=l.y-lakeH(l,e.x,e.z);   // ty: độ cao chân khi nổi (mắt/đầu ló khỏi mặt nước)
  let want;
  if(dive)want=-2.8;
  else if(up)want=Math.max(-3.6,Math.min(3.6,(ty-e.y)*8));
  else want=Math.max(-1.8,Math.min(1.8,(ty-e.y)*3));
  if(want<0&&e.y<=bed+.03)want=0;   // chạm đáy sông
  e.swv=want;
  const hy=isP&&typeof eye==='number'?e.y+eye:e.y+e.h-.1;
  e.under=hy<sy-.03;
  if(e.under){
    e.air-=dt;
    if(e.air<=0){e.air=0;e.dmT=(e.dmT||0)-dt;if(e.dmT<=0){e.dmT=CFG.drownTick;drown(e,isP)}}
  }else{e.air=Math.min(CFG.air,e.air+dt*3);e.dmT=0}
  return l;
}
// thanh hơi thở của người chơi (chỉ hiện khi đang bơi hoặc chưa hồi đủ hơi)
const bw=document.createElement('div');
bw.style.cssText='position:fixed;left:50%;top:calc(50% + 52px);transform:translateX(-50%);z-index:6;display:none;pointer-events:none;font:700 15px sans-serif;color:#fff;text-shadow:0 1px 3px #000;text-align:center';
bw.innerHTML='<div id="brT">\u{1F4A7}</div><div style="width:150px;height:10px;background:rgba(0,0,0,.55);border:2px solid #fff;border-radius:6px;overflow:hidden"><div id="brF" style="height:100%;width:100%;background:#7fe0ff"></div></div>';
(document.body||document.documentElement).appendChild(bw);
let brShown=false,brF=null,skT=0,wasUnder=false;
function breathUI(show){
  if(show!==brShown){bw.style.display=show?'block':'none';brShown=show;if(show&&!brF)brF=document.getElementById('brF')}
  if(!show)return;
  const u=clamp01(P.air/CFG.air);brF.style.width=(u*100)+'%';
  const low=P.air<3.5;brF.style.background=low?'#ff4d5e':'#7fe0ff';bw.style.opacity=low?(0.6+0.4*Math.abs(Math.sin(performance.now()/120))):1;
}

// ---- Chìm xuống nước: hạ camera + lớp màu nước + sương mù (không cần biết tên biến camera) ----
let sink=0;   // (camera không cần hạ nữa: người chơi thật sự lún xuống đáy hồ)
// ---- Gợn sóng lan trên mặt nước ----
const RG=new THREE.RingGeometry(.84,1,28);RG.rotateX(-Math.PI/2);
const ripples=[];
function ripple(x,z,l,sz){
  if(ripples.length>=24){const o=ripples.shift();S.remove(o.m);o.m.material.dispose()}
  const m=new THREE.Mesh(RG,new THREE.MeshBasicMaterial({color:l.T.water[3],transparent:true,opacity:.6,depthWrite:false,side:THREE.DoubleSide}));
  m.position.set(x,l.y-CFG.level+.02,z);m.scale.setScalar(.15);S.add(m);ripples.push({m,t:0,sz});
}
function tickRipples(dt){
  for(let i=ripples.length-1;i>=0;i--){const r=ripples[i];r.t+=dt;const u=r.t/1.1;
    if(u>=1){S.remove(r.m);r.m.material.dispose();ripples.splice(i,1);continue}
    r.m.scale.setScalar(.15+u*r.sz);r.m.material.opacity=.6*(1-u)}
}
if(THREE.WebGLRenderer&&!THREE.WebGLRenderer.prototype.__natureSink){
  const _r=THREE.WebGLRenderer.prototype.render;
  THREE.WebGLRenderer.prototype.render=function(sc,cam){
    if(sink>.002&&cam&&cam.position){cam.position.y-=sink;try{return _r.call(this,sc,cam)}finally{cam.position.y+=sink}}
    return _r.call(this,sc,cam);
  };
  THREE.WebGLRenderer.prototype.__natureSink=true;
}
const ov=document.createElement('div');
ov.style.cssText='position:fixed;left:0;top:0;right:0;bottom:0;pointer-events:none;z-index:5;opacity:0;transition:none';
(document.body||document.documentElement).appendChild(ov);
let ovT=null,uw=0,fog0=null,fogOn=false;
const _wc=new THREE.Color();
function tintOverlay(T){
  if(ovT===T)return;ovT=T;
  const c=new THREE.Color(T.water[2]).multiplyScalar(.75),r=Math.round(c.r*255),g=Math.round(c.g*255),b=Math.round(c.b*255);
  ov.style.background='linear-gradient(rgba('+r+','+g+','+b+',.55),rgba('+r+','+g+','+b+',.8))';
}
function fogApply(k,T){
  const F=S.fog;if(!F)return;
  if(!fog0)fog0={c:F.color.clone(),n:F.near,f:F.far,d:F.density};
  if(k<.005){
    if(fogOn){F.color.copy(fog0.c);if(F.near!==undefined){F.near=fog0.n;F.far=fog0.f}else if(F.density!==undefined)F.density=fog0.d;fogOn=false}
    return;
  }
  fogOn=true;_wc.setHex(T.water[2]).multiplyScalar(.8);
  F.color.copy(fog0.c).lerp(_wc,k);
  if(F.near!==undefined){F.near=fog0.n+(.3-fog0.n)*k;F.far=fog0.f+(18-fog0.f)*k}
  else if(F.density!==undefined)F.density=fog0.d+(.11-fog0.d)*k;
}

let last=performance.now(),tm=0,cl=0,wv=0,spl=0,inW=false,lx=0,lz=0,wasUW=false,bub=0,rip=0,gyHook=false;
function loop(now){
  requestAnimationFrame(loop);
  const dt=Math.min(.1,(now-last)/1000);last=now;tm+=dt;
  if(!gyHook&&typeof groundY==='function'){   // effects.js nạp sau nature.js nên móc vào lúc chạy: hạt (giọt nước, máu...) rơi xuống MẶT NƯỚC thay vì lơ lửng ở mặt sàn
    gyHook=true;const _g=groundY;
    groundY=function(x,y,z){const g=_g(x,y,z),ci=Math.floor(x/CELL),cj=Math.floor(z/CELL);
      for(const Fl of FL){const l=Fl.cells.size&&Fl.cells.get(ck(ci,cj));
        if(l&&g<=l.y+.001&&y<l.y+FHT[l.f]-SLT-.1&&y>l.y-l.dmax-1)return l.y-CFG.level-.02}
      for(const Fl of FL){if(!Fl.hg)continue;   // hạt (máu, bụi...) rơi xuống mặt đồi
        if(y>Fl.y-1.2&&y<Fl.y+FHT[Fl.f]-3){const h=Fl.y+Fl.hAt(x,z);if(h>g&&y>h-.3)return h;break}}
      return g};
  }
  tickRipples(dt);
  try{   // bơi / nín thở
    if(playing&&!dead){
      swimUpdate(P,true,dt,keys.ShiftLeft||keys.ShiftRight,keys.Space);
      if(wasUnder&&!P.under&&P.air<4.5)snd(520,.18,'triangle',.06);   // ngoi lên thở hắt
      wasUnder=!!P.under;
      breathUI(!!P.sw||P.air<CFG.air-.05);
    }else{if(dead){P.sw=0;P.under=false;P.air=CFG.air;P._mt=0}breathUI(false)}
    if(playing&&typeof bots!=='undefined')for(const b of bots){
      if(!b.on||b.hp<=0){if(b.sw){b.sw=0;b.dive=false;b._mt=0}b.air=CFG.air;continue}
      if(b.sw&&!b.boss){b.dvT=(b.dvT||0)-dt;   // bot thỉnh thoảng tự lặn
        if(b.dvT<=0){if(b.dive){b.dive=false;b.dvT=1.5+Math.random()*4}else if(Math.random()<.55){b.dive=true;b.dvT=3+Math.random()*12}else b.dvT=2+Math.random()*3}}
      swimUpdate(b,false,dt,b.dive,false);
    }
  }catch(err){}
  cl-=dt;if(cl<=0){cl=.2;vis()}
  wv-=dt;const doW=CFG.waves&&wv<=0;if(doW)wv=1/24;
  for(const Fl of FL){if(!act(Fl.f))continue;
    if(doW)for(const l of Fl.lakes)if(l.mesh&&!l.ice)waveLake(l,tm,P.x,P.z);
    for(const c of Fl.crit){const a=c.ph+tm*c.sp;
      c.g.position.set(c.cx+Math.cos(a)*c.rr,c.by+.6+Math.sin(tm*2+c.ph)*.25,c.cz+Math.sin(a*1.3)*c.rr*.8);
      c.g.rotation.y=Math.atan2(-Math.sin(a)*c.rr,Math.cos(a*1.3)*1.3*c.rr*.8);
      const w=Math.sin(tm*22+c.ph)*.9;c.wl.rotation.z=-w;c.wr.rotation.z=w}
    if(Fl.fish&&Fl.fish.length)tickFish(Fl,dt);
  }
  let l=null,under=false;
  if(playing){l=lakeAt(P.x,P.y,P.z);
    if(l){
      const mvg=Math.hypot(P.x-lx,P.z-lz)>dt*1.5;
      if(!inW){inW=true;if(CFG.splash)splash(P.x,P.z,l,14);ripple(P.x,P.z,l,2.8);splashSnd(true)}
      spl-=dt;if(CFG.splash&&spl<=0&&mvg){spl=.13;splash(P.x,P.z,l,4)}
      rip-=dt;if(rip<=0){rip=mvg?.24:1.1;ripple(P.x,P.z,l,mvg?1.6:1)}
      if(P.sw&&mvg){skT-=dt;if(skT<=0){skT=.7;wadeSnd()}}}
    else{if(inW)splashSnd(false);inW=false}}
  else inW=false;
  if(window.Nature)window.Nature.wading=!!l;
  // mắt có nằm dưới mặt nước không? (chỗ sâu giữa hồ thì chìm hẳn)
  if(l&&CFG.underwater){const ey=typeof eye==='number'?eye:CFG.eye;under=P.y+ey<l.y-CFG.level-.03}
  const T=l?l.T:ovT;
  uw+=((under?1:0)-uw)*Math.min(1,dt*10);
  if(T){tintOverlay(T);ov.style.opacity=uw<.01?0:uw.toFixed(2);fogApply(uw,T)}
  if(under){
    if(!wasUW)snd(150,.25,'sine',.05);
    bub-=dt;if(bub<=0){bub=.3+Math.random()*.3;bubble(P.x+(Math.random()-.5)*.6,P.y+CFG.eye-sink-.35,P.z+(Math.random()-.5)*.6)}
  }
  wasUW=under;
  lx=P.x;lz=P.z;
}
const timedBuild=f=>{const t0=performance.now(),r=buildFloor(f);console.log('[Block Arena] dựng tầng '+(f+1)+': '+Math.round(performance.now()-t0)+' ms');return r};   // xem thời gian dựng từng tầng ở F12 > Console
// NẠP LƯỜI: chỉ dựng tầng được yêu cầu (floors.js quyết định). FM.cap ghi lại mọi mesh / va chạm do lần dựng này thêm vào để dỡ sạch được.
function loadFloor(f){
  if(FL.some(q=>q.f===f))return;
  const Fl=FM.cap('N'+f,()=>timedBuild(f));
  FL.push(Fl);vis();
}
function unloadFloor(f){
  const i=FL.findIndex(q=>q.f===f);if(i<0)return;
  FL.splice(i,1);FM.drop('N'+f);
  console.log('[Block Arena] dỡ tầng '+(f+1));
}
loadFloor(0);
requestAnimationFrame(loop);
// có nước (sông) tại (x,z) của tầng f không (m = khoảng đệm ra ngoài bờ, mét). level.js dùng để không sinh bot dưới nước.
function isWater(f,x,z,m){const Fl=FL.find(q=>q.f===f);if(!Fl)return false;
  if(Fl.cells.has(ck(Math.floor(x/CELL),Math.floor(z/CELL))))return true;
  return Fl.lakes.some(l=>l.rho(x,z)<1+(m||0)/l.rz)}
// Có nước SÔNG (không tính băng) tại (x,z) không - trừ mặt cầu (đi trên cầu không phải là lội nước). Bot dùng để né sông / tìm cầu.
function wetAt(f,x,z,m){const Fl=FL.find(q=>q.f===f);if(!Fl)return false;
  if(Fl.wc&&(m||0)<=1.5){const i=Math.floor((x+Fl.wA)/WC),j=Math.floor((z+Fl.wA)/WC);if(i>=0&&j>=0&&i<Fl.wn&&j<Fl.wn&&!Fl.wc[j*Fl.wn+i])return false}   // xa nước (>3m) -> chắc chắn khô, khỏi tính
  const w=Fl.cells.has(ck(Math.floor(x/CELL),Math.floor(z/CELL)))||Fl.lakes.some(l=>!l.ice&&l.rho(x,z)<1+(m||0)/l.rz);
  if(w)for(const B of Fl.bridges){const q=B.along?x:z,ww=B.along?z:x;if(Math.abs(q-B.q)<1.55&&ww>B.wa&&ww<B.wb)return false}
  return w}
window.Nature={cfg:CFG,floors:FL,load:loadFloor,unload:unloadFloor,has:f=>FL.some(q=>q.f===f),stones:f=>{const Fl=FL.find(q=>q.f===f);return Fl&&Fl.stones||[]},lakeH,rayWater,bulletSplash,explosionSplash,isWater,wetAt,bridges:f=>{const Fl=FL.find(q=>q.f===f);return Fl&&Fl.bridges||[]},heightAt:(f,x,z)=>{const Fl=FL.find(q=>q.f===f);return Fl&&Fl.hAt?Fl.hAt(x,z):0}};
})();