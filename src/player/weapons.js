// Mô hình 4 vũ khí cầm trên tay (dùng lõi voxel.js)
// ---- Súng ngắn (kiểu Desert Eagle: thân trắng bạc, viền cam) ----
function buildPistol(G,MG,SL){
  const f=new VB(),s=new VB(),m=new VB();
  G.add(arm(.24,-.3,-.45,.35,.18));
  // nòng trượt
  s.box(.22,-.14,-.64,.085,.07,.44,(i,j,k,nx,ny,nz)=>j===ny-1?0xe9eef5:(k>=nz-5&&(k&1))?0x9aa6b8:0xf4f7fb,.02);
  s.box(.22,-.103,-.66,.03,.012,.3,0xff8a2a,.012);
  s.box(.22,-.09,-.83,.018,.026,.02,0xff6a1a,.01);
  s.box(.203,-.093,-.45,.014,.03,.02,0x2b2a3a,.01);s.box(.237,-.093,-.45,.014,.03,.02,0x2b2a3a,.01);
  s.box(.2655,-.135,-.6,.006,.03,.09,0x2b2a3a,.008);
  s.box(.22,-.14,-.868,.04,.035,.016,0x2b2a3a,.01);
  s.box(.22,-.108,-.418,.02,.03,.02,0x2b2a3a,.01);
  // khung + vòng cò
  f.box(.22,-.2,-.62,.075,.05,.4,chk(0x5a6b85,0x4b5b75),.02);
  f.box(.22,-.2,-.815,.078,.052,.03,0xff8a2a,.015);
  f.box(.22,-.262,-.56,.03,.012,.12,0x3a4358,.012);f.box(.22,-.236,-.615,.03,.05,.012,0x3a4358,.012);
  f.box(.22,-.235,-.5,.014,.04,.014,0x2b2a3a,.01);
  // báng cầm nghiêng, chia ô cam/đen
  for(let k=0;k<5;k++)f.box(.22,-.24-.033*k,-.455+.011*k,.072,.035,.085,chk(0xff8a2a,0x3a4358),.017);
  // hộp đạn
  m.box(0,0,0,.066,.075,.078,chk(0x4d9dff,0x3a7fe0),.016);m.box(0,-.043,0,.078,.014,.09,0xff8a2a,.014);
  MG.position.set(.22,-.425,-.415);
  G.add(f.mesh());SL.add(s.mesh());MG.add(m.mesh());
  return {la:arm(-.28,-.7,-.4,.5,-.3,true),lt:new THREE.Vector3(.2,-.45,-.47),mz:[.22,-.14,-.9],sg:new THREE.Vector3(.17,-.11,-.42)};
}

// ---- Súng dài (tiểu liên vàng-đen, vòng ngắm tròn) ----
function buildRifle(G,MG,SL){
  const f=new VB(),s=new VB(),m=new VB();
  G.add(arm(.2,-.3,-.42,.4,.15));
  f.box(.14,-.19,-.6,.1,.1,.52,YLC,.026);
  f.box(.192,-.19,-.6,.008,.04,.3,0x4d9dff,.01);f.box(.088,-.19,-.6,.008,.04,.3,0x4d9dff,.01);
  f.box(.14,-.25,-.56,.09,.03,.36,DKC,.02);
  f.box(.14,-.195,-1.06,.09,.09,.42,DKC,.022);
  f.box(.14,-.195,-.92,.1,.1,.03,0xff9a3c,.02);f.box(.14,-.195,-1.24,.1,.1,.03,0xff9a3c,.02);
  f.cyl(.14,-.195,-1.44,.02,.3,DKC,.012,'z');
  f.cyl(.14,-.195,-1.61,.03,.05,0xffd23f,.014,'z');
  f.cyl(.14,-.125,-1.38,.028,.014,0x2b2a3a,.01,'z',.016);f.box(.14,-.165,-1.38,.014,.024,.014,0x2b2a3a,.01);
  f.cyl(.14,-.105,-.72,.03,.014,0x2b2a3a,.01,'z',.018);f.box(.14,-.138,-.72,.016,.012,.016,0x2b2a3a,.01);
  for(let k=0;k<5;k++)f.box(.14,-.29-.03*k,-.44+.012*k,.06,.03,.075,chk(0x3a3850,0xff9a3c),.015);
  f.box(.14,-.2,-.31,.07,.1,.14,DKC,.024);
  s.box(.14,-.13,-.6,.075,.024,.4,DKC,.02);s.box(.2,-.17,-.66,.03,.03,.05,0xff9a3c,.015);
  for(let k=0;k<5;k++)m.box(0,-.032*k,-.006*k*k,.05,.034,.075,k===4?0xff9a3c:YLC,.017);
  MG.position.set(.14,-.29,-.62);
  G.add(f.mesh());SL.add(s.mesh());MG.add(m.mesh());
  return {la:arm(.06,-.3,-.95,.4,-.2,true),lt:new THREE.Vector3(.14,-.44,-.62),mz:[.14,-.195,-1.66],sg:new THREE.Vector3(.1,-.12,-.46)};
}

