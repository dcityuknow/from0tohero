// ============================================================================
// TƯƠNG TÁC TRANH TRONG CHÒI: đứng gần + nhìn vào 1 bức tranh -> hiện gợi ý [E]. Bấm E -> quanh bức tranh bung ra 4 ô thông tin kiểu bảng điện tử
// trong suốt (cùng phong cách bảng "VALIDATORS" trong pavilion.js), bung ra CÙNG LÚC; chữ trong từng ô XỔ DẦN từng ký tự (nhanh) kèm tiếng pip pip pip, gõ xong thì hiện thêm 10 giây rồi mờ dần và tắt. Bấm E lần nữa = tắt sớm.
//   - Thẻ tên: ẢNH CHÂN DUNG thật + tên + chức vụ + nhóm        - Tiểu sử (lấy từ guide-bot.js)
//   - Ô ảnh: ảnh thật ngoài đời / họp báo, tự chuyển ảnh mỗi vài giây   - Ô liên kết: X, LinkedIn, website, Optimum — NGẮM vào dòng + CLICK TRÁI để mở
// Ô ảnh: ưu tiên ảnh bạn khai báo (gallery) -> nếu chưa có thì TỰ LẤY ảnh từ Wikipedia/Wikimedia Commons (chỉ nhận bài viết khớp tên + đúng lĩnh vực, ghi nguồn/giấy phép)
//        -> nếu Wikipedia cũng không có thì tự vẽ SƠ ĐỒ NODE OPTIMUM theo chức vụ của người đó (động, sinh động). Mỗi lần bấm E ảnh bắt đầu từ tấm kế tiếp, rồi tự đổi mỗi vài giây.
//        Tùy chọn trong team-media.js: wiki:'Tên bài Wikipedia' (ép dùng bài này) hoặc wiki:false (tắt tự lấy ảnh cho người đó).
// Dữ liệu ảnh + link của từng người: src/data/team-media.js (window.PortraitMedia). Chưa điền thì ô đó hiện chỗ trống, game vẫn chạy bình thường.
// Chạy bằng file:// (bấm đúp index.html) thì trình duyệt chặn ảnh làm texture WebGL -> dùng tools/embed-team-images.js để nhúng ảnh vào src/data/team-images.js.
// Nạp SAU pavilion.js (đọc window.PavilionGuide.easels mỗi lần bấm, nên chòi rebuild vẫn đúng). Không cần sửa main.js / pavilion.js.
// ============================================================================
(function(){
const DUR=10,FADE=.55,POP=.42,RANGE=4.8,COSV=.84,GAL_T=2.6;
const TYPE_AT=.22,TYPE_CPS=150,TYPE_MIN=1,TYPE_MAX=3.4,BEEP_GAP=.052,BEEP_F=1500;   // TYPE_AT: giây chờ sau khi bấm E rồi mới bắt đầu gõ · TYPE_CPS: ký tự/giây (tăng = nhanh hơn) · TYPE_MIN/MAX: thời gian gõ 1 ô (giây) · BEEP_GAP: giây giữa 2 tiếng pip · BEEP_F: tần số pip (Hz)
// (DUR: số giây hiện SAU KHI gõ xong)   // DUR: giây hiện · RANGE: khoảng cách tối đa (m) · COSV: độ lệch hướng nhìn cho phép (cos ~33°) · GAL_T: giây mỗi ảnh trong ô ảnh
const OPT_URL='https://x.com/get_optimum';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>{const c=1.70158,u=t-1;return 1+(c+1)*u*u*u+c*u*u};   // easeOutBack: bung ra có nảy nhẹ
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const seedRnd=s=>{let a=hash(s)||1;return()=>(a=(a*16807)%2147483647)/2147483647};
const keyOf=n=>String(n).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/^(PROF|DR)\.?\s+/,'');   // cùng cách đặt khóa với guide-bot.js ('PROF. MURIEL MEDARD' -> 'MURIEL MEDARD')
const okUrl=u=>/^https?:\/\//i.test(u||'');                                   // chỉ cho mở http(s)
const cleanUrl=u=>String(u).replace(/^https?:\/\/(www\.)?/i,'').replace(/\/$/,'');
const mediaOf=e=>{const M=window.PortraitMedia;return(M&&M[keyOf(e.n1)])||{}};
const galOf=m=>{const a=[];for(const it of(m.gallery||[])){if(!it)continue;if(typeof it==='string')a.push({src:it,cap:''});else if(it.src)a.push({src:it.src,cap:it.cap||it.caption||''})}return a};

function groupOf(n2){
  if(/ADVISOR/.test(n2))return'ADVISORY BOARD';
  if(/CO[- ]?FOUNDER/.test(n2))return'FOUNDING TEAM';
  if(/\b(CEO|CTO|CMO|CPO)\b|CHIEF/.test(n2))return'LEADERSHIP';
  if(/MODERATOR|COMMUNITY|AMBASSADOR|OPTIMUM TEAM/.test(n2))return'COMMUNITY';
  if(/ENGINEER|TPM|TCSM/.test(n2))return'ENGINEERING & SUPPORT';
  return'OPTIMUM TEAM';
}

// ---------- NẠP ẢNH (an toàn với WebGL) ----------
// Ảnh bị coi là "nhiễm" (tainted) khi mở bằng file:// hoặc khác nguồn -> đưa vào texture sẽ làm HỎNG VÒNG VẼ CỦA CẢ GAME. Nên mỗi ảnh được thử vẽ + đọc 1 điểm; lỗi thì loại bỏ (hiện "NO IMAGE").
// Ảnh nhúng sẵn dạng data: (window.PortraitImages[đường_dẫn], do tools/embed-team-images.js tạo) luôn an toàn, kể cả file://.
const IMG={};
function getImg(src,P){   // trả {st:'load'|'ok'|'bad',im}; panel P (nếu có) được vẽ lại khi ảnh nạp xong
  let r=IMG[src];
  if(!r){
    r=IMG[src]={st:'load',im:null,w:[]};
    const done=ok=>{r.st=ok?'ok':'bad';const w=r.w;r.w=[];for(const p of w){try{if(p.alive)p.draw()}catch(_){}}};
    const url=(window.PortraitImages&&window.PortraitImages[src])||src;
    const im=new Image();if(/^https?:/i.test(url))im.crossOrigin='anonymous';
    im.onload=()=>{try{const c=document.createElement('canvas');c.width=c.height=2;const g=c.getContext('2d');g.drawImage(im,0,0,2,2);g.getImageData(0,0,1,1);r.im=im;done(true)}
      catch(err){console.warn('[PortraitInfo] ảnh bị trình duyệt chặn (đang chạy file://?) -> chạy tools/embed-team-images.js hoặc mở game bằng server (npm start):',src);done(false)}};
    im.onerror=()=>{console.warn('[PortraitInfo] không tải được ảnh:',src);done(false)};
    im.src=url;
  }
  if(P&&r.st==='load'&&r.w.indexOf(P)<0)r.w.push(P);
  return r;
}
function cover(g,im,x,y,w,h,bias){   // phủ kín khung (cắt phần thừa); bias<.5 = ưu tiên phần trên (mặt người)
  const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,k=Math.max(w/iw,h/ih),sw=w/k,sh=h/k;
  g.drawImage(im,(iw-sw)/2,(ih-sh)*(bias==null?.5:bias),sw,sh,x,y,w,h);
}

// ---------- ẢNH TỪ WIKIPEDIA (tự động, chỉ khi người đó chưa có gallery) ----------
// An toàn: chỉ nhận bài có TÊN khớp (sai lệch nhỏ ok) và mô tả đúng lĩnh vực (kỹ thuật/khoa học/crypto...). Ngoài ảnh đại diện, chỉ lấy ảnh có TÊN FILE chứa tên người đó.
// Wikimedia cho phép gọi từ trình duyệt (CORS), không cần API key. Mất mạng / không có bài -> rơi về sơ đồ node.
const WIKI={},VIS={},WIKI_API='https://en.wikipedia.org/w/api.php';
const WIKI_HINT=/comput|engineer|scien|crypto|blockchain|network|professor|technolog|entrepreneur|software|information|mathemat|coding|startup|founder|executive|investor|research|developer|economist/i;
const simp=x=>String(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
function lev(a,b){const d=[];for(let i=0;i<=a.length;i++){d[i]=[i]}for(let j=1;j<=b.length;j++)d[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[a.length][b.length]}
async function jget(params){
  const u=new URL(WIKI_API),q=Object.assign({format:'json',formatversion:'2',origin:'*'},params);for(const k in q)u.searchParams.set(k,q[k]);
  const ac=typeof AbortController!=='undefined'?new AbortController():null,to=setTimeout(()=>{if(ac)ac.abort()},9000);
  try{const r=await fetch(u.toString(),{signal:ac?ac.signal:undefined});if(!r.ok)throw new Error('http '+r.status);return await r.json()}finally{clearTimeout(to)}
}
async function wikiFetch(e,m){
  const name=String(e.n1).replace(/^(PROF|DR)\.?\s+/i,'').trim(),nn=simp(name);let page=null;
  if(typeof m.wiki==='string'&&m.wiki){   // ép dùng bài này
    const j=await jget({action:'query',titles:m.wiki,redirects:1,prop:'pageimages',piprop:'thumbnail|name',pithumbsize:900});
    page=j.query&&j.query.pages&&j.query.pages[0];if(!page||page.missing)return[];
  }else{
    if(nn.split(' ').length<2)return[];   // tên 1 từ (vd "SWARNA", "FLASH") quá dễ nhầm -> bỏ qua
    const j=await jget({action:'query',generator:'search',gsrsearch:name,gsrlimit:4,prop:'pageimages|extracts|description',piprop:'thumbnail|name',pithumbsize:900,exintro:1,explaintext:1,exchars:400,exlimit:4,redirects:1});
    const ps=((j.query&&j.query.pages)||[]).slice().sort((a,b)=>a.index-b.index);
    page=ps.find(p=>{const t=simp(String(p.title).replace(/\s*\(.*\)\s*$/,'')),txt=(p.description||'')+' '+(p.extract||'');
      return t&&lev(t,nn)<=Math.max(1,Math.floor(nn.length/8))&&WIKI_HINT.test(txt)&&!/may refer to|disambiguation/i.test(txt)});
    if(!page)return[];
  }
  const list=[],toks=nn.split(' ').filter(t=>t.length>=4),lead=page.thumbnail&&page.thumbnail.source?{src:page.thumbnail.source,cap:'WIKIPEDIA'}:null;
  if(lead)list.push(lead);
  try{
    const j2=await jget({action:'query',generator:'images',titles:page.title,gimlimit:40,prop:'imageinfo',iiprop:'url|mime|size|extmetadata',iiurlwidth:900,iiextmetadatafilter:'LicenseShortName'});
    for(const p of((j2.query&&j2.query.pages)||[])){
      const ii=p.imageinfo&&p.imageinfo[0];if(!ii)continue;
      const fn=String(p.title).replace(/^File:/,''),lic=ii.extmetadata&&ii.extmetadata.LicenseShortName&&String(ii.extmetadata.LicenseShortName.value||'').toUpperCase();
      if(page.pageimage&&fn.replace(/ /g,'_')===String(page.pageimage).replace(/ /g,'_')){if(lead&&lic)lead.cap='WIKIPEDIA · '+lic;continue}
      if(!/^image\/(jpeg|png|webp)$/.test(ii.mime||'')||(ii.width||0)<300||(ii.height||0)<300)continue;
      const fs=simp(fn);if(!toks.some(t=>fs.indexOf(t)>=0))continue;   // tên file phải chứa tên người đó
      list.push({src:ii.thumburl||ii.url,cap:'WIKIPEDIA'+(lic?' · '+lic:'')});
      if(list.length>=6)break;
    }
  }catch(_){}
  return list;
}
function listFor(e,m){   // ảnh khai báo > Wikipedia > ảnh chân dung > (rỗng = vẽ sơ đồ node)
  const gal=galOf(m);if(gal.length)return gal;
  const w=WIKI[keyOf(e.n1)];if(w&&w.st==='ok'&&w.list.length)return w.list;
  return m.photo?[{src:m.photo,cap:e.n1}]:[];
}
function wikiStart(e,m,P){   // bắt đầu (1 lần) tìm ảnh Wikipedia; panel P (nếu có) được cập nhật khi có kết quả
  if(m.wiki===false||galOf(m).length)return null;
  const k=keyOf(e.n1);let r=WIKI[k];
  if(r&&r.err&&performance.now()-r.t>30000){delete WIKI[k];r=null}   // lỗi mạng -> thử lại sau 30 giây
  if(!r){
    r=WIKI[k]={st:'load',list:[],w:[],err:false,t:0};const R=r;
    wikiFetch(e,m).then(l=>{R.list=l;R.st=l.length?'ok':'none'}).catch(err=>{R.st='none';R.err=true;R.t=performance.now();console.warn('[PortraitInfo] Wikipedia:',err&&err.message||err)})
      .then(()=>{const w=R.w;R.w=[];for(const p of w){try{if(p.alive&&p.setList)p.setList(listFor(e,m))}catch(_){}}});
  }
  if(P&&r.st==='load'&&r.w.indexOf(P)<0)r.w.push(P);
  return r;
}

// ---------- SƠ ĐỒ ĐỘNG THEO CHỨC VỤ (khi không có ảnh nào) ----------
// Mỗi chức vụ có 1 "cảnh" riêng, vẽ bằng canvas và luôn gắn với Optimum (RLNC, mump2p, DeRAM/DeROM, FLEXNODE, validators...). Chỉ là hình minh họa, không phải số liệu.
// Muốn đổi / thêm chức vụ: sửa bảng SCENES (regex khớp với chức vụ in trên bảng tên, khớp từ trên xuống) rồi thêm 1 hàm cảnh trong SC.
const TAU=Math.PI*2,lerp=(a,b,t)=>a+(b-a)*t,fr=v=>v-Math.floor(v),PAL=['#7ff3ff','#8aff9a','#ffd95e','#ff8fb8','#b79bff','#ff9f5e'];
const SCENES=[   // [id, regex theo chức vụ, tiêu đề, phụ đề]
  ['advisor',/ADVISOR|PROFESSOR/,'RLNC  ·  CODING THEORY','RANDOM LINEAR NETWORK CODING'],
  ['cto',/\bCTO\b|ENGINEER|DEVELOPER/,'mump2p  ·  PROPAGATION','ILLUSTRATION  ·  NOT A BENCHMARK'],
  ['tpm',/\bTPM\b|PROGRAM/,'DELIVERY  ·  PIPELINE','FROM SPEC TO SHIP'],
  ['tcsm',/TCSM|CUSTOMER|SUCCESS/,'INTEGRATION  ·  SUPPORT','PARTNERS BUILDING ON OPTIMUM'],
  ['cmo',/\bCMO\b|MARKETING|BRAND/,'REACH  ·  NARRATIVE','OPTIMUM BROADCAST'],
  ['growth',/GROWTH|APAC/,'APAC  ·  GROWTH MAP','OPTIMUM COMMUNITY HUBS'],
  ['cpo',/PRODUCT/,'PRODUCT  ·  STACK','OPTIMUM LAYERS'],
  ['strategy',/STRATEGY|OPERATIONS|\bOPS\b/,'STRATEGY  ·  OPERATIONS','OPTIMUM ROADMAP TREE'],
  ['mod',/MODERATOR/,'MODERATION  ·  SHIELD','KEEPING OPTIMUM CHAT SAFE'],
  ['community',/COMMUNITY|ADMIN/,'COMMUNITY  ·  HUBS','MEMBERS JOIN OPTIMUM'],
  ['techamb',/AMBASSADOR/,'TECH  ·  ONBOARDING','NEW NODES JOIN OPTIMUM'],
  ['founder',/CEO|FOUNDER|CHIEF/,'OPTIMUM  ·  PRODUCT MAP','FOUNDING VISION']
];
const MESH=['mesh',null,'OPTIMUM  ·  NETWORK MAP','MEMBER OF THE OPTIMUM TEAM'];
const sceneOf=e=>{const t=String(e.n2).toUpperCase();for(const s of SCENES)if(s[1].test(t))return s;return MESH};

function dot(g,x,y,r,c,b){g.save();g.shadowColor=c;g.shadowBlur=b==null?10:b;g.fillStyle=c;g.beginPath();g.arc(x,y,Math.max(.1,r),0,TAU);g.fill();g.restore()}
function seg(g,x1,y1,x2,y2,c,al,lw){g.save();g.globalAlpha*=al==null?.5:al;g.strokeStyle=c;g.lineWidth=lw||1.4;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();g.restore()}
function pulse(g,x1,y1,x2,y2,t,c){const u=fr(t);dot(g,lerp(x1,x2,u),lerp(y1,y2,u),2.3,c||'#ffffff',6)}
function core(E,x,y,r,t){   // nút lõi Optimum: sáng trắng + sóng lan
  const g=E.g,k=fr(E.a*.5);g.save();g.strokeStyle='rgba(190,250,255,'+(.5*(1-k))+')';g.lineWidth=2;g.beginPath();g.arc(x,y,r+k*r*1.6,0,TAU);g.stroke();g.restore();
  dot(g,x,y,r,'#e8ffff',16);
  if(t){g.save();g.fillStyle='#06324a';g.font='bold '+Math.round(r*.95)+'px monospace';g.textAlign='center';g.fillText(t,x,y+r*.33);g.restore()}
}
function lbl(E,s,px,py,mode){   // xếp nhãn tự động quanh 1 điểm (không tràn khỏi vùng vẽ). Nhãn được gõ chữ ở cuối (xem netPaint)
  const wt=s.length*6.6;let al,lx=px,ly=py+4;
  if(mode==='above'){al='center';ly=py-10}else if(mode==='below'){al='center';ly=py+20}
  else if(mode==='L'){al='left';ly=py}else if(mode==='R'){al='right';ly=py}else if(mode==='C'){al='center';ly=py}   // toạ độ gốc, không dịch
  else if(mode==='left'){al='right';lx=px-10}else if(mode==='right'){al='left';lx=px+10}
  else if(px>E.cx){al='left';lx=px+10}else{al='right';lx=px-10}
  if(al==='left'&&lx+wt>E.x+E.bw-4){if(mode==='L'){lx=E.x+E.bw-4-wt}else{al='right';lx=px-10}}
  else if(al==='right'&&lx-wt<E.x+4){if(mode==='R'){lx=E.x+4+wt}else{al='left';lx=px+10}}
  else if(al==='center')lx=clamp(lx,E.x+wt/2+4,E.x+E.bw-wt/2-4);
  E.L.push([s,lx,ly,al]);
}
function mesh(E,n,x0,y0,x1,y1,dmax,p0){   // lưới node ngẫu nhiên (theo tên người) + cạnh; p0: ép vị trí node đầu
  const R=E.R,p=[];for(let i=0;i<n;i++)p.push({x:lerp(x0,x1,R()),y:lerp(y0,y1,R())});if(p0)p[0]=p0;
  const ed=[];for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(Math.hypot(p[i].x-p[j].x,p[i].y-p[j].y)<dmax)ed.push([i,j]);
  return{p,ed};
}

const SC={
  founder(E){const{g,cx,cy,a,dir,bw,bh}=E,rx=bw*.40,ry=bh*.42;   // chòm sao sản phẩm: lõi Optimum + vệ tinh mump2p / DeRAM / FLEXNODE / validators
    g.strokeStyle='rgba(130,238,255,.16)';g.lineWidth=1;for(const k of[.5,.82]){g.beginPath();g.ellipse(cx,cy,rx*k,ry*k,0,0,TAU);g.stroke()}
    for(let i=0;i<14;i++){const t=a*.1*dir+i/14*TAU;dot(g,cx+Math.cos(t)*rx*1.02,cy+Math.sin(t)*ry*1.02,1.8,'rgba(150,235,255,.6)',0)}   // vòng hệ sinh thái
    [['mump2p',.5,.5,0],['DeRAM · DeROM',.5,.5,Math.PI],['FLEXNODE',.82,.3,1.2],['VALIDATORS',.82,.3,4.3]].forEach((s,i)=>{
      const t=s[3]+a*s[2]*dir,px=cx+Math.cos(t)*rx*s[1],py=cy+Math.sin(t)*ry*s[1];
      seg(g,cx,cy,px,py,PAL[i],.5);pulse(g,cx,cy,px,py,a*.5+i*.25);dot(g,px,py,6.5,PAL[i],12);lbl(E,s[0],px,py);
    });
    core(E,cx,cy,15,'O');lbl(E,'OPTIMUM',cx,cy+14,'below');
  },
  cto(E){const{g,x,y,bw,bh,cy,a}=E,rw=bw*.56,N=24,M=mesh(E,N,x+54,y+16,x+rw,y+bh-24,66,{x:x+28,y:cy});   // sóng lan trên mạng P2P + đua tốc độ lan truyền
    const q=fr(a*.38)*1.35,Rw=q*rw;
    const lit=M.p.map(p=>clamp((Rw-Math.hypot(p.x-M.p[0].x,p.y-M.p[0].y))/45,0,1));
    for(const[i,j]of M.ed)seg(g,M.p[i].x,M.p[i].y,M.p[j].x,M.p[j].y,'#7ff3ff',.1+.45*Math.min(lit[i],lit[j]),1.2);
    M.p.forEach((p,i)=>dot(g,p.x,p.y,i?2.6+lit[i]*2:6,lit[i]>0?'hsl(185,95%,'+(52+lit[i]*20)+'%)':'rgba(150,235,255,.35)',lit[i]*9));
    const bx=x+bw*.64,bwid=bw*.33,bars=[[cy-34,'#ffb86b',clamp(q/1.2,0,1)],[cy+14,'#7ff3ff',clamp(q/.75,0,1)]];
    bars.forEach(b=>{g.save();g.strokeStyle='rgba(130,238,255,.6)';g.lineWidth=1.5;g.strokeRect(bx,b[0],bwid,14);g.restore();g.save();g.shadowColor=b[1];g.shadowBlur=8;g.fillStyle=b[1];g.fillRect(bx+2,b[0]+2,(bwid-4)*b[2],10);g.restore()});
    lbl(E,'GOSSIPSUB',bx,cy-40,'L');lbl(E,'mump2p · RLNC',bx,cy+8,'L');lbl(E,'SOURCE',M.p[0].x,M.p[0].y+6,'below');
  },
  tpm(E){const{g,x,y,bw,bh,cy,a}=E,bwd=78,gap=(bw-28-4*bwd)/3,x0=x+14,by=cy-40,hh=46,tot=4*bwd+3*gap,act=[0,0,0,0],tk=[];   // đường ống giao hàng: SPEC → BUILD → TEST → SHIP
    for(let i=0;i<5;i++){const X=x0+fr(a*.17+i*.2)*tot,st=clamp(Math.floor((X-x0)/(bwd+gap)),0,3);act[st]++;tk.push([X,st,i])}
    ['SPEC','BUILD','TEST','SHIP'].forEach((n,i)=>{
      const bx=x0+i*(bwd+gap),c=PAL[i];g.save();g.fillStyle='rgba(8,38,66,.5)';g.fillRect(bx,by,bwd,hh);g.shadowColor=c;g.shadowBlur=act[i]?12:0;g.strokeStyle=c;g.globalAlpha*=.45+Math.min(1,act[i])*.55;g.lineWidth=2;g.strokeRect(bx,by,bwd,hh);g.restore();
      if(i<3)seg(g,bx+bwd+3,by+hh/2,bx+bwd+gap-3,by+hh/2,'#bff8ff',.7,2);lbl(E,n,bx+bwd/2,by-6,'C');
    });
    tk.forEach(t=>dot(g,t[0],by+hh/2+Math.sin(a*3+t[2])*9,4.5,PAL[t[1]],8));
    const ty=by+hh+38,p2=fr(a*.1)*tot;seg(g,x0,ty,x0+tot,ty,'#7ff3ff',.3,2);seg(g,x0,ty,x0+p2,ty,'#8aff9a',.95,3);
    for(let i=1;i<=4;i++){const dx=x0+i*tot/4;g.save();g.translate(dx-(i===4?4:0),ty);g.rotate(Math.PI/4);g.fillStyle=p2>=i*tot/4-2?'#8aff9a':'rgba(150,235,255,.3)';g.fillRect(-4,-4,8,8);g.restore()}
    lbl(E,'ROADMAP PROGRESS',x0,ty+22,'L');
  },
  tcsm(E){const{g,x,y,bw,bh,cx,cy,a}=E,qx=x+bw*.52,nodes=[['CHAINS',-66],['APPS',-22],['VALIDATORS',22],['BUILDERS',66]],q=fr(a*.15);   // đối tác tích hợp vào Optimum + danh sách kiểm tra hỗ trợ
    nodes.forEach((n,i)=>{const px=x+96,py=cy+n[1];seg(g,px,py,qx,cy,PAL[i],.4);pulse(g,px,py,qx,cy,a*.6+i*.25,'#fff');pulse(g,qx,cy,px,py,a*.6+i*.25+.5,PAL[i]);
      g.save();g.shadowColor=PAL[i];g.shadowBlur=8;g.strokeStyle=PAL[i];g.lineWidth=2;g.strokeRect(px-8,py-8,16,16);g.restore();lbl(E,n[0],px-14,py+4,'R')});
    core(E,qx,cy,15,'O');
    ['ONBOARD','INTEGRATE','SUPPORT'].forEach((n,i)=>{const ty=cy-36+i*36,done=q>(i+1)/4,bx=x+bw*.74;
      g.save();g.strokeStyle='rgba(130,238,255,.8)';g.lineWidth=1.5;g.strokeRect(bx,ty-8,16,16);if(done){g.strokeStyle='#8aff9a';g.lineWidth=3;g.beginPath();g.moveTo(bx+3,ty);g.lineTo(bx+7,ty+5);g.lineTo(bx+14,ty-5);g.stroke()}g.restore();lbl(E,n,bx+26,ty+4,'L')});
  },
  advisor(E){const{g,x,y,bw,bh,cy,a}=E,sx=x+46,mx=x+bw*.38,c0=x+bw*.56,sy=[cy-44,cy,cy+44];   // RLNC: gói gốc → trộn tuyến tính ngẫu nhiên → gói mã hóa (đủ K trong N gói là giải mã được)
    sy.forEach((yy,i)=>{seg(g,sx+15,yy,mx,cy,PAL[i],.45);pulse(g,sx+15,yy,mx,cy,a*.6+i*.33,PAL[i]);g.save();g.shadowColor=PAL[i];g.shadowBlur=8;g.fillStyle=PAL[i];g.fillRect(sx-15,yy-13,30,26);g.restore()});
    for(let j=0;j<5;j++){const bx=c0+j*30,top=cy-24;seg(g,mx,cy,bx+11,cy,'#bff8ff',.3);pulse(g,mx,cy,bx,cy,a*.6+j*.2,'#fff');
      const gr=g.createLinearGradient(0,top,0,top+48);gr.addColorStop(0,PAL[j%3]);gr.addColorStop(.5,PAL[(j+1)%3]);gr.addColorStop(1,PAL[(j+2)%3]);
      g.save();g.shadowColor='#7ff3ff';g.shadowBlur=6;g.fillStyle=gr;g.fillRect(bx,top,22,48);g.restore()}
    core(E,mx,cy,14,'+');
    lbl(E,'SOURCE',sx,y+16,'C');lbl(E,'RLNC MIX',mx,cy-22,'C');lbl(E,'CODED PACKETS',c0+60,cy-34,'C');lbl(E,'ANY K OF N CODED PACKETS DECODE',x+bw/2,y+bh-12,'C');
  },
  cmo(E){const{g,x,y,bw,bh,cy,a,R}=E,ex=x+60,ey=cy-8,mr=bw*.8,rr=fr(a*.15)*mr*1.05;   // phát sóng: Optimum phát thông điệp → khán giả sáng lên + biểu đồ reach
    for(let k=0;k<3;k++){const f=fr(a*.35+k/3);g.save();g.strokeStyle='rgba(127,243,255,'+(.55*(1-f))+')';g.lineWidth=2;g.beginPath();g.arc(ex,ey,f*mr,0,TAU);g.stroke();g.restore()}
    for(let i=0;i<34;i++){const px=lerp(x+bw*.36,x+bw-16,R()),py=lerp(y+16,y+bh-62,R()),lit=Math.hypot(px-ex,py-ey)<rr;dot(g,px,py,lit?3.2:2,lit?PAL[i%5]:'rgba(150,235,255,.3)',lit?8:0)}
    core(E,ex,ey,13,'O');
    const sy0=y+bh-12,sh=34,n=24,p=fr(a*.15),pts=[];for(let i=0;i<=n;i++){const u=i/n;pts.push([x+bw*.36+u*(bw*.6),sy0-sh*(u*u*.85+.1*Math.sin(u*9+1.3)*u)])}
    g.save();g.strokeStyle='#8aff9a';g.lineWidth=2;g.beginPath();pts.forEach((q,i)=>{if(i/n<=p){i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1])}});g.stroke();g.restore();
    lbl(E,'OPTIMUM',ex,ey+14,'below');lbl(E,'COMMUNITY REACH',x+bw*.36,y+12,'L');lbl(E,'NARRATIVE GROWTH',x+bw*.36,sy0-sh-6,'L');
  },
  growth(E){const{g,x,y,bw,bh,a}=E,C=[['MUMBAI',.12,.58],['SINGAPORE',.4,.8],['HONG KONG',.58,.5],['SEOUL',.72,.2],['TOKYO',.88,.42],['SYDNEY',.8,.82]],P=C.map(c=>[x+c[1]*bw,y+14+c[2]*(bh-30)]);   // các hub cộng đồng khu vực APAC nối thành mạng
    for(let i=x+8;i<x+bw-4;i+=16)for(let j=y+8;j<y+bh-4;j+=16)dot(g,i,j,.9,'rgba(150,235,255,.12)',0);
    [[0,1],[1,2],[2,3],[3,4],[1,5],[2,4]].forEach((e,i)=>{seg(g,P[e[0]][0],P[e[0]][1],P[e[1]][0],P[e[1]][1],'#7ff3ff',.4);pulse(g,P[e[0]][0],P[e[0]][1],P[e[1]][0],P[e[1]][1],a*.4+i*.17,'#fff')});
    P.forEach((p,i)=>{const f=fr(a*.4+i*.17);g.save();g.strokeStyle=PAL[i%6];g.globalAlpha*=.6*(1-f);g.lineWidth=2;g.beginPath();g.arc(p[0],p[1],4+f*16,0,TAU);g.stroke();g.restore();dot(g,p[0],p[1],5,PAL[i%6],12);lbl(E,C[i][0],p[0],p[1],i===1||i===5?'below':'above')});
  },
  cpo(E){const{g,x,y,bw,bh,cy,a}=E,L=[['APPLICATIONS',3],['FLEXNODE',1],['DeRAM · DeROM',4],['mump2p · RLNC',0]],x0=x+34,lw=bw*.46,lh=30,gp=12,y0=cy-(4*lh+3*gp)/2,p=fr(a*.3),ac=Math.min(3,Math.floor(p*4));   // chồng lớp sản phẩm; gói dữ liệu đi xuyên qua từng lớp
    L.forEach((l,i)=>{const yy=y0+i*(lh+gp),c=PAL[l[1]],on=i===ac;g.save();g.fillStyle='rgba(8,38,66,.55)';g.fillRect(x0,yy,lw,lh);g.shadowColor=c;g.shadowBlur=on?14:0;g.strokeStyle=c;g.globalAlpha*=on?1:.5;g.lineWidth=on?3:1.5;g.strokeRect(x0,yy,lw,lh);g.fillStyle=c;g.globalAlpha*=.25;g.fillRect(x0+3,yy+3,(lw-6)*(on?fr(p*4):(i<ac?1:0)),lh-6);g.restore();lbl(E,l[0],x0+lw+14,yy+lh/2,'L')});
    for(let i=0;i<3;i++)seg(g,x0+lw/2,y0+(i+1)*lh+i*gp,x0+lw/2,y0+(i+1)*(lh+gp),'#bff8ff',.5,1.5);
    dot(g,x0+lw/2+Math.sin(a*4)*10,y0+p*(4*lh+3*gp),4,'#ffffff',10);
  },
  strategy(E){const{g,x,y,bw,bh,cy,a}=E,rx=x+40,mx=x+bw*.38,lx=x+bw*.7,mids=[['PARTNERS',cy-62],['ROADMAP',cy],['OPERATIONS',cy+62]],lv=['MARKETS','GROWTH','GOVERNANCE','ECOSYSTEM','RESOURCES','EXECUTION'];   // cây quyết định chiến lược: gốc Optimum → hướng đi → hạng mục
    mids.forEach((m,i)=>{seg(g,rx,cy,mx,m[1],PAL[i],.5,1.8);pulse(g,rx,cy,mx,m[1],a*.4+i*.2);for(let k=0;k<2;k++){const j=i*2+k,ly=lerp(y+22,y+bh-22,j/5);seg(g,mx,m[1],lx,ly,PAL[i],.4);pulse(g,mx,m[1],lx,ly,a*.5+j*.13);dot(g,lx,ly,4,PAL[i],8);lbl(E,lv[j],lx+10,ly,'L')}});
    mids.forEach((m,i)=>{dot(g,mx,m[1],7,PAL[i],12);lbl(E,m[0],mx,m[1]-6,'C')});
    core(E,rx,cy,14,'O');lbl(E,'OPTIMUM',rx,cy+14,'below');
  },
  mod(E){const{g,x,y,bw,bh,cx,cy,a,R}=E,sx=x+bw*.5,hits=[];   // khiên kiểm duyệt: tin xấu bị chặn, tin tốt đi qua tới khu chat an toàn
    for(let i=0;i<9;i++){const t=fr(a*.3+i*.113),my=y+22+((i*37)%(bh-72)),mx=x+10+t*(bw-60),bad=i%3===1;
      if(bad){if(mx>sx-12){hits.push(1-clamp((mx-(sx-12))/30,0,1));if(mx-(sx-12)<30){dot(g,sx-12,my,3+((mx-sx+12)/30)*10,'#ff6b6b',12)}continue}}
      g.save();g.fillStyle=bad?'#ff6b6b':'#8aff9a';g.globalAlpha*=.85;g.fillRect(mx-11,my-5,22,10);g.fillStyle='rgba(8,38,66,.9)';g.fillRect(mx-8,my-1,14,2);g.restore()}
    const glow=hits.length?Math.max(...hits):0;g.save();g.translate(sx,cy-4);g.shadowColor='#7ff3ff';g.shadowBlur=10+glow*16;g.fillStyle='rgba(8,38,66,.7)';g.strokeStyle='#7ff3ff';g.lineWidth=3;
    g.beginPath();g.moveTo(0,-30);g.lineTo(24,-20);g.lineTo(22,8);g.quadraticCurveTo(14,26,0,32);g.quadraticCurveTo(-14,26,-22,8);g.lineTo(-24,-20);g.closePath();g.fill();g.stroke();
    g.strokeStyle='#8aff9a';g.lineWidth=4;g.beginPath();g.moveTo(-9,2);g.lineTo(-2,10);g.lineTo(11,-8);g.stroke();g.restore();
    for(let i=0;i<9;i++){const t=a*.2*(i%2?1:-1)+i;dot(g,x+bw-52+Math.cos(t)*22,cy+Math.sin(t*1.3)*30,2.8,PAL[i%5],6)}
    lbl(E,'INCOMING',x+10,y+bh-10,'L');lbl(E,'MODERATION',sx,cy+44,'C');lbl(E,'SAFE CHAT',x+bw-52,y+16,'C');
  },
  community(E){const{g,cx,cy,a,dir,bw,bh}=E,H=[['SUPPORT',-1,-1],['EVENTS',1,-1],['CHAT',-1,1],['GOVERNANCE',1,1]];   // 4 kênh cộng đồng, thành viên quay quanh + thành viên mới bay vào
    H.forEach((h,i)=>{const hx=cx+h[1]*bw*.27,hy=cy+h[2]*bh*.27;seg(g,cx,cy,hx,hy,PAL[i],.45);pulse(g,cx,cy,hx,hy,a*.5+i*.25);
      for(let k=0;k<7;k++){const t=a*.6*dir+k/7*TAU+i;dot(g,hx+Math.cos(t)*24,hy+Math.sin(t)*17,2.4,PAL[i],5)}
      const f=fr(a*.3+i*.21),sx=hx+h[1]*bw*.22,sy=hy+h[2]*bh*.3;dot(g,lerp(sx,hx,f),lerp(sy,hy,f),3,'#ffffff',8);
      dot(g,hx,hy,7,PAL[i],12);lbl(E,h[0],hx,hy+(h[2]<0?-20:28),'C')});
    core(E,cx,cy,13,'O');lbl(E,'COMMUNITY',cx,cy+14,'below');
  },
  techamb(E){const{g,x,y,bw,bh,cy,a,R}=E,tx0=x+14,tw=bw*.42,ty0=y+12,th=bh-24,rows=9,pr=fr(a*.12)*(rows+1);   // cửa sổ hướng dẫn + node mới tham gia mạng
    g.save();g.fillStyle='rgba(8,38,66,.6)';g.fillRect(tx0,ty0,tw,th);g.strokeStyle='rgba(130,238,255,.8)';g.lineWidth=1.5;g.strokeRect(tx0,ty0,tw,th);g.restore();
    for(let i=0;i<3;i++)dot(g,tx0+12+i*12,ty0+11,3,PAL[[3,2,1][i]],0);
    for(let r=0;r<rows;r++){const ly=ty0+38+r*(th-50)/rows,sh=clamp(pr-r,0,1),ind=(r%3)*12;let cxp=tx0+12+ind;
      for(let s=0;s<3;s++){const wd=10+R()*34,c=PAL[(r+s)%5];g.save();g.fillStyle=c;g.globalAlpha*=.8;g.fillRect(cxp,ly,Math.min(wd,Math.max(0,(tw-24-ind)*0+wd))*clamp(sh*3-s,0,1),5);g.restore();cxp+=wd+6}}
    if(((a*2)|0)%2===0){const cr=Math.min(rows-1,Math.floor(pr));g.save();g.fillStyle='#d8ffff';g.fillRect(tx0+12+(cr%3)*12+40,ty0+36+cr*(th-50)/rows-2,6,9);g.restore()}
    const ncx=x+bw*.74,m=Math.floor(fr(a*.1)*13),pts=[];for(let i=0;i<12;i++){const t=i/12*TAU+.4,rr=44+(i%3)*14;pts.push([ncx+Math.cos(t)*rr*1.25,cy+Math.sin(t)*rr*.9])}
    for(let i=0;i<Math.min(m,12);i++){const age=clamp((fr(a*.1)*13-i),0,1);seg(g,ncx,cy,lerp(ncx,pts[i][0],age),lerp(cy,pts[i][1],age),PAL[i%5],.5);dot(g,lerp(ncx,pts[i][0],age),lerp(cy,pts[i][1],age),3.2*age,PAL[i%5],8)}
    core(E,ncx,cy,13,'O');
    lbl(E,'NODE SETUP GUIDE',tx0+40,ty0+15,'L');lbl(E,'NEW NODES JOINING',x+bw*.5+10,y+18,'L');lbl(E,'TESTNET',ncx,cy+14,'below');
  },
  mesh(E){const{g,x,y,bw,bh,a}=E,M=mesh(E,20,x+24,y+20,x+bw-24,y+bh-24,96);   // mạng Optimum tổng quát (thành viên nhóm chung)
    for(const[i,j]of M.ed)seg(g,M.p[i].x,M.p[i].y,M.p[j].x,M.p[j].y,'#7ff3ff',.25,1.2);
    M.ed.forEach((e,k)=>{if(k%3===0)pulse(g,M.p[e[0]].x,M.p[e[0]].y,M.p[e[1]].x,M.p[e[1]].y,a*.45+k*.137)});
    M.p.forEach((p,i)=>dot(g,p.x,p.y,i%6===0?5:2.8,PAL[i%5],i%6===0?12:5));
    lbl(E,'OPTIMUM NETWORK',M.p[0].x,M.p[0].y,'above');lbl(E,'mump2p · RLNC',M.p[6].x,M.p[6].y,'above');lbl(E,'VALIDATORS',M.p[12].x,M.p[12].y,'below');
  }
};
function netPaint(g,w,h,P,e,x,y,bw,bh){
  const sc=sceneOf(e);head(g,P,sc[2],P.wikiLoading?'SCANNING WIKIPEDIA...':sc[3]);
  const R=seedRnd(e.n1),E={g,P,x,y,bw,bh,cx:x+bw/2,cy:y+bh/2-2,a:P.at||0,vis:P.frac,R,L:[],hue0:0,dir:1};
  E.hue0=R()*360;E.dir=R()<.5?-1:1;
  g.save();g.shadowBlur=0;g.fillStyle='rgba(8,38,66,.45)';g.fillRect(x,y,bw,bh);g.strokeStyle='rgba(130,238,255,.5)';g.lineWidth=1.5;g.strokeRect(x,y,bw,bh);
  g.beginPath();g.rect(x,y,bw,bh);g.clip();g.globalAlpha=clamp(E.vis*2.5,0,1);
  try{SC[sc[0]](E)}catch(err){console.warn('[PortraitInfo] lỗi vẽ cảnh '+sc[0]+':',err)}
  g.restore();
  g.font='11px monospace';g.fillStyle='#bff8ff';   // nhãn: gõ chữ theo thứ tự (luôn gọi đủ để tổng ký tự không đổi)
  for(const l of E.L){g.textAlign=l[3];tx(g,P,l[0],l[1],l[2])}
  g.textAlign='left';
  const cap=groupOf(e.n2)+'  ·  '+String(e.n2).toUpperCase();g.fillStyle='#8aff9a';g.font='bold '+fit1(g,cap,bw-24,15,true)+'px monospace';tx(g,P,cap,x,h-18);
}

// ---------- vẽ canvas theo phong cách bảng điện tử ----------
function frame(g,w,h){
  g.fillStyle='rgba(8,38,66,.38)';g.fillRect(0,0,w,h);
  g.strokeStyle='rgba(130,238,255,.95)';g.lineWidth=3;g.strokeRect(5,5,w-10,h-10);
  g.lineWidth=6;for(const[x,y,dx,dy]of[[5,5,1,1],[w-5,5,-1,1],[5,h-5,1,-1],[w-5,h-5,-1,-1]]){g.beginPath();g.moveTo(x+dx*26,y);g.lineTo(x,y);g.lineTo(x,y+dy*26);g.stroke()}
  g.fillStyle='rgba(150,235,255,.05)';for(let y=10;y<h-8;y+=6)g.fillRect(8,y,w-16,2);   // vân quét ngang mờ
  g.shadowColor='#5ff';g.shadowBlur=9;g.textAlign='left';
}
// tx: vẽ chuỗi theo kiểu "gõ chữ". Mỗi ô có ngân sách ký tự P.left (tăng dần theo thời gian); chuỗi nào hết ngân sách thì dừng giữa chừng + con trỏ nhấp nháy.
// Các chuỗi được vẽ theo thứ tự gọi -> chữ xổ theo thứ tự đọc (tiêu đề, rồi nội dung từ trên xuống).
function tx(g,P,str,x,y){
  str=String(str);P.T+=str.length;
  const k=Math.max(0,Math.min(str.length,P.left));P.left-=k;
  const al=g.textAlign,full=g.measureText(str).width;
  const x0=al==='right'?x-full:al==='center'?x-full/2:x;
  g.textAlign='left';
  if(k>0)g.fillText(k<str.length?str.slice(0,k):str,x0,y);
  if(!P.cur&&k<str.length){const px=+((/(\d+)px/.exec(g.font)||[0,14])[1]);P.cur={x:x0+(k>0?g.measureText(str.slice(0,k)).width:0)+1,y,h:px}}
  g.textAlign=al;
}
function head(g,P,t,sub){g.font='bold 20px monospace';g.fillStyle='#bff8ff';tx(g,P,t,24,40);if(sub){g.font='13px monospace';g.fillStyle='rgba(150,235,255,.85)';tx(g,P,sub,24,60)}}
function wrap(g,text,maxW){const out=[];for(const para of String(text).split('\n')){let line='';for(const wd of para.split(/\s+/)){const t=line?line+' '+wd:wd;if(g.measureText(t).width>maxW&&line){out.push(line);line=wd}else line=t}out.push(line)}return out}
function fitLines(g,txt,maxW,maxL,px,min,bold){   // chọn cỡ chữ lớn nhất để txt vừa trong maxL dòng
  for(let p=px;p>=min;p--){g.font=(bold?'bold ':'')+p+'px monospace';const L=wrap(g,txt,maxW);if(L.length<=maxL&&L.every(s=>g.measureText(s).width<=maxW))return{L,p}}
  g.font=(bold?'bold ':'')+min+'px monospace';return{L:wrap(g,txt,maxW).slice(0,maxL),p:min};
}
function fit1(g,str,maxW,px,bold){let p=px;for(;p>9;p--){g.font=(bold?'bold ':'')+p+'px monospace';if(g.measureText(str).width<=maxW)break}return p}
function imgBox(g,r,x,y,w,h,bias,P){   // vẽ ảnh thật (hoặc trạng thái đang tải / lỗi) trong khung có viền + vân quét
  g.save();g.shadowBlur=0;g.fillStyle='rgba(8,38,66,.6)';g.fillRect(x,y,w,h);
  if(r.st==='ok'){g.globalAlpha=.97;cover(g,r.im,x,y,w,h,bias);g.globalAlpha=1;g.fillStyle='rgba(120,230,255,.07)';g.fillRect(x,y,w,h)}
  else{g.fillStyle='rgba(150,235,255,.85)';g.font='13px monospace';g.textAlign='center';g.fillText(r.st==='load'?'LOADING...':'NO IMAGE',x+w/2,y+h/2+4)}
  g.fillStyle='rgba(8,38,66,.16)';for(let yy=y+1;yy<y+h;yy+=4)g.fillRect(x,yy,w,1.5);
  g.strokeStyle='rgba(130,238,255,.95)';g.lineWidth=2;g.strokeRect(x,y,w,h);g.restore();
}

// ----- ô 1: thẻ tên + ảnh chân dung thật -----
const idPaint=(e,m)=>(g,w,h,P)=>{
  frame(g,w,h);head(g,P,'OPTIMUM  ·  PROFILE','VERIFIED MEMBER');
  g.font='13px monospace';g.fillStyle='rgba(150,235,255,.9)';g.textAlign='right';tx(g,P,'ID  0x'+hash(e.n1).toString(16).toUpperCase().padStart(8,'0'),w-24,40);g.textAlign='left';
  let X0=24;
  if(m.photo){imgBox(g,getImg(m.photo,P),24,78,124,160,.2,P);X0=164}
  const tw=w-24-X0;
  const nm=fitLines(g,e.n1,tw,2,32,16,true);g.fillStyle='#ffffff';let y=116;
  nm.L.forEach(s=>{g.font='bold '+nm.p+'px monospace';tx(g,P,s,X0,y);y+=nm.p+5});
  const ti=fitLines(g,e.n2,tw,2,19,11,true);g.fillStyle='#ffd95e';y+=4;
  ti.L.forEach(s=>{g.font='bold '+ti.p+'px monospace';tx(g,P,s,X0,y);y+=ti.p+4});
  const gp=groupOf(e.n2);g.fillStyle='#8aff9a';g.font='bold '+fit1(g,gp,tw,14,true)+'px monospace';tx(g,P,gp,X0,Math.min(y+8,236));
  const R=seedRnd(e.n1),xmax=24+(w-48)*P.frac;let x=24;   // mã vạch chạy ra dần theo tiến độ gõ
  while(x<xmax){const bw=2+Math.floor(R()*4);g.fillStyle='hsla(190,90%,'+(60+R()*15)+'%,.9)';g.fillRect(x,258,Math.min(bw,xmax-x),38);x+=bw+2+Math.floor(R()*4)}
};

// ----- ô 2: tiểu sử (guide-bot.js) -----
const bioPaint=(e)=>(g,w,h,P)=>{
  frame(g,w,h);head(g,P,'BIO','');
  const lg=typeof L!=='undefined'?L:'vi',GB=window.GuideBot;
  let gb='';try{gb=GB&&GB.bio?GB.bio(e,lg):''}catch(_){}   // tiểu sử dùng chung với bot hướng dẫn (guide-bot.js: vi / en / ko, ngôn ngữ khác dùng en)
  const bio=(window.PortraitBio&&window.PortraitBio[e.n1])||gb||('MEMBER OF THE OPTIMUM PROJECT.\n\n'+e.n1+' - '+e.n2+'.\n\nX.COM/GET_OPTIMUM');
  g.font='17px monospace';g.fillStyle='#bff8ff';
  const LN=wrap(g,bio,w-48),max=Math.floor((h-96)/23);
  for(let i=0;i<Math.min(LN.length,max);i++){let s=LN[i];if(i===max-1&&LN.length>max)s=s.replace(/.{0,2}$/,'..');tx(g,P,s,24,86+i*23)}
};

// ----- ô 3: ảnh (khai báo / Wikipedia, tự chuyển ảnh) hoặc sơ đồ node nếu không có ảnh -----
const photoPaint=(e,m)=>(g,w,h,P)=>{
  frame(g,w,h);
  const list=P.list||[],n=list.length,x=16,y=70,bw=w-32,bh=h-70-46;
  if(!n){netPaint(g,w,h,P,e,x,y,bw,bh);return}
  head(g,P,'PRESS  ·  EVENTS',((P.idx||0)+1)+' / '+n);
  const it=list[(P.idx||0)%n];imgBox(g,getImg(it.src,P),x,y,bw,bh,.35,P);
  if(it.cap){g.fillStyle='#bff8ff';g.font='bold '+fit1(g,it.cap,bw-70,16,true)+'px monospace';tx(g,P,it.cap,x,h-18)}
  for(let i=0;i<n&&n>1;i++){g.fillStyle=i===(P.idx||0)?'#6ff0ff':'rgba(150,235,255,.3)';g.fillRect(w-24-(n-i)*16,h-26,10,10)}   // chấm chỉ ảnh đang xem
};

// ----- ô 4: liên kết (ngắm + click trái để mở) -----
const linksPaint=(e,m,rows)=>(g,w,h,P)=>{
  frame(g,w,h);head(g,P,'LINKS','AIM + LEFT CLICK TO OPEN');
  const personal=rows.length>1;let y=personal?76:112;
  if(!personal){g.fillStyle='rgba(150,235,255,.55)';g.font='14px monospace';tx(g,P,'NO PERSONAL LINKS ADDED YET',24,y-14)}
  P.rows=[];
  rows.forEach((r,i)=>{
    const rx=20,rw=w-40,rh=50,hov=P.hover===i;
    g.save();g.shadowBlur=hov?14:0;g.fillStyle=hov?'rgba(95,255,255,.28)':'rgba(8,38,66,.4)';g.fillRect(rx,y,rw,rh);
    g.strokeStyle=hov?'#d8ffff':'rgba(130,238,255,.7)';g.lineWidth=hov?3:1.5;g.strokeRect(rx,y,rw,rh);g.restore();
    g.fillStyle='rgba(130,238,255,.22)';g.fillRect(rx+5,y+5,40,40);g.strokeStyle='rgba(130,238,255,.9)';g.lineWidth=1.5;g.strokeRect(rx+5,y+5,40,40);
    g.fillStyle='#ffffff';g.font='bold 20px monospace';g.textAlign='center';tx(g,P,r.k,rx+25,y+32);g.textAlign='left';
    g.fillStyle='#8aff9a';g.font='bold 16px monospace';tx(g,P,r.lab,rx+58,y+22);
    const u=cleanUrl(r.url);g.fillStyle='#bff8ff';g.font=fit1(g,u,rw-58-34,13)+'px monospace';tx(g,P,u,rx+58,y+41);
    g.fillStyle=hov?'#ffffff':'rgba(150,235,255,.6)';g.font='bold 22px monospace';g.textAlign='right';g.fillText('\u25B8',rx+rw-12,y+32);g.textAlign='left';
    P.rows.push({x:rx,y,w:rw,h:rh,url:r.url,lab:r.lab});y+=58;
  });
};

// ---------- tạo panel (canvas + texture + hàm vẽ lại) ----------
function makePanel(w,h,paint,init){
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;const g=cv.getContext('2d');
  const tex=new THREE.CanvasTexture(cv);tex.minFilter=THREE.LinearFilter;tex.generateMipmaps=false;
  const P={cv,g,w,h,tex,alive:true,idx:0,hover:-1,rows:[],tick:null,
    n:1e9,T:0,Tp:0,left:0,cur:null,frac:1,shown:0,td:1,done:false};   // n: số ký tự đã "gõ" · Tp: tổng ký tự của ô · td: giây gõ xong ô này
  P.draw=()=>{
    g.clearRect(0,0,w,h);g.save();P.T=0;P.left=P.n;P.cur=null;P.frac=P.Tp?clamp(P.n/P.Tp,0,1):1;
    try{paint(g,w,h,P)}catch(err){console.warn('[PortraitInfo] lỗi vẽ ô:',err)}
    g.restore();P.Tp=P.T;
    if(P.cur&&!P.done&&((performance.now()/220)|0)%2===0){g.save();g.shadowColor='#5ff';g.shadowBlur=8;g.fillStyle='#d8ffff';g.fillRect(P.cur.x,P.cur.y-P.cur.h*.82,Math.max(5,P.cur.h*.55),P.cur.h*.95);g.restore()}   // con trỏ gõ chữ
    tex.needsUpdate=true;
  };
  P.type=t=>{   // t = giây kể từ lúc bắt đầu gõ; trả số ký tự vừa xổ thêm (để phát tiếng pip)
    if(P.done)return 0;
    if(t>=P.td){const d=P.Tp-P.shown;P.shown=P.Tp;P.done=true;P.n=1e9;P.draw();return d}
    const want=t<=0?0:Math.min(P.Tp,Math.floor(t/P.td*P.Tp));
    if(want!==P.n||P.cur){const d=want-P.shown;P.shown=want;P.n=want;P.draw();return d>0?d:0}   // vẽ lại khi có chữ mới / để con trỏ nhấp nháy
    return 0;
  };
  if(init)init(P);
  P.draw();                                                  // lượt 1: đo tổng số ký tự
  P.td=clamp(P.Tp/TYPE_CPS,TYPE_MIN,TYPE_MAX);P.n=0;P.draw();   // lượt 2: bắt đầu trống rồi gõ dần
  return P;
}

// ---------- trạng thái ----------
let act=null;   // {grp,panels:[{m,P,fx,fy,fz,s,i}],links:P|null,linkMesh,t0,e}
function guides(){const G=window.PavilionGuide;return G&&G.easels?G.easels:[]}
function camFwd(){return{x:-Math.sin(yaw),z:-Math.cos(yaw)}}
function pick(){   // tranh gần nhất đang nhìn thẳng vào (từ phía mặt tranh), hoặc null
  if(!window.PavilionGuide||curFl!==0)return null;
  const f=camFwd();let best=null,bs=-1;
  for(const e of guides()){
    const dx=e.x-P.x,dz=e.z-P.z,d=Math.hypot(dx,dz);if(d>RANGE||d<.4)continue;
    if((P.x-e.x)*e.fx+(P.z-e.z)*e.fz<d*.25)continue;           // phải đứng phía trước mặt tranh
    const c=(dx*f.x+dz*f.z)/d;if(c<COSV||Math.abs(pitch)>.7)continue;
    const sc=c-d*.02;if(sc>bs){bs=sc;best=e}
  }
  return best;
}
function dispose(){
  if(!act)return;
  S.remove(act.grp);for(const p of act.panels){p.P.alive=false;p.m.geometry.dispose();p.m.material.dispose();p.P.tex.dispose()}
  act=null;
}
function warm(e){const m=mediaOf(e);wikiStart(e,m,null);if(m.photo)getImg(m.photo,null);for(const it of galOf(m))getImg(it.src,null)}   // nạp trước ảnh khi bắt đầu nhìn tranh -> bấm E là có ngay
function open(e){
  dispose();
  const K=e.s,s=clamp(K,.9,1.3),yc=e.y,a=Math.atan2(e.fx,e.fz),grp=new THREE.Group();
  const m=mediaOf(e),wr=wikiStart(e,m,null),list0=listFor(e,m),wl=!!(wr&&wr.st==='load'&&!list0.length),vk=keyOf(e.n1),off=(VIS[vk]=(VIS[vk]||0)+1)-1;   // off: mỗi lần bấm E ảnh bắt đầu từ tấm kế tiếp
  const rows=[];
  if(okUrl(m.x))rows.push({k:'X',lab:'X',url:m.x});
  if(okUrl(m.linkedin))rows.push({k:'in',lab:'LINKEDIN',url:m.linkedin});
  if(okUrl(m.web))rows.push({k:'www',lab:'WEBSITE',url:m.web});
  rows.push({k:'O',lab:'OPTIMUM',url:OPT_URL});
  grp.position.set(e.x,0,e.z);grp.rotation.y=a;
  const gap=K/2+.14,Z=.34;
  const defs=[   // [paint, px rộng, px cao, rộng m, cao m, bên (-1 trái / +1 phải), độ cao so với tâm tranh, loại]
    [idPaint(e,m),512,320,1.3*s,.81*s,-1,+.50*s,'id'],
    [bioPaint(e),384,448,.98*s,1.14*s,-1,-.50*s,'bio'],
    [photoPaint(e,m),512,320,1.5*s,.94*s,+1,+.55*s,'photo'],
    [linksPaint(e,m,rows),512,320,1.3*s,.81*s,+1,-.48*s,'links']
  ];
  const panels=[];let links=null,linkMesh=null;
  defs.forEach((d,i)=>{
    const P=makePanel(d[1],d[2],d[0],d[7]==='photo'?(Q=>{Q.off=off;Q.list=list0;Q.idx=list0.length?off%list0.length:0;Q.wikiLoading=wl}):null);
    if(d[7]==='photo'){
      P.setList=l=>{P.list=l;P.wikiLoading=false;P.idx=l.length?P.off%l.length:0;P.draw()};   // gọi khi Wikipedia trả kết quả
      P.tick=t=>{
        const n=(P.list||[]).length;
        if(!n){P.at=t;P.draw();return}                                  // sơ đồ node: vẽ lại mỗi khung hình để chuyển động
        if(n>1){const k=(P.off+Math.floor(t/GAL_T))%n;if(k!==P.idx){P.idx=k;P.draw()}}   // lâu lâu đổi ảnh
      };
      wikiStart(e,m,P);
    }
    const mat=new THREE.MeshBasicMaterial({map:P.tex,transparent:true,side:THREE.DoubleSide,depthWrite:false,opacity:0,fog:false});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(d[3],d[4]),mat);
    const fx=d[5]*(gap+d[3]/2),fy=yc+d[6];
    mesh.position.set(0,yc,Z);mesh.rotation.y=-d[5]*.32;mesh.scale.set(.01,.01,1);mesh.renderOrder=5;   // xoay hơi hướng vào người xem
    grp.add(mesh);panels.push({m:mesh,P,fx,fy,fz:Z,i,s});
    if(d[7]==='links'){links=P;linkMesh=mesh}
  });
  S.add(grp);act={grp,panels,links,linkMesh,t0:performance.now()/1000,e};
  try{if(typeof snd==='function'){snd(880,.07,'sine');setTimeout(()=>snd(1320,.06,'sine'),70)}}catch(_){}
}
const holdingFruit=()=>{try{return !!(window.FruitEat&&FruitEat.held&&FruitEat.held())}catch(_){return false}};   // đang cầm trái cây: E thuộc về fruit-eat.js (cất trái)
function toggle(){
  if(act){dispose();return}
  if(!playing||dead||holdingFruit())return;
  const e=pick();if(e)open(e);
}

