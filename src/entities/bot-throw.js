// Bot ném đá: bot tự đi tìm đá ở thảm thực vật (đá vụn, tảng đá, bụi cây), QUỲ XUỐNG nhặt, đứng dậy, ngắm, rồi VƯƠN TAY ném vào người chơi.
// Nguồn đá do nature.js đăng ký (Nature.stones(tầng)). Nạp SAU floor-manager.js (dùng sight(), steer(), crossesWater()).
// 3 phần: botRock() = máy trạng thái (gọi từ main.js qua botBrain) · rockPose() = tư thế thân/chân/tay · tickRocks() = viên đá bay + sát thương.
// Chỉnh nhanh ở ROCK bên dưới.
const ROCK={
  dmg:9,          // sát thương mỗi viên trúng người chơi
  speed:16,       // tốc độ bay ước lượng (m/s): xa hơn thì bay lâu hơn
  grav:18,        // trọng lực của viên đá
  rmin:6,rmax:26, // chỉ ném khi người chơi cách bot trong khoảng này (m)
  find:14,        // bán kính bot đi tìm đá (m)
  regrow:30,      // giây để 1 nguồn đá mọc lại 1 viên
  throwers:.65,   // tỉ lệ bot biết ném đá (còn lại chỉ xông vào như cũ)
  cdMin:2.5,cdMax:6   // nghỉ giữa 2 lần ném (giây)
};
const ROCKC=[0x9a9ca8,0xb0b2bd,0x80828e];
const ROCKG=(()=>{const v=new VB();
  v.ell(0,0,0,.09,.07,.085,(i,j,k)=>ROCKC[(i+j*2+k)%3],.028);
  v.ell(.05,.03,.02,.05,.045,.05,(i,j,k)=>ROCKC[(i*2+j+k)%3],.028);
  return v.mesh().geometry})();
const rocks=[];let RFR=0,RTM=0,rpx=0,rpz=0,rvx=0,rvz=0;
const eio=x=>x*x*(3-2*x),lerp=(a,b,u)=>a+(b-a)*u,cl01=x=>x<0?0:x>1?1:x;

// viên đá cầm trên tay phải của bot
function holdRock(b,Q,on){
  if(!Q.rm){Q.rm=new THREE.Mesh(ROCKG,VMAT);Q.rm.frustumCulled=false;Q.rm.position.set(0,-.68,.07);b.aR.add(Q.rm)}
  Q.rm.visible=on;
}
// tìm nguồn đá gần nhất còn đá, không bị sông chắn, không sát người chơi, không trùng con bot khác đang đi tới
function findStone(b){
  const NA=window.Nature;if(!NA||!NA.stones)return null;
  let best=null,bd=ROCK.find;
  for(const s of NA.stones(curFl)){
    if(s.n<=0)continue;if(s.by&&s.by!==b&&RTM-s.byT<6)continue;
    const dd=Math.hypot(s.x-b.x,s.z-b.z);
    if(dd>=bd||Math.hypot(s.x-P.x,s.z-P.z)<4)continue;
    if(crossesWater(b.x,b.z,s.x,s.z))continue;
    best=s;bd=dd}
  if(best){best.by=b;best.byT=RTM}
  return best;
}
function dust(x,y,z){   // bụi bay lên khi bàn tay vục xuống đất
  for(let i=0;i<8;i++){const m=new THREE.Mesh(UG,M(i%2?0xd8c7a0:0xb9d99a)),sz=.05+Math.random()*.05;
    m.scale.set(sz,sz,sz);m.position.set(x+(Math.random()-.5)*.3,y+.05,z+(Math.random()-.5)*.3);
    spawnPart(m,(Math.random()-.5)*1.6,1+Math.random()*1.6,(Math.random()-.5)*1.6,.45+Math.random()*.3,false,.02)}
}
function rockBurst(x,y,z){   // đá vỡ thành mảnh khi đập vào tường / đất / người
  for(let i=0;i<7;i++){const m=new THREE.Mesh(UG,M(ROCKC[i%3])),sz=.04+Math.random()*.05;
    m.scale.set(sz,sz,sz);m.position.set(x,y,z);
    spawnPart(m,(Math.random()-.5)*5,1.5+Math.random()*3,(Math.random()-.5)*5,.5+Math.random()*.4,true)}
}
// thả đá: nhắm vào người chơi có dự đoán hướng chạy + hơi lệch ngẫu nhiên, bay theo đường vòng cung
function rkRelease(b,Q){
  Q.has=false;holdRock(b,Q,false);
  const ry=b.ry||0,ox=b.x+Math.sin(ry)*.45,oy=b.y+1.75,oz=b.z+Math.cos(ry)*.45;
  const dist=Math.hypot(P.x-ox,P.z-oz),T0=Math.max(.45,Math.min(1.4,dist/ROCK.speed));
  const tx=P.x+rvx*T0*.7+(Math.random()-.5)*1.4,ty=P.y+1.0+(Math.random()-.5)*.6,tz=P.z+rvz*T0*.7+(Math.random()-.5)*1.4;
  const vx=(tx-ox)/T0,vz=(tz-oz)/T0,vy=(ty-oy+.5*ROCK.grav*T0*T0)/T0;
  const m=new THREE.Mesh(ROCKG,VMAT);m.scale.setScalar(1.35);m.frustumCulled=false;m.position.set(ox,oy,oz);S.add(m);
  rocks.push({m,x:ox,y:oy,z:oz,vx,vy,vz,t:4});
  snd(520,.14,'sawtooth',.04*GV,{x:ox,y:oy,z:oz});   // tiếng vút
}
const rkStill=(b,dt)=>{move(b,0,b.vy*dt,0);return 0};   // đứng yên nhưng vẫn áp trọng lực (main.js đã trừ b.vy)
const faceSrc=(b,s)=>{b.hd=Math.atan2(s.x-b.x,s.z-b.z);b.hdUse=1};

