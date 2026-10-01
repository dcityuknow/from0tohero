// AI nói chuyện (Groq): bot thường + boss tự nghĩ câu thoại theo tình huống (máu, khoảng cách, súng đang cầm) và theo NGÔN NGỮ đang chọn.
// KEY: đọc từ assets/data/groq-keys.txt (mỗi dòng 1 key, dòng bắt đầu bằng # bị bỏ qua) + AIT.keys (dán thẳng vào code nếu muốn).
// Key nào bị giới hạn (429) thì nghỉ key đó rồi chuyển sang key kế tiếp; key sai (401/403) bị loại hẳn.
// Hết sạch key khả dụng -> AITalk.line() trả null để boss-talk.js dùng câu thoại có sẵn (talking.txt); khi có key hồi lại sẽ tự dùng AI tiếp.
// Nạp TRƯỚC boss-talk.js (xem loader.js). Gõ AITalk.status() trong Console để xem tình trạng key.
const AIT={
  keysFile:'assets/data/groq-keys.txt',
  keys:[],                                          // dán key trực tiếp: ['gsk_xxx','gsk_yyy']
  url:'https://api.groq.com/openai/v1/chat/completions',
  models:['openai/gpt-oss-20b','openai/gpt-oss-120b','llama-3.1-8b-instant'],   // thử lần lượt: model nào bị gỡ / không tồn tại thì tự qua model kế
  temp:0.8,
  timeout:12000,    // ms chờ 1 yêu cầu
  maxBusy:3,       // số yêu cầu của bot thường chạy cùng lúc (boss luôn được ưu tiên, không bị chặn)
  limitWait:65,    // giây nghỉ 1 key khi bị 429 mà server không báo thời gian chờ
  netWait:15       // giây tạm dùng thoại có sẵn sau khi lỗi mạng
};
// Prompt gốc (điền {floor} {hpPercent} {dist} {weapon} {lang} lúc gọi)
const AIP={
  bot:`Bạn là quái lính tầng {floor} trong FPS Block Arena, thế giới Optimum.
Nói tối đa 3 câu ngắn, tổng không quá 40 từ. Mỗi câu phải trọn ý và kết thúc bằng dấu chấm. Không markdown, không ngoặc kép, không emoji.
Máy không tra web. Chỉ dùng sự thật dưới đây, không bịa tên người hay số liệu.
Optimum (@get_optimum) là mạng tăng tốc dữ liệu phi tập trung: block và payload lan nhanh hơn, bớt gửi trùng, không sửa consensus. mump2p là gossip dùng RLNC (Random Linear Network Coding), do giáo sư Muriel Médard phát triển tại MIT: cắt tin thành mảnh mã hóa, node nhận mảnh có thể tạo mảnh mới ngay, ráp lại được dù mất gói, nhanh và chịu mất gói hơn Gossipsub. Flexnode là node ai cũng chạy cạnh client sẵn có. Sản phẩm kế: DeRAM, DeROM.
Chọn đúng 1 nhánh: hoặc phản ứng trận (máu {hpPercent}%, cách {dist}m, súng {weapon}), hoặc giải thích 1 ý Optimum. Không trộn cả hai thành một mớ từ khóa.
Ngôn ngữ: {lang}.`,
  boss:`Bạn là Boss tầng {floor}/4 của mạng Optimum trong FPS Block Arena.
Nói tối đa 3 câu ngắn, tổng không quá 50 từ, giọng chỉ huy kiêu. Mỗi câu phải trọn ý và kết thúc bằng dấu chấm. Không markdown, không ngoặc kép, không emoji.
Máy không tra web. Chỉ dùng sự thật dưới đây, không bịa tên thành viên khác, không bịa số liệu.
Optimum (@get_optimum) là mạng tăng tốc dữ liệu cho blockchain: lan block nhanh hơn, tiết kiệm băng thông, không đụng consensus, không cần phần cứng thêm. mump2p dùng RLNC của giáo sư Muriel Médard (MIT): mã hóa thành mảnh, chuyển tiếp và ráp lại, chịu mất gói tốt hơn Gossipsub. Validator nhận block sớm hơn thì ít miss attestation và miss proposal. Flexnode chạy cạnh client hiện có. DeRAM và DeROM là bộ nhớ phi tập trung đọc-ghi và chỉ-đọc, sắp tới.
Chọn đúng 1 nhánh: hoặc đe dọa theo máu {hpPercent}%, khoảng cách {dist}m, súng {weapon}; hoặc giải thích 1 ý Optimum.
Ngôn ngữ: {lang}.`
};
// Tên ngôn ngữ gửi cho AI (khớp với mã trong i18n.js)
const AI_LANG={vi:'Vietnamese',en:'English',ru:'Russian',ng:'Nigerian Pidgin English',bn:'Bengali',id:'Indonesian',hi:'Hindi',zh:'Simplified Chinese',fil:'Filipino (Tagalog)',uk:'Ukrainian',ko:'Korean'};
const AI_WPN={pistol:'pistol',rifle:'assault rifle (AK)',sniper:'sniper rifle',grenade:'grenade'};

