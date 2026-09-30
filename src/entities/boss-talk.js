// Boss nói chuyện: đọc câu từ assets/data/talking.txt (mỗi dòng 1 câu), cứ vài giây nói 1 câu ngẫu nhiên
let TALK=['Ngươi chết chắc rồi!','Đừng hòng chạy thoát!','Chỉ có thế thôi sao?','Ta sẽ nghiền nát ngươi!'];   // dùng tạm nếu không đọc được talking.txt
fetch('assets/data/talking.txt',{cache:'no-store'}).then(r=>r.ok?r.text():Promise.reject()).then(x=>{
  const l=x.replace(/^\uFEFF/,'').split(/\r?\n/).map(v=>v.trim()).filter(Boolean);if(l.length)TALK=l}).catch(()=>{});
const tb=document.createElement('div');
tb.style.cssText='position:fixed;left:0;top:0;z-index:3;display:none;pointer-events:none;background:#000;color:#fff;font:700 14px/1.3 sans-serif;padding:6px 10px;border-radius:8px;max-width:260px;text-align:center;transform-origin:50% 100%';
tb.className='bt';   // mũi nhọn tam giác dưới khung chữ, chĩa xuống đầu boss
{const st=document.createElement('style');st.textContent='.bt::after{content:"";position:absolute;left:50%;top:100%;margin-left:-11px;border:11px solid transparent;border-top:12px solid #000;border-bottom:0}';document.head.appendChild(st)}
document.body.appendChild(tb);
// Dịch câu của boss sang ngôn ngữ người chơi đã chọn (talking.txt viết bằng ngôn ngữ nào cũng được, tự nhận diện nguồn).
// Bản dịch được lưu lại (bộ nhớ + localStorage) nên mỗi câu chỉ dịch 1 lần / ngôn ngữ. Không dịch được (mất mạng...) -> nói nguyên văn.
const TRL={vi:'vi',en:'en',ru:'ru',ng:'en',bn:'bn',id:'id',hi:'hi',zh:'zh-CN',fil:'tl',uk:'uk',ko:'ko'},TRM={};let trBad=0;
async function trLine(s){
  const tl=TRL[L]||'en',k=tl+'|'+s;
  if(TRM[k]!==undefined)return TRM[k];
  try{const v=localStorage.getItem('ba_tr_'+k);if(v)return TRM[k]=v}catch(e){}
  if(Date.now()<trBad)return s;                         // vừa lỗi mạng: tạm nói nguyên văn, thử lại sau
  const get=async u=>{const ac=new AbortController(),to=setTimeout(()=>ac.abort(),3000);
    try{return await(await fetch(u,{signal:ac.signal})).json()}finally{clearTimeout(to)}};
  let out='';
  try{const j=await get('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl='+tl+'&dt=t&q='+encodeURIComponent(s));out=j[0].map(x=>x[0]).join('').trim()}catch(e){}
  if(!out)try{const j=await get('https://api.mymemory.translated.net/get?q='+encodeURIComponent(s)+'&langpair=Autodetect|'+tl);if(j.responseStatus==200)out=String(j.responseData.translatedText||'').trim()}catch(e){}
  if(!out){trBad=Date.now()+60000;return s}
  TRM[k]=out;try{localStorage.setItem('ba_tr_'+k,out)}catch(e){}return out;
}
let talkT=0,talkShow=0,lastTalk=-1,talkTok=0;
function talkTick(dt,bo){
  if(!bo){talkShow=0;talkT=1.5;talkTok++;return}
  if(talkShow>0)talkShow-=dt;
  talkT-=dt;
  if(talkT<=0&&TALK.length){
    let i;do i=Math.floor(Math.random()*TALK.length);while(TALK.length>1&&i===lastTalk);lastTalk=i;
    talkT=99;const my=talkTok;                           // chờ bản dịch xong mới hiện
    trLine(TALK[i]).then(x=>{if(my!==talkTok)return;tb.textContent=x;talkShow=Math.min(5,2+x.length*.06);talkT=talkShow+2+Math.random()*3});
  }
}
const _tp=new THREE.Vector3();
function placeBubble(){   // gọi sau khi camera cập nhật: đặt khung chữ trên đầu boss (thu nhỏ khi ở xa)
  if(!playing||talkShow<=0||!boss.on||boss.hp<=0){tb.style.display='none';return}
  _tp.set(boss.x,boss.y+2.6*boss.g.scale.x+.3,boss.z);const d=_tp.distanceTo(C.position);_tp.project(C);
  if(_tp.z>1||d>45){tb.style.display='none';return}
  tb.style.display='block';
  const sc=Math.max(.6,Math.min(1.2,14/d));
  tb.style.transform='translate('+(_tp.x*.5+.5)*innerWidth+'px,'+(-_tp.y*.5+.5)*innerHeight+'px) translate(-50%,-100%) translate(0,'+(-12*sc)+'px) scale('+sc+')';   // đầu mũi nhọn chạm đúng điểm trên đầu boss
}
