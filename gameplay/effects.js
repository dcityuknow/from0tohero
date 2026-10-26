// Vết đạn, máu, vỡ mảnh (particle), rung camera
// ---------------------------------------------------------------------------------------------
// BẢN INSTANCED + POOL:
//  - Toàn bộ giọt máu            = 1 InstancedMesh  = 1 draw call   (trước: 1 mesh / giọt)
//  - Toàn bộ mảnh vỡ + bụi đạn   = 1 InstancedMesh  = 1 draw call   (trước: 1 mesh / mảnh, tới 220 mảnh / bot)
//  - Toàn bộ vết đạn (40 vết)    = 2 InstancedMesh  = 2 draw call   (trước: 80 mesh, tạo geometry/material lười)
//  - Hạt là object dựng sẵn, tái sử dụng (không new Mesh / không S.add / S.remove mỗi hạt) -> hết rác cho GC
// Tên hàm cũ (spawnPart, groundY, tickParts, blood, shatter, hole, quake, applyShake) giữ nguyên chữ ký.
// ---------------------------------------------------------------------------------------------
const FX_BLOOD_MAX=500,FX_SHARD_MAX=700,FX_HOLE_N=40;
// Số mảnh vỡ khi bot chết: 1 = như bản gốc, .6 = còn 60%. Mảnh ít đi thì mỗi mảnh to ra tương ứng (xem 'k' trong shatter) nên bot vẫn vỡ đủ "khối".
const SHARD_K=0.2;
const BLOOD_HEX=[0xd10f2f,0x8f0a22,0xff2a4d];
const bm=BLOOD_HEX.map(c=>new THREE.MeshBasicMaterial({color:c}));   // giữ lại phòng file khác còn tham chiếu
const holes=[];let hi=0;                                              // holes: giữ tên cũ (không còn dùng)
// biến tạm dùng chung (tránh new mỗi lần gọi)
const fx_q=new THREE.Quaternion(),fx_qs=new THREE.Quaternion(),fx_e=new THREE.Euler(),fx_s=new THREE.Vector3(),
  fx_p=new THREE.Vector3(),fx_c=new THREE.Vector3(),fx_m=new THREE.Matrix4(),fx_m2=new THREE.Matrix4(),
  fx_col=new THREE.Color(),fx_d=new THREE.Object3D(),fx_t=new THREE.Matrix4().makeTranslation(0,0,.003);

