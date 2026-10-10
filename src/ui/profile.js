// Màn hình đầu game: (1) chọn ngôn ngữ -> (2) nhập tên (tối đa 20 ký tự, chỉ nhận chữ của ngôn ngữ đã chọn + số) -> (3) chọn nhân vật theo quốc gia (ui/character.js). Xong mới thấy màn "Bấm để chơi".
// Tên được dùng để khắc lên tường khi thắng boss (gameplay/engrave.js). Đọc tên ở mọi nơi qua PROFILE.name.
// Nạp CUỐI CÙNG (sau ui.js) vì dùng applyLang / LN / L của i18n.js.
window.PROFILE={name:'',lang:'',char:''};
(function(){
const NAME_MAX=20;
const PT={
  vi:{t:'Nhập tên của bạn',h:'Tối đa {0} ký tự · tên sẽ được khắc lên tường khi bạn thắng boss',ok:'Tiếp tục',back:'← Đổi ngôn ngữ'},
  en:{t:'Enter your name',h:'Up to {0} characters · your name is carved on the wall when you beat a boss',ok:'Continue',back:'← Change language'},
  ru:{t:'Введите ваше имя',h:'До {0} символов · имя будет высечено на стене после победы над боссом',ok:'Продолжить',back:'← Сменить язык'},
  ng:{t:'Enter your name',h:'Up to {0} characters · we go carve your name for wall if you beat boss',ok:'Continue',back:'← Change language'},
  bn:{t:'আপনার নাম লিখুন',h:'সর্বোচ্চ {0}টি অক্ষর · বস হারালে আপনার নাম দেয়ালে খোদাই হবে',ok:'চালিয়ে যান',back:'← ভাষা বদলান'},
  id:{t:'Masukkan namamu',h:'Maksimal {0} karakter · namamu akan diukir di dinding saat mengalahkan boss',ok:'Lanjut',back:'← Ganti bahasa'},
  hi:{t:'अपना नाम दर्ज करें',h:'अधिकतम {0} अक्षर · बॉस को हराने पर आपका नाम दीवार पर उकेरा जाएगा',ok:'आगे बढ़ें',back:'← भाषा बदलें'},
  zh:{t:'请输入你的名字',h:'最多 {0} 个字符 · 击败 Boss 后你的名字将刻在墙上',ok:'继续',back:'← 更换语言'},
  fil:{t:'Ilagay ang pangalan mo',h:'Hanggang {0} karakter · iuukit ang pangalan mo sa pader kapag natalo mo ang boss',ok:'Magpatuloy',back:'← Palitan ang wika'},
  uk:{t:'Введіть своє ім’я',h:'До {0} символів · ім’я буде викарбувано на стіні після перемоги над босом',ok:'Продовжити',back:'← Змінити мову'},
  ko:{t:'이름을 입력하세요',h:'최대 {0}자 · 보스를 처치하면 이름이 벽에 새겨집니다',ok:'계속',back:'← 언어 변경'}
};
// chữ viết được phép: chữ Latin (ai cũng gõ được, kể cả máy chưa cài bộ gõ) + chữ của ngôn ngữ đã chọn (Unicode script) + dấu kết hợp + số + dấu cách _ . ' -
const SCR={vi:'Latin',en:'Latin',id:'Latin',fil:'Latin',ng:'Latin',ru:'Cyrillic',uk:'Cyrillic',bn:'Bengali',hi:'Devanagari',zh:'Han',ko:'Hangul'};
const BCP={vi:'vi',en:'en',id:'id',fil:'fil',ng:'en',ru:'ru',uk:'uk',bn:'bn',hi:'hi',zh:'zh-CN',ko:'ko'};
const pt=(l,k,...a)=>{let s=(PT[l]&&PT[l][k])||PT.en[k];a.forEach((v,i)=>s=s.split('{'+i+'}').join(v));return s};
function fix(s,l){
  const re=new RegExp("[\\p{Script=Latin}\\p{Script="+(SCR[l]||'Latin')+"}\\p{M}0-9 _.'\\-]",'u');let o='';
  for(const ch of String(s).normalize('NFC'))if(re.test(ch))o+=ch;
  return Array.from(o.replace(/\s+/g,' ').replace(/^\s+/,'')).slice(0,NAME_MAX).join('');
}
let saved='';try{saved=localStorage.getItem('ba_name')||''}catch(e){}

const css=document.createElement('style');
css.textContent=`#pf{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:var(--bg)}
#pfc{background:var(--card);color:var(--ink);border:3px solid var(--pink);border-radius:22px;padding:22px 24px;width:min(94vw,520px);max-height:94vh;overflow-y:auto;text-align:center;box-sizing:border-box}
#pfc h1{margin:0 0 6px;font-size:30px}
#pfc .pfs{margin:6px 0 14px;font-weight:bold;opacity:.85}
#pfl{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.pfb{font:inherit;font-weight:bold;font-size:16px;border:3px solid var(--blue);background:transparent;color:var(--ink);border-radius:12px;padding:8px 14px;margin:4px;cursor:pointer}
.pfb.on{background:var(--blue);color:#2b2a3a}
.pfb.go{background:var(--pink);border-color:var(--pink);color:#2b2a3a}
.pfb:disabled{opacity:.4;cursor:default}
#pfi{width:100%;box-sizing:border-box;font:700 22px "Segoe UI","Noto Sans","Noto Sans Bengali","Noto Sans Devanagari","Noto Sans SC","Microsoft YaHei","Malgun Gothic",sans-serif;text-align:center;padding:10px 12px;border:3px solid var(--pink);border-radius:12px;background:#fff;color:#2b2a3a;outline:none}
#pfn{font-size:13px;opacity:.7;text-align:right;margin-top:4px}
#pfc .pfh{font-size:13px;opacity:.8;line-height:1.5;margin:6px 0 10px}
#who{margin-top:10px;font-weight:bold}`;
document.head.appendChild(css);

const pf=document.createElement('div');pf.id='pf';pf.innerHTML='<div id="pfc"></div>';document.body.appendChild(pf);
const card=pf.firstChild;

// dòng "👤 tên ✏️" trên bảng bắt đầu / tạm dừng (bấm ✏️ để đổi ngôn ngữ / tên)
const who=document.createElement('div');who.id='who';who.style.display='none';
const wn=document.createElement('span'),wb=document.createElement('button');wb.className='lb';wb.textContent='✏️';
who.append('👤 ',wn,' ',wb);$('go').before(who);
wb.addEventListener('click',e=>{e.stopPropagation();open()});
function showWho(){
  wn.textContent=PROFILE.name;who.style.display=PROFILE.name?'':'none';
  who.querySelectorAll('img').forEach(i=>i.remove());
  const u=window.CharPick&&PROFILE.char?CharPick.thumbURL(PROFILE.char):'';   // ảnh nhân vật đã chọn cạnh tên
  if(u){const im=new Image();im.src=u;im.alt='';who.prepend(im)}
}

function stepLang(){
  card.innerHTML='<h1>🌐 Block Arena</h1><p class="pfs">Language · Ngôn ngữ · Язык · भाषा · 语言 · 언어</p><div id="pfl"></div>';
  const wrap=card.querySelector('#pfl');
  for(const [c,n] of LN){
    const b=document.createElement('button');b.className='pfb'+(c===L?' on':'');b.textContent=n;
    b.addEventListener('click',()=>{manualLang=true;try{localStorage.setItem('ba_lang',c)}catch(x){}applyLang(c);stepName()});
    wrap.appendChild(b);
  }
}
function stepName(){
  const l=L;
  card.innerHTML='<h1>👤</h1><p class="pfs"></p><input id="pfi" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"><div id="pfn"></div><p class="pfh"></p><div><button class="pfb" id="pfback"></button><button class="pfb go" id="pfok"></button></div>';
  const $q=s=>card.querySelector(s),inp=$q('#pfi'),cnt=$q('#pfn'),ok=$q('#pfok');
  $q('.pfs').textContent=pt(l,'t');$q('.pfh').textContent=pt(l,'h',NAME_MAX);$q('#pfback').textContent=pt(l,'back');ok.textContent=pt(l,'ok');
  inp.lang=BCP[l]||'en';inp.value=fix(saved,l);
  let comp=false;
  const upd=()=>{cnt.textContent=Math.min(NAME_MAX,Array.from(inp.value).length)+'/'+NAME_MAX;ok.disabled=!fix(inp.value,l).trim()};
  const apply=()=>{const v=fix(inp.value,l);if(v!==inp.value)inp.value=v;upd()};
  inp.addEventListener('compositionstart',()=>comp=true);                 // đang gõ bằng bộ gõ (Trung / Hàn / Hindi...): chờ gõ xong mới lọc
  inp.addEventListener('compositionend',()=>{comp=false;apply()});
  inp.addEventListener('input',e=>{if(comp||e.isComposing)upd();else apply()});
  inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'&&!e.isComposing&&!comp)submit()});   // chặn phím lọt xuống phím tắt của game (đổi súng, nạp đạn...)
  inp.addEventListener('keyup',e=>e.stopPropagation());
  const submit=()=>{
    const v=fix(inp.value,l).trim();if(!v)return;
    PROFILE.name=v;PROFILE.lang=l;saved=v;try{localStorage.setItem('ba_name',v)}catch(e){}
    stepChar();
  };
  ok.addEventListener('click',submit);
  $q('#pfback').addEventListener('click',stepLang);
  upd();setTimeout(()=>inp.focus(),50);
}
// (3) chọn nhân vật: ui/character.js dựng màn chọn trong cùng khung. Thiếu file đó thì bỏ qua bước này.
function finish(){card.classList.remove('wide');showWho();pf.style.display='none'}
function stepChar(){
  if(!window.CharPick||!window.THREE){finish();return}
  card.classList.add('wide');
  try{CharPick.show(card,L,finish,()=>{card.classList.remove('wide');stepName()})}catch(e){console.warn('CharPick',e);finish()}
}
function open(){pf.style.display='flex';card.classList.remove('wide');stepLang()}
open();
})();
