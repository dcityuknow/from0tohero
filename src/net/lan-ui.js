// Màn hình chọn cách chơi (dựng riêng, nền game mờ + khối voxel trang trí), hiện SAU bước chọn ngôn ngữ / tên / nhân vật:
//   [Chơi một mình]  -> vào bảng "Bấm để chơi" như cũ
//   [Chơi team]      -> [Tạo phòng] (chủ phòng, nhận mã) hoặc [Vào phòng] (nhập mã)  ->  SẢNH CHỜ (mã phòng, danh sách người, chủ phòng bấm Bắt đầu)  -> vào trận
// Trong trận: thanh trạng thái, bảng điểm (giữ Tab), chat (Enter / T), kill feed. Điều khiển mạng thực sự nằm ở net/net.js.
// Nạp CUỐI CÙNG (sau ui/profile.js, nó gọi LanUI.afterProfile khi hồ sơ xong). Chữ: vi + en (ngôn ngữ khác tự dùng tiếng Anh) - thêm bản dịch ở NT.
window.LanUI=(function(){
  const NT={
    vi:{btn:'Phòng',hello:'Xin chào, {0}!',ask:'Bạn muốn chơi thế nào?',soloT:'Chơi một mình',soloD:'Leo 4 tầng, hạ từng con boss bằng sức của chính bạn.',soloB:'▶ Chơi solo',
      teamT:'Chơi cùng bạn bè',teamD:'Tạo phòng, gửi mã cho bạn bè rồi cùng vào trận.',teamB:'👥 Chơi team',back:'← Quay lại',
      createT:'Tạo phòng',createD:'Bạn là chủ phòng: nhận mã phòng để mời bạn bè, bạn bấm Bắt đầu khi đủ người.',createB:'🏠 Tạo phòng',
      joinT:'Vào phòng',joinD:'Nhập mã phòng 5 ký tự mà chủ phòng gửi cho bạn.',joinB:'Vào phòng',codePh:'MÃ',leave:'Rời phòng',close:'Đóng',
      connecting:'Đang kết nối…',players:'Người chơi',ping:'Ping',
      e_code:'Hãy nhập mã phòng (5 ký tự).',e_nocode:'Không tìm thấy phòng có mã này. Kiểm tra lại mã, hoặc chủ phòng đã đóng phòng.',
      e_conn:'Không kết nối được. Cần có internet, và mạng không được chặn WebRTC.',e_timeout:'Hết thời gian chờ. Hãy thử lại.',e_full:'Phòng đã đầy.',
      e_closed:'Mất kết nối với chủ phòng.',e_hostleft:'Chủ phòng đã đóng phòng.',
      lobby:'Sảnh chờ',inGame:'Đang trong trận',roomCode:'MÃ PHÒNG',copy:'Sao chép mã',copyLink:'Sao chép link mời',copied:'Đã sao chép',
      shareH:'Gửi mã hoặc link mời cho bạn bè. Họ mở game, chọn "Chơi team" rồi nhập mã.',
      start:'▶ Bắt đầu',waitHost:'Đang chờ chủ phòng bắt đầu…',waitPlayers:'Bạn là chủ phòng. Bấm Bắt đầu khi mọi người đã vào đủ.',
      youHost:'Cài đặt phòng',pvp:'⚔️ PvP (bắn trúng nhau gây sát thương)',bots:'🤖 Bot / quái (mỗi máy tự chạy riêng)',
      note:'Lưu ý: bot, boss và vật phẩm chạy riêng trên từng máy; chỉ người chơi được đồng bộ.',hostTag:'Chủ phòng',you:'Bạn',
      kills:'Hạ',deaths:'Chết',name:'Tên',sbH:'Bảng điểm',chatPh:'Nhắn tin… (Enter để gửi, Esc để huỷ)',
      joined:'{0} vào phòng',left:'{0} rời phòng',died:'{0} ☠',lost:'Mất kết nối',hint:'Enter: chat · Tab: bảng điểm',
      go:'▶ Vào trận',startedSub:'Chủ phòng đã bắt đầu! Bấm để vào trận.',needStart:'Chờ chủ phòng bấm Bắt đầu.'},
    en:{btn:'Room',hello:'Hello, {0}!',ask:'How do you want to play?',soloT:'Play solo',soloD:'Climb 4 floors and beat every boss on your own.',soloB:'▶ Play solo',
      teamT:'Play with friends',teamD:'Create a room, send the code to your friends and enter the match together.',teamB:'👥 Play team',back:'← Back',
      createT:'Create a room',createD:'You are the host: get a room code to invite friends, press Start when everyone is in.',createB:'🏠 Create room',
      joinT:'Join a room',joinD:'Enter the 5-character room code the host sent you.',joinB:'Join room',codePh:'CODE',leave:'Leave room',close:'Close',
      connecting:'Connecting…',players:'Players',ping:'Ping',
      e_code:'Enter the room code (5 characters).',e_nocode:'No room with this code. Check the code, or the host has closed the room.',
      e_conn:'Could not connect. You need internet access and a network that allows WebRTC.',e_timeout:'Timed out. Please try again.',e_full:'The room is full.',
      e_closed:'Lost connection to the host.',e_hostleft:'The host closed the room.',
      lobby:'Lobby',inGame:'Match in progress',roomCode:'ROOM CODE',copy:'Copy code',copyLink:'Copy invite link',copied:'Copied',
      shareH:'Send the code or the invite link to your friends. They open the game, choose "Play team" and enter the code.',
      start:'▶ Start',waitHost:'Waiting for the host to start…',waitPlayers:'You are the host. Press Start when everyone has joined.',
      youHost:'Room settings',pvp:'⚔️ PvP (players damage each other)',bots:'🤖 Bots / monsters (each PC runs its own)',
      note:'Note: bots, bosses and items run separately on each PC; only players are synchronised.',hostTag:'Host',you:'You',
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
#modes{position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;overflow:hidden;
  background:#000;color:#2b2a3a}   /* nền đen + hạt (ui/menu-fx.js) */
#modes.on{display:flex}
body.modes-on #ov,body.modes-on #hud{visibility:hidden}   /* màn chọn nằm riêng: ẩn bảng hướng dẫn + HUD phía sau, chỉ còn cảnh game mờ */
#modes .mwrap{position:relative;z-index:1;width:min(94vw,860px);max-height:96vh;overflow-y:auto;padding:10px 6px;box-sizing:border-box;text-align:center}
#modes h1{margin:0;font:900 clamp(34px,7vw,60px)/1.05 "Trebuchet MS","Segoe UI",sans-serif;letter-spacing:.04em;color:#fff;text-shadow:0 4px 0 #ff7fa8,0 8px 0 #7fbfff,0 14px 22px rgba(30,30,60,.35)}
#modes .sub{margin:12px 0 20px;font-weight:800;font-size:clamp(16px,2.6vw,21px);color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.6)}
#modes .row{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:18px;margin:6px 0 14px}
#modes .mcard{display:flex;flex-direction:column;align-items:center;position:relative;border-radius:26px;padding:22px 20px 20px;border:4px solid;background:#fff;box-shadow:0 8px 0 rgba(43,42,58,.16),0 18px 34px rgba(30,30,60,.22);text-align:center;transition:transform .15s,box-shadow .15s}
#modes .mcard.pink{border-color:#ff7fa8;background:linear-gradient(#fff,#ffe9f1)}
#modes .mcard.blue{border-color:#7fbfff;background:linear-gradient(#fff,#e5f3ff)}
#modes .mcard.green{border-color:#6fd6a0;background:linear-gradient(#fff,#e5f9ee)}
#modes .mcard.btnlike{cursor:pointer}
#modes .mcard.btnlike:hover{transform:translateY(-6px) rotate(-.6deg);box-shadow:0 14px 0 rgba(43,42,58,.13),0 26px 40px rgba(30,30,60,.26)}
#modes .mcard .ic{font-size:64px;line-height:1;margin-bottom:6px;filter:drop-shadow(0 5px 0 rgba(43,42,58,.15))}
#modes .mcard h2{margin:4px 0 6px;font-size:24px}
#modes .mcard p{margin:0 0 14px;font-size:14.5px;line-height:1.5;opacity:.82;min-height:44px;flex:1}
#modes .mbtn{font:inherit;font-weight:800;font-size:18px;border:3px solid #2b2a3a;background:#fff;color:#2b2a3a;border-radius:14px;padding:10px 20px;cursor:pointer;box-shadow:0 4px 0 #2b2a3a;transition:transform .1s,box-shadow .1s}
#modes .mbtn:hover{transform:translateY(2px);box-shadow:0 2px 0 #2b2a3a}
#modes .mbtn:active{transform:translateY(4px);box-shadow:none}
#modes .mbtn.pk{background:#ff7fa8}#modes .mbtn.bl{background:#7fbfff}#modes .mbtn.gr{background:#6fd6a0}
#modes .mbtn:disabled{opacity:.5;cursor:default}
#modes .back{font:inherit;font-weight:800;border:0;background:rgba(255,255,255,.75);border-radius:12px;padding:7px 14px;cursor:pointer;margin-bottom:10px}
#modes input.cin{width:100%;box-sizing:border-box;text-transform:uppercase;letter-spacing:.35em;text-align:center;font:800 28px "Trebuchet MS",monospace;padding:8px 10px;margin-bottom:12px;border:3px solid #7fbfff;border-radius:14px;background:#fff;color:#2b2a3a;outline:none}
#modes .err{background:#ffe3e8;border:3px solid #ff6b86;color:#b3203d;font-weight:800;font-size:14px;line-height:1.45;border-radius:14px;padding:8px 12px;margin:6px auto 12px;max-width:620px}
#modes .room{background:#fff;border:4px solid #ff7fa8;border-radius:28px;padding:18px 20px;box-shadow:0 8px 0 rgba(43,42,58,.16),0 18px 34px rgba(30,30,60,.22);text-align:center}
#modes .room h2{margin:0 0 4px;font-size:22px}
#modes .code{display:inline-block;margin:6px auto 8px;font:900 clamp(38px,10vw,64px)/1 "Trebuchet MS",monospace;letter-spacing:.22em;padding:10px 6px 10px 22px;border:4px dashed #ff7fa8;border-radius:20px;background:linear-gradient(#fff,#fff0f5);user-select:all}
#modes .btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:8px 0}
#modes .sm{font-size:13px;opacity:.72;line-height:1.5}
#modes .plist{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px;margin:12px 0;padding:0;list-style:none}
#modes .plist li{display:flex;align-items:center;gap:10px;background:#f3f8ff;border:3px solid #7fbfff;border-radius:16px;padding:8px 10px;text-align:left;animation:mpin .25s ease-out}
@keyframes mpin{from{transform:scale(.8);opacity:0}}
#modes .plist li.me{border-color:#ff7fa8;background:#fff0f5}
#modes .av{flex:0 0 38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:19px;color:#fff;box-shadow:inset -4px -4px 0 rgba(0,0,0,.14)}
#modes .pn{min-width:0}#modes .pn b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px}
#modes .pn span{font-size:12px;opacity:.7}
#modes .opts{background:#f6f2ff;border:3px solid #b9a5ff;border-radius:16px;padding:8px 14px;margin:10px 0;text-align:left}
#modes .opts b{display:block;margin-bottom:4px}
#modes .chk{display:flex;gap:8px;align-items:center;font-size:15px;font-weight:700;margin:6px 0;cursor:pointer}
#modes .chk input{width:20px;height:20px;accent-color:#ff7fa8}
#modes .wait{font-weight:800;font-size:17px;margin:10px 0;animation:mwait 1.4s ease-in-out infinite}
@keyframes mwait{50%{opacity:.45}}
.lb.lan{display:none;border-color:#3dd17a;background:#3dd17a;color:#14301f}.lb.lan.live{display:inline-block}
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

  // nút nhỏ trên bảng "Bấm để chơi" - CHỈ hiện khi đang ở trong phòng (xem mã phòng / người chơi / rời phòng)
  const btn=el('button','lb lan','🌐');btn.type='button';
  $('go').before(btn);
  btn.addEventListener('click',e=>{e.stopPropagation();open()});

  // ---------- màn hình chọn cách chơi ----------
  const modes=el('div');modes.id='modes';
  const wrap=el('div','mwrap');modes.append(wrap);document.body.appendChild(modes);
  if(window.MenuFX)MenuFX.attach(modes);
  let view='mode',codeVal='';
  const isOpen=()=>modes.classList.contains('on');
  const show=()=>{render();modes.classList.add('on');document.body.classList.add('modes-on')};
  const hide=()=>{modes.classList.remove('on');document.body.classList.remove('modes-on')};
  const open=()=>{if(st.on||st.connecting)view='room';show()};
  const close=hide;
  const copy=(txt,b)=>{try{navigator.clipboard.writeText(txt)}catch(e){}const o=b.textContent;b.textContent='✔ '+tr('copied');setTimeout(()=>b.textContent=o,1200)};
  const inviteLink=()=>(location.protocol==='file:'?'':location.origin)+location.pathname+'?room='+st.code;
  const sorted=()=>Array.from(NET.roster.values()).sort((a,b)=>b.k-a.k||a.d-b.d||a.name.localeCompare(b.name));
  const COL=['#ff7fa8','#7fbfff','#6fd6a0','#ffb347','#b9a5ff','#4dd0e1','#f06292','#9ccc65'];
  const initial=n=>Array.from(String(n||'?'))[0].toUpperCase();

  function header(sub){
    wrap.appendChild(el('h1',null,'BLOCK ARENA'));
    wrap.appendChild(el('div','sub',sub));
  }
  function chk(label,val,fn){
    const l=el('label','chk'),i=el('input');i.type='checkbox';i.checked=!!val;i.addEventListener('change',()=>fn(i.checked));
    l.append(i,el('span',null,label));return l;
  }
  function card(cls,icon,title,desc,btnTxt,btnCls,fn){
    const c=el('div','mcard '+cls);
    c.append(el('div','ic',icon),el('h2',null,title),el('p',null,desc));
    const b=el('button','mbtn '+btnCls,btnTxt);b.type='button';b.addEventListener('click',e=>{e.stopPropagation();fn()});c.appendChild(b);
    return c;
  }

  function render(){
    const old=wrap.querySelector('#lancode');if(old)codeVal=old.value;
    wrap.textContent='';
    if(st.on||st.connecting)view='room';
    else if(view==='room')view='team';

    if(view==='mode'){   // ---- Solo hay Team ----
      header(tr('hello',PROFILE.name||'')+'  '+tr('ask'));
      const row=el('div','row');
      row.appendChild(card('pink','🎯',tr('soloT'),tr('soloD'),tr('soloB'),'pk',solo));
      row.appendChild(card('blue','👥',tr('teamT'),tr('teamD'),tr('teamB'),'bl',()=>{view='team';render()}));
      wrap.appendChild(row);
    }else if(view==='team'){   // ---- Tạo phòng hay Vào phòng ----
      header(tr('teamT'));
      const bk=el('button','back',tr('back'));bk.type='button';bk.addEventListener('click',()=>{NET.st.err='';view='mode';render()});wrap.appendChild(bk);
      if(st.err)wrap.appendChild(el('div','err','⚠️ '+tr('e_'+st.err)));
      const row=el('div','row');
      row.appendChild(card('pink','🏠',tr('createT'),tr('createD'),tr('createB'),'pk',()=>NET.createRoom()));
      // thẻ "Vào phòng" có ô nhập mã
      const jc=el('div','mcard blue');jc.append(el('div','ic','🔑'),el('h2',null,tr('joinT')),el('p',null,tr('joinD')));
      const inp=el('input','cin');inp.type='text';inp.id='lancode';inp.placeholder=tr('codePh');inp.maxLength=8;inp.value=codeVal;inp.autocomplete='off';inp.spellcheck=false;
      inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')go()});inp.addEventListener('keyup',e=>e.stopPropagation());
      inp.addEventListener('input',()=>{inp.value=inp.value.toUpperCase().replace(/[^A-Z0-9]/g,'')});
      const jb=el('button','mbtn bl',tr('joinB'));jb.type='button';jb.addEventListener('click',()=>go());
      jc.append(inp,jb);row.appendChild(jc);wrap.appendChild(row);
      const go=()=>{codeVal=inp.value;NET.joinRoom(codeVal)};
      setTimeout(()=>{if(!touch()&&isOpen()&&view==='team'&&codeVal)inp.focus()},30);
    }else{   // ---- phòng: kết nối / sảnh chờ / đang trong trận ----
      header(st.connecting&&!st.on?tr('connecting'):(st.started?tr('inGame'):tr('lobby')));
      const room=el('div','room');
      if(!st.on){
        room.appendChild(el('div','wait','⏳ '+tr('connecting')+(st.code?'  '+st.code:'')));
      }else{
        room.appendChild(el('div','sm',tr('roomCode')));
        room.appendChild(el('div','code',st.code));
        const bs=el('div','btns');
        const b1=el('button','mbtn',tr('copy'));b1.type='button';b1.addEventListener('click',()=>copy(st.code,b1));
        const b2=el('button','mbtn',tr('copyLink'));b2.type='button';b2.addEventListener('click',()=>copy(inviteLink(),b2));
        bs.append(b1,b2);room.appendChild(bs);
        if(st.host&&!st.started)room.appendChild(el('div','sm',tr('shareH')));
        room.appendChild(el('div','sm','👥 '+tr('players')+': '+NET.roster.size+' / '+st.cfg.max+(st.started?'  ·  '+tr('ping')+': '+st.ping+' ms':'')));
        const ul=el('ul','plist');let i=0;
        for(const p of sorted()){
          const li=el('li',p.me?'me':'');
          const av=el('div','av',initial(p.name));av.style.background=COL[(p.id|0)%COL.length];
          const pn=el('div','pn');pn.appendChild(el('b',null,(p.host?'👑 ':'')+p.name));
          pn.appendChild(el('span',null,st.started?'🎯 '+p.k+'   ☠ '+p.d:(p.host?tr('hostTag'):(p.me?tr('you'):''))));
          li.append(av,pn);ul.appendChild(li);i++;
        }
        room.appendChild(ul);
        if(st.host){
          const o=el('div','opts');o.appendChild(el('b',null,tr('youHost')));
          o.appendChild(chk(tr('pvp'),st.cfg.pvp,v=>NET.setCfg({pvp:v})));
          o.appendChild(chk(tr('bots'),st.cfg.bots,v=>NET.setCfg({bots:v})));
          room.appendChild(o);
          if(!st.started){const sb=el('button','mbtn gr',tr('start'));sb.type='button';sb.style.fontSize='24px';sb.style.padding='12px 34px';sb.addEventListener('click',()=>NET.start());room.appendChild(sb)}
        }else if(!st.started)room.appendChild(el('div','wait','⏳ '+tr('waitHost')));
        room.appendChild(el('div','sm',tr('note')));
      }
      wrap.appendChild(room);
      const bs=el('div','btns');bs.style.marginTop='14px';
      const lv=el('button','mbtn',tr('leave'));lv.type='button';lv.addEventListener('click',()=>{NET.leave();view='mode';render()});bs.appendChild(lv);
      if(st.started){const cl=el('button','mbtn pk',tr('close'));cl.type='button';cl.addEventListener('click',close);bs.appendChild(cl)}
      wrap.appendChild(bs);
    }
  }
  // Solo: rời phòng (nếu đang ở trong) rồi vào bảng "Bấm để chơi"
  function solo(){if(st.on||st.connecting)NET.leave(true);hide();view='mode'}
  // profile.js gọi khi chọn xong nhân vật
  function afterProfile(){document.body.classList.remove('pfon');if(st.on||st.connecting){open();return}view='mode';show()}

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
    btn.classList.toggle('live',st.on);btn.textContent=st.on?'🌐 '+st.code+' · '+NET.roster.size:'🌐';
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
    updBar();
    if(!st.on&&!st.connecting&&st.err){   // thất bại / mất kết nối / chủ phòng đóng phòng -> về màn chọn, hiện lý do
      view='team';if(document.pointerLockElement&&document.exitPointerLock)document.exitPointerLock();show();
    }else if(isOpen())render();
  });
  NET.sub('score',()=>{updBar();if(sbOn)drawSb();if(isOpen())render()});
  NET.sub('cfg',()=>{if(isOpen())render()});
  NET.sub('join',p=>pushChat('',tr('joined',p.name),true));
  NET.sub('leave',p=>pushChat('',tr('left',p.name),true));
  NET.sub('kill',o=>pushFeed(o.k,o.v,o.hs));
  NET.sub('chat',o=>pushChat(o.name,o.text,false));
  // chủ phòng bấm Bắt đầu: đóng sảnh, bảng "Bấm để chơi" hiện sẵn với nút "Vào trận" (trình duyệt cần 1 cú bấm để khoá chuột)
  NET.sub('start',()=>{
    hide();
    $('ov').style.display='flex';
    if(typeof ovState!=='undefined'&&ovState==='dead')return;
    $('sub').textContent=tr('startedSub');$('go').textContent=tr('go');
  });
  // chưa tới lúc bắt đầu thì không cho vào game: mở lại sảnh chờ
  document.addEventListener('click',e=>{
    if(st.on&&!st.started&&e.target.closest&&e.target.closest('#ov')&&!e.target.closest('.lb')&&!e.target.closest('.wb')){
      e.stopPropagation();e.preventDefault();showMsg(tr('needStart'));open();
    }
  },true);
  setInterval(()=>{if(st.on){updBar();if(isOpen())render()}},4000);   // ping / số người cập nhật định kỳ

  // link mời ?room=MÃ : đợi người chơi qua màn chọn ngôn ngữ / tên / nhân vật (#pf ẩn đi) rồi tự vào phòng. (Khi đó profile.js gọi afterProfile -> bỏ qua vì đang vào phòng)
  const rm=(new URLSearchParams(location.search).get('room')||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  let pending=rm.length>=4?rm:'';
  const origAfter=afterProfile;
  function afterProfile2(){
    if(pending){const c=pending;pending='';codeVal=c;view='team';NET.joinRoom(c);view='room';show();return}
    origAfter();
  }

  return {open,close,afterProfile:afterProfile2};
})();
