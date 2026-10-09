// Cầm + ĂN trái cây ở bàn giữa chòi triển lãm.
//   · nhìn vào 1 quả trên bàn (trong tầm CFG.reach) -> hiện gợi ý, bấm E: tay phải ĐƯA RA đĩa, CHỤP lấy quả đó (quả trên bàn biến mất, 60 giây sau hiện lại), rút về cầm trên tay (súng tạm ẩn)
//   · đang cầm: chuột trái = ĂN (giơ lên miệng, cắn 3 lần, trái nhỏ dần, mỗi lần cắn hồi 1 phần máu) · E = cất lại · bấm 1-4 đổi súng cũng tự cất
//   · máu đã đầy thì không ăn (báo "Máu đã đầy"), vẫn giữ trái trên tay
// Nạp SAU world/floor1/pavilion.js + fruit-kit.js, SAU player/viewmodel.js (arm, pick, animVM), gameplay/items.js (showMsg), engine/sound.js (snd), và TRƯỚC main.js.
// Phím E đang được engrave.js dùng để khắc bảng lên tường: ở đây E chỉ "ăn" sự kiện khi đang nhìn trúng bàn hoặc đang cầm trái; còn lại để engrave.js xử lý như cũ.
(function(){
'use strict';
if(typeof THREE==='undefined'||typeof S==='undefined'||typeof C==='undefined'||typeof VB==='undefined'||!window.FruitKit){console.warn('[FruitEat] thiếu THREE / S / C / VB / FruitKit, bỏ qua');return}
const FK=window.FruitKit;

const CFG={
  reach:3.2,           // m: xa nhất vẫn lấy được trái (tính từ mắt tới mặt bàn)
  pickCd:.25,          // s: chống bấm E 2 lần liền
  eatT:2.4,            // s: thời gian ăn hết 1 quả
  respawn:60,          // s: quả bị lấy đi sau bao lâu thì hiện lại trên bàn
  reachT:.9,           // s: thời gian đưa tay ra chụp rồi rút về
  reachMax:1.3,        // m: tay vươn tối đa (theo hướng quả; xa hơn thì dừng ở 1.3m trên đường ngắm tới quả)
  pickR:.26,           // m: ngắm lệch tâm quả bao nhiêu vẫn tính là đang nhìn quả đó
  bites:3,             // số miếng cắn (mỗi miếng hồi 1 phần máu, tổng = FruitKit.TYPES[loại].heal)
  biteAt:[.36,.56,.76],// mốc (0..1 của eatT) lúc cắn từng miếng
  wineSip:[0,-.3,-.45],   // vị trí đáy ly khi đưa lên miệng uống (giữa-dưới màn hình)
  wineK:.95,           // độ to của ly rượu trên tay (ly đã cao ~25cm)
  wineFruit:[.21,-.4,-.5], // vị trí đáy ly khi cầm (bàn tay giữ phần chân ly)
  handK:1.5,           // độ to của trái trên tay (so với trái trên bàn)
  hand:[.22,-.34,-.46],// vị trí bàn tay phải (x,y,z) trong khung nhìn
  fruit:[.2,-.27,-.56],// vị trí trái so với camera khi cầm
  mouth:[-.2,.2,.14],  // độ dời của tay khi đưa trái lên miệng (x,y,z)
  maxHp:100,
  pourT:1.2            // s: thời gian rót rượu vào ly
};

// ---------- CHỮ (vi / en; ngôn ngữ khác dùng en) ----------
const STR={   // 11 ngôn ngữ như i18n.js: vi en ru ng bn id hi zh fil uk ko
  vi:{take:'[E] Lấy trái cây',held:'Chuột trái: ăn  ·  E: cất lại',takeW:'[E] Lấy ly rượu',heldW:'Chuột trái: uống  ·  E: cất lại',full:'Máu đã đầy, chưa cần ăn'},
  en:{take:'[E] Take fruit',held:'Left click: eat  ·  E: put back',takeW:'[E] Take a glass of wine',heldW:'Left click: drink  ·  E: put back',full:'Health is already full'},
  ru:{take:'[E] Взять фрукт',held:'ЛКМ: съесть  ·  E: положить',takeW:'[E] Взять бокал вина',heldW:'ЛКМ: выпить  ·  E: положить',full:'Здоровье уже полное'},
  ng:{take:'[E] Pick fruit',held:'Left click: chop  ·  E: put am back',takeW:'[E] Pick wine glass',heldW:'Left click: drink  ·  E: put am back',full:'Your health don full'},
  bn:{take:'[E] ফল নিন',held:'বাম ক্লিক: খান  ·  E: রেখে দিন',takeW:'[E] ওয়াইনের গ্লাস নিন',heldW:'বাম ক্লিক: পান করুন  ·  E: রেখে দিন',full:'স্বাস্থ্য আগে থেকেই পূর্ণ'},
  id:{take:'[E] Ambil buah',held:'Klik kiri: makan  ·  E: taruh kembali',takeW:'[E] Ambil segelas anggur',heldW:'Klik kiri: minum  ·  E: taruh kembali',full:'Darah sudah penuh'},
  hi:{take:'[E] फल उठाएँ',held:'बायाँ क्लिक: खाएँ  ·  E: वापस रखें',takeW:'[E] वाइन का गिलास उठाएँ',heldW:'बायाँ क्लिक: पिएँ  ·  E: वापस रखें',full:'सेहत पहले से पूरी है'},
  zh:{take:'[E] 拿取水果',held:'左键：吃  ·  E：放回',takeW:'[E] 拿取红酒杯',heldW:'左键：喝  ·  E：放回',full:'生命值已满'},
  fil:{take:'[E] Kumuha ng prutas',held:'Kaliwang click: kumain  ·  E: ibalik',takeW:'[E] Kumuha ng baso ng alak',heldW:'Kaliwang click: uminom  ·  E: ibalik',full:'Puno na ang health'},
  uk:{take:'[E] Взяти фрукт',held:'ЛКМ: з’їсти  ·  E: покласти',takeW:'[E] Взяти келих вина',heldW:'ЛКМ: випити  ·  E: покласти',full:'Здоров’я вже повне'},
  ko:{take:'[E] 과일 집기',held:'좌클릭: 먹기  ·  E: 내려놓기',takeW:'[E] 와인 잔 집기',heldW:'좌클릭: 마시기  ·  E: 내려놓기',full:'체력이 이미 가득 찼어요'}
};
const str=()=>STR[typeof L!=='undefined'?L:'vi']||STR.en;
const lang=()=>typeof L!=='undefined'?L:'vi';

// ---------- TRẠNG THÁI ----------
const st={fa:null,kk:1,fp:[0,0,0],lv:1,btArm:null,mouth:[0,0,0],bt:null,stream:null,pourSnd:0,held:null,phase:'',grp:null,fg:null,piece:null,taken:false,eaten:false,tgt:new THREE.Vector3(),eating:false,t:0,done:0,healed:0,fs:1,cdT:0};   // phase: 'reach' (đưa tay ra chụp) | 'hold' (cầm) ; eating = đang ăn trong phase hold
const tb=vis=>{const F=window.PavilionFruit;if(F&&F.bottle)F.bottle.visible=vis};   // chai to trên bàn: ẩn lúc rót rượu, rót xong hiện lại
const e3=x=>x*x*(3-2*x),cl=(a,b,x)=>Math.min(1,Math.max(0,(x-a)/(b-a)));

// ---------- GỢI Ý TRÊN MÀN HÌNH ----------
const hint=document.createElement('div');
hint.style.cssText='position:fixed;left:50%;top:62%;transform:translateX(-50%);padding:7px 14px;border-radius:10px;background:rgba(0,0,0,.62);color:#fff;font:700 14px/1.4 sans-serif;pointer-events:none;z-index:3;display:none;white-space:nowrap';
document.body.appendChild(hint);
let hintTxt='';
function setHint(t){if(t===hintTxt)return;hintTxt=t;hint.textContent=t;hint.style.display=t?'block':'none'}

// ---------- NGẮM VÀO 1 QUẢ TRÊN BÀN ----------
const _o=new THREE.Vector3(),_d=new THREE.Vector3(),_ray=new THREE.Ray(),_pt=new THREE.Vector3();
function aimPiece(){
  const F=window.PavilionFruit;
  if(!F||!F.pieces||(typeof curFl!=='undefined'&&curFl!==0))return null;      // bàn chỉ có ở tầng 1
  C.getWorldPosition(_o);C.getWorldDirection(_d);_ray.set(_o,_d);
  let best=null,bd=1e9;
  for(const p of F.pieces){
    if(!p.mesh.visible)continue;                                              // quả đã bị lấy (đang chờ hiện lại)
    _pt.set(p.x,p.y,p.z);const along=_o.distanceTo(_pt);
    if(along>CFG.reach)continue;
    const off=_ray.distanceToPoint(_pt);if(off<CFG.pickR&&off<bd){bd=off;best=p}   // quả nằm gần tia ngắm nhất
  }
  return best;
}
// quả bị lấy sau CFG.respawn giây thì hiện lại (đếm theo thời gian chơi)
function tickRespawn(dt){
  const F=window.PavilionFruit;if(!F||!F.pieces)return;
  for(const p of F.pieces)if(p.t>0){p.t-=dt;if(p.t<=0){p.t=0;p.mesh.visible=true}}
}

// ---------- CẦM / CẤT ----------
function equip(piece){
  stow();
  const type=piece.type,g=new THREE.Group(),fg=new THREE.Group(),v=new VB();
  const wn=type==='wine',kk=wn?CFG.wineK:CFG.handK,fp=wn?CFG.wineFruit:CFG.fruit;st.kk=kk;st.fp=fp;
  const fm=FK.make(type,kk,0,0,wn);fm.traverse(o=>o.frustumCulled=false);fg.add(fm);fg.position.set(...fp);fg.visible=false;   // trái / ly chỉ hiện trên tay sau khi chụp
  g.add(typeof arm==='function'?arm(...CFG.hand,.45,.14):new THREE.Group(),fg);
  st.bt=st.stream=st.btArm=st.fa=null;
  if(type==='wine'){   // ly rỗng trên tay; chai rượu + tia rượu hiện lúc rót
    fm.userData.setLevel(0);
    const mx=fp[0]+.02,my=fp[1]+FK.WG.top*kk+.05,mz=fp[2];
    const bl=new THREE.Group(),bm=FK.bottle(.6);bm.frustumCulled=false;bl.add(bm);                   // chai đen giống chai trên bàn
    const hv=new VB(),SK=0xf1c9a5,SL=0x4b4760;   // tay TRÁI: nắm tay to ôm ĐÁY chai (đi theo chai); cẳng tay là mesh riêng đi từ nắm tay xuống góc dưới-trái màn hình như tay thường
    hv.box(0,-.40,0,.16,.09,.12,SK,.0125);hv.box(0,-.37,.062,.15,.006,.012,0xd9a883,.006);hv.box(0,-.40,.062,.15,.006,.012,0xd9a883,.006);hv.box(0,-.43,.062,.15,.006,.012,0xd9a883,.006);   // nắm tay + khe ngón
    const la=hv.mesh();la.frustumCulled=false;bl.add(la);
    const fv=new VB();fv.box(0,-.07,0,.075,.14,.075,SK,.0125);fv.box(0,-.26,0,.1,.24,.1,SL,.0125);fv.box(0,-.52,0,.12,.28,.12,SL,.0125);   // cổ tay + tay áo
    const fa=fv.mesh();fa.frustumCulled=false;fa.visible=false;fa.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),new THREE.Vector3(-.3,-.7,.45).normalize());g.add(fa);st.fa=fa;
    bl.visible=false;g.add(bl);st.bt=bl;st.btArm=la;st.mouth=[mx,my,mz];
    const sm=new THREE.Mesh(new THREE.BoxGeometry(.012,1,.012),new THREE.MeshBasicMaterial({color:0x8a1236}));sm.visible=false;sm.frustumCulled=false;g.add(sm);st.stream=sm;
  }
  g.traverse(o=>o.layers.set(1));   // layer 1 = lượt vẽ tay/súng (không bị tường che), như vm trong viewmodel.js
  g.position.set(.1,-.6,.1);C.add(g);
  st.lv=0;Object.assign(st,{held:type,phase:'reach',grp:g,fg,piece,taken:false,eaten:false,eating:false,t:0,done:0,healed:0,fs:1});
  st.tgt.set(piece.x,piece.y,piece.z);
  if(typeof snd==='function')snd(320,.12,'triangle',.04);          // tiếng vút khi đưa tay
}
function stow(){
  tb(true);
  if(st.piece&&st.taken&&!st.eaten){st.piece.mesh.visible=true;st.piece.t=0}   // chưa ăn mà cất / đổi súng -> trả quả về bàn
  if(st.grp){C.remove(st.grp);st.grp.traverse(o=>{if(o.geometry)o.geometry.dispose()})}
  st.grp=st.fg=st.held=st.piece=st.bt=st.stream=st.btArm=st.fa=null;st.phase='';st.eating=false;st.taken=false;
  if(typeof vm!=='undefined'&&vm)vm.scale.setScalar(1);        // hiện lại súng
}
function takePiece(){   // khoảnh khắc tay chụp được quả: quả trên bàn biến mất, trái hiện trong tay
  st.taken=true;st.piece.mesh.visible=false;st.piece.t=CFG.respawn;st.fg.visible=true;
  if(typeof snd==='function'){snd(560,.06,'square',.05);setTimeout(()=>snd(380,.08,'triangle',.05),50)}
}