const AITalk=(function(){
  const K={list:[],ready:false,rr:0,mi:0,netT:0,busy:0,recent:[]};   // list: [{k,until,dead}] · rr: key đang dùng · mi: model đang dùng
  const addKeys=a=>{for(let s of a){s=String(s).replace(/^["',\s]+|["',\s]+$/g,'');if(s&&s[0]!=='#'&&!K.list.some(e=>e.k===s))K.list.push({k:s,until:0,dead:false})}};
  addKeys(AIT.keys);
  fetch(AIT.keysFile,{cache:'no-store'}).then(r=>r.ok?r.text():'').then(x=>addKeys(x.replace(/^\uFEFF/,'').split(/\r?\n/))).catch(()=>{}).finally(()=>{K.ready=true});

  // chọn key còn dùng được, ưu tiên giữ key hiện tại cho tới khi nó hết hạn mức
  function pickKey(){const n=K.list.length,now=Date.now();
    for(let i=0;i<n;i++){const j=(K.rr+i)%n,e=K.list[j];if(!e.dead&&e.until<=now){K.rr=j;return e}}
    return null}
  const anyKey=()=>K.list.some(e=>!e.dead&&e.until<=Date.now());

  // gọi Groq: thử lần lượt các key / model; trả về chuỗi thô hoặc null
  async function groq(sys,usr,effort){
    for(let tries=0;tries<K.list.length*AIT.models.length+2;tries++){
      const e=pickKey(),model=AIT.models[K.mi];if(!e||!model)return null;
      const body={model,temperature:AIT.temp,max_completion_tokens:700,messages:[{role:'system',content:sys},{role:'user',content:usr}]};
      if(model.includes('gpt-oss'))body.reasoning_effort=effort||'low';   // model suy luận: bot để thấp cho nhanh, boss dùng medium cho câu có nghĩa hơn
      const ac=new AbortController(),to=setTimeout(()=>ac.abort(),AIT.timeout);let r;
      try{r=await fetch(AIT.url,{method:'POST',signal:ac.signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+e.k},body:JSON.stringify(body)})}
      catch(x){K.netT=Date.now()+AIT.netWait*1000;return null}
      finally{clearTimeout(to)}
      if(r.status===429){   // hết hạn mức: nghỉ key này (đọc retry-after nếu server cho phép đọc), chuyển key khác
        const ra=parseFloat(r.headers.get('retry-after'));e.until=Date.now()+(isFinite(ra)&&ra>0?ra:AIT.limitWait)*1000;continue}
      if(r.status===401||r.status===403){e.dead=true;continue}                 // key sai / bị thu hồi
      if(r.status===404||r.status===400){K.mi++;continue}                      // model không còn: qua model kế tiếp
      if(!r.ok){e.until=Date.now()+10000;continue}                             // lỗi máy chủ: cho key nghỉ chút
      try{const j=await r.json(),c=j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;if(c)return c}catch(x){}
      return null;
    }
    return null;
  }
  const fill=(s,v)=>s.replace(/\{(\w+)\}/g,(m,k)=>v[k]!==undefined?v[k]:m);
  // làm sạch: bỏ emoji / ngoặc kép / markdown, chỉ giữ tối đa 3 câu TRỌN VẸN trong giới hạn số từ (không cắt giữa câu)
  function clean(s,maxW){
    s=String(s||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).join(' ');
    s=s.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu,'').replace(/["“”„«»`*#_~]/g,'').replace(/^[\-–—:>\s]+/,'').replace(/\s+/g,' ').trim();
    const cnt=x=>L==='zh'?Math.ceil(x.length/2):x.split(' ').length;         // tiếng Trung không có dấu cách: đếm theo ký tự
    const parts=s.split(/(?<=[.!?])\s+|(?<=[。！？])/).map(x=>x.trim()).filter(Boolean);
    const out=[];let w=0;
    for(const p of parts.slice(0,3)){const n=cnt(p);if(w+n>maxW)break;out.push(p);w+=n}   // chỉ giữ CÂU TRỌN VẸN, không cắt giữa câu
    if(out.length>1&&!/[.!?。！？…]$/.test(out[out.length-1]))out.pop();       // câu cuối bị cụt (hết token) thì bỏ
    if(!out.length&&parts.length){                                             // câu đầu đã dài quá mức: cắt ở dấu phẩy gần nhất rồi chấm dứt
      let t=parts[0];const ws=t.split(' ');if(L!=='zh'&&ws.length>maxW)t=ws.slice(0,maxW).join(' ');else if(L==='zh')t=t.slice(0,maxW*2);
      const c=Math.max(t.lastIndexOf(','),t.lastIndexOf('，'));if(c>t.length*.5)t=t.slice(0,c);
      out.push(t.replace(/[,;:，、\s]+$/,'')+'…');
    }
    s=out.join(' ').trim();
    return s.length>=2?s:null;
  }
  // kind: 'bot' | 'boss'; b = quái đang nói. Trả Promise<string|null> (null = hãy dùng thoại có sẵn)
  async function line(kind,b){
    const boss=kind==='boss';
    if(!K.ready||Date.now()<K.netT||!anyKey())return null;
    if(!boss&&K.busy>=AIT.maxBusy)return null;
    const maxW=boss?55:45,
      v={floor:boss?(b.fl||0)+1:curFl+1,hpPercent:Math.max(0,Math.min(100,Math.round(b.hp/(b.maxhp||100)*100))),dist:Math.round(Math.hypot(P.x-b.x,P.z-b.z)),weapon:AI_WPN[cur]||cur,lang:AI_LANG[L]||'English'},
      usr='Nói câu của bạn bây giờ.'+(K.recent.length?' Phải khác các câu này: '+K.recent.join(' | '):'');
    K.busy++;
    try{
      const out=clean(await groq(fill(AIP[kind],v),usr,boss?'medium':'low'),maxW);
      if(out){K.recent.push(out);if(K.recent.length>6)K.recent.shift()}
      return out;
    }catch(x){return null}
    finally{K.busy--}
  }
  const status=()=>{const now=Date.now(),s={keys:K.list.length,usable:K.list.filter(e=>!e.dead&&e.until<=now).length,limited:K.list.filter(e=>!e.dead&&e.until>now).length,dead:K.list.filter(e=>e.dead).length,model:AIT.models[K.mi]||'(hết model)',netOff:Math.max(0,Math.round((K.netT-now)/1000))};console.log('[Block Arena] AI nói chuyện:',s);return s};
  return {line,status};
})();