// ---------- ngắm vào dòng liên kết ----------
const RC=new THREE.Raycaster(),V0=new THREE.Vector2(0,0);
function setHover(Lk,idx){if(Lk.hover!==idx){Lk.hover=idx;Lk.draw()}}
function aimLinks(){
  if(!act||!act.links)return;
  const Lk=act.links,mesh=act.linkMesh;
  if(mesh.material.opacity<.6){setHover(Lk,-1);return}
  act.grp.updateMatrixWorld(true);RC.setFromCamera(V0,C);
  const hit=RC.intersectObject(mesh,false)[0];let idx=-1;
  if(hit&&hit.uv&&hit.distance<RANGE+2){const px=hit.uv.x*Lk.w,py=(1-hit.uv.y)*Lk.h;idx=Lk.rows.findIndex(r=>px>=r.x&&px<=r.x+r.w&&py>=r.y&&py<=r.y+r.h)}
  setHover(Lk,idx);
}
addEventListener('mousedown',ev=>{   // capture: chạy trước handler bắn súng -> click vào dòng link thì mở link, không bắn
  if(!act||ev.button!==0||!playing||!act.links)return;
  const Lk=act.links;if(Lk.hover<0)return;
  const r=Lk.rows[Lk.hover];if(!r||!okUrl(r.url))return;
  ev.preventDefault();ev.stopImmediatePropagation();
  try{if(document.exitPointerLock)document.exitPointerLock()}catch(_){}
  try{window.open(r.url,'_blank','noopener,noreferrer')}catch(_){}
},true);