class FxPool{
  constructor(mat,max){
    this.act=[];this.free=[];this.rr=0;
    for(let i=0;i<max;i++)this.free.push({x:0,y:0,z:0,vx:0,vy:0,vz:0,life:0,bounce:false,fl:undefined,sx:1,sy:1,sz:1,
      qx:0,qy:0,qz:0,qw:1,ax:0,az:0,rx:0,rz:0,r:1,g:1,b:1,rest:false,idx:-1});
    const im=this.mesh=new THREE.InstancedMesh(UG,mat,max);
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.setColorAt(0,fx_col.set(1,1,1));                 // tạo sẵn instanceColor
    im.instanceColor.setUsage(THREE.DynamicDrawUsage);
    im.frustumCulled=false;im.count=0;                  // hạt bay khắp nơi: bounding sphere không đáng tin
    S.add(im);
  }
  add(x,y,z,vx,vy,vz,life,bounce,fl,sx,sy,sz,hex,q){
    let p=this.free.pop(),isNew=true;
    if(!p){p=this.act[(this.rr++)%this.act.length];isNew=false}   // đầy: ghi đè hạt cũ, không tăng bộ nhớ
    p.x=x;p.y=y;p.z=z;p.vx=vx;p.vy=vy;p.vz=vz;p.life=life;p.bounce=!!bounce;p.fl=fl;
    p.sx=sx;p.sy=sy;p.sz=sz;p.ax=0;p.az=0;p.rx=Math.random()*10-5;p.rz=Math.random()*10-5;
    if(q){p.qx=q.x;p.qy=q.y;p.qz=q.z;p.qw=q.w}else{p.qx=p.qy=p.qz=0;p.qw=1}
    fx_col.setHex(hex);p.r=fx_col.r;p.g=fx_col.g;p.b=fx_col.b;
    p.rest=false;p.idx=-1;
    if(isNew)this.act.push(p);
  }
  tick(dt){
    const a=this.act,im=this.mesh;
    for(let i=a.length-1;i>=0;i--){
      const p=a[i];p.life-=dt;
      if(p.life<=0){const last=a.pop();if(last!==p)a[i]=last;this.free.push(p);continue}   // swap-remove O(1)
      if(p.rest)continue;
      p.vy-=16*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.ax+=p.rx*dt;p.az+=p.rz*dt;
      const fl=groundY(p.x,p.y,p.z)+(p.fl!==undefined?p.fl:p.sy*.5);
      if(p.y<fl){p.y=fl;
        if(p.bounce&&Math.abs(p.vy)>1.5){p.vy*=-.35;p.vx*=.6;p.vz*=.6}
        else{p.vx=p.vy=p.vz=0;p.rx=p.rz=0;p.rest=true;p.idx=-1}}   // nằm yên: chỉ ghi ma trận 1 lần nữa
    }
    let dirty=false;
    for(let i=0;i<a.length;i++){
      const p=a[i],fade=p.life<.5;
      if(p.rest&&!fade&&p.idx===i)continue;             // hạt nằm yên, vị trí slot không đổi: khỏi tính lại
      p.idx=i;
      fx_q.set(p.qx,p.qy,p.qz,p.qw);
      if(p.ax!==0||p.az!==0){fx_e.set(p.ax,0,p.az);fx_qs.setFromEuler(fx_e);fx_q.multiply(fx_qs)}
      const k=fade?p.life*2:1;                           // thu nhỏ dần trong 0.5s cuối
      fx_s.set(p.sx*k,p.sy*k,p.sz*k);fx_p.set(p.x,p.y,p.z);
      fx_m.compose(fx_p,fx_q,fx_s);im.setMatrixAt(i,fx_m);
      im.instanceColor.setXYZ(i,p.r,p.g,p.b);dirty=true;
    }
    im.count=a.length;
    if(dirty){im.instanceMatrix.needsUpdate=true;im.instanceColor.needsUpdate=true}
  }
  clear(){const a=this.act;while(a.length)this.free.push(a.pop());this.mesh.count=0}
}
let fxB=null,fxS=null;   // máu (không đổ bóng) · mảnh vỡ + bụi (dùng vật liệu của game)
function fxPools(){
  if(fxB)return;
  fxB=new FxPool(new THREE.MeshBasicMaterial({color:0xffffff}),FX_BLOOD_MAX);
  fxS=new FxPool(M(0xffffff),FX_SHARD_MAX);   // M() cache vật liệu: màu trắng, màu thật nằm ở instanceColor
}
// tương thích file cũ đọc parts.length
const fxL=[];   // hạt dạng MESH THẬT (hình dạng riêng: chốt / vỏ đạn / mảnh ghép do file khác tạo): chạy y như bản cũ, không ép thành khối 1x1x1
const parts={get length(){return (fxB?fxB.act.length:0)+(fxS?fxS.act.length:0)+fxL.length}};
function clearParts(){if(fxB){fxB.clear();fxS.clear()}for(const p of fxL)S.remove(p.m);fxL.length=0}

