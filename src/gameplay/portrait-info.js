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

// ---------- SƠ ĐỒ NODE (khi không có ảnh nào) ----------
const ROLE_NODES=[
  [/ADVISOR/,['RESEARCH','THEORY','STRATEGY','PEER REVIEW','MENTORING','STANDARDS']],
  [/CTO|ENGINEER|TPM|TCSM|DEVELOPER|CHIEF TECH/,['RLNC CORE','P2P LAYER','NODES','BENCHMARKS','CLIENTS','TESTNET']],
  [/CMO|MARKETING|BRAND/,['BRAND','CONTENT','GROWTH','MEDIA','PARTNERS','EVENTS']],
  [/MODERATOR|COMMUNITY|AMBASSADOR/,['COMMUNITY','SOCIAL','EVENTS','SUPPORT','EDUCATION','GOVERNANCE']],
  [/CEO|CO[- ]?FOUNDER|FOUNDER|CHIEF/,['VISION','PROTOCOL','PARTNERS','FUNDING','ECOSYSTEM','GOVERNANCE']]
];
const roleNodes=e=>{const t=String(e.n2).toUpperCase();for(const[re,l]of ROLE_NODES)if(re.test(t))return l;return['RLNC','NODES','NETWORK','COMMUNITY','PROTOCOL','ECOSYSTEM']};
function netPaint(g,w,h,P,e,x,y,bw,bh){
  const TAU=Math.PI*2,role=roleNodes(e),N=role.length,cx=x+bw/2,cy=y+bh/2-4,rx=Math.min(128,bw/2-92),ry=bh/2-26,a=P.at||0,R=seedRnd(e.n1),vis=P.frac,hue0=R()*360,dir=R()<.5?-1:1;
  head(g,P,'NETWORK  ·  ROLE MAP',P.wikiLoading?'SCANNING WIKIPEDIA...':'NO PUBLIC PHOTOS  ·  OPTIMUM NODE MAP');
  g.save();g.shadowBlur=0;g.fillStyle='rgba(8,38,66,.45)';g.fillRect(x,y,bw,bh);g.strokeStyle='rgba(130,238,255,.5)';g.lineWidth=1.5;g.strokeRect(x,y,bw,bh);
  g.beginPath();g.rect(x,y,bw,bh);g.clip();
  g.strokeStyle='rgba(130,238,255,.16)';g.lineWidth=1;for(const k of[1,.45]){g.beginPath();g.ellipse(cx,cy,rx*k,ry*k,0,0,TAU);g.stroke()}
  const M=12;   // vòng node nhỏ bên trong, quay chậm
  for(let i=0;i<M;i++){
    const t=a*.32*dir+i/M*TAU,px=cx+Math.cos(t)*rx*.45,py=cy+Math.sin(t)*ry*.45,pv=clamp(vis*M*1.3-i,0,1);if(pv<=0)continue;
    g.strokeStyle='rgba(150,235,255,.22)';g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+(px-cx)*pv,cy+(py-cy)*pv);g.stroke();
    g.fillStyle='hsl('+((hue0+i*30)%360)+',85%,68%)';g.beginPath();g.arc(px,py,2.6*pv,0,TAU);g.fill();
  }
  const pos=[];
  role.forEach((lab,i)=>{
    const pr=clamp(vis*N*1.15-i,0,1),ang=-Math.PI/2+i/N*TAU+Math.sin(a*.5+i)*.04,nx=cx+Math.cos(ang)*rx,ny=cy+Math.sin(ang)*ry,px=cx+(nx-cx)*pr,py=cy+(ny-cy)*pr;
    pos.push({px,py,ang,pr});if(pr<=0)return;
    const col='hsl('+((hue0+i/N*300)%360)+',85%,66%)';
    g.strokeStyle=col;g.globalAlpha=.55;g.lineWidth=1.5;g.beginPath();g.moveTo(cx,cy);g.lineTo(px,py);g.stroke();g.globalAlpha=1;
    if(pr>=1){const u=(a*.55+i*.37)%1;g.fillStyle='#fff';g.globalAlpha=.9;g.beginPath();g.arc(cx+(px-cx)*u,cy+(py-cy)*u,2.4,0,TAU);g.fill();g.globalAlpha=1}   // xung chạy dọc đường nối
    g.save();g.shadowColor=col;g.shadowBlur=12;g.fillStyle=col;g.beginPath();g.arc(px,py,(6.5+Math.sin(a*2.2+i*1.3)*1.2)*pr,0,TAU);g.fill();g.restore();
  });
  const rg=((a*.5)%1);g.strokeStyle='rgba(190,250,255,'+(.5*(1-rg))+')';g.lineWidth=2;g.beginPath();g.arc(cx,cy,18+rg*26,0,TAU);g.stroke();   // sóng lan từ tâm
  g.save();g.shadowColor='#5ff';g.shadowBlur=16;g.fillStyle='#e8ffff';g.beginPath();g.arc(cx,cy,16,0,TAU);g.fill();g.restore();
  const ini=String(e.n1).replace(/^(PROF|DR)\.?\s+/i,'').split(/\s+/).map(s=>s[0]||'').join('').slice(0,2);
  g.fillStyle='#06324a';g.font='bold 14px monospace';g.textAlign='center';g.fillText(ini,cx,cy+5);
  g.restore();
  // nhãn chức năng (luôn gọi tx cho đủ số ký tự, kể cả node chưa hiện)
  g.font='11px monospace';g.fillStyle='#bff8ff';
  role.forEach((lab,i)=>{
    const p=pos[i],c=Math.cos(p.ang);let lx,ly,al;
    if(c>.35){al='left';lx=p.px+11;ly=p.py+4}else if(c<-.35){al='right';lx=p.px-11;ly=p.py+4}else{al='center';lx=p.px;ly=Math.sin(p.ang)>0?p.py+21:p.py-12}
    g.textAlign=al;tx(g,P,lab,lx,ly);
  });
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
