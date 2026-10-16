// "Hub" phòng chơi: chạy TRONG TRÌNH DUYỆT của chủ phòng (thay cho server). Mọi người chơi (kể cả chủ phòng, qua đường nội bộ) gửi gói tới hub;
// hub chuyển tiếp vị trí / phát bắn, định tuyến sát thương tới nạn nhân, giữ bảng điểm + cấu hình phòng + trạng thái "đã bắt đầu".
// Không biết gì về mạng: net/net.js gắn từng kết nối vào bằng hub.attach(conn) với conn = {send(obj), close()}.
//
//   client -> hub : join · s (trạng thái) · shot · gren · hit · died · chat · cfg / start (chỉ chủ phòng) · p (ping)
//   hub -> client : welcome · pj · pl · s · shot · gren · hit · kill · score · chat · cfg · start · p · full · closed
window.LanHub=(function(){
  const clampStr=(s,n)=>Array.from(String(s==null?'':s)).slice(0,n).join('').replace(/[\u0000-\u001f\u007f]/g,'');
  const num=(v,lo,hi,d)=>{v=+v;return Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):d};

  function create(opts){
    const cfg=Object.assign({name:'',pvp:true,bots:true,max:16,dmg:1},opts.cfg||{});
    const code=opts.code||'';
    const players=new Map();   // id -> {id,conn,name,ch,k,d,ping,host}
    let nextId=1,started=false,closed=false;

    const pub=p=>({id:p.id,name:p.name,ch:p.ch,k:p.k,d:p.d,ping:p.ping,host:p.host});
    const list=()=>Array.from(players.values()).map(pub);
    const roomCfg=()=>({name:cfg.name,pvp:cfg.pvp,bots:cfg.bots,max:cfg.max,dmg:cfg.dmg});
    function broadcast(o,except){for(const p of players.values())if(p.id!==except)p.conn.send(o)}
    const sendScore=()=>broadcast({t:'score',list:list()});
    function uniqueName(n){let name=n||'Player',i=2;const taken=()=>Array.from(players.values()).some(p=>p.name===name);while(taken())name=(n||'Player')+'#'+i++;return name}

    // gắn 1 kết nối vào hub; trả về {recv(obj), drop()} cho tầng mạng gọi
    function attach(conn,isHost){
      let me=null;
      function recv(m){
        if(closed||!m||typeof m.t!=='string')return;
        if(!me){
          if(m.t!=='join')return;
          if(players.size>=cfg.max){conn.send({t:'full',max:cfg.max});setTimeout(()=>conn.close(),200);return}
          const id=nextId++;
          me={id,conn,name:uniqueName(clampStr(m.name,20).trim()),ch:clampStr(m.ch,12).replace(/[^a-z0-9_]/gi,''),k:0,d:0,ping:0,host:!!isHost};
          players.set(id,me);
          conn.send({t:'welcome',id,name:me.name,host:me.host,code,started,cfg:roomCfg(),players:list()});
          broadcast({t:'pj',p:pub(me)},id);
          return;
        }
        switch(m.t){
          case 's':   // trạng thái người chơi -> chuyển cho người khác (kèm id)
            broadcast({t:'s',i:me.id,x:num(m.x,-1e4,1e4,0),y:num(m.y,-1e4,1e4,0),z:num(m.z,-1e4,1e4,0),yw:num(m.yw,-100,100,0),pt:num(m.pt,-3,3,0),w:clampStr(m.w,8),h:num(m.h,0,100,100),f:m.f|0,fl:m.fl|0,sa:num(m.sa,-7,7,0),sv:num(m.sv,-20,20,0)},me.id);
            break;
          case 'shot':
            if(Array.isArray(m.a)&&Array.isArray(m.b)&&m.a.length===3&&m.b.length===3)
              broadcast({t:'shot',i:me.id,w:clampStr(m.w,8),a:m.a.map(v=>num(v,-1e4,1e4,0)),b:m.b.map(v=>num(v,-1e4,1e4,0)),hit:m.hit?1:0},me.id);
            break;
          case 'gren':
            if(Array.isArray(m.a)&&Array.isArray(m.v)&&m.a.length===3&&m.v.length===3)
              broadcast({t:'gren',i:me.id,a:m.a.map(v=>num(v,-1e4,1e4,0)),v:m.v.map(v=>num(v,-100,100,0))},me.id);
            break;
          case 'hit':{   // người bắn báo trúng -> chỉ gửi cho nạn nhân
            if(!cfg.pvp||!started)return;
            const v=players.get(m.to|0);if(!v||v.id===me.id)return;
            v.conn.send({t:'hit',from:me.id,d:Math.round(num(m.d,0,200,0)*cfg.dmg),hs:m.hs?1:0,w:clampStr(m.w,8)});
            break}
          case 'died':{
            me.d++;
            const k=players.get(m.by|0),killer=k&&k.id!==me.id?k:null;
            if(killer)killer.k++;
            broadcast({t:'kill',k:killer?killer.id:0,v:me.id,w:clampStr(m.w,8),hs:m.hs?1:0});
            sendScore();break}
          case 'chat':{const msg=clampStr(m.m,160).trim();if(msg)broadcast({t:'chat',i:me.id,n:me.name,m:msg});break}
          case 'cfg':   // chỉ chủ phòng
            if(!me.host)return;
            if(typeof m.pvp==='boolean')cfg.pvp=m.pvp;
            if(typeof m.bots==='boolean')cfg.bots=m.bots;
            broadcast({t:'cfg',cfg:roomCfg()});break;
          case 'start':{   // chủ phòng bấm Bắt đầu: chia điểm xuất hiện (xoay vòng, xáo trộn) rồi báo cả phòng
            if(!me.host||started)return;
            started=true;
            const n=Math.max(1,m.n|0||4),idx=Array.from({length:n},(_,i)=>i);
            for(let i=n-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]]}
            const sp={};let i=0;for(const p of players.values())sp[p.id]=idx[i++%n];
            broadcast({t:'start',sp});break}
          case 'p':conn.send({t:'p',ts:m.ts});if(typeof m.ping==='number')me.ping=Math.max(0,Math.min(999,m.ping|0));break;
        }
      }
      function drop(){
        if(!me)return;
        const id=me.id;players.delete(id);me=null;
        if(closed)return;
        broadcast({t:'pl',i:id});sendScore();
      }
      return {recv,drop};
    }
    function close(){
      if(closed)return;
      broadcast({t:'closed'});closed=true;
      const cs=Array.from(players.values()).map(p=>p.conn);players.clear();
      setTimeout(()=>cs.forEach(c=>{try{c.close()}catch(e){}}),300);
    }
    return {attach,close,cfg,code,get started(){return started},get size(){return players.size}};
  }
  return {create};
})();
