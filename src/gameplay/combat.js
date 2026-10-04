// Bắn súng, tia đạn, sát thương
const tracer=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:0xffe066}));
tracer.visible=false;tracer.frustumCulled=false;S.add(tracer);
const spark=new THREE.Mesh(new THREE.SphereGeometry(.12,6,6),new THREE.MeshBasicMaterial({color:0xffe066}));spark.visible=false;S.add(spark);
let fx=0;
const rc=new THREE.Raycaster();
// Lọc trước các mesh có thể trúng tia: bỏ mesh nằm quá xa (> tầm đạn 60m) hoặc hình cầu bao không cắt tia -> không phải duyệt tam giác của chúng
const _rs=new THREE.Sphere();
function rayTargets(ray,far){
  const out=[];
  for(const m of meshes){
    const g=m.geometry;if(!g.boundingSphere)g.computeBoundingSphere();
    _rs.copy(g.boundingSphere).applyMatrix4(m.matrixWorld);
    if(_rs.center.distanceToSquared(ray.origin)>(far+_rs.radius)*(far+_rs.radius)||!ray.intersectsSphere(_rs))continue;
    out.push(m);
  }
  for(const m of botMeshes){const b=m.userData.bot;if(b.on&&b.hp>0&&!b.ally)out.push(m)}
  return out;
}
function shoot(){
  const w=W[cur];
  if(cur==='grenade'||cd>0||rel>0)return;
  if(ammos[cur]<=0){if(reserve[cur]>0)reload();else{snd(90,.05,'square',.04);cd=.3;showMsg(t('noammo',t(cur)))}return}
  ammos[cur]--;cd=w.rate;if(cur==='sniper')sniperShot();else gunShot(cur);
  const sp=(cur==='sniper'&&scoped)?0:w.sp;rc.setFromCamera({x:(Math.random()-.5)*sp*2,y:(Math.random()-.5)*sp*2},C);
  const hs=rc.intersectObjects(rayTargets(rc.ray,60),false);
  const from=muzzle.getWorldPosition(new THREE.Vector3());
  let to=rc.ray.at(60,new THREE.Vector3()),col=0xffe066;
  const h=hs.find(x=>{const b=x.object.userData.bot;return !b||b.hp>0});
  const wh=window.Nature&&Nature.rayWater?Nature.rayWater(rc.ray,h?h.distance:60):null;   // đạn xuống nước trước khi chạm gì khác
  if(cur==='sniper'){   // súng ngắm: đạn XUYÊN quái (xuyên được nhiều con trên đường đạn), chỉ dừng ở tường / mặt nước. Quái thường trúng là chết ngay 1 viên; boss vẫn trừ máu theo sát thương
    const wall=hs.find(x=>!x.object.userData.bot),lim=wall?wall.distance:60;
    const sw=window.Nature&&Nature.rayWater?Nature.rayWater(rc.ray,lim):null,end=sw?sw.distance:lim,seen=new Set();
    for(const x of hs){
      if(x.distance>end)break;
      const b=x.object.userData.bot;if(!b||b.hp<=0||seen.has(b))continue;seen.add(b);
      const hd=x.object.userData.head,n=x.face.normal.clone().transformDirection(x.object.matrixWorld);
      if(b.boss)b.hp-=hd?w.hd:w.dmg;else b.hp=0;
      col=0xff3355;snd(180,.1,'sawtooth',.07*GV,x.point);blood(x.point,n,rc.ray.direction,hd?18:11);
      if(b.hp<=0)killBot(b,rc.ray.direction);
    }
    if(sw){to=sw.point;col=0x9fd8ff;Nature.bulletSplash(sw.point.x,sw.point.y,sw.point.z)}
    else if(wall){
      to=wall.point;const n=wall.face.normal.clone().transformDirection(wall.object.matrixWorld);
      hole(wall.point,n,(Array.isArray(wall.object.material)?wall.object.material[0]:wall.object.material).color);
    }
  }
  else if(wh){to=wh.point;col=0x9fd8ff;Nature.bulletSplash(wh.point.x,wh.point.y,wh.point.z)}
  else if(h){
    to=h.point;const b=h.object.userData.bot,n=h.face.normal.clone().transformDirection(h.object.matrixWorld);
    if(b){
      const hd=h.object.userData.head;b.hp-=hd?w.hd:w.dmg;col=0xff3355;snd(180,.1,'sawtooth',.07*GV,h.point);
      blood(h.point,n,rc.ray.direction,hd?18:11);
      if(b.hp<=0)killBot(b,rc.ray.direction);
    }else hole(h.point,n,(Array.isArray(h.object.material)?h.object.material[0]:h.object.material).color);
  }
  tracer.geometry.setFromPoints([from,to]);tracer.visible=true;
  spark.material.color.set(col);spark.position.copy(to);spark.visible=true;fx=.06;
  flash.visible=true;vm.position.z=cur==='sniper'?.14:.07;vm.rotation.x=.04;boltMax=cur==='sniper'?.9:.15;bolt=boltMax;
}
