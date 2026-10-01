// KHẮC TÊN LÊN TƯỜNG: thắng boss -> được 1 lượt khắc tên (PROFILE.name, xem ui/profile.js) lên 4 bức tường bao quanh map của tầng đang đứng.
// - Nhìn vào chỗ muốn khắc (trong tầm CFG.reach mét): hiện khung xem trước (xanh = trống, đỏ = đã có người khắc) + câu hỏi, bấm E (hoặc nút trên cảm ứng) để khắc.
// - Dưới tên có dòng chữ nhỏ "Đã vinh danh tầng N" (ngôn ngữ của người khắc).
// - Chỗ đã khắc thì không khắc chồng lên được (kiểm tra hình chữ nhật, cách nhau tối thiểu CFG.gap mét).
// - Dùng chung giữa người chơi qua FIREBASE REALTIME DATABASE (REST, không cần máy chủ): dán địa chỉ database vào CFG.db. Để trống = chỉ lưu localStorage (chỉ thấy trên máy này).
//   Hướng dẫn tạo database + quy tắc bảo mật: README.md và firebase/database.rules.json.
// - Hai người khắc cùng chỗ cùng lúc: bảng ghi lên Firebase TRƯỚC (theo giờ của Firebase) được giữ, bảng sau bị ẩn và người đó được trả lại lượt.
// Nạp SAU items.js / viewmodel.js (dùng showMsg, UG, M, spawnPart). boss.js gọi Engrave.grant(tầng) khi hạ boss; main.js gọi Engrave.reset() khi chơi lại.
(function(){
const CFG={
  db:'',          // <<< DÁN ĐỊA CHỈ FIREBASE REALTIME DATABASE VÀO ĐÂY, vd 'https://ten-du-an-default-rtdb.firebaseio.com'
  path:'engravings',
  reach:8,        // tầm nhìn tối đa tới tường (m)
  hM:1.7,         // chiều cao bảng tên (m), gồm cả dòng chữ nhỏ
  pxH:146,        // chiều cao ảnh chữ (px) -> độ nét
  maxPx:768,      // bề rộng ảnh chữ tối đa (px): tên quá dài thì thu nhỏ chữ
  pad:80,         // lề trái + phải của chữ trong bảng (px)
  gap:.35,        // khoảng cách tối thiểu giữa 2 bảng tên (m)
  poll:15,        // giây giữa 2 lần tải lại danh sách từ Firebase
  limit:1500,     // chỉ tải tối đa chừng này bảng (mới nhất)
  key:'ba_engr',maxLocal:300
};
const PPM=CFG.pxH/CFG.hM;
const FONT='"Trebuchet MS","Segoe UI","Noto Sans","Noto Sans Bengali","Noto Sans Devanagari","Noto Sans SC","Microsoft YaHei","Malgun Gothic",Arial,sans-serif';
const ET={
  vi:{ask:'Bạn có muốn khắc tên mình để vinh danh chiến thắng không?',key:'Khắc tên',taken:'Vị trí này đã có người khắc, hãy tìm chỗ khác!',done:'✍️ Đã khắc tên "{0}" lên tường!',grant:'🏆 Bạn được khắc tên lên tường! Lại gần tường và nhìn vào chỗ muốn khắc',local:'(chỉ lưu trên máy này: chưa kết nối máy chủ)'},
  en:{ask:'Do you want to carve your name to honor your victory?',key:'Carve',taken:'This spot is already taken, find another one!',done:'✍️ Your name "{0}" is carved on the wall!',grant:'🏆 You can carve your name on a wall! Walk up to a wall and look where you want it',local:'(saved on this device only: server not connected)'},
  ru:{ask:'Хотите высечь своё имя в честь победы?',key:'Высечь',taken:'Это место уже занято, найдите другое!',done:'✍️ Имя «{0}» высечено на стене!',grant:'🏆 Вы можете высечь имя на стене! Подойдите к стене и посмотрите на нужное место',local:'(сохранено только на этом устройстве: нет связи с сервером)'},
  ng:{ask:'You wan carve your name to celebrate your win?',key:'Carve',taken:'Person don carve for here already, find another place!',done:'✍️ Your name "{0}" don dey for wall!',grant:'🏆 You fit carve your name for wall! Go near wall, look where you want am',local:'(e dey only for this device: server no connect)'},
  bn:{ask:'জয়ের সম্মানে আপনার নাম খোদাই করতে চান?',key:'খোদাই',taken:'এই জায়গাটি আগেই নেওয়া হয়েছে, অন্য জায়গা খুঁজুন!',done:'✍️ "{0}" নামটি দেয়ালে খোদাই করা হয়েছে!',grant:'🏆 আপনি দেয়ালে নাম খোদাই করতে পারবেন! দেয়ালের কাছে গিয়ে পছন্দের জায়গায় তাকান',local:'(শুধু এই ডিভাইসে সংরক্ষিত: সার্ভারে সংযোগ নেই)'},
  id:{ask:'Ingin mengukir namamu untuk mengenang kemenanganmu?',key:'Ukir',taken:'Tempat ini sudah diukir, cari tempat lain!',done:'✍️ Namamu "{0}" terukir di dinding!',grant:'🏆 Kamu boleh mengukir nama di dinding! Dekati dinding dan lihat tempat yang kamu mau',local:'(hanya tersimpan di perangkat ini: server belum terhubung)'},
  hi:{ask:'क्या आप जीत के सम्मान में अपना नाम उकेरना चाहते हैं?',key:'उकेरें',taken:'यह जगह पहले से भरी है, कोई और जगह चुनें!',done:'✍️ "{0}" नाम दीवार पर उकेर दिया गया!',grant:'🏆 आप दीवार पर अपना नाम उकेर सकते हैं! दीवार के पास जाएँ और मनचाही जगह देखें',local:'(केवल इसी डिवाइस पर सहेजा गया: सर्वर से कनेक्शन नहीं)'},
  zh:{ask:'要刻下你的名字来纪念这场胜利吗?',key:'刻名',taken:'这个位置已经有人刻过了,请换个地方!',done:'✍️ 你的名字「{0}」已刻在墙上!',grant:'🏆 你可以在墙上刻名了!走近墙壁,看向想刻的位置',local:'(仅保存在本设备:未连接服务器)'},
  fil:{ask:'Gusto mo bang iukit ang pangalan mo bilang parangal sa tagumpay mo?',key:'Iukit',taken:'May nakaukit na rito, maghanap ng ibang lugar!',done:'✍️ Naukit na sa pader ang pangalan mong "{0}"!',grant:'🏆 Puwede mo nang iukit ang pangalan mo sa pader! Lumapit sa pader at tingnan ang gusto mong pwesto',local:'(sa device na ito lang naka-save: hindi konektado ang server)'},
  uk:{ask:'Бажаєте викарбувати своє ім’я на честь перемоги?',key:'Викарбувати',taken:'Це місце вже зайняте, знайдіть інше!',done:'✍️ Ім’я «{0}» викарбувано на стіні!',grant:'🏆 Ви можете викарбувати ім’я на стіні! Підійдіть до стіни й подивіться на потрібне місце',local:'(збережено лише на цьому пристрої: немає зв’язку із сервером)'},
  ko:{ask:'승리를 기념해 이름을 새기시겠습니까?',key:'새기기',taken:'이미 새겨진 자리입니다. 다른 곳을 찾아보세요!',done:'✍️ "{0}" 이름이 벽에 새겨졌습니다!',grant:'🏆 벽에 이름을 새길 수 있습니다! 벽 가까이 가서 원하는 곳을 바라보세요',local:'(이 기기에만 저장됨: 서버에 연결되지 않음)'}
};
// dòng chữ nhỏ dưới tên: "Đã vinh danh tầng N" (ngôn ngữ của người khắc, lưu trong bảng ở trường l)
const HT={
  vi:'Đã vinh danh tầng {0}',en:'Honored on floor {0}',ru:'Отмечен на этаже {0}',ng:'Don honor for floor {0}',bn:'{0} তলায় সম্মানিত',
  id:'Dihormati di lantai {0}',hi:'मंज़िल {0} पर सम्मानित',zh:'荣耀铭刻于第 {0} 层',fil:'Pinarangalan sa palapag {0}',uk:'Увічнено на поверсі {0}',ko:'{0}층에서 영예를 얻음'
};
const et=(k,...a)=>{let s=(ET[L]&&ET[L][k])||ET.en[k];a.forEach((v,i)=>s=s.split('{'+i+'}').join(v));return s};
const honor=(l,f)=>(HT[l]||HT.en).split('{0}').join(f+1);

// ---------- dữ liệu ----------
// mỗi bảng: {id,f,s,u,v,w,h,name,l,ts}  f = tầng · s = tường (0 Bắc z=-A · 1 Nam z=+A · 2 Tây x=-A · 3 Đông x=+A)
// u = vị trí dọc tường (trục x của bảng, nhìn từ trong ra) · v = độ cao so với sàn tầng · w,h = cỡ bảng (m) · l = ngôn ngữ người khắc · ts = giờ ghi (Firebase)
// raw = mọi bảng tải về · list = các bảng được chấp nhận (bảng đến sau mà chồng lên bảng đến trước thì bị ẩn)
let raw=[],list=[],tokens=0,dirty=true,shown=-1,warnedLocal=false;
const mine=new Set();   // id các bảng của mình đã ghi lên Firebase (để trả lại lượt nếu bị người khác giành chỗ trước)
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const cleanName=n=>Array.from(String(n||'').normalize('NFC').replace(/[^\p{L}\p{M}\p{Nd} _.'\-]/gu,'').replace(/\s+/g,' ').trim()).slice(0,20).join('');
function okRec(e){
  if(!e||typeof e!=='object')return null;
  const f=e.f|0,s=e.s|0,u=+e.u,v=+e.v,w=+e.w,h=+e.h;
  if(f<0||f>=NF||s<0||s>3||![u,v,w,h].every(isFinite)||w<1||w>10||h<.5||h>2)return null;
  const name=cleanName(e.name);if(!name)return null;
  return {id:String(e.id||''),f,s,u,v,w,h,name,l:(typeof e.l==='string'&&HT[e.l])?e.l:'en',ts:+e.ts||0};
}
const hit=(a,b)=>Math.abs(a.u-b.u)<(a.w+b.w)/2+CFG.gap&&Math.abs(a.v-b.v)<(a.h+b.h)/2+CFG.gap;
const free=(f,s,u,v,w,h)=>{const q={u,v,w,h};for(const e of list)if(e.f===f&&e.s===s&&hit(e,q))return false;return true};
function recompute(){   // thứ tự giờ ghi (rồi tới id) giống nhau ở mọi máy -> mọi người thấy cùng một kết quả
  const sorted=raw.slice().sort((a,b)=>(a.ts-b.ts)||(a.id<b.id?-1:a.id>b.id?1:0)),bk={},acc=[],rej=new Set();
  for(const e of sorted){const g=bk[e.f*4+e.s]||(bk[e.f*4+e.s]=[]);if(g.some(x=>hit(x,e)))rej.add(e.id);else{g.push(e);acc.push(e)}}
  list=acc;dirty=true;
  for(const id of mine)if(rej.has(id)){mine.delete(id);tokens++;showMsg(et('taken'))}   // chỗ đã bị người ghi trước giành mất: trả lại lượt
}
const lsGet=()=>{try{return JSON.parse(localStorage.getItem(CFG.key)||'[]')}catch(e){return[]}};
const lsSet=()=>{try{localStorage.setItem(CFG.key,JSON.stringify(raw.slice(-CFG.maxLocal)))}catch(e){}};
raw=lsGet().map(okRec).filter(Boolean);recompute();

// ---------- Firebase Realtime Database (REST) ----------
const url=(q='')=>CFG.db.replace(/\/+$/,'')+'/'+CFG.path+'.json'+q;
async function sync(){
  if(!CFG.db||document.hidden)return;
  try{
    const r=await fetch(url('?orderBy=%22$key%22&limitToLast='+CFG.limit),{cache:'no-store'});if(!r.ok)throw 0;
    const o=await r.json();
    raw=(o&&typeof o==='object')?Object.entries(o).map(([k,v])=>okRec({...v,id:k})).filter(Boolean):[];
    recompute();
  }catch(e){}
}
async function post(rec){   // trả về khóa Firebase của bảng mới, hoặc null nếu lỗi / chưa cấu hình
  if(!CFG.db)return null;
  try{
    const r=await fetch(url(),{method:'POST',body:JSON.stringify({f:rec.f,s:rec.s,u:rec.u,v:rec.v,w:rec.w,h:rec.h,name:rec.name,l:rec.l,ts:{'.sv':'timestamp'}})});   // không đặt Content-Type để khỏi bị preflight CORS
    if(r.ok){const j=await r.json();return j&&j.name||null}
  }catch(e){}
  return null;
}
sync();setInterval(sync,CFG.poll*1000);

// ---------- hình bảng tên ----------
const mctx=document.createElement('canvas').getContext('2d');
// Tên toàn chữ Latin (a-z, có dấu) -> in kiểu graffiti bong bóng; tên có chữ khác (Hán, Hàn, Nga, Hindi, Bengal...) -> in chữ thường
const GRAF_RE=/^[\p{Script=Latin}\p{M}0-9 _.'\-]+$/u,isGraf=n=>GRAF_RE.test(n),GR_EXTRA=24;
const GFONT='"Arial Rounded MT Bold","Baloo 2","Fredoka One","Nunito","Arial Black","Trebuchet MS",Arial,sans-serif';
const tw=name=>{if(isGraf(name)){mctx.font='900 64px '+GFONT;return mctx.measureText(name.toUpperCase()).width+GR_EXTRA}mctx.font='700 64px '+FONT;return mctx.measureText(name).width};
const plateW=name=>Math.min(CFG.maxPx,Math.max(220,tw(name)+CFG.pad))/PPM;
const toTex=c=>{const tx=new THREE.CanvasTexture(c);tx.minFilter=THREE.LinearFilter;tx.generateMipmaps=false;return tx};
function subFit(x,txt,cw,ch){   // cỡ chữ của dòng chữ nhỏ: ~13% chiều cao bảng, thu nhỏ nếu quá rộng
  x.font='700 100px '+FONT;const m=x.measureText(txt).width;return Math.max(9,Math.min(ch*.13,100*(cw-CFG.pad*.6)/Math.max(1,m)));
}
function grafTex(name,w,h,sub){   // graffiti bong bóng: viền đen dày, thân trắng phồng có bóng trong + vệt sáng, bóng đổ 3D xuống phải
  const cw=Math.round(w*PPM),ch=Math.round(h*PPM),txt=name.toUpperCase(),c=document.createElement('canvas');c.width=cw;c.height=ch;
  const x=c.getContext('2d');x.font='900 64px '+GFONT;const m=x.measureText(txt).width;
  const fs=Math.max(14,Math.min(58,64*(cw-CFG.pad-GR_EXTRA)/Math.max(1,m))),lw=fs*.26,D=Math.round(fs*.14);
  x.font='900 '+fs+'px '+GFONT;x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.lineCap='round';
  const cx=(cw-D)/2,cy=ch*.42-D/2;
  x.fillStyle=x.strokeStyle='#2f2f35';x.lineWidth=lw;
  for(let i=D;i>=1;i--){x.strokeText(txt,cx+i,cy+i);x.fillText(txt,cx+i,cy+i)}   // bóng đổ (nhiều lớp lệch chéo)
  x.strokeText(txt,cx,cy);                                                          // viền ngoài đậm
  const t=document.createElement('canvas');t.width=cw;t.height=ch;const y=t.getContext('2d');   // thân chữ ở canvas phụ để đổ bóng chỉ bên trong chữ
  y.font=x.font;y.textAlign='center';y.textBaseline='middle';y.lineJoin='round';
  const g=y.createLinearGradient(0,cy-fs/2,0,cy+fs/2);g.addColorStop(0,'#ffffff');g.addColorStop(1,'#d6dae4');
  y.fillStyle=g;y.fillText(txt,cx,cy);
  y.globalCompositeOperation='source-atop';
  y.shadowColor='rgba(90,100,125,.6)';y.shadowBlur=fs*.12;y.strokeStyle='rgba(90,100,125,.5)';y.lineWidth=lw*.9;y.strokeText(txt,cx,cy);   // bóng phồng ở mép trong
  y.shadowBlur=0;y.strokeStyle='rgba(255,255,255,.95)';y.lineWidth=Math.max(2,fs*.06);y.strokeText(txt,cx-fs*.06,cy-fs*.06);               // vệt sáng góc trên trái
  x.drawImage(t,0,0);
  if(sub){   // dòng chữ nhỏ: trắng viền đen
    const sf=subFit(x,sub,cw,ch);x.font='700 '+sf+'px '+FONT;x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';
    x.strokeStyle='#2f2f35';x.lineWidth=Math.max(3,sf*.3);x.strokeText(sub,cw/2,ch*.87);x.fillStyle='#ffffff';x.fillText(sub,cw/2,ch*.87);
  }
  return toTex(c);
}
function stoneTex(name,w,h,sub){   // chữ khắc chìm: nền đá tối nhẹ, viền, chữ tối có viền sáng phía dưới
  const cw=Math.round(w*PPM),ch=Math.round(h*PPM),c=document.createElement('canvas');c.width=cw;c.height=ch;
  const x=c.getContext('2d');
  x.font='700 64px '+FONT;const m=x.measureText(name).width,fs=Math.max(14,Math.min(58,64*(cw-CFG.pad)/Math.max(1,m)));
  x.fillStyle='rgba(40,34,52,.14)';x.fillRect(5,5,cw-10,ch-10);
  x.lineWidth=3;x.strokeStyle='rgba(255,255,255,.45)';x.strokeRect(7.5,7.5,cw-12,ch-12);
  x.strokeStyle='rgba(30,25,42,.55)';x.strokeRect(5.5,5.5,cw-12,ch-12);
  x.textAlign='center';x.textBaseline='middle';
  x.font='700 '+fs+'px '+FONT;const cy=ch*.42;
  x.fillStyle='rgba(255,255,255,.6)';x.fillText(name,cw/2+2,cy+2.5);x.fillStyle='rgba(32,27,44,.95)';x.fillText(name,cw/2,cy);
  if(sub){
    const sf=subFit(x,sub,cw,ch),sy=ch*.84;x.font='700 '+sf+'px '+FONT;
    x.strokeStyle='rgba(30,25,42,.4)';x.lineWidth=1.5;x.beginPath();x.moveTo(cw*.2,ch*.69);x.lineTo(cw*.8,ch*.69);x.stroke();   // vạch ngăn tên / dòng nhỏ
    x.fillStyle='rgba(255,255,255,.55)';x.fillText(sub,cw/2+1,sy+1.5);x.fillStyle='rgba(32,27,44,.9)';x.fillText(sub,cw/2,sy);
  }
  return toTex(c);
}
const mkTex=(name,w,h,sub)=>isGraf(name)?grafTex(name,w,h,sub):stoneTex(name,w,h,sub);
const plate=(name,w,h,sub)=>{
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:mkTex(name,w,h,sub),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));
  m.renderOrder=2;return m;
};
// vị trí / hướng của bảng trên tường: mặt phẳng quay vào trong map
const wallH=f=>f<NF-1?FH-SLAB:FH-1,ROT=[0,Math.PI,Math.PI/2,-Math.PI/2],OFF=.03;
const LX=[[1,0,0],[-1,0,0],[0,0,-1],[0,0,1]],NRM=[[0,0,1],[0,0,-1],[1,0,0],[-1,0,0]];
function wpos(f,s,u,v){const A=AF(f),y=f*FH+v;return s===0?[u,y,-A+OFF]:s===1?[-u,y,A-OFF]:s===2?[-A+OFF,y,-u]:[A-OFF,y,u]}
const place=(m,f,s,u,v)=>{const p=wpos(f,s,u,v);m.position.set(p[0],p[1],p[2]);m.rotation.y=ROT[s]};

// các bảng của tầng đang đứng (chỉ dựng mesh cho tầng này, rời tầng thì giải phóng GPU)
const grp=new THREE.Group();S.add(grp);
function rebuild(f){
  for(const m of grp.children.slice()){grp.remove(m);m.geometry.dispose();m.material.map.dispose();m.material.dispose()}
  shown=f;
  for(const e of list){if(e.f!==f)continue;const m=plate(e.name,e.w,e.h,honor(e.l,e.f));place(m,e.f,e.s,e.u,e.v);grp.add(m)}
}
// khung xem trước (chữ của bạn + nền xanh/đỏ)
const pv=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({transparent:true,opacity:.85,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}));
const pvb=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:0x44ff77,transparent:true,opacity:.4,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));
pvb.position.z=-.002;pvb.scale.set(1.04,1.1,1);pv.add(pvb);pv.visible=false;pv.renderOrder=3;pvb.renderOrder=2;S.add(pv);
let pvKey='',my={name:'',w:0};
function myPlate(){const n=cleanName(window.PROFILE&&PROFILE.name)||'Player';if(my.name!==n)my={name:n,w:plateW(n)};return my}

// ---------- ngắm tường ----------
const _d=new THREE.Vector3();
function aimInfo(){
  const f=curFl,A=AF(f),y0=f*FH,H=wallH(f),o=C.position;C.getWorldDirection(_d);
  let bs=-1,bt=1e9,bu=0,bv=0;
  for(let s=0;s<4;s++){
    const ax=s<2?_d.z:_d.x,pos=s<2?o.z:o.x,pl=(s===0||s===2)?-A:A;
    if((s===0||s===2)?ax>=-1e-4:ax<=1e-4)continue;
    const t=(pl-pos)/ax;if(!(t>0&&t<=CFG.reach&&t<bt))continue;
    const hx=o.x+_d.x*t,hz=o.z+_d.z*t,hy=o.y+_d.y*t-y0,al=s===0?hx:s===1?-hx:s===2?-hz:hz;
    if(hy<.8||hy>H-.8||Math.abs(al)>A)continue;
    bs=s;bt=t;bu=al;bv=hy;
  }
  if(bs<0)return null;
  const nm=myPlate(),w=nm.w,h=CFG.hM,u=+clamp(bu,-A+w/2+.3,A-w/2-.3).toFixed(2),v=+clamp(bv,h/2+.7,H-h/2-.7).toFixed(2);
  return {s:bs,u,v,w,h,nm,ok:free(f,bs,u,v,w,h)};
}

// ---------- khung hỏi ----------
const box=document.createElement('div');
box.style.cssText='position:fixed;left:50%;top:58%;transform:translateX(-50%);z-index:5;display:none;pointer-events:none;background:rgba(255,255,255,.96);color:#2b2a3a;border:3px solid #ffd23f;border-radius:16px;padding:12px 16px;font:700 16px "Trebuchet MS",Verdana,sans-serif;text-align:center;box-shadow:0 4px 18px rgba(0,0,0,.3);max-width:min(92vw,440px)';
box.innerHTML='<div class="egt"></div><button class="egb" style="pointer-events:auto;margin-top:8px;font:inherit;border:3px solid #ffd23f;background:#ffd23f;border-radius:12px;padding:5px 14px;cursor:pointer"></button>';
document.body.appendChild(box);
const egt=box.querySelector('.egt'),egb=box.querySelector('.egb');let boxKey='';
egb.addEventListener('click',e=>{e.stopPropagation();tryEngrave()});
egb.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();tryEngrave()},{passive:false});
function showBox(ok){
  const k=L+(ok?1:0);if(k!==boxKey){boxKey=k;egt.textContent=ok?et('ask'):et('taken');egb.innerHTML='<kbd>E</kbd> '+et('key');box.style.borderColor=ok?'#ffd23f':'#ff5a6e'}
  egb.style.display=ok?'':'none';box.style.display='block';
}