// ---------------- MÁY TRẠNG THÁI ----------------
// 0 rảnh · 1 đi tới chỗ đá · 2 quỳ xuống · 3 vục tay nhặt · 5 đứng dậy · 4 ngắm · 6 lấy đà · 7 vươn tay ném · 8 thu tay về
// Trả về mv (như botAI) nếu bot đang bận thao tác, hoặc null để main.js chạy AI xông vào như bình thường.
function botRock(b,dt,dx,dz,d){
  const old=b.rk;let Q=old;
  if(!Q||Q.tok!==b.tTok){   // bot mới sinh / tái sinh -> làm lại từ đầu
    if(old&&old.rm)old.rm.visible=false;
    Q=b.rk={tok:b.tTok,st:0,t:0,cd:1.5+Math.random()*4,has:false,th:Math.random()<ROCK.throwers,src:null,got:false,rel:false,rm:old?old.rm:null,f:0,c:0,lean:0,step:0,ar:null,al:null}}
  Q.f=RFR;Q.c=0;Q.lean=0;Q.step=0;Q.ar=Q.has?-.55:null;Q.al=null;   // tư thế mặc định mỗi khung: đang có đá thì tay phải co lại cầm đá
  if(!Q.th||dead)return null;
  const s=Q.src;
  switch(Q.st){
  case 0:{Q.cd-=dt;
    if(Q.cd<=0&&Math.abs(P.y-b.y)<3){
      if(d>ROCK.rmin&&d<ROCK.rmax){
        if(Q.has){if(sight(b)){Q.st=4;Q.t=0}else Q.cd=.7}   // có đá + thấy người chơi -> ngắm
        else{const n=findStone(b);if(n){Q.src=n;Q.st=1;Q.t=0}else Q.cd=2+Math.random()*2}
      }else Q.cd=.5}
    return null}
  case 1:{Q.t+=dt;   // đi tới chỗ đá (bỏ cuộc nếu quá lâu / người chơi áp sát / hết đá)
    if(s.n<=0||Q.t>8||d<4.5){Q.st=0;Q.cd=1;Q.src=null;return null}
    const ex=s.x-b.x,ez=s.z-b.z;
    if(Math.hypot(ex,ez)<s.r+.55){Q.st=2;Q.t=0;return rkStill(b,dt)}
    faceSrc(b,s);steer(b,s.x,s.z,3.4,dt);return 1.3}
  case 2:{Q.t+=dt;faceSrc(b,s);   // QUỲ XUỐNG: hạ thấp người, gập gối, cúi về phía trước, tay phải thò xuống
    const u=cl01(Q.t/.35);Q.c=eio(u);Q.ar=-.35*u;Q.al=-.8*Q.c;
    if(u>=1){Q.st=3;Q.t=0;Q.got=false}
    return rkStill(b,dt)}
  case 3:{Q.t+=dt;faceSrc(b,s);Q.c=1;Q.ar=-.35;Q.al=-.8;   // chạm đất, vục tay bốc viên đá lên
    if(!Q.got&&Q.t>=.3){Q.got=true;
      if(s.n>0){s.n--;s.t=0;Q.has=true;holdRock(b,Q,true);dust(b.x+Math.sin(b.hd)*.7,b.y,b.z+Math.cos(b.hd)*.7);snd(170,.09,'triangle',.05*GV,b.g.position)}}
    if(Q.t>=.55){Q.st=5;Q.t=0}
    return rkStill(b,dt)}
  case 5:{Q.t+=dt;   // đứng dậy, nâng viên đá lên ngang ngực
    const u=cl01(Q.t/.4);Q.c=1-eio(u);Q.ar=lerp(-.35,-.55,u);Q.al=-.8*Q.c;
    if(u>=1){Q.st=0;Q.cd=.3+Math.random()*.6;Q.src=null}
    return rkStill(b,dt)}
  case 4:{Q.t+=dt;   // đứng vững, nhìn thẳng người chơi, tay trái chĩa ra làm chuẩn
    Q.ar=-.55;Q.al=-.9*eio(cl01(Q.t/.3));
    if(Q.t>=.35){Q.st=6;Q.t=0}
    return rkStill(b,dt)}
  case 6:{Q.t+=dt;   // LẤY ĐÀ: tay phải vung ra sau lên cao, người ngả ra sau
    const u=cl01(Q.t/.4),e=eio(u);Q.ar=lerp(-.55,2.3,e);Q.lean=-.25*e;Q.al=lerp(-.9,-1.15,e);
    if(u>=1){Q.st=7;Q.t=0;Q.rel=false}
    return rkStill(b,dt)}
  case 7:{Q.t+=dt;   // VƯƠN TAY NÉM: tay quét từ sau đầu qua đỉnh ra phía trước, bước chân trước, người chúi tới; thả đá ở ~55% động tác
    const u=cl01(Q.t/.22),e=eio(u);Q.ar=lerp(2.3,4.5,e);Q.lean=lerp(-.25,.4,e);Q.step=e;Q.al=lerp(-1.15,.4,e);
    if(u>=.55&&!Q.rel){Q.rel=true;rkRelease(b,Q)}
    if(u>=1){Q.st=8;Q.t=0}
    return rkStill(b,dt)}
  case 8:{Q.t+=dt;   // quán tính: tay vung xuống, thẳng người lại
    const u=cl01(Q.t/.5),e=eio(u);Q.ar=lerp(4.5,6.283,e);Q.lean=lerp(.4,0,e);Q.step=1-e;Q.al=lerp(.4,0,e);
    if(u>=1){Q.st=0;Q.cd=ROCK.cdMin+Math.random()*(ROCK.cdMax-ROCK.cdMin)}
    return rkStill(b,dt)}
  }
  return null;
}
// main.js gọi thay cho botAI: bot đang bận nhặt/ném thì làm việc đó, còn lại chạy AI cũ
function botBrain(b,dt,dx,dz,d){const r=botRock(b,dt,dx,dz,d);return r===null?botAI(b,dt,dx,dz,d):r}

