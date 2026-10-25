// AI nói chuyện (Groq): bot thường + boss tự nghĩ câu thoại theo tình huống (máu, khoảng cách, súng đang cầm) và theo NGÔN NGỮ đang chọn.
// KEY: KHÔNG còn nằm trong game. Game gọi proxy Cloudflare Worker (AIT.url), key thật giữ trong secret GROQ_KEYS của Worker.
// Worker tự chuyển key khi bị giới hạn (429). Hết sạch key / bị giới hạn -> Worker trả 429/503 -> game nghỉ AIT.limitWait giây.
// Hết khả dụng -> AITalk.line() trả null để boss-talk.js dùng câu thoại có sẵn (talking.txt); khi hồi lại sẽ tự dùng AI tiếp.
// Nạp TRƯỚC boss-talk.js (xem loader.js). Gõ AITalk.status() trong Console để xem tình trạng key.
const AIT={
  url:'https://privatekey.huy94dcity.workers.dev/',   // proxy Cloudflare Worker (giữ key Groq). Xem worker.js
  models:['openai/gpt-oss-20b','openai/gpt-oss-120b','llama-3.1-8b-instant'],   // thử lần lượt: model nào bị gỡ / không tồn tại thì tự qua model kế
  temp:0.8,
  infoRate:.25,    // tỉ lệ câu nói về Optimum (còn lại là phản ứng trận đánh): 0 = không bao giờ, 1 = luôn luôn
  timeout:12000,    // ms chờ 1 yêu cầu
  maxBusy:3,       // số yêu cầu của bot thường chạy cùng lúc (boss luôn được ưu tiên, không bị chặn)
  limitWait:65,    // giây nghỉ 1 key khi bị 429 mà server không báo thời gian chờ
  netWait:15       // giây tạm dùng thoại có sẵn sau khi lỗi mạng
};
// Prompt gốc (điền {floor} {hpPercent} {dist} {weapon} {lang} lúc gọi)
// Mỗi lần nói, code tự CHỌN nhánh rồi chỉ gửi đúng phần đó cho AI (không gửi cả hai, vì AI sẽ luôn chọn nhánh dễ là giải thích Optimum):
//   combat = phản ứng trận đánh (máu / khoảng cách / súng) · info = giải thích 1 ý về Optimum (tỉ lệ = AIT.infoRate)
const AIP={
  bot:{
    head:`Bạn là quái lính tầng {floor} trong FPS Block Arena, thế giới Optimum. Người chơi là kẻ địch đang bắn bạn.
Nói tối đa 3 câu ngắn, tổng không quá 40 từ. Mỗi câu phải trọn ý và kết thúc bằng dấu chấm. Không markdown, không ngoặc kép, không emoji.
`,
    combat:`Tình huống ngay lúc này: máu của bạn còn {hpPercent}%, người chơi cách bạn {dist}m, người chơi đang cầm {weapon}.
Hãy nói như lính đang giữa trận đánh, PHẢN ỨNG TRỰC TIẾP với tình huống đó:
- Máu dưới 30%: hoảng sợ, van xin hoặc liều mạng. Máu 30-70%: đau, hằn học. Máu trên 70%: tự tin, khiêu khích.
- Dưới 8m: người chơi ở sát bên, cuống cuồng. Trên 25m: còn xa, chế giễu hoặc gọi đồng đội.
- Nhắc tới khẩu súng {weapon} của người chơi (sợ, khinh thường hoặc né đạn).
KHÔNG giải thích về Optimum hay công nghệ. Thỉnh thoảng được chêm 1 từ như lag, packet nếu hợp ngữ cảnh.
`,
    info:`Lần này hãy nói cho người chơi nghe đúng 1 ý về Optimum, như lính đang tự hào khoe. Máy không tra web: chỉ dùng sự thật dưới đây, không bịa tên người hay số liệu.
Optimum (@get_optimum) là mạng tăng tốc dữ liệu phi tập trung: block và payload lan nhanh hơn, bớt gửi trùng, không sửa consensus. mump2p là gossip dùng RLNC (Random Linear Network Coding), do giáo sư Muriel Médard phát triển tại MIT: cắt tin thành mảnh mã hóa, node nhận mảnh có thể tạo mảnh mới ngay, ráp lại được dù mất gói, nhanh và chịu mất gói hơn Gossipsub. Flexnode là node ai cũng chạy cạnh client sẵn có. Sản phẩm kế: DeRAM, DeROM.
`
  },
  boss:{
    head:`Bạn là Boss tầng {floor}/4 của mạng Optimum trong FPS Block Arena. Người chơi là kẻ địch đang đánh bạn.
Nói tối đa 3 câu ngắn, tổng không quá 50 từ, giọng chỉ huy kiêu ngạo. Mỗi câu phải trọn ý và kết thúc bằng dấu chấm. Không markdown, không ngoặc kép, không emoji.
`,
    combat:`Tình huống ngay lúc này: máu của bạn còn {hpPercent}%, người chơi cách bạn {dist}m, người chơi đang cầm {weapon}.
Hãy đe dọa và khiêu khích như boss giữa trận, PHẢN ỨNG TRỰC TIẾP với tình huống đó:
- Máu trên 70%: khinh thường. Máu 30-70%: bắt đầu gắt, bị chọc giận. Máu dưới 30%: nghiến răng, dọa trả thù, không chịu thua.
- Người chơi ở xa: chế giễu sự chậm chạp. Ở gần: đe dọa trực tiếp.
- Bình phẩm khẩu súng {weapon} của người chơi.
KHÔNG giải thích về Optimum hay công nghệ. Thỉnh thoảng được chêm 1 từ như block, validator, flexnode nếu thật hợp ý câu.
`,
    info:`Lần này hãy khoe với người chơi đúng 1 ý về Optimum bằng giọng chỉ huy kiêu ngạo. Máy không tra web: chỉ dùng sự thật dưới đây, không bịa tên thành viên khác, không bịa số liệu.
Optimum (@get_optimum) là mạng tăng tốc dữ liệu cho blockchain: lan block nhanh hơn, tiết kiệm băng thông, không đụng consensus, không cần phần cứng thêm. mump2p dùng RLNC của giáo sư Muriel Médard (MIT): mã hóa thành mảnh, chuyển tiếp và ráp lại, chịu mất gói tốt hơn Gossipsub. Validator nhận block sớm hơn thì ít miss attestation và miss proposal. Flexnode chạy cạnh client hiện có. DeRAM và DeROM là bộ nhớ phi tập trung đọc-ghi và chỉ-đọc, sắp tới.
`
  }
};
// Tên ngôn ngữ gửi cho AI (khớp với mã trong i18n.js)
const AI_LANG={vi:'Vietnamese',en:'English',ru:'Russian',ng:'Nigerian Pidgin English',bn:'Bengali',id:'Indonesian',hi:'Hindi',zh:'Simplified Chinese',fil:'Filipino (Tagalog)',uk:'Ukrainian',ko:'Korean'};
const AI_WPN={pistol:'pistol',rifle:'assault rifle (AK)',sniper:'sniper rifle',grenade:'grenade'};

