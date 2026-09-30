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
// Chờ dựng xong cả 4 tầng (nature.js dựng dần từng tầng sau khi tải trang, mỗi tầng chặn máy vài trăm ms - vài giây) rồi mới cho bấm chơi.
// Nhờ vậy phần "đơ" xảy ra lúc màn hình hiện "Loading" chứ không phải giữa lúc bắt đầu chơi. Quá 20 giây vẫn mở khóa để không kẹt.
{const ov=$('ov'),go=$('go'),ld=document.createElement('div'),t0=performance.now();let done=false;
  ld.style.cssText='margin-top:14px;font-size:18px;font-weight:bold';go.before(ld);
  const n=()=>{const N=window.Nature;return N&&N.floors?N.floors.length:NF};
  const fin=()=>{if(done)return;done=true;ld.remove();go.style.display='';ov.style.pointerEvents=''};
  const chk=()=>{if(n()>=NF||performance.now()-t0>20000)return fin();ld.textContent='⏳ Loading… '+n()+'/'+NF;setTimeout(chk,150)};
  if(n()<NF){go.style.display='none';ov.style.pointerEvents='none';chk()}else ld.remove()}
