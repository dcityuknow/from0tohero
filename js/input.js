// Bàn phím, chuột, nạp đạn
addEventListener('keydown',e=>{keys[e.code]=1;if(e.code==='KeyR')reload();if(e.code==='Digit4')pick4();if(e.code==='Digit1')pick('pistol');if(e.code==='Digit2')pick('rifle');if(e.code==='Digit3')pick('sniper');if(e.code==='KeyF'&&cur==='sniper')scoped=!scoped;if(e.code==='Space')e.preventDefault()});
addEventListener('keyup',e=>keys[e.code]=0);
addEventListener('mousedown',e=>{if(!playing)return;if(e.button===2){if(cur==='sniper')scoped=true;return}if(cur==='grenade'){startHold();return}md=true;if(!W[cur].auto)shoot()});
addEventListener('mouseup',e=>{if(e.button===2)scoped=false;else{md=false;releaseG()}});addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('mousemove',e=>{
  if(!playing||!(locked||md))return;
  const ss=(scoped&&cur==='sniper'?.3:1)*.0025;yaw-=e.movementX*ss;pitch=Math.max(-1.5,Math.min(1.5,pitch-e.movementY*ss));
});
function reload(){if(rel<=0&&ammos[cur]<W[cur].mag&&reserve[cur]>0){rel=W[cur].rl;snd(300,.15,'sine')}}
