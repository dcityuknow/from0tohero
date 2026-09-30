// Điều khiển cảm ứng: joystick trái, kéo màn hình phải để nhìn, các nút bên phải
const joy={x:0,y:0};
(function(){
  if(!(('ontouchstart' in window)||navigator.maxTouchPoints>0))return;
  const css=document.createElement('style');
  css.textContent='#mob{position:fixed;inset:0;z-index:4;display:none;touch-action:none;-webkit-user-select:none;user-select:none}#mob>div{position:absolute;touch-action:none}#jz{left:0;bottom:0;width:45%;height:60%}#lz{right:0;top:0;width:55%;height:100%}#jb,#jk{border-radius:50%;display:none;border:2px solid rgba(255,255,255,.6);background:rgba(255,255,255,.18);width:110px;height:110px}#jk{width:50px;height:50px;background:rgba(255,255,255,.5)}#mob .b{border-radius:50%;background:rgba(255,255,255,.28);border:2px solid rgba(255,255,255,.75);color:#fff;font:700 12px sans-serif;display:flex;align-items:center;justify-content:center}#mob .b.on{background:rgba(255,110,150,.65)}';
  document.head.appendChild(css);
  const mob=document.createElement('div');mob.id='mob';document.body.appendChild(mob);
  const mk=id=>{const d=document.createElement('div');d.id=id;mob.appendChild(d);return d};
  const jz=mk('jz'),lz=mk('lz'),jb=mk('jb'),jk=mk('jk'),NP={passive:false};
  let jid=null,ox=0,oy=0,lid=null,lx=0,ly=0;
  jz.addEventListener('touchstart',e=>{e.preventDefault();if(jid!==null)return;const t0=e.changedTouches[0];jid=t0.identifier;ox=t0.clientX;oy=t0.clientY;
    jb.style.display=jk.style.display='block';jb.style.left=ox-55+'px';jb.style.top=oy-55+'px';jk.style.left=ox-25+'px';jk.style.top=oy-25+'px'},NP);
  jz.addEventListener('touchmove',e=>{for(const t0 of e.changedTouches)if(t0.identifier===jid){e.preventDefault();
    let dx=t0.clientX-ox,dy=t0.clientY-oy;const l=Math.hypot(dx,dy),m=50;if(l>m){dx*=m/l;dy*=m/l}
    const k=Math.min(l,m)/m<.2?0:1;joy.x=dx/m*k;joy.y=dy/m*k;jk.style.left=ox+dx-25+'px';jk.style.top=oy+dy-25+'px'}},NP);
  const je=e=>{for(const t0 of e.changedTouches)if(t0.identifier===jid){jid=null;joy.x=joy.y=0;jb.style.display=jk.style.display='none'}};
  jz.addEventListener('touchend',je);jz.addEventListener('touchcancel',je);
  lz.addEventListener('touchstart',e=>{e.preventDefault();if(lid!==null)return;const t0=e.changedTouches[0];lid=t0.identifier;lx=t0.clientX;ly=t0.clientY},NP);
  lz.addEventListener('touchmove',e=>{for(const t0 of e.changedTouches)if(t0.identifier===lid){e.preventDefault();
    const s=(scoped&&cur==='sniper'?.3:1)*.005;yaw-=(t0.clientX-lx)*s;pitch=Math.max(-1.5,Math.min(1.5,pitch-(t0.clientY-ly)*s));lx=t0.clientX;ly=t0.clientY}},NP);
  const le=e=>{for(const t0 of e.changedTouches)if(t0.identifier===lid)lid=null};lz.addEventListener('touchend',le);lz.addEventListener('touchcancel',le);
  const btn=(txt,r,b,sz,dn,up)=>{const d=document.createElement('div');d.className='b';d.textContent=txt;
    d.style.cssText+=`right:${r}px;bottom:${b}px;width:${sz}px;height:${sz}px`;
    d.addEventListener('touchstart',e=>{e.preventDefault();d.classList.add('on');dn()},NP);
    const u=e=>{e.preventDefault();d.classList.remove('on');if(up)up()};d.addEventListener('touchend',u);d.addEventListener('touchcancel',u);mob.appendChild(d)};
  btn('FIRE',20,90,84,()=>{if(cur==='grenade')startHold();else{md=true;if(!W[cur].auto)shoot()}},()=>{md=false;releaseG()});
  btn('JUMP',120,40,62,()=>keys.Space=1,()=>keys.Space=0);
  btn('SLIDE',20,190,62,()=>keys.ShiftLeft=1,()=>setTimeout(()=>keys.ShiftLeft=0,120));
  btn('R',120,130,62,()=>reload());
  btn('ADS',120,220,62,()=>{if(cur==='sniper')scoped=!scoped});
  const order=['pistol','rifle','sniper','grenade'];
  btn('⇄',20,262,62,()=>{const i=order.indexOf(cur);for(let n=1;n<=4;n++){const w=order[(i+n)%4];if(w==='grenade'){if(gren>0){pick4();return}}else{pick(w);return}}});
  setInterval(()=>mob.style.display=playing?'block':'none',150);
})();
