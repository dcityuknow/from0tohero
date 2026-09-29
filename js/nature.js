// Thiên nhiên: cây, tảng đá, hồ nước, bụi cây, hoa cỏ, nấm, khúc gỗ, bướm... tất cả dựng bằng mảnh rubik (VB) như phần còn lại của game.
// Nạp SAU js/viewmodel.js và TRƯỚC js/bots.js (để bot không sinh ra trong thân cây / tảng đá).
// Mỗi tầng 1 chủ đề: 1 đồng cỏ · 2 rừng anh đào · 3 mùa thu · 4 tuyết.
// Chỉnh nhanh ở CFG bên dưới: quality (càng cao càng nhiều mảnh nhỏ), density (số lượng cây/đá/hoa).
(function(){
const MOBILE=('ontouchstart' in window)||navigator.maxTouchPoints>0;
const CFG={
  quality:MOBILE?.7:1,     // 1 = mặc định · 1.5 = mảnh nhỏ hơn, đẹp hơn, nặng hơn · 0.6 = mảnh to, nhẹ máy
  density:MOBILE?.7:1,     // nhân số lượng vật thể
  seed:2025,               // đổi số này để ra bố cục khác
  waves:true,              // mặt hồ nhấp nhô
  splash:true,             // tóe nước khi lội
  critters:true,           // bướm bay
  wade:.6,                 // tốc độ khi lội nước (1 = không chậm)
  viewDist:60              // xa hơn mức này thì ẩn bớt vật thể
};
const V=s=>s/CFG.quality;
function RNG(seed){let a=seed>>>0;const r=()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
  r.range=(lo,hi)=>lo+(hi-lo)*r();r.int=(lo,hi)=>Math.floor(lo+r()*(hi-lo+1));r.pick=a=>a[Math.floor(r()*a.length)];return r}

// ---- Chủ đề từng tầng. Bảng lá/thông: [chính, sáng, tối] ----
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

function trunk(v,T,r,H){   // thân cây: các đốt trụ rỗng thu nhỏ dần + 4 rễ
  const s=V(.1),segs=Math.max(3,Math.round(H/.45)),col=(a,b,l)=>T.trunk[(a*3+b*5+l*7)%T.trunk.length];
  for(let i=0;i<segs;i++){
    const a=-.15+(H+.15)*i/segs,b=-.15+(H+.15)*(i+1)/segs,u=i/(segs-1),rr=r*(1.35-.6*Math.min(1,u*1.5));
    v.cyl(0,(a+b)/2,0,rr,b-a,col,s,'y',Math.max(0,rr-s*1.6));
  }
  for(const [x,z,w,d] of [[1,0,.3,.16],[-1,0,.3,.16],[0,1,.16,.3],[0,-1,.16,.3]])v.box(x*r*1.45,.09,z*r*1.45,w,.18,d,T.trunk[0],s);
}
function roundTree(T,rand,cols){   // cây tán tròn: nhiều khối cầu chồng nhau
  const v=new VB(),tr=rand.range(.2,.27),H=rand.range(2.9,3.6),R=rand.range(1.05,1.4),s=V(.22),cy=H+R*.4;
  trunk(v,T,tr,H);
  const blob=(x,y,z,rx,ry,rz)=>v.ell(x,y,z,rx,ry,rz,bandFn(cols,Math.round(2*ry/s)),s,true);
  blob(0,cy,0,R,R*.82,R);
  for(let i=0,n=rand.int(3,4);i<n;i++){const a=i/n*6.283+rand()*.8,d=R*rand.range(.55,.75),rr=R*rand.range(.5,.65);
    blob(Math.cos(a)*d,cy-R*.12+rand.range(-.15,.2),Math.sin(a)*d,rr,rr*.85,rr)}
  blob(rand.range(-.2,.2),cy+R*.6,rand.range(-.2,.2),R*.58,R*.48,R*.58);
  return {geo:geoOf(v),crown:R*1.3,tr,th:H,h:cy+R*1.08};
}
function pineTree(T,rand){   // cây thông: các tầng đĩa xếp chồng (tầng 4 có tuyết phủ)
  const v=new VB(),tr=rand.range(.16,.21),H=rand.range(2.2,2.6),s=V(.18),tiers=rand.int(6,7),step=rand.range(.58,.68),R0=rand.range(1.2,1.5),cols=T.pine;
  trunk(v,T,tr,H);
  for(let q=0;q<tiers;q++){
    const u=q/(tiers-1),rr=R0*(1-u*.86)+.12,y=H-.25+q*step,base=q%2?0:2;
    v.cyl(0,y,0,rr,s,(a,b)=>cols[((a*5+b*3+q*2)%7===0)?1:base],s,'y');
    if(T.cap)v.cyl(0,y+s*.85,0,rr*.8,s*.8,(a,b)=>T.cap[(a+b)&1],s,'y');
  }
  const top=H-.25+tiers*step;v.cyl(0,top-.1,0,.1,.5,cols[1],V(.08),'y');
  return {geo:geoOf(v),crown:R0,tr,th:H,h:top+.2};
}
function boulder(T,rand){
  const v=new VB(),s=V(.16),rx=rand.range(.65,1),ry=rx*rand.range(.65,.9),rz=rx*rand.range(.85,1.1);
  const blob=(x,y,z,a,b,c)=>v.ell(x,y,z,a,b,c,rockFn(T,Math.round(2*b/s)),s,true);
  blob(0,ry*.8,0,rx,ry,rz);
  for(let i=0,n=rand.int(1,2);i<n;i++){const a=rand()*6.283;blob(Math.cos(a)*rx*.65,ry*.5,Math.sin(a)*rz*.65,rx*.55,ry*.6,rz*.55)}
  return {geo:geoOf(v),half:Math.min(rx,rz)*.78,ch:ry*1.45};
}
function pillar(T,rand){   // trụ đá đứng, làm chỗ nấp
  const v=new VB(),s=V(.14),w=rand.range(.55,.75);let y=0;
  for(const [k,h] of [[1,1.05],[.85,.95],[.65,.85]]){const ww=w*k;
    v.box(rand.range(-.05,.05),y+h/2,rand.range(-.05,.05),ww,h,ww,(i,j,kk,nx,ny)=>(T.moss&&j>=ny-2)?T.moss:T.rock[(i+j*2+kk)%3],s,true);y+=h}
  return {geo:geoOf(v),half:w*.42,ch:2.6};
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
function logMesh(T,rand){   // khúc gỗ nằm: thân rỗng + mặt cắt vòng năm
  const v=new VB(),s=V(.09),r=.3,L=rand.range(1.8,2.4);
  v.cyl(0,r,0,r,L,(a,b,l)=>T.trunk[(a+b*2+l*3)%T.trunk.length],s,'x',r-s*1.6);
  const ring=(a,b)=>((Math.hypot(a-3,b-3)|0)&1)?0xd9b38c:0xb8895f;
  for(const sx of[-1,1])v.cyl(sx*(L/2-s*.4),r,0,r,s*.8,ring,s,'x');
  if(T.moss)v.box(rand.range(-.4,.4),2*r+.02,0,.5,.07,.24,T.moss,s);
  return {geo:geoOf(v),L,r};
}
function stumpMesh(T){
  const v=new VB(),s=V(.09),r=.38;
  v.cyl(0,.24,0,r,.48,(a,b,l)=>T.trunk[(a+b*2+l*3)%T.trunk.length],s,'y',r-s*1.6);
  v.cyl(0,.48,0,r,s*.8,(a,b)=>((Math.hypot(a-4,b-4)|0)&1)?0xd9b38c:0xb8895f,s,'y');
  return {geo:geoOf(v)};
}

// ---- Vùng cấm đặt vật thể: chỗ người chơi xuất hiện, chân/đầu thang, cổng ----
const circleRect=(x,z,r,k)=>{const dx=Math.max(k.x0-x,0,x-k.x1),dz=Math.max(k.z0-z,0,z-k.z1);return dx*dx+dz*dz<r*r};
function keepOuts(f){
  const k=[];
  if(f===0)k.push({x0:-3.5,x1:3.5,z0:12.5,z1:19.5});
  if(f<NF-1){const A=AF(f),cx=(f%2?1:-1)*(A-2);k.push({x0:cx-3.2,x1:cx+3.2,z0:A-23,z1:A-.5})}
  if(f>0){const Af=AF(f-1),s=(f-1)%2,a=s?Af-4:-Af,b=s?Af:-Af+4;k.push({x0:a-2,x1:b+2,z0:Af-24,z1:Af-2})}
  return k;
}

// ---- Dựng cả 1 tầng ----
const _m=new THREE.Matrix4(),_p=new THREE.Vector3(),_q=new THREE.Quaternion(),_s=new THREE.Vector3(),cache={};
const variants=(key,mk)=>cache[key]||(cache[key]=Array.from({length:3},mk));
function waveLake(l,t){
  const s=l.g*.97;
  for(let i=0;i<l.tiles.length;i++){const q=l.tiles[i],h=.1+(l.ice?0:.024*(Math.sin(q.x*1.1+t*1.5)+Math.sin(q.z*1.3-t*1.1)+Math.sin((q.x+q.z)*.7+t*.9)*.6));
    _p.set(q.x,l.y+h/2,q.z);_s.set(s,h,s);_m.compose(_p,_q,_s);l.mesh.setMatrixAt(i,_m)}
  l.mesh.instanceMatrix.needsUpdate=true;
}
function butterfly(col){
  const g=new THREE.Group(),b=new THREE.Mesh(UG,M(0x2b2a3a));b.scale.set(.03,.03,.12);g.add(b);
  const mk=sd=>{const p=new THREE.Group();p.position.x=sd*.02;const w=new THREE.Mesh(UG,M(col));w.scale.set(.12,.012,.1);w.position.x=sd*.06;p.add(w);g.add(p);return p};
  S.add(g);return {g,wl:mk(-1),wr:mk(1)};
}
function buildFloor(f){
  const T=THM[f],A=AF(f),y0=f*FH,rand=RNG(CFG.seed*131+f*7919+1),k=Math.pow(A/20,1.6)*CFG.density;
  const Fl={f,y:y0,objs:[],lakes:[],crit:[],deco:null},keep=keepOuts(f),placed=[],d=new VB(),lim=A-1.2;
  let cn=0,pn=0;
  const dc=(x,y,z,sx,sy,sz,hex)=>d.cube(x,y,z,sx,sy,sz,hex,cn++,(cn*7)&63,(cn*13)&31);   // 1 mảnh rubik gộp vào mesh trang trí
  const sup=(x,z,r)=>f===0||[[0,0],[r,0],[-r,0],[0,r],[0,-r]].every(([a,b])=>hitAny({x:x+a,y:y0-.6,z:z+b,r:.05,h:.3}));   // có sàn đỡ bên dưới (tầng trên có lỗ thang)
  const wet=(x,z,m)=>Fl.lakes.some(l=>l.rho(x,z)<1+m/Math.min(l.rx,l.rz));
  const okAt=(x,z,rad,edge)=>{
    if(Math.abs(x)>lim-edge||Math.abs(z)>lim-edge)return false;
    if(keep.some(q=>circleRect(x,z,rad+.3,q)))return false;
    if(wet(x,z,rad+.8))return false;
    for(const p of placed)if(Math.hypot(x-p.x,z-p.z)<rad+p.r+.25)return false;
    if(hitAny({x,y:y0+.02,z,r:rad,h:1.7}))return false;
    return sup(x,z,rad+.4);
  };
  const spot=(rad,edge)=>{for(let n=0;n<50;n++){const x=rand.range(-lim,lim),z=rand.range(-lim,lim);if(okAt(x,z,rad,edge))return{x,z}}return null};
  const inst=(geo,x,y,z,sc,ry,solid)=>{const m=new THREE.Mesh(geo,VMAT);m.position.set(x,y,z);m.rotation.y=ry;m.scale.setScalar(sc);S.add(m);if(solid)meshes.push(m);Fl.objs.push(m);return m};
  const solidBox=(x,z,hx,hz,h)=>boxes.push({x0:x-hx,x1:x+hx,y0:y0,y1:y0+h,z0:z-hz,z1:z+hz});
  const patch=(px,pz,pr)=>{   // mảng cỏ / rêu / tuyết: lát mảnh mỏng
    const g=V(.34),yy=y0+.045+.008*(pn++%4);
    for(let x=px-pr*1.3;x<=px+pr*1.3;x+=g)for(let z=pz-pr*1.3;z<=pz+pr*1.3;z+=g){
      const dx=x-px,dz=z-pz,a=Math.atan2(dz,dx),rr=pr*(1+.18*Math.sin(a*3+px)+.1*Math.sin(a*5+pz));
      if(Math.hypot(dx,dz)>=rr||wet(x,z,1.6)||(f&&!hitAny({x,y:y0-.6,z,r:.05,h:.3})))continue;
      dc(x,yy,z,g*.94,.05,g*.94,T.ground[Math.floor(rand()*3)]);
    }
  };
  const shroom=(x,z)=>{
    const cap=rand.pick(T.shroom);
    for(let i=0,n=rand.int(2,4);i<n;i++){const mx=x+rand.range(-.25,.25),mz=z+rand.range(-.25,.25),h=rand.range(.15,.32),cr=rand.range(.1,.18);
      d.cyl(mx,y0+h/2,mz,.035,h,0xf4ecd8,.035,'y');
      d.ell(mx,y0+h+cr*.3,mz,cr,cr*.6,cr,(a,b,c)=>((a+b*2+c)%4===0)?0xffffff:cap,.05,true)}
  };

  // 1) Hồ nước (đặt trước để mọi thứ khác tránh ra)
  const mkLake=(cx,cz,rx,rz)=>{const ph=rand()*6.283,a1=rand.range(.08,.14),a2=rand.range(.04,.09),nz=a=>1+a1*Math.sin(3*a+ph)+a2*Math.sin(5*a+ph*1.7);
    return {cx,cz,rx,rz,y:y0,ice:!!T.ice,nz,rho:(x,z)=>{const u=(x-cx)/rx,v=(z-cz)/rz;return Math.hypot(u,v)/nz(Math.atan2(v,u))},at:(a,p)=>[cx+rx*Math.cos(a)*p*nz(a),cz+rz*Math.sin(a)*p*nz(a)]}};
  const lakeOk=(x,z,rx,rz)=>{
    if(keep.some(q=>circleRect(x,z,Math.max(rx,rz)*.95,q)))return false;
    for(const o of Fl.lakes)if(Math.hypot(x-o.cx,z-o.cz)<(Math.max(rx,rz)+Math.max(o.rx,o.rz))*1.1)return false;
    for(let i=0;i<16;i++){const a=i/16*6.283,bx=x+Math.cos(a)*rx*1.15,bz=z+Math.sin(a)*rz*1.15;
      if(hitAny({x:bx,y:y0+.02,z:bz,r:.5,h:.5})||!sup(bx,bz,.3))return false}
    return !hitAny({x,y:y0+.02,z,r:.6,h:.5});
  };
  const spec=f===0?[[14.2,-3.5,4.3,5.6],[-11.6,9.5,2.1,2.3]]:[[null,null,3.2+f*1.1,4+f*1.1],[null,null,2.2+.3*f,2.2+.3*f]];
  for(const [cx,cz,rx0,rz0] of spec){
    let l=null;
    if(cx!==null)l=mkLake(cx,cz,rx0,rz0);
    else for(let n=0,sc=1;n<120&&!l;n++){
      if(n%30===29)sc*=.85;
      const rx=rx0*sc,rz=rz0*sc,x=rand.range(-lim+rx*1.3+1,lim-rx*1.3-1),z=rand.range(-lim+rz*1.3+1,lim-rz*1.3-1);
      if(lakeOk(x,z,rx,rz))l=mkLake(x,z,rx,rz);
    }
    if(l)Fl.lakes.push(l);
  }
  for(const l of Fl.lakes){
    const g=V(.5),pos=[],edge=.9/Math.min(l.rx,l.rz);l.g=g;
    for(let x=l.cx-l.rx*1.4,ix=0;x<=l.cx+l.rx*1.4;x+=g,ix++)for(let z=l.cz-l.rz*1.4,iz=0;z<=l.cz+l.rz*1.4;z+=g,iz++){
      const p=l.rho(x,z);
      if(p<1)pos.push({x,z,p,ix,iz});
      else if(p<1+edge&&(f===0||hitAny({x,y:y0-.6,z,r:.05,h:.3})))dc(x,y0+.045,z,g*.94,.05,g*.94,T.sand[(ix+iz)&1]);   // bãi cát / tuyết quanh hồ
    }
    if(pos.length){
      const mesh=new THREE.InstancedMesh(UG,new THREE.MeshLambertMaterial({color:0xffffff,transparent:!T.ice,opacity:T.ice?1:.86,emissive:0x0a1a2a}),pos.length),col=new THREE.Color();
      pos.forEach((q,i)=>{const w=T.water;col.setHex(q.p<.45?w[2]:q.p<.75?w[0]:q.p<.93?w[1]:w[3]);if((q.ix+q.iz)&1)col.multiplyScalar(.93);mesh.setColorAt(i,col)});
      mesh.frustumCulled=false;S.add(mesh);l.mesh=mesh;l.tiles=pos;waveLake(l,0);
    }
    // đá cuội, lau sậy, lá súng ven và trên hồ
    const per=Math.round((l.rx+l.rz)*3.4*CFG.density);
    for(let i=0;i<per;i++){const [x,z]=l.at(rand()*6.283,1+rand.range(.04,.32)),sz=rand.range(.1,.26);
      if(f===0||hitAny({x,y:y0-.6,z,r:.05,h:.3}))dc(x,y0+sz*.4,z,sz,sz*.8,sz,T.rock[rand.int(0,2)])}
    for(let i=0,n=Math.round(per*.35);i<n;i++){const [cx,cz]=l.at(rand()*6.283,1+rand.range(-.05,.2));
      if(f&&!hitAny({x:cx,y:y0-.6,z:cz,r:.05,h:.3}))continue;
      for(let b=0,m=rand.int(3,5);b<m;b++){const x=cx+rand.range(-.25,.25),z=cz+rand.range(-.25,.25),h=rand.range(1,1.7);
        dc(x,y0+h/2,z,.045,h,.045,rand.pick(T.reed));if(rand()<.5)dc(x,y0+h-.12,z,.075,.24,.075,0x6b4a32)}}
    if(!T.ice)for(let i=0,n=Math.round(l.rx*l.rz*.35*CFG.density);i<n;i++){const [x,z]=l.at(rand()*6.283,rand.range(.1,.8)),r=rand.range(.22,.32);
      d.cyl(x,y0+.185,z,r,.03,rand.pick(T.pad),V(.075),'y');if(rand()<.4)dc(x,y0+.23,z,.09,.07,.09,rand()<.5?0xff9fbf:0xffffff)}
  }

  // 2) Tảng đá (kể cả vài tảng sát mép hồ)
  const putRock=(x,z,ok)=>{
    const q=rand();
    if(q<.62){const v=rand.pick(variants(f+'boulder',()=>boulder(T,rand))),sc=rand.range(.8,1.3),hh=v.half*sc;
      if(!ok&&!(ok=spot(hh+.2,hh)))return;
      if(ok===true)ok={x,z};
      inst(v.geo,ok.x,y0-.05,ok.z,sc,rand()*6.283,true);solidBox(ok.x,ok.z,hh,hh,Math.min(1.25,v.ch*sc));placed.push({x:ok.x,z:ok.z,r:hh*1.1})}
    else if(q<.8){const v=rand.pick(variants(f+'pillar',()=>pillar(T,rand))),hh=v.half,pt=spot(hh+.3,hh+.3);
      if(!pt)return;inst(v.geo,pt.x,y0-.05,pt.z,1,rand()*6.283,true);solidBox(pt.x,pt.z,hh,hh,v.ch-.1);placed.push({x:pt.x,z:pt.z,r:hh*1.2})}
    else{const v=rand.pick(variants(f+'pebbles',()=>pebbles(T,rand))),pt=spot(.5,.5);if(!pt)return;inst(v.geo,pt.x,y0,pt.z,rand.range(.9,1.4),rand()*6.283,false);placed.push({x:pt.x,z:pt.z,r:.4})}
  };
  for(let i=0,n=Math.round(T.rocks*k);i<n;i++)putRock();
  for(const l of Fl.lakes)for(let j=0;j<3;j++){   // đá to ngay bờ hồ
    const [x,z]=l.at(rand()*6.283,1.3+rand()*.15),v=rand.pick(variants(f+'boulder',()=>boulder(T,rand))),sc=rand.range(.8,1.2),hh=v.half*sc;
    if(okAt(x,z,hh+.1,hh)){inst(v.geo,x,y0-.05,z,sc,rand()*6.283,true);solidBox(x,z,hh,hh,Math.min(1.25,v.ch*sc));placed.push({x,z,r:hh*1.1})}
  }

  // 3) Cây
  for(let i=0,n=Math.round(T.trees*k);i<n;i++){
    const kind=rand.pick(T.kinds),v=rand.pick(variants(f+kind,()=>kind==='pine'?pineTree(T,rand):roundTree(T,rand,kind==='cherry'?T.leafB:T.leaf)));
    const sc=Math.min(rand.range(.85,1.3),8.3/v.h),pt=spot(v.crown*sc*.5,v.crown*sc*.7);if(!pt)continue;
    inst(v.geo,pt.x,y0-.05,pt.z,sc,rand()*6.283,true);
    solidBox(pt.x,pt.z,v.tr*sc*.85,v.tr*sc*.85,v.th*sc);   // chỉ thân cây có va chạm, tán lá đi xuyên được
    placed.push({x:pt.x,z:pt.z,r:v.crown*sc*.5});
    if(rand()<.65)patch(pt.x,pt.z,v.crown*sc*.7);
  }

  // 4) Bụi cây, khúc gỗ, gốc cây, nấm
  for(let i=0,n=Math.round(T.bushes*k);i<n;i++){
    const pal=rand()<.5?T.leaf:T.leafB,v=rand.pick(variants(f+'bush'+(pal===T.leaf?0:1),()=>bush(T,rand,pal))),pt=spot(.55,.6);if(!pt)continue;
    inst(v.geo,pt.x,y0-.03,pt.z,rand.range(.8,1.3),rand()*6.283,true);placed.push({x:pt.x,z:pt.z,r:.5});
  }
  for(let i=0,n=Math.round(T.logs*k);i<n;i++){
    const v=rand.pick(variants(f+'log',()=>logMesh(T,rand))),pt=spot(v.L/2,v.L/2);if(!pt)continue;
    const o=rand()<.5?0:Math.PI/2,hl=v.L/2*.92,hw=v.r*.9;
    inst(v.geo,pt.x,y0-.02,pt.z,1,o,true);solidBox(pt.x,pt.z,o?hw:hl,o?hl:hw,v.r*1.9);placed.push({x:pt.x,z:pt.z,r:v.L/2});
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
  const dm=d.mesh();dm.frustumCulled=false;S.add(dm);Fl.deco=dm;

  // 6) Bướm bay
  if(CFG.critters&&!T.ice)for(let i=0,n=3+f*2;i<n;i++){
    const cx=rand.range(-lim*.8,lim*.8),cz=rand.range(-lim*.8,lim*.8);
    if(hitAny({x:cx,y:y0+.02,z:cz,r:.5,h:1})||!sup(cx,cz,.5))continue;
    const b=butterfly(rand.pick([0xffd23f,0xff7fa8,0x7fbfff,0xffffff,0xc9a7ff]));
    Fl.crit.push({...b,cx,cz,rr:rand.range(1.2,2.8),sp:rand.range(.5,1),ph:rand()*6.283,by:y0});
  }
  return Fl;
}

// ---- Chạy: tầng 1 dựng ngay, 3 tầng còn lại dựng dần sau khi tải ----
const FL=[];
const act=f=>P.y>f*FH-6&&P.y<(f+1)*FH-3;   // tầng đang gần người chơi
function vis(){
  for(const Fl of FL){const a=act(Fl.f);
    for(const m of Fl.objs)m.visible=a&&Math.hypot(m.position.x-P.x,m.position.z-P.z)<CFG.viewDist;
    if(Fl.deco)Fl.deco.visible=a;
    for(const l of Fl.lakes)if(l.mesh)l.mesh.visible=a;
    for(const c of Fl.crit)c.g.visible=a;
  }
}
function lakeAt(x,y,z){for(const Fl of FL)for(const l of Fl.lakes)if(!l.ice&&Math.abs(y-l.y)<.35&&l.rho(x,z)<.96)return l;return null}
function splash(x,z,l,n){
  for(let i=0;i<n;i++){const m=new THREE.Mesh(UG,M(i&1?0x9fd8ff:0xffffff)),s=.04+Math.random()*.05;
    m.scale.set(s,s,s);m.position.set(x+(Math.random()-.5)*.5,l.y+.15,z+(Math.random()-.5)*.5);
    spawnPart(m,(Math.random()-.5)*2.5,1.5+Math.random()*2,(Math.random()-.5)*2.5,.5+Math.random()*.3,false,.02)}
}
// Lội nước thì đi chậm lại (bọc hàm move của physics.js, chỉ áp dụng cho người chơi)
const _mv=move;
move=function(e,dx,dy,dz){if(e===P&&lakeAt(e.x,e.y,e.z)){dx*=CFG.wade;dz*=CFG.wade}return _mv(e,dx,dy,dz)};

let last=performance.now(),tm=0,cl=0,wv=0,spl=0,inW=false,lx=0,lz=0;
function loop(now){
  requestAnimationFrame(loop);
  const dt=Math.min(.1,(now-last)/1000);last=now;tm+=dt;
  cl-=dt;if(cl<=0){cl=.2;vis()}
  wv-=dt;const doW=CFG.waves&&wv<=0;if(doW)wv=1/30;
  for(const Fl of FL){if(!act(Fl.f))continue;
    if(doW)for(const l of Fl.lakes)if(l.mesh&&!l.ice&&Math.hypot(l.cx-P.x,l.cz-P.z)<l.rx+50)waveLake(l,tm);
    for(const c of Fl.crit){const a=c.ph+tm*c.sp;
      c.g.position.set(c.cx+Math.cos(a)*c.rr,c.by+.6+Math.sin(tm*2+c.ph)*.25,c.cz+Math.sin(a*1.3)*c.rr*.8);
      c.g.rotation.y=Math.atan2(-Math.sin(a)*c.rr,Math.cos(a*1.3)*1.3*c.rr*.8);
      const w=Math.sin(tm*22+c.ph)*.9;c.wl.rotation.z=-w;c.wr.rotation.z=w}
  }
  if(playing){const l=lakeAt(P.x,P.y,P.z);
    if(l){if(!inW){inW=true;if(CFG.splash)splash(P.x,P.z,l,10);snd(260,.18,'sine',.05)}
      spl-=dt;if(CFG.splash&&spl<=0&&Math.hypot(P.x-lx,P.z-lz)>dt*1.5){spl=.13;splash(P.x,P.z,l,4)}}
    else inW=false}
  lx=P.x;lz=P.z;
}
FL.push(buildFloor(0));vis();
for(let f=1;f<NF;f++)setTimeout(()=>{FL.push(buildFloor(f));vis()},400*f);
requestAnimationFrame(loop);
window.Nature={cfg:CFG,floors:FL};
})();
