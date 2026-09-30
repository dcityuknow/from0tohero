// Màn hình bắt đầu / tạm dừng, khởi tạo ngôn ngữ
applyLang(saved||navLang());
if(!saved)ipLang().then(l=>{if(l&&!manualLang)applyLang(l)});
// ---- Start / pause ----
$('ov').addEventListener('click',()=>{
  if(dead)restart();
  $('ov').style.display='none';playing=true;
  try{const p=cv.requestPointerLock();if(p&&p.catch)p.catch(()=>{})}catch(e){}
});
document.addEventListener('pointerlockchange',()=>{
  locked=document.pointerLockElement===cv;
  if(locked)lockedOnce=true;
  else if(lockedOnce&&playing){playing=false;md=false;ovState='pause';renderOv();$('ov').style.display='flex'}
});
