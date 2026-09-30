// AI: né vật cản (steering + nhảy qua khối thấp) và Boss tầng 1 cầm súng
const free=(b,ax,az,len,dy=.3,h=1.2)=>!hitAny({x:b.x+ax*len,y:b.y+dy,z:b.z+az*len,r:b.r,h});
function steer(b,tx,tz,sp,dt){
  const a0=Math.atan2(tx-b.x,tz-b.z),s=b.side||1,len=b.r+.5,so=b.sw?1.4:0;let a=null;   // so: đang bơi -> dò vật cản cao hơn mặt nước, bờ/sàn không chặn đường
  if(b.ground&&!free(b,Math.sin(a0),Math.cos(a0),len,.6)&&free(b,Math.sin(a0),Math.cos(a0),len,1.5,.3)){b.vy=8;b.ground=false}
  for(const o of[0,.6*s,-.6*s,1.2*s,-1.2*s,1.9*s,-1.9*s]){
    const A=a0+o;if(free(b,Math.sin(A),Math.cos(A),len,.6+so)){a=A;if(o)b.side=Math.sign(o);break}}
  if(a===null)a=a0+Math.PI*s;
  move(b,Math.sin(a)*sp*dt,b.vy*dt,Math.cos(a)*sp*dt);
}
// ---- Boss (1 con, dùng lại cho từng tầng, máu tăng theo tầng) ----
const boss=buildBoss();boss.boss=true;boss.r=.5;boss.h=2.2;boss.g.scale.setScalar(1.3);boss.cd=1;boss.dir=1;boss.flip=0;boss.fl=0;boss.maxhp=500;boss.on=false;
// Loadout theo tầng: 1 = ngắn; 2 = AK + ngắn; 3 = ngắn + AK + ngắm; 4 = tất cả + lựu đạn
const LO=[['pistol'],['rifle','pistol'],['pistol','rifle','sniper'],['pistol','rifle','sniper','grenade']];
const F={pistol:{cd:.55,dmg:8,sp:22,q:.9},rifle:{cd:.12,dmg:5,sp:26,q:1.6},sniper:{cd:1.8,dmg:35,sp:70,q:0}},MZ={pistol:.9,rifle:1.25,sniper:1.65};
const BM={pistol:new THREE.MeshBasicMaterial({color:0xff5a1f}),rifle:new THREE.MeshBasicMaterial({color:0xffe066}),sniper:new THREE.MeshBasicMaterial({color:0x4dd8ff})};
function mkGun(len,col,acc){const v=new VB();v.box(0,-.5-len/2,0,.1,len,.12,chk(col,0x2b2a3a),.03,true);v.box(0,-.45,.1,.06,.16,.08,acc,.03);const m=v.mesh();boss.aR.add(m);return m}
const GUN={pistol:mkGun(.35,0x3a3850,0xff9a3c),rifle:mkGun(.7,0xf2b84b,0x3a3850),sniper:mkGun(1.1,0x4d9dff,0xffd23f)};
function bossScale(f){const sc=1.3+.07*f;boss.g.scale.setScalar(sc);boss.h=1.7*sc;boss.r=.4*sc;boss.wp=LO[f][0];boss.gc=3}
function pickW(L,d){const w=L.includes('sniper')&&d>20?'sniper':L.includes('rifle')&&d>7?'rifle':'pistol';return L.includes(w)?w:L.includes('rifle')?'rifle':'pistol'}
function throwG(b){const mp=new THREE.Vector3(b.x,b.y+1.8,b.z),T=1.1,dx=P.x-mp.x,dy=P.y+.2-mp.y,dz=P.z-mp.z,m=grenadeModel();S.add(m);
  grenades.push({x:mp.x,y:mp.y,z:mp.z,vx:dx/T,vy:(dy+11*T*T)/T,vz:dz/T,r:.12,h:.24,ground:false,t:1.6,m,foe:true});snd(200,.12,'sine',.05*GV,mp)}
