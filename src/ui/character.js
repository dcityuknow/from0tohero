// Chọn nhân vật: bước thứ 3 của màn hình đầu game (ngôn ngữ -> tên -> NHÂN VẬT). Được gọi từ ui/profile.js.
// Mỗi quốc gia trong game (11 ngôn ngữ) có 1 nhân vật khối vuông (kiểu Minecraft) mặc quân phục riêng: hoa văn rằn ri, mũ, áo giáp, huy hiệu cờ trên tay áo.
// Nhân vật dựng bằng chính lõi voxel của game (VB trong engine/voxel.js), kích thước đo bằng "điểm ảnh" PX như skin Minecraft:
//   đầu 8x8x8 · thân 8x12x4 · tay 4x12x4 · chân 4x12x4 (tổng cao 32 điểm ảnh).
// Lựa chọn lưu ở localStorage 'ba_char' và PROFILE.char. Góc nhìn thứ nhất không thấy cả người, nên nhân vật đã chọn hiện ở:
//   (1) màn hình xem trước + dòng tên ở màn bắt đầu, (2) hai cánh tay cầm súng (tay áo rằn ri đúng quân phục + màu da) - xem fp() và arm() trong player/player.js.
// Thêm / sửa nhân vật: sửa mảng CH bên dưới (màu rằn ri, mũ, áo giáp, cờ). Thêm file này vào loader.js TRƯỚC ui/profile.js.
(function(){
const PX=.056;                       // 1 điểm ảnh skin = 5.6cm -> nhân vật cao ~1.8m
const KEY='ba_char';

// ---------- nhiễu giá trị (không có thư viện ngoài) ----------
const hb=(a,b,c,s)=>{let h=(Math.imul(a|0,374761393)+Math.imul(b|0,668265263)+Math.imul(c|0,1442695041)+Math.imul(s|0,1274126177))|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return(h>>>0)/4294967296};
const sm=t=>t*t*(3-2*t),lp=(a,b,t)=>a+(b-a)*t;
function vn(x,y,z,s){
  const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),fx=sm(x-xi),fy=sm(y-yi),fz=sm(z-zi),g=(a,b,c)=>hb(xi+a,yi+b,zi+c,s);
  return lp(lp(lp(g(0,0,0),g(1,0,0),fx),lp(g(0,1,0),g(1,1,0),fx),fy),lp(lp(g(0,0,1),g(1,0,1),fx),lp(g(0,1,1),g(1,1,1),fx),fy),fz);
}
const shade=(hex,f)=>{const r=Math.min(255,Math.round((hex>>16&255)*f)),g=Math.min(255,Math.round((hex>>8&255)*f)),b=Math.min(255,Math.round((hex&255)*f));return(r<<16)|(g<<8)|b};
// Hoa văn quân phục. kind: 'plain' = gần như trơn (vài điểm sậm) · 'blob' = mảng rằn ri mềm (woodland / multicam) · 'pix' = mảng vuông 2x2 (kiểu digital)
// pal: các màu (sậm -> sáng, màu chủ đạo ở giữa) · sc: hệ số phóng to mảng (dùng cho tay áo góc nhìn thứ nhất, nhỏ hơn nên cần mảng lớn hơn)
function camoFn(pal,kind,seed,sc=1){
  const n=pal.length;
  if(kind==='plain')return(i,j,k)=>(hb(i,j,k,seed)*.5+vn(i/2.4/sc,j/2.4/sc,k/2.4/sc,seed)*.5)>.8?pal[1]:pal[0];
  return(i,j,k)=>{
    let v;
    if(kind==='pix'){const a=Math.floor(i/(2*sc)),b=Math.floor(j/(2*sc)),c=Math.floor(k/(2*sc));v=.72*vn(a*2/3.4,b*2/3.4,c*2/3.4,seed)+.28*hb(a,b,c,seed+9)}
    else v=.7*vn(i/3.4/sc,j/3.4/sc,k/3.4/sc,seed)+.3*vn(i/1.7/sc+5,j/1.7/sc,k/1.7/sc,seed+3);
    v=(v-.5)*1.7+.5;
    return pal[Math.max(0,Math.min(n-1,Math.floor(v*n)))];
  };
}

// ---------- cờ trên tay áo (R đỏ, B xanh dương, W trắng, Y vàng, G xanh lá, O cam, K đen) ----------
const FC={R:0xd02a2a,B:0x1d56b8,W:0xf4f4f4,Y:0xffd23f,G:0x1f9a4a,O:0xff9933,K:0x222222};
const FLAG={
  vn:['RRRR','RYYR','RYYR','RRRR'],
  us:['BBRR','BBWW','RRRR','WWWW'],
  ru:['WWWW','BBBB','RRRR'],
  ng:['GWWG','GWWG','GWWG'],
  bd:['GGGG','GRRG','GGGG'],
  id:['RRRR','WWWW'],
  in:['OOOO','WBBW','GGGG'],
  cn:['RYRR','RRRR','RRRR'],
  ph:['WBBB','WYRR','WRRR'],
  ua:['BBBB','YYYY'],
  kr:['WWWW','WRBW','WWWW']
};

// ---------- 11 nhân vật ----------
// k: mã nhân vật · lang: ngôn ngữ của quốc gia đó · cc: mã quốc gia (tên nước hiển thị theo ngôn ngữ đang chọn)
// uni: quân phục {pal,kind,seed} · hat: {kind: helmet|pith|beret|cap|boonie|ushanka, c: màu/hoa văn, badge: huy hiệu trước mũ}
// vest: áo giáp / áo dã chiến ngoài (màu) · pack: ba lô · tabs: phù hiệu cổ áo · glove: găng tay (null = tay trần) · boots · belt · skin · hair
const CH=[
  {k:'vn',lang:'vi',cc:'VN',skin:0xf0c9a2,hair:0x15110d,uni:{pal:[0x4c6633,0x56703a],kind:'plain',seed:11},
   hat:{kind:'pith',c:0x62803e,brim:0x4c6633,badge:'star'},tabs:0xd42a2a,boots:0x2b2b26,belt:0x3a2f1f,glove:null,vest:null,pack:null},
  {k:'us',lang:'en',cc:'US',skin:0xf2cdb0,hair:0x4a3220,uni:{pal:[0x5a4a36,0xa89874,0x7b7d52,0x4f5a34],kind:'blob',seed:21},
   hat:{kind:'helmet',c:'uni',nvg:true},vest:0x8a7a58,pouch:0x6e6044,pack:0x6e6a48,glove:0x2a2a2a,boots:0x8a6f4a,belt:0x5a4a32,knee:true},
  {k:'ru',lang:'ru',cc:'RU',skin:0xf3d0b8,hair:0xb98f58,uni:{pal:[0x3b4a2c,0x6c7a48,0xb5a672,0x5a4631],kind:'pix',seed:31},
   hat:{kind:'ushanka',c:0x8a868c,badge:'star'},vest:0x4a5236,pouch:0x3a4128,pack:0x4a5a3a,glove:0x1f1f1f,boots:0x2a2420,belt:0x2f2a22},
  {k:'ng',lang:'ng',cc:'NG',skin:0x5a3a28,hair:0x0d0b0a,uni:{pal:[0x2f3b24,0x55703a,0x7a6238,0xa89c6d],kind:'blob',seed:41},
   hat:{kind:'beret',c:0x2a4a2a,badge:0xd9b13b},boots:0x2b2822,belt:0x2a2a22,glove:null,vest:null,pack:null},
  {k:'bd',lang:'bn',cc:'BD',skin:0xa87048,hair:0x100c0a,uni:{pal:[0x2a3d22,0x4b6a36,0x6a7a40,0x3c3220],kind:'blob',seed:51},
   hat:{kind:'cap',c:'uni',visor:0x2a3a22,badge:0xd02a2a},boots:0x1c1c1c,belt:0x2a2a22,glove:null,vest:null,pack:null},
  {k:'id',lang:'id',cc:'ID',skin:0xc08a58,hair:0x0e0b09,uni:{pal:[0x1f2a17,0x4a5a2e,0x7a5a30,0x9a8a58],kind:'blob',seed:61},
   hat:{kind:'beret',c:0xb01820,badge:0xd9b13b},vest:0x2d3524,pouch:0x20281a,glove:0x1c1c1c,boots:0x1c1c1c,belt:0x2a2a22,pack:null},
  {k:'in',lang:'hi',cc:'IN',skin:0xb98258,hair:0x0c0a09,uni:{pal:[0x3a3a28,0x6a6a3a,0x8a6a3c,0x55603a],kind:'pix',seed:71},
   hat:{kind:'beret',c:0x7a1e2a,badge:0xd9b13b},boots:0x2a2420,belt:0x2f2a22,glove:null,vest:null,pack:null},
  {k:'cn',lang:'zh',cc:'CN',skin:0xf0c8a0,hair:0x0d0b0a,uni:{pal:[0x2e3a22,0x587036,0x8a9a5a,0xb2a47a,0x3a2e1e],kind:'pix',seed:81},
   hat:{kind:'helmet',c:'uni',badge:'star'},vest:0x4a5535,pouch:0x3a4428,pack:0x44502f,glove:0x2a2a2a,boots:0x1f1f1f,belt:0x2f2a22},
  {k:'ph',lang:'fil',cc:'PH',skin:0xc89868,hair:0x120e0b,uni:{pal:[0x2c3c22,0x4c6a3a,0x7a8a50,0x5a4a30],kind:'pix',seed:91},
   hat:{kind:'boonie',c:'uni'},boots:0x3a3328,belt:0x2f2a22,glove:null,vest:null,pack:null},
  {k:'ua',lang:'uk',cc:'UA',skin:0xf1cfb4,hair:0x6a4a2a,uni:{pal:[0x3d3a22,0x6b6c3c,0xa28f5c,0x4a3a28],kind:'pix',seed:101},
   hat:{kind:'helmet',c:'uni',badge:'ua'},vest:0x6a5a3c,pouch:0x54482e,pack:0x5a5030,glove:0x2a2a2a,boots:0x6b5a3c,belt:0x4a3f2a,knee:true},
  {k:'kr',lang:'ko',cc:'KR',skin:0xf0d0b4,hair:0x0d0c0b,uni:{pal:[0x2a3326,0x47573a,0x7a7650,0x1f1f1a],kind:'pix',seed:111},
   hat:{kind:'cap',c:'uni',visor:0x1f1f1a,badge:0xd9b13b},boots:0x1a1a1a,belt:0x1f1f1a,glove:null,vest:null,pack:null}
];
const BYK={},BYLANG={};for(const c of CH){BYK[c.k]=c;BYLANG[c.lang]=c}

// ---------- dựng mô hình ----------
function B(vb,x,y,z,w,h,d,col){vb.box(x*PX,y*PX,z*PX,w*PX,h*PX,d*PX,col,PX,true)}   // hộp tính bằng điểm ảnh (tâm x,y,z · rộng,cao,dài)
function hatOf(def,U){return def.hat.c==='uni'?U:def.hat.c}
function addHat(v,def,U){
  const h=def.hat,c=hatOf(def,U),RED=0xd02a2a,YEL=0xffd23f;
  const badge=(x,y,z)=>{
    if(h.badge==='star')B(v,x,y,z,3,3,1,(i,j)=>(i===1&&j===1)?YEL:RED);
    else if(h.badge==='ua')B(v,x,y,z,3,3,1,(i,j)=>j>=1?0x1d56b8:0xffd23f);
    else if(h.badge)B(v,x,y,z,2,2,1,h.badge);
  };
  switch(h.kind){
    case 'helmet':
      B(v,0,31,0,10,4,10,c);                            // mũ chụp (hoa văn như quân phục)
      B(v,0,29.5,0,11,1,11,shade(typeof c==='function'?def.uni.pal[1]:c,.7));   // vành mũ
      B(v,0,30,-5.5,10,3,1,c);                          // phần che gáy
      if(h.nvg)B(v,0,32,5.5,3,2,1,0x1f1f1f);            // giá gắn kính nhìn đêm
      badge(0,31,5.5);break;
    case 'pith':                                        // mũ cối
      B(v,0,29.5,0,12,1,12,h.brim);B(v,0,31,0,9,2,9,c);B(v,0,32.5,0,7,1,7,c);
      B(v,0,30.5,4.5,9,1,1,shade(c,.75));badge(0,31,5);break;
    case 'beret':
      B(v,0,30.5,0,10,3,10,c);B(v,1,32.5,0,9,1,9,c);B(v,4.5,29.5,2,2,2,5,c);
      badge(-2.5,31,5.5);break;
    case 'cap':
      B(v,0,30.5,0,9,3,9,c);B(v,0,32.5,0,9,1,9,typeof c==='function'?def.uni.pal[0]:shade(c,.85));
      B(v,0,29.5,6,8,1,4,h.visor);badge(0,31,5);break;
    case 'boonie':
      B(v,0,31.5,0,9,3,9,c);B(v,0,29.5,0,13,1,13,typeof c==='function'?def.uni.pal[0]:shade(c,.8));
      B(v,0,30.5,4.5,9,1,1,0x2a2a22);break;
    case 'ushanka':
      B(v,0,31,0,10,4,10,c);B(v,-5,27.5,0,2,5,6,shade(c,.85));B(v,5,27.5,0,2,5,6,shade(c,.85));
      B(v,0,29.5,-5.5,10,3,1,shade(c,.85));badge(0,31,5.5);break;
  }
}
// Dựng nhân vật -> {g, armL, armR, legL, legR}. Mặt nhìn về +z. Chân chạm y=0.
function build(def){
  const g=new THREE.Group(),U=camoFn(def.uni.pal,def.uni.kind,def.uni.seed),sk=[def.skin,shade(def.skin,.94)],SKN=(i,j,k)=>((i+j+k)&1)?sk[0]:sk[1];
  const RED=0xd02a2a,mouth=shade(def.skin,.62),gl=def.glove;
  const grp=(x,y)=>{const q=new THREE.Group();q.position.set(x*PX,y*PX,0);g.add(q);return q};
  // đầu
  {const hv=new VB(),H=def.hair;
    hv.box(0,28*PX,0,8*PX,8*PX,8*PX,(i,j,k)=>{
      if(j===7)return H;
      if(k===7){
        if(j===3){if(i===1||i===6)return 0xffffff;if(i===2||i===5)return 0x2a2018}
        if(j===4&&(i===1||i===2||i===5||i===6))return H;
        if(j===1&&(i===3||i===4))return mouth;
        return j>=5?H:SKN(i,j,k);
      }
      if(k===0)return j>=1?H:SKN(i,j,k);
      if(i===0||i===7)return j>=4?H:SKN(i,j,k);
      return SKN(i,j,k);
    },PX,true);
    addHat(hv,def,U);
    g.add(hv.mesh());}
  // thân (áo + áo giáp + thắt lưng + phù hiệu cổ áo)
  {const bv=new VB(),vest=def.vest,pc=def.pouch;
    bv.box(0,18*PX,0,8*PX,12*PX,4*PX,(i,j,k,nx,ny,nz)=>{
      const fr=k===nz-1,bk=k===0;
      if(j===1)return def.belt;
      if(vest&&(fr||bk)&&j>=2&&j<=9&&i>=1&&i<=6){
        if(fr&&j>=2&&j<=4&&(i<=2||i>=5))return pc;   // 2 túi đạn hai bên
        if(fr&&j===4&&(i===3||i===4))return shade(vest,.8);
        return vest;
      }
      if(vest&&j>=10&&(i===1||i===6)&&(fr||bk))return vest;   // quai vai áo giáp
      if(def.tabs&&fr&&j>=9&&(i===1||i===2||i===5||i===6))return def.tabs;
      return U(i,j,k);
    },PX,true);
    if(def.pack)B(bv,0,19,-3,7,8,2,def.pack);
    if(def.pouch&&vest){B(bv,-2.5,15.5,2.5,2,3,1,def.pouch);B(bv,2.5,15.5,2.5,2,3,1,def.pouch)}   // 2 túi đạn nổi
    g.add(bv.mesh());}
  // tay (gốc xoay ở vai) - tay áo hoa văn, tay trần / găng, huy hiệu cờ ở mép ngoài tay áo
  const mkArm=sx=>{
    const q=grp(sx*6,24),av=new VB();
    av.box(0,-6*PX,0,4*PX,12*PX,4*PX,(i,j,k)=>j<=2?(gl||SKN(i,j,k)):U(i+(sx>0?4:0),j,k),PX,true);
    const fl=FLAG[def.k];
    if(fl){const rows=fl.length;
      // mặt ngoài của tay nhìn từ ngoài vào: cột cờ chạy ngược chiều k ở tay phải, thuận chiều k ở tay trái -> cờ luôn đọc đúng chiều
      B(av,sx*2.5,-3.5-rows/2+.5,0,1,rows,4,(i,j,k)=>{const col=sx>0?3-k:k,row=rows-1-j;return FC[fl[row][col]]});}
    q.add(av.mesh());return q;
  };
  const armL=mkArm(-1),armR=mkArm(1);
  // chân (gốc xoay ở hông) - quần hoa văn, ống giày
  const mkLeg=sx=>{
    const q=grp(sx*2,12),lv=new VB();
    lv.box(0,-6*PX,0,4*PX,12*PX,4*PX,(i,j,k,nx,ny,nz)=>{
      if(j<=2)return def.boots;
      if(def.knee&&k===nz-1&&j>=5&&j<=6&&i>=1&&i<=2)return shade(def.vest||0x444444,.7);
      return U(i,j+3,k+(sx>0?5:0));
    },PX,true);
    q.add(lv.mesh());return q;
  };
  const legL=mkLeg(-1),legR=mkLeg(1);
  return {g,armL,armR,legL,legR};
}

// ---------- ảnh xem trước (1 renderer WebGL dùng chung; tạo khi mở màn chọn, huỷ khi xong) ----------
let rd=null,sc=null,cam=null,models={},thumbs={},rw=0,rh=0;
function ensureGL(){
  if(rd)return;
  rd=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
  rd.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  sc=new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xffffff,0x77706a,.72));
  const d=new THREE.DirectionalLight(0xffffff,.55);d.position.set(3,6,5);sc.add(d);
  cam=new THREE.PerspectiveCamera(26,.72,.1,50);cam.position.set(0,1.1,6.2);cam.lookAt(0,.93,0);
}
function size(w,h){if(w!==rw||h!==rh){rw=w;rh=h;rd.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}}   // chỉ đổi cỡ khi cần (setSize xoá canvas, tốn)
function modelOf(k){if(!models[k]){models[k]=build(BYK[k]);models[k].g.visible=false;sc.add(models[k].g)}return models[k]}
function showOnly(k){for(const m of Object.values(models))m.g.visible=false;const m=modelOf(k);m.g.visible=true;return m}
function pose(m,t){   // dáng đứng nghỉ: tay chân đung đưa rất nhẹ
  const s=Math.sin(t*1.6)*.06;m.armL.rotation.x=s;m.armR.rotation.x=-s;m.legL.rotation.x=-s*.5;m.legR.rotation.x=s*.5;
}
function snapshot(k,w,h,ry){
  const m=showOnly(k);pose(m,0);m.g.rotation.y=ry;size(w,h);rd.render(sc,cam);
  const c=document.createElement('canvas');c.width=rd.domElement.width;c.height=rd.domElement.height;c.getContext('2d').drawImage(rd.domElement,0,0);return c;
}
function thumbURL(k){   // ảnh nhỏ để hiện cạnh tên ở màn bắt đầu (cache)
  if(!BYK[k])return '';
  if(!thumbs[k]){try{ensureGL();thumbs[k]=snapshot(k,96,132,-.5).toDataURL('image/png')}catch(e){thumbs[k]=''}}
  return thumbs[k];
}