// ---------- ĂN ----------
function eat(){
  if(!st.held||st.phase!=='hold'||st.eating)return;
  if(P.hp>=CFG.maxHp){if(!st.fullT||performance.now()-st.fullT>1200){st.fullT=performance.now();showMsg(str().full)}return}
  st.eating=true;st.t=0;st.done=0;st.healed=0;
  if(typeof snd==='function')snd(420,.05,'triangle',.04);
}
function bite(){
  const total=FK.TYPES[st.held].heal,n=CFG.bites;
  st.done++;
  const part=Math.round(total*st.done/n)-Math.round(total*(st.done-1)/n),before=P.hp;
  P.hp=Math.min(CFG.maxHp,P.hp+part);st.healed+=P.hp-before;     // HUD thanh máu tự cập nhật theo P.hp (main.js)
  if(typeof snd==='function'){
    if(st.held==='wine'){snd(150+Math.random()*40,.14,'sine',.07);setTimeout(()=>snd(120+Math.random()*30,.12,'sine',.05),90)}   // ực
    else{snd(260+Math.random()*90,.06,'sawtooth',.06);setTimeout(()=>snd(190+Math.random()*60,.07,'square',.04),55)}}   // tiếng rộp
}
function finishEat(){
  const h=st.healed;st.eaten=true;stow();
  if(typeof md!=='undefined')md=false;                            // đang giữ chuột thì không bật ra bắn ngay sau khi ăn xong
  if(h>0&&typeof showMsg==='function'&&typeof t==='function')showMsg(t('addhp',h));
  if(typeof snd==='function')snd(700,.12,'sine',.05);
}

