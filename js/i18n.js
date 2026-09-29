// Đa ngôn ngữ + tự nhận ngôn ngữ theo IP
// ---- Đa ngôn ngữ + tự nhận theo IP ----
const LN=[['vi','Tiếng Việt'],['ru','Русский'],['ng','Nigerian (Pidgin)'],['bn','বাংলা'],['id','Bahasa Indonesia'],['hi','हिन्दी'],['zh','中文'],['fil','Filipino'],['uk','Українська'],['ko','한국어']];
const CMAP={VN:'vi',RU:'ru',BY:'ru',KZ:'ru',NG:'ng',BD:'bn',ID:'id',IN:'hi',CN:'zh',TW:'zh',HK:'zh',SG:'zh',PH:'fil',UA:'uk',KR:'ko'};
let L='vi',ovState='start',manualLang=false;
function t(k,...a){let s=(T[L]&&T[L][k])||T.vi[k];a.forEach((v,i)=>s=s.replace('{'+i+'}',v));return s}
function renderOv(){
  if(ovState==='dead'){$('t').textContent=t('dead');$('sub').textContent=t('deadsub',kills);$('go').textContent=t('again')}
  else if(ovState==='pause'){$('t').textContent=t('pause');$('sub').textContent=t('pausesub');$('go').textContent=t('resume')}
  else{$('t').textContent='Block Arena';$('sub').textContent=t('sub');$('go').textContent=t('play')}
}
function applyLang(l){
  L=T[l]?l:'vi';document.documentElement.lang=L==='ng'?'en':L;
  $('ctrl').innerHTML=t('ctrl');$('pk').textContent=t('pk');$('kl').textContent=t('kills');$('hpl').textContent=t('hp');$('gk').textContent=t('gk');
  document.querySelectorAll('.wb').forEach((b,i)=>b.textContent=(i+1)+' · '+t(b.dataset.w));
  $('wn').textContent=t(cur);
  document.querySelectorAll('.lb').forEach(b=>b.classList.toggle('on',b.dataset.l===L));
  renderOv();
}
for(const [c,n] of LN){const b=document.createElement('button');b.className='lb';b.dataset.l=c;b.textContent=n;
  b.addEventListener('click',e=>{e.stopPropagation();manualLang=true;try{localStorage.setItem('ba_lang',c)}catch(x){}applyLang(c)});$('lg').appendChild(b)}
function navLang(){
  const n=(navigator.language||'vi').toLowerCase();
  if(n==='en-ng')return 'ng';
  const m={vi:'vi',ru:'ru',bn:'bn',id:'id',hi:'hi',zh:'zh',fil:'fil',tl:'fil',uk:'uk',ko:'ko'};
  return m[n.split('-')[0]]||'vi';
}
async function ipLang(){
  const tryF=async(u,txt)=>{const ac=new AbortController(),to=setTimeout(()=>ac.abort(),3500);
    try{const r=await fetch(u,{signal:ac.signal});const v=txt?(await r.text()).trim():(await r.json()).country;return CMAP[String(v).toUpperCase()]}catch(e){return null}finally{clearTimeout(to)}};
  return (await tryF('https://api.country.is/',false))||(await tryF('https://ipapi.co/country/',true));
}
let saved=null;try{saved=localStorage.getItem('ba_lang')}catch(e){}
if(saved){manualLang=true}