// ---------- khắc ----------
function chips(f,s,u,v,w,h){
  const p=wpos(f,s,u,v),n=NRM[s],lx=LX[s];
  for(let i=0;i<18;i++){
    const m=new THREE.Mesh(UG,M(i%2?0xd8d4cc:0x9a96a0)),z=.03+Math.random()*.04,al=(Math.random()-.5)*w*.8;
    m.scale.set(z,z,z);m.position.set(p[0]+lx[0]*al,p[1]+(Math.random()-.5)*h*.8,p[2]+lx[2]*al);
    const k=1+Math.random()*2.5;spawnPart(m,n[0]*k+(Math.random()-.5)*2,Math.random()*2+.5,n[2]*k+(Math.random()-.5)*2,.5+Math.random()*.4,true);
  }
}
function tryEngrave(){
  if(!playing||dead||tokens<=0)return;
  const a=aimInfo();if(!a)return;
  if(!a.ok){showMsg(et('taken'));snd(120,.12,'square',.05);return}
  const rec={id:'l'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),f:curFl,s:a.s,u:a.u,v:a.v,w:a.w,h:a.h,name:a.nm.name,l:HT[L]?L:'en',ts:Date.now()};
  tokens--;raw.push(rec);recompute();   // hiện ngay (chưa chờ Firebase)
  chips(rec.f,rec.s,rec.u,rec.v,rec.w,rec.h);
  snd(700,.05,'square',.05);setTimeout(()=>snd(520,.06,'square',.05),120);setTimeout(()=>snd(380,.1,'sawtooth',.05),260);
  showMsg(et('done',rec.name));
  post(rec).then(key=>{
    if(key){mine.add(key);raw=raw.filter(x=>x!==rec);sync()}   // tải lại từ Firebase: lấy giờ chuẩn của máy chủ, nếu có người ghi trước mình ở chỗ này thì bảng của mình bị ẩn + trả lại lượt
    else{lsSet();if(!warnedLocal){warnedLocal=true;setTimeout(()=>showMsg(et('local')),1800)}}   // chưa cấu hình / lỗi mạng: lưu cục bộ
  });
}
addEventListener('keydown',e=>{if(e.code==='KeyE'&&!e.repeat)tryEngrave()});

function loop(){
  requestAnimationFrame(loop);
  if(shown!==curFl||dirty){rebuild(curFl);dirty=false}
  const a=(playing&&!dead&&tokens>0)?aimInfo():null;
  if(!a){pv.visible=false;box.style.display='none';return}
  const sub=honor(HT[L]?L:'en',curFl),key=a.nm.name+'|'+sub;
  if(pvKey!==key){if(pv.material.map)pv.material.map.dispose();pv.material.map=mkTex(a.nm.name,a.w,a.h,sub);pv.material.needsUpdate=true;pvKey=key}
  pv.scale.set(a.w,a.h,1);place(pv,curFl,a.s,a.u,a.v);pvb.material.color.set(a.ok?0x44ff77:0xff4455);pv.visible=true;
  showBox(a.ok);
}
requestAnimationFrame(loop);

window.Engrave={
  grant(f){tokens++;setTimeout(()=>{if(tokens>0&&playing)showMsg(et('grant'))},1800)},   // chờ các thông báo hạ boss hiện xong
  reset(){tokens=0;box.style.display='none';pv.visible=false},
  tryEngrave,sync,list:()=>list,cfg:CFG
};
})();