// ---------- MỖI KHUNG (gọi từ animVM, chỉ chạy khi đang chơi) ----------
const _tc=new THREE.Vector3(),_hb=new THREE.Vector3();
function update(dt){
  tickRespawn(dt);
  if(typeof dead!=='undefined'&&dead){stow();return}
  if(st.cdT>0)st.cdT-=dt;
  if(!st.held)return;
  if(typeof vm!=='undefined'&&vm)vm.scale.setScalar(1e-4);       // ẩn súng khi đang cầm trái (vm vẫn được main.js cập nhật bình thường)
  const g=st.grp,bobY=(typeof vm!=='undefined'&&vm)?vm.position.y:0;
  let dx=0,dy=0,dz=0,rx=0,rz=0,target=1;
  if(st.phase==='reach'){
    // đưa tay ra đĩa -> chụp -> rút về. Vị trí quả đổi sang tọa độ camera; tay vươn theo đúng hướng quả (trên màn hình tay trùng quả), tối đa CFG.reachMax mét
    st.t+=dt;const u=Math.min(1,st.t/CFG.reachT);
    _tc.copy(st.tgt);C.worldToLocal(_tc);
    const len=_tc.length()||1;_tc.multiplyScalar(Math.min(1,CFG.reachMax/len));
    _hb.set(...CFG.hand);_tc.sub(_hb);_tc.y-=.05;                 // độ dời từ tư thế cầm tới điểm chụp (lòng bàn tay hơi thấp hơn quả)
    const ext=u<.5?e3(u/.5):u<.62?1:1-e3((u-.62)/.38);            // 0 -> 1 vươn ra · giữ lúc chụp · 1 -> 0 rút về
    const rest=u<.5?1-ext:0;                                       // lúc đầu tay ở thấp phía dưới màn hình rồi mới nhấc lên
    dx=_tc.x*ext+.1*rest;dy=_tc.y*ext-.6*rest;dz=_tc.z*ext+.1*rest;
    rx=.25*ext;rz=-.2*ext;
    if(u>=.56&&!st.taken){takePiece()}
    if(u>=.5&&u<.62){const k=1-Math.abs((u-.56)/.06);dx+=.0;rz+=.3*Math.max(0,k)}   // nắm tay lại lúc chụp
    if(u>=1){st.phase=st.held==='wine'?'pour':'hold';st.t=0;if(st.phase==='hold')st.lv=1;if(st.phase==='pour')tb(false)}
  }else if(st.phase==='pour'){   // rót rượu: chai nghiêng trên miệng ly, tia rượu chảy xuống, mực rượu dâng lên
    st.t+=dt;const u=Math.min(1,st.t/CFG.pourT),K=st.kk,W=FK.WG;
    const a=e3(cl(0,.25,u))*(1-e3(cl(.85,1,u))),w=e3(cl(.28,.85,u)),gl=st.fg.children[0].userData;
    st.bt.visible=a>.02;const m=st.mouth,r=1-a;   // chai từ dưới trái đưa lên, nghiêng miệng chai xuống ly; tay trái giữ nguyên hướng
    st.bt.position.set(m[0]-r*.4,m[1]-r*.45,m[2]+r*.1);st.bt.rotation.z=-a*1.83;
    {const th=st.bt.rotation.z;st.fa.visible=st.bt.visible;st.fa.position.set(st.bt.position.x+.4*Math.sin(th),st.bt.position.y-.4*Math.cos(th),st.bt.position.z)}   // cẳng tay bám theo nắm tay ở đáy chai
    st.lv=w;gl.setLevel(w);
    const on=u>.3&&u<.85,mouthY=st.fp[1]+W.top*K+.05,topY=st.fp[1]+(W.base+W.h*w)*K,len=Math.max(.01,mouthY-topY);
    st.stream.visible=on;st.stream.scale.y=len;st.stream.position.set(st.fp[0]+.02,mouthY-len/2,st.fp[2]);
    if(on&&typeof snd==='function'&&performance.now()-st.pourSnd>110){st.pourSnd=performance.now();snd(210+Math.random()*90,.06,'sine',.035)}
    if(u>=1){st.phase='hold';st.t=0;st.lv=1;st.bt.visible=false;st.fa.visible=false;st.stream.visible=false;tb(true)}
  }else if(st.eating){
    st.t+=dt;const u=Math.min(1,st.t/CFG.eatT);
    while(st.done<CFG.bites&&u>=CFG.biteAt[st.done])bite();
    const lift=e3(cl(0,.22,u))*(1-e3(cl(.9,1,u)));              // đưa trái lên miệng rồi hạ tay xuống
    let chew=0;for(const b of CFG.biteAt){const p=(u-b)/.1;if(p>0&&p<1)chew=Math.max(chew,Math.sin(Math.PI*p))}   // mỗi miếng cắn: tay chúi tới + trái rung
    dx=CFG.mouth[0]*lift;dy=CFG.mouth[1]*lift-.035*chew;dz=CFG.mouth[2]*lift+.05*chew;rx=-.55*lift+.12*chew;rz=.25*lift;
    if(st.held==='wine'){   // UỐNG RƯỢU: đưa ly thẳng lên trước miệng (giữa-dưới màn hình), ly đứng; mỗi ngụm ngả miệng ly về phía mình rồi dựng lại
      const T=CFG.wineSip,fp=st.fp;dx=(T[0]-fp[0])*lift;dy=(T[1]-fp[1])*lift;dz=(T[2]-fp[2])*lift;rx=0;rz=0;
      let sip=0;for(const b of CFG.biteAt){const p=(u-(b-.07))/.14;if(p>0&&p<1)sip=Math.max(sip,Math.sin(Math.PI*p))}
      st.fg.rotation.x=(.3+.85*sip)*lift;
      target=1;st.lv+=((1-st.done/CFG.bites)-st.lv)*Math.min(1,dt*6);st.fg.children[0].userData.setLevel(st.lv)}   // uống: nghiêng ly, mực rượu hạ dần
    else target=[1,.68,.42,.2][st.done];
    if(u>=1){finishEat();return}
  }
  st.fs+=(target-st.fs)*Math.min(1,dt*18);st.fg.scale.setScalar(st.fs);
  if(st.held==='wine'&&!st.eating)st.fg.rotation.x=0;
  g.position.set(dx,bobY+dy,dz);g.rotation.set(rx,0,rz);
}