// Mảng kính ống ngắm: đen, hơi trong suốt (dùng chung cho mọi lần dựng súng ngắm)
const GLASS_M=new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.72,depthWrite:false});
const GLASS_G=new THREE.CircleGeometry(1,28);
function scopeLens(x,y,z,r){const m=new THREE.Mesh(GLASS_G,GLASS_M);m.scale.setScalar(r);m.position.set(x,y,z);m.renderOrder=3;return m}   // mặt phẳng quay về phía người chơi (+z)

// ---- Súng ngắm (ống ngắm lớn, nòng dài có giảm thanh) ----
function buildSniper(G,MG,SL){
  const f=new VB(),s=new VB(),m=new VB();
  G.add(arm(.2,-.3,-.42,.4,.15));
  f.box(.14,-.2,-.7,.09,.12,.7,DKC,.024);
  f.box(.187,-.2,-.72,.008,.07,.4,0x4d9dff,.01);f.box(.093,-.2,-.72,.008,.07,.4,0x4d9dff,.01);
  f.cyl(.14,-.195,-1.55,.025,.9,DKC,.014,'z');
  f.cyl(.14,-.195,-1.3,.03,.03,0xffd23f,.014,'z');f.cyl(.14,-.195,-1.6,.03,.03,0xffd23f,.014,'z');
  f.cyl(.14,-.195,-2.05,.035,.12,(a,b,l)=>l&1?0xffd23f:0xf2b84b,.014,'z');
  f.box(.14,-.235,-1.25,.075,.05,.4,chk(0x4d9dff,0x3a7fe0),.02);
  // ống ngắm
  f.cyl(.14,-.1,-.78,.032,.42,DKC,.016,'z');
  f.cyl(.14,-.1,-.98,.045,.1,0x2b2a3a,.016,'z');
  f.cyl(.14,-.1,-.54,.04,.08,0x2b2a3a,.016,'z');
  f.cyl(.14,-.058,-.78,.014,.03,0xffd23f,.01,'y');f.cyl(.174,-.1,-.78,.014,.03,0xffd23f,.01,'x');
  f.box(.14,-.145,-.68,.04,.05,.05,DKC,.014);f.box(.14,-.145,-.88,.04,.05,.05,DKC,.014);
  for(let k=0;k<5;k++)f.box(.14,-.29-.03*k,-.42+.012*k,.06,.03,.075,chk(0x3a3850,0x4d9dff),.015);
  f.box(.14,-.18,-.24,.075,.15,.18,DKC,.024);f.box(.14,-.11,-.26,.06,.03,.12,0x4d9dff,.015);
  G.add(scopeLens(.14,-.1,-.496,.036),scopeLens(.14,-.1,-1.036,.042));   // kính sau (mắt nhìn) + kính trước
  // chốt bolt
  s.box(.19,-.15,-.55,.05,.02,.02,0xc9c9d6,.012);s.cyl(.225,-.15,-.55,.016,.03,0xffd23f,.012,'x');
  m.box(0,0,0,.07,.1,.1,YLC,.02);
  MG.position.set(.14,-.31,-.72);
  G.add(f.mesh());SL.add(s.mesh());MG.add(m.mesh());
  return {la:arm(.06,-.3,-1.0,.4,-.2,true),lt:new THREE.Vector3(.14,-.42,-.72),mz:[.14,-.195,-2.14],sg:new THREE.Vector3(.22,-.13,-.5),ads:new THREE.Vector3(-.14,.1,.43)};   // ads: độ dời của súng để mắt kính sau trùng tâm camera
}

// ---- Lựu đạn (kiểu MK2 "quả dứa": thân xanh ô-liu chia ô, cần gạt, chốt vòng) ----
// Lựu đạn MK2 dùng chung cho cả tay cầm và vật phẩm dưới đất
function voxGrenade(s,cx,cy,cz,pin=true){
  s.ell(cx,cy,cz,.058,.075,.058,(i,j,k)=>(i%3===0||j%3===0||k%3===0)?0x3f5a2c:0x6b8a45,.018);
  s.cyl(cx,cy+.062,cz,.03,.012,0xffc93a,.012,'y');
  s.cyl(cx,cy+.085,cz,.022,.03,0x8a8f96,.012,'y');s.cyl(cx,cy+.11,cz,.017,.025,0x5b6068,.012,'y');
  if(pin)voxPin(s,cx,cy,cz);
  s.box(cx+.05,cy+.09,cz,.06,.014,.03,0xa9adb5,.01);s.box(cx+.068,cy+.02,cz,.012,.15,.03,0xa9adb5,.01);
}
// Chốt + vòng kéo tách riêng để có thể giật ra khi ném
function voxPin(s,cx,cy,cz){s.cyl(cx-.035,cy+.115,cz,.03,.01,0xd8d8e0,.01,'z',.02);s.box(cx-.005,cy+.115,cz,.03,.01,.01,0xd8d8e0,.008)}
function buildGrenade(G,MG,SL){
  const s=new VB(),p=new VB(),PN=new THREE.Group();
  G.add(arm(.2,-.3,-.42,.4,.15));
  voxGrenade(s,.2,-.22,-.5,false);voxPin(p,.2,-.22,-.5);
  SL.add(s.mesh());PN.add(p.mesh());G.add(PN);
  const la=arm(-.28,-.7,-.4,.5,-.3,true);la.visible=false;   // tay trái giật chốt
  return {la,pn:PN,lt:new THREE.Vector3(),mz:[.2,-.2,-.6]};
}