// ---------- chữ ----------
const PT={
  vi:{t:'Chọn nhân vật',h:'Mỗi quốc gia một bộ quân phục riêng · kéo để xoay nhân vật',ok:'Vào game',back:'← Đổi tên'},
  en:{t:'Choose your character',h:'One uniform for every country · drag to rotate',ok:'Start',back:'← Change name'},
  ru:{t:'Выберите персонажа',h:'У каждой страны своя форма · потяните, чтобы повернуть',ok:'Начать',back:'← Сменить имя'},
  ng:{t:'Choose your character',h:'Every country get im own uniform · drag am make e turn',ok:'Start',back:'← Change name'},
  bn:{t:'আপনার চরিত্র বেছে নিন',h:'প্রতিটি দেশের নিজস্ব পোশাক · ঘোরাতে টেনে আনুন',ok:'শুরু করুন',back:'← নাম বদলান'},
  id:{t:'Pilih karakter',h:'Setiap negara punya seragam sendiri · seret untuk memutar',ok:'Mulai',back:'← Ganti nama'},
  hi:{t:'अपना किरदार चुनें',h:'हर देश की अपनी वर्दी · घुमाने के लिए खींचें',ok:'शुरू करें',back:'← नाम बदलें'},
  zh:{t:'选择你的角色',h:'每个国家一套军装 · 拖动可旋转',ok:'开始',back:'← 更改名字'},
  fil:{t:'Piliin ang karakter mo',h:'May sariling uniporme ang bawat bansa · i-drag para paikutin',ok:'Simulan',back:'← Palitan ang pangalan'},
  uk:{t:'Оберіть персонажа',h:'Кожна країна має свою форму · потягніть, щоб обертати',ok:'Почати',back:'← Змінити ім’я'},
  ko:{t:'캐릭터를 선택하세요',h:'나라마다 고유한 군복 · 드래그하여 회전',ok:'시작',back:'← 이름 변경'}
};
const CN_EN={VN:'Vietnam',US:'United States',RU:'Russia',NG:'Nigeria',BD:'Bangladesh',ID:'Indonesia',IN:'India',CN:'China',PH:'Philippines',UA:'Ukraine',KR:'South Korea'};
const BCP={vi:'vi',en:'en',ru:'ru',ng:'en',bn:'bn',id:'id',hi:'hi',zh:'zh-CN',fil:'fil',uk:'uk',ko:'ko'};
function cname(c,l){try{return new Intl.DisplayNames([BCP[l]||'en'],{type:'region'}).of(c.cc)||CN_EN[c.cc]}catch(e){return CN_EN[c.cc]}}
const pt=(l,k)=>(PT[l]&&PT[l][k])||PT.en[k];