// ---------- NÚT BẤM ----------
function interact(){   // E
  if(typeof playing!=='undefined'&&!playing)return false;
  if(typeof dead!=='undefined'&&dead)return false;
  if(st.held){if(st.phase==='hold'&&!st.eating)stow();return true}   // đang cầm: cất lại (đang vươn tay / rót rượu / ăn thì bỏ qua E)
  if(st.cdT>0)return false;
  const p=aimPiece();if(!p)return false;                            // không nhìn vào quả nào -> trả E cho engrave.js
  st.cdT=CFG.pickCd;equip(p);
  if(typeof showMsg==='function')showMsg(FK.name(p.type,lang()));
  return true;
}
addEventListener('keydown',e=>{
  if(e.repeat)return;
  if(e.code==='KeyE'){if(interact()){e.preventDefault();e.stopImmediatePropagation()}}
  else if(st.held&&st.phase==='hold'&&!st.eating&&(e.code==='Digit1'||e.code==='Digit2'||e.code==='Digit3'||e.code==='Digit4'))stow();   // đổi súng -> cất trái (sự kiện vẫn đi tiếp để đổi súng)
},true);
addEventListener('mousedown',e=>{                                 // capture: chạy trước handler bắn súng của input.js
  if(!st.held||(typeof playing!=='undefined'&&!playing))return;
  if(e.button===0)eat();
  e.stopImmediatePropagation();                                  // đang cầm trái: chuột trái không bắn, chuột phải không ngắm
},true);

