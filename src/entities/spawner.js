// Bộ sinh quái theo tầng: cố định theo thời gian, KHÔNG phụ thuộc việc bạn có hạ quái hay không
// số bot thường theo tầng: 4 / 7 / 10 (hồi sinh nhanh hơn ở tầng cao, xem items.js)
function setupFloor(){
  const nb=bots.filter(b=>!b.boss&&!b.arch),want=4+2*curFl;
  while(nb.length<want)nb.push(mkBot());
  nb.forEach((b,i)=>{b.on=i<want;if(b.on)spawnBot(b)});
  boss.on=bossAlive&&boss.fl===curFl;if(boss.on){const h=boss.hp;spawnBot(boss);boss.hp=h}
}
const MAXBOT=48;                  // tối đa số bot thường còn sống cùng lúc trong 1 map (tăng nếu máy khỏe)
const SP_IV=[3,2.4,1.8,1.2];       // giây giữa 2 lần sinh 1 bot, theo tầng 1..4
let spT=0;
function tickSpawn(dt){
  spT-=dt;if(spT>0)return;spT=SP_IV[curFl];
  let alive=0,free=null;
  for(const b of bots){if(b.boss||b.arch)continue;if(b.on&&b.hp>0)alive++;else if(!free)free=b}
  if(alive>=MAXBOT)return;
  if(!free)free=mkBot();
  free.on=true;spawnBot(free);
}