const bul=[],BG=new THREE.SphereGeometry(.1,6,6),BMt=new THREE.MeshBasicMaterial({color:0xff5a1f});
const bb=document.createElement('div');bb.style.cssText='position:fixed;top:10px;left:50%;transform:translateX(-50%);width:min(320px,50vw);z-index:3;display:none;pointer-events:none;text-align:center;color:#fff;font:700 12px sans-serif;text-shadow:0 1px 2px #000';
bb.innerHTML='<div id="bbn"></div><div id="bbw" style="height:10px;background:rgba(0,0,0,.5);border:2px solid #fff;border-radius:6px;overflow:hidden"><div id="bbf" style="height:100%;background:#ffd23f"></div></div>';document.body.appendChild(bb);
// số bot thường theo tầng: 4 / 7 / 10 (hồi sinh nhanh hơn ở tầng cao, xem items.js)
function setupFloor(){
  const nb=bots.filter(b=>!b.boss),want=4+2*curFl;
  while(nb.length<want)nb.push(mkBot());
  nb.forEach((b,i)=>{b.on=i<want;if(b.on)spawnBot(b)});
  boss.on=bossAlive&&boss.fl===curFl;if(boss.on){const h=boss.hp;spawnBot(boss);boss.hp=h}
}
const bname=f=>f===0?'FLASH':t('bossname');   // boss tầng 1 tên FLASH
function onKill(){const f=curFl;fk[f]++;
  if(!bossDone[f]&&!bossAlive&&fk[f]>=need(f)){bossAlive=true;boss.fl=f;boss.maxhp=500*(1+.6*f);bossScale(f);boss.on=true;spawnBot(boss);showMsg(t('bossappear',bname(f)))}}
function sight(b){const n=Math.ceil(Math.hypot(P.x-b.x,P.z-b.z)/.8);
  for(let i=1;i<n;i++){const u=i/n;if(hitAny({x:b.x+(P.x-b.x)*u,y:b.y+1.6+(P.y+1.3-b.y-1.6)*u,z:b.z+(P.z-b.z)*u,r:.05,h:.1}))return false}return true}
function bossAI(b,dt,dx,dz,d){
  b.vy-=22*dt;d=d||1;b.flip-=dt;if(b.flip<=0){b.dir=Math.random()<.5?1:-1;b.flip=1.5+Math.random()*2}
  const nx=dx/d,nz=dz/d;let mx,mz;
  if(d>11){mx=nx;mz=nz}else if(d<6){mx=-nx;mz=-nz}else{mx=nz*b.dir;mz=-nx*b.dir}
  steer(b,b.x+mx*8,b.z+mz*8,6,dt);
  const L=LO[b.fl],ok=!dead&&Math.abs(P.y-b.y)<3;b.cd-=dt;b.gc-=dt;
  if(ok&&L.includes('grenade')&&b.gc<=0&&d>6&&d<30){b.gc=6;throwG(b)}
  if(b.cd<=0&&ok&&d<45&&sight(b)){
    const w=pickW(L,d),f=F[w];b.wp=w;b.cd=f.cd;if(w==='rifle'&&(b.n=(b.n||0)+1)%6===0)b.cd=1;   // AK bắn theo loạt 6 viên
    b.g.updateMatrixWorld(true);const mp=b.aR.localToWorld(new THREE.Vector3(0,-MZ[w],0)),q=f.q;
    const v=new THREE.Vector3(P.x-mp.x+(Math.random()-.5)*q,P.y+1.1-mp.y+(Math.random()-.5)*q*.5,P.z-mp.z+(Math.random()-.5)*q).normalize().multiplyScalar(f.sp);
    const m=new THREE.Mesh(BG,BM[w]);if(w==='sniper')m.scale.setScalar(1.5);m.position.copy(mp);S.add(m);
    bul.push({m,x:mp.x,y:mp.y,z:mp.z,vx:v.x,vy:v.y,vz:v.z,life:3,dmg:f.dmg});
    if(w==='sniper')sniperShot(mp);else snd(w==='rifle'?420:320,.1,'square',.05*GV,mp);
  }
  return 1;
}
const SPK=[new THREE.MeshBasicMaterial({color:0xffe066}),new THREE.MeshBasicMaterial({color:0xff9a3c})];
function bossPose(b){b.aR.rotation.x=-1.45;for(const k in GUN)GUN[k].visible=k===b.wp;
  if(Math.random()<.6){   // tia lửa điện quanh người boss
    const sc=b.g.scale.x,m=new THREE.Mesh(UG,SPK[Math.random()<.5?0:1]),z=.05+Math.random()*.08;
    m.scale.set(z,z*(1+Math.random()*3),z);m.position.set(b.x+(Math.random()-.5)*.9*sc,b.y+(.2+Math.random()*2.3)*sc,b.z+(Math.random()-.5)*.9*sc);
    spawnPart(m,(Math.random()-.5)*2,.5+Math.random()*2,(Math.random()-.5)*2,.35+Math.random()*.25,false,.01)}}