// Áp tư thế lên mô hình (gọi trong main.js SAU khi đã đặt vị trí + xoay bot, nên ghi đè được chân/tay đang vung đi bộ)
function rockPose(b){
  const Q=b.rk;if(!Q)return;
  if(Q.f!==RFR){   // botRock không chạy khung này (bot đang cận chiến...) -> bỏ dở thao tác
    Q.c=Q.lean=Q.step=0;Q.ar=Q.al=null;if(Q.st!==0){Q.st=0;Q.cd=2;Q.src=null}}
  const c=Q.c,ln=Q.lean,sp=Q.step,g=b.g;
  if(c||ln||sp||g.rotation.x){g.rotation.order='YXZ';g.position.y-=.5*c;g.rotation.x=ln+.55*c}   // YXZ: xoay theo hướng nhìn rồi mới nghiêng người
  if(c||sp){b.lL.rotation.x=-1.45*c-.6*sp;b.lR.rotation.x=1.25*c+.35*sp}                       // quỳ: 1 chân duỗi trước, 1 chân gập sau · ném: bước chân trước
  if(Q.ar!==null)b.aR.rotation.x=Q.ar;
  if(Q.al!==null)b.aL.rotation.x=Q.al;
}

// ---------------- VIÊN ĐÁ BAY ----------------
function tickRocks(dt){
  RFR++;RTM+=dt;
  if(dt>0){const k=Math.min(1,dt*6);   // vận tốc người chơi (để bot đón đầu)
    rvx+=((P.x-rpx)/dt-rvx)*k;rvz+=((P.z-rpz)/dt-rvz)*k;rvx=Math.max(-8,Math.min(8,rvx));rvz=Math.max(-8,Math.min(8,rvz))}
  rpx=P.x;rpz=P.z;
  const NA=window.Nature;
  if(NA&&NA.stones)for(const s of NA.stones(curFl))if(s.n<s.max){s.t+=dt;if(s.t>ROCK.regrow){s.n++;s.t=0}}   // đá mọc lại dần
  for(let i=rocks.length-1;i>=0;i--){
    const p=rocks[i];p.t-=dt;let end=false;
    for(let k=0;k<3&&!end;k++){
      const s=dt/3;p.vy-=ROCK.grav*s;p.x+=p.vx*s;p.y+=p.vy*s;p.z+=p.vz*s;
      if(!dead&&Math.hypot(P.x-p.x,P.z-p.z)<P.r+.24&&p.y>P.y-.05&&p.y<P.y+P.h+.1){   // TRÚNG NGƯỜI CHƠI
        hurt(ROCK.dmg);quake({x:p.x,y:p.y,z:p.z},.18);snd(130,.14,'square',.08*GV);rockBurst(p.x,p.y,p.z);end=true}
      else if(NA&&NA.isWater&&p.y<curFl*FH+.1&&NA.isWater(curFl,p.x,p.z,0)){NA.bulletSplash(p.x,p.y,p.z);end=true}   // rơi xuống sông
      else{
        const lg=lakeGround(p.x,p.z,p.y),gy=Math.max(curFl*FH,lg===null?-1e9:lg);
        if(p.y<=gy+.06||hitAny({x:p.x,y:p.y-.1,z:p.z,r:.1,h:.2})){rockBurst(p.x,Math.max(p.y,gy+.06),p.z);snd(200,.07,'triangle',.05*GV,p);end=true}}
    }
    if(end||p.t<=0){S.remove(p.m);rocks.splice(i,1)}
    else{p.m.position.set(p.x,p.y,p.z);p.m.rotation.x+=dt*9;p.m.rotation.z+=dt*6}
  }
}
// chơi lại: xóa đá đang bay, bot bỏ đá đang cầm, nguồn đá đầy lại
function clearRocks(){
  for(const p of rocks)S.remove(p.m);rocks.length=0;
  for(const b of bots)if(b.rk){if(b.rk.rm)b.rk.rm.visible=false;b.rk=null}
  const NA=window.Nature;
  if(NA&&NA.stones)for(let f=0;f<NF;f++)for(const s of NA.stones(f)){s.n=s.max;s.t=0;s.by=null}
}