// ---------- giao diện ----------
const css=document.createElement('style');
css.textContent=`#pfc.wide{width:min(96vw,760px)}
#cpw{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;align-items:flex-start}
#cpv{flex:0 0 auto;text-align:center}
#cpc{position:static;inset:auto;display:block;width:210px;height:290px;touch-action:none;cursor:grab;border-radius:16px;background:linear-gradient(#cfe8ff,#fdf6f9);border:3px solid var(--blue)}
#cpc:active{cursor:grabbing}
#cpn{margin-top:8px;font-weight:bold;font-size:18px}
#cpg{flex:1 1 300px;display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:6px;align-content:start}
.cpi{font:inherit;font-weight:bold;font-size:11px;line-height:1.15;color:var(--ink);background:transparent;border:3px solid var(--blue);border-radius:12px;padding:3px 2px 4px;cursor:pointer}
.cpi canvas{position:static;inset:auto;display:block;width:100%;height:auto;margin:0 auto}   /* style.css đặt MỌI canvas ở position:fixed toàn màn hình -> phải ghi đè */
.cpi.on{border-color:var(--pink);background:rgba(255,127,168,.22)}
#pfw img{width:22px;height:30px;vertical-align:middle;image-rendering:pixelated;margin-right:4px}`;
document.head.appendChild(css);