function bossDown(b){bossAlive=false;bossDone[b.fl]=true;openGate(b.fl);showMsg(t(b.fl<NF-1?'bossdown':'win'));dropItem('gold',b.x,b.y+.45,b.z)}
// ---- Bộ sinh quái: cố định theo thời gian, KHÔNG phụ thuộc việc bạn có hạ quái hay không ----
const MAXBOT=100;                  // tối đa số bot thường còn sống cùng lúc trong 1 map (tăng nếu máy khỏe)
const SP_IV=[3,2.4,1.8,1.2];       // giây giữa 2 lần sinh 1 bot, theo tầng 1..4
let spT=0;
function tickSpawn(dt){
  spT-=dt;if(spT>0)return;spT=SP_IV[curFl];
  let alive=0,free=null;
  for(const b of bots){if(b.boss)continue;if(b.on&&b.hp>0)alive++;else if(!free)free=b}
  if(alive>=MAXBOT)return;
  if(!free)free=mkBot();
  free.on=true;spawnBot(free);
}
// ---- Boss nói chuyện: đọc câu từ talking.txt (cùng thư mục index.html, mỗi dòng 1 câu), cứ vài giây nói 1 câu ngẫu nhiên ----
let TALK=['Ngươi chết chắc rồi!','Đừng hòng chạy thoát!','Chỉ có thế thôi sao?','Ta sẽ nghiền nát ngươi!'];   // dùng tạm nếu không đọc được talking.txt
fetch('talking.txt',{cache:'no-store'}).then(r=>r.ok?r.text():Promise.reject()).then(x=>{
  const l=x.replace(/^\uFEFF/,'').split(/\r?\n/).map(v=>v.trim()).filter(Boolean);if(l.length)TALK=l}).catch(()=>{});
