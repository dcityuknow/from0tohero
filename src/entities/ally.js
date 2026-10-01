// Đồng minh: khi hạ boss -> TẤT CẢ quái thường chết cùng lúc, rồi hỏi có muốn thu phục boss không (tối đa ALLY_MAX).
// Đồng minh luôn đi cạnh người chơi, bơi được (nature.js lo), tự đi qua cầu (botNav), tự lên/xuống thang theo người chơi,
// bắn quái + boss địch bằng đạn vô hạn. Không bị quái địch nhắm tới (bất tử). Nạp SAU bot-throw.js. Chỉnh nhanh ở ALLY / AW bên dưới.
const ALLY={max:2,scale:1.2,walk:6.2,run:11,offerT:20,range:42,blink:45};
const AW={pistol:{cd:.5,dmg:24,sp:38,q:.35},rifle:{cd:.11,dmg:11,sp:44,q:.9},sniper:{cd:1.4,dmg:95,sp:90,q:0}};   // sát thương lên QUÁI (bot 100 máu)
const allies=[],abul=[];let aOffer=null;
// ---- chữ (đủ 11 ngôn ngữ; thiếu thì dùng tiếng Anh) ----
const AT={
  vi:{offer:'🏆 {0} đã bị hạ! Thu phục làm đồng minh? ({1}/{2})',yes:'Thu phục',no:'Bỏ qua',got:'🤝 {0} đã theo phe bạn!',full:'Đã đủ {0} đồng minh',wipe:'💥 Toàn bộ quái thường đã bị tiêu diệt!'},
  en:{offer:'🏆 {0} is down! Recruit as an ally? ({1}/{2})',yes:'Recruit',no:'Skip',got:'🤝 {0} joined your side!',full:'Already {0} allies',wipe:'💥 All regular enemies were wiped out!'},
  ru:{offer:'🏆 {0} повержен! Взять в союзники? ({1}/{2})',yes:'Взять',no:'Пропустить',got:'🤝 {0} теперь на вашей стороне!',full:'Союзников уже максимум: {0}',wipe:'💥 Все обычные враги уничтожены!'},
  ng:{offer:'🏆 {0} don fall! Make you recruit am as ally? ({1}/{2})',yes:'Recruit',no:'Skip',got:'🤝 {0} don join your side!',full:'You don get {0} allies already',wipe:'💥 All the normal enemies don die!'},
  bn:{offer:'🏆 {0} পরাজিত! মিত্র হিসেবে নেবেন? ({1}/{2})',yes:'নিন',no:'বাদ দিন',got:'🤝 {0} আপনার পক্ষে যোগ দিয়েছে!',full:'ইতিমধ্যে {0} জন মিত্র আছে',wipe:'💥 সব সাধারণ শত্রু ধ্বংস!'},
  id:{offer:'🏆 {0} telah kalah! Rekrut jadi sekutu? ({1}/{2})',yes:'Rekrut',no:'Lewati',got:'🤝 {0} bergabung ke pihakmu!',full:'Sudah ada {0} sekutu',wipe:'💥 Semua musuh biasa telah dimusnahkan!'},
  hi:{offer:'🏆 {0} हार गया! सहयोगी बनाएँ? ({1}/{2})',yes:'शामिल करें',no:'छोड़ें',got:'🤝 {0} आपके साथ आ गया!',full:'पहले से {0} सहयोगी हैं',wipe:'💥 सभी सामान्य दुश्मन खत्म!'},
  zh:{offer:'🏆 {0} 已被击败!收为盟友吗?({1}/{2})',yes:'招募',no:'跳过',got:'🤝 {0} 加入了你的阵营!',full:'盟友已满 {0} 名',wipe:'💥 所有普通敌人已被消灭!'},
  fil:{offer:'🏆 Natalo na si {0}! Gawing kaalyado? ({1}/{2})',yes:'Kunin',no:'Laktawan',got:'🤝 Sumama na si {0} sa panig mo!',full:'May {0} kaalyado na',wipe:'💥 Nawasak na ang lahat ng karaniwang kalaban!'},
  uk:{offer:'🏆 {0} переможено! Взяти в союзники? ({1}/{2})',yes:'Взяти',no:'Пропустити',got:'🤝 {0} тепер на вашому боці!',full:'Уже {0} союзників',wipe:'💥 Усіх звичайних ворогів знищено!'},
  ko:{offer:'🏆 {0} 처치! 동료로 영입할까요? ({1}/{2})',yes:'영입',no:'건너뛰기',got:'🤝 {0}이(가) 당신 편에 합류했습니다!',full:'동료가 이미 {0}명입니다',wipe:'💥 모든 일반 적이 전멸했습니다!'}
};
const atr=(k,...a)=>{let s=(AT[L]&&AT[L][k])||AT.en[k];a.forEach((v,i)=>s=s.replace('{'+i+'}',v));return s};
// ---- khung hỏi thu phục (phím Y / N, hoặc bấm nút trên cảm ứng) ----
const aq=document.createElement('div');
aq.style.cssText='position:fixed;left:50%;top:20%;transform:translateX(-50%);z-index:5;display:none;background:rgba(255,255,255,.96);color:#2b2a3a;border:3px solid #7fe0a0;border-radius:16px;padding:12px 16px;font:700 16px "Trebuchet MS",Verdana,sans-serif;text-align:center;box-shadow:0 4px 18px rgba(0,0,0,.3);max-width:min(92vw,460px)';
aq.innerHTML='<div id="aqt"></div><div style="margin-top:10px;display:flex;gap:10px;justify-content:center"><button id="aqy" style="pointer-events:auto;font:inherit;border:3px solid #7fe0a0;background:#7fe0a0;border-radius:12px;padding:6px 14px;cursor:pointer"></button><button id="aqn" style="pointer-events:auto;font:inherit;border:3px solid #ff7fa8;background:transparent;border-radius:12px;padding:6px 14px;cursor:pointer"></button></div>';
document.body.appendChild(aq);
for(const [id,v] of[['aqy',true],['aqn',false]]){const b=aq.querySelector('#'+id);b.addEventListener('click',e=>{e.stopPropagation();allyAnswer(v)});b.addEventListener('touchstart',e=>{e.preventDefault();allyAnswer(v)},{passive:false})}
addEventListener('keydown',e=>{if(!aOffer||!playing)return;if(e.code==='KeyY')allyAnswer(true);else if(e.code==='KeyN')allyAnswer(false)});
setInterval(()=>{if(aOffer)aq.style.display=playing?'block':'none'},200);
function allyOffer(b){   // boss vừa bị hạ (gọi từ boss.js: bossDown)
  if(allies.length>=ALLY.max){showMsg(atr('full',ALLY.max));return}
  aOffer={t:ALLY.offerT,fl:b.fl};
  aq.querySelector('#aqt').textContent=atr('offer',bname(b.fl),allies.length,ALLY.max);
  aq.querySelector('#aqy').innerHTML='<kbd>Y</kbd> '+atr('yes');aq.querySelector('#aqn').innerHTML='<kbd>N</kbd> '+atr('no');
  aq.style.display='block';
}
function allyAnswer(yes){
  if(!aOffer)return;const fl=aOffer.fl;aOffer=null;aq.style.display='none';
  if(yes&&allies.length<ALLY.max)recruitAlly(fl);
}
// Tất cả quái thường chết cùng lúc: vài con gần nhất vỡ mảnh, còn lại bốc máu nhẹ cho đỡ nặng máy
function killAllMinions(){
  const v=[];for(const b of bots)if(!b.boss&&b.on&&b.hp>0)v.push(b);
  v.sort((p,q)=>Math.hypot(p.x-P.x,p.z-P.z)-Math.hypot(q.x-P.x,q.z-P.z));
  const up=new THREE.Vector3(0,1,0),d0=new THREE.Vector3(0,.3,0),c=new THREE.Vector3();
  v.forEach((b,i)=>{
    b.hp=0;b.g.visible=false;b.respawn=3/(1+.7*curFl);
    if(i<6)shatter(b,d0);else blood(c.set(b.x,b.y+.9,b.z),up,d0,8);
  });
  kills+=v.length;$('k').textContent=kills;
  if(v.length)showMsg(atr('wipe'));
}
// ---- dựng đồng minh ----
function mkGunFor(a,len,col,acc){const v=new VB();v.box(0,-.5-len/2,0,.1,len,.12,chk(col,0x2b2a3a),.03,true);v.box(0,-.45,.1,.06,.16,.08,acc,.03);const m=v.mesh();a.aR.add(m);return m}
function recruitAlly(fl){
  const a=buildBoss();   // thân boss mới (dựng mất khoảng vài trăm ms)
  const sc=ALLY.scale;a.boss=true;a.ally=true;a.on=true;a.fl=fl;a.g.scale.setScalar(sc);a.h=1.7*sc;a.r=.4*sc;a.hp=a.maxhp=1e9;
  a.slot=allies.length?1:-1;a.cd=.5;a.wp='rifle';a.n=0;a.tg=null;a.tT=0;a.aim=0;a.stk=0;a.stT=0;a.sx=0;a.sz=0;a.gap=0;a.pk='';a.ps=0;a.ry=undefined;a.mv=0;a.t=0;
  a.gun={pistol:mkGunFor(a,.35,0x3a3850,0xff9a3c),rifle:mkGunFor(a,.7,0xf2b84b,0x3a3850),sniper:mkGunFor(a,1.1,0x4d9dff,0xffd23f)};
  const mk=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(),color:0x3fff8a,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,fog:false}));
  mk.position.set(0,3.05,0);mk.scale.set(1.1,1.1,1);a.g.add(mk);
  allies.push(a);allyBlink(a);a.g.visible=true;
  showMsg(atr('got',bname(fl)));snd(600,.2,'sine',.06);snd(900,.25,'triangle',.05);
}
// đưa đồng minh tới cạnh người chơi (lúc mới thu phục, hoặc khi bị kẹt / lạc quá xa)
function allyBlink(a){
  const fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);a.x=P.x;a.z=P.z;
  for(let k=0;k<8;k++){const o=2+k*.6,x=P.x+rx*a.slot*o-fx*(1+k*.3),z=P.z+rz*a.slot*o-fz*(1+k*.3);if(!hitAny({x,y:P.y+.05,z,r:a.r,h:a.h})){a.x=x;a.z=z;break}}
  a.y=P.y;a.vy=0;a.nv=null;a.stk=0;a.gap=0;a.ps=0;a.sx=a.x;a.sz=a.z;a.stT=0;
}
function clearAllies(){   // chơi lại
  for(const a of allies){S.remove(a.g);const i=bots.indexOf(a);if(i>=0)bots.splice(i,1);for(const p of a.parts){const j=botMeshes.indexOf(p.mesh);if(j>=0)botMeshes.splice(j,1)}}
  allies.length=0;for(const p of abul)S.remove(p.m);abul.length=0;aOffer=null;aq.style.display='none';
}
// ---- đường lên/xuống thang (khớp level.js: thang tầng f ở cx=±(AF(f)-2), chạy z từ AF(f)-4 lùi về AF(f)-22) ----
const stairWP=(f,up)=>{const A=AF(f),cx=(f%2?1:-1)*(A-2),zs=A-4,b=[cx,zs+2.3],t=[cx,zs-19.5];return up?[b,t]:[t,b]};
const _ap=new THREE.Vector3(),_up=new THREE.Vector3(0,1,0),_ad=new THREE.Vector3();
function los(a,t){const n=Math.ceil(Math.hypot(t.x-a.x,t.z-a.z)/.8);
  for(let i=1;i<n;i++){const u=i/n;if(hitAny({x:a.x+(t.x-a.x)*u,y:a.y+1.9+(t.y+1.2-a.y-1.9)*u,z:a.z+(t.z-a.z)*u,r:.05,h:.1}))return false}return true}
