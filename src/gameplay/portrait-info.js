// ============================================================================
// TƯƠNG TÁC TRANH TRONG CHÒI: đứng gần + nhìn vào 1 bức tranh -> hiện gợi ý [E]. Bấm E -> quanh bức tranh bung ra 4 ô thông tin
// kiểu bảng điện tử trong suốt (cùng phong cách bảng "VALIDATORS" trong pavilion.js), hiện 10 giây rồi mờ dần và tắt. Bấm E lần nữa = tắt sớm.
// Nạp SAU pavilion.js (đọc window.PavilionGuide.easels mỗi lần bấm, nên chòi rebuild vẫn đúng). Không cần sửa main.js / pavilion.js.
// Nội dung ô "tiểu sử": tự lấy từ window.GuideBot.bio() (guide-bot.js). Muốn ghi đè riêng: đặt  window.PortraitBio={'DAVID SONG':'đoạn tiểu sử...', ...}  (khóa = đúng tên in trên bảng tên, viết HOA). Chưa có thì hiện dòng mặc định.
// ============================================================================
(function(){
const DUR=10,FADE=.55,POP=.42,RANGE=4.8,COSV=.84;   // DUR: giây hiện · RANGE: khoảng cách tối đa (m) · COSV: độ lệch hướng nhìn cho phép (cos ~33°)
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>{const c=1.70158,u=t-1;return 1+(c+1)*u*u*u+c*u*u};   // easeOutBack: bung ra có nảy nhẹ
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const seedRnd=s=>{let a=hash(s)||1;return()=>(a=(a*16807)%2147483647)/2147483647};

function groupOf(n2){
  if(/ADVISOR/.test(n2))return'ADVISORY BOARD';
  if(/CO[- ]?FOUNDER/.test(n2))return'FOUNDING TEAM';
  if(/\b(CEO|CTO|CMO|CPO)\b|CHIEF/.test(n2))return'LEADERSHIP';
  if(/MODERATOR|COMMUNITY|AMBASSADOR|OPTIMUM TEAM/.test(n2))return'COMMUNITY';
  if(/ENGINEER|TPM|TCSM/.test(n2))return'ENGINEERING & SUPPORT';
  return'OPTIMUM TEAM';
}

// ---------- vẽ canvas theo phong cách bảng điện tử ----------
function mk(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(c);t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;return t}
function frame(g,w,h){
  g.fillStyle='rgba(8,38,66,.38)';g.fillRect(0,0,w,h);
  g.strokeStyle='rgba(130,238,255,.95)';g.lineWidth=3;g.strokeRect(5,5,w-10,h-10);
  g.lineWidth=6;for(const[x,y,dx,dy]of[[5,5,1,1],[w-5,5,-1,1],[5,h-5,1,-1],[w-5,h-5,-1,-1]]){g.beginPath();g.moveTo(x+dx*26,y);g.lineTo(x,y);g.lineTo(x,y+dy*26);g.stroke()}
  g.fillStyle='rgba(150,235,255,.05)';for(let y=10;y<h-8;y+=6)g.fillRect(8,y,w-16,2);   // vân quét ngang mờ
  g.shadowColor='#5ff';g.shadowBlur=9;g.textAlign='left';
}
function fit(g,str,maxW,px,bold){let p=px;for(;p>10;p-=1){g.font=(bold?'bold ':'')+p+'px monospace';if(g.measureText(str).width<=maxW)break}return p}
function wrap(g,text,maxW){const out=[];for(const para of String(text).split('\n')){let line='';for(const wd of para.split(/\s+/)){const t=line?line+' '+wd:wd;if(g.measureText(t).width>maxW&&line){out.push(line);line=wd}else line=t}out.push(line)}return out}
function head(g,t,sub,w){g.font='bold 20px monospace';g.fillStyle='#bff8ff';g.fillText(t,24,40);if(sub){g.font='13px monospace';g.fillStyle='rgba(150,235,255,.85)';g.fillText(sub,24,60)}}

function drawID(e){return mk(512,320,(g,w,h)=>{frame(g,w,h);head(g,'OPTIMUM  ·  PROFILE','VERIFIED MEMBER',w);
  const R=seedRnd(e.n1);
  fit(g,e.n1,w-48,40,true);g.fillStyle='#ffffff';g.fillText(e.n1,24,130);
  const p=fit(g,e.n2,w-48,24,true);g.fillStyle='#ffd95e';g.fillText(e.n2,24,168);
  g.strokeStyle='rgba(130,238,255,.5)';g.lineWidth=1.5;g.beginPath();g.moveTo(24,190);g.lineTo(w-24,190);g.stroke();
  g.fillStyle='rgba(150,235,255,.9)';g.font='14px monospace';g.fillText('ID  0x'+hash(e.n1).toString(16).toUpperCase().padStart(8,'0'),24,218);
  let x=24;while(x<w-24){const bw=2+Math.floor(R()*4);g.fillStyle='hsla(190,90%,'+(60+R()*15)+'%,.9)';g.fillRect(x,236,bw,56);x+=bw+2+Math.floor(R()*4)}
})}
function drawRole(e){return mk(512,320,(g,w,h)=>{frame(g,w,h);head(g,'AFFILIATION','OPTIMUM NETWORK',w);
  const grp=groupOf(e.n2),R=seedRnd(e.n1+'role');
  fit(g,grp,w-48,30,true);g.fillStyle='#8aff9a';g.fillText(grp,24,98);
  const cx=w/2,cy=205,Rr=78;g.strokeStyle='rgba(150,235,255,.5)';g.lineWidth=1.5;g.beginPath();g.arc(cx,cy,Rr,0,7);g.stroke();g.beginPath();g.arc(cx,cy,Rr*.55,0,7);g.stroke();
  const N=14;for(let q=0;q<N;q++){const a=q/N*6.2832,px=cx+Math.cos(a)*Rr,py=cy+Math.sin(a)*Rr;g.strokeStyle='hsla('+(q*26)+',90%,65%,.6)';g.beginPath();g.moveTo(cx,cy);g.lineTo(px,py);g.stroke();g.fillStyle='hsl('+(q*26)+',95%,68%)';g.beginPath();g.arc(px,py,5+R()*3,0,7);g.fill()}
  g.fillStyle='#fff';g.beginPath();g.arc(cx,cy,9,0,7);g.fill();
})}
function drawBio(e){return mk(384,448,(g,w,h)=>{frame(g,w,h);head(g,'BIO','',w);
  const lg=typeof L!=='undefined'?L:'vi',GB=window.GuideBot;
  let gb='';try{gb=GB&&GB.bio?GB.bio(e,lg):''}catch(_){}   // tiểu sử dùng chung với bot hướng dẫn (guide-bot.js: vi / en / ko, ngôn ngữ khác dùng en)
  const bio=(window.PortraitBio&&window.PortraitBio[e.n1])||gb||('MEMBER OF THE OPTIMUM PROJECT.\n\n'+e.n1+' - '+e.n2+'.\n\nX.COM/GET_OPTIMUM');
  g.font='17px monospace';g.fillStyle='#bff8ff';
  const LN=wrap(g,bio,w-48),max=Math.floor((h-96)/23);
  for(let i=0;i<Math.min(LN.length,max);i++){let s=LN[i];if(i===max-1&&LN.length>max)s=s.replace(/.{0,2}$/,'..');g.fillText(s,24,86+i*23)}
})}
function drawProj(e){return mk(512,320,(g,w,h)=>{frame(g,w,h);head(g,'OPTIMUM','DECENTRALIZED DATA ACCELERATION',w);
  const R=seedRnd(e.n1+'net'),x0=26,y0=84,W=w-52,H=h-y0-62,Nn=[];
  for(let q=0;q<26;q++)Nn.push([x0+R()*W,y0+R()*H,R()]);
  g.lineWidth=1.4;for(let a=0;a<Nn.length;a++)for(let b=a+1;b<Nn.length;b++){const d=Math.hypot(Nn[a][0]-Nn[b][0],Nn[a][1]-Nn[b][1]);if(d<100){g.strokeStyle='hsla('+(Nn[a][2]*300)+',90%,65%,'+(.75-d/150)+')';g.beginPath();g.moveTo(Nn[a][0],Nn[a][1]);g.lineTo(Nn[b][0],Nn[b][1]);g.stroke()}}
  for(const n of Nn){g.fillStyle='hsl('+(n[2]*300)+',95%,68%)';g.beginPath();g.arc(n[0],n[1],3.5+n[2]*4,0,7);g.fill()}
  g.font='bold 20px monospace';g.fillStyle='#6ff0ff';g.fillText('X.COM/GET_OPTIMUM',24,h-26);
})}

// ---------- trạng thái ----------
let act=null;   // {grp,panels:[{m,tex,fx,fy,fz,s,i,out}],t0,e}
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
  S.remove(act.grp);for(const p of act.panels){p.m.geometry.dispose();p.m.material.dispose();p.tex.dispose()}
  act=null;
}
function open(e){
  dispose();
  const K=e.s,s=clamp(K,.9,1.3),yc=e.y,a=Math.atan2(e.fx,e.fz),grp=new THREE.Group();
  grp.position.set(e.x,0,e.z);grp.rotation.y=a;
  const gap=K/2+.14,Z=.34;
  const defs=[   // [vẽ, rộng m, cao m, bên (-1 trái / +1 phải), độ cao so với tâm tranh]
    [drawID,1.3*s,.81*s,-1,+.50*s],
    [drawBio,.98*s,1.14*s,-1,-.50*s],
    [drawRole,1.1*s,.69*s,+1,+.58*s],
    [drawProj,1.3*s,.81*s,+1,-.42*s]
  ];
  const panels=[];
  defs.forEach((d,i)=>{
    let tex;try{tex=d[0](e)}catch(err){console.warn('[PortraitInfo] panel',i,err);tex=mk(64,64,()=>{})}
    const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,depthWrite:false,opacity:0,fog:false});
    const m=new THREE.Mesh(new THREE.PlaneGeometry(d[1],d[2]),mat);
    const fx=d[3]*(gap+d[1]/2),fy=yc+d[4];
    m.position.set(0,yc,Z);m.rotation.y=-d[3]*.32;m.scale.set(.01,.01,1);m.renderOrder=5;   // xoay hơi hướng vào người xem
    grp.add(m);panels.push({m,tex,fx,fy,fz:Z,i,s});
  });
  S.add(grp);act={grp,panels,t0:performance.now()/1000,e};
  try{if(typeof snd==='function'){snd(880,.07,'sine');setTimeout(()=>snd(1320,.06,'sine'),70)}}catch(_){}
}
const holdingFruit=()=>{try{return !!(window.FruitEat&&FruitEat.held&&FruitEat.held())}catch(_){return false}};   // đang cầm trái cây: E thuộc về fruit-eat.js (cất trái)
function toggle(){
  if(act){dispose();return}
  if(!playing||dead||holdingFruit())return;
  const e=pick();if(e)open(e);
}

