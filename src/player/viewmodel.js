// Súng / lựu đạn cầm trên tay, hoạt ảnh nạp đạn, ném
// ---- Gun + FX ----
const MC={},UG=new THREE.BoxGeometry(1,1,1);
function M(c){return MC[c]||(MC[c]=new THREE.MeshLambertMaterial({color:c,emissive:c,emissiveIntensity:.14}))}
const pal=(a,b,c)=>{const l=[M(a),M(b),M(c)];return(i,j,k)=>l[(i+j+k)%3]},one=c=>{const m=M(c);return()=>m};
function rub(par,w,h,d,nx,ny,nz,x,y,z,fn,tag){
  let mx=1,my=1,mz=1;const a0=w/nx,b0=h/ny,c0=d/nz;
  if(a0>=b0&&a0>=c0)mx=2;else if(b0>=c0)my=2;else mz=2;
  nx*=mx;ny*=my;nz*=mz;
  const cw=w/nx,ch=h/ny,cd=d/nz;
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++)for(let k=0;k<nz;k++){
    const m=new THREE.Mesh(UG,fn(i,j,k,Math.floor(i/mx),Math.floor(j/my),Math.floor(k/mz)));m.scale.set(cw*.94,ch*.94,cd*.94);
    m.position.set(x+(i+.5-nx/2)*cw,y+(j+.5-ny/2)*ch,z+(k+.5-nz/2)*cd);par.add(m);if(tag)tag(m)}
}
const part=(g,c,w,h,d,x,y,z,nx=1,ny=1,nz=1)=>rub(g,w,h,d,nx,ny,nz,x,y,z,typeof c==='function'?c:one(c));
let vm=null,muzzle=null,flash=null;
const DK=pal(0x3a3850,0x55536e,0x2b2a3a),YL2=pal(0xf2b84b,0xffd76a,0xe0a030),BL2=pal(0x4d9dff,0x7fbfff,0x3a7fe0),OR=pal(0xff9a3c,0xffb56b,0xe0801f);
function buildVM(){
  if(vm)C.remove(vm);
  vm=new THREE.Group();muzzle=new THREE.Object3D();
  const G=new THREE.Group(),MG=new THREE.Group(),SL=new THREE.Group();G.add(MG,SL);vm.add(G);
  const wb={pistol:buildPistol,rifle:buildRifle,sniper:buildSniper,grenade:buildGrenade}[cur](G,MG,SL);
  const la=wb.la,lt=wb.lt;muzzle.position.set(...wb.mz);if(cur==='pistol')la.visible=false;
  vm.add(la);
  flash=new THREE.Mesh(UG,new THREE.MeshBasicMaterial({color:0xffe066}));flash.scale.set(.16,.16,.06);flash.visible=false;flash.position.copy(muzzle.position);
  G.add(muzzle,flash);
  const mb=MG.position.clone();
  vm.userData={G,MG,SL,la,pn:wb.pn,lb:la.position.clone(),lt,sg:wb.sg,mb,ho:new THREE.Vector3(lt.x-mb.x,(lt.y-mb.y)*.5,lt.z-mb.z),st:0,pistol:cur==='pistol'||cur==='grenade'};
  C.add(vm);vm.position.y=-.35;
}
function pick(w){if(throwT>0||autoP)return;holding=false;if(w!=='grenade')prevW=w;cur=w;rel=0;scoped=false;buildVM();$('wn').textContent=t(w);$('mg').textContent=W[w].mag;
  document.querySelectorAll('.wb').forEach(b=>b.classList.toggle('on',b.dataset.w===w))}
document.querySelectorAll('.wb').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();pick(b.dataset.w)}));
pick(cur);
function dropMag(){const g=vm.userData,p=new THREE.Vector3();g.MG.getWorldPosition(p);
  const m=new THREE.Mesh(UG,M(cur==='pistol'?0x4d9dff:0xf2b84b));m.scale.set(.09,.15,.1);m.position.copy(p);
  spawnPart(m,Math.random()-.5,-1,1.5,1.6,true)}