const AITalk=(function(){
  const K={ready:true,mi:0,netT:0,limT:0,busy:0,recent:[]};   // mi: model đang dùng · limT: tới lúc này proxy đang bị giới hạn / hết key
  const anyKey=()=>Date.now()>=K.limT;

  // gọi Groq QUA PROXY: thử lần lượt các model; trả về chuỗi thô hoặc null (key do Worker lo, game không thấy key)
  async function groq(sys,usr,effort){
    for(let tries=0;tries<AIT.models.length+1;tries++){
      const model=AIT.models[K.mi];if(!model)return null;
      const body={model,effort:effort||'low',messages:[{role:'system',content:sys},{role:'user',content:usr}]};   // model suy luận: bot để thấp cho nhanh, boss dùng medium
      const ac=new AbortController(),to=setTimeout(()=>ac.abort(),AIT.timeout);let r;
      try{r=await fetch(AIT.url,{method:'POST',signal:ac.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})}
      catch(x){K.netT=Date.now()+AIT.netWait*1000;return null}
      finally{clearTimeout(to)}
      if(r.status===429||r.status===503){K.limT=Date.now()+AIT.limitWait*1000;return null}   // mọi key đều hết hạn mức: nghỉ rồi dùng thoại có sẵn
      if(r.status===404||r.status===400){K.mi++;continue}                      // model không còn: qua model kế tiếp
      if(!r.ok){K.limT=Date.now()+10000;return null}                           // lỗi khác: nghỉ chút
      try{const j=await r.json(),c=j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;if(c)return c}catch(x){}
      return null;
    }
    return null;
  }
  const fill=(s,v)=>s.replace(/\{(\w+)\}/g,(m,k)=>v[k]!==undefined?v[k]:m);
  // làm sạch: bỏ emoji / ngoặc kép / markdown, chỉ giữ tối đa 3 câu TRỌN VẸN trong giới hạn số từ (không cắt giữa câu)
  function clean(s,maxW,maxS){
    s=String(s||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).join(' ');
    s=s.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu,'').replace(/["“”„«»`*#_~]/g,'').replace(/^[\-–—:>\s]+/,'').replace(/\s+/g,' ').trim();
    const cnt=x=>L==='zh'?Math.ceil(x.length/2):x.split(' ').length;         // tiếng Trung không có dấu cách: đếm theo ký tự
    const parts=s.split(/(?<=[.!?])\s+|(?<=[。！？])/).map(x=>x.trim()).filter(Boolean);
    const out=[];let w=0;
    for(const p of parts.slice(0,maxS||3)){const n=cnt(p);if(w+n>maxW)break;out.push(p);w+=n}   // chỉ giữ CÂU TRỌN VẸN, không cắt giữa câu
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
    if(!boss&&kind!=='guide'&&K.busy>=AIT.maxBusy)return null;   // hướng dẫn viên không bị chặn bởi giới hạn bot thường
    const guide=kind==='guide',maxW=guide?130:boss?55:45,   // guide: lời thuyết minh dài hơn (tối đa 7 câu / 130 từ)
     
      v={floor:boss?(b.fl||0)+1:curFl+1,hpPercent:Math.max(0,Math.min(100,Math.round(b.hp/(b.maxhp||100)*100))),dist:Math.round(Math.hypot(P.x-b.x,P.z-b.z)),weapon:AI_WPN[cur]||cur,lang:AI_LANG[L]||'English'},
      usr='Nói câu của bạn bây giờ.'+(K.recent.length&&!guide?' Phải khác các câu này: '+K.recent.join(' | '):'');
    K.busy++;
    try{
      const AP=AIP[kind],sys=fill(AP.head+(Math.random()<AIT.infoRate?AP.info:AP.combat)+'Ngôn ngữ: {lang}.',v);   // chọn nhánh bằng code
      const out=clean(await groq(sys,usr,boss?'medium':'low'),maxW,guide?7:3);
      if(out&&!guide){K.recent.push(out);if(K.recent.length>6)K.recent.shift()}
      return out;
    }catch(x){return null}
    finally{K.busy--}
  }
  const status=()=>{const now=Date.now(),s={proxy:AIT.url,limitedFor:Math.max(0,Math.round((K.limT-now)/1000)),model:AIT.models[K.mi]||'(hết model)',netOff:Math.max(0,Math.round((K.netT-now)/1000))};console.log('[Block Arena] AI nói chuyện:',s);return s};
  return {line,status};
})();
