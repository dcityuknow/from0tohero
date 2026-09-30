// Bắn súng, tia đạn, sát thương
const tracer=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:0xffe066}));
tracer.visible=false;tracer.frustumCulled=false;S.add(tracer);
const spark=new THREE.Mesh(new THREE.SphereGeometry(.12,6,6),new THREE.MeshBasicMaterial({color:0xffe066}));spark.visible=false;S.add(spark);
let fx=0;
const rc=new THREE.Raycaster();
function shoot(){
  const w=W[cur];
  if(cur==='grenade'||cd>0||rel>0)return;
  if(ammos[cur]<=0){if(reserve[cur]>0)reload();else{snd(90,.05,'square',.04);cd=.3;showMsg(t('noammo',t(cur)))}return}
  ammos[cur]--;cd=w.rate;if(cur==='sniper')sniperShot();else gunShot(cur);
  const sp=(cur==='sniper'&&scoped)?0:w.sp;rc.setFromCamera({x:(Math.random()-.5)*sp*2,y:(Math.random()-.5)*sp*2},C);
  const hs=rc.intersectObjects(meshes.concat(botMeshes.filter(m=>m.userData.bot.on&&m.userData.bot.hp>0)),false);
  const from=muzzle.getWorldPosition(new THREE.Vector3());
  let to=rc.ray.at(60,new THREE.Vector3()),col=0xffe066;
  const h=hs.find(x=>{const b=x.object.userData.bot;return !b||b.hp>0});
  const wh=window.Nature&&Nature.rayWater?Nature.rayWater(rc.ray,h?h.distance:60):null;   // đạn xuống nước trước khi chạm gì khác
  if(wh){to=wh.point;col=0x9fd8ff;Nature.bulletSplash(wh.point.x,wh.point.y,wh.point.z)}
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