const _v1=new THREE.Vector3(),_v2=new THREE.Vector3(),_v3=new THREE.Vector3(),_v5=new THREE.Vector3();
// Giật chốt: tay trái với tới vòng chốt -> kéo ra -> chốt bay đi -> tay rút về. Xong (holdT>=PIN_T) mới được thả chuột để ném.
let _pg=null;   // chiếc chốt (vòng + thân) tách rời, tâm ở gốc, để bay ra khi giật
function pinMesh(){if(!_pg){const v=new VB();voxPin(v,.035,-.115,0);_pg=v.mesh().geometry}const m=new THREE.Mesh(_pg,VMAT);m.frustumCulled=false;return m}
// Giật chốt: tay trái với tới vòng chốt -> nắm -> kéo chốt ra khỏi lựu đạn -> chốt bay đi -> tay rút về. Xong (holdT>=PIN_T) mới ném được.
function pinAnim(g){
  const u=Math.min(1,holdT/PIN_T),cl=(a,b)=>Math.min(1,Math.max(0,(u-a)/(b-a))),e=x=>x*x*(3-2*x),pulled=u>=.7,pl=e(cl(.45,.7));
  g.pn.position.x=-.16*pl;                                   // chốt trượt ra khỏi lựu đạn theo tay
  if(pulled&&!g.pin){g.pin=1;g.G.updateMatrixWorld(true);
    const m=pinMesh();g.pn.localToWorld(m.position.set(.165,-.105,-.5));g.pn.getWorldQuaternion(m.quaternion);m.scale.setScalar(1.6);
    const d=_v1.set(-1.6,1.4,-.8).applyQuaternion(C.quaternion);   // bay sang trái-lên (theo hướng nhìn)
    spawnPart(m,d.x,d.y,d.z,1.8,true,.02);snd(1500,.05,'square',.06);snd(600,.1,'triangle',.05)}
  g.pn.visible=!pulled;
  if(u<.1){g.la.visible=false;return}
  g.la.visible=u<1;g.G.updateMatrix();_v1.set(.165,-.105,-.5).applyMatrix4(g.G.matrix).add(_v2.set(-.03,-.06,.07));
  const h=g.la.position;h.lerpVectors(g.lb,_v1,e(cl(.1,.45)));h.x-=.16*pl;h.lerp(g.lb,e(cl(.78,1)));
}
// Nạp đạn: [0-.12] nghiêng súng, tay trái nắm băng | [.12-.30] rút băng cũ, vứt | [.30-.48] tay xuống lấy băng mới
// [.48-.72] đưa băng mới lên, nhét vào | [.72-.82] tay lên thân súng | [.82-.90] kéo chốt/thanh trượt | [.92-.95] thả chốt | rút tay về
const MDN=.25,POUCH=new THREE.Vector3(-.32,-.45,.3);
const RL_EV=[[.12,()=>snd(150,.08)],[.30,()=>{dropMag();snd(200,.08,'triangle',.05)}],[.72,()=>snd(300,.06,'square',.06)],[.82,()=>snd(420,.05,'square',.06)],[.93,()=>snd(260,.08,'square',.08)]];
function magPath(g,u,out){
  const e=x=>x*x*(3-2*x),cl=(a,b)=>Math.min(1,Math.max(0,(u-a)/(b-a))),mb=g.mb,dn=_v5.copy(mb),po=_v3.copy(mb).add(POUCH);dn.y-=MDN;
  if(u<.30)return out.lerpVectors(mb,dn,e(cl(.12,.30)));
  if(u<.48)return out.lerpVectors(dn,po,e(cl(.30,.48)));
  if(u<.60)return out.lerpVectors(po,dn,e(cl(.48,.60)));
  return out.lerpVectors(dn,mb,e(cl(.60,.72)));
}
function animVM(dt){
  const g=vm.userData;
  if(cur==='grenade'){
    g.la.visible=false;g.MG.visible=false;
    const e=t=>t*t*(3-2*t);
    if(throwT>0){
      const u=1-throwT/TH,t=e(Math.min(1,u/.8)),w=wt;
      g.G.position.set(.04*w*(1-t),.14*w-(.14*w+.12)*t,.3*w-(.3*w+.4)*t);g.G.rotation.set(.55*w-(.55*w+.5)*t,0,0);g.SL.visible=!thrown;g.pn.visible=false;
    }else if(holding||autoP){
      const w=e(Math.min(1,holdT/.25));g.G.position.set(.04*w,.14*w,.3*w);g.G.rotation.set(.55*w,0,0);g.SL.visible=true;pinAnim(g);
    }else{g.G.position.set(0,0,0);g.G.rotation.set(0,0,0);g.SL.visible=gren>0;g.pn.visible=gren>0;g.pn.position.x=0;g.pin=0}
    return;
  }
  if(bolt>0)bolt-=dt;
  let sl=bolt>0?(g.pistol?.04:cur==='sniper'?.1:.05)*Math.sin(Math.PI*(1-bolt/boltMax)):0;
  if(rel>0){
    const u=Math.min(1,1-rel/W[cur].rl),cl=(a,b)=>Math.min(1,Math.max(0,(u-a)/(b-a))),e=x=>x*x*(3-2*x);
    const tl=e(cl(0,.12))*(1-e(cl(.74,.86)));
    g.G.rotation.set(.35*tl,0,-.5*tl);g.G.position.set(-.06*tl,-.12*tl,.015*Math.sin(Math.PI*cl(.72,.78)));g.G.updateMatrix();
    magPath(g,u,g.MG.position);g.MG.visible=u<.3||u>=.48;
    const ev=RL_EV;while(g.st<ev.length&&u>ev[g.st][0])ev[g.st++][1]();
    const sm=cur==='pistol'?.07:cur==='sniper'?.1:.08;sl=sm*e(cl(.82,.9))*(1-e(cl(.92,.95)));
    g.la.visible=true;const h=g.la.position;
    if(u<.12){h.lerpVectors(g.lb,_v1.copy(g.MG.position).add(g.ho).applyMatrix4(g.G.matrix),e(cl(0,.12)))}
    else if(u<.72){h.copy(g.MG.position).add(g.ho).applyMatrix4(g.G.matrix)}
    else if(u<.82){h.lerpVectors(_v1.copy(g.mb).add(g.ho),g.sg,e(cl(.72,.82))).applyMatrix4(g.G.matrix)}
    else if(u<.95){h.copy(g.sg);h.z+=sl;h.applyMatrix4(g.G.matrix)}
    else{h.lerpVectors(_v1.copy(g.sg).applyMatrix4(g.G.matrix),g.lb,e(cl(.95,1)))}
  }else{
    g.st=0;g.G.rotation.set(0,0,0);g.G.position.set(0,0,0);g.MG.visible=true;g.MG.position.copy(g.mb);
    g.la.position.copy(g.lb);g.la.visible=!g.pistol;
  }
  g.SL.position.z=sl;
}
