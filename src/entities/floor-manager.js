// Quản lý tầng: chuyển tầng (nạp / dỡ tầng: world/floors.js), thanh máu boss, đạn của boss, cổng khóa. Nạp CUỐI nhóm entities vì gọi setupFloor() ngay khi tải.
let lk=0;
function tickBoss(dt){
  if(!playing)return;
  let nf=flOf(P.y+.05);if(nf<curFl&&P.y>=FY(curFl)-SLAB)nf=curFl;   // lặn dưới đáy sông tầng trên (trong lòng tấm sàn dày SLAB) vẫn tính là tầng đó, chỉ xuống tầng dưới khi thật sự qua khỏi đáy sàn
  if(nf!==curFl){FM.enter(nf);curFl=nf;setupFloor()}   // FM.enter: bảo đảm tầng mới đã được dựng TRƯỚC khi sinh quái (fSpawns cần cây / sông của tầng đó)
  FM.tick(dt);
  tickSpawn(dt);
  const bo=boss.on&&boss.hp>0;talkTick(dt,bo);botTalkTick(dt);bb.style.display='block';$('bbw').style.display=bo?'block':'none';
  $('bbn').textContent=bo?bname(boss.fl):bossDone[curFl]?t('floorclear',curFl+1):t('floor',curFl+1,fk[curFl],need(curFl));
  if(bo)$('bbf').style.width=Math.max(0,boss.hp/boss.maxhp*100)+'%';
  for(let i=bul.length-1;i>=0;i--){const p=bul[i];let gone=false;p.life-=dt;
    for(let k=0;k<6&&!gone;k++){const s=dt/6;p.x+=p.vx*s;p.y+=p.vy*s;p.z+=p.vz*s;
      if(p.y<FY(curFl)||hitAny({x:p.x,y:p.y-.05,z:p.z,r:.05,h:.1})){gone=true;if(window.Nature)Nature.bulletSplash(p.x,p.y,p.z)}
      else if(!dead&&Math.hypot(P.x-p.x,P.z-p.z)<P.r+.15&&p.y>P.y&&p.y<P.y+P.h){hurt(p.dmg);gone=true}}
    if(gone||p.life<=0){S.remove(p.m);bul.splice(i,1)}else p.m.position.set(p.x,p.y,p.z)}
  lk-=dt;const g=gates[curFl];
  if(g&&!g.open&&lk<=0&&Math.hypot(P.x-(curFl%2?1:-1)*(AS(curFl)-2),P.z-(AS(curFl)-3.55))<3){showMsg(t('locked',need(curFl)));lk=3}
}
setupFloor();
