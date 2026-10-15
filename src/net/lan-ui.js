// Giao diện chơi nhiều người: nút "🌐 Nhiều người" ở bảng bắt đầu -> hộp thoại (Tạo phòng / nhập mã phòng) -> SẢNH CHỜ (mã phòng, danh sách người,
// chủ phòng bấm Bắt đầu) -> vào trận. Trong trận: thanh trạng thái, bảng điểm (giữ Tab), chat (Enter / T), kill feed.
// Điều khiển mạng thực sự nằm ở net/net.js. Nạp CUỐI CÙNG (sau ui/profile.js) vì dùng #go, #ov, PROFILE, L, $ và NET.
// Chữ: vi + en (ngôn ngữ khác tự dùng tiếng Anh) - thêm bản dịch ở NT.
window.LanUI=(function(){
  const NT={
    vi:{btn:'Nhiều người',lan:'Chơi nhiều người',create:'🏠 Tạo phòng',or:'hoặc vào phòng của bạn bè',code:'Mã phòng',codePh:'vd: K7P3X',join:'Vào phòng',leave:'Rời phòng',close:'Đóng',
      connecting:'Đang kết nối…',players:'Người chơi',ping:'Ping',
      e_code:'Hãy nhập mã phòng (5 ký tự).',e_nocode:'Không tìm thấy phòng có mã này. Kiểm tra lại mã, hoặc chủ phòng đã đóng phòng.',
      e_conn:'Không kết nối được. Cần có internet, và mạng không được chặn WebRTC.',e_timeout:'Hết thời gian chờ. Hãy thử lại.',e_full:'Phòng đã đầy.',
      e_closed:'Mất kết nối với chủ phòng.',e_hostleft:'Chủ phòng đã đóng phòng.',
      lobby:'Sảnh chờ',roomCode:'MÃ PHÒNG',copy:'Sao chép mã',copyLink:'Sao chép link mời',copied:'Đã sao chép',
      shareH:'Gửi mã này (hoặc link mời) cho bạn bè. Họ mở game, bấm "Nhiều người" và nhập mã.',
      start:'▶ Bắt đầu',waitHost:'Đang chờ chủ phòng bắt đầu…',waitPlayers:'Bạn là chủ phòng. Bấm Bắt đầu khi mọi người đã vào đủ.',
      youHost:'Cài đặt phòng (chủ phòng)',pvp:'⚔️ PvP (bắn trúng nhau gây sát thương)',bots:'🤖 Bot / quái (mỗi máy tự chạy riêng)',
      note:'Lưu ý: bot, boss và vật phẩm chạy riêng trên từng máy; chỉ người chơi được đồng bộ.',inGame:'Đang trong trận',
      kills:'Hạ',deaths:'Chết',name:'Tên',sbH:'Bảng điểm',chatPh:'Nhắn tin… (Enter để gửi, Esc để huỷ)',
      joined:'{0} vào phòng',left:'{0} rời phòng',died:'{0} ☠',lost:'Mất kết nối',hint:'Enter: chat · Tab: bảng điểm',
      go:'▶ Vào trận',startedSub:'Chủ phòng đã bắt đầu! Bấm để vào trận.',needStart:'Chờ chủ phòng bấm Bắt đầu.'},
    en:{btn:'Multiplayer',lan:'Multiplayer',create:'🏠 Create room',or:'or join a friend\'s room',code:'Room code',codePh:'e.g. K7P3X',join:'Join room',leave:'Leave room',close:'Close',
      connecting:'Connecting…',players:'Players',ping:'Ping',
      e_code:'Enter the room code (5 characters).',e_nocode:'No room with this code. Check the code, or the host has closed the room.',
      e_conn:'Could not connect. You need internet access and a network that allows WebRTC.',e_timeout:'Timed out. Please try again.',e_full:'The room is full.',
      e_closed:'Lost connection to the host.',e_hostleft:'The host closed the room.',
      lobby:'Lobby',roomCode:'ROOM CODE',copy:'Copy code',copyLink:'Copy invite link',copied:'Copied',
      shareH:'Send this code (or the invite link) to your friends. They open the game, press "Multiplayer" and enter the code.',
      start:'▶ Start',waitHost:'Waiting for the host to start…',waitPlayers:'You are the host. Press Start when everyone has joined.',
      youHost:'Room settings (host)',pvp:'⚔️ PvP (players damage each other)',bots:'🤖 Bots / monsters (each PC runs its own)',
      note:'Note: bots, bosses and items run separately on each PC; only players are synchronised.',inGame:'Match in progress',
      kills:'Kills',deaths:'Deaths',name:'Name',sbH:'Scoreboard',chatPh:'Type a message… (Enter to send, Esc to cancel)',
      joined:'{0} joined',left:'{0} left',died:'{0} ☠',lost:'Disconnected',hint:'Enter: chat · Tab: scoreboard',
      go:'▶ Enter match',startedSub:'The host started the match! Click to enter.',needStart:'Waiting for the host to press Start.'}
  };
  const tr=(k,...a)=>{let s=((NT[L]||NT.en)[k])||NT.en[k]||k;a.forEach((v,i)=>s=s.split('{'+i+'}').join(v));return s};
  const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};
  const st=NET.st;
  const touch=()=>document.body.classList.contains('touch');

  // ---------- CSS ----------
  const css=document.createElement('style');
  css.textContent=`
#lanm{position:fixed;inset:0;z-index:70;display:none;align-items:center;justify-content:center;background:rgba(29,27,42,.55);backdrop-filter:blur(3px)}
#lanm.on{display:flex}
#lanc{background:var(--card);color:var(--ink);border:3px solid var(--blue);border-radius:22px;padding:18px 22px;width:min(94vw,560px);max-height:94vh;overflow-y:auto;box-sizing:border-box;text-align:left}
#lanc h2{margin:0 0 8px;font-size:24px;text-align:center}
#lanc .lrow{display:flex;gap:8px;align-items:center;margin:8px 0;flex-wrap:wrap}
#lanc label{font-weight:bold;font-size:14px;flex:0 0 100%}
#lanc input[type=text]{flex:1;min-width:0;box-sizing:border-box;font:700 18px "Segoe UI","Noto Sans",sans-serif;padding:8px 10px;border:3px solid var(--pink);border-radius:12px;background:#fff;color:#2b2a3a;outline:none}
#lanc .lbtn{font:inherit;font-weight:bold;font-size:16px;border:3px solid var(--blue);background:transparent;color:var(--ink);border-radius:12px;padding:8px 14px;cursor:pointer}
#lanc .lbtn.go{background:var(--pink);border-color:var(--pink);color:#2b2a3a}
#lanc .lbtn:disabled{opacity:.5;cursor:default}
#lanc .err{color:#e03b5a;font-weight:bold;font-size:14px;line-height:1.45;margin:6px 0}
#lanc .ok{color:#1f9d55;font-weight:bold;margin:4px 0}
#lanc .help{font-size:12.5px;line-height:1.6;opacity:.9;margin:8px 0;padding:8px 10px;border-radius:12px;background:rgba(127,191,255,.16);border:2px solid var(--blue)}
#lanc .help b{display:block;margin-bottom:2px}
#lanc code{background:rgba(127,127,127,.22);border-radius:5px;padding:0 5px;font-size:12px}
#lanc .chk{display:flex;gap:8px;align-items:center;font-size:15px;font-weight:bold;margin:6px 0;cursor:pointer}
#lanc .chk input{width:20px;height:20px;accent-color:var(--pink)}
#lanc .urls code{display:block;margin:3px 0;font-size:15px;user-select:all}
#lanc .plist{margin:6px 0;padding:0;list-style:none;font-size:15px}
#lanc .plist li{display:flex;gap:8px;padding:4px 8px;border-radius:8px}
#lanc .plist li:nth-child(odd){background:rgba(127,127,127,.12)}
#lanc .plist .n{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#lanc .sm{font-size:12px;opacity:.75}
#lanc .big{display:block;margin:10px auto;text-align:center;font:800 46px/1 'Trebuchet MS',Verdana,monospace;letter-spacing:.18em;padding:12px 8px;border:3px dashed var(--pink);border-radius:16px;user-select:all}
#lanc .or{text-align:center;opacity:.7;margin:10px 0 2px;font-size:13px}
#lanc .lbtn.big2{width:100%;font-size:20px;padding:12px}
#lanc input.cin{text-transform:uppercase;letter-spacing:.3em;text-align:center;font-size:24px}
.lb.lan{border-color:var(--blue)}.lb.lan.live{background:#3dd17a;border-color:#3dd17a;color:#14301f}
#netbar{position:absolute;left:50%;top:calc(10px + env(safe-area-inset-top,0px));transform:translateX(-50%);display:none;gap:8px;align-items:center;font-size:14px;padding:5px 12px;pointer-events:none;white-space:nowrap}
#netbar .nb{pointer-events:auto;font:inherit;border:2px solid #2b2a3a;background:#fff;border-radius:9px;padding:0 7px;cursor:pointer;display:none}
body.touch #netbar .nb{display:inline-block}
#netbar .hint{opacity:.6;font-size:12px}body.touch #netbar .hint{display:none}
#kfeed{position:absolute;right:16px;top:calc(64px + env(safe-area-inset-top,0px));display:flex;flex-direction:column;align-items:flex-end;gap:4px}
#kfeed div{background:rgba(255,255,255,.9);border-radius:10px;padding:3px 10px;font-size:14px;animation:kfin .2s ease-out}
#kfeed .me{outline:2px solid var(--pink)}
@keyframes kfin{from{opacity:0;transform:translateX(14px)}}
#lchat{position:absolute;left:16px;bottom:calc(112px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:3px;max-width:min(46vw,440px)}
body.touch #lchat{bottom:calc(80px + env(safe-area-inset-bottom,0px));left:calc(12px + env(safe-area-inset-left,0px));font-size:12px}
#lchat div{background:rgba(255,255,255,.88);border-radius:9px;padding:3px 9px;font-size:14px;line-height:1.35;word-break:break-word;transition:opacity .5s}
#lchat div.old{opacity:0}
#lchat.open div.old{opacity:1}
#lchat .sys{opacity:.8;font-style:italic}
#lanchatw{position:fixed;left:50%;bottom:calc(120px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:8;display:none;width:min(92vw,520px)}
#lanchat{width:100%;box-sizing:border-box;font:700 17px "Segoe UI","Noto Sans","Noto Sans Bengali","Noto Sans Devanagari","Noto Sans SC","Microsoft YaHei","Malgun Gothic",sans-serif;padding:9px 12px;border:3px solid var(--pink);border-radius:12px;background:rgba(255,255,255,.96);color:#2b2a3a;outline:none}
#lansb{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:none;width:min(92vw,560px);max-height:80vh;overflow:auto;background:rgba(255,255,255,.95);border-radius:18px;padding:12px 16px;box-shadow:0 0 0 3px #2b2a3a}
#lansb h3{margin:0 0 6px;text-align:center;font-size:18px}
#lansb table{width:100%;border-collapse:collapse;font-size:15px}
#lansb th{font-size:12px;opacity:.7;text-align:right;padding:2px 6px}
#lansb th:first-child,#lansb td:first-child{text-align:left}
#lansb td{padding:4px 6px;text-align:right;border-top:1px solid rgba(0,0,0,.1)}
#lansb td:first-child{max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#lansb tr.me td{background:rgba(255,127,168,.22);font-weight:bold}`;
  document.head.appendChild(css);

  // ---------- nút ở bảng bắt đầu ----------
  const btn=el('button','lb lan','🌐 '+tr('btn'));btn.type='button';
  $('go').before(btn);
  btn.addEventListener('click',e=>{e.stopPropagation();open()});

  // ---------- hộp thoại ----------
  const modal=el('div');modal.id='lanm';const card=el('div');card.id='lanc';modal.appendChild(card);document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)close()});
  addEventListener('keydown',e=>{if(e.code==='Escape'&&modal.classList.contains('on'))close()});
  let codeVal='';
  const isOpen=()=>modal.classList.contains('on');
  const open=()=>{render();modal.classList.add('on')};
  const close=()=>modal.classList.remove('on');
  const copy=(txt,b)=>{try{navigator.clipboard.writeText(txt)}catch(e){}const o=b.textContent;b.textContent='✔ '+tr('copied');setTimeout(()=>b.textContent=o,1200)};
  const inviteLink=()=>location.origin.replace(/^null$/,'')+location.pathname+'?room='+st.code;

  function render(){
    const old=card.querySelector('#lancode');if(old)codeVal=old.value;
    card.textContent='';
    if(!st.on&&!st.connecting){   // ---- chưa vào phòng: tạo phòng hoặc nhập mã ----
      card.appendChild(el('h2',null,'🌐 '+tr('lan')));
      const cr=el('button','lbtn go big2',tr('create'));cr.type='button';cr.addEventListener('click',()=>NET.createRoom());card.appendChild(cr);
      card.appendChild(el('div','or','— '+tr('or')+' —'));
      const r=el('div','lrow');r.appendChild(el('label',null,tr('code')));
      const inp=el('input','cin');inp.type='text';inp.id='lancode';inp.placeholder=tr('codePh');inp.maxLength=8;inp.value=codeVal;inp.autocomplete='off';inp.spellcheck=false;
      inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')go()});inp.addEventListener('keyup',e=>e.stopPropagation());
      inp.addEventListener('input',()=>{inp.value=inp.value.toUpperCase().replace(/[^A-Z0-9]/g,'')});
      const b=el('button','lbtn go',tr('join'));b.type='button';b.addEventListener('click',()=>go());
      r.append(inp,b);card.appendChild(r);
      if(st.err)card.appendChild(el('div','err',tr('e_'+st.err)));
      const go=()=>{codeVal=inp.value;NET.joinRoom(codeVal)};
      setTimeout(()=>{if(!touch()&&isOpen())inp.focus()},30);
    }else if(st.connecting){
      card.appendChild(el('h2',null,'🌐 '+tr('lan')));card.appendChild(el('div','ok','⏳ '+tr('connecting')+(st.code?' ('+st.code+')':'')));
    }else{
      card.appendChild(el('h2',null,'🌐 '+(st.started?tr('inGame'):tr('lobby'))));
      // mã phòng (chủ phòng + người vào đều thấy, để rủ thêm bạn)
      card.appendChild(el('code','big',st.code));
      const row=el('div','lrow');row.style.justifyContent='center';
      const b1=el('button','lbtn',tr('copy'));b1.type='button';b1.addEventListener('click',()=>copy(st.code,b1));
      const b2=el('button','lbtn',tr('copyLink'));b2.type='button';b2.addEventListener('click',()=>copy(inviteLink(),b2));
      row.append(b1,b2);card.appendChild(row);
      if(st.host&&!st.started)card.appendChild(el('div','sm',tr('shareH')));
      card.appendChild(el('div','sm',tr('players')+': '+NET.roster.size+' / '+st.cfg.max+(st.started?' · '+tr('ping')+': '+st.ping+' ms':'')));
      const ul=el('ul','plist');
      for(const p of sorted()){const li=el('li');li.append(el('span','n',(p.host?'👑 ':'')+p.name+(p.me?' ★':'')),el('span','sm',st.started?'🎯 '+p.k+'  ☠ '+p.d:''));ul.appendChild(li)}
      card.appendChild(ul);
      if(st.host){
        const h=el('div','help');h.appendChild(el('b',null,tr('youHost')));
        h.appendChild(chk(tr('pvp'),st.cfg.pvp,v=>NET.setCfg({pvp:v})));
        h.appendChild(chk(tr('bots'),st.cfg.bots,v=>NET.setCfg({bots:v})));
        card.appendChild(h);
        if(!st.started){const sb=el('button','lbtn go big2',tr('start'));sb.type='button';sb.addEventListener('click',()=>NET.start());card.appendChild(sb);card.appendChild(el('div','sm',tr('waitPlayers')))}
      }else if(!st.started)card.appendChild(el('div','ok','⏳ '+tr('waitHost')));
      card.appendChild(el('div','sm',tr('note')));
    }
    const row=el('div','lrow');row.style.justifyContent='center';
    if(st.on||st.connecting){const lv=el('button','lbtn',tr('leave'));lv.type='button';lv.addEventListener('click',()=>{NET.leave()});row.appendChild(lv)}
    const cl=el('button','lbtn go',tr('close'));cl.type='button';cl.addEventListener('click',close);row.appendChild(cl);
    card.appendChild(row);
  }
  function chk(label,val,fn){
    const l=el('label','chk'),i=el('input');i.type='checkbox';i.checked=!!val;i.addEventListener('change',()=>fn(i.checked));
    l.append(i,el('span',null,label));l.style.flex='0 0 100%';return l;
  }
  const sorted=()=>Array.from(NET.roster.values()).sort((a,b)=>b.k-a.k||a.d-b.d||a.name.localeCompare(b.name));

  // ---------- HUD ----------
  const hud=$('hud');
  const bar=el('div','pill');bar.id='netbar';
  const barT=el('span');const bSb=el('button','nb','👥'),bCh=el('button','nb','💬'),hint=el('span','hint');
  bar.append(barT,bSb,bCh,hint);hud.appendChild(bar);
  const feed=el('div');feed.id='kfeed';hud.appendChild(feed);
  const chatLog=el('div');chatLog.id='lchat';hud.appendChild(chatLog);
  const sb=el('div');sb.id='lansb';hud.appendChild(sb);
  const chatW=el('div');chatW.id='lanchatw';const chatI=el('input');chatI.id='lanchat';chatI.type='text';chatI.maxLength=160;chatI.autocomplete='off';chatI.spellcheck=false;
  chatW.appendChild(chatI);document.body.appendChild(chatW);

  function updBar(){
    const on=st.on&&st.started;bar.style.display=on?'flex':'none';
    btn.classList.toggle('live',st.on);btn.textContent=st.on?'🌐 '+st.code+' · '+NET.roster.size:'🌐 '+tr('btn');
    if(on){barT.textContent='🌐 '+st.code+' · 👥 '+NET.roster.size+' · '+st.ping+' ms'+(st.cfg.pvp?' · ⚔️':'');hint.textContent=tr('hint')}
    else{sb.style.display='none';closeChat()}
  }
  function drawSb(){
    sb.textContent='';sb.appendChild(el('h3',null,'🏆 '+tr('sbH')+' · '+(st.cfg.name||'')));
    const t=el('table'),h=el('tr');for(const c of[tr('name'),tr('kills'),tr('deaths'),tr('ping')])h.appendChild(el('th',null,c));t.appendChild(h);
    for(const p of sorted()){const r=el('tr',p.me?'me':'');r.appendChild(el('td',null,(p.host?'👑 ':'')+p.name));for(const v of[p.k,p.d,p.ping+' ms'])r.appendChild(el('td',null,String(v)));t.appendChild(r)}
    sb.appendChild(t);
  }
  let sbOn=false;
  function showSb(v){sbOn=v&&st.on&&st.started;sb.style.display=sbOn?'block':'none';if(sbOn)drawSb()}
  bSb.addEventListener('click',()=>showSb(!sbOn));

  // kill feed: tối đa 5 dòng, mỗi dòng tồn tại 6 giây
  function pushFeed(k,v,hs){
    const d=el('div',(k&&k.me)||(v&&v.me)?'me':'');
    d.textContent=k?k.name+(hs?' 🎯 ':' 🔫 ')+(v?v.name:'?'):tr('died',v?v.name:'?');
    feed.appendChild(d);while(feed.children.length>5)feed.firstChild.remove();
    setTimeout(()=>d.remove(),6000);
  }
  // chat: hiện 8 giây rồi mờ dần (đang mở ô nhập thì hiện hết)
  function pushChat(name,text,sys){
    const d=el('div',sys?'sys':'');
    if(sys)d.textContent=text;else{const b=el('b',null,name+': ');d.append(b,document.createTextNode(text))}
    chatLog.appendChild(d);while(chatLog.children.length>8)chatLog.firstChild.remove();
    setTimeout(()=>d.classList.add('old'),8000);
  }

  // ---------- chat: Enter / T ----------
  function openChat(){
    if(NET.typing||!st.on||!st.started)return;
    NET.typing=true;for(const k in keys)keys[k]=0;   // nhả mọi phím đang giữ để nhân vật không tự chạy
    md=false;chatW.style.display='block';chatLog.classList.add('open');chatI.placeholder=tr('chatPh');chatI.value='';chatI.focus();
  }
  function closeChat(){
    if(!NET.typing)return;
    NET.typing=false;chatW.style.display='none';chatLog.classList.remove('open');chatI.blur();
  }
  chatI.addEventListener('keydown',e=>{
    e.stopPropagation();   // phím gõ chat không lọt xuống phím tắt của game
    if(e.key==='Enter'&&!e.isComposing){NET.chat(chatI.value);closeChat()}
    else if(e.key==='Escape')closeChat();
  });
  chatI.addEventListener('keyup',e=>e.stopPropagation());
  chatI.addEventListener('blur',()=>setTimeout(closeChat,0));
  addEventListener('mousedown',e=>{if(NET.typing)e.stopImmediatePropagation()},true);   // đang gõ chat: bấm chuột không bắn
  bCh.addEventListener('click',()=>{if(NET.typing)closeChat();else openChat()});

  addEventListener('keydown',e=>{
    if(!st.on||!st.started||NET.typing||e.repeat)return;
    if(e.code==='Tab'){if(!playing)return;e.preventDefault();showSb(true)}   // chỉ khi đang chơi (ngoài game Tab dùng để di chuyển giữa các nút)
    else if((e.code==='Enter'||e.code==='KeyT')&&playing){e.preventDefault();openChat()}
  });
  addEventListener('keyup',e=>{if(e.code==='Tab'&&sbOn){e.preventDefault();showSb(false)}});
  addEventListener('blur',()=>showSb(false));

  // ---------- nối với NET ----------
  NET.sub('status',()=>{
    updBar();if(isOpen())render();
    if(!st.on&&st.err==='closed')showMsg(tr('lost'));
  });
  NET.sub('score',()=>{updBar();if(sbOn)drawSb();if(isOpen())render()});
  NET.sub('cfg',()=>{if(isOpen())render()});
  NET.sub('join',p=>pushChat('',tr('joined',p.name),true));
  NET.sub('leave',p=>pushChat('',tr('left',p.name),true));
  NET.sub('kill',o=>pushFeed(o.k,o.v,o.hs));
  NET.sub('chat',o=>pushChat(o.name,o.text,false));
  // chủ phòng bấm Bắt đầu: đóng sảnh, bảng "Bấm để chơi" hiện sẵn với nút "Vào trận" (trình duyệt cần 1 cú bấm để khoá chuột)
  NET.sub('start',()=>{
    close();
    $('ov').style.display='flex';
    if(typeof ovState!=='undefined'&&ovState==='dead')return;
    $('sub').textContent=tr('startedSub');$('go').textContent=tr('go');
  });
  // chưa tới lúc bắt đầu thì không cho bấm "Bấm để chơi": mở lại sảnh chờ
  document.addEventListener('click',e=>{
    if(st.on&&!st.started&&e.target.closest&&e.target.closest('#ov')&&!e.target.closest('#lanm')&&!e.target.closest('.lb')&&!e.target.closest('.wb')){
      e.stopPropagation();e.preventDefault();showMsg(tr('needStart'));open();
    }
  },true);
  setInterval(()=>{if(st.on){updBar();if(isOpen())render()}},4000);   // ping / số người cập nhật định kỳ

  // link mời ?room=MÃ : đợi người chơi qua màn chọn ngôn ngữ / tên / nhân vật (#pf ẩn đi) rồi tự vào phòng
  const rm=(new URLSearchParams(location.search).get('room')||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(rm.length>=4){
    codeVal=rm;
    (function wait(){
      const pf=$('pf');
      if(pf&&pf.style.display!=='none'){setTimeout(wait,300);return}
      NET.joinRoom(rm);open();
    })();
  }

  return {open,close};
})();