// ---------- gợi ý [E] ----------
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
(function loop(){
  requestAnimationFrame(loop);
  const t1=performance.now()/1000;
  if(act){
    const t=t1-act.t0;
    if(t>DUR+FADE||dead||curFl!==0||Math.hypot(P.x-act.e.x,P.z-act.e.z)>RANGE+3){dispose()}
    else{
      const fo=1-clamp((t-DUR)/FADE,0,1);
      for(const p of act.panels){
        const k=clamp((t-p.i*.12)/POP,0,1),e=ease(k),m=p.m;
        m.position.x=p.fx*e;m.position.y=act.e.y+(p.fy-act.e.y)*e+Math.sin(t1*1.1+p.i*1.7)*.03*p.s;m.position.z=p.fz;
        const sc=Math.max(.01,e);m.scale.set(sc,sc,1);
        m.material.opacity=.96*Math.min(1,k*2)*fo*(.94+.06*Math.sin(t1*9+p.i*2.3));   // nhấp nháy rất nhẹ như màn hình điện tử
      }
    }
  }
  if(!playing||dead||(!act&&holdingFruit()))setTip('');
  else if(act)setTip('[E]  \u2715');
  else{const e=pick();setTip(e?'[E]  '+e.n1:'')}
})();

window.PortraitInfo={open,close:dispose,pick};
})();
