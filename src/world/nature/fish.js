// ============================================================================
// nature/fish.js - Cá bơi và cá nhảy khỏi mặt nước.
// (Tách ra từ nature.js cũ. Chia sẻ với các file nature/ khác qua NK = window.NatureKit.)
// ============================================================================
(function(){
const NK=window.NatureKit=window.NatureKit||{};
const {CLK}=NK;   // từ nature/kit.js
const {clamp01,ck,CELL,CFG}=NK;   // từ nature/kit.js
const {lakeH}=NK;   // từ nature/lake.js
const {splash,ripple}=NK;   // từ nature/fx.js


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

const fishOK=(Fl,l,x,z)=>Fl.cells.get(ck(Math.floor(x/CELL),Math.floor(z/CELL)))===l&&lakeH(l,x,z)-CFG.level>=.6;
   // chỉ bơi ở chỗ nước sâu >= .6m
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
    q.g.position.set(q.x,q.y+Math.sin(CLK.tm*1.5+q.ph)*.03,q.z);
    q.g.rotation.y=-q.th;q.g.rotation.z=Math.max(-.35,Math.min(.35,(ty-q.y)*.9));
    q.tp.rotation.y=Math.sin(CLK.tm*(4+spd*3)+q.ph)*(.28+.1*spd);
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
  q.tp.rotation.y=Math.sin(CLK.tm*26+q.ph)*.5;                                                   // quẫy đuôi mạnh
}

Object.assign(NK,{fishGeos,fishOK,makeFish,tickFish});
})();
