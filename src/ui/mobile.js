// Điều khiển cảm ứng (CHỈ CHƠI MÀN NGANG): joystick trái, kéo màn hình phải để nhìn, cụm nút bên phải.
// - Khi bấm vào game: xin toàn màn hình + khóa hướng ngang (Android/Chrome). iPhone không cho khóa -> hiện màn "hãy xoay ngang" và tạm dừng game khi máy đang dọc.
// - Kích thước / vị trí nút co giãn theo chiều cao màn hình (layout()), có tính vùng tai thỏ (safe-area).
const joy={x:0,y:0};
(function(){
  if(!(('ontouchstart' in window)||navigator.maxTouchPoints>0))return;
  document.body.classList.add('touch');
  const css=document.createElement('style');
  css.textContent=`
#mob{position:fixed;inset:0;z-index:4;display:none;touch-action:none;-webkit-user-select:none;user-select:none}
#mob>div{position:absolute;touch-action:none}
#jz{left:0;bottom:0;width:40%;height:65%}
#lz{left:40%;top:0;width:60%;height:100%}
#jb,#jk{border-radius:50%;display:none;border:2px solid rgba(255,255,255,.6);background:rgba(255,255,255,.18);width:110px;height:110px}
#jk{width:50px;height:50px;background:rgba(255,255,255,.5)}
#mob .b{border-radius:50%;background:rgba(255,255,255,.28);border:2px solid rgba(255,255,255,.75);color:#fff;font:700 12px sans-serif;display:flex;align-items:center;justify-content:center;box-sizing:border-box}
#mob .b.on{background:rgba(255,110,150,.65)}
/* HUD gọn cho màn ngang thấp: minimap nhỏ ở góc, đạn nằm ngay bên phải minimap, lựu đạn dưới minimap để không bị cụm nút đè */
body.touch .pill{font-size:14px;padding:5px 10px;border-radius:12px}
body.touch #mm{width:100px;height:100px;left:calc(12px + env(safe-area-inset-left,0px));top:calc(12px + env(safe-area-inset-top,0px))}
body.touch #ammo{right:auto;bottom:auto;left:calc(122px + env(safe-area-inset-left,0px));top:calc(12px + env(safe-area-inset-top,0px))}
body.touch #gren{right:auto;bottom:auto;left:calc(12px + env(safe-area-inset-left,0px));top:calc(120px + env(safe-area-inset-top,0px))}
body.touch #score{right:calc(12px + env(safe-area-inset-right,0px));top:calc(12px + env(safe-area-inset-top,0px))}
body.touch #stats{left:calc(12px + env(safe-area-inset-left,0px));bottom:calc(10px + env(safe-area-inset-bottom,0px))}
body.touch #hpwrap{width:110px;height:12px}
body.touch #msg{bottom:calc(64px + env(safe-area-inset-bottom,0px));font-size:14px;padding:6px 12px}
/* bảng bắt đầu / tạm dừng vừa khung ngang thấp */
@media (pointer:coarse) and (max-height:520px){
  #card{padding:10px 16px;width:min(96vw,760px)}
  #card h1{font-size:22px;margin:0 0 2px}
  #card p{margin:3px 0;font-size:13px;line-height:1.35}
  #ctrl{grid-template-columns:repeat(4,1fr);gap:6px;margin:6px 0 4px}
  .tile{padding:6px 8px;gap:6px;border-radius:10px}
  .ti{font-size:20px}.tt{font-size:12px}.td{font-size:11px;line-height:1.35}
  .lb{font-size:11px;padding:2px 6px}.wb{font-size:13px;padding:5px 10px;margin:2px}
  #go{margin-top:8px;padding:8px 18px;font-size:16px}
}
/* màn "hãy xoay ngang" (hiện khi máy đang dọc) */
#rot{position:fixed;inset:0;z-index:100;display:none;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:#1d1b2a;color:#fff;text-align:center;padding:24px;font:700 18px/1.4 "Trebuchet MS",Verdana,sans-serif}
#rot .ri{font-size:72px;animation:rotp 1.8s ease-in-out infinite}
@keyframes rotp{0%,25%{transform:rotate(0)}60%,100%{transform:rotate(-90deg)}}`;
  document.head.appendChild(css);
  {const gk=$('gk');if(gk){const pv=gk.previousSibling;if(pv&&pv.nodeType===3)pv.textContent='';gk.style.display='none'}}   // cảm ứng không có phím 4 -> bỏ chữ "· phím 4"

  const mob=document.createElement('div');mob.id='mob';document.body.appendChild(mob);
  const mk=id=>{const d=document.createElement('div');d.id=id;mob.appendChild(d);return d};
  const jz=mk('jz'),lz=mk('lz'),jb=mk('jb'),jk=mk('jk'),NP={passive:false};
  const look=(dx,dy)=>{const s=(scoped&&cur==='sniper'?.3:1)*.005;yaw-=dx*s;pitch=Math.max(-1.5,Math.min(1.5,pitch-dy*s))};
  let jid=null,ox=0,oy=0,lid=null,lx=0,ly=0;
  let tapT=0,tapX=0,tapY=0,tapMv=0,jmax=0;   // nhấp đúp vào tâm joystick (2 lần chạm nhanh, cùng chỗ, không kéo) = bật/tắt ống ngắm
  jz.addEventListener('touchstart',e=>{e.preventDefault();if(jid!==null)return;const t0=e.changedTouches[0];jid=t0.identifier;ox=t0.clientX;oy=t0.clientY;
    const nw=performance.now();if(nw-tapT<320&&jmax<12&&Math.hypot(ox-tapX,oy-tapY)<40){tapT=0;if(cur==='sniper')scoped=!scoped}else{tapT=nw;tapX=ox;tapY=oy}jmax=0;
    jb.style.display=jk.style.display='block';jb.style.left=ox-55+'px';jb.style.top=oy-55+'px';jk.style.left=ox-25+'px';jk.style.top=oy-25+'px'},NP);
  jz.addEventListener('touchmove',e=>{for(const t0 of e.changedTouches)if(t0.identifier===jid){e.preventDefault();
    let dx=t0.clientX-ox,dy=t0.clientY-oy;const l=Math.hypot(dx,dy),m=50;if(l>m){dx*=m/l;dy*=m/l}
    jmax=Math.max(jmax,l);const k=Math.min(l,m)/m<.2?0:1;joy.x=dx/m*k;joy.y=dy/m*k;jk.style.left=ox+dx-25+'px';jk.style.top=oy+dy-25+'px'}},NP);
  const je=e=>{for(const t0 of e.changedTouches)if(t0.identifier===jid){jid=null;joy.x=joy.y=0;jb.style.display=jk.style.display='none'}};
  jz.addEventListener('touchend',je);jz.addEventListener('touchcancel',je);
  lz.addEventListener('touchstart',e=>{e.preventDefault();if(lid!==null)return;const t0=e.changedTouches[0];lid=t0.identifier;lx=t0.clientX;ly=t0.clientY},NP);
  lz.addEventListener('touchmove',e=>{for(const t0 of e.changedTouches)if(t0.identifier===lid){e.preventDefault();
    look(t0.clientX-lx,t0.clientY-ly);lx=t0.clientX;ly=t0.clientY}},NP);
  const le=e=>{for(const t0 of e.changedTouches)if(t0.identifier===lid)lid=null};lz.addEventListener('touchend',le);lz.addEventListener('touchcancel',le);

  // ---- Cụm nút bên phải: (r,b,sz) tính theo màn cao 380px, layout() nhân theo chiều cao thực + cộng safe-area ----
  const specs=[];
  const layout=()=>{const k=Math.max(.7,Math.min(1.3,innerHeight/380));
    for(const q of specs){const z=Math.round(q.sz*k),s=q.el.style;s.width=s.height=z+'px';
      s.right='calc('+Math.round(q.r*k)+'px + env(safe-area-inset-right,0px))';
      s.bottom='calc('+Math.round(q.b*k)+'px + env(safe-area-inset-bottom,0px))';
      s.fontSize=Math.round(12*k)+'px'}};
  const btn=(txt,r,b,sz,dn,up,aim)=>{const d=document.createElement('div');d.className='b';d.textContent=txt;specs.push({el:d,r,b,sz});
    let tid=null,bx=0,by=0;
    d.addEventListener('touchstart',e=>{e.preventDefault();d.classList.add('on');if(aim&&tid===null){const t0=e.changedTouches[0];tid=t0.identifier;bx=t0.clientX;by=t0.clientY}dn()},NP);
    if(aim)d.addEventListener('touchmove',e=>{for(const t0 of e.changedTouches)if(t0.identifier===tid){e.preventDefault();look(t0.clientX-bx,t0.clientY-by);bx=t0.clientX;by=t0.clientY}},NP);   // vừa giữ bắn vừa kéo ngón để ngắm
    const u=e=>{e.preventDefault();d.classList.remove('on');tid=null;if(up)up()};d.addEventListener('touchend',u);d.addEventListener('touchcancel',u);mob.appendChild(d)};
  //           chữ    phải  dưới  cỡ
  btn('FIRE',  28,  34,  92,()=>{if(cur==='grenade')startHold();else{md=true;if(!W[cur].auto)shoot()}},()=>{md=false;releaseG()},true);
  btn('JUMP', 140,  36,  64,()=>keys.Space=1,()=>keys.Space=0);
  btn('R',    130, 112,  52,()=>reload());
  btn('SLIDE', 22, 136,  58,()=>keys.ShiftLeft=1,()=>setTimeout(()=>keys.ShiftLeft=0,120));
  // Nút E (tương tác): giả lập phím E -> fruit-eat.js (nhặt/cất trái), portrait-info.js (mở tranh), engrave.js (khắc tên) đều nhận như phím thật
  const keyE=t=>window.dispatchEvent(new KeyboardEvent(t,{code:'KeyE',key:'e',bubbles:true,cancelable:true}));
  btn('E',     96, 172,  52,()=>keyE('keydown'),()=>keyE('keyup'));
  btn('C',     22, 262,  44,()=>{if(window.TP)TP.toggle()});   // đổi góc nhìn thứ 1 / thứ 3
  const order=['pistol','rifle','sniper','grenade'];
  btn('⇄',     22, 204,  52,()=>{const i=order.indexOf(cur);for(let n=1;n<=4;n++){const w=order[(i+n)%4];if(w==='grenade'){if(gren>0){pick4();return}}else{pick(w);return}}});
  setInterval(()=>mob.style.display=playing?'block':'none',150);

  // ---- Ép màn ngang ----
  const RT={vi:'Hãy xoay ngang điện thoại để chơi',en:'Rotate your phone to landscape to play',ru:'Поверните телефон горизонтально, чтобы играть',ng:'Turn your phone sideways make you fit play',bn:'খেলতে ফোনটি আড়াআড়ি (ল্যান্ডস্কেপ) করে ঘোরান',id:'Putar ponsel ke mode lanskap untuk bermain',hi:'खेलने के लिए फ़ोन को लैंडस्केप में घुमाएँ',zh:'请将手机横屏后再游玩',fil:'I-rotate ang phone nang pahalang para maglaro',uk:'Поверніть телефон горизонтально, щоб грати',ko:'플레이하려면 휴대폰을 가로로 돌려 주세요'};
  const rot=document.createElement('div');rot.id='rot';rot.innerHTML='<div class="ri">📱</div><div id="rt"></div>';document.body.appendChild(rot);
  const coarse=window.matchMedia?matchMedia('(pointer:coarse)').matches:true;   // máy cảm ứng thật (laptop có chuột không bị ép)
  // Toàn màn hình + khóa hướng ngang. Phải gọi trong lúc người chơi chạm (Android Chrome chỉ cho khóa khi đang toàn màn hình; iOS Safari không hỗ trợ -> dùng màn "xoay ngang").
  const lockLand=()=>{if(!coarse)return;const de=document.documentElement,fs=de.requestFullscreen||de.webkitRequestFullscreen;
    const go=()=>{try{const p=screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape');if(p&&p.catch)p.catch(()=>{})}catch(e){}};
    if(fs&&!document.fullscreenElement&&!document.webkitFullscreenElement){try{const p=fs.call(de);if(p&&p.then)p.then(go,go);else go()}catch(e){go()}}else go()};
  $('ov').addEventListener('click',lockLand);   // bấm "Bấm để chơi" / "Tiếp tục"
  rot.addEventListener('click',lockLand);       // chạm vào màn "xoay ngang" cũng thử khóa lại
  const check=()=>{
    if(coarse&&innerHeight>innerWidth){
      rot.style.display='flex';$('rt').textContent=RT[L]||RT.en;
      if(playing){playing=false;md=false;joy.x=joy.y=0;ovState='pause';renderOv();$('ov').style.display='flex'}   // đang chơi mà bị xoay dọc -> tạm dừng
    }else rot.style.display='none';
    layout()};
  addEventListener('resize',check);addEventListener('orientationchange',check);check();
})();
