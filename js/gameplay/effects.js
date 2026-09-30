// Vết đạn, máu, vỡ mảnh (particle)
// ---- Hiệu ứng: vết đạn, máu, vỡ mảnh, minimap ----
const parts=[],holes=[];let hi=0;
function spawnPart(m,vx,vy,vz,life,bounce,fl){S.add(m);parts.push({m,v:new THREE.Vector3(vx,vy,vz),life,bounce,fl,s:m.scale.clone(),r:new THREE.Vector3(Math.random()*10-5,Math.random()*10-5,Math.random()*10-5)})}
// Độ cao mặt đỡ ngay dưới hạt (sàn tầng trên, bục, khối chắn...) - mặc định là sàn tầng 1 (y=0)
function groundY(x,y,z){let g=0;
  for(const b of boxes)if(b.y1>g&&b.y1<=y+.6&&x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1)g=b.y1;
  return g}
function tickParts(dt){
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i],m=p.m;p.life-=dt;
    if(p.life<=0){S.remove(m);parts.splice(i,1);continue}
    if(!p.rest){
      p.v.y-=16*dt;m.position.addScaledVector(p.v,dt);m.rotation.x+=p.r.x*dt;m.rotation.z+=p.r.z*dt;
      const fl=groundY(m.position.x,m.position.y,m.position.z)+(p.fl!==undefined?p.fl:p.s.y*.5);
      if(m.position.y<fl){m.position.y=fl;if(p.bounce&&Math.abs(p.v.y)>1.5){p.v.y*=-.35;p.v.x*=.6;p.v.z*=.6}else{p.v.set(0,0,0);p.r.set(0,0,0);p.rest=true}}
    }
    if(p.life<.5)m.scale.copy(p.s).multiplyScalar(p.life/.5);
  }
}
const bm=[0xd10f2f,0x8f0a22,0xff2a4d].map(c=>new THREE.MeshBasicMaterial({color:c}));
function blood(p,n,dir,cnt){
  for(let i=0;i<cnt;i++){
    const m=new THREE.Mesh(UG,bm[i%3]),sz=.04+Math.random()*.06,f=Math.random()<.35?dir:n,k=2+Math.random()*4;
    m.scale.set(sz,sz,sz);m.position.copy(p);
    spawnPart(m,f.x*k+(Math.random()-.5)*3,f.y*k+1.5+Math.random()*2.5,f.z*k+(Math.random()-.5)*3,.5+Math.random()*.5,false);
  }
}
function shatter(b,dir){
  b.g.updateMatrixWorld(true);
  const c0=new THREE.Vector3(b.x,b.y+.9,b.z),pp=new THREE.Vector3(),q=new THREE.Quaternion(),all=[];
  for(const p of b.parts)for(const c of p.vb.cubes)all.push([p.mesh,c]);
  const stride=Math.max(1,Math.floor(all.length/220)),k=Math.cbrt(stride)*.95;   // bớt số mảnh, mảnh to hơn cho đỡ nặng
  for(let i=0;i<all.length;i+=stride){
    const [mesh,c]=all[i],m=new THREE.Mesh(UG,M(c.hex));
    pp.set(c.x,c.y,c.z).applyMatrix4(mesh.matrixWorld);mesh.getWorldQuaternion(q);
    m.position.copy(pp);m.quaternion.copy(q);m.scale.set(c.sx*k,c.sy*k,c.sz*k);
    const o=pp.clone().sub(c0);
    spawnPart(m,o.x*4+dir.x*4+(Math.random()-.5)*3,o.y*3+4+Math.random()*3,o.z*4+dir.z*4+(Math.random()-.5)*3,2.5+Math.random()*1.5,true);
  }
  blood(c0,new THREE.Vector3(0,1,0),dir,26);
}
function hole(p,n,col){
  let d=holes[hi%40];
  if(!d){d=new THREE.Group();
    const a=new THREE.Mesh(new THREE.CircleGeometry(.1,10),new THREE.MeshBasicMaterial({color:0x8a6f7a,transparent:true,opacity:.5}));
    const c=new THREE.Mesh(new THREE.CircleGeometry(.045,8),new THREE.MeshBasicMaterial({color:0x2b2a3a}));c.position.z=.003;
    d.add(a,c);S.add(d);holes[hi%40]=d}
  hi++;d.position.copy(p).addScaledVector(n,.015);d.lookAt(p.clone().add(n));d.rotateZ(Math.random()*3);
  for(let i=0;i<5;i++){
    const m=new THREE.Mesh(UG,M(col.getHex())),sz=.03+Math.random()*.03;m.scale.set(sz,sz,sz);m.position.copy(p);
    spawnPart(m,n.x*3+(Math.random()-.5)*3,n.y*3+1+Math.random()*2,n.z*3+(Math.random()-.5)*3,.6+Math.random()*.4,true);
  }
}
// ---- Rung camera khi nổ: trauma càng gần càng mạnh, ở xa vẫn rung nhẹ (rung cả map) ----
let shk=0;
function quake(p,pw=1){const d=Math.hypot(p.x-C.position.x,p.y-C.position.y,p.z-C.position.z);shk=Math.min(1.2,Math.max(shk,pw*(.16+1.3/(1+d*d/12))))}
function applyShake(dt){
  if(shk<=0)return;shk=Math.max(0,shk-dt*.55);
  const a=Math.pow(shk,1.5),r=()=>Math.random()-.5;
  C.rotation.x+=r()*.32*a;C.rotation.y+=r()*.32*a;C.rotation.z+=r()*.28*a;
  C.position.x+=r()*.7*a;C.position.y+=r()*.7*a;C.position.z+=r()*.7*a;
}
