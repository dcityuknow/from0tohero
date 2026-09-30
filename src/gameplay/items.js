// Hạ bot, vật phẩm rơi, nhặt đồ, thông báo
const pickups=[],grenades=[],blasts=[];
let msgT=0;
function showMsg(t){const m=$('msg');m.textContent=t;m.style.opacity=1;clearTimeout(msgT);msgT=setTimeout(()=>m.style.opacity=0,1600)}
function killBot(b,dir){
  shatter(b,dir);b.g.visible=false;b.respawn=3/(1+.7*curFl);kills++;if(!b.boss)onKill();$('k').textContent=kills;
  if(b.boss)bossDown(b);else if(Math.random()<DROP_CHANCE)dropItem(DROP_TYPES[Math.floor(Math.random()*DROP_TYPES.length)],b.x,b.y+.45,b.z);
}
let glowTx=null;
function glowTexture(){
  if(glowTx)return glowTx;
  const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,'rgba(255,255,255,.55)');g.addColorStop(.6,'rgba(255,255,255,.15)');g.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle=g;x.fillRect(0,0,64,64);glowTx=new THREE.CanvasTexture(c);return glowTx;
}
// Hộp đạn kiểu thùng quân dụng: nắp, khóa, quai xách, viền đen, huy hiệu đạn (súng ngắn: 4 viên nhỏ, AK: 3 viên vừa, súng ngắm: 2 viên lớn)
function ammoBoxModel(type){
  const v=new VB(),c={pistol:[0x4d9dff,0x3a7fe0,0x7fbfff],rifle:[0xff9a3c,0xe0801f,0xffb56b],sniper:[0x4dd88a,0x3fbf75,0x7fe0a0]}[type];
  v.box(0,0,0,.46,.26,.34,tri(...c),.03,true);
  v.box(0,.16,0,.48,.06,.36,chk(c[2],c[0]),.03,true);
  v.box(0,-.125,0,.48,.03,.36,0x2b2a3a,.03,true);
  v.box(-.235,0,0,.02,.2,.28,0x2b2a3a,.02);v.box(.235,0,0,.02,.2,.28,0x2b2a3a,.02);
  v.box(0,.1,.185,.1,.08,.03,0xd8d8e0,.02);v.box(0,.1,.2,.04,.04,.01,0x2b2a3a,.01);
  v.box(-.09,.22,0,.02,.06,.03,0x2b2a3a,.015);v.box(.09,.22,0,.02,.06,.03,0x2b2a3a,.015);v.box(0,.255,0,.2,.02,.03,0x2b2a3a,.015);
  v.box(0,-.02,.176,.34,.17,.006,0x2b2a3a,.02);
  const B={pistol:[4,.075,.022,.07],rifle:[3,.09,.017,.11],sniper:[2,.12,.03,.15]}[type];
  for(let i=0;i<B[0];i++){const x=(i-(B[0]-1)/2)*B[1];
    v.cyl(x,-.02,.19,B[2],B[3],0xffd23f,.014,'y');v.cyl(x,-.02+B[3]/2+.02,.19,B[2]*.7,.04,0xff8a2a,.012,'y')}
  return v;
}
// Hộp vàng: rương vàng nắp cong, đai, khóa, ngọc đỏ trên nắp
function goldBoxModel(){
  const v=new VB(),G=chk(0xf2b84b,0xffd76a);
  v.box(0,-.02,0,.5,.24,.34,G,.03,true);
  v.cyl(0,.1,0,.17,.5,G,.03,'x');
  v.cyl(-.17,.1,0,.175,.04,0xc98a1a,.03,'x',.14);v.cyl(.17,.1,0,.175,.04,0xc98a1a,.03,'x',.14);
  for(const x of[-1,1])for(const z of[-1,1])v.box(x*.245,-.02,z*.165,.03,.24,.03,0xc98a1a,.02);
  v.box(0,.03,.19,.1,.1,.03,0x3a3850,.02);v.box(0,.03,.21,.025,.05,.01,0xffd23f,.01);
  v.ell(0,.3,0,.05,.05,.05,0xff2a4d,.02);
  return v;
}
// Hộp cứu thương: hộp trắng, chữ thập đỏ ở mặt trước, sau và nắp
function healthBoxModel(){
  const v=new VB(),R=0xe8283c;
  v.box(0,0,0,.46,.32,.34,chk(0xffffff,0xf0f0f4),.03,true);
  v.box(0,.17,0,.48,.04,.36,0xdcdce6,.03,true);
  v.box(0,-.165,0,.48,.03,.36,0xc9c9d6,.03,true);
  for(const z of[.176,-.176]){v.box(0,0,z,.22,.07,.012,R,.02);v.box(0,0,z,.07,.22,.012,R,.02)}
  v.box(0,.196,0,.22,.012,.07,R,.02);v.box(0,.196,0,.07,.012,.22,R,.02);
  v.box(0,.22,0,.14,.03,.03,0x8a8a99,.015);
  return v;
}
function dropItem(type,x,y,z){
  const g=new THREE.Group(),v=type==='gren'?new VB():type==='gold'?goldBoxModel():type==='health'?healthBoxModel():ammoBoxModel(type);
  if(type==='gren'){voxGrenade(v,0,0,0);g.scale.set(1.6,1.6,1.6)}
  else if(type==='gold'||type==='health')g.scale.set(1.3,1.3,1.3);
  g.add(v.mesh());
  const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(),color:GLOW[type],blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,fog:false}));
  gl.position.y=.05;gl.scale.set(2,2,1);g.add(gl);
  g.position.set(x,y,z);S.add(g);pickups.push({g,type,y0:y,t:0,life:45,gl});
}
function collect(p){
  const ty=p.type;
  if(ty==='gold'){for(const k in RMAX){ammos[k]=W[k].mag;reserve[k]=RMAX[k]}gren+=1;showMsg(t('gold'))}
  else if(ty==='health'){if(P.hp>=100)return false;P.hp=Math.min(100,P.hp+HP_BOX);showMsg(t('addhp',HP_BOX))}
  else if(ty==='gren'){if(gren>=GMAX)return false;gren++;showMsg(t('addgren'))}
  else{if(reserve[ty]>=RMAX[ty])return false;reserve[ty]=Math.min(RMAX[ty],reserve[ty]+BOX[ty]);showMsg(t('addammo',BOX[ty],t(ty)))}
  snd(700,.15,'sine',.06);return true;
}
function tickPickups(dt){
  for(let i=pickups.length-1;i>=0;i--){
    const p=pickups[i];p.t+=dt;p.life-=dt;
    p.g.rotation.y+=dt*2;p.g.position.y=p.y0+.15+Math.sin(p.t*3)*.08;
    const pl=.8+.2*Math.sin(p.t*4);p.gl.material.opacity=pl;p.gl.scale.set(1.8+.4*pl,1.8+.4*pl,1);
    p.g.visible=p.life>8||Math.floor(p.life*4)%2===0;
    if(p.life<=0){S.remove(p.g);pickups.splice(i,1);continue}
    if(!dead&&Math.hypot(P.x-p.g.position.x,P.z-p.g.position.z)<1.2&&Math.abs(P.y+.9-p.g.position.y)<1.6&&collect(p)){S.remove(p.g);pickups.splice(i,1)}
  }
}
