// LÍNH BẮN CUNG trên Vạn Lý Trường Thành (tầng 2).
// - Đứng yên trên mặt tường (vị trí lấy từ GreatWall.prep(): cách đều dọc sống tường, né tháp canh), quay mặt về phía người chơi, giương cung rồi bắn mũi tên bay theo đường cong.
// - Là "bot" thường (cờ b.arch): bắn trúng / lựu đạn / đồng minh đều hạ được, vỡ mảnh như bot khác. Nhưng KHÔNG đi lại, KHÔNG nằm trong bộ sinh quái (spawner.js) và không bị
//   "quái thường chết hết" khi hạ boss. Hạ xong sẽ có lính khác lên thế chỗ sau CFG.respawn giây (nếu người chơi đứng xa).
// - Chỉ hoạt động khi người chơi ở tầng 2 và tầng 2 đã dựng xong; rời tầng thì ẩn hết.
// Chỉnh nhanh ở CFG. Nạp SAU boss.js / ally.js (cần sight, mkBot, hurt, snd).
const Archer=(function(){
  const CFG={
    n:9,            // số lính tối đa trên tường
    gap:19,         // khoảng cách tối thiểu giữa 2 lính (m)
    hp:70,          // máu (bot thường 100)
    range:62,       // tầm bắn ngang (m)
    cd:[2.4,3.8],   // giây giữa 2 phát bắn (ngẫu nhiên trong khoảng)
    draw:.75,       // giây giương cung trước khi thả tên (người chơi kịp thấy mà né)
    speed:32,       // tốc độ mũi tên (m/s)
    g:14,           // trọng lực mũi tên (m/s²)
    dmg:13,         // sát thương mỗi mũi tên
    spread:1.1,     // độ lệch ngẫu nhiên mỗi 30m (m)
    respawn:45,     // giây để có lính mới thay lính bị hạ
    show:110        // chỉ vẽ / tính lính trong bán kính này quanh người chơi (m): nhẹ máy
  };
  const list=[],arrows=[];let placed=false,on=false;
  const AG=new THREE.BoxGeometry(.045,.045,1.0),AM=new THREE.MeshBasicMaterial({color:0xe8c88a}),AT=new THREE.BoxGeometry(.1,.1,.18),ATM=new THREE.MeshBasicMaterial({color:0xcfd6df});
  const HAT=new VB(),BOW=new VB(),QV=new VB();
  // nón lá + bàn tay cầm cung + ống tên (dựng 1 lần, các lính dùng chung geometry)
  const W1=tri(0x8a5a2b,0x7a4d24,0x9a6a38),RD=tri(0xb3262e,0x9a1f27,0xc23039);
  HAT.cyl(0,1.93,0,.44,.06,0xc9a45a,.03,'y');HAT.cyl(0,2.0,0,.3,.08,0xd8b46a,.03,'y');HAT.cyl(0,2.07,0,.14,.07,RD,.03,'y');
  BOW.box(0,-.66,0,.05,.07,.5,W1,.03);BOW.box(0,-.6,.34,.05,.07,.3,W1,.03);BOW.box(0,-.6,-.34,.05,.07,.3,W1,.03);
  BOW.box(0,-.54,.52,.05,.07,.12,W1,.03);BOW.box(0,-.54,-.52,.05,.07,.12,W1,.03);BOW.box(0,-.52,0,.012,.012,1.0,0xeeeeee,.01);
  QV.box(0,1.12,-.42,.16,.54,.16,tri(0x6b4a2e,0x5b3f27,0x7a5636),.04);QV.box(0,1.46,-.42,.1,.1,.1,0xffffff,.03);QV.box(0,1.5,-.45,.04,.1,.04,RD,.02);
  function dress(b){
    const h=HAT.mesh(),q=QV.mesh(),w=BOW.mesh();b.g.add(h);b.g.add(q);b.aL.add(w);   // không đưa vào botMeshes: đạn xuyên qua đồ trang bị
    b.hat=h;b.qv=q;b.bow=w;
  }
  function make(){
    const b=mkBot();   // mkBot tự thêm vào bots + botMeshes (dùng chung geometry nên nhẹ)
    b.arch=true;b.talker=false;b.maxhp=CFG.hp;b.hp=CFG.hp;b.on=false;b.g.visible=false;b.cd=1+Math.random()*2;b.dr=0;b.dd=undefined;b.ry=undefined;b.boss=false;
    dress(b);return b;
  }
  // tìm mặt tường dưới chân (quét từ trên xuống), phòng khi công thức độ cao lệch vài chục cm
  function surf(x,z,y0){
    for(let y=y0+1.6;y>y0-1.6;y-=.1)if(hit({x,y,z,r:.15,h:.05}).length)return y+.02;
    return y0;
  }
  function place(){
    const P=GreatWall.prep(),Y0=FY(1),cand=[],sp=[];
    // lấy mẫu dày dọc sống tường (6m một điểm), bỏ điểm sát tháp canh; rồi chọn dần các điểm cách nhau >= CFG.gap
    P.BR.forEach((B,bi)=>{
      for(let s=8,k=0;s<B.len-8;s+=6,k++){
        const i=Math.min(B.n-2,Math.round(s/B.step)),p=B.pts[i],a=B.pts[Math.max(0,i-1)],c=B.pts[i+1];
        if(P.towers.some(t=>Math.hypot(t.cx-p[0],t.cz-p[1])<GW_TW+5))continue;
        const l=Math.hypot(c[0]-a[0],c[1]-a[1])||1,nx=-(c[1]-a[1])/l,nz=(c[0]-a[0])/l,side=(k&1?1:-1)*1.9,x=p[0]+nx*side,z=p[1]+nz*side;
        cand.push({x,z,y:surf(x,z,Y0+B.R[i]+GreatWall.cfg.WH),r:((i*7919+bi*104729)%1000)/1000});
      }
    });
    cand.sort((u,v)=>u.r-v.r);   // thứ tự ngẫu nhiên nhưng cố định
    for(const q of cand){if(sp.length>=CFG.n)break;if(sp.every(o=>Math.hypot(o.x-q.x,o.z-q.z)>=CFG.gap))sp.push(q)}
    while(list.length<sp.length)list.push(make());
    sp.forEach((q,i)=>{const b=list[i];b.x=q.x;b.y=q.y;b.z=q.z;b.hp=CFG.hp;b.dd=undefined;b.vy=0;b.g.position.set(q.x,q.y,q.z)});
    list.length=sp.length;placed=true;
  }
  const GW_TW=12/2;
  function show(v){for(const b of list){b.on=v&&b.hp>0;b.g.visible=b.on}}
  function clearArrows(){for(const a of arrows)S.remove(a.m);arrows.length=0}
  function fire(b,dx,dz,d){
    const mx=b.x+Math.sin(b.ry||0)*.55,my=b.y+1.55,mz=b.z+Math.cos(b.ry||0)*.55,
      sp=CFG.spread*(d/30),tx=P.x+(Math.random()-.5)*sp,ty=P.y+1.0+(Math.random()-.5)*sp*.5,tz=P.z+(Math.random()-.5)*sp,
      ex=tx-mx,ey=ty-my,ez=tz-mz,D=Math.hypot(ex,ey,ez),T=Math.max(.15,D/CFG.speed);
    const m=new THREE.Group(),sh=new THREE.Mesh(AG,AM),tip=new THREE.Mesh(AT,ATM);tip.position.z=.52;m.add(sh);m.add(tip);m.position.set(mx,my,mz);S.add(m);
    arrows.push({m,x:mx,y:my,z:mz,vx:ex/T,vy:(ey+.5*CFG.g*T*T)/T,vz:ez/T,life:T+1.5});
    snd(190+Math.random()*50,.14,'triangle',.06*GV,m.position);
  }
  function tickArrows(dt){
    for(let i=arrows.length-1;i>=0;i--){
      const a=arrows[i];let gone=false;a.life-=dt;
      const n=Math.max(1,Math.ceil(CFG.speed*dt/.3)),s=dt/n;
      for(let k=0;k<n&&!gone;k++){
        a.vy-=CFG.g*s;a.x+=a.vx*s;a.y+=a.vy*s;a.z+=a.vz*s;
        const gy=FY(1)+(window.Nature&&Nature.heightAt?Nature.heightAt(1,a.x,a.z):0);
        if(a.y<gy||hitAny({x:a.x,y:a.y-.03,z:a.z,r:.04,h:.06}))gone=true;
        else if(!dead&&Math.hypot(P.x-a.x,P.z-a.z)<P.r+.2&&a.y>P.y&&a.y<P.y+P.h){hurt(CFG.dmg);gone=true;snd(120,.1,'square',.05*GV)}
      }
      if(gone||a.life<=0){S.remove(a.m);arrows.splice(i,1)}
      else{a.m.position.set(a.x,a.y,a.z);a.m.lookAt(a.x+a.vx,a.y+a.vy,a.z+a.vz)}
    }
  }
  function tick(dt){
    const act=curFl===1&&window.FM&&FM.has(1);
    if(!act){if(on){on=false;show(false);clearArrows()}return}
    if(!placed)place();
    if(!on){on=true;for(const b of list)if(b.dd===undefined&&b.hp>0){b.cd=1+Math.random()*2;b.dr=0}}
    for(const b of list){
      const dx=P.x-b.x,dz=P.z-b.z,d=Math.hypot(dx,dz);
      if(b.hp<=0){   // bị hạ: chờ lính thay (chỉ khi người chơi đứng xa để không "hiện hình" trước mặt)
        b.on=false;b.g.visible=false;if(b.dd===undefined)b.dd=CFG.respawn;
        if((b.dd-=dt)<=0&&d>40){b.hp=CFG.hp;b.dd=undefined;b.cd=2;b.dr=0}
        continue;
      }
      if(d>CFG.show){b.on=false;b.g.visible=false;continue}
      b.on=true;b.g.visible=true;
      // người chơi không được đi xuyên lính (đẩy ra qua move() nên không bị đẩy vào tường)
      if(!dead&&d<P.r+b.r&&Math.abs(P.y-b.y)<1.6){const o=P.r+b.r-d+.01,ux=d>1e-3?dx/d:1,uz=d>1e-3?dz/d:0,g0=P.ground;move(P,ux*o,0,uz*o);P.ground=g0}
      // quay mặt về phía người chơi
      const ty=Math.atan2(dx,dz);if(b.ry===undefined)b.ry=ty;let da=ty-b.ry;da=Math.atan2(Math.sin(da),Math.cos(da));b.ry+=da*Math.min(1,dt*6);b.g.rotation.y=b.ry;b.g.position.set(b.x,b.y,b.z);
      const dyp=P.y-b.y,aim=!dead&&d<CFG.range&&dyp>-26&&dyp<22;
      b.cd-=dt;
      if(b.dr>0){   // đang giương cung
        b.dr-=dt;if(b.dr<=0){b.dr=0;if(aim&&sight(b))fire(b,dx,dz,d);b.cd=CFG.cd[0]+Math.random()*(CFG.cd[1]-CFG.cd[0])}
      }else if(aim&&b.cd<=0&&sight(b))b.dr=CFG.draw;
      // tư thế: tay trái cầm cung giơ ngang, tay phải kéo dây khi giương
      const pull=b.dr>0?1-b.dr/CFG.draw:0;
      b.aL.rotation.x=-1.5;b.aR.rotation.x=-1.25-pull*.15;b.aR.rotation.y=-.5*pull;
      b.lL.rotation.x=b.lR.rotation.x=0;
    }
    tickArrows(dt);
  }
  function reset(){clearArrows();for(const b of list){b.hp=CFG.hp;b.dd=undefined;b.dr=0}on=false;show(false)}
  return {tick,reset,cfg:CFG,list};
})();
