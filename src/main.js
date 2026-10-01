// Vòng lặp chính, nhận sát thương, chơi lại
let deadT=0,stepD=0,pg=true;   // deadT: 0->1 hoạt ảnh ngã xuống khi hết máu
function hurt(n){P.hp=Math.max(0,P.hp-n);$('hurt').style.opacity=.9;setTimeout(()=>$('hurt').style.opacity=0,120);
  if(P.hp<=0&&!dead){dead=true;playing=false;md=false;deadT=0;thudSnd();if(document.exitPointerLock)document.exitPointerLock();
    ovState='dead';renderOv();setTimeout(()=>{if(dead)$('ov').style.display='flex'},1400)}}   // chờ nhân vật ngã xong mới hiện bảng thua
function restart(){P.x=0;P.z=16*MAPK;P.y=0;P.vy=0;P.hp=100;ammos={pistol:12,rifle:30,sniper:5};reserve={...RES0};gren=3;gcd=0;throwT=0;holding=false;autoP=false;rel=0;kills=0;for(const p of pickups)S.remove(p.g);pickups.length=0;for(const g of grenades)S.remove(g.m);grenades.length=0;clearRocks();clearAllies();$('k').textContent=0;dead=false;bots.forEach(spawnBot);resetLevel()}
let last=performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(playing){
    cd-=dt;slideCd-=dt;gcd-=dt;tickThrow(dt);tickG(dt);tickRocks(dt);tickPickups(dt);
    if(rel>0){rel-=dt;if(rel<=0){const n=Math.min(W[cur].mag-ammos[cur],reserve[cur]);ammos[cur]+=n;reserve[cur]-=n}}
    // move
    const fw=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)-joy.y;
    const st=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+joy.x;
    let wx=-Math.sin(yaw)*fw+Math.cos(yaw)*st,wz=-Math.cos(yaw)*fw-Math.sin(yaw)*st;
    const wl=Math.hypot(wx,wz);if(wl>0){wx/=wl;wz/=wl}
    if((keys.ShiftLeft||keys.ShiftRight)&&P.ground&&!P.sw&&slideT<=0&&slideCd<=0&&wl>0){slideT=.7;sd={x:wx,z:wz};slideCd=1.1;snd(140,.3,'sawtooth',.04)}
    if(P.sw)slideT=0;   // đang bơi thì không trượt (Shift = lặn, Space = trồi lên; xem nature.js)
    let vx,vz;
    if(slideT>0){slideT-=dt;const s=3+9*(slideT/.7);vx=sd.x*s;vz=sd.z*s;P.h=1.0}
    else{vx=wx*6;vz=wz*6;P.h=P.sw?1.3:1.7}
    if(keys.Space&&P.ground&&!P.sw){P.vy=8;P.ground=false;snd(260,.12,'sine')}
    P.vy-=22*dt;
    const px0=P.x,pz0=P.z,vy0=P.vy;
    move(P,vx*dt,P.vy*dt,vz*dt);
    // tiếng bước chân theo quãng đường thực đi (lội nước thì tiếng bì bõm); rơi xuống đất có tiếng thịch
    {const wd=window.Nature&&Nature.wading;
      if(P.ground&&slideT<=0){stepD+=Math.hypot(P.x-px0,P.z-pz0);if(stepD>=(wd?1.4:1.9)){stepD=0;if(wd)wadeSnd();else stepSnd()}}
      else if(!P.ground)stepD=0;
      if(P.ground&&!pg&&vy0<-6&&!wd)stepSnd();
      pg=P.ground}
    eye+=((P.h-.1)-eye)*Math.min(1,dt*14);
    if(md&&W[cur].auto)shoot();
    // bots
    for(const b of bots){
      if(b.ally)continue;      // đồng minh do ally.js điều khiển
      if(!b.on){b.g.visible=false;continue}
      if(b.hp>0&&(b.y<curFl*FH-4||b.y>curFl*FH+5)){spawnBot(b);continue}
      if(b.hp<=0)continue;      // bot chết được tái sử dụng bởi bộ sinh quái (tickSpawn)
      const dx=P.x-b.x,dz=P.z-b.z,d=Math.hypot(dx,dz);let mv=0;
      // người chơi không được đi xuyên quái: đẩy ra qua move() nên không bị đẩy vào tường
      if(!dead&&d<P.r+b.r&&Math.abs(P.y-b.y)<1.6){const o=P.r+b.r-d+.01,ux=d>1e-3?dx/d:1,uz=d>1e-3?dz/d:0,g0=P.ground;move(P,ux*o,0,uz*o);P.ground=g0}
      b.hdUse=0;if(b.boss)mv=bossAI(b,dt,dx,dz,d);else if(d>1.4){b.vy-=22*dt;mv=botBrain(b,dt,dx,dz,d)}
      else if(!dead&&Math.abs(P.y-b.y)<1.5)hurt(28*dt);
      b.mv+=(mv-b.mv)*Math.min(1,dt*8);{const s0=Math.sin(b.t);b.t+=dt*11*b.mv;if(b.mv>.5&&s0*Math.sin(b.t)<0&&d<14){if(b.sw)snd(280+Math.random()*140,.14,'sine',.05,b.g.position);else botStepSnd(b.g.position,b.boss)}}
      const sw=Math.sin(b.t)*.95*b.mv;b.lL.rotation.x=sw;b.lR.rotation.x=-sw;b.aL.rotation.x=-sw*.8;b.aR.rotation.x=sw*.8;
      b.g.position.set(b.x,b.y+Math.abs(Math.sin(b.t))*.07*b.mv,b.z);{const ty=b.hdUse?b.hd:Math.atan2(dx,dz);if(b.ry===undefined)b.ry=ty;let da=ty-b.ry;da=Math.atan2(Math.sin(da),Math.cos(da));b.ry+=da*Math.min(1,dt*10);b.g.rotation.y=b.ry}   // quay mượt: gần thì nhìn người chơi, xa / đi cầu thì nhìn theo hướng đi
      if(b.rk)rockPose(b);if(b.boss)bossPose(b);
    }
    tickAllies(dt);
    // fx
    if(fx>0){fx-=dt;if(fx<=0){tracer.visible=false;spark.visible=false;flash.visible=false}}
    const spd=Math.hypot(vx,vz),k=Math.min(1,dt*16);bt+=dt*spd*1.6;
    vm.position.z-=vm.position.z*k;vm.rotation.x-=vm.rotation.x*k;
    vm.position.y+=((P.ground&&slideT<=0?Math.sin(bt)*.014*Math.min(1,spd/6):0)-vm.position.y)*Math.min(1,dt*10);
    animVM(dt);
  }
  tickBoss(dt);tickParts(dt);drawMap();if(!playing)scoped=false;
  const sc=scoped&&cur==='sniper'&&rel<=0;document.body.classList.toggle('sc',sc);vm.visible=!sc&&!dead;
  const tf=sc?20:75;if(Math.abs(C.fov-tf)>.1){C.fov+=(tf-C.fov)*Math.min(1,dt*16);C.updateProjectionMatrix()}
  if(dead)deadT=Math.min(1,deadT+dt*1.5);else deadT=0;
  const de=deadT*deadT*(3-2*deadT);   // ngã: mắt tụt xuống sát đất, đầu chúi xuống, góc nhìn nghiêng gần 90 độ
  C.position.set(P.x+Math.cos(yaw)*.5*de,P.y+eye+(.3-eye)*de,P.z-Math.sin(yaw)*.5*de);C.rotation.set(pitch*(1-de)-.25*de,yaw,-1.5*de);applyShake(dt);C.updateMatrixWorld();tickSky(dt);listen();placeBubble();OC.tick(dt);
  $('hp').style.width=P.hp+'%';const gr=cur==='grenade';$('am').textContent=gr?gren:rel>0?'…':ammos[cur];$('mg').textContent=gr?GMAX:reserve[cur];$('gn').textContent=gren;
  {const bg=S.background;   // lượt 1: thế giới · lượt 2: súng/tay vẽ đè lên (xóa depth, tắt background để không xóa hình lượt 1)
    C.layers.set(0);R.clear();R.render(S,C);
    if(vm.visible){C.layers.set(1);S.background=null;R.clearDepth();R.render(S,C);S.background=bg}
    C.layers.set(0)}
}
requestAnimationFrame(frame);
