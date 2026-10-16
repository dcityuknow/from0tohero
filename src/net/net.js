// CHƠI MẠNG LAN - phần lõi phía client.
// Phòng chơi qua WebRTC (PeerJS): chủ phòng tạo phòng -> có mã 5 ký tự; người khác nhập mã để vào; chủ phòng bấm Bắt đầu thì cả phòng vào trận.
// Chủ phòng chạy "hub" (net/hub.js) ngay trong trình duyệt của mình, không cần server riêng. Gửi vị trí / phát bắn của mình, nhận của người khác
// và hiện họ bằng net/avatar.js. Giao diện (nút vào phòng, bảng điểm, chat) ở net/lan-ui.js.
//
// MÔ HÌNH: mỗi máy tự chạy thế giới + bot (quái) của riêng nó; người chơi thấy nhau, bắn nhau (PvP), chat. Bot KHÔNG đồng bộ giữa các máy.
// Sát thương PvP do người BẮN báo ("trúng ai, bao nhiêu"), máy NẠN NHÂN tự trừ máu rồi báo "tôi chết" -> server cộng điểm. (Mạng LAN tin cậy, không chống gian lận.)
//
// Hook vào code cũ (mỗi chỗ 1 dòng, tìm "NET." để thấy hết): main.js (frame · hurt · restart · spawnRandom) · combat.js (bắn) · spawner.js (tắt bot) ·
//   archer.js (tắt cung thủ) · minimap.js (chấm người chơi) · input.js (phím Tab / Enter / T).
// Nạp SAU net/avatar.js, TRƯỚC main.js. Các biến toàn cục của game (P, yaw, pitch, cur, dead, playing, hurt...) đọc trực tiếp lúc chạy.
window.NET=(function(){
  const SEND_IV=.05,PING_IV=2;                    // 20 gói trạng thái / giây · đo ping mỗi 2 giây
  const PREFIX='blockarena-',ALPHA='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // id trên máy môi giới PeerJS = PREFIX + mã phòng 5 ký tự (bỏ O/0/I/1 cho khỏi nhầm)
  const st={on:false,connecting:false,id:0,name:'',host:false,code:'',started:false,assign:null,cfg:{name:'',pvp:true,bots:true,max:16,dmg:1},ping:0,err:''};
  const roster=new Map();    // id -> {id,name,ch,k,d,ping,host,me, x,y,z,yw,pt,w,h,f,fl, av}  (gồm cả chính mình, me=true, không có av)
  const subs={};
  let tx=null,peer=null,hub=null,sendT=0,pingT=0,tmo=0,lastHit=null,botsOff=false;
  const emit=(e,a)=>{for(const f of(subs[e]||[]))try{f(a)}catch(x){console.warn('[NET]',e,x)}};
  const sub=(e,f)=>{(subs[e]||(subs[e]=[])).push(f)};
  const send=o=>{if(tx)try{tx.send(o)}catch(e){console.warn('[NET] send',e)}};
  const r2=n=>Math.round(n*100)/100,r3=n=>Math.round(n*1000)/1000;
  const clone=o=>JSON.parse(JSON.stringify(o));
  // ---------- ICE: STUN + TURN ----------
  // Chỉ có STUN thì 2 máy ở 2 mạng khác nhau (4G, wifi công ty, NAT chặt) không bắt tay được -> treo rồi timeout, không vào được phòng.
  // Nên lấy thêm thông tin TURN (tiếp sức) từ API /api/turn (api/turn.js, giữ key Metered phía server). Đổi địa chỉ bằng window.BA_TURN_API.
  // Lỗi / chậm quá 4 giây -> dùng STUN dự phòng (mạng dễ tính vẫn vào được).
  const FALLBACK_ICE=[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}];
  let iceCache=null,iceAt=0;
  async function getIce(){
    if(iceCache&&Date.now()-iceAt<180000)return iceCache;   // cache 3 phút, bấm tạo/vào phòng liên tục không gọi API lại
    const ac=typeof AbortController!=='undefined'?new AbortController():null,to=setTimeout(()=>{if(ac)ac.abort()},4000);
    try{
      const r=await fetch(window.BA_TURN_API||'/api/turn',ac?{signal:ac.signal}:{});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const j=await r.json();
      if(!Array.isArray(j)||!j.length)throw new Error('empty');
      iceCache=j;iceAt=Date.now();return j;
    }catch(e){console.warn('[NET] Không lấy được TURN, dùng STUN dự phòng:',e);return FALLBACK_ICE}
    finally{clearTimeout(to)}
  }
  // BA_PEER_OPTS: tự đặt máy môi giới riêng, vd {host:'my.server',port:9000,secure:true}; đặt thêm config:{iceServers:[...]} nếu muốn tự quản ICE
  const peerOpts=async()=>{const o=Object.assign({debug:0},window.BA_PEER_OPTS||{});if(!o.config)o.config={iceServers:await getIce()};return o};
  let gen=0;   // tăng mỗi lần leave(): bỏ qua kết quả async của lần tạo/vào phòng cũ

  const genCode=()=>{let c='';for(let i=0;i<5;i++)c+=ALPHA[Math.floor(Math.random()*ALPHA.length)];return c};
  const normCode=c=>String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const myInfo=()=>({t:'join',v:2,name:(window.PROFILE&&PROFILE.name)||'Player',ch:(window.PROFILE&&PROFILE.char)||''});

  // ---------- phòng: tạo / vào / rời ----------
  function fail(code){clearTimeout(tmo);const was=st.connecting;st.connecting=false;st.err=code;destroyPeer();tx=null;if(was||code)emit('status')}
  function destroyPeer(){const p=peer;peer=null;if(p)try{p.destroy()}catch(e){}}

  // CHỦ PHÒNG: tạo Peer với id = PREFIX+mã; hub chạy ngay trong trình duyệt này; chính mình nối vào hub bằng đường nội bộ
  function createRoom(tries){
    tries=tries|0;leave(true);
    if(typeof Peer==='undefined')return fail('conn');
    const code=genCode(),g=gen;st.connecting=true;st.err='';st.code=code;emit('status');
    peerOpts().then(opts=>{
    if(g!==gen)return;
    let p;try{p=peer=new Peer(PREFIX+code,opts)}catch(e){return fail('conn')}
    tmo=setTimeout(()=>{if(peer===p&&!st.on)fail('timeout')},15000);
    p.on('open',()=>{
      if(peer!==p)return;
      const nm=((window.PROFILE&&PROFILE.name)||'Player');
      hub=LanHub.create({code,cfg:{name:nm}});
      p.on('connection',c=>{   // người khác nối vào bằng mã
        if(peer!==p||!hub)return;
        const conn={send(o){try{if(c.open)c.send(o)}catch(e){}},close(){try{c.close()}catch(e){}}};
        const att=hub.attach(conn,false);
        c.on('data',d=>att.recv(d));c.on('close',()=>att.drop());c.on('error',()=>att.drop());
      });
      const loop={send(o){const m=clone(o);setTimeout(()=>{if(hub&&peer===p)handle(m)},0)},close(){}};   // hub -> mình (không đi qua mạng)
      const att=hub.attach(loop,true);
      tx={send(o){if(hub)att.recv(clone(o))},close(){}};
      send(myInfo());
    });
    p.on('error',e=>{
      if(peer!==p)return;
      if(e.type==='unavailable-id'&&tries<4){destroyPeer();return createRoom(tries+1)}   // trùng mã: thử mã khác
      fail('conn');
    });
    p.on('disconnected',()=>{try{if(peer===p&&!p.destroyed)p.reconnect()}catch(e){}});   // mất máy môi giới: người đã vào vẫn chơi được; nối lại để người mới vào được
    });
  }

  // NGƯỜI VÀO: nối tới Peer của chủ phòng theo mã
  function joinRoom(code){
    leave(true);code=normCode(code);
    if(code.length<4)return fail('code');
    if(typeof Peer==='undefined')return fail('conn');
    st.connecting=true;st.err='';st.code=code;emit('status');
    const g=gen;
    peerOpts().then(opts=>{
    if(g!==gen)return;
    let p;try{p=peer=new Peer(opts)}catch(e){return fail('conn')}
    tmo=setTimeout(()=>{if(peer===p&&!st.on)fail('timeout')},15000);
    p.on('open',()=>{
      if(peer!==p)return;
      const c=p.connect(PREFIX+code,{serialization:'json'});
      c.on('open',()=>{if(peer!==p)return;tx={send(o){if(c.open)c.send(o)},close(){try{c.close()}catch(e){}}};send(myInfo())});
      c.on('data',d=>{if(peer===p)handle(d)});
      c.on('close',()=>{if(peer!==p)return;const was=st.on;leave(true);st.err=was?'closed':'conn';emit('status')});
      c.on('error',()=>{if(peer===p&&!st.on)fail('conn')});
    });
    p.on('error',e=>{if(peer===p)fail(e.type==='peer-unavailable'?'nocode':'conn')});
    });
  }
  // chủ phòng bấm Bắt đầu
  function start(){if(st.on&&st.host&&!st.started)send({t:'start',n:(typeof SPAWNS!=='undefined'?SPAWNS.length:4)})}

  function leave(silent){
    gen++;clearTimeout(tmo);
    if(hub){try{hub.close()}catch(e){}hub=null}
    const t=tx;tx=null;if(t&&t.close)try{t.close()}catch(e){}
    const p=peer;peer=null;if(p)setTimeout(()=>{try{p.destroy()}catch(e){}},400);   // trễ chút để gói "closed" kịp tới mọi người
    cleanup();st.err='';st.connecting=false;st.code='';
    if(!silent)emit('status');
  }
  function cleanup(){
    st.on=false;st.connecting=false;st.id=0;st.host=false;st.started=false;st.assign=null;lastHit=null;
    NetAvatar.removeAll();roster.clear();
    if(botsOff){botsOff=false;if(typeof setupFloor==='function')setupFloor()}   // rời phòng: bot của mình chạy lại như chơi 1 mình
    emit('score');
  }

  // ---------- nhận gói ----------
  function entry(p){
    let e=roster.get(p.id);
    if(!e){e={id:p.id,x:0,y:0,z:0,yw:0,pt:0,w:'pistol',h:100,f:0,fl:0,av:null,me:p.id===st.id};roster.set(p.id,e)}
    e.name=p.name;e.ch=p.ch;e.k=p.k|0;e.d=p.d|0;e.ping=p.ping|0;e.host=!!p.host;
    return e;
  }
  function handle(m){
    switch(m.t){
      case 'welcome':{
        clearTimeout(tmo);
        st.on=true;st.connecting=false;st.err='';st.id=m.id;st.name=m.name;st.host=!!m.host;st.code=m.code||st.code;st.cfg=m.cfg;st.started=false;
        roster.clear();for(const p of m.players)entry(p);
        sendT=0;pingT=0;botsOff=false;
        emit('status');emit('score');
        if(m.started)begin(null);   // vào phòng khi trận đã bắt đầu: vào thẳng
        break}
      case 'start':begin(m.sp&&m.sp[st.id]);break;
      case 'closed':leave(true);st.err='hostleft';emit('status');break;
      case 'full':fail('full');break;
      case 'pj':{entry(m.p);emit('join',m.p);emit('score');break}
      case 'pl':{const e=roster.get(m.i);if(e){NetAvatar.remove(e.av);roster.delete(m.i);emit('leave',e);emit('score')}break}
      case 's':{
        const e=roster.get(m.i);if(!e||e.me)break;
        e.x=m.x;e.y=m.y;e.z=m.z;e.yw=m.yw;e.pt=m.pt;e.w=m.w;e.h=m.h;e.f=m.f;e.fl=m.fl;
        if(!e.av)e.av=NetAvatar.create(e);
        break}
      case 'gren':{   // người khác ném lựu đạn: chỉ hiện quả bay + vụ nổ (không gây sát thương)
        const e=roster.get(m.i);if(!e||e.me||!Array.isArray(m.a)||!Array.isArray(m.v))break;
        NetAvatar.grenade(m.a,m.v);break}
      case 'shot':{
        const e=roster.get(m.i);if(!e||!e.av)break;
        NetAvatar.shot(e.av,m.w,m.a,m.b);break}
      case 'hit':{   // ai đó bắn trúng MÌNH
        if(peace||dead||reviveT>0)break;   // đang trong chòi triển lãm (vùng an toàn) / đã chết / còn bất tử sau hồi sinh
        lastHit={from:m.from,t:performance.now(),w:m.w,hs:m.hs};
        hurt(m.d);
        break}
      case 'kill':{
        const k=roster.get(m.k),v=roster.get(m.v);
        if(v&&v.av&&typeof blood==='function'){const o={x:v.av.x,y:v.av.y+1,z:v.av.z},up={x:0,y:1,z:0};blood(o,up,up,18)}   // máu bắn tung tại chỗ người vừa gục
        if(m.k&&m.k===st.id&&typeof showMsg==='function')showMsg('🎯 '+(v?v.name:'?'));
        emit('kill',{k:k||null,v:v||null,w:m.w,hs:!!m.hs});break}
      case 'score':{for(const p of m.list)entry(p);emit('score');break}
      case 'chat':emit('chat',{id:m.i,name:m.n,text:m.m});break;
      case 'cfg':{st.cfg=m.cfg;applyCfg();emit('cfg');emit('status');break}
      case 'p':st.ping=Math.max(0,Math.round(performance.now()-m.ts));{const me=roster.get(st.id);if(me)me.ping=st.ping}break;
    }
  }

  // trận bắt đầu (chủ phòng bấm Bắt đầu, hoặc vào phòng muộn): đặt điểm xuất hiện được chia sẵn, tắt bot nếu phòng yêu cầu, bất tử 3 giây
  function begin(spawnIdx){
    if(st.started)return;
    st.started=true;st.assign=spawnIdx==null?null:spawnIdx;applyCfg();
    if(typeof spawnRandom==='function')spawnRandom();
    reviveT=Math.max(reviveT,3);sendT=0;
    emit('start');emit('status');
  }

  // ---------- cấu hình phòng ----------
  const noBots=()=>st.on&&st.started&&!st.cfg.bots;
  function stopBots(){
    for(const b of bots){if(b.ally||b.arch)continue;b.on=false;if(b.g)b.g.visible=false}   // gồm cả boss (boss nằm trong mảng bots)
  }
  function applyCfg(){
    const off=st.on&&st.started&&!st.cfg.bots;
    if(off&&!botsOff){botsOff=true;stopBots()}
    else if(!off&&botsOff){botsOff=false;if(typeof setupFloor==='function')setupFloor()}
  }
  function setCfg(o){if(st.on&&st.host)send(Object.assign({t:'cfg'},o))}

  // ---------- gửi đi ----------
  function sendState(){
    const f=(dead?1:0)|(P.sw?2:0)|(slideT>0?4:0)|(!playing?8:0)|(rel>0?16:0)|((holding||autoP)?32:0)|(throwT>0?64:0);   // 16 nạp đạn · 32 giật chốt lựu đạn · 64 đang ném
    const me=roster.get(st.id);if(me){me.f=f;me.h=P.hp}
    send({t:'s',x:r2(P.x),y:r2(P.y),z:r2(P.z),yw:r3(yaw),pt:r3(pitch),w:cur,h:Math.max(0,Math.round(P.hp)),f,fl:curFl});
  }
  // gọi mỗi khung từ main.js (kể cả khi đang tạm dừng: người khác vẫn phải thấy mình và mình vẫn thấy họ)
  function tick(dt){
    if(!st.on)return;
    if(!st.started)return;   // còn ở sảnh chờ: chưa gửi / vẽ gì
    NetAvatar.attach();NetAvatar.tick(dt);
    sendT-=dt;if(sendT<=0){sendT=SEND_IV;sendState()}
    pingT-=dt;if(pingT<=0){pingT=PING_IV;send({t:'p',ts:performance.now(),ping:st.ping})}
  }
  // combat.js: mình vừa bắn (from/to = đầu nòng -> điểm trúng)
  function shot(from,to,w,hit){
    if(!st.on||!st.started)return;
    send({t:'shot',w,a:[r2(from.x),r2(from.y),r2(from.z)],b:[r2(to.x),r2(to.y),r2(to.z)],hit:hit?1:0});
  }
  // combat.js: đạn của mình trúng người chơi rp (đầu hay thân)
  function hit(rp,head,w){
    if(!st.on||!st.started||!st.cfg.pvp||peace||dead||!rp||rp.me)return;
    const g=W[w];if(!g)return;
    send({t:'hit',to:rp.id,d:head?g.hd:g.dmg,hs:head?1:0,w});
    hitMark(head);
  }
  function hitMark(head){   // báo cho người bắn biết đã trúng: tâm ngắm đỏ + tiếng "tích"
    const c=document.getElementById('cross');
    if(c){c.style.borderColor='#ff3355';clearTimeout(hitMark.t);hitMark.t=setTimeout(()=>{c.style.borderColor=''},130)}
    if(typeof snd==='function')snd(head?1300:900,.06,'square',.05);
  }
  // grenade.js launchG(): mình vừa ném lựu đạn (vị trí + vận tốc ban đầu) -> người khác thấy quả bay + nổ
  function gren(g){
    if(!st.on||!st.started)return;
    send({t:'gren',a:[r2(g.x),r2(g.y),r2(g.z)],v:[r2(g.vx),r2(g.vy),r2(g.vz)]});
  }
  // main.js: sau khi di chuyển, đẩy mình ra khỏi người chơi khác (không đi xuyên qua nhau)
  function collide(){
    if(!st.on||!st.started||dead)return;
    const o=NetAvatar.pushOut(P,P.r+(window.TP?TP.extra:0));
    if(o){const g0=P.ground;move(P,o.x,0,o.z);P.ground=g0}
  }
  function chat(text){text=String(text||'').trim();if(st.on&&text)send({t:'chat',m:text.slice(0,160)})}

  // ---------- chết / hồi sinh ----------
  // main.js hurt(): máu về 0 và không còn mạng hồi sinh
  function onDeath(){
    if(!st.on)return;
    const by=lastHit&&performance.now()-lastHit.t<8000?lastHit:null;lastHit=null;
    send({t:'died',by:by?by.from:0,w:by?by.w:'',hs:by&&by.hs?1:0});
    const k=by?roster.get(by.from):null;
    if(k&&typeof showMsg==='function')showMsg('☠ '+k.name);
    // bảng "bạn đã bị hạ" hiện sau 1.4s (main.js): thêm tên người hạ vào dòng phụ
    setTimeout(()=>{if(dead&&k){const s=document.getElementById('sub');if(s)s.textContent+=' · ☠ '+k.name}},1500);
  }
  // main.js restart(): bấm chơi lại sau khi chết
  function onRespawn(){
    if(!st.on)return;
    reviveT=Math.max(reviveT,2.5);   // 2.5 giây bất tử để không bị bắn chết ngay lúc vừa hồi sinh
    lastHit=null;sendT=0;
    if(botsOff)stopBots();
  }
  // main.js spawnRandom(): chọn điểm xuất hiện XA người khác nhất (lấy ngẫu nhiên 1 trong 2 điểm xa nhất cho đỡ đoán trước)
  function pickSpawn(spawns,def){
    if(st.on&&st.assign!=null){const i=st.assign;st.assign=null;return i}   // điểm do chủ phòng chia lúc bắt đầu
    if(!st.on||roster.size<2)return def;
    const sc=spawns.map((s,i)=>{let m=1e9;for(const e of roster.values()){if(e.me||!e.av)continue;m=Math.min(m,Math.hypot(e.av.x-s.x,e.av.y-s.y,e.av.z-s.z))}return {i,m}});
    sc.sort((a,b)=>b.m-a.m);
    return sc[Math.random()<.65||sc.length<2?0:1].i;
  }
  // minimap.js: chấm xanh dương cho người chơi khác cùng tầng
  function drawMap(mc,X){
    if(!st.on)return;
    for(const e of roster.values()){
      if(e.me||!e.av||(e.f&1)||Math.abs(e.y-FY(curFl))>=FHT[curFl])continue;
      mc.fillStyle='#4d9dff';mc.strokeStyle='#fff';mc.lineWidth=2;mc.beginPath();mc.arc(X(e.av.x),X(e.av.z),6,0,6.3);mc.fill();mc.stroke();
    }
  }

  return {
    st,roster,sub,emit,createRoom,joinRoom,start,leave,setCfg,chat,tick,shot,gren,collide,hit,onDeath,onRespawn,pickSpawn,drawMap,
    typing:false,
    get on(){return st.on},
    get cfg(){return st.cfg},
    noBots,
    targets(out){if(st.on&&st.started&&st.cfg.pvp)NetAvatar.targets(out)},   // combat.js: thêm hộp va chạm người chơi khác vào danh sách có thể trúng đạn
  };
})();
