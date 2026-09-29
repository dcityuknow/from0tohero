// Bot: mô hình voxel chi tiết (đầu, thân, tay, chân), spawn
// ---- Bots ----
const bots=[],botMeshes=[];
const spawns=[[-10,-16],[14,-14],[-14,14],[14,10],[0,-17],[-12,2],[12,-2]];
function buildBot(){
  const b={x:0,y:0,z:0,vy:0,r:.4,h:1.7,hp:100,ground:false,respawn:0,t:0,mv:0,parts:[],g:new THREE.Group()};
  // mỗi bộ phận = 1 mesh gộp (VB nhớ lại từng khối để vỡ mảnh); head=true để tính headshot
  const add=(par,vb,head)=>{const m=vb.mesh();m.userData.bot=b;if(head)m.userData.head=true;par.add(m);botMeshes.push(m);b.parts.push({mesh:m,vb});return m};
  const pivot=(x,y)=>{const q=new THREE.Group();q.position.set(x,y,0);b.g.add(q);return q};
  const RED=tri(0xff4d5e,0xff6b78,0xe23a4b),PINK=tri(0xff7a88,0xff95a0,0xf0606f),DRED=tri(0xd93a4c,0xc42e40,0xe8505f),BLU=tri(0x4d9dff,0x7fbfff,0x3a7fe0),ORG=tri(0xff9a3c,0xffb56b,0xe0801f);
  // thân: đai vàng, huy hiệu kim cương trước ngực, khóa thắt lưng, dây đeo, ba lô xanh
  const T=new VB(true);
  T.box(0,.95,0,.7,.7,.4,(i,j,k,nx,ny,nz)=>{
    if(j<2)return (i+k)&1?0xffd23f:0xffe680;
    if(k===nz-1){const d=Math.abs(i-(nx-1)/2)+Math.abs(j-8);if(d<=1)return 0xff4d5e;if(d<=3)return 0xffd23f}
    return RED(i,j,k)},.05,true);
  T.box(0,.66,.215,.14,.1,.03,0xffd23f,.02);T.box(0,.66,.235,.05,.05,.02,0x4d9dff,.015);
  T.box(-.2,.98,.212,.07,.6,.03,0x3a3850,.02);T.box(.2,.98,.212,.07,.6,.03,0x3a3850,.02);
  T.box(0,1.32,0,.3,.06,.28,0x3a3850,.03,true);
  T.box(0,1.0,-.28,.42,.44,.16,BLU,.045,true);T.box(0,1.15,-.29,.44,.1,.18,0x3a7fe0,.04,true);
  T.box(0,.88,-.375,.28,.16,.03,0xffd23f,.03,true);T.box(0,1.05,-.375,.06,.06,.02,0xff4d5e,.02);
  add(b.g,T,false);
  // đầu: kính che mắt, mắt trắng-xanh, miệng có răng, má hồng, tai nghe, mũ nhiều màu, ăng-ten
  const H=new VB(true);
  H.box(0,1.55,0,.44,.44,.44,PINK,.05,true);
  H.box(0,1.58,.235,.42,.12,.03,0x2b2a3a,.03,true);
  for(const sx of[-.1,.1]){H.box(sx,1.58,.252,.08,.07,.012,0xffffff,.015);H.box(sx,1.58,.262,.035,.035,.012,0x4d9dff,.012);H.box(sx,1.66,.25,.1,.02,.012,0x2b2a3a,.01)}
  H.box(0,1.45,.232,.22,.05,.02,0x2b2a3a,.01);H.box(0,1.45,.245,.2,.03,.01,(i)=>i&1?0xffffff:-1,.02);
  for(const sx of[-.16,.16])H.box(sx,1.5,.226,.06,.04,.012,0xff9fbf,.02);
  for(const sx of[-1,1]){H.cyl(sx*.245,1.55,0,.07,.05,0xffd23f,.02,'x');H.cyl(sx*.27,1.55,0,.04,.02,0x3a3850,.015,'x')}
  H.box(0,1.79,0,.34,.06,.34,tri(0xffd23f,0x4d9dff,0x7fe0a0),.04,true);H.box(0,1.77,.22,.34,.03,.14,0xff9a3c,.03);
  H.cyl(.08,1.88,0,.012,.12,0x3a3850,.012,'y');H.ell(.08,1.97,0,.035,.035,.035,0xff2a4d,.015);
  add(b.g,H,true);
  b.lL=pivot(-.17,.6);b.lR=pivot(.17,.6);b.aL=pivot(-.46,1.27);b.aR=pivot(.46,1.27);
  // chân: đầu gối vàng, giày trắng viền xanh, đế đen
  for(const l of[b.lL,b.lR]){
    const v=new VB(true);
    v.box(0,-.24,0,.3,.48,.32,DRED,.05,true);v.box(0,-.27,.175,.22,.14,.05,0xffd23f,.03);v.box(0,-.47,0,.32,.05,.34,0xffd23f,.025,true);
    v.box(0,-.54,.05,.32,.12,.44,(i,j)=>j===0?0x3a3850:((i+j)&1?0xf4f4f8:0xe4e4ee),.04,true);v.box(0,-.54,.24,.3,.11,.06,0x4d9dff,.03);
    add(l,v,false);
  }
  // tay: vai giáp, tay áo, cổ tay vàng, găng cam
  for(const a of[b.aL,b.aR]){
    const v=new VB(true);
    v.box(0,-.22,0,.22,.44,.26,RED,.05,true);v.box(0,-.47,0,.24,.06,.28,0xffd23f,.03,true);v.box(0,-.56,0,.2,.12,.24,ORG,.04,true);
    v.box(0,-.6,.1,.18,.03,.05,0x3a3850,.02);
    v.box(0,.02,0,.3,.1,.34,DRED,.05,true);v.box(0,.075,0,.3,.02,.34,0xffd23f,.02);
    add(a,v,false);
  }
  S.add(b.g);bots.push(b);spawnBot(b);return b;
}
function spawnBot(b){
  const SPL=fSpawns(curFl);let best=SPL[0],bd=-1;
  for(const s of SPL){const d=Math.hypot(s[0]-P.x,s[1]-P.z);if(d>bd&&Math.random()<.7){bd=d;best=s}}
  b.x=best[0];b.z=best[1];b.y=curFl*FH;b.vy=0;b.hp=b.maxhp||100;b.respawn=0;b.g.visible=true;
}
// Bot thứ 2 trở đi dùng chung geometry với bot đầu tiên (nhẹ RAM, tạo tức thì) - cần cho việc sinh hàng chục/trăm bot
function mkBot(){
  const p=bots[0];if(!p)return buildBot();
  const b={x:0,y:0,z:0,vy:0,r:.4,h:1.7,hp:100,ground:false,respawn:0,t:0,mv:0,parts:[],g:new THREE.Group()};
  const pv=(x,y)=>{const q=new THREE.Group();q.position.set(x,y,0);b.g.add(q);return q};
  b.lL=pv(-.17,.6);b.lR=pv(.17,.6);b.aL=pv(-.46,1.27);b.aR=pv(.46,1.27);
  const mp=new Map([[p.g,b.g],[p.lL,b.lL],[p.lR,b.lR],[p.aL,b.aL],[p.aR,b.aR]]);
  for(const pt of p.parts){const m=new THREE.Mesh(pt.mesh.geometry,VMAT);m.userData.bot=b;if(pt.mesh.userData.head)m.userData.head=true;mp.get(pt.mesh.parent).add(m);botMeshes.push(m);b.parts.push({mesh:m,vb:pt.vb})}
  S.add(b.g);bots.push(b);spawnBot(b);return b;
}
for(let i=0;i<4;i++)mkBot();

