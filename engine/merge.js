// engine/merge.js - nạp NGAY SAU engine/voxel.js trong loader.js
// 1) voxelGeometry(cubes)  : danh sách khối {x,y,z,sx,sy,sz,hex} -> 1 BufferGeometry, bỏ mặt bị khối khác che, màu theo đỉnh
// 2) mergeStatic(root,opt) : gộp các mesh TĨNH dưới root theo vùng (chunk) + vật liệu; khối UG thì bỏ mặt bị che
const FXF=[   // [nx,ny,nz, 4 góc (ngược chiều kim đồng hồ nhìn từ ngoài)]
  [1,0,0,  1,-1,-1,  1,1,-1,  1,1,1,  1,-1,1],
  [-1,0,0, -1,-1,1,  -1,1,1,  -1,1,-1, -1,-1,-1],
  [0,1,0,  -1,1,1,   1,1,1,   1,1,-1,  -1,1,-1],
  [0,-1,0, -1,-1,-1, 1,-1,-1, 1,-1,1,  -1,-1,1],
  [0,0,1,  -1,-1,1,  1,-1,1,  1,1,1,   -1,1,1],
  [0,0,-1, 1,-1,-1,  -1,-1,-1,-1,1,-1, 1,1,-1]];
const FX_TRI=[0,1,2,0,2,3],FX_BIG=4096;   // khối chiếm quá FX_BIG ô đơn vị: coi như "to", không dùng để che / không bị che
const mgKey=(x,y,z)=>((x+4096)*8192+(y+4096))*8192+(z+4096);
const mgCell=(v,u)=>Math.floor(v/u+1e-4);
function cubeCells(c,u){return [Math.max(1,Math.round(c.sx/u)),Math.max(1,Math.round(c.sy/u)),Math.max(1,Math.round(c.sz/u))]}
// Tập ô đã bị chiếm (lưới có cạnh u). u mặc định = cạnh nhỏ nhất của mọi khối.
function voxelOcc(cubes,u){
  const occ=new Set();
  for(const c of cubes){
    const [nx,ny,nz]=cubeCells(c,u);if(nx*ny*nz>FX_BIG)continue;
    const x0=c.x-c.sx/2+u/2,y0=c.y-c.sy/2+u/2,z0=c.z-c.sz/2+u/2;
    for(let i=0;i<nx;i++)for(let j=0;j<ny;j++)for(let k=0;k<nz;k++)occ.add(mgKey(mgCell(x0+i*u,u),mgCell(y0+j*u,u),mgCell(z0+k*u,u)));
  }
  return occ}
function faceHidden(c,u,f,occ){   // mặt bị che khi MỌI ô ngay phía ngoài mặt đó đều đã có khối
  const nn=cubeCells(c,u);if(nn[0]*nn[1]*nn[2]>FX_BIG)return false;
  const o=[c.x-c.sx/2+u/2,c.y-c.sy/2+u/2,c.z-c.sz/2+u/2],ax=f[0]?0:f[1]?1:2,s=f[0]+f[1]+f[2],a1=(ax+1)%3,a2=(ax+2)%3,p=[0,0,0];
  p[ax]=o[ax]+(s>0?nn[ax]*u:-u);
  for(let i=0;i<nn[a1];i++)for(let j=0;j<nn[a2];j++){
    p[a1]=o[a1]+i*u;p[a2]=o[a2]+j*u;
    if(!occ.has(mgKey(mgCell(p[0],u),mgCell(p[1],u),mgCell(p[2],u))))return false}
  return true}
