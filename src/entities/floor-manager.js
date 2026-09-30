// Quản lý tầng: chuyển tầng, thanh máu boss, đạn của boss, cổng khóa. Nạp CUỐI nhóm entities vì gọi setupFloor() ngay khi tải.
let lk=0,preT=0;
function tickBoss(dt){
  if(!playing)return;
  const nf=Math.min(NF-1,Math.max(0,Math.floor((P.y+.05)/FH)));if(nf!==curFl){if(window.Nature&&Nature.ensure)Nature.ensure(nf);curFl=nf;setupFloor()}   // lên/xuống tầng: đảm bảo tầng đó đã dựng (thường đã dựng sẵn ở dưới)
  tickSpawn(dt);
  // Hạ boss xong (cổng mở) -> dựng sẵn tầng kế tiếp lúc rảnh, để lúc leo thang không bị khựng
  if(bossDone[curFl]&&curFl<NF-1&&!preT&&window.Nature&&Nature.built&&!Nature.built(curFl+1)){const nx=curFl+1;preT=setTimeout(()=>{Nature.ensure(nx);preT=0},600)}
  const bo=boss.on&&boss.hp>0;talkTick(dt,bo);botTalkTick(dt);bb.style.display='block';$('bbw').style.display=bo?'block':'none';
  $('bbn').textContent=bo?bname(boss.fl):bossDone[curFl]?t('floorclear',curFl+1):t('floor',curFl+1,fk[curFl],need(curFl));
  if(bo)$('bbf').style.width=Math.max(0,boss.hp/boss.maxhp*100)+'%';
  for(let i=bul.length-1;i>=0;i--){const p=bul[i];let gone=false;p.life-=dt;
    for(let k=0;k<6&&!gone;k++){const s=dt/6;p.x+=p.vx*s;p.y+=p.vy*s;p.z+=p.vz*s;
      if(p.y<curFl*FH||hitAny({x:p.x,y:p.y-.05,z:p.z,r:.05,h:.1})){gone=true;if(window.Nature)Nature.bulletSplash(p.x,p.y,p.z)}
      else if(!dead&&Math.hypot(P.x-p.x,P.z-p.z)<P.r+.15&&p.y>P.y&&p.y<P.y+P.h){hurt(p.dmg);gone=true}}
    if(gone||p.life<=0){S.remove(p.m);bul.splice(i,1)}else p.m.position.set(p.x,p.y,p.z)}
  lk-=dt;const g=gates[curFl];
  if(g&&!g.open&&lk<=0&&Math.hypot(P.x-(curFl%2?1:-1)*(AF(curFl)-2),P.z-(AF(curFl)-3.55))<3){showMsg(t('locked',need(curFl)));lk=3}
}
setupFloor();