// Tương thích ngược: file khác (grenade.js, combat.js...) vẫn có thể gọi spawnPart(mesh,...) - mesh được "đọc" rồi bỏ, không S.add
function spawnPart(m,vx,vy,vz,life,bounce,fl){
  if(m.geometry!==UG){   // có hình dạng riêng (hoặc là Group): giữ nguyên mesh, vẽ như cũ
    S.add(m);fxL.push({m,v:new THREE.Vector3(vx,vy,vz),life,bounce,fl,s:m.scale.clone(),r:new THREE.Vector3(Math.random()*10-5,0,Math.random()*10-5),rest:false});return}
  fxPools();
  const hex=m.material&&m.material.color?m.material.color.getHex():0xffffff;
  fxS.add(m.position.x,m.position.y,m.position.z,vx,vy,vz,life,bounce,fl,m.scale.x,m.scale.y,m.scale.z,hex,m.quaternion);
}
// Độ cao mặt đỡ ngay dưới hạt (sàn tầng trên, bục, khối chắn...) - mặc định là sàn tầng 1 (y=0)
function groundY(x,y,z){let g=0;
  bxFresh();   // physics.js: lưới không gian - chỉ xét các khối ở ô chứa (x,z) thay vì quét toàn bộ danh sách
  const a=BXG.map.get(bxKey(Math.floor(x/BXG.cs),Math.floor(z/BXG.cs)));
  if(a)for(let k=0;k<a.length;k++){const b=a[k];if(b.y1>g&&b.y1<=y+.6&&x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1)g=b.y1}
  const big=BXG.big;for(let k=0;k<big.length;k++){const b=big[k];if(b.y1>g&&b.y1<=y+.6&&x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1)g=b.y1}
  return g}
function tickLegacyParts(dt){   // y hệt tickParts của bản gốc
  for(let i=fxL.length-1;i>=0;i--){
    const p=fxL[i],m=p.m;p.life-=dt;
    if(p.life<=0){S.remove(m);fxL.splice(i,1);continue}
    if(!p.rest){
      p.v.y-=16*dt;m.position.addScaledVector(p.v,dt);m.rotation.x+=p.r.x*dt;m.rotation.z+=p.r.z*dt;
      const fl=groundY(m.position.x,m.position.y,m.position.z)+(p.fl!==undefined?p.fl:p.s.y*.5);
      if(m.position.y<fl){m.position.y=fl;if(p.bounce&&Math.abs(p.v.y)>1.5){p.v.y*=-.35;p.v.x*=.6;p.v.z*=.6}else{p.v.set(0,0,0);p.r.set(0,0,0);p.rest=true;m.updateMatrix();m.matrixAutoUpdate=false}}
    }
    if(p.life<.5){m.scale.copy(p.s).multiplyScalar(p.life/.5);if(p.rest)m.updateMatrix()}
  }
}
function tickParts(dt){if(fxB){fxB.tick(dt);fxS.tick(dt)}if(fxL.length)tickLegacyParts(dt)}

function blood(p,n,dir,cnt){
  fxPools();
  for(let i=0;i<cnt;i++){
    const sz=.04+Math.random()*.06,f=Math.random()<.35?dir:n,k=2+Math.random()*4;
    fxB.add(p.x,p.y,p.z,f.x*k+(Math.random()-.5)*3,f.y*k+1.5+Math.random()*2.5,f.z*k+(Math.random()-.5)*3,
      .5+Math.random()*.5,false,undefined,sz,sz,sz,BLOOD_HEX[i%3],null);
  }
}
const fx_up=new THREE.Vector3(0,1,0);
function shatter(b,dir){
  fxPools();
  b.g.updateMatrixWorld(true);
  let total=0;for(const p of b.parts)total+=p.vb.cubes.length;
  const live=parts.length,
    cap=Math.max(8,(live>420?110:live>220?160:220)*SHARD_K),   // đang có nhiều mảnh trên màn: dùng ít mảnh hơn (to hơn); SHARD_K: hệ số chung
    stride=Math.max(1,Math.floor(total/cap)),k=Math.cbrt(stride)*.95;
  const cx=b.x,cy=b.y+.9,cz=b.z;
  let n=0;
  for(const p of b.parts){
    const mesh=p.mesh,cubes=p.vb.cubes,mw=mesh.matrixWorld;
    mesh.getWorldQuaternion(fx_q);                      // 1 lần / bộ phận (trước: 1 lần / mảnh)
    for(let j=0;j<cubes.length;j++){
      if((n++)%stride)continue;
      const c=cubes[j];
      fx_p.set(c.x,c.y,c.z).applyMatrix4(mw);
      const ox=fx_p.x-cx,oy=fx_p.y-cy,oz=fx_p.z-cz;
      fxS.add(fx_p.x,fx_p.y,fx_p.z,
        ox*4+dir.x*4+(Math.random()-.5)*3,oy*3+4+Math.random()*3,oz*4+dir.z*4+(Math.random()-.5)*3,
        2.5+Math.random()*1.5,true,undefined,c.sx*k,c.sy*k,c.sz*k,c.hex,fx_q);
    }
  }
  fx_c.set(cx,cy,cz);blood(fx_c,fx_up,dir,26);
}

