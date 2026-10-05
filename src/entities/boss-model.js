// Boss: nhân vật khối Rubik tốc độ - đầu chibi trắng to + kính đen có logo trắng, miệng toe toét lộ răng, áo đỏ có biểu tượng tia sét, giày vàng
function buildBoss(){
  const b={x:0,y:0,z:0,vy:0,r:.4,h:1.7,hp:100,ground:false,respawn:0,t:0,mv:0,parts:[],g:new THREE.Group()};
  const add=(par,vb,head)=>{const m=vb.mesh();m.userData.bot=b;if(head)m.userData.head=true;par.add(m);botMeshes.push(m);b.parts.push({mesh:m,vb});return m};
  const pivot=(x,y)=>{const q=new THREE.Group();q.position.set(x,y,0);b.g.add(q);return q};
  const RED=tri(0xe23a2b,0xf04a3a,0xcf2f22),DRED=tri(0xb82a20,0xa8241a,0xc63226),YEL=0xffd23f,DK=0x1e1e28,WH=[0xf7f7fb,0xe6e6ef,0xffffff,0xdcdce8],SP=[0xff5a1f,0x4d9dff,0x3fbf75,0xffd23f,0xe23a2b];
  // thân: đai vàng, biểu tượng tia sét trong vòng tròn, vạch sét ziczag ngang bụng
  const T=new VB(true);
  T.box(0,.95,0,.62,.7,.36,(i,j,k,nx,ny,nz)=>j<2?((i+k)&1?YEL:0xffe680):RED(i,j,k),.045,true);
  T.cyl(0,1.06,.19,.135,.02,0xffffff,.02,'z',.105);T.cyl(0,1.06,.195,.105,.02,YEL,.02,'z');
  T.box(.035,1.12,.212,.05,.05,.014,0xe23a2b,.014);T.box(.005,1.075,.212,.11,.04,.014,0xe23a2b,.014);T.box(-.03,1.03,.212,.05,.05,.014,0xe23a2b,.014);T.box(-.045,.985,.212,.03,.05,.014,0xe23a2b,.014);
  for(let i=-3;i<=3;i++)T.box(i*.085,.76+((i&1)?.035:-.035),.185,.09,.05,.02,YEL,.02);
  add(b.g,T,false);
  // đầu chibi (to gấp đôi): tâm y=1.9, bán kính .66; kính tâm y=1.98, mặt trước z=.72
  const H=new VB(true),HY=1.9,VY=1.98,VF=.72;
  H.ell(0,HY,0,.66,.66,.66,(i,j,k)=>((i*7+j*13+k*17)%31===0)?SP[(i+j+k)%5]:WH[(i+j+k)%4],.045,true);
  // kính chắn CHỈ gồm mảng đen + logo vô cực (giống bot). Hai lớp đen lệch nhau nửa ô để khe giữa các khối không lộ nền trắng của đầu
  H.box(0,VY,VF/2,1.24,.6,VF,(i,j,k)=>(i+j+k)&1?0x14141b:0x1e1e27,.05,true);
  H.box(.025,VY+.025,.52,1.2,.56,.34,0x101017,.05,true);
  // logo vô cực: DÙNG CHUNG dữ liệu lấy mẫu từ ảnh gốc với bot (botLogoGrid trong bot-model.js) -> cùng hình dạng, độ cong, sắc độ.
  // Tỉ lệ so với kính y hệt bot: rộng ~77% kính, cao ~87% kính (kính boss 1.24 x .6 -> logo .96 x .527). LS nhỏ hơn bot một chút vì đầu boss to gấp đôi.
  // E = bản phủ phát sáng ban đêm: cùng BOTEYE + cùng EYEG + cùng DayCycle.glow với bot nên sáng/tắt đồng bộ y hệt.
  const E=new VB();E.seed=(H.seed!==undefined)?H.seed:2;
  {const LW=.96,LS=.02,nx=Math.round(LW/LS),ny=Math.round(nx/BLG_ASPECT),LH=LW/BLG_ASPECT,lg=botLogoGrid(nx,ny);
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
      const l=lg[j*nx+i];if(l<0)continue;
      const px=(-.5+(i+.5)/nx)*LW,py=VY+(.5-(j+.5)/ny)*LH,lc=(l<<16)|(l<<8)|l;
      H.cube(px,py,VF+.01,LS*.95,LS*.95,.02,lc,i,j,0);
      E.cube(px,py,VF+.012,LS*.95,LS*.95,.02,lc,i,j,0)}}
  // miệng toe toét lộ răng và lưỡi
  H.box(0,1.55,.53,.8,.2,.12,DK,.04);
  H.box(0,1.62,.6,.72,.08,.04,(i)=>i&1?0xffffff:0xe8e8f0,.04);H.box(0,1.48,.6,.6,.06,.04,(i)=>i&1?0xffffff:0xe8e8f0,.04);
  H.box(.14,1.45,.61,.2,.1,.06,0xff9fbf,.04);
  for(const sx of[-1,1]){H.box(sx*.72,2.18,0,.12,.2,.2,YEL,.04);H.box(sx*.78,2.0,0,.12,.2,.2,YEL,.04);H.box(sx*.72,1.82,0,.12,.2,.2,YEL,.04)}   // tai tia chớp
  b.hP=pivot(0,1.45);const hm=add(b.hP,H,true);hm.position.y=-1.45;
  {frontOnly(E);const eye=E.mesh();eye.material=BOTEYE;eye.position.y=-1.45;b.hP.add(eye);b.eyes=eye}   // mắt phát sáng: gắn vào trục đầu (ngửa đầu vẫn sáng theo), KHÔNG đưa vào parts/botMeshes như bot   // đầu có trục ở cổ (0,1.45): boss ngửa đầu khi bắn / ném lên cao
  b.lL=pivot(-.17,.6);b.lR=pivot(.17,.6);b.aL=pivot(-.46,1.27);b.aR=pivot(.46,1.27);
  // chân: đầu gối vàng, giày vàng kẻ ô, đế đen
  for(const l of[b.lL,b.lR]){
    const v=new VB(true);
    v.box(0,-.15,0,.28,.3,.3,RED,.045,true);v.box(0,-.3,.02,.3,.1,.32,YEL,.03,true);
    v.box(0,-.45,.04,.32,.2,.4,(i,j)=>(i+j)&1?0xffd23f:0xf2b84b,.04,true);v.box(0,-.575,.05,.34,.05,.44,DK,.03,true);
    add(l,v,false);
  }
  // tay: vai giáp, tay áo đỏ, vạch vàng, nắm đấm
  for(const a of[b.aL,b.aR]){
    const v=new VB(true);
    v.box(0,.02,0,.3,.12,.32,DRED,.045,true);v.box(0,-.2,0,.24,.4,.26,RED,.045,true);v.box(0,-.3,0,.26,.06,.28,YEL,.03,true);
    v.box(0,-.52,.02,.26,.22,.3,RED,.045,true);
    add(a,v,false);
  }
  S.add(b.g);bots.push(b);spawnBot(b);return b;
}
