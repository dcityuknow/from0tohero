// Vòng lặp chính, nhận sát thương, chơi lại
let deadT=0,stepD=0,pg=true;   // deadT: 0->1 hoạt ảnh ngã xuống khi hết máu
// ---- NGHIÊNG KHUNG CẢNH KHI MẤT MÁU: mỗi lần trúng đòn, camera nghiêng nhẹ (cùng chiều với lúc ngã chết, nhưng chỉ vài độ) rồi tự trả về ----
const HURT_TILT=.008;        // rad nghiêng thêm cho mỗi 1 máu mất (đạn 10 máu = +.08 rad ~ 4.6 độ)
const HURT_TILT_MAX=.2;      // nghiêng tối đa (rad): .2 ~ 11 độ (chết = 1.5 rad ~ 86 độ)
const HURT_TILT_TAU=.7;      // giây: độ nghiêng giảm còn ~37% sau chừng này giây. Lớn hơn = nghiêng lâu hơn; bị đánh liên tục (boss cận chiến) thì giữ nghiêng đều
let hurtTilt=0,hurtTiltT=0;  // hurtTilt: góc đang hiển thị, hurtTiltT: góc mục tiêu (giảm dần về 0)
let hurtT=0,lodN=0,botSeq=0;   // thời gian còn lại của vệt đỏ khi trúng đòn (thay cho setTimeout mỗi lần trúng: bot cận chiến gọi hurt() mỗi khung)
// ---- MẠNG HỒI SINH: hạ boss tầng 1 / 2 / 3 được +1 / +2 / +3 mạng (cộng dồn). Hết máu mà còn mạng thì hồi sinh NGAY TẠI CHỖ chết ----
let lives=0,reviveT=0;   // reviveT: giây bất tử sau khi hồi sinh (tránh bị bot đứng sát đánh chết lại ngay)
const LVT={vi:'Hồi sinh! Còn %d mạng',en:'Revived! %d lives left',ru:'Возрождение! Осталось жизней: %d',ng:'You don revive! %d life remain',bn:'পুনরুজ্জীবিত! আর %d টি জীবন বাকি',id:'Bangkit lagi! Sisa %d nyawa',hi:'पुनर्जीवित! %d जीवन बाकी',zh:'复活！还剩 %d 条命',fil:'Nabuhay muli! %d buhay na lang',uk:'Відродження! Лишилось життів: %d',ko:'부활! 남은 목숨 %d개'};
const LVG={vi:'Hạ boss: +%d mạng hồi sinh',en:'Boss down: +%d respawn lives',ru:'Босс побеждён: +%d жизней',ng:'Boss don die: +%d life',bn:'বস পরাজিত: +%d জীবন',id:'Bos kalah: +%d nyawa',hi:'बॉस हारा: +%d जीवन',zh:'击败首领：+%d 条命',fil:'Talo ang boss: +%d buhay',uk:'Боса переможено: +%d життів',ko:'보스 처치: +%d 목숨'};
function addLives(n){lives+=n;showMsg((LVG[L]||LVG.en).replace('%d',n));if(window.updLives)updLives()}
function updLives(){const e=$('lv');if(e)e.textContent=lives;const w=$('lvl');if(w)w.style.display=lives>0?'':'none'}
function hurt(n){
  if(reviveT>0||dead)return;
  P.hp=Math.max(0,P.hp-n);$('hurt').style.opacity=.9;hurtT=.12;hurtTiltT=Math.min(HURT_TILT_MAX,hurtTiltT+n*HURT_TILT);
  if(P.hp<=0&&lives>0){lives--;P.hp=100;reviveT=3;P.vy=0;showMsg((LVT[L]||LVT.en).replace('%d',lives));updLives();$('hurt').style.opacity=0;return}   // hồi sinh tại chỗ: giữ nguyên vị trí / tầng / đạn
  if(P.hp<=0&&!dead){dead=true;playing=false;md=false;deadT=0;thudSnd();if(document.exitPointerLock)document.exitPointerLock();
    ovState='dead';renderOv();setTimeout(()=>{if(dead)$('ov').style.display='flex'},1400)}}   // chờ nhân vật ngã xong mới hiện bảng thua