// ---------- gợi ý ----------
const tip=document.createElement('div');
tip.style.cssText='position:fixed;left:50%;bottom:24%;transform:translateX(-50%);display:none;z-index:20;padding:8px 16px;border:1px solid rgba(130,238,255,.9);border-radius:6px;'+
  'background:rgba(8,38,66,.55);color:#bff8ff;font:bold 15px monospace;letter-spacing:.5px;text-shadow:0 0 8px #5ff;cursor:pointer;user-select:none;-webkit-user-select:none';
tip.addEventListener('pointerdown',ev=>{ev.preventDefault();ev.stopPropagation();toggle()});
document.body.appendChild(tip);
let tipKey='';
function setTip(txt){if(txt===tipKey)return;tipKey=txt;if(txt){tip.textContent=txt;tip.style.display='block'}else tip.style.display='none'}

addEventListener('keydown',ev=>{
  if(ev.code!=='KeyE'||ev.repeat||ev.defaultPrevented)return;   // fruit-eat.js (capture) đã nhận E -> không mở tranh
  const t=ev.target&&ev.target.tagName;if(t==='INPUT'||t==='TEXTAREA')return;
  toggle();
});

// ---------- vòng lặp hiệu ứng ----------
let warmed=null,lastBeep=0,bp=0;
function beep(fin){   // pip pip pip: mỗi tiếng rất ngắn, xen kẽ 2 cao độ nhẹ; tiếng cuối cao hơn báo gõ xong
  try{if(typeof snd==='function'){if(fin)snd(BEEP_F*1.6,.07,'triangle');else snd(BEEP_F+((bp++)%2)*260+Math.random()*50,.028,'triangle')}}catch(_){}
}
(function loop(){
  requestAnimationFrame(loop);
  const t1=performance.now()/1000;
  if(act){
    const t=t1-act.t0;
    const tEnd=act.tDone==null?1e9:act.tDone+DUR;   // bắt đầu mờ sau khi mọi ô gõ xong + DUR giây
    if(t>tEnd+FADE||dead||curFl!==0||Math.hypot(P.x-act.e.x,P.z-act.e.z)>RANGE+3){dispose()}
    else{
      const fo=1-clamp((t-tEnd)/FADE,0,1);
      let ch=0,all=true;
      for(const p of act.panels){ch+=p.P.type(t-TYPE_AT);if(!p.P.done)all=false}
      if(all&&act.tDone==null){act.tDone=t;beep(true)}
      else if(ch>0&&t1-lastBeep>BEEP_GAP){lastBeep=t1;beep()}
      for(const p of act.panels){
        const k=clamp(t/POP,0,1),e=ease(k),m=p.m;   // cả 4 ô bung CÙNG LÚC
        m.position.x=p.fx*e;m.position.y=act.e.y+(p.fy-act.e.y)*e+Math.sin(t1*1.1+p.i*1.7)*.03*p.s;m.position.z=p.fz;
        const sc=Math.max(.01,e);m.scale.set(sc,sc,1);
        m.material.opacity=.96*Math.min(1,k*2)*fo*(.94+.06*Math.sin(t1*9+p.i*2.3));   // nhấp nháy rất nhẹ như màn hình điện tử
        if(p.P.tick&&t>.3)p.P.tick(t-.3);
      }
      if(fo>.9)aimLinks();else if(act.links)setHover(act.links,-1);
    }
  }
  if(!playing||dead||(!act&&holdingFruit())){setTip('');return}
  if(act){const hv=act.links&&act.links.hover>=0?act.links.rows[act.links.hover]:null;setTip(hv?'CLICK \u25B8 '+hv.lab:'[E]  \u2715');return}
  const e=pick();if(e&&e!==warmed){warmed=e;warm(e)}if(!e)warmed=null;
  setTip(e?'[E]  '+e.n1:'');
})();

window.PortraitInfo={open,close:dispose,pick};
})();
