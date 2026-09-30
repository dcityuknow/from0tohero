// Boss (1 con, dùng lại cho từng tầng, máu tăng theo tầng): vũ khí, đạn, AI, hiệu ứng
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
// thanh máu boss ở đầu màn hình
const bb=document.createElement('div');bb.style.cssText='position:fixed;top:10px;left:50%;transform:translateX(-50%);width:min(320px,50vw);z-index:3;display:none;pointer-events:none;text-align:center;color:#fff;font:700 12px sans-serif;text-shadow:0 1px 2px #000';
bb.innerHTML='<div id="bbn"></div><div id="bbw" style="height:10px;background:rgba(0,0,0,.5);border:2px solid #fff;border-radius:6px;overflow:hidden"><div id="bbf" style="height:100%;background:#ffd23f"></div></div>';document.body.appendChild(bb);
const bname=f=>f===0?'FLASH':t('bossname');   // boss tầng 1 tên FLASH
function onKill(){const f=curFl;fk[f]++;
  if(!bossDone[f]&&!bossAlive&&fk[f]>=need(f)){bossAlive=true;boss.fl=f;boss.maxhp=500*(1+.6*f);bossScale(f);boss.on=true;spawnBot(boss);showMsg(t('bossappear',bname(f)))}}
function sight(b){const n=Math.ceil(Math.hypot(P.x-b.x,P.z-b.z)/.8);
  for(let i=1;i<n;i++){const u=i/n;if(hitAny({x:b.x+(P.x-b.x)*u,y:b.y+1.6+(P.y+1.3-b.y-1.6)*u,z:b.z+(P.z-b.z)*u,r:.05,h:.1}))return false}return true}
function bossAI(b,dt,dx,dz,d){
  b.vy-=22*dt;d=d||1;b.flip-=dt;if(b.flip<=0){b.dir=Math.random()<.5?1:-1;b.flip=1.5+Math.random()*2}
  const nx=dx/d,nz=dz/d;let mx,mz;
  if(d>11){mx=nx;mz=nz}else if(d<6){mx=-nx;mz=-nz}else{mx=nz*b.dir;mz=-nx*b.dir}
  const nv=botNav(b,P.x,P.z,dt);   // sông chắn giữa boss và người chơi -> đi vòng qua cầu (steering.js)
  if(nv)steer(b,nv.x,nv.z,6,dt);else steer(b,b.x+mx*8,b.z+mz*8,6,dt);
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
function bossDown(b){bossAlive=false;bossDone[b.fl]=true;openGate(b.fl);showMsg(t(b.fl<NF-1?'bossdown':'win'));dropItem('gold',b.x,b.y+.45,b.z);killAllMinions();allyOffer(b)}   // ally.js: quái thường chết hết + hỏi thu phục
// Lựu đạn ném ra dùng đúng mô hình voxel như lựu đạn cầm tay
let _gm=null;
function grenadeModel(){if(!_gm){const v=new VB();voxGrenade(v,0,0,0,false);_gm=v.mesh()}const g=new THREE.Group();g.add(_gm.clone());g.scale.setScalar(1.6);return g}
