// Quản lý tầng: chuyển tầng (nạp / dỡ tầng: world/floors.js), thanh máu boss, đạn của boss, cổng khóa. Nạp CUỐI nhóm entities vì gọi setupFloor() ngay khi tải.
let lk=0;

// ---- ĐẠN BOSS VẼ BẰNG InstancedMesh ----
// Nơi sinh đạn (boss.js, bot-throw.js...) vẫn tạo p.m như cũ. Lần đầu thấy viên đạn, ta "nhận" mesh đó: lấy hình dạng + vật liệu +
// hướng + tỉ lệ, gỡ khỏi scene, rồi vẽ cùng các viên giống nhau bằng 1 InstancedMesh (nhóm theo geometry + loại + màu vật liệu).
// Nếu nơi sinh đạn tạo geometry mới cho MỖI viên (số nhóm vượt BUL_MAXG) thì viên đó chạy cách cũ (không instanced) để không phình bộ nhớ.
const BUL_CAP=64,BUL_MAXG=16,BUL_INST=true;   // BUL_INST=false -> tắt hoàn toàn, quay về cách cũ
const bulGrp=new Map(),bul_p=new THREE.Vector3(),bul_m=new THREE.Matrix4();
function bulKey(m){const t=m.material;return m.geometry.uuid+'|'+t.type+'|'+(t.color?t.color.getHex():0)}
function bulGet(m){
  const key=bulKey(m);let o=bulGrp.get(key);
  if(!o){
    if(bulGrp.size>=BUL_MAXG)return null;
    const im=new THREE.InstancedMesh(m.geometry,m.material,BUL_CAP);
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);im.frustumCulled=false;im.count=0;S.add(im);
    o={im,n:0};bulGrp.set(key,o);
  }
  return o}
function bulDraw(p){   // true = đã vẽ bằng instanced
  if(!BUL_INST||p.fb)return false;
  if(!p.o){
    const m=p.m;
    if(!m||!m.geometry||!m.material||Array.isArray(m.material)){p.fb=true;return false}
    const o=bulGet(m);if(!o){p.fb=true;return false}
    p.o=o;p.q=m.quaternion.clone();p.sc=m.scale.clone();S.remove(m);
  }
  const o=p.o;if(o.n>=BUL_CAP)return true;
  bul_p.set(p.x,p.y,p.z);bul_m.compose(bul_p,p.q,p.sc);o.im.setMatrixAt(o.n++,bul_m);return true}
function clearBul(){for(const p of bul)if(!p.o&&p.m)S.remove(p.m);bul.length=0;for(const o of bulGrp.values())o.im.count=0}   // gọi trong restart()

function tickBoss(dt){
  if(!playing)return;
  let nf=flOf(P.y+.05);if(nf<curFl&&P.y>=FY(curFl)-SLAB)nf=curFl;   // lặn dưới đáy sông tầng trên (trong lòng tấm sàn dày SLAB) vẫn tính là tầng đó, chỉ xuống tầng dưới khi thật sự qua khỏi đáy sàn
  if(nf!==curFl){FM.enter(nf);curFl=nf;setupFloor()}   // FM.enter: bảo đảm tầng mới đã được dựng TRƯỚC khi sinh quái (fSpawns cần cây / sông của tầng đó)
  FM.tick(dt);
  tickSpawn(dt);
  const bo=boss.on&&boss.hp>0;talkTick(dt,bo);botTalkTick(dt);bb.style.display='block';$('bbw').style.display=bo?'block':'none';
  $('bbn').textContent=bo?bname(boss.fl):bossDone[curFl]?t('floorclear',curFl+1):t('floor',curFl+1,fk[curFl],need(curFl));
  if(bo)$('bbf').style.width=Math.max(0,boss.hp/boss.maxhp*100)+'%';
  for(const o of bulGrp.values())o.n=0;
  for(let i=bul.length-1;i>=0;i--){const p=bul[i];let gone=false;p.life-=dt;
    // số bước con theo tốc độ thật (trước: luôn 6): đạn chậm chỉ cần 1-2 bước, tối đa 6
    const sp=Math.hypot(p.vx,p.vy,p.vz),ns=Math.min(6,Math.max(1,Math.ceil(sp*dt/.35)));
    for(let k=0;k<ns&&!gone;k++){const s=dt/ns;p.x+=p.vx*s;p.y+=p.vy*s;p.z+=p.vz*s;
      if(p.y<FY(curFl)||hitAny({x:p.x,y:p.y-.05,z:p.z,r:.05,h:.1})){gone=true;if(window.Nature)Nature.bulletSplash(p.x,p.y,p.z)}
      else if(!dead&&!peace&&Math.hypot(P.x-p.x,P.z-p.z)<P.r+.15&&p.y>P.y&&p.y<P.y+P.h){hurt(p.dmg);gone=true}}
    if(gone||p.life<=0){if(!p.o)S.remove(p.m);bul.splice(i,1)}
    else if(!bulDraw(p))p.m.position.set(p.x,p.y,p.z)}
  for(const o of bulGrp.values()){o.im.count=o.n;o.im.instanceMatrix.needsUpdate=true}
  lk-=dt;const g=gates[curFl];
  if(g&&!g.open&&lk<=0&&Math.hypot(P.x-(curFl%2?1:-1)*(AS(curFl)-2),P.z-(AS(curFl)-3.55))<3){showMsg(t('locked',need(curFl)));lk=3}
}
setupFloor();