// ---- Boss: nhân vật khối Rubik tốc độ - đầu chibi trắng to + kính đen có logo trắng, miệng toe toét lộ răng, áo đỏ có biểu tượng tia sét, giày vàng ----
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
  // kính chắn CHỈ gồm mảng đen + logo trắng. Hai lớp đen lệch nhau nửa ô để khe giữa các khối không lộ nền trắng của đầu
  H.box(0,VY,VF/2,1.24,.6,VF,(i,j,k)=>(i+j+k)&1?0x14141b:0x1e1e27,.05,true);
  H.box(.025,VY+.025,.52,1.2,.56,.34,0x101017,.05,true);
  // logo trắng: MỘT vòng khép kín hình "hạt đậu / quả tạ" (hai thùy nối bằng eo hẹp), viền dày, sáng ở giữa vòng, hai mép hơi xám
  {const sm=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k/4},
    so=(x,y)=>sm(Math.hypot(x-.52,y)-.48,Math.hypot(x+.52,y)-.48,.48),      // mép ngoài
    si=(x,y)=>sm(Math.hypot(x-.5,y)-.26,Math.hypot(x+.5,y)-.26,1.0);        // lỗ bên trong
    const LW=1.0,LS=.028,nx=Math.round(LW/LS),ny=Math.round(LW/2/LS),u=LW/2;
    for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){
      const x=-1+(i+.5)/nx*2,y=.5-(j+.5)/ny,o=so(x,y),n=si(x,y);
      if(o>0||n<=0)continue;
      const g=Math.round(255*(.62+.38*Math.sin(Math.PI*(-o)/(-o+n)))),hex=g<<16|g<<8|g;
      H.cube(x*u,VY+y*u,VF+.02,LS*.95,LS*.95,.04,hex,i,j,0)}}
  // miệng toe toét lộ răng và lưỡi
  H.box(0,1.55,.53,.8,.2,.12,DK,.04);
  H.box(0,1.62,.6,.72,.08,.04,(i)=>i&1?0xffffff:0xe8e8f0,.04);H.box(0,1.48,.6,.6,.06,.04,(i)=>i&1?0xffffff:0xe8e8f0,.04);
  H.box(.14,1.45,.61,.2,.1,.06,0xff9fbf,.04);
  for(const sx of[-1,1]){H.box(sx*.72,2.18,0,.12,.2,.2,YEL,.04);H.box(sx*.78,2.0,0,.12,.2,.2,YEL,.04);H.box(sx*.72,1.82,0,.12,.2,.2,YEL,.04)}   // tai tia chớp
  add(b.g,H,true);
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
