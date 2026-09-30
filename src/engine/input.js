// Bàn phím, chuột, nạp đạn
// Khi đang chơi: chỉ cho các phím có chức năng trong game hoạt động. Mọi phím tắt của trình duyệt (Ctrl+S, Ctrl+P, Ctrl+F, Ctrl+R, F5, Tab, Alt...) bị chặn.
// Esc (thoát khóa chuột / tạm dừng), F11 (toàn màn hình), F12 (DevTools) vẫn cho qua.
const GAME_KEYS=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','KeyR','KeyF','Digit1','Digit2','Digit3','Digit4','KeyY','KeyN']);
const PASS_KEYS=new Set(['Escape','F11','F12']);
addEventListener('keydown',e=>{
  if(!playing||PASS_KEYS.has(e.code))return;
  if(e.ctrlKey||e.metaKey||e.altKey||!GAME_KEYS.has(e.code)){e.preventDefault();e.stopImmediatePropagation()}
},true);
// Chặn zoom trình duyệt: Ctrl + cuộn chuột (luôn chặn), cuộn chuột khi đang chơi, chụm 2 ngón / gesture zoom trên điện thoại
addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey||playing)e.preventDefault()},{passive:false,capture:true});
for(const g of['gesturestart','gesturechange','gestureend'])addEventListener(g,e=>e.preventDefault());
addEventListener('touchmove',e=>{if(e.touches.length>1)e.preventDefault()},{passive:false});
// Ctrl+W / Ctrl+T / Ctrl+N trình duyệt không cho chặn được -> hỏi xác nhận khi đang chơi để khỏi lỡ tay đóng tab
addEventListener('beforeunload',e=>{if(playing){e.preventDefault();e.returnValue=''}});
addEventListener('keydown',e=>{keys[e.code]=1;if(e.code==='KeyR')reload();if(e.code==='Digit4')pick4();if(e.code==='Digit1')pick('pistol');if(e.code==='Digit2')pick('rifle');if(e.code==='Digit3')pick('sniper');if(e.code==='KeyF'&&cur==='sniper')scoped=!scoped;if(e.code==='Space')e.preventDefault()});
addEventListener('keyup',e=>keys[e.code]=0);
addEventListener('mousedown',e=>{if(!playing)return;if(e.button===2){if(cur==='sniper')scoped=true;return}if(cur==='grenade'){startHold();return}md=true;if(!W[cur].auto)shoot()});
addEventListener('mouseup',e=>{if(e.button===2)scoped=false;else{md=false;releaseG()}});addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('mousemove',e=>{
  if(!playing||!(locked||md))return;
  const ss=(scoped&&cur==='sniper'?.3:1)*.0025;yaw-=e.movementX*ss;pitch=Math.max(-1.5,Math.min(1.5,pitch-e.movementY*ss));
});
function reload(){if(rel<=0&&ammos[cur]<W[cur].mag&&reserve[cur]>0){rel=W[cur].rl;snd(300,.15,'sine')}}
