// ĐỒNG BỘ QUÁI TRONG PHÒNG LAN (chế độ "Chơi team": người chơi là đồng minh, bot là đối thủ chung).
// Trước đây mỗi máy tự sinh + tự chạy bot nên số lượng / vị trí khác nhau. Giờ:
//   CHỦ PHÒNG (NET.botsHost)   : chạy TOÀN BỘ quái như cũ (spawner, botBrain, bossAI, đá, đạn), nhưng mỗi quái nhắm vào người chơi GẦN NHẤT
//                                (kể cả người ở máy khác) và gửi "ảnh chụp" ~15 lần/giây cho cả phòng.
//   MÁY KHÁCH (NET.botsRemote) : KHÔNG sinh / không chạy AI quái. Chỉ nhận ảnh chụp, nội suy vị trí, làm hoạt ảnh chân tay.
//                                Bắn trúng quái -> gửi "bh" cho chủ phòng; chủ phòng trừ máu, quyết định chết.
//   Đạn boss / đá / lựu đạn của quái: chủ phòng gửi sự kiện lúc quái bắn; MỖI MÁY tự bay viên đạn đó và tự trừ máu của CHÍNH MÌNH khi trúng
//   (dùng lại đúng code bay + trúng đạn cũ trong floor-manager.js / bot-throw.js / grenade.js).
//   Quái cận chiến: chủ phòng tính, gửi "bu" (sát thương) cho đúng người bị cắn.
// GIỚI HẠN (bản đầu): chỉ quái của TẦNG chủ phòng đang đứng (máy ở tầng khác không thấy quái) · lính cung tắt trong phòng · vật phẩm rơi,
//   đồng minh thu phục, sát thương lựu đạn của máy khách lên quái chưa đồng bộ · chủ phòng bấm Esc (tạm dừng) thì quái đứng yên cả phòng.
// Nạp SAU net/net.js (xem loader.js). Điểm gắn: main.js (vòng lặp quái) · combat.js (bắn) · boss.js / bot-throw.js (đạn) · spawner.js · net.js.
window.BotSync=(function(){
  const SNAP_IV=1/15,STRIDE=10;
  let NID=0,snapT=0,flushT=0,died=0;
  const map=new Map(),active=new Set(),acc=new Map(),stack=[];   // map: id quái (chủ phòng cấp) -> bot trên máy này · active: quái đang hiện · acc: sát thương cận chiến chờ gửi theo người chơi
  const rd=Math.round;
  const host=()=>!!(window.NET&&NET.botsHost&&NET.botsHost());
  const remote=()=>!!(window.NET&&NET.botsRemote&&NET.botsRemote());
  const hideBot=b=>{b.on=false;b.g.visible=false};

  // ================= CHỦ PHÒNG =================
  // quái nhắm ai: người chơi gần nhất (máy này hoặc người từ xa cùng tầng, còn sống); trả null = người chơi trên máy này
  function pick(b){
    const now=performance.now();
    if(b.tgN&&now<b.tgN)return b.tgR&&NET.roster.get(b.tgR.id)===b.tgR&&!(b.tgR.f&1)&&b.tgR.fl===curFl?b.tgR:(b.tgN=0,pick(b));
    b.tgN=now+400+Math.random()*200;
    let best=null,bd=dead?1e9:Math.hypot(P.x-b.x,P.z-b.z)+(Math.abs(P.y-b.y)>3?50:0);
    for(const e of NET.roster.values()){
      if(e.me||(e.f&1)||e.fl!==curFl)continue;
      const d=Math.hypot(e.x-b.x,e.z-b.z)+(Math.abs(e.y-b.y)>3?50:0);
      if(d<bd){bd=d;best=e}
    }
    b.tgR=best;return best;
  }
  // AI cũ đọc thẳng P / yaw / dead / peace -> đổi tạm sang người chơi từ xa trong lúc chạy AI của 1 con quái, rồi trả lại
  function push(e){
    stack.push({x:P.x,y:P.y,z:P.z,h:P.h,yaw,dead,peace});
    P.x=e.x;P.y=e.y;P.z=e.z;P.h=(e.f&4)?1:1.7;yaw=e.yw;dead=false;
    peace=curFl===0&&!!window.PavilionPeace&&!!PavilionPeace(e.x,e.y,e.z);
  }
  function pop(){
    const s=stack.pop();if(!s)return;
    P.x=s.x;P.y=s.y;P.z=s.z;P.h=s.h;yaw=s.yaw;dead=s.dead;peace=s.peace;
  }
  const melee=(e,d)=>acc.set(e.id,(acc.get(e.id)||0)+d);   // cộng dồn rồi gửi ~7 lần/giây (không gửi 60 gói/giây cho mỗi quái)
  function flushMelee(){
    for(const [id,v] of acc){if(v>=1){NET.raw({t:'bu',to:id,d:Math.round(v)});acc.delete(id)}}
  }
  function sendSnap(){
    const q=[];
    for(const b of bots){
      if(b.ally||b.arch||!b.on||!(b.hp>0))continue;
      if(!b.nid)b.nid=++NID;
      q.push(b.nid,b.boss?1:0,rd(b.x*100),rd(b.y*100),rd(b.z*100),rd((b.ry||0)*100),rd(b.hp),rd((b.mv||0)*10),
        (b.sw?1:0)|((b.wp==='rifle'?1:b.wp==='sniper'?2:0)<<1),b.boss?rd(b.maxhp||0):0);
    }
    const f=[],bd=[];for(let i=0;i<NF;i++){f.push(fk[i]|0);bd.push(bossDone[i]?1:0)}
    NET.raw({t:'bs',fl:curFl,q,fk:f,bd,ba:bossAlive?1:0,bfl:(boss&&boss.fl)|0});
  }
  // máy khách báo trúng quái -> chủ phòng trừ máu
  function onHit(m){
    if(!host())return;
    let b=null;for(const x of bots)if(x.nid===m.b){b=x;break}
    if(!b||b.ally||b.arch||!b.on||!(b.hp>0))return;
    b.hp-=m.d;
    if(b.hp<=0)killBot(b,new THREE.Vector3(0,.3,0));
  }
  // sự kiện gửi cho cả phòng (đạn, đá, lựu đạn, boss bị hạ)
  function emit(e,d){if(host())NET.raw({t:'bx',e,d})}

  // ================= MÁY KHÁCH =================
  function hit(b,dmg,head){if(b.nid)NET.raw({t:'bh',b:b.nid,d:Math.round(dmg),hs:head?1:0})}
  function bind(nid,type,bfl){
    let b;
    if(type===1)b=bossFor(bfl|0);
    else{
      const used=new Set(map.values());
      for(const x of bots){if(!x.boss&&!x.ally&&!x.arch&&!used.has(x)){b=x;break}}
      if(!b)b=mkBot();
    }
    b.nid=nid;map.set(nid,b);return b;
  }
  function appear(b,x,y,z,ry,mh,bfl){
    b.x=x;b.y=y;b.z=z;b.ry=ry;b.vy=0;b.mv=0;b.t=0;b.on=true;b.g.visible=true;
    if(b.boss){boss=b;b.fl=bfl|0;b.maxhp=mh||b.maxhp;bossScale(bfl|0);b.on=true;showMsg(t('bossappear',bname(bfl|0)))}
    else{b.maxhp=100;b.talker=Math.random()<.3;b.tt=1.5+Math.random()*5;b.tShow=0;b.tw=0;b.tTok=(b.tTok||0)+1}
    active.add(b);
  }
  function gone(b){
    active.delete(b);
    const was=b.g.visible;b.hp=0;hideBot(b);
    if(was&&!b.boss&&died++<6){try{shatter(b,new THREE.Vector3(0,.3,0))}catch(e){}}   // vài con gần nhất vỡ mảnh, còn lại biến mất lặng lẽ
  }
  function applyHeader(m){
    if(Array.isArray(m.fk))for(let i=0;i<m.fk.length&&i<NF;i++)fk[i]=m.fk[i];
    if(Array.isArray(m.bd))for(let i=0;i<m.bd.length&&i<NF;i++)bossDone[i]=!!m.bd[i];
    bossAlive=!!m.ba;
  }
  function onSnap(m){
    if(!remote())return;
    applyHeader(m);
    if(m.fl!==curFl){for(const b of Array.from(active))gone(b);return}   // chủ phòng đang ở tầng khác: máy này không có quái để hiện
    const seen=new Set(),q=m.q||[];died=0;
    for(let i=0;i+STRIDE<=q.length;i+=STRIDE){
      const nid=q[i],type=q[i+1],x=q[i+2]/100,y=q[i+3]/100,z=q[i+4]/100,ry=q[i+5]/100,hp=q[i+6],mv=q[i+7]/10,fl=q[i+8],mh=q[i+9];
      let b=map.get(nid);if(!b)b=bind(nid,type,m.bfl);
      if(!active.has(b))appear(b,x,y,z,ry,mh,m.bfl);
      b.tx=x;b.ty=y;b.tz=z;b.tr=ry;b.hp=hp;b.mvT=mv;b.sw=!!(fl&1);
      if(b.boss){b.wp=['pistol','rifle','sniper'][(fl>>1)&3]||'pistol';if(mh)b.maxhp=mh}
      seen.add(b);
    }
    for(const b of Array.from(active))if(!seen.has(b))gone(b);   // không còn trong ảnh chụp = đã chết / bị thu hồi
  }
  // mỗi khung (main.js): nội suy + hoạt ảnh chân tay giống vòng lặp quái cũ
  function frame(dt){
    for(const b of bots){if(b.ally||b.arch)continue;if(!active.has(b)&&(b.on||b.g.visible))hideBot(b)}   // quái cục bộ còn sót (restart() sinh lại...) phải ẩn
    const k=Math.min(1,dt*14),kr=Math.min(1,dt*12);
    for(const b of active){
      const dx=b.tx-b.x,dz=b.tz-b.z;
      if(dx*dx+dz*dz>36){b.x=b.tx;b.z=b.tz;b.y=b.ty}else{b.x+=dx*k;b.z+=dz*k;b.y+=(b.ty-b.y)*k}
      let da=b.tr-b.ry;da=Math.atan2(Math.sin(da),Math.cos(da));b.ry+=da*kr;
      b.mv+=(b.mvT-b.mv)*Math.min(1,dt*8);
      const s0=Math.sin(b.t);b.t+=dt*11*b.mv;
      if(b.mv>.5&&s0*Math.sin(b.t)<0&&Math.hypot(P.x-b.x,P.z-b.z)<14){if(b.sw)snd(280+Math.random()*140,.14,'sine',.05,b.g.position);else botStepSnd(b.g.position,b.boss)}
      const sw=Math.sin(b.t)*.95*b.mv;b.lL.rotation.x=sw;b.lR.rotation.x=-sw;b.aL.rotation.x=-sw*.8;b.aR.rotation.x=sw*.8;
      b.g.position.set(b.x,b.y+Math.abs(Math.sin(b.t))*.07*b.mv,b.z);b.g.rotation.y=b.ry;
      if(b.boss)bossPose(b);
    }
  }
  // sự kiện từ chủ phòng
  function onEvent(e,d){
    if(!remote()||!d)return;
    const at={x:d.x,y:d.y,z:d.z};
    if(e==='bul'){
      const w=d.w|0,m=new THREE.Mesh(BG,BM[['pistol','rifle','sniper'][w]||'pistol']);if(w===2)m.scale.setScalar(1.5);
      m.position.set(d.x,d.y,d.z);S.add(m);
      bul.push({m,x:d.x,y:d.y,z:d.z,vx:d.vx,vy:d.vy,vz:d.vz,life:d.l||3,dmg:d.g});
      snd(w===1?420:320,.1,'square',.05*GV,at);
    }else if(e==='gre'){
      const m=grenadeModel();S.add(m);
      grenades.push({x:d.x,y:d.y,z:d.z,vx:d.vx,vy:d.vy,vz:d.vz,r:.12,h:.24,ground:false,t:1.6,m,foe:true});
      snd(200,.12,'sine',.05*GV,at);
    }else if(e==='rock'){
      const bs=!!d.b,m=new THREE.Mesh(ROCKG,VMAT);m.scale.setScalar(bs?3.2:1.35);m.frustumCulled=false;m.position.set(d.x,d.y,d.z);S.add(m);
      rocks.push({m,x:d.x,y:d.y,z:d.z,vx:d.vx,vy:d.vy,vz:d.vz,t:5,dmg:bs?18:ROCK.dmg,rad:bs?.6:.24});
      snd(520,.14,'sawtooth',.04*GV,at);
    }else if(e==='bd'){   // boss bị hạ: cả phòng nhận mạng hồi sinh, mở cổng
      const f=d.fl|0;bossAlive=false;bossDone[f]=true;addLives(f+1);
      if(typeof openGate==='function')openGate(f);
      showMsg(t(f<NF-1?'bossdown':'win'));if(window.Engrave)Engrave.grant(f);
    }
  }

  // ================= CHUNG =================
  function clear(){   // setupFloor() trên máy khách: ẩn hết quái cục bộ
    active.clear();
    for(const b of bots){if(b.ally||b.arch)continue;hideBot(b)}
    if(typeof boss!=='undefined'&&boss)boss.on=false;
  }
  function reset(){map.clear();active.clear();acc.clear();stack.length=0;snapT=flushT=0}
  function enter(){   // trận bắt đầu
    reset();
    if(remote())clear();
  }
  function tick(dt){   // net.js gọi mỗi khung (kể cả khi tạm dừng)
    if(!host())return;
    snapT-=dt;if(snapT<=0){snapT=SNAP_IV;sendSnap()}
    flushT-=dt;if(flushT<=0){flushT=.15;flushMelee()}
  }
  return {pick,push,pop,melee,onHit,hit,proj:emit,event:emit,onSnap,onEvent,frame,clear,reset,enter,tick};
})();