let sel=null,raf=0,drag=null,spin=0;
function saved(){try{return localStorage.getItem(KEY)}catch(e){return null}}
function show(card,l,done,back){
  ensureGL();
  const cur=BYK[sel]||BYK[saved()]||BYLANG[l]||CH[0];sel=cur.k;
  card.innerHTML='<h1>🎖️</h1><p class="pfs"></p><div id="cpw"><div id="cpv"><div id="cpcw"></div><div id="cpn"></div></div><div id="cpg"></div></div><p class="pfh"></p><div><button class="pfb" id="pfback"></button><button class="pfb go" id="pfok"></button></div>';
  const q=s=>card.querySelector(s);
  q('.pfs').textContent=pt(l,'t');q('.pfh').textContent=pt(l,'h');q('#pfback').textContent=pt(l,'back');q('#pfok').textContent=pt(l,'ok');
  // ảnh nhỏ từng nhân vật
  const grid=q('#cpg'),btns={};
  for(const c of CH){
    const b=document.createElement('button');b.className='cpi';b.type='button';b.dataset.k=c.k;
    const cv=snapshot(c.k,150,208,-.5);b.append(cv,document.createTextNode(cname(c,l)));
    b.addEventListener('click',()=>pick(c.k));grid.appendChild(b);btns[c.k]=b;
  }
  // khung xoay lớn
  size(210,290);
  const view=rd.domElement;view.id='cpc';q('#cpcw').appendChild(view);
  function pick(k){sel=k;for(const x in btns)btns[x].classList.toggle('on',x===k);q('#cpn').textContent=cname(BYK[k],l)}
  pick(sel);
  const down=e=>{drag={x:e.clientX,r:spin};view.setPointerCapture&&view.setPointerCapture(e.pointerId)};
  const move=e=>{if(drag)spin=drag.r+(e.clientX-drag.x)*.012};
  const up=()=>{drag=null};
  view.addEventListener('pointerdown',down);view.addEventListener('pointermove',move);view.addEventListener('pointerup',up);view.addEventListener('pointercancel',up);
  let t0=performance.now();
  (function loop(){
    raf=requestAnimationFrame(loop);
    const now=performance.now(),dt=(now-t0)/1000;t0=now;
    if(!drag)spin+=dt*.7;
    const m=showOnly(sel);pose(m,now/1000);m.g.rotation.y=spin;
    size(210,290);rd.render(sc,cam);
  })();
  const stop=()=>{cancelAnimationFrame(raf);raf=0;view.remove()};
  q('#pfback').addEventListener('click',()=>{stop();api.release();back()});
  q('#pfok').addEventListener('click',()=>{
    stop();try{localStorage.setItem(KEY,sel)}catch(e){}
    thumbURL(sel);api.release();api.apply(sel);done(sel);   // lấy ảnh nhỏ trước khi giải phóng WebGL
  });
}