const tb=document.createElement('div');
tb.style.cssText='position:fixed;left:0;top:0;z-index:3;display:none;pointer-events:none;background:#000;color:#fff;font:700 14px/1.3 sans-serif;padding:6px 10px;border-radius:8px;max-width:260px;text-align:center;transform-origin:50% 100%';
tb.className='bt';   // mũi nhọn tam giác dưới khung chữ, chĩa xuống đầu boss
{const st=document.createElement('style');st.textContent='.bt::after{content:"";position:absolute;left:50%;top:100%;margin-left:-11px;border:11px solid transparent;border-top:12px solid #000;border-bottom:0}';document.head.appendChild(st)}
document.body.appendChild(tb);
// Dịch câu của boss sang ngôn ngữ người chơi đã chọn (talking.txt viết bằng ngôn ngữ nào cũng được, tự nhận diện nguồn).
// Bản dịch được lưu lại (bộ nhớ + localStorage) nên mỗi câu chỉ dịch 1 lần / ngôn ngữ. Không dịch được (mất mạng...) -> nói nguyên văn.
const TRL={vi:'vi',en:'en',ru:'ru',ng:'en',bn:'bn',id:'id',hi:'hi',zh:'zh-CN',fil:'tl',uk:'uk',ko:'ko'},TRM={};let trBad=0;
async function trLine(s){
  const tl=TRL[L]||'en',k=tl+'|'+s;
  if(TRM[k]!==undefined)return TRM[k];
  try{const v=localStorage.getItem('ba_tr_'+k);if(v)return TRM[k]=v}catch(e){}
  if(Date.now()<trBad)return s;                         // vừa lỗi mạng: tạm nói nguyên văn, thử lại sau
  const get=async u=>{const ac=new AbortController(),to=setTimeout(()=>ac.abort(),3000);
    try{return await(await fetch(u,{signal:ac.signal})).json()}finally{clearTimeout(to)}};
  let out='';
  try{const j=await get('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl='+tl+'&dt=t&q='+encodeURIComponent(s));out=j[0].map(x=>x[0]).join('').trim()}catch(e){}
  if(!out)try{const j=await get('https://api.mymemory.translated.net/get?q='+encodeURIComponent(s)+'&langpair=Autodetect|'+tl);if(j.responseStatus==200)out=String(j.responseData.translatedText||'').trim()}catch(e){}
  if(!out){trBad=Date.now()+60000;return s}
  TRM[k]=out;try{localStorage.setItem('ba_tr_'+k,out)}catch(e){}return out;
}
let talkT=0,talkShow=0,lastTalk=-1,talkTok=0;
function talkTick(dt,bo){
  if(!bo){talkShow=0;talkT=1.5;talkTok++;return}
  if(talkShow>0)talkShow-=dt;
  talkT-=dt;
  if(talkT<=0&&TALK.length){
    let i;do i=Math.floor(Math.random()*TALK.length);while(TALK.length>1&&i===lastTalk);lastTalk=i;
    talkT=99;const my=talkTok;                           // chờ bản dịch xong mới hiện
    trLine(TALK[i]).then(x=>{if(my!==talkTok)return;tb.textContent=x;talkShow=Math.min(5,2+x.length*.06);talkT=talkShow+2+Math.random()*3});
  }
}
const _tp=new THREE.Vector3();
function placeBubble(){   // gọi sau khi camera cập nhật: đặt khung chữ trên đầu boss (thu nhỏ khi ở xa)
  if(!playing||talkShow<=0||!boss.on||boss.hp<=0){tb.style.display='none';return}
  _tp.set(boss.x,boss.y+2.6*boss.g.scale.x+.3,boss.z);const d=_tp.distanceTo(C.position);_tp.project(C);
  if(_tp.z>1||d>45){tb.style.display='none';return}
  tb.style.display='block';
  const sc=Math.max(.6,Math.min(1.2,14/d));
  tb.style.transform='translate('+(_tp.x*.5+.5)*innerWidth+'px,'+(-_tp.y*.5+.5)*innerHeight+'px) translate(-50%,-100%) translate(0,'+(-12*sc)+'px) scale('+sc+')';   // đầu mũi nhọn chạm đúng điểm trên đầu boss
}
let lk=0;
function tickBoss(dt){
  if(!playing)return;
  const nf=Math.min(NF-1,Math.max(0,Math.floor((P.y+.05)/FH)));if(nf!==curFl){curFl=nf;setupFloor()}
  tickSpawn(dt);
  const bo=boss.on&&boss.hp>0;talkTick(dt,bo);bb.style.display='block';$('bbw').style.display=bo?'block':'none';
  $('bbn').textContent=bo?bname(boss.fl):bossDone[curFl]?t('floorclear',curFl+1):t('floor',curFl+1,fk[curFl],need(curFl));
  if(bo)$('bbf').style.width=Math.max(0,boss.hp/boss.maxhp*100)+'%';
  for(let i=bul.length-1;i>=0;i--){const p=bul[i];let gone=false;p.life-=dt;
    for(let k=0;k<6&&!gone;k++){const s=dt/6;p.x+=p.vx*s;p.y+=p.vy*s;p.z+=p.vz*s;
      if(p.y<curFl*FH||hitAny({x:p.x,y:p.y-.05,z:p.z,r:.05,h:.1})){gone=true;if(window.Nature)Nature.bulletSplash(p.x,p.y,p.z)}
      else if(!dead&&Math.hypot(P.x-p.x,P.z-p.z)<P.r+.15&&p.y>P.y&&p.y<P.y+P.h){hurt(p.dmg);gone=true}}
    if(gone||p.life<=0){S.remove(p.m);bul.splice(i,1)}else p.m.position.set(p.x,p.y,p.z)}
  lk-=dt;const g=gates[curFl];
  if(g&&!g.open&&lk<=0&&Math.hypot(P.x-(curFl%2?1:-1)*(AF(curFl)-2),P.z-(AF(curFl)-3.55))<3){showMsg(t('locked',need(curFl)));lk=3}
}
// Lựu đạn ném ra dùng đúng mô hình voxel như lựu đạn cầm tay
let _gm=null;
function grenadeModel(){if(!_gm){const v=new VB();voxGrenade(v,0,0,0,false);_gm=v.mesh()}const g=new THREE.Group();g.add(_gm.clone());g.scale.setScalar(1.6);return g}
setupFloor();