// ---------- GẮN VÀO VÒNG LẶP CÓ SẴN (không sửa main.js / viewmodel.js) ----------
if(typeof animVM==='function'){const o=animVM;window.animVM=function(dt){o(dt);try{update(dt)}catch(err){console.warn('[FruitEat]',err);stow()}}}
else{let lt=performance.now();(function loop(){requestAnimationFrame(loop);const n=performance.now(),dt=Math.min(.05,(n-lt)/1000);lt=n;if(typeof playing==='undefined'||playing)update(dt)})()}
if(typeof pick==='function'){const o=pick;window.pick=function(w){if(st.held)stow();return o.apply(this,arguments)}}      // đổi súng bằng nút / chuột -> cất trái
if(typeof shoot==='function'){const o=shoot;window.shoot=function(){if(st.held){eat();return}return o.apply(this,arguments)}}   // nút FIRE trên điện thoại / súng tự động cũng thành "ăn"

// gợi ý trên màn hình (vòng riêng, nhẹ)
(function hintLoop(){
  requestAnimationFrame(hintLoop);
  if((typeof playing!=='undefined'&&!playing)||(typeof dead!=='undefined'&&dead)){setHint('');return}
  if(st.held){setHint(st.phase==='hold'&&!st.eating?(st.held==='wine'?str().heldW||str().held:str().held):'');return}
  {const p=aimPiece();setHint(p?(p.type==='wine'?str().takeW||str().take:str().take):'')};
})();

window.FruitEat={interact,eat,stow,held:()=>st.held,cfg:CFG};   // interact() cho nút E trên điện thoại nếu cần
})();
