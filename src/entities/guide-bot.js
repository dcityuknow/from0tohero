// Hướng dẫn viên chòi triển lãm (Pavilion): bot voxel LUÔN ở trong sảnh, đọc thoại thông tin các bức tranh.
//   · người chơi ở ngoài sảnh  -> đi qua đi lại trong sảnh (tuần tra)
//   · người chơi bước lên sảnh -> chạy lại gần, đi theo bên cạnh (không chặn tầm nhìn)
//   · người chơi nhìn vào 1 bức tranh (~0.5s) -> quay người, giơ tay chỉ, đọc: tên + chức vụ (kịch bản dạng "AI form")
// Nạp SAU pavilion.js (cần window.PavilionGuide) và SAU core.js / i18n.js / boss-talk.js (dùng S, C, L, playing, LN, trLine, .bt).
// Ngôn ngữ: vi / en / ko có kịch bản viết tay; 8 ngôn ngữ còn lại dùng kịch bản tiếng Anh rồi dịch bằng trLine() của boss-talk.js (có cache).
(function(){
'use strict';
if(typeof THREE==='undefined'||typeof VB==='undefined'||typeof S==='undefined'){console.warn('[GuideBot] thiếu THREE / VB / S, bỏ qua');return}

const CFG={
  walk:1.1, run:4.2,          // m/s: tuần tra / chạy theo người chơi
  followDist:1.15,            // khoảng cách đứng cạnh người chơi
  zMin:.75, zMax:1.9,         // dải đi lại trong sảnh (z cục bộ): giữa bảng tên tranh (z≈-.45) và hàng cột (z≈2.3)
  xPad:1.2,                   // cách mép sảnh
  lookMargin:.4, lookRange:9, // dung sai khi ngắm tranh (m) / tầm xa nhất (m)
  dwell:.5,                   // nhìn liên tục bao lâu thì bắt đầu đọc (s)
  cooldown:25,                // không đọc lại cùng 1 tranh trong khoảng này (s)
  tts:true,                   // đọc thành tiếng
  showText:false,             // false = chỉ ĐỌC, không hiện chữ trên màn hình (nếu máy không đọc được thì tự hiện chữ thay thế)
  rate:1.2,                   // tốc độ đọc (1 = bình thường; 1.1–1.3 nhanh vừa; tăng nữa dễ khó nghe)
  cloudTTS:true,              // nếu máy KHÔNG có giọng tự nhiên đúng ngôn ngữ -> dùng giọng Google Dịch (cần mạng). false = chỉ dùng giọng có sẵn trong máy; không có giọng đúng ngôn ngữ thì chỉ hiện chữ, không đọc bằng giọng sai
  ai:null                     // async (info, lang) => string | null — mặc định gắn AITalk (Groq) ở dưới; null/lỗi => kịch bản mẫu
};

// ---------- DỮ LIỆU ĐỌC ----------
const SPOKEN={ 'BLOCKCHAINJEFF':'Blockchain Jeff','MURIEL MEDARD':'Muriel Médard' };   // tên đọc khác với tên in trên bảng
const FACTS={   // dữ kiện ĐÃ XÁC THỰC (tiếng Việt; AI tự đọc sang ngôn ngữ đang chọn). Nguồn: trang MIT, Consensus 2025 (CoinDesk), Blocmates, thông cáo huy động vốn 04/2025.
  'MURIEL MEDARD':'Đồng sáng lập và CEO của Optimum. Giáo sư tại MIT, giữ ghế NEC Chair về Khoa học và Kỹ thuật Phần mềm, lãnh đạo nhóm Network Coding and Reliable Communications tại MIT. Là đồng phát minh RLNC (Random Linear Network Coding), công nghệ nền tảng của Optimum, đúc kết từ hơn hai thập kỷ nghiên cứu ở MIT. Thành viên Viện Hàn lâm Kỹ thuật Quốc gia Hoa Kỳ, Viện Hàn lâm Nghệ thuật và Khoa học Hoa Kỳ và Viện Hàn lâm Khoa học Quốc gia Đức; Fellow của Viện Hàn lâm Nhà phát minh Quốc gia Hoa Kỳ và của IEEE. Nhận giải IEEE Kobayashi Computers and Communications năm 2022, từng là chủ tịch IEEE Information Theory Society năm 2012 và giữ hơn tám mươi bằng sáng chế.',
  'KENT LIN':'Đồng sáng lập Optimum, tập trung vào go-to-market, tức đưa sản phẩm ra thị trường. Được giới thiệu là người thiên về crypto nhất trong nhóm sáng lập.'
};   // thêm dữ kiện thật của người khác tại đây (mỗi người 1 chuỗi). Người không có mục ở đây: bot chỉ nói chức vụ + thông tin chung về Optimum, KHÔNG bịa tiểu sử.
const COMMON='Optimum (x.com/get_optimum) là hạ tầng bộ nhớ hiệu năng cao / mạng tăng tốc dữ liệu cho mọi blockchain, xây trên RLNC, công nghệ ra đời từ nghiên cứu ở MIT. Sản phẩm đầu tiên mump2p tăng tốc lan truyền dữ liệu Ethereum; kế tiếp là deRAM (bộ nhớ phi tập trung) và deROM; Flexnode là node ai cũng chạy được. Tháng 4/2025 Optimum huy động 11 triệu USD, có 1kx, Spartan, Robot Ventures, Triton Capital, Finality Capital, SNZ ủng hộ. Đội ngũ công khai danh tính, nhiều người từ MIT, Harvard và Meta.';
const BIO={   // bản đọc dự phòng khi AI không dùng được (vi/en/ko; ngôn ngữ khác tự dịch bằng trLine)
  'MURIEL MEDARD':{
    vi:'Cô là giáo sư tại MIT và là đồng phát minh RLNC, công nghệ nền tảng của Optimum. Cô là thành viên Viện Hàn lâm Kỹ thuật Quốc gia Hoa Kỳ, từng nhận giải IEEE Kobayashi năm 2022 và giữ hơn tám mươi bằng sáng chế.',
    en:'She is a professor at MIT and co-inventor of RLNC, the technology behind Optimum. She is a member of the US National Academy of Engineering, won the IEEE Kobayashi award in 2022 and holds over eighty patents.',
    ko:'MIT 교수이자 옵티멈의 핵심 기술인 RLNC의 공동 발명자입니다. 미국 공학한림원 회원이며 2022년 IEEE 고바야시상을 받았고 80개가 넘는 특허를 보유하고 있습니다.'},
  'KENT LIN':{
    vi:'Anh phụ trách go-to-market, tức đưa sản phẩm Optimum ra thị trường, và được xem là người thiên về crypto nhất trong nhóm sáng lập.',
    en:'He focuses on go-to-market, bringing Optimum to the market, and is considered the most crypto-native of the founders.',
    ko:'시장 진출(go-to-market)을 맡고 있으며, 창업자 중 가장 크립토에 정통한 사람으로 소개됩니다.'}
};   // thêm tiểu sử thật tại đây, vd BIO['KENT LIN']={vi:'...',en:'...',ko:'...'} — AI/kịch bản sẽ chỉ dùng dữ kiện có trong đây
const T={
  vi:{greet:['Xin chào, tôi là hướng dẫn viên của khu triển lãm Optimum.','Bạn cứ nhìn vào bức tranh nào, tôi sẽ giới thiệu bức tranh đó.'],
      intro:['Đây là {n}.','Bức chân dung này là của {n}.','Bạn đang xem chân dung của {n}.'],
      ceo:'{n} là CEO của Optimum, người dẫn dắt định hướng của cả đội ngũ.',
      founder:'{n} là đồng sáng lập của Optimum, người cùng đặt nền móng cho dự án.',
      team:'{n} là thành viên trong đội ngũ Optimum.',
      proj:'Optimum là hạ tầng bộ nhớ hiệu năng cao cho mọi blockchain, xây trên công nghệ RLNC đến từ MIT.',
      outro:['Mời bạn xem tiếp các bức tranh bên cạnh.','Bạn có thể bước tiếp để xem thêm.'],
      name:'Hướng dẫn viên', langName:'tiếng Việt', tts:'vi-VN'},
  en:{greet:['Hello, I am the guide of the Optimum exhibition.','Look at any painting and I will tell you about it.'],
      intro:['This is {n}.','This portrait shows {n}.','You are looking at the portrait of {n}.'],
      ceo:'{n} is the CEO of Optimum, leading the direction of the whole team.',
      founder:'{n} is a co-founder of Optimum, who helped lay the foundation of the project.',
      team:'{n} is a member of the Optimum team.',
      proj:'Optimum is high-performance memory infrastructure for any blockchain, built on RLNC technology from MIT.',
      outro:['Feel free to continue to the next paintings.','Step along to see more.'],
      name:'Guide', langName:'English', tts:'en-US'},
  ko:{greet:['안녕하세요, 옵티멈 전시관의 안내원입니다.','보고 싶은 그림을 바라보시면 제가 소개해 드릴게요.'],
      intro:['이분은 {n}님입니다.','이 초상화는 {n}님입니다.'],
      ceo:'{n}님은 옵티멈의 CEO로서 팀 전체의 방향을 이끌고 있습니다.',
      founder:'{n}님은 옵티멈의 공동 창업자로서 프로젝트의 토대를 함께 만들었습니다.',
      team:'{n}님은 옵티멈 팀의 일원입니다.',
      proj:'옵티멈은 MIT에서 나온 RLNC 기술로 만든, 모든 블록체인을 위한 고성능 메모리 인프라입니다.',
      outro:['다음 그림도 둘러보세요.'],
      name:'안내원', langName:'한국어', tts:'ko-KR'}
};
const NATIVE={vi:1,en:1,ko:1};
const TTSL={vi:'vi-VN',en:'en-US',ru:'ru-RU',ng:'en-NG',bn:'bn-BD',id:'id-ID',hi:'hi-IN',zh:'zh-CN',fil:'fil-PH',uk:'uk-UA',ko:'ko-KR'};
const TT=lang=>T[lang]||T.en;                       // bộ kịch bản gốc của ngôn ngữ (không có -> tiếng Anh)
const tr1=async(lang,s)=>(NATIVE[lang]||typeof trLine!=='function')?s:await trLine(s);   // dịch bằng trLine của boss-talk.js
const trAll=(lang,a)=>Promise.all(a.map(x=>tr1(lang,x)));
const langName=lang=>{try{return LN.find(x=>x[0]===lang)[1]}catch(e){return lang}};
const pick=a=>a[Math.floor(Math.random()*a.length)];
const title=s=>String(s).toLowerCase().replace(/(^|\s)\S/g,c=>c.toUpperCase()).replace(/\bCeo\b/g,'CEO');
const kindOf=r=>/CEO/i.test(r)?'ceo':/FOUNDER/i.test(r)?'founder':'team';
function getLang(){return typeof L!=='undefined'?L:'vi'}   // L = ngôn ngữ đang chọn (i18n.js)
function template(info,lang){
  const t=TT(lang),n=SPOKEN[info.n1]||title(info.n1),bio=BIO[info.n1]&&(BIO[info.n1][lang]||BIO[info.n1].en);
  const out=[pick(t.intro).replace('{n}',n),t[kindOf(info.n2)].replace('{n}',n)];
  if(bio)out.push(bio);
  out.push(t.proj);
  if(Math.random()<.5)out.push(pick(t.outro));
  return out;
}
// ---- AI (Groq) qua AITalk của ai-talk.js: tái dùng xoay key / dự phòng / lọc câu (clean) của bạn ----
// AITalk.line(kind,b) tự dựng prompt từ AIP[kind] và thêm "Ngôn ngữ: {lang}" theo L, nên chỉ cần đăng ký AIP.guide rồi gọi line('guide',...).
// sys được dựng ĐỒNG BỘ ngay đầu line() (trước await đầu tiên) nên gán AIP.guide rồi gọi liền là an toàn khi có nhiều yêu cầu chạy cùng lúc.
CFG.ai=async(info,lang)=>{
  if(typeof AITalk==='undefined'||typeof AIP==='undefined')return null;
  const n=SPOKEN[info.n1]||title(info.n1),f=FACTS[info.n1],bio=BIO[info.n1]&&BIO[info.n1].vi||'';
  // "FORM" gửi cho AI phân tích: tên + chức vụ + dữ kiện đã xác thực -> AI viết lời thuyết minh
  AIP.guide={
    head:`Bạn là hướng dẫn viên chuyên nghiệp của khu triển lãm Optimum, đang đứng trước bức chân dung của một thành viên dự án Optimum và thuyết minh cho khách tham quan. Giọng ấm áp, tự tin, mạch lạc như một người dẫn tour thật.
Hãy PHÂN TÍCH FORM sau rồi viết lời thuyết minh 5-7 câu (tổng 70-110 từ): (1) giới thiệu tên và chức vụ, (2) nói người này là thành viên của dự án Optimum và vai trò, (3) kể tiểu sử / thành tựu có trong form, (4) nối với dự án Optimum bằng 1 câu.
[FORM]
Tên: ${n}
Chức vụ: ${title(info.n2)}
Dự án: Optimum (x.com/get_optimum)
Dữ kiện đã xác thực về người này: ${f||bio||'(chưa có dữ kiện cá nhân nào)'}
Dữ kiện về dự án: ${COMMON}
[/FORM]
QUY TẮC: chỉ dùng dữ kiện có trong FORM. Nếu mục "Dữ kiện đã xác thực về người này" trống thì TUYỆT ĐỐI không bịa tiểu sử, trường học, công ty cũ, tuổi hay thành tích; chỉ nói tên, chức vụ, người đó là thành viên dự án Optimum và giới thiệu dự án từ "Dữ kiện về dự án". Mỗi câu trọn ý và kết thúc bằng dấu chấm. Không markdown, không ngoặc kép, không emoji, không gạch đầu dòng. Chỉ trả về lời thuyết minh.
`,
    combat:'',info:''};
  return AITalk.line('guide',{hp:1,maxhp:1,x:0,z:0,fl:0});   // trả null khi hết key / hết hạn mức / mất mạng
};
const CACHE={},PEND={};
const splitS=t=>{const a=t.replace(/\s+/g,' ').trim().match(/[^.!?。！？]+[.!?。！？…]?/g);return a?a.map(x=>x.trim()).filter(Boolean).slice(0,9):[]};
function ensure(info,lang){   // tạo (hoặc dùng lại) yêu cầu AI cho 1 tranh + ngôn ngữ; kết quả vào CACHE
  const key=info.n1+'|'+lang;
  if(CACHE[key])return Promise.resolve(CACHE[key]);
  if(PEND[key])return PEND[key];
  const p=(async()=>{
    try{
      const t=typeof CFG.ai==='function'?await CFG.ai(info,lang):null;
      const l=t&&typeof t==='string'?splitS(t):[];
      if(l.length)return CACHE[key]=l;
      if(typeof CFG.ai!=='function')return CACHE[key]=await trAll(lang,template(info,lang));
    }catch(e){}
    return null;                                   // AI không khả dụng: không cache, lần sau thử lại
  })();
  PEND[key]=p;p.then(()=>{delete PEND[key]});
  return p;
}
// Lấy lời đọc: AI nếu kịp (mặc định chờ 9s), không thì kịch bản mẫu (đã dịch bằng trLine nếu không phải vi/en/ko)
const getLines=(info,lang,wait)=>Promise.race([ensure(info,lang),new Promise(r=>setTimeout(()=>r(null),wait||9000))])
  .then(r=>r||trAll(lang,template(info,lang)));
// Làm nóng trước: khi người chơi bước lên sảnh, nhờ AI viết sẵn lời cho cả 8 tranh (cách nhau 0.7s) -> nhìn vào tranh là đọc ngay
function warm(g){
  const lang=GuideBot.getLang();
  g.easels.forEach((e,i)=>setTimeout(()=>{if(st.onDeck)ensure(e,lang)},i*700));
}

// ---------- KHUNG CHỮ ----------
// Giống khung thoại của bot/boss (class 'bt' của boss-talk.js): trên đầu hướng dẫn viên; nếu bot ra ngoài màn hình thì hiện phụ đề ở dưới.
const bub=document.createElement('div');bub.className='bt';
bub.style.cssText='position:fixed;left:0;top:0;z-index:3;display:none;pointer-events:none;background:#000;color:#fff;font:700 13px/1.4 sans-serif;padding:7px 12px;border-radius:8px;max-width:340px;text-align:center;transform-origin:50% 100%';
const bubHead=document.createElement('div'),bubBody=document.createElement('div');
bubHead.style.cssText='font-size:11px;color:#ffd070;margin-bottom:2px';
bub.appendChild(bubHead);bub.appendChild(bubBody);document.body.appendChild(bub);
const sub=document.createElement('div');
sub.style.cssText='position:fixed;left:50%;bottom:150px;transform:translateX(-50%);max-width:min(640px,86vw);padding:10px 16px;border-radius:14px;background:rgba(0,0,0,.8);color:#fff;font:700 15px/1.45 sans-serif;text-align:center;pointer-events:none;z-index:3;display:none';
const subHead=document.createElement('div'),subBody=document.createElement('div');
subHead.style.cssText='font-size:12px;color:#ffd070;margin-bottom:3px';
sub.appendChild(subHead);sub.appendChild(subBody);document.body.appendChild(sub);
let showing=false;const setHead=t=>{bubHead.textContent=t;subHead.textContent=t},setBody=t=>{bubBody.textContent=t;subBody.textContent=t};
const _hp=new THREE.Vector3();
function placeBubble(g){
  if(!showing){bub.style.display='none';sub.style.display='none';return}
  _hp.set(st.x,g.FL+2.35,st.z);const d=_hp.distanceTo(C.position);_hp.project(C);
  const on=_hp.z<1&&Math.abs(_hp.x)<.95&&_hp.y>-.9&&_hp.y<.95&&d<30;
  if(on){
    const sc=Math.max(.7,Math.min(1.2,12/d));
    bub.style.display='block';sub.style.display='none';
    bub.style.transform='translate('+(_hp.x*.5+.5)*innerWidth+'px,'+(-_hp.y*.5+.5)*innerHeight+'px) translate(-50%,-100%) translate(0,'+(-10*sc)+'px) scale('+sc+')';
  }else{bub.style.display='none';sub.style.display='block'}
}

// ---------- MÔ HÌNH VOXEL ----------
const SKIN=0xf1c9a5,HAIR=0x24170f,COAT=0x1f2d4a,GOLD=0xe8c04a,PANT=0x2b2b33,SHOE=0x3a2412,CYAN=0x7fe9ff;
const part=fn=>{const v=new VB();fn(v);return v.mesh()};
const bx=(v,x,y,z,w,h,d,c,s)=>v.box(x,y,z,w,h,d,c,s||.1);
const root=new THREE.Group(),body=new THREE.Group();root.add(body);
const mk=(m,x,y,z,p)=>{const g=new THREE.Group();g.position.set(x,y,z);g.add(m);(p||body).add(g);return g};
const legL=mk(part(v=>{bx(v,0,-.35,0,.2,.7,.2,PANT);bx(v,0,-.75,.05,.2,.1,.3,SHOE)}),-.12,.8,0);
const legR=mk(part(v=>{bx(v,0,-.35,0,.2,.7,.2,PANT);bx(v,0,-.75,.05,.2,.1,.3,SHOE)}),.12,.8,0);
const armL=mk(part(v=>{bx(v,0,-.3,0,.15,.6,.15,COAT);bx(v,0,-.65,0,.15,.1,.15,SKIN)}),-.35,1.35,0);
const armR=mk(part(v=>{bx(v,0,-.3,0,.15,.6,.15,COAT);bx(v,0,-.65,0,.15,.1,.15,SKIN)}),.35,1.35,0);
mk(part(v=>{bx(v,0,1.1,0,.5,.6,.3,COAT);bx(v,0,.85,.16,.5,.1,.02,GOLD,.02);bx(v,.12,1.2,.16,.12,.08,.02,0xffffff,.02);bx(v,0,1.33,.155,.14,.08,.02,0xf4f4f4,.02)}),0,0,0);
const head=mk(part(v=>{
  bx(v,0,.25,0,.4,.4,.4,SKIN);
  bx(v,0,.4,-.02,.44,.12,.44,HAIR,.04);bx(v,0,.2,-.2,.44,.3,.06,HAIR,.04);
  bx(v,0,.5,0,.46,.1,.46,COAT,.05);bx(v,0,.5,.26,.3,.04,.1,GOLD,.02);      // mũ hướng dẫn viên
  bx(v,-.09,.27,.205,.06,.06,.02,0x111111,.02);bx(v,.09,.27,.205,.06,.06,.02,0x111111,.02);
  bx(v,-.23,.25,0,.04,.1,.1,CYAN,.02);bx(v,.23,.25,0,.04,.1,.1,CYAN,.02);   // tai nghe
}),0,1.4,0);
const mouth=mk(part(v=>bx(v,0,0,0,.1,.03,.02,0x8a2b2b,.01)),0,.15,.205,head);
root.visible=false;S.add(root);

// ---------- TRẠNG THÁI ----------
const st={x:0,z:0,yaw:0,headYaw:0,init:false,wp:null,wait:0,walkPh:0,pointK:0,onDeck:false,
  gaze:-1,gazeT:0,speaking:-1,talking:false,last:{},lastGreet:-1e9,t:0};
let token=0;
const wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};
const _p=new THREE.Vector3(),_d=new THREE.Vector3();
function view(){
  const c=typeof C!=='undefined'?C:null;   // C = camera trong core.js
  if(!c||!c.getWorldPosition)return null;
  c.getWorldPosition(_p);c.getWorldDirection(_d);
  return{x:_p.x,y:_p.y,z:_p.z,dx:_d.x,dy:_d.y,dz:_d.z};
}

// ---------- ĐỌC THOẠI ----------
function stopSpeech(){
  token++;st.speaking=-1;st.talking=false;showing=false;
  cancelTTS();
}
// ---- GIỌNG ĐỌC ----
// Ưu tiên: (1) giọng neural/"Natural"/"Online" đúng ngôn ngữ có trong máy (Edge, Windows 11, macOS...) → (2) giọng Google Dịch theo ngôn ngữ (CFG.cloudTTS) → (3) giọng thường đúng ngôn ngữ.
// KHÔNG BAO GIỜ đọc bằng giọng sai ngôn ngữ (đó là lý do trước đây tiếng Việt bị đọc bằng phát âm tiếng Anh).
let curAudio=null,VOICES=[];
const loadVoices=()=>{try{VOICES=speechSynthesis.getVoices()||[]}catch(e){}};
if(window.speechSynthesis){loadVoices();try{speechSynthesis.addEventListener('voiceschanged',loadVoices)}catch(e){}}
const normL=x=>String(x||'').toLowerCase().replace('_','-');
const GTTS={vi:'vi',en:'en',ru:'ru',ng:'en',bn:'bn',id:'id',hi:'hi',zh:'zh-CN',fil:'tl',uk:'uk',ko:'ko'};
function pickVoice(lang){
  const want=normL(TTSL[lang]||'en-US'),pri=want.split('-')[0];let best=null,bs=0;
  for(const v of VOICES){
    const vl=normL(v.lang);if(vl.split('-')[0]!==pri&&!(pri==='fil'&&vl.startsWith('tl')))continue;
    const neural=/natural|online|neural/i.test(v.name);
    let sc=(vl===want?10:6)+(neural?8:/google/i.test(v.name)?3:/microsoft|apple|siri/i.test(v.name)?2:0);
    if(sc>bs){bs=sc;best={v,neural}}
  }
  return best;
}
// Cách đọc riêng cho từ tiếng Anh / viết tắt (chữ hiển thị giữ nguyên)
const PRON={
  vi:[[/\bCEO\b/g,'xi i ô'],[/Optimum/gi,'Óp ti mầm'],[/mump2p/gi,'mum pi tu pi'],[/\bRLNC\b/g,'a eo en xi'],[/\bMIT\b/g,'em ai ti'],[/Blockchain/gi,'Blốc chen'],[/Block Arena/gi,'Blốc A ri na']],
  en:[[/mump2p/gi,'mump two p']]
};
const pron=(t,lang)=>(PRON[lang]||[]).reduce((x,r)=>x.replace(r[0],r[1]),t);
function cancelTTS(){
  try{window.speechSynthesis&&speechSynthesis.cancel()}catch(e){}
  if(curAudio){curAudio.onended=curAudio.onerror=null;try{curAudio.pause()}catch(e){}curAudio=null}
}
const chunks=(t,n)=>{const out=[];while(t.length>n){let i=t.lastIndexOf(' ',n);if(i<n*.4)i=n;out.push(t.slice(0,i).trim());t=t.slice(i).trim()}if(t)out.push(t);return out};
function startTTS(text,lang,tk,onDone,onNoVoice){   // gọi onDone khi đọc xong (hoặc không đọc được)
  const t2=pron(text,lang),pv=window.speechSynthesis?pickVoice(lang):null;
  let finished=false;const done=()=>{if(!finished){finished=true;onDone()}};
  const local=()=>{
    if(!pv){if(onNoVoice)onNoVoice();return done()}   // không có giọng đúng ngôn ngữ: hiện chữ thay thế
    try{const u=new SpeechSynthesisUtterance(t2);u.voice=pv.v;u.lang=pv.v.lang;u.rate=CFG.rate;u.pitch=1;u.onend=u.onerror=done;speechSynthesis.speak(u)}catch(e){done()}
  };
  if(CFG.cloudTTS&&(!pv||!pv.neural)){
    const parts=chunks(t2,180);let i=0;
    const next=()=>{
      if(tk!==token)return done();
      if(i>=parts.length)return done();
      let bad=false;const fail=()=>{if(bad)return;bad=true;if(i===1)local();else done()};   // chunk đầu lỗi -> thử giọng trong máy
      try{
        const a=new Audio('https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl='+(GTTS[lang]||'en')+'&q='+encodeURIComponent(parts[i++]));
        a.playbackRate=CFG.rate;curAudio=a;a.onended=next;a.onerror=fail;
        const pl=a.play();if(pl&&pl.catch)pl.catch(fail);
      }catch(e){fail()}
    };
    next();
  }else local();
}
function say(text,tk,head,lang){
  return new Promise(res=>{
    if(tk!==token)return res();
    setHead(head);setBody('');showing=CFG.showText;   // mặc định chỉ đọc; không đọc được thì startTTS gọi lại để hiện chữ
    const dur=Math.max(1400,text.length*(CFG.tts?70/CFG.rate:55));
    let ttsDone=!CFG.tts,timeDone=false,shown=0;const t0=performance.now();
    if(CFG.tts)startTTS(text,lang,tk,()=>{ttsDone=true},()=>{showing=true});
    else showing=true;
    const iv=setInterval(()=>{
      if(tk!==token){clearInterval(iv);return res()}
      const el=performance.now()-t0,n=Math.min(text.length,Math.floor(text.length*Math.min(1,el/(dur*.85))));
      if(n!==shown){shown=n;setBody(text.slice(0,n))}
      if(el>=dur)timeDone=true;
      if((timeDone&&ttsDone)||el>dur+12000){clearInterval(iv);setBody(text);res()}
    },40);
  });
}
async function speakLines(lines,head,lang,idx){
  const tk=++token;cancelTTS();
  st.speaking=idx;st.talking=true;
  for(const l of lines){if(tk!==token)return;await say(l,tk,head,lang);if(tk!==token)return;await new Promise(r=>setTimeout(r,250))}
  if(tk!==token)return;
  st.talking=false;st.speaking=-1;setTimeout(()=>{if(tk===token)showing=false},1200);
}
async function speakPicture(idx,g){
  const info=g.easels[idx],lang=GuideBot.getLang(),mine=++token;   // ngắt câu đang đọc ngay, rồi mới chờ AI
  cancelTTS();
  st.last[idx]=st.t;st.speaking=idx;st.talking=false;
  const lines=await getLines(info,lang);
  if(mine!==token)return;                       // trong lúc chờ AI đã bị ngắt / đổi tranh
  const nm=await tr1(lang,TT(lang).name);if(mine!==token)return;
  speakLines(lines,nm+' · '+title(info.n1)+' — '+title(info.n2),lang,idx);
}

async function greet(){
  const l=GuideBot.getLang(),tk=token+1;
  const [g,nm]=await Promise.all([trAll(l,TT(l).greet),tr1(l,TT(l).name)]);
  if(token+1!==tk||!st.onDeck)return;   // đã đọc câu khác / người chơi đã rời sảnh
  speakLines(g,nm,l,-1);
}

// ---------- NHÌN TRANH ----------
function lookedEasel(P,g){
  let best=-1,bestA=1e9;
  for(let i=0;i<g.easels.length;i++){
    const e=g.easels[i],pz=e.z+.22;                      // mặt tranh quay về +z
    if(P.dz>-.05||P.z<pz)continue;
    const t=(pz-P.z)/P.dz;if(t<0||t>CFG.lookRange)continue;
    const hx=P.x+P.dx*t,hy=P.y+P.dy*t;
    if(Math.abs(hx-e.x)>.5+CFG.lookMargin||Math.abs(hy-e.y)>.5+CFG.lookMargin)continue;
    const vx=e.x-P.x,vy=e.y-P.y,vz=pz-P.z,L=Math.hypot(vx,vy,vz)||1;
    const a=Math.acos(Math.max(-1,Math.min(1,(vx*P.dx+vy*P.dy+vz*P.dz)/L)));
    if(a<bestA){bestA=a;best=i}
  }
  return best;
}

// ---------- VÒNG LẶP ----------
function update(dt){
  const g=window.PavilionGuide;
  if(!g||!g.easels){root.visible=false;return}
  if(typeof curFl!=='undefined'&&curFl!==0){root.visible=false;st.onDeck=false;if(showing||st.talking)stopSpeech();placeBubble(g);return}   // chòi chỉ có ở tầng 1 (curFl=0): sang tầng khác thì ẩn bot
  if(typeof playing!=='undefined'&&!playing){if(showing||st.talking)stopSpeech();placeBubble(g);return}   // menu / tạm dừng: bot đứng yên, ngừng đọc
  st.t+=dt;
  const zx0=g.cx-g.HX+CFG.xPad,zx1=g.cx+g.HX-CFG.xPad,zz0=g.cz+CFG.zMin,zz1=g.cz+CFG.zMax;
  const clampX=x=>Math.max(zx0,Math.min(zx1,x)),clampZ=z=>Math.max(zz0,Math.min(zz1,z));
  if(!st.init){st.x=g.cx;st.z=(zz0+zz1)/2;st.yaw=0;st.init=true}
  root.visible=true;

  const P=view();
  const on=!!P&&Math.abs(P.x-g.cx)<g.HX+.2&&Math.abs(P.z-g.cz)<g.HZ+.2&&P.y>g.FL+.8&&P.y<g.FL+3.3;
  if(on&&!st.onDeck&&st.t-st.lastGreet>60){st.lastGreet=st.t;greet()}
  if(on&&!st.onDeck)warm(g);
  if(!on&&st.onDeck)stopSpeech();
  st.onDeck=on;

  // --- nhìn tranh ---
  if(on){
    const c=lookedEasel(P,g);
    if(c===st.gaze)st.gazeT+=dt;else{st.gaze=c;st.gazeT=0}
    if(c>=0&&st.gazeT>=CFG.dwell&&c!==st.speaking&&st.t-(st.last[c]??-1e9)>CFG.cooldown)speakPicture(c,g);
  }else{st.gaze=-1;st.gazeT=0}

  // --- di chuyển ---
  let tx,tz,spd=0,face=null;
  if(on){
    const fl=Math.hypot(P.dx,P.dz)||1,fx=P.dx/fl,fz=P.dz/fl,rx=-fz,rz=fx;
    let side=1,gx,gz;
    for(let k=0;k<2;k++){
      gx=clampX(P.x+rx*side*CFG.followDist+fx*.5);gz=clampZ(P.z+rz*side*CFG.followDist+fz*.5);   // đứng chếch phía trước-bên cạnh để luôn trong tầm nhìn
      if(Math.hypot(gx-P.x,gz-P.z)>.85)break;side=-side;
    }
    tx=gx;tz=gz;
    const d=Math.hypot(tx-st.x,tz-st.z);spd=d<.15?0:Math.min(CFG.run,d*3.2);
  }else{
    if(!st.wp||st.wait>0){
      if(st.wait>0){st.wait-=dt;if(st.wait<=0)st.wp=null}
      if(!st.wp&&st.wait<=0){st.wp={x:zx0+Math.random()*(zx1-zx0),z:zz0+.2+Math.random()*(zz1-zz0-.4)}}
    }
    if(st.wp&&st.wait<=0){
      tx=st.wp.x;tz=st.wp.z;const d=Math.hypot(tx-st.x,tz-st.z);
      if(d<.15){st.wait=1.5+Math.random()*2.5;spd=0}else spd=CFG.walk;
    }
  }
  const mv=spd>.05;
  if(mv){
    const d=Math.hypot(tx-st.x,tz-st.z)||1,step=Math.min(d,spd*dt);
    st.x=clampX(st.x+(tx-st.x)/d*step);st.z=clampZ(st.z+(tz-st.z)/d*step);
    face=Math.atan2(tx-st.x,tz-st.z);
  }
  if(on){   // không đứng chồng lên người chơi
    const ox=st.x-P.x,oz=st.z-P.z,od=Math.hypot(ox,oz);
    if(od<.7&&od>.001){st.x=clampX(P.x+ox/od*.7);st.z=clampZ(P.z+oz/od*.7)}
  }

  // --- hướng người / đầu / tay ---
  const present=on&&st.speaking>=0&&st.talking&&g.easels[st.speaking];
  let lookX=null,lookZ=null;
  if(present){const e=g.easels[st.speaking];lookX=e.x;lookZ=e.z+.22;face=Math.atan2(lookX-st.x,lookZ-st.z)}
  else if(on){lookX=P.x;lookZ=P.z;if(!mv)face=Math.atan2(P.x-st.x,P.z-st.z)}
  if(face!==null)st.yaw+=wrap(face-st.yaw)*Math.min(1,dt*8);
  const hy=lookX!==null?Math.max(-1,Math.min(1,wrap(Math.atan2(lookX-st.x,lookZ-st.z)-st.yaw))):0;
  st.headYaw+=(hy-st.headYaw)*Math.min(1,dt*10);

  // --- hoạt ảnh ---
  st.walkPh+=spd*dt*2.4;
  const k=Math.min(1,spd/1.2),sw=Math.sin(st.walkPh)*k*.7;
  st.pointK+=((present?1:0)-st.pointK)*Math.min(1,dt*8);
  legL.rotation.x=sw;legR.rotation.x=-sw;
  armL.rotation.x=-sw*.8+(st.talking&&!mv?-.35+Math.sin(st.t*4)*.15:0);
  armR.rotation.x=sw*.8*(1-st.pointK)+(-1.45+Math.sin(st.t*3)*.04)*st.pointK;
  body.rotation.x=spd>CFG.walk*1.5?.12:0;
  body.position.y=Math.abs(Math.sin(st.walkPh))*.04*k;
  head.rotation.y=st.headYaw;head.rotation.x=present?-.05:0;
  mouth.scale.y=st.talking?1+1.6*Math.abs(Math.sin(st.t*14)):1;

  root.position.set(st.x,g.FL,st.z);root.rotation.y=st.yaw;
  placeBubble(g);
}
let prev=performance.now();
(function loop(){requestAnimationFrame(loop);const n=performance.now(),dt=Math.min(.05,(n-prev)/1000);prev=n;try{update(dt)}catch(e){console.error('[GuideBot]',e)}})();

// ---------- API ----------
// AI: GuideBot.cfg.ai đã gắn sẵn với AITalk (ai-talk.js). Gõ AITalk.status() trong Console để xem tình trạng key.
// Hết key / hết hạn mức / mất mạng => tự dùng kịch bản mẫu (dịch bằng trLine nếu không phải vi/en/ko).
window.GuideBot={cfg:CFG,getLang,stop:stopSpeech,speak:i=>window.PavilionGuide&&speakPicture(i,window.PavilionGuide),root};
})();
