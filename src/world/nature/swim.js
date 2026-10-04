// ============================================================================
// nature/swim.js - Lội / bơi / nín thở (bọc hàm move của physics.js, dùng chung cho người chơi và bot).
// (Tách ra từ nature.js cũ. Chia sẻ với các file nature/ khác qua NK = window.NatureKit.)
// ============================================================================
(function(){
const NK=window.NatureKit=window.NatureKit||{};
const {CFG,clamp01}=NK;   // từ nature/kit.js
const {wdep,lakeH}=NK;   // từ nature/lake.js
const {lakeAt}=NK;   // từ nature/state.js
const {bubble}=NK;   // từ nature/fx.js


// Lội / bơi (bọc hàm move của physics.js; áp dụng cho người chơi và bot - bot có mảng .parts)
//  - nước nông: đi chậm dần theo độ sâu
//  - đang bơi (e.sw): tốc độ ngang giảm, chiều dọc do e.swv điều khiển (nổi lên / lặn xuống), KHÔNG rơi theo trọng lực
const _mv=move;

move=function(e,dx,dy,dz){
  if(e===P||e.parts){
    if(e.sw){
      const now=performance.now(),dtm=Math.min(.05,Math.max(0,(now-(e._mt||now-16))/1000));e._mt=now;
      const k=e.under?CFG.diveSpeed:CFG.swimSpeed;
      e.vy=0;return _mv(e,dx*k,(e.swv||0)*dtm,dz*k);
    }
    const l=lakeAt(e.x,e.y,e.z);
    if(l){const wd=wdep(l,e.x,e.z),a=1-(1-CFG.wade)*clamp01(wd/.6),kk=a*(1-(1-CFG.deepWade)*clamp01((wd-.6)/.5));dx*=kk;dz*=kk}
  }
  return _mv(e,dx,dy,dz);
};

// ---- CHẾ ĐỘ BƠI + NÍN THỞ (người chơi và bot dùng chung) ----
// Vào chỗ nước sâu >= CFG.swimOn -> tự động bơi: nổi trên mặt nước, đầu ló lên. Giữ Shift = lặn, Space = trồi lên nhanh.
// Khi ĐẦU chìm dưới mặt nước thì cạn dần hơi thở (CFG.air giây); hết hơi thì mất máu từng nhịp cho tới khi ngoi lên.
// Bot: cũng bơi, thỉnh thoảng tự lặn 3-15 giây; lặn quá CFG.air giây cũng bị mất máu (có thể chết đuối).
function drown(e,isP){
  const y=e.y+e.h-.3;
  for(let i=0;i<4;i++)bubble(e.x+(Math.random()-.5)*.5,y,e.z+(Math.random()-.5)*.5);
  if(isP){if(!dead)hurt(CFG.drownDmg);snd(110,.3,'sawtooth',.07)}
  else{e.hp-=CFG.drownDmg;snd(130,.25,'sawtooth',.05,{x:e.x,y,z:e.z});if(e.hp<=0)killBot(e,new THREE.Vector3(0,1,0))}
}

function swimUpdate(e,isP,dt,dive,up){
  if(e.air===undefined)e.air=CFG.air;
  const l=lakeAt(e.x,e.y,e.z);
  if(!l){if(e.sw){e.sw=0;e._mt=0;e.dive=false}e.under=false;e.air=Math.min(CFG.air,e.air+dt*4);e.dmT=0;return null}
  const wd=wdep(l,e.x,e.z),sy=l.y-CFG.level;
  if(!e.sw){if(wd>=CFG.swimOn&&e.y<=sy-.2){e.sw=1;e.swv=0;e._mt=0}}
  else if(wd<CFG.swimOff){e.sw=0;e._mt=0;e.dive=false}
  if(!e.sw){e.under=false;e.air=Math.min(CFG.air,e.air+dt*4);e.dmT=0;return l}
  const off=isP?.95:e.h*.55,ty=sy-off,bed=l.y-lakeH(l,e.x,e.z);   // ty: độ cao chân khi nổi (mắt/đầu ló khỏi mặt nước)
  let want;
  if(dive)want=-2.8;
  else if(up)want=Math.max(-3.6,Math.min(3.6,(ty-e.y)*8));
  else want=Math.max(-1.8,Math.min(1.8,(ty-e.y)*3));
  if(want<0&&e.y<=bed+.03)want=0;   // chạm đáy sông
  e.swv=want;
  const hy=isP&&typeof eye==='number'?e.y+eye:e.y+e.h-.1;
  e.under=hy<sy-.03;
  if(e.under){
    e.air-=dt;
    if(e.air<=0){e.air=0;e.dmT=(e.dmT||0)-dt;if(e.dmT<=0){e.dmT=CFG.drownTick;drown(e,isP)}}
  }else{e.air=Math.min(CFG.air,e.air+dt*3);e.dmT=0}
  return l;
}

Object.assign(NK,{swimUpdate});
})();