// ---- Vết đạn: 40 vết, vòng tròn ghi đè vết cũ. 2 InstancedMesh (viền mờ + lõi tối) ----
let fxHo=null,fxHi=null;
function fxHoles(){
  if(fxHo)return;
  fxHo=new THREE.InstancedMesh(new THREE.CircleGeometry(.1,10),new THREE.MeshBasicMaterial({color:0x8a6f7a,transparent:true,opacity:.5}),FX_HOLE_N);
  fxHi=new THREE.InstancedMesh(new THREE.CircleGeometry(.045,8),new THREE.MeshBasicMaterial({color:0x2b2a3a}),FX_HOLE_N);
  for(const m of [fxHo,fxHi]){m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;m.count=0;S.add(m)}
}
function hole(p,n,col){
  fxHoles();fxPools();
  const i=hi%FX_HOLE_N;hi++;
  fx_d.position.copy(p).addScaledVector(n,.015);
  fx_d.updateMatrixWorld(true);                         // lookAt đọc matrixWorld: phải cập nhật vị trí trước
  fx_p.copy(p).add(n);fx_d.lookAt(fx_p);fx_d.rotateZ(Math.random()*3);fx_d.updateMatrix();
  fxHo.setMatrixAt(i,fx_d.matrix);
  fx_m2.copy(fx_d.matrix).multiply(fx_t);fxHi.setMatrixAt(i,fx_m2);   // lõi nhô lên .003 trước viền
  fxHo.count=fxHi.count=Math.min(hi,FX_HOLE_N);
  fxHo.instanceMatrix.needsUpdate=fxHi.instanceMatrix.needsUpdate=true;
  const hx=col.getHex();
  for(let j=0;j<5;j++){
    const sz=.03+Math.random()*.03;
    fxS.add(p.x,p.y,p.z,n.x*3+(Math.random()-.5)*3,n.y*3+1+Math.random()*2,n.z*3+(Math.random()-.5)*3,
      .6+Math.random()*.4,true,undefined,sz,sz,sz,hx,null);
  }
}
function clearHoles(){hi=0;if(fxHo)fxHo.count=fxHi.count=0}
// ---- Rung camera khi nổ: trauma càng gần càng mạnh, ở xa vẫn rung nhẹ (rung cả map) ----
let shk=0;
function quake(p,pw=1){const d=Math.hypot(p.x-C.position.x,p.y-C.position.y,p.z-C.position.z);shk=Math.min(1.2,Math.max(shk,pw*(.16+1.3/(1+d*d/12))))}
function applyShake(dt){
  if(shk<=0)return;shk=Math.max(0,shk-dt*.55);
  const a=Math.pow(shk,1.5),r=()=>Math.random()-.5;
  C.rotation.x+=r()*.32*a;C.rotation.y+=r()*.32*a;C.rotation.z+=r()*.28*a;
  C.position.x+=r()*.7*a;C.position.y+=r()*.7*a;C.position.z+=r()*.7*a;
}
