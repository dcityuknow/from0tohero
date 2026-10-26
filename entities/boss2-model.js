// Boss TẦNG 2 - "LONGJUN" bản mới: HỒN BĂNG ĐẦU LỬA (đầu lửa xanh băng khổng lồ, mắt là vòng bạc số 8, miệng tròn há,
// thân pha lê ánh ngọc trai tách khớp, vài ngọn lửa xanh nhỏ lơ lửng quanh tay chân).
// Cấu trúc giống buildBoss() (lL lR aL aR parts g) + b.hP = trục đầu (để ngửa đầu khi bắn lên cao).
// Cập nhật: logo mắt = dữ liệu của bot (cần bot-model.js nạp trước), mắt phát sáng ban đêm như bot, hào quang lửa trắng quanh cơ thể.
// Nạp SAU boss-model.js, TRƯỚC boss.js (boss.js gọi buildBoss2 khi tầng 2 cần boss; ally.js dùng lại làm đồng minh).
// ---------- MẮT PHÁT SÁNG BAN ĐÊM (boss 2) ----------
// Logo mắt dùng CHÍNH dữ liệu của bot (botLogoGrid trong bot-model.js). Ban ngày logo là bạc có viền navy để nổi trên mặt trắng; ban đêm một BẢN PHỦ cùng hình
// dạng (vật liệu Basic, không ăn đèn) hiện ra và sáng dần theo ĐÚNG đường cong DayCycle của bot (.25 -> .9). Màu bạc x EYEG2 (>1) nên cháy thành trắng-băng chói.
// Đổi màu: sửa EYEG2. Ví dụ đỏ [3.4,1,.9] · vàng [3.4,2.8,1].
const EYEG2=[2.5,2.6,2.9];
const BOSS2EYE=new THREE.MeshBasicMaterial({vertexColors:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
BOSS2EYE.visible=false;
if(window.DayCycle&&DayCycle.glow)DayCycle.glow(BOSS2EYE,[1,1,1],EYEG2,.25,.9);
else(function eye2Loop(){
  requestAnimationFrame(eye2Loop);
  const dc=window.DayCycle,k=dc&&dc.cur?dc.cur.lamp:0;
  if(!(k>.25)){BOSS2EYE.visible=false;return}
  const t=Math.min(1,(k-.25)/.65),s=t*t*(3-2*t);
  BOSS2EYE.visible=true;BOSS2EYE.color.setRGB(1+(EYEG2[0]-1)*s,1+(EYEG2[1]-1)*s,1+(EYEG2[2]-1)*s);
})();
// ---------- HÀO QUANG LỬA TRẮNG ----------
// Quầng sáng cộng (additive) dạng sprite quanh thân/đầu/tay chân. Không vào botMeshes nên không ảnh hưởng bắn trúng. Sprite bị thân che ở giữa, chỉ lộ quầng ngoài rìa -> thành hào quang. Ban đêm đậm hơn.
let AURA_TEX=null;
const AURAMAT=new THREE.SpriteMaterial({blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:.7,color:0xffffff});
function auraTex(){
  if(AURA_TEX)return AURA_TEX;
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),r=g.createRadialGradient(64,64,0,64,64,64);
  r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.28,'rgba(240,248,255,.75)');r.addColorStop(.58,'rgba(190,220,255,.28)');r.addColorStop(1,'rgba(160,200,255,0)');
  g.fillStyle=r;g.fillRect(0,0,128,128);AURA_TEX=new THREE.CanvasTexture(c);AURAMAT.map=AURA_TEX;AURAMAT.needsUpdate=true;return AURA_TEX;
}
function buildBoss2(){
  const b={x:0,y:0,z:0,vy:0,r:.4,h:1.7,hp:100,ground:false,respawn:0,t:0,mv:0,parts:[],g:new THREE.Group(),big:3};   // big: hệ số phóng to (boss.js > bossScale nhân vào scale + hitbox). Giữ nguyên số khối voxel, chỉ phóng to cả nhóm.
  const add=(par,vb,head)=>{const m=vb.mesh();m.userData.bot=b;if(head)m.userData.head=true;par.add(m);botMeshes.push(m);b.parts.push({mesh:m,vb});return m};
  const pivot=(x,y)=>{const q=new THREE.Group();q.position.set(x,y,0);b.g.add(q);return q};
  // ---- bảng màu ----
  const OUT=0x22356b,FL=0xaec6ec,FACE=0xe8f0fc,NAVY=0x1a2347,NAVY2=0x3b4f80,FIRE=0x4f86d6,FIRE2=0xa9d0ff;
  const SIL=tri(0x9aa3b2,0x7a8494,0xb4bcc8);                                   // bạc bóng
  const pal=[0xf3f6fc,0xdfe7f6,0xe8e0f3,0xd9ecf3];                              // pha lê ánh ngọc trai (trắng/xanh/tím nhạt xen kẽ)
  const IR=(i,j,k)=>pal[(i+j*2+k*3)&3];
  const GR=tri(0xa9b4c8,0x98a4ba,0xb9c2d3);                                     // khớp xám bạc
  // ---- thân pha lê ----
  const T=new VB(true);
  T.box(0,.98,0,.44,.46,.28,IR,.035,true);                                      // ngực
  T.box(0,1.0,.15,.18,.24,.04,0xcfe3f7,.025,true);                             // tinh thể ở ngực
  T.box(0,1.27,0,.12,.1,.12,GR,.03,true);                                       // cổ
  for(const sx of[-1,1])T.box(sx*.27,1.15,0,.14,.14,.18,IR,.035,true);         // vai
  T.box(0,.8,0,.2,.1,.18,GR,.03,true);                                          // eo
  T.box(0,.7,0,.34,.14,.24,IR,.035,true);                                       // hông
  T.box(0,.63,.12,.2,.16,.06,0xc8d4e8,.03,true);T.box(0,.7,.13,.1,.06,.05,0xeaf2fb,.02);   // mảnh giáp hình nhọn phía trước
  add(b.g,T,false);
  // ---- đầu lửa: KHỐI CẦU, nửa trước trắng (viền xanh nhạt), nửa sau xanh navy đậm; ngọn lửa phình trên đỉnh ----
  // trục ở cổ (0,1.28) để ngửa/cúi; vẽ theo hệ b.g rồi dịch ngược
  const H=new VB(true),HY=1.78,HP=1.28;
  const FMAT=new THREE.MeshBasicMaterial({vertexColors:true});   // vật liệu LỬA tự sáng: dùng chung cho đầu + ngọn lửa + tinh thể -> cùng một màu liền khối
  const RIM=0xc3d8f2,WHT=0xf4f8fd,DK=0x56607a,DOME=tri(0x22318a,0x1d2b7a,0x2a3b9a);
  // elip vỏ ngoài, màu theo vị trí: z>.06 = mặt trước trắng (rìa xanh nhạt), còn lại = xanh navy
  const blob=(cx,cy,cz,rx,ry,rz,s,th=.06)=>{
    const nx=Math.round(2*rx/s),ny=Math.round(2*ry/s),nz=Math.round(2*rz/s);
    const ins=(i,j,k)=>((i+.5-nx/2)*s/rx)**2+((j+.5-ny/2)*s/ry)**2+((k+.5-nz/2)*s/rz)**2<=1;
    for(let i=0;i<nx;i++)for(let j=0;j<ny;j++)for(let k=0;k<nz;k++){
      if(!ins(i,j,k))continue;
      if(ins(i-1,j,k)&&ins(i+1,j,k)&&ins(i,j-1,k)&&ins(i,j+1,k)&&ins(i,j,k-1)&&ins(i,j,k+1))continue;
      const u=(i+.5-nx/2)*s/rx,v=(j+.5-ny/2)*s/ry,dz=(k+.5-nz/2)*s;
      const hex=dz>th?(u*u+v*v>.8?RIM:WHT):DOME(i,j,k);
      H.cube(cx+(i+.5-nx/2)*s,cy+(j+.5-ny/2)*s,cz+dz,s*.93,s*.93,s*.93,hex,i,j,k);
    }};
  blob(0,HY,0,.56,.6,.5,.045);
  H.ell(0,HY,0,.5,.54,.45,(i,j,k)=>k>7?WHT:0x22318a,.06,true);   // lõi bên trong lấp khe giữa các khối vỏ (nửa trước trắng, nửa sau navy) để mặt liền mạch, không lộ đường kẻ ô
  // MẮT = logo vô cực lấy mẫu từ ảnh gốc, DÙNG CHUNG dữ liệu với bot (botLogoGrid) -> cùng hình dạng, độ cong, sắc độ. Khối mỏng bám theo mặt cầu.
  // Màu bạc (sắc độ theo dữ liệu) + viền navy phía sau để nổi trên nền trắng. E = bản phủ phát sáng ban đêm (cùng màu bạc, nhân EYEG2 ở BOSS2EYE).
  const E=new VB();E.seed=(H.seed!==undefined)?H.seed:2;
  {const LW=.64,LS=.0135,nx=Math.round(LW/LS),ny=Math.round(nx/BLG_ASPECT),LH=LW/BLG_ASPECT,lg=botLogoGrid(nx,ny),EY=HY+.1;
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
      const l=lg[j*nx+i];if(l<0)continue;
      const wx=(-.5+(i+.5)/nx)*LW,wy=EY+(.5-(j+.5)/ny)*LH,q=1-(wx/.56)**2-((wy-HY)/.6)**2;if(q<=0)continue;
      const z=.5*Math.sqrt(q)+.03,g=Math.round(l*.72+35),hex=(g-8)<<16|(g-2)<<8|(g+14);
      H.cube(wx,wy,z-.006,LS*2.4,LS*2.4,.03,NAVY,i,j,1);                       // viền navy
      H.cube(wx,wy,z,LS*.95,LS*.95,.035,hex,i,j,0);
      E.cube(wx,wy,z+.012,LS*.95,LS*.95,.035,hex,i,j,0)}}
  H.ell(0,HY-.28,.43,.115,.095,.05,0x10162e,.02,true);H.ell(0,HY-.32,.46,.085,.04,.03,NAVY2,.015);   // miệng tròn há
  b.hP=pivot(0,HP);const hm=add(b.hP,H,true);hm.position.y=-HP;hm.material=FMAT;
  {frontOnly(E);const eye=E.mesh();eye.material=BOSS2EYE;eye.position.y=-HP;b.hP.add(eye);b.eyes=eye}   // mắt phát sáng: theo trục đầu, KHÔNG vào parts/botMeshes (như bot)   // cả đầu vốn là lửa: không chịu bóng đèn
  b.lL=pivot(-.14,.58);b.lR=pivot(.14,.58);b.aL=pivot(-.32,1.15);b.aR=pivot(.32,1.15);
  // ---- chân: đùi, gối khớp, ống chân, bàn chân ----
  for(const[l,s]of[[b.lL,-1],[b.lR,1]]){
    const v=new VB(true);
    v.box(0,-.12,0,.12,.22,.13,IR,.035,true);v.ell(0,-.25,0,.085,.07,.09,GR,.03,true);
    v.box(0,-.4,0,.12,.22,.13,IR,.035,true);v.box(0,-.54,.04,.15,.09,.2,IR,.03,true);
    add(l,v,false);
  }
  // ---- tay: vai khớp, cánh tay, cẳng tay, bàn tay, lửa xanh bên cạnh ----
  for(const[a,s]of[[b.aL,-1],[b.aR,1]]){
    const v=new VB(true);
    v.ell(0,0,0,.09,.09,.09,GR,.03,true);v.box(0,-.15,0,.12,.26,.13,IR,.035,true);
    v.ell(0,-.29,0,.075,.06,.08,GR,.03,true);v.box(0,-.4,0,.13,.2,.14,IR,.035,true);
    v.box(0,-.54,.01,.14,.12,.08,IR,.03,true);v.box(s*.04,-.62,.01,.05,.06,.06,IR,.02);
    add(a,v,false);
  }
  const TG0=[[-.30,.60,.16,.22,.1],[.04,.76,.13,.2,-.08],[.34,.52,.13,.17,.1],[.53,.27,.1,.14,.08],[-.53,.34,.11,.17,-.1],[-.6,-.04,.09,.13,-.08]];   // ngọn lửa [x,y,rx,ry,độ cong]
  // ---- LỬA TRẮNG ĐỘNG: ngọn lửa trên đầu + tinh thể lửa quanh tay chân. Không gộp vào khối voxel cứng, mà là mesh riêng (MeshBasic = tự sáng, không chịu bóng) có hoạt ảnh theo thời gian ----
  // Ngọn lửa = chuỗi 3 đoạn thon dần, mỗi đoạn lắc lệch pha -> gợn sóng như lửa cháy; đỉnh nhấp nháy co giãn. Tinh thể: bồng bềnh, xoay, chớp sáng.
  const WF=tri(WHT,0xf0f6fd,WHT),BF=tri(0xe3edf9,RIM,0xf0f6fd),T0=performance.now();   // cùng bảng màu với mặt: trắng + rìa xanh nhạt ở đỉnh
  const fxs=[],crys=[];
  const fh=new THREE.Group();fh.position.y=-HP;b.hP.add(fh);                       // cùng hệ tọa độ b.g, đi theo đầu khi ngửa/cúi
  const seg=(par,rx,ry,col)=>{const v=new VB();v.ell(0,ry*.9,0,rx,ry,.11,col,.03,true);const m=v.mesh();m.material=FMAT;m.frustumCulled=false;par.add(m)};
  // mkT: dựng 1 ngọn lửa 3 đoạn tại (px,py,pz) của nhóm par
  const mkT=(par0,px,py,pz,rx,ry,l,k)=>{
    const Ht=ry*3.2,fr=[.4,.33,.27],wd=[1,.72,.42],root=new THREE.Group(),sg=[];
    root.position.set(px,py,pz);par0.add(root);let par=root;
    for(let i=0;i<3;i++){const p=new THREE.Group();if(i>0)p.position.set(l*.3,fr[i-1]*Ht,0);par.add(p);seg(p,rx*wd[i],fr[i]*Ht/2*1.15,i===2?BF:WF);sg.push(p);par=p}
    fxs.push({root,sg,ph:k*1.7,sp:5+k*.6});
  };
  TG0.forEach(([x,y,rx,ry,l],k)=>mkT(fh,x,HY+y-ry*1.1,0,rx,ry,l,k));      // lửa trên đầu (fxs[0] giữ nguyên là ngọn đầu tiên: hook cập nhật gắn vào đó)
  // lửa trắng cháy dọc thân: vai, sườn, hông, lưng (gắn b.g) + dọc tay/chân (gắn theo khớp nên lắc theo chuyển động)
  [[-.3,1.2,.05,.07,.1,.11,.1],[.3,1.2,.05,.07,.1,.11,-.1],[-.25,.95,.05,.07,.11,.1,.08],[.25,.95,.05,.07,.11,.1,-.08],[-.2,.72,.04,.06,.09,.1,.1],[.2,.72,.04,.06,.09,.1,-.1],
   [-.1,1.1,-.17,.07,.12,.1,.05],[.1,1.1,-.17,.07,.12,.1,-.05]].forEach(([x,y,z,rx,ry,l],k)=>mkT(b.g,x,y,z,rx,ry,l,k+10));
  [[b.aL,-.14],[b.aR,.14]].forEach(([p,x],k)=>mkT(p,x,-.42,0,.05,.09,x*.5,k+20));
  [[b.lL,-.12],[b.lR,.12]].forEach(([p,x],k)=>mkT(p,x,-.34,0,.05,.09,x*.5,k+24));
  // quầng sáng (hào quang): thân, đầu, tay chân
  const aur=[];
  const mkA=(par,x,y,w,h)=>{const s=new THREE.Sprite(AURAMAT);auraTex();s.position.set(x,y,0);s.scale.set(w,h,1);s.frustumCulled=false;par.add(s);aur.push({s,w,h,ph:aur.length*1.3})};
  mkA(b.g,0,.98,1.5,1.9);mkA(fh,0,HY,2.3,2.4);
  mkA(b.aL,-.1,-.3,.55,.9);mkA(b.aR,.1,-.3,.55,.9);mkA(b.lL,-.05,-.3,.5,.9);mkA(b.lR,.05,-.3,.5,.9);
  const cv=new VB();cv.ell(0,0,0,.04,.05,.04,RIM,.015,true);cv.ell(0,.06,0,.03,.06,.03,WHT,.015,true);cv.ell(0,.12,0,.014,.04,.014,WHT,.012,true);
  const CG=cv.mesh().geometry;                                                     // 1 hình tinh thể lửa dùng chung
  const mkC=(par,x,y,z,sc)=>{const m=new THREE.Mesh(CG,FMAT);m.frustumCulled=false;m.position.set(x,y,z);m.scale.setScalar(sc);par.add(m);crys.push({m,y0:y,sc,ph:crys.length*2.1})};
  mkC(b.lL,-.17,-.38,-.04,1);mkC(b.lR,.17,-.38,-.04,1);mkC(b.aL,-.14,-.46,0,1);mkC(b.aR,.14,-.46,0,1);   // quanh tay chân
  mkC(fh,-.63,HY+.72,0,.7);mkC(fh,.6,HY+.82,0,.5);mkC(fh,-.45,HY+1.0,0,.45);mkC(fh,.38,HY+1.12,0,.6);       // tàn lửa bay trên đầu
  // hàm cập nhật chỉ phụ thuộc thời gian tuyệt đối nên gọi nhiều lần / frame cũng không sao; gắn vào onBeforeRender của 1 mesh lửa nên chỉ chạy khi boss đang được vẽ (không cần sửa boss.js)
  fxs[0].sg[0].children[0].onBeforeRender=()=>{
    const t=(performance.now()-T0)/1000;
    FMAT.color.setScalar(.965+.035*Math.sin(t*6.5));   // cả khối lửa (mặt + ngọn + tinh thể) chớp sáng nhẹ cùng nhau
    for(const f of fxs){
      f.sg.forEach((p,i)=>{p.rotation.z=.22*Math.sin(t*f.sp-i*1.2+f.ph)*(.4+i*.45)});
      f.root.scale.set(1+.07*Math.sin(t*8+f.ph),1+.13*Math.sin(t*9.5+f.ph*1.3),1);
      f.sg[2].scale.y=.85+.3*(.5+.5*Math.sin(t*12+f.ph));
    }
    const dc=window.DayCycle,nk=dc&&dc.cur?dc.cur.lamp:0;                          // độ tối: ban đêm hào quang đậm hơn
    AURAMAT.opacity=Math.min(1,.55+.1*Math.sin(t*5)+.3*nk);
    for(const a of aur){const p=1+.07*Math.sin(t*4.2+a.ph);a.s.scale.set(a.w*p,a.h*(1+.1*Math.sin(t*5.3+a.ph*1.4)),1)}
    for(const c of crys){c.m.position.y=c.y0+.035*Math.sin(t*3+c.ph);c.m.rotation.y=t*2+c.ph;c.m.scale.setScalar(c.sc*(.85+.25*Math.sin(t*8+c.ph*2)))}
  };
  S.add(b.g);bots.push(b);spawnBot(b);return b;
}
