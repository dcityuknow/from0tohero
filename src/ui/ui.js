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
// Chờ tầng 1 dựng xong (các tầng còn lại chỉ được dựng khi bạn tới gần thang: world/floors.js) rồi mới cho bấm chơi. Quá 20 giây vẫn mở khóa để không kẹt.
const LDT={vi:'Đang tải…',en:'Loading…',ru:'Загрузка…',ng:'Dey load…',bn:'লোড হচ্ছে…',id:'Memuat…',hi:'लोड हो रहा है…',zh:'加载中…',fil:'Naglo-load…',uk:'Завантаження…',ko:'불러오는 중…'};
{const ov=$('ov'),go=$('go'),ld=document.createElement('div'),t0=performance.now();let done=false;
  ld.style.cssText='margin-top:14px;font-size:18px;font-weight:bold';go.before(ld);
  const NEED=1,n=()=>{const N=window.Nature;return N&&N.floors?N.floors.length:NEED};
  const fin=()=>{if(done)return;done=true;ld.remove();go.style.display='';ov.style.pointerEvents=''};
  const chk=()=>{if(n()>=NEED||performance.now()-t0>20000)return fin();ld.textContent='⏳ '+(LDT[L]||LDT.en)+' '+n()+'/'+NEED;setTimeout(chk,150)};
  if(n()<NEED){go.style.display='none';ov.style.pointerEvents='none';chk()}else ld.remove()}