function pickTarget(a){   // quái (hoặc boss địch) gần nhất trong tầm, cùng tầng, không bị tường che
  const c=[];for(const b of bots){if(b.ally||!b.on||b.hp<=0||Math.abs(b.y-a.y)>3)continue;const d=Math.hypot(b.x-a.x,b.z-a.z);if(d<ALLY.range)c.push([d,b])}
  c.sort((p,q)=>p[0]-q[0]);for(let i=0;i<Math.min(3,c.length);i++)if(los(a,c[i][1]))return c[i][1];return null}
function allyFire(a,t,d){
  const w=d>20?'sniper':d>7?'rifle':'pistol',f=AW[w];a.wp=w;a.cd=f.cd;if(w==='rifle'&&(a.n=(a.n||0)+1)%8===0)a.cd=.7;   // AK bắn theo loạt 8 viên; đạn VÔ HẠN
  a.g.updateMatrixWorld(true);const mp=a.aR.localToWorld(new THREE.Vector3(0,-MZ[w],0)),q=f.q;
  const v=new THREE.Vector3(t.x-mp.x+(Math.random()-.5)*q,t.y+t.h*.55-mp.y+(Math.random()-.5)*q*.5,t.z-mp.z+(Math.random()-.5)*q).normalize().multiplyScalar(f.sp);
  const m=new THREE.Mesh(BG,BM[w]);if(w==='sniper')m.scale.setScalar(1.5);m.position.copy(mp);S.add(m);
  abul.push({m,x:mp.x,y:mp.y,z:mp.z,vx:v.x,vy:v.y,vz:v.z,life:2.5,dmg:f.dmg});
  if(w==='sniper')sniperShot(mp);else snd(w==='rifle'?420:320,.1,'square',.05*GV,mp);
}
function allyThink(a,dt){
  a.vy-=22*dt;
  const af=Math.min(NF-1,Math.floor((a.y+.05+SLAB-.3)/FH)),pf=curFl,dp=Math.hypot(P.x-a.x,P.z-a.z);
  let tx=P.x,tz=P.z,sp=ALLY.walk,stay=false;
  if(dead)stay=true;
  else if(af!==pf){   // khác tầng: đi tới thang rồi lên/xuống cùng người chơi
    a.gap+=dt;if(a.gap>25){allyBlink(a);return}
    const up=af<pf,f=up?af:af-1,W=stairWP(Math.max(0,Math.min(NF-2,f)),up),key=af+'>'+pf;
    if(a.pk!==key){a.pk=key;a.ps=0}
    if(a.ps===0&&Math.hypot(a.x-W[0][0],a.z-W[0][1])<1.6)a.ps=1;
    tx=W[a.ps][0];tz=W[a.ps][1];sp=6.5;
  }else{
    a.gap=0;a.pk='';
    if(dp>ALLY.blink){allyBlink(a);return}
    const fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
    tx=P.x+rx*a.slot*2.6-fx*.8;tz=P.z+rz*a.slot*2.6-fz*.8;   // đứng cạnh người chơi (trái / phải)
    const dt2=Math.hypot(tx-a.x,tz-a.z);sp=dp>14?ALLY.run:dp>5?7.5:ALLY.walk;if(dt2<.9)stay=true;
  }
  // di chuyển (qua cầu nếu sông chắn; steer lo né vật cản + bước lên bậc; bơi do nature.js xử lý)
  let mv=0;const px0=a.x,pz0=a.z;
  if(stay)move(a,0,a.vy*dt,0);
  else{const nv=botNav(a,tx,tz,dt);if(nv){tx=nv.x;tz=nv.z}steer(a,tx,tz,sp,dt);mv=Math.min(1.5,sp/4.2)}
  // kẹt quá 6 giây thì dịch chuyển tới cạnh người chơi
  a.stT+=dt;if(a.stT>=1){if(mv>0&&Math.hypot(a.x-a.sx,a.z-a.sz)<.25)a.stk++;else a.stk=0;a.sx=a.x;a.sz=a.z;a.stT=0;if(a.stk>=6){allyBlink(a);return}}
  // ngắm + bắn
  a.cd-=dt;a.aim-=dt;a.tT-=dt;
  if(a.tT<=0){a.tT=.25;a.tg=dead?null:pickTarget(a)}
  if(a.tg&&(a.tg.hp<=0||!a.tg.on))a.tg=null;
  let ty;
  if(a.tg){const d=Math.hypot(a.tg.x-a.x,a.tg.z-a.z);a.aim=.6;ty=Math.atan2(a.tg.x-a.x,a.tg.z-a.z);
    if(a.cd<=0&&los(a,a.tg))allyFire(a,a.tg,d)}
  else if(a.aim>0)ty=a.ry;
  else ty=mv>0?Math.atan2(a.x-px0,a.z-pz0):yaw+Math.PI;
  if(a.ry===undefined)a.ry=ty;
  // hoạt ảnh: chân/tay đung đưa, tay phải chĩa súng, tiếng bước nặng như boss
  a.mv+=(mv-a.mv)*Math.min(1,dt*8);const s0=Math.sin(a.t);a.t+=dt*11*a.mv;
  if(a.mv>.5&&s0*Math.sin(a.t)<0&&dp<20){if(a.sw)snd(280+Math.random()*140,.14,'sine',.05,a.g.position);else botStepSnd(a.g.position,true)}
  const sw=Math.sin(a.t)*.95*a.mv;a.lL.rotation.x=sw;a.lR.rotation.x=-sw;a.aL.rotation.x=-sw*.8;a.aR.rotation.x=-1.45;
  for(const k in a.gun)a.gun[k].visible=k===a.wp;
  a.g.position.set(a.x,a.y+Math.abs(Math.sin(a.t))*.07*a.mv,a.z);
  let da=ty-a.ry;da=Math.atan2(Math.sin(da),Math.cos(da));a.ry+=da*Math.min(1,dt*10);a.g.rotation.y=a.ry;
}
function tickAbul(dt){
  for(let i=abul.length-1;i>=0;i--){
    const p=abul[i];let gone=false;p.life-=dt;
    for(let k=0;k<6&&!gone;k++){
      const s=dt/6;p.x+=p.vx*s;p.y+=p.vy*s;p.z+=p.vz*s;
      if(p.y<curFl*FH||hitAny({x:p.x,y:p.y-.05,z:p.z,r:.05,h:.1})){gone=true;if(window.Nature)Nature.bulletSplash(p.x,p.y,p.z)}
      else for(const b of bots){
        if(b.ally||!b.on||b.hp<=0||p.y<b.y||p.y>b.y+b.h||Math.hypot(b.x-p.x,b.z-p.z)>=b.r+.15)continue;
        gone=true;b.hp-=p.dmg;_ad.set(p.vx,p.vy,p.vz).normalize();blood(_ap.set(p.x,p.y,p.z),_up,_ad,10);snd(180,.08,'sawtooth',.05*GV,{x:p.x,y:p.y,z:p.z});
        if(b.hp<=0)killBot(b,_ad.clone());break;
      }
    }
    if(gone||p.life<=0){S.remove(p.m);abul.splice(i,1)}else p.m.position.set(p.x,p.y,p.z);
  }
}
function tickAllies(dt){   // main.js gọi mỗi khung khi đang chơi
  if(aOffer){aOffer.t-=dt;if(aOffer.t<=0)allyAnswer(false)}
  for(const a of allies)allyThink(a,dt);
  tickAbul(dt);
}
