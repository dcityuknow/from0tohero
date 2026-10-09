// Vòng lặp chính, nhận sát thương, chơi lại
let deadT=0,stepD=0,pg=true;   // deadT: 0->1 hoạt ảnh ngã xuống khi hết máu
// ---- NGHIÊNG KHUNG CẢNH KHI MẤT MÁU: mỗi lần trúng đòn, camera nghiêng nhẹ (cùng chiều với lúc ngã chết, nhưng chỉ vài độ) rồi tự trả về ----
const HURT_TILT=.008;        // rad nghiêng thêm cho mỗi 1 máu mất (đạn 10 máu = +.08 rad ~ 4.6 độ)
const HURT_TILT_MAX=.2;      // nghiêng tối đa (rad): .2 ~ 11 độ (chết = 1.5 rad ~ 86 độ)
const HURT_TILT_TAU=.7;      // giây: độ nghiêng giảm còn ~37% sau chừng này giây. Lớn hơn = nghiêng lâu hơn; bị đánh liên tục (boss cận chiến) thì giữ nghiêng đều
let hurtTilt=0,hurtTiltT=0;  // hurtTilt: góc đang hiển thị, hurtTiltT: góc mục tiêu (giảm dần về 0)
let hurtT=0,lodN=0,botSeq=0;   // thời gian còn lại của vệt đỏ khi trúng đòn (thay cho setTimeout mỗi lần trúng: bot cận chiến gọi hurt() mỗi khung)
// ---- KÍNH NGẮM KIỂU CoD: vẽ thêm 1 lượt cảnh zoom vào mặt kính hình tròn ở giữa màn hình ----
const ADS_TIME=.35;   // giây đưa ống ngắm lên mắt (hạ xuống nhanh hơn ~30%)
const SCP={r:.36,zoom:6,fog:3};   // r: bán kính mặt kính (tỉ lệ cạnh ngắn màn hình) · zoom: số lần phóng đại · fog: nhân khoảng sương khi nhìn qua kính (nhìn xa hơn)
const scopeCam=new THREE.PerspectiveCamera(10,1,.05,600);
let scEl=$('scope');if(!scEl){scEl=document.createElement('div');scEl.id='scope';$('hud').appendChild(scEl)}
{const rim=document.createElement('div');rim.className='srim';scEl.appendChild(rim)}   // viền kính + tâm ngắm (CSS .srim)
function scopeR(){return Math.round(Math.min(innerWidth,innerHeight)*SCP.r)}
function scopeLayout(){document.documentElement.style.setProperty('--lr',scopeR()+'px')}
addEventListener('resize',scopeLayout);scopeLayout();
// Cảnh qua kính được vẽ vào 1 texture vuông rồi dán lên 1 ĐĨA TRÒN -> mặt kính tròn thật sự, 4 góc vẫn thấy cảnh bình thường (không cần stencil)
const scRT=new THREE.WebGLRenderTarget(2,2,{samples:4});
const scQS=new THREE.Scene(),scQC=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
scQS.add(new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({map:scRT.texture,depthTest:false,depthWrite:false,fog:false})));
function renderScope(){
  const w=innerWidth,h=innerHeight,r=scopeR(),d=r*2,x=Math.round(w/2-r),y=Math.round(h/2-r);
  scopeCam.position.copy(C.position);scopeCam.quaternion.copy(C.quaternion);
  const half=Math.tan(C.fov*Math.PI/360)*d/h;   // nửa-tan của vùng mà mặt kính che trong cảnh thường
  scopeCam.fov=2*Math.atan(half/SCP.zoom)*180/Math.PI;scopeCam.updateProjectionMatrix();
  const px=Math.max(2,Math.round(d*R.getPixelRatio()));if(scRT.width!==px)scRT.setSize(px,px);
  const fg=S.fog&&S.fog.isFog?S.fog:null,n0=fg&&fg.near,f0=fg&&fg.far,ac=R.autoClear;
  if(fg){fg.near*=SCP.fog;fg.far*=SCP.fog}
  R.autoClear=false;
  R.setRenderTarget(scRT);R.clear();R.render(S,scopeCam);R.setRenderTarget(null);   // lượt 1: cảnh zoom -> texture
  R.setViewport(x,y,d,d);R.render(scQS,scQC);R.setViewport(0,0,w,h);                // lượt 2: dán texture lên đĩa tròn giữa màn hình
  R.autoClear=ac;
  if(fg){fg.near=n0;fg.far=f0}
}
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
// ---- ĐIỂM XUẤT HIỆN NGẪU NHIÊN: mỗi lần vào game / chơi lại, người chơi đứng ở 1 trong các vị trí dưới đây, nhìn theo góc yaw / pitch (rad) ----
// Cách thêm vị trí: đứng đúng chỗ + hướng nhìn muốn, mở Console (F12) gõ  spawnPos()  -> nó in sẵn 1 dòng {x,y,z,yaw,pitch}, dán thêm vào mảng này.
// y = độ cao CHÂN (P.y). Vị trí dưới nước: cứ để y như spawnPos() in ra, vật lý bơi (nature/swim.js) tự xử lý.
const SPAWNS=[
  {name:'new',x:1.88,y:4.75,z:16.65,yaw:1.794,pitch:0.08},
  {name:'new',x:11.68,y:0.88,z:-20.38,yaw:-4.47,pitch:-0.015},
  {name:'new',x:19.93,y:1.93,z:2.02,yaw:-4.71,pitch:0.065},
  {name:'new',x:14.64,y:-3.2,z:0.47,yaw:1.423,pitch:-0.035},
];
let lastSpawn=-1;
function spawnRandom(){
  let i=Math.floor(Math.random()*SPAWNS.length);
  if(SPAWNS.length>1&&i===lastSpawn)i=(i+1+Math.floor(Math.random()*(SPAWNS.length-1)))%SPAWNS.length;   // không lặp lại đúng chỗ vừa rồi
  lastSpawn=i;const s=SPAWNS[i];
  P.x=s.x;P.y=s.y;P.z=s.z;P.vy=0;P.fy=undefined;P.ground=false;slideT=0;
  yaw=s.yaw||0;pitch=s.pitch||0;
}
window.spawnPos=()=>{const f=n=>+n.toFixed(2),r=n=>+n.toFixed(3),o="{name:'new',x:"+f(P.x)+",y:"+f(P.y)+",z:"+f(P.z)+",yaw:"+r(yaw)+",pitch:"+r(pitch)+"},";console.log(o);return o};
function restart(){hurtTilt=hurtTiltT=0;lives=0;reviveT=0;updLives();spawnRandom();P.hp=100;ammos={pistol:12,rifle:30,sniper:5};reserve={...RES0};gren=3;gcd=0;throwT=0;holding=false;autoP=false;rel=0;kills=0;for(const p of pickups)S.remove(p.g);pickups.length=0;for(const g of grenades)S.remove(g.m);grenades.length=0;clearRocks();clearAllies();if(window.Engrave)Engrave.reset();$('k').textContent=0;dead=false;bots.forEach(b=>{if(!b.arch)spawnBot(b)});Archer.reset();clearParts();clearHoles();clearBul();resetLevel()}
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
  if(el<1.5)drsStep(f);   // el lớn = vừa chuyển tab / đứng hình: bỏ qua, đừng hạ độ phân giải oan
}
// ---- TỰ CHỈNH ĐỘ PHÂN GIẢI (Dynamic Resolution Scaling): tụt FPS thì giảm số điểm ảnh, mượt lại thì tăng dần ----
// Vì game nghẽn ở GPU (tô điểm ảnh), đây là cách rẻ nhất để giữ FPS, nhưng làm hình mờ đi. MẶC ĐỊNH TẮT (on:false); bật: DRS.on=true. Chỉnh ngưỡng ở DRS.
const DRS={on:false,min:.85,max:Math.min(window.devicePixelRatio||1,1.5),down:48,up:58,step:.1,lo:0,hi:0,pr:null};
function drsStep(f){
  if(!DRS.on||!playing)return;
  if(DRS.pr===null)DRS.pr=Math.min(R.getPixelRatio(),DRS.max);
  if(f<DRS.down){DRS.hi=0;if(++DRS.lo>=2&&DRS.pr>DRS.min){DRS.lo=0;DRS.pr=Math.max(DRS.min,+(DRS.pr-DRS.step).toFixed(2));R.setPixelRatio(DRS.pr)}}   // thấp liên tiếp ~1s -> giảm
  else if(f>DRS.up){DRS.lo=0;if(++DRS.hi>=8&&DRS.pr<DRS.max){DRS.hi=0;DRS.pr=Math.min(DRS.max,+(DRS.pr+DRS.step).toFixed(2));R.setPixelRatio(DRS.pr)}}   // cao liên tiếp ~4s -> tăng
  else DRS.lo=DRS.hi=0;
}
const H={hp:-1,am:null,mg:null,gn:null,eHp:$('hp'),eAm:$('am'),eMg:$('mg'),eGn:$('gn')};   // bản sao giá trị HUD đã hiển thị
let last=performance.now(),mapT=0;   // mapT: đếm ngược để vẽ minimap ~12 lần/giây thay vì mỗi khung
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
    peace=curFl===0&&!dead&&!!window.PavilionPeace&&PavilionPeace(P.x,P.y,P.z);   // đang ở trong chòi -> bot đi lại bình thường, không tấn công; bước ra là thù địch lại ngay
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
      b.hdUse=0;if(b.boss)mv=bossAI(b,dt,dx,dz,d);else if(peace){b.vy-=22*dt;mv=botWander(b,dt)}else if(d>1.4){b.vy-=22*dt;mv=botBrain(b,dt,dx,dz,d)}
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
  tickBoss(dt);if(playing)Archer.tick(dt);tickParts(dt);mapT-=dt;if(mapT<=0){mapT=.08;drawMap()}if(!playing)scoped=false;
  const want=scoped&&cur==='sniper'&&rel<=0;   // want: người chơi đang muốn ngắm · sc: ống ngắm đã áp sát mắt -> chuyển sang cảnh qua kính
  adsT=want?Math.min(1,adsT+dt/ADS_TIME):Math.max(0,adsT-dt/(ADS_TIME*.7));if(rel>0||dead)adsT=0;
  const sc=want&&adsT>=1;document.body.classList.toggle('sc',sc);document.body.classList.toggle('ads',adsT>.02);vm.visible=!dead;   // luôn vẽ súng, kể cả khi ngắm: thân ống ngắm bằng voxel bao quanh mặt kính tròn
  const tf=75;if(Math.abs(C.fov-tf)>.1){C.fov+=(tf-C.fov)*Math.min(1,dt*16);C.updateProjectionMatrix()}
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
    C.layers.set(0);
    if(sc)renderScope()}
}
requestAnimationFrame(frame);
spawnRandom();   // vào game lần đầu: đặt vị trí + góc nhìn ngẫu nhiên (chơi lại: restart() gọi lại)
