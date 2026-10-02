// Sát thương khi RƠI từ trên cao (người chơi, bot, boss): rơi càng cao mất máu càng nhiều.
// Công thức: nếu độ cao rơi > FALL.safe thì mất (độ cao - safe) * k máu, tối đa FALL.max. Boss (nhiều máu hơn) mất theo cùng TỈ LỆ % máu như bot.
// Rơi xuống nước (đang bơi / lội) thì không mất máu. Đồng minh bất tử nên bỏ qua. Chỉnh nhanh ở FALL.
// Nạp TRƯỚC main.js (main.js gọi fallDmg / playerFall / fallBot sau mỗi lần di chuyển).
const FALL={
  safe:3.5,    // rơi thấp hơn mức này (m) không mất máu (bậc thang, nhảy thường)
  k:9,         // máu mất cho mỗi mét vượt quá: rơi từ mặt tường 7m = (7-3.5)*9 ≈ 31 máu; từ 12m ≈ 76
  max:100      // tối đa mất bao nhiêu máu một lần rơi (với bot 100 máu; boss nhân theo máu của nó)
};
// gọi sau khi move(e,...): theo dõi đỉnh cao nhất trong lúc đang ở trên không, tới lúc chạm đất thì trả về lượng máu phải mất (0 nếu không)
function fallDmg(e){
  const wet=e.sw||(e===P&&window.Nature&&Nature.wading);
  if(wet||e.ally){e.fy=undefined;return 0}
  if(!e.ground){if(e.fy===undefined||e.y>e.fy)e.fy=e.y;return 0}
  const f=e.fy;e.fy=undefined;
  if(f===undefined)return 0;
  const drop=f-e.y;if(drop<=FALL.safe)return 0;
  return Math.min(FALL.max,(drop-FALL.safe)*FALL.k)*((e.maxhp||100)/100);
}
function playerFall(d){hurt(d);thudSnd();quake({x:P.x,y:P.y,z:P.z},Math.min(.5,.12+d/200))}
// bot / boss: trả về true nếu chết vì ngã
function fallBot(b){
  const d=fallDmg(b);if(d<=0)return false;
  b.hp-=d;blood(new THREE.Vector3(b.x,b.y+.2,b.z),new THREE.Vector3(0,1,0),new THREE.Vector3(0,1,0),10);
  snd(120,.16,'square',.06*GV,{x:b.x,y:b.y,z:b.z});
  if(b.hp<=0){killBot(b,new THREE.Vector3(0,1,0));return true}
  return false;
}
