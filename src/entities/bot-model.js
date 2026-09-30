// Bot thường: mô hình voxel chi tiết (đầu, thân, tay, chân), spawn, nhân bản bot
const bots=[],botMeshes=[];
const spawns=[[-10,-16],[14,-14],[-14,14],[14,10],[0,-17],[-12,2],[12,-2]];
function buildBot(){
  const b={x:0,y:0,z:0,vy:0,r:.4,h:1.7,hp:100,ground:false,respawn:0,t:0,mv:0,parts:[],g:new THREE.Group()};
  // mỗi bộ phận = 1 mesh gộp (VB nhớ lại từng khối để vỡ mảnh); head=true để tính headshot
  const add=(par,vb,head)=>{const m=vb.mesh();m.userData.bot=b;if(head)m.userData.head=true;par.add(m);botMeshes.push(m);b.parts.push({mesh:m,vb});return m};
  const pivot=(x,y)=>{const q=new THREE.Group();q.position.set(x,y,0);b.g.add(q);return q};
  // BỘ MÀU ĐEN: RED = thân + tay áo, DRED = chân + giáp vai (đen sâu hơn), BLU = ba lô (đen xám), ORG = găng tay. PINK = đầu (giữ hồng, đổi ở đây nếu muốn đầu cũng đen)
  const RED=tri(0x26262d,0x30303a,0x1d1d24),PINK=tri(0xff7a88,0xff95a0,0xf0606f),DRED=tri(0x15151a,0x1c1c22,0x101014),BLU=tri(0x2d3340,0x384050,0x252b36),ORG=tri(0x3a3a44,0x45454f,0x2f2f38);
  // thân: đai vàng, huy hiệu kim cương trước ngực, khóa thắt lưng, dây đeo, ba lô xanh
  const T=new VB(true);
  T.box(0,.95,0,.7,.7,.4,(i,j,k,nx,ny,nz)=>{
    if(j<2)return (i+k)&1?0xffd23f:0xffe680;
    if(k===nz-1){const d=Math.abs(i-(nx-1)/2)+Math.abs(j-8);if(d<=1)return 0xff4d5e;if(d<=3)return 0xffd23f}
    return RED(i,j,k)},.05,true);
  T.box(0,.66,.215,.14,.1,.03,0xffd23f,.02);T.box(0,.66,.235,.05,.05,.02,0x4d9dff,.015);
  T.box(-.2,.98,.212,.07,.6,.03,0x3a3850,.02);T.box(.2,.98,.212,.07,.6,.03,0x3a3850,.02);
  T.box(0,1.32,0,.3,.06,.28,0x3a3850,.03,true);
  T.box(0,1.0,-.28,.42,.44,.16,BLU,.045,true);T.box(0,1.15,-.29,.44,.1,.18,0x3a4256,.04,true);
  T.box(0,.88,-.375,.28,.16,.03,0xffd23f,.03,true);T.box(0,1.05,-.375,.06,.06,.02,0xff4d5e,.02);
  add(b.g,T,false);
  // đầu (to hơn ~27%): kính đen chắn mắt + logo trắng như boss, miệng có răng, má hồng, tai nghe, mũ nhiều màu, ăng-ten
  const H=new VB(true),HY=1.6,VY=1.65,VF=.32;
  H.box(0,HY,0,.56,.56,.56,PINK,.05,true);
  H.box(0,VY,.27,.6,.28,.1,(i,j,k)=>(i+j+k)&1?0x14141b:0x1e1e27,.04,true);   // kính đen
  // logo trắng hình "hạt đậu / quả tạ" (cùng công thức với boss, thu nhỏ)
  {const sm=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k/4},
    so=(x,y)=>sm(Math.hypot(x-.52,y)-.48,Math.hypot(x+.52,y)-.48,.48),
    si=(x,y)=>sm(Math.hypot(x-.5,y)-.26,Math.hypot(x+.5,y)-.26,1.0);
    const LW=.46,LS=.0139,nx=Math.round(LW/LS),ny=Math.round(LW/2/LS),u=LW/2;
    for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){
      const x=-1+(i+.5)/nx*2,y=.5-(j+.5)/ny,o=so(x,y),n=si(x,y);
      if(o>0||n<=0)continue;
      const g=Math.round(255*(.62+.38*Math.sin(Math.PI*(-o)/(-o+n)))),hex=g<<16|g<<8|g;
      H.cube(x*u,VY+y*u,VF+.01,LS*.95,LS*.95,.02,hex,i,j,0)}}
  H.box(0,1.4,.292,.28,.06,.02,0x2b2a3a,.01);H.box(0,1.4,.305,.25,.035,.01,(i)=>i&1?0xffffff:-1,.02);
  for(const sx of[-.2,.2])H.box(sx,1.45,.286,.07,.04,.012,0xff9fbf,.02);
  for(const sx of[-1,1]){H.cyl(sx*.3,1.6,0,.08,.05,0xffd23f,.02,'x');H.cyl(sx*.325,1.6,0,.045,.02,0x3a3850,.015,'x')}
  H.box(0,1.91,0,.4,.06,.4,tri(0xffd23f,0x4d9dff,0x7fe0a0),.04,true);H.box(0,1.89,.26,.4,.03,.14,0xff9a3c,.03);
  H.cyl(.1,2.0,0,.012,.12,0x3a3850,.012,'y');H.ell(.1,2.09,0,.035,.035,.035,0xff2a4d,.015);
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
  b.ai=null;b.nv=null;b.dry=false;b.hdUse=0;b.ry=undefined;   // AI + đường đi (steering.js) tạo lại mỗi lần xuất hiện
  b.talker=!b.boss&&Math.random()<.2;b.tt=1.5+Math.random()*5;b.tShow=0;b.tw=0;b.tTok=(b.tTok||0)+1;   // 20% bot nói chuyện được (boss-talk.js)
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