// ---------- áp dụng vào game ----------
// Góc nhìn thứ nhất: player/player.js -> arm() gọi CharPick.fp() để đổi tay áo (hoa văn quân phục), màu da, găng tay
function fp(){
  const c=BYK[window.PROFILE&&PROFILE.char];if(!c)return null;
  const sleeve=camoFn(c.uni.pal,c.uni.kind,c.uni.seed,1.7);
  return {sleeve,cuff:shade(c.uni.pal[Math.min(1,c.uni.pal.length-1)],.55),skin:[c.skin,shade(c.skin,.95)],glove:c.glove,band:c.belt};
}
const api={
  list:CH,fp,thumbURL,
  make(k){return build(BYK[k]||CH[0])},   // dựng 1 bản nhân vật mới cho trong game (player/thirdperson.js): {g,armL,armR,legL,legR}
  snapshot(k,w,h,ry){ensureGL();return snapshot(k,w,h,ry)},   // canvas ảnh nhân vật cỡ tuỳ ý (dùng để xem thử / chụp ảnh)
  current:()=>BYK[saved()]?saved():null,
  apply(k){
    if(!BYK[k])return;
    if(window.PROFILE)PROFILE.char=k;
    if(typeof buildVM==='function'){try{buildVM()}catch(e){}}    // dựng lại tay + súng với tay áo mới
  },
  show,
  release(){   // xong màn chọn: giải phóng WebGL
    if(raf){cancelAnimationFrame(raf);raf=0}
    for(const k in models){models[k].g.traverse(o=>{if(o.geometry)o.geometry.dispose()});sc.remove(models[k].g)}
    models={};rw=rh=0;if(rd){rd.dispose();if(rd.forceContextLoss)rd.forceContextLoss();rd=null}
  }
};
window.CharPick=api;
})();
