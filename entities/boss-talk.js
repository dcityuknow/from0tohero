// Boss + bot nói chuyện. Câu thoại do AI (Groq, xem ai-talk.js) nghĩ ra theo tình huống và theo ngôn ngữ đang chọn.
// Hết key / bị giới hạn / mất mạng -> tự dùng câu có sẵn trong assets/data/talking.txt (mỗi dòng 1 câu, tự dịch sang ngôn ngữ người chơi).
let TALK=['Ngươi chết chắc rồi!','Đừng hòng chạy thoát!','Chỉ có thế thôi sao?','Ta sẽ nghiền nát ngươi!'];   // dùng tạm nếu không đọc được talking.txt
fetch('assets/data/talking.txt',{cache:'no-store'}).then(r=>r.ok?r.text():Promise.reject()).then(x=>{
  const l=x.replace(/^\uFEFF/,'').split(/\r?\n/).map(v=>v.trim()).filter(Boolean);if(l.length)TALK=l}).catch(()=>{});
const tb=document.createElement('div');
tb.style.cssText='position:fixed;left:0;top:0;z-index:3;display:none;pointer-events:none;background:#000;color:#fff;font:700 14px/1.35 sans-serif;padding:7px 12px;border-radius:8px;max-width:340px;text-align:center;transform-origin:50% 100%';
tb.className='bt';   // mũi nhọn tam giác dưới khung chữ, chĩa xuống đầu boss
{const st=document.createElement('style');st.textContent='.bt::after{content:"";position:absolute;left:50%;top:100%;margin-left:-11px;border:11px solid transparent;border-top:12px solid #000;border-bottom:0}';document.head.appendChild(st)}
document.body.appendChild(tb);
// Dịch câu có sẵn sang ngôn ngữ người chơi đã chọn (chỉ dùng khi AI không khả dụng).
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
// Lấy 1 câu thoại: ưu tiên AI; AI không khả dụng (hết key / limit / lỗi mạng) thì dùng câu có sẵn fb (đã dịch)
const lineFor=(kind,b,fb)=>AITalk.line(kind,b).then(a=>a||trLine(fb)).catch(()=>trLine(fb));
let talkT=0,talkShow=0,lastTalk=-1,talkTok=0;
function talkTick(dt,bo){
  if(!bo){talkShow=0;talkT=1.5;talkTok++;return}
  if(talkShow>0)talkShow-=dt;
  talkT-=dt;
  if(talkT<=0&&TALK.length){
    let i;do i=Math.floor(Math.random()*TALK.length);while(TALK.length>1&&i===lastTalk);lastTalk=i;
    talkT=99;const my=talkTok;                           // chờ câu thoại xong mới hiện
    lineFor('boss',boss,TALK[i]).then(x=>{if(my!==talkTok)return;tb.textContent=x;talkShow=Math.min(32,4+x.length*.1);talkT=talkShow+3+Math.random()*4}).catch(()=>{if(my===talkTok)talkT=3});   // lỗi -> thử lại sau 3s (trước đây boss im lặng mãi)
  }
}
const _tp=new THREE.Vector3();
function placeBubble(){placeBotBubbles();   // gọi sau khi camera cập nhật: đặt khung chữ trên đầu boss (thu nhỏ khi ở xa)
  if(!playing||talkShow<=0||!boss.on||boss.hp<=0){tb.style.display='none';return}
  _tp.set(boss.x,boss.y+2.6*boss.g.scale.x+.3,boss.z);const d=_tp.distanceTo(C.position);_tp.project(C);
  if(_tp.z>1||d>45){tb.style.display='none';return}
  tb.style.display='block';
  const sc=Math.max(.6,Math.min(1.2,14/d));
  tb.style.transform='translate('+(_tp.x*.5+.5)*innerWidth+'px,'+(-_tp.y*.5+.5)*innerHeight+'px) translate(-50%,-100%) translate(0,'+(-12*sc)+'px) scale('+sc+')';   // đầu mũi nhọn chạm đúng điểm trên đầu boss
}

// ---- Bot thường nói chuyện: mỗi lần xuất hiện có 30% con được "nói được" (b.talker, xem spawnBot), 70% im lặng ----
// Câu thoại do AI nghĩ (dự phòng: câu có sẵn). Tối đa BT_MAX khung chữ cùng lúc, chỉ hiện khi bot trong tầm BT_RANGE và không bị tường che.
const BT_MAX=8,BT_RANGE=28,bubs=[];
for(let i=0;i<BT_MAX;i++){
  const e=document.createElement('div');e.className='bt';
  e.style.cssText='position:fixed;left:0;top:0;z-index:3;display:none;pointer-events:none;background:#000;color:#fff;font:700 12px/1.35 sans-serif;padding:5px 9px;border-radius:7px;max-width:250px;text-align:center;transform-origin:50% 100%';
  document.body.appendChild(e);bubs.push(e);
}
function botTalkTick(dt){
  if(!playing||!TALK.length)return;
  let speaking=0;
  for(const b of bots)if(b.talker&&!b.boss&&b.on&&b.hp>0&&b.tShow>0)speaking++;
  for(const b of bots){
    if(!b.talker||b.boss||!b.on||b.hp<=0)continue;
    if(b.tShow>0){
      b.tShow-=dt;
      b.tVc=(b.tVc||0)-dt;if(b.tVc<=0){b.tVc=.3;b.tVis=sight(b)}   // kiểm tra bị tường che (mỗi .3s cho nhẹ)
      continue;
    }
    b.tt-=dt;if(b.tt>0)continue;
    const d=Math.hypot(P.x-b.x,P.z-b.z);
    if(d>BT_RANGE||Math.abs(P.y-b.y)>4||speaking>=BT_MAX||b.tw){b.tt=.6+Math.random();continue}
    const i=Math.floor(Math.random()*TALK.length),my=b.tTok;
    b.tw=1;b.tt=99;speaking++;                                     // chờ câu thoại xong mới hiện
    lineFor('bot',b,TALK[i]).then(x=>{
      if(my!==b.tTok)return;                                      // bot đã chết / tái sinh trong lúc chờ
      b.tw=0;b.tText=x;b.tShow=Math.min(24,4+x.length*.09);b.tt=9+Math.random()*2;b.tVc=0;b.tVis=true}).catch(()=>{if(my===b.tTok){b.tw=0;b.tt=3}});   // tt chỉ đếm lùi SAU khi khung chữ tắt -> nghỉ ~10s rồi nói tiếp, cho tới khi bot chết
  }
}
function placeBotBubbles(){
  let k=0;
  if(playing)for(const b of bots){
    if(k>=bubs.length)break;
    if(!b.talker||b.boss||!b.on||b.hp<=0||!(b.tShow>0)||!b.tVis)continue;
    _tp.set(b.x,b.y+2.35,b.z);const d=_tp.distanceTo(C.position);_tp.project(C);
    if(_tp.z>1||d>BT_RANGE+6)continue;
    const e=bubs[k++];if(e._t!==b.tText){e.textContent=b.tText;e._t=b.tText}
    e.style.display='block';
    const sc=Math.max(.55,Math.min(1.1,11/d));
    e.style.transform='translate('+(_tp.x*.5+.5)*innerWidth+'px,'+(-_tp.y*.5+.5)*innerHeight+'px) translate(-50%,-100%) translate(0,'+(-10*sc)+'px) scale('+sc+')';
  }
  for(;k<bubs.length;k++)bubs[k].style.display='none';
}
