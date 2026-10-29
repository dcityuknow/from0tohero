// Bộ sinh quái theo tầng: cố định theo thời gian, KHÔNG phụ thuộc việc bạn có hạ quái hay không
// số bot thường theo tầng: 4 / 7 / 10 (hồi sinh nhanh hơn ở tầng cao, xem items.js)
function setupFloor(){
  if(window.NET&&NET.botsRemote&&NET.botsRemote()){if(window.BotSync)BotSync.clear();return}   // LAN: máy khách không tự sinh quái, chỉ vẽ quái của chủ phòng (net/botsync.js)
  if(window.BN)BN.reset();   // botnames.js: sang tầng mới / dựng lại tầng -> hạn mức tên (= số bot của tầng) đầy lại
  const base=window.NET&&NET.noBots()?0:4+2*curFl,nb=bots.filter(b=>!b.boss&&!b.arch),want=window.BN&&BN.active()?Math.min(base,BN.left()):base;   // LAN: phòng tắt bot -> không có quái

  while(nb.length<want)nb.push(mkBot());
  nb.forEach((b,i)=>{b.on=i<want;if(b.on)spawnBot(b)});
  boss.on=bossAlive&&boss.fl===curFl;if(boss.on){const h=boss.hp;spawnBot(boss);boss.hp=h}
}
const MAXBOT=48;                  // tối đa số bot thường còn sống cùng lúc trong 1 map (tăng nếu máy khỏe)
const SP_IV=[3,2.4,1.8,1.2];       // giây giữa 2 lần sinh 1 bot, theo tầng 1..4
let spT=0;
function tickSpawn(dt){
  if(window.NET&&(NET.noBots()||NET.botsRemote()))return;
  spT-=dt;if(spT>0)return;spT=SP_IV[curFl];
  let alive=0,free=null;
  for(const b of bots){if(b.boss||b.arch)continue;if(b.on&&b.hp>0)alive++;else if(!free)free=b}
  if(alive>=MAXBOT)return;
  if(window.BN&&BN.active()&&BN.left()<=0)return;   // hết tên = hết bot của tầng này (botnames.js)
  if(!free)free=mkBot();
  free.on=true;spawnBot(free);
}