function restart(){hurtTilt=hurtTiltT=0;lives=0;reviveT=0;updLives();P.x=0;P.z=16*MAPK;P.y=0;P.vy=0;P.fy=undefined;P.hp=100;ammos={pistol:12,rifle:30,sniper:5};reserve={...RES0};gren=3;gcd=0;throwT=0;holding=false;autoP=false;rel=0;kills=0;for(const p of pickups)S.remove(p.g);pickups.length=0;for(const g of grenades)S.remove(g.m);grenades.length=0;clearRocks();clearAllies();if(window.Engrave)Engrave.reset();$('k').textContent=0;dead=false;bots.forEach(b=>{if(!b.arch)spawnBot(b)});Archer.reset();resetLevel()}
// ---- Đồng hồ FPS ở góc trái dưới màn hình: xanh = mượt, vàng = trung bình, đỏ = giật lag. Chỉnh ngưỡng ở FPSC ----
const FPSC={good:50,mid:30,every:.5};   // >= good: xanh · >= mid: vàng · thấp hơn: đỏ · every: giây giữa 2 lần cập nhật số
const fpsEl=document.createElement('div');fpsEl.id='fps';fpsEl.className='pill';
fpsEl.style.cssText='position:absolute;left:16px;bottom:calc(64px + env(safe-area-inset-bottom,0px));background:rgba(20,20,30,.62);font-size:15px;padding:4px 10px;min-width:74px;text-align:center';
$('hud').appendChild(fpsEl);
{const st=document.createElement('style');st.textContent='body.touch #fps{left:calc(12px + env(safe-area-inset-left,0px));bottom:calc(36px + env(safe-area-inset-bottom,0px));font-size:12px;padding:3px 8px}';document.head.appendChild(st)}
let fpsN=0,fpsT=0,fpsLast=performance.now();
function fpsTick(now){
  fpsN++;const el=(now-fpsLast)/1000;
  if(el<FPSC.every)return;
  const f=fpsN/el;fpsN=0;fpsLast=now;
  fpsEl.textContent='FPS '+Math.round(f);
  fpsEl.style.color=f>=FPSC.good?'#3dff7a':f>=FPSC.mid?'#ffd23f':'#ff4d5e';
}
const H={hp:-1,am:null,mg:null,gn:null,eHp:$('hp'),eAm:$('am'),eMg:$('mg'),eGn:$('gn')};   // bản sao giá trị HUD đã hiển thị
let last=performance.now();
function frame(now){
  requestAnimationFrame(frame);fpsTick(now);
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(hurtT>0){hurtT-=dt;if(hurtT<=0)$('hurt').style.opacity=0}
  hurtTiltT*=Math.exp(-dt/HURT_TILT_TAU);hurtTilt+=(hurtTiltT-hurtTilt)*Math.min(1,dt*18);   // nghiêng nhanh khi trúng, trả về từ từ
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
    {const fd=fallDmg(P);if(fd>0)playerFall(fd)}   // rơi từ trên cao xuống thì mất máu (gameplay/fall.js)
    // tiếng bước chân theo quãng đường thực đi (lội nước thì tiếng bì bõm); rơi xuống đất có tiếng thịch
    {const wd=window.Nature&&Nature.wading;
      if(P.ground&&slideT<=0){stepD+=Math.hypot(P.x-px0,P.z-pz0);if(stepD>=(wd?1.4:1.9)){stepD=0;if(wd)wadeSnd();else stepSnd()}}
      else if(!P.ground)stepD=0;
      if(P.ground&&!pg&&vy0<-6&&!wd)stepSnd();
      pg=P.ground}
    eye+=((P.h-.1)-eye)*Math.min(1,dt*14);
    if(md&&W[cur].auto)shoot();
    // bots
    const dt0=dt;lodN++;
    for(const b of bots){
      if(b.ally||b.arch)continue;      // đồng minh do ally.js điều khiển · lính cung trên tường thành do archer.js điều khiển
      if(!b.on){b.g.visible=false;continue}
      if(b.hp>0&&(b.y<FY(curFl)-4||b.y>FY(curFl)+(curFl===1?44:12))){spawnBot(b);continue}   // +12 (tầng 2: +44): bot được phép leo lên núi / mặt tường thành
      if(b.hp<=0)continue;      // bot chết được tái sử dụng bởi bộ sinh quái (tickSpawn)
      const dx=P.x-b.x,dz=P.z-b.z,d=Math.hypot(dx,dz);let mv=0,dt=dt0;
      // AI LOD: bot ở xa (sương đã che gần hết) chỉ chạy AI + va chạm 1/3 (xa > 100m: 1/6) số khung, bù lại bằng bước thời gian dài hơn -> cùng tốc độ di chuyển, nhẹ CPU, hình ảnh không đổi
      if(!b.boss){const st=d>100?6:d>55?3:1;if(st>1){b.lod=(b.lod||0)+dt0;if((lodN+(b.id||(b.id=++botSeq)))%st)continue;dt=Math.min(b.lod,.12);b.lod=0}}
      // người chơi không được đi xuyên quái: đẩy ra qua move() nên không bị đẩy vào tường
      if(!dead&&d<P.r+b.r&&Math.abs(P.y-b.y)<1.6){const o=P.r+b.r-d+.01,ux=d>1e-3?dx/d:1,uz=d>1e-3?dz/d:0,g0=P.ground;move(P,ux*o,0,uz*o);P.ground=g0}
      b.hdUse=0;if(b.boss)mv=bossAI(b,dt,dx,dz,d);else if(d>1.4){b.vy-=22*dt;mv=botBrain(b,dt,dx,dz,d)}
      else if(!dead&&Math.abs(P.y-b.y)<1.5)hurt(28*dt);
      if(fallBot(b))continue;   // bot / boss rơi từ trên cao cũng mất máu
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
  tickBoss(dt);if(playing)Archer.tick(dt);tickParts(dt);drawMap();if(!playing)scoped=false;
  const sc=scoped&&cur==='sniper'&&rel<=0;document.body.classList.toggle('sc',sc);vm.visible=!sc&&!dead;
  const tf=sc?20:75;if(Math.abs(C.fov-tf)>.1){C.fov+=(tf-C.fov)*Math.min(1,dt*16);C.updateProjectionMatrix()}
  if(reviveT>0)reviveT-=dt;
  if(dead)deadT=Math.min(1,deadT+dt*1.5);else deadT=0;
  const de=deadT*deadT*(3-2*deadT);   // ngã: mắt tụt xuống sát đất, đầu chúi xuống, góc nhìn nghiêng gần 90 độ
  C.position.set(P.x+Math.cos(yaw)*.5*de,P.y+eye+(.3-eye)*de,P.z-Math.sin(yaw)*.5*de);C.rotation.set(pitch*(1-de)-.25*de,yaw,-1.5*de-hurtTilt*(1-de));applyShake(dt);C.updateMatrixWorld();tickSky(dt);listen();placeBubble();OC.tick(dt);VLOD.tick();
  {const gr=cur==='grenade';   // chỉ ghi vào DOM khi giá trị thật sự đổi (tránh dựng lại chữ / layout mỗi khung)
    if(P.hp!==H.hp){H.hp=P.hp;H.eHp.style.width=P.hp+'%'}
    const am=gr?gren:rel>0?'…':ammos[cur],mg=gr?GMAX:reserve[cur];
    if(am!==H.am){H.am=am;H.eAm.textContent=am}
    if(mg!==H.mg){H.mg=mg;H.eMg.textContent=mg}
    if(gren!==H.gn){H.gn=gren;H.eGn.textContent=gren}}
  {const bg=S.background;   // lượt 1: thế giới · lượt 2: súng/tay vẽ đè lên (xóa depth, tắt background để không xóa hình lượt 1)
    C.layers.set(0);R.clear();R.render(S,C);
    if(vm.visible){C.layers.set(1);S.background=null;R.clearDepth();R.render(S,C);S.background=bg}
    C.layers.set(0)}
}
requestAnimationFrame(frame);