function voxelGeometry(cubes,opt){
  opt=opt||{};
  let u=opt.u;if(!u){u=Infinity;for(const c of cubes)u=Math.min(u,c.sx,c.sy,c.sz)}
  const occ=opt.occ||voxelOcc(cubes,u),pos=[],nor=[],col=[],cl=new THREE.Color();
  for(const c of cubes){
    cl.setHex(c.hex===undefined?0xffffff:c.hex);const hx=c.sx/2,hy=c.sy/2,hz=c.sz/2;
    for(const f of FXF){
      if(faceHidden(c,u,f,occ))continue;
      for(let t=0;t<6;t++){const k=3+FX_TRI[t]*3;
        pos.push(c.x+f[k]*hx,c.y+f[k+1]*hy,c.z+f[k+2]*hz);nor.push(f[0],f[1],f[2]);col.push(cl.r,cl.g,cl.b)}
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  g.computeBoundingSphere();g.computeBoundingBox();return g}
// vật liệu cho geometry voxelGeometry: lấy đúng kiểu vật liệu của game (M) nhưng màu lấy từ đỉnh
let _vmat=null;
function voxelMaterial(){if(!_vmat){_vmat=M(0xffffff).clone();_vmat.color.set(0xffffff);_vmat.vertexColors=true;_vmat.needsUpdate=true}return _vmat}

// ---- gộp các mesh tĩnh -----------------------------------------------------------------------------------------
// root : Group chứa map (vd. group của 1 tầng). Mesh gộp được thêm vào root, mesh gốc bị gỡ khỏi scene.
// opt  : chunk (cạnh vùng, mặc định 32) · skip(mesh) -> true để GIỮ NGUYÊN mesh đó
// KHÔNG gộp: mesh động (cửa, cổng, nước, cây đung đưa, thứ gì code khác còn giữ tham chiếu để di chuyển/ẩn),
//   mesh trong suốt, InstancedMesh, mesh ở layer khác 0, mesh trong nhóm đang ẩn. Đánh dấu mesh cần giữ: mesh.userData.keep=true.
function mergeStatic(root,opt){
  opt=opt||{};const chunk=opt.chunk||32,skip=opt.skip;
  root.updateMatrixWorld(true);
  const inv=new THREE.Matrix4().copy(root.matrixWorld).invert();
  const bb=UG.boundingBox||(UG.computeBoundingBox(),UG.boundingBox);
  const ugOK=Math.abs(bb.min.x+.5)<1e-3&&Math.abs(bb.max.x-.5)<1e-3&&Math.abs(bb.min.y+.5)<1e-3&&Math.abs(bb.max.y-.5)<1e-3&&Math.abs(bb.min.z+.5)<1e-3&&Math.abs(bb.max.z-.5)<1e-3;
  const cubeB=new Map(),geoB=new Map(),used=[],allCubes=[];
  const P=new THREE.Vector3(),Q=new THREE.Quaternion(),Sc=new THREE.Vector3(),L=new THREE.Matrix4();
  const shown=m=>{for(let o=m;o&&o!==root;o=o.parent)if(!o.visible)return false;return true};
  root.traverse(m=>{
    if(!m.isMesh||m.isInstancedMesh||m.isSkinnedMesh||m.layers.mask!==1||m.userData.keep||Array.isArray(m.material)||(skip&&skip(m)))return;
    const mt=m.material,g=m.geometry;
    if(!mt||mt.transparent||!g||!g.attributes.position||!shown(m))return;
    L.multiplyMatrices(inv,m.matrixWorld);L.decompose(P,Q,Sc);
    const cx=Math.floor(P.x/chunk),cy=Math.floor(P.y/chunk),cz=Math.floor(P.z/chunk),sh=(m.castShadow?1:0)+(m.receiveShadow?2:0);
    if(ugOK&&g===UG&&!mt.map&&mt.color&&Math.abs(Q.x)+Math.abs(Q.y)+Math.abs(Q.z)<1e-4&&Sc.x>0&&Sc.y>0&&Sc.z>0){   // khối trục thẳng: bỏ mặt bị che
      const key=mt.type+'|'+sh+'|'+cx+'|'+cy+'|'+cz;let b=cubeB.get(key);
      if(!b){b={mt,sh,cubes:[]};cubeB.set(key,b)}
      const c={x:P.x,y:P.y,z:P.z,sx:Sc.x,sy:Sc.y,sz:Sc.z,hex:mt.color.getHex()};b.cubes.push(c);allCubes.push(c);used.push(m);return}
    const key=mt.uuid+'|'+sh+'|'+cx+'|'+cy+'|'+cz;let b=geoB.get(key);
    if(!b){b={mt,sh,items:[]};geoB.set(key,b)}
    b.items.push({g,M:L.clone()});used.push(m);
  });
  const made=[];
  if(allCubes.length){
    let u=Infinity;for(const c of allCubes)u=Math.min(u,c.sx,c.sy,c.sz);
    const occ=voxelOcc(allCubes,u);                      // che mặt xuyên qua ranh giới vùng (mặt giữa 2 chunk cũng bị bỏ)
    for(const b of cubeB.values()){
      const m=b.mt.clone();m.color.set(0xffffff);m.vertexColors=true;m.needsUpdate=true;
      const mesh=new THREE.Mesh(voxelGeometry(b.cubes,{u,occ}),m);mesh.castShadow=!!(b.sh&1);mesh.receiveShadow=!!(b.sh&2);made.push(mesh)}
  }
  for(const b of geoB.values()){const mesh=new THREE.Mesh(fxMergeGeo(b.items,b.mt),b.mt);mesh.castShadow=!!(b.sh&1);mesh.receiveShadow=!!(b.sh&2);made.push(mesh)}
  for(const m of used)if(m.parent)m.parent.remove(m);
  for(const m of made){m.userData.merged=true;root.add(m)}
  return {before:used.length,after:made.length,meshes:made}}
function fxMergeGeo(items,mt){
  let n=0,needN=false;
  for(const it of items){const g=it.g;n+=g.index?g.index.count:g.attributes.position.count;if(!g.attributes.normal)needN=true}
  const pos=new Float32Array(n*3),nor=new Float32Array(n*3),uv=mt.map?new Float32Array(n*2):null,col=mt.vertexColors?new Float32Array(n*3).fill(1):null;
  const v=new THREE.Vector3(),nm=new THREE.Matrix3();let w=0;
  for(const it of items){
    const g=it.g,pa=g.attributes.position,na=g.attributes.normal,ua=g.attributes.uv,ca=g.attributes.color,ix=g.index,cnt=ix?ix.count:pa.count;
    nm.getNormalMatrix(it.M);
    for(let i=0;i<cnt;i++,w++){
      const j=ix?ix.getX(i):i;
      v.fromBufferAttribute(pa,j).applyMatrix4(it.M);pos[w*3]=v.x;pos[w*3+1]=v.y;pos[w*3+2]=v.z;
      if(na){v.fromBufferAttribute(na,j).applyMatrix3(nm).normalize();nor[w*3]=v.x;nor[w*3+1]=v.y;nor[w*3+2]=v.z}
      if(uv&&ua){uv[w*2]=ua.getX(j);uv[w*2+1]=ua.getY(j)}
      if(col&&ca){col[w*3]=ca.getX(j);col[w*3+1]=ca.getY(j);col[w*3+2]=ca.getZ(j)}
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  if(needN)g.computeVertexNormals();else g.setAttribute('normal',new THREE.BufferAttribute(nor,3));
  if(uv)g.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  if(col)g.setAttribute('color',new THREE.BufferAttribute(col,3));
  g.computeBoundingSphere();g.computeBoundingBox();return g}

// ---- Bỏ mặt bị che cho geometry voxel BẤT KỲ (không cần biết nó được dựng thế nào) ------------------------------
// Giả định geometry gồm các "mặt vuông" 6 đỉnh liên tiếp (2 tam giác: 0,1,2 · 0,2,3) - đúng với bộ dựng voxel và BoxGeometry.toNonIndexed().
// Hai mặt trùng khít 4 góc nhưng quay ngược chiều nhau = mặt chung giữa 2 khối kề nhau => cả hai nằm trong lòng, xóa cả hai.
// Mặt nào không phải hình vuông / không có "song sinh" thì giữ nguyên, nên hình ảnh KHÔNG đổi (chỉ bớt tam giác).
// Bỏ qua geometry có groups (nhiều vật liệu). Trả về số mặt đã xóa. Gọi ngay sau khi dựng, TRƯỚC lần vẽ đầu tiên.
const cfH1=(x,y,z)=>{let h=Math.imul(x,73856093)^Math.imul(y,19349663)^Math.imul(z,83492791);h^=h>>>13;h=Math.imul(h,0x5bd1e995);return h^(h>>>15)};
const cfH2=(x,y,z)=>{let h=Math.imul(x^0x9e3779b9,0x85ebca6b)^Math.imul((y+0x7f4a7c15)|0,0xc2b2ae35)^Math.imul((z+0x165667b1)|0,0x27d4eb2f);h^=h>>>16;h=Math.imul(h,0x45d9f3b);return h^(h>>>13)};
function cullHiddenFaces(g,eps){
  let pa=g&&g.attributes&&g.attributes.position;
  if(!pa||(g.groups&&g.groups.length))return 0;
  for(const k in g.attributes)if(g.attributes[k].isInterleavedBufferAttribute)return 0;
  if(g.index){const ng=g.toNonIndexed();g.index=null;for(const k in ng.attributes)g.setAttribute(k,ng.attributes[k]);pa=g.attributes.position}
  const n=pa.count;if(n%6)return 0;
  const F=n/6,q=1/(eps||1e-3),nrm=new Float32Array(F*3),dead=new Uint8Array(F),map=new Map(),c=new Int32Array(12);
  for(let f=0;f<F;f++){
    const o=f*6;let m=0;
    for(let k=0;k<6;k++){
      const x=Math.round(pa.getX(o+k)*q),y=Math.round(pa.getY(o+k)*q),z=Math.round(pa.getZ(o+k)*q);
      let d=false;for(let e=0;e<m;e++)if(c[e*3]===x&&c[e*3+1]===y&&c[e*3+2]===z){d=true;break}
      if(!d){if(m===4){m=5;break}c[m*3]=x;c[m*3+1]=y;c[m*3+2]=z;m++}}
    if(m!==4)continue;                              // không phải hình vuông: giữ nguyên
    let s1=0,s2=0;for(let e=0;e<4;e++){s1=(s1+cfH1(c[e*3],c[e*3+1],c[e*3+2]))|0;s2=(s2+cfH2(c[e*3],c[e*3+1],c[e*3+2]))|0}   // tổng giao hoán: không phụ thuộc thứ tự góc
    const key=(s1&0x1fffff)*4294967296+(s2>>>0);
    const ux=pa.getX(o+1)-pa.getX(o),uy=pa.getY(o+1)-pa.getY(o),uz=pa.getZ(o+1)-pa.getZ(o),
      vx=pa.getX(o+2)-pa.getX(o),vy=pa.getY(o+2)-pa.getY(o),vz=pa.getZ(o+2)-pa.getZ(o),
      nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,l=Math.hypot(nx,ny,nz)||1;
    nrm[f*3]=nx/l;nrm[f*3+1]=ny/l;nrm[f*3+2]=nz/l;
    const a=map.get(key);if(a===undefined)map.set(key,f);else if(a>=0){   // lần thứ 2 gặp cùng khóa: xét cặp
      const dot=nrm[a*3]*nrm[f*3]+nrm[a*3+1]*nrm[f*3+1]+nrm[a*3+2]*nrm[f*3+2];
      if(dot<-.5){dead[a]=dead[f]=1;map.set(key,-1)}else map.set(key,-2)}   // -1: đã ghép · -2: trùng khác chiều (giữ nguyên, không đụng nữa)
    else map.set(key,-2)}
  let removed=0;for(let f=0;f<F;f++)removed+=dead[f];
  if(!removed)return 0;
  const kept=F-removed;
  for(const name of Object.keys(g.attributes)){
    const a=g.attributes[name],is=a.itemSize,out=new a.array.constructor(kept*6*is);let w=0;
    for(let f=0;f<F;f++){if(dead[f])continue;out.set(a.array.subarray(f*6*is,(f*6+6)*is),w);w+=6*is}
    g.setAttribute(name,new THREE.BufferAttribute(out,is,a.normalized))}
  return removed}
