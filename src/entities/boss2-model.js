// Boss TẦNG 2 - "LONGJUN" (Long Quân): đại tướng trấn giữ Vạn Lý Trường Thành.
// Khác boss tầng 1 (FLASH, chibi áo đỏ): thân người cao, giáp vảy đỏ sẫm viền vàng, huy hiệu rồng ngọc bích, râu dài, mày xếch,
// mũ sắt vành vàng có chổi lông đỏ + hai cánh lông trĩ, áo choàng đỏ cắm cờ lệnh sau lưng, ủng đen.
// Cấu trúc giống buildBoss() (lL lR aL aR parts g) nên AI / hoạt ảnh / vỡ mảnh / đồng minh dùng chung; thêm b.hP = trục đầu (để ngửa đầu khi bắn lên cao).
// Nạp SAU boss-model.js, TRƯỚC boss.js (boss.js gọi buildBoss2 khi tầng 2 cần boss; ally.js dùng lại làm đồng minh).
function buildBoss2(){
  const b={x:0,y:0,z:0,vy:0,r:.4,h:1.7,hp:100,ground:false,respawn:0,t:0,mv:0,parts:[],g:new THREE.Group()};
  const add=(par,vb,head)=>{const m=vb.mesh();m.userData.bot=b;if(head)m.userData.head=true;par.add(m);botMeshes.push(m);b.parts.push({mesh:m,vb});return m};
  const pivot=(x,y)=>{const q=new THREE.Group();q.position.set(x,y,0);b.g.add(q);return q};
  const ARM=tri(0x8e2420,0x7c1d1a,0x9d2c27),DARM=tri(0x5e1613,0x4f110f,0x6a1b17),GOLD=chk(0xe3b53b,0xf2cc5a),STEEL=tri(0x3a3d46,0x30333b,0x44474f),
    SKIN=tri(0xf1c7a0,0xe9bb90,0xf5d0ac),BOOT=tri(0x25252d,0x1e1e26,0x2d2d36),PLUME=tri(0xd9262c,0xe83a3a,0xc01f25),JADE=0x2fa07a,BLK=0x14141b;
  // ---- thân: giáp vảy (hàng sáng / tối xen kẽ), huy hiệu rồng ngọc ở ngực, đai vàng, váy giáp, áo choàng + 2 cờ lệnh ----
  const T=new VB(true);
  T.box(0,.95,0,.66,.72,.38,(i,j,k,nx,ny,nz)=>{
    const dd=Math.hypot(i-(nx-1)/2,j-10);
    if(k===nz-1&&dd<=1.5)return JADE;
    if(k===nz-1&&dd<=3.4)return GOLD(i,j,k);
    if(j<2||j>=ny-2)return GOLD(i,j,k);
    return (j&1)?ARM(i,j,k):DARM(i,j,k);
  },.045,true);
  T.box(0,.62,0,.72,.1,.42,GOLD,.035,true);T.box(0,.62,.22,.12,.1,.03,JADE,.02);                     // thắt lưng + khóa ngọc
  T.box(0,.4,.15,.5,.3,.12,(i,j,k)=>(i&1)?ARM(i,j,k):GOLD(i,j,k),.045,true);                          // váy giáp
  T.box(0,1.0,-.24,.6,.95,.05,(i,j,k,nx,ny)=>(i<1||i>=nx-1||j<1)?GOLD(i,j,k):DARM(i,j,k),.045,true);  // áo choàng
  T.cyl(0,1.05,-.275,.14,.02,GOLD,.02,'z',.09);T.box(0,1.05,-.28,.07,.07,.02,JADE,.02);               // huy hiệu rồng sau lưng
  T.box(0,1.38,0,.2,.14,.2,SKIN,.04,true);T.box(0,1.34,0,.44,.08,.34,GOLD,.035,true);                  // cổ + cổ giáp vàng
  for(const sx of[-1,1]){T.box(sx*.22,1.75,-.3,.03,.85,.03,GOLD,.015);T.box(sx*.22,1.92,-.4,.02,.35,.2,ARM,.02)}   // cờ lệnh sau vai
  add(b.g,T,false);
  // ---- đầu: trục ở cổ (0,1.45) để ngửa lên / cúi xuống; tọa độ khối vẽ theo hệ b.g rồi dịch ngược lại ----
  const H=new VB(true),HY=1.85;
  H.box(0,HY,0,.58,.52,.52,SKIN,.045,true);
  for(const sx of[-1,1]){
    H.box(sx*.15,HY+.07,.262,.17,.05,.03,BLK,.02);H.box(sx*.19,HY+.1,.262,.09,.04,.03,BLK,.015);     // mày xếch
    H.box(sx*.15,HY,.262,.12,.05,.03,0xffffff,.02);H.box(sx*.15,HY,.276,.05,.05,.02,BLK,.015);       // mắt
    H.box(sx*.31,HY-.08,0,.06,.3,.34,STEEL,.04,true);                                               // má giáp
  }
  H.box(0,HY-.1,.27,.1,.14,.04,SKIN,.03);
  H.box(0,HY-.13,.272,.34,.05,.04,BLK,.02);H.box(-.2,HY-.2,.272,.05,.14,.04,BLK,.02);H.box(.2,HY-.2,.272,.05,.14,.04,BLK,.02);   // ria mép
  H.box(0,HY-.28,.24,.22,.2,.08,BLK,.03,true);H.box(0,HY-.43,.24,.12,.12,.06,BLK,.03);                                        // râu dài
  H.box(0,HY-.2,.272,.12,.03,.03,0x7a2a2a,.015);
  H.ell(0,HY+.17,-.02,.34,.26,.33,STEEL,.045,true);                         // mũ sắt
  H.box(0,HY+.2,0,.62,.07,.56,GOLD,.035,true);                              // vành vàng
  H.box(0,HY+.34,.2,.1,.2,.06,GOLD,.03,true);                               // mào trước mũ
  H.cyl(0,HY+.55,0,.03,.3,GOLD,.015,'y');H.ell(0,HY+.74,0,.05,.05,.05,0xd9262c,.02);   // mũi nhọn + hạt đỏ
  for(let k=0;k<6;k++)H.ell(0,HY+.45+k*.03,-.18-k*.1,.07,.07+.01*k,.1,PLUME,.03);        // chổi lông đỏ rủ phía sau
  for(const sx of[-1,1])for(let k=0;k<6;k++)H.box(sx*(.34+.08*k),HY+.22+.1*k,-.04,.08,.12,.1,k%2?0xe3b53b:0xd9262c,.04);   // hai cánh lông trĩ vươn chéo lên
  b.hP=pivot(0,1.45);const hm=add(b.hP,H,true);hm.position.y=-1.45;
  b.lL=pivot(-.17,.6);b.lR=pivot(.17,.6);b.aL=pivot(-.46,1.27);b.aR=pivot(.46,1.27);
  // ---- chân: đùi giáp đỏ, mai che gối vàng, ống chân thép, ủng đen mũi vàng ----
  for(const l of[b.lL,b.lR]){
    const v=new VB(true);
    v.box(0,-.15,0,.28,.3,.3,ARM,.045,true);v.box(0,-.31,.17,.24,.12,.06,GOLD,.03,true);
    v.box(0,-.38,0,.3,.22,.32,STEEL,.045,true);v.box(0,-.5,0,.31,.06,.33,GOLD,.03,true);
    v.box(0,-.53,.05,.32,.14,.42,BOOT,.04,true);v.box(0,-.54,.26,.3,.1,.05,GOLD,.025);
    add(l,v,false);
  }
  // ---- tay: giáp vai vàng có gai ngọc, tay áo đỏ, hộ uyển vàng, găng thép ----
  for(const a of[b.aL,b.aR]){
    const v=new VB(true);
    v.ell(0,.04,0,.22,.14,.23,GOLD,.04,true);v.cyl(0,.2,0,.025,.12,JADE,.015,'y');
    v.box(0,-.22,0,.24,.4,.26,ARM,.045,true);v.box(0,-.38,0,.28,.14,.3,GOLD,.035,true);v.box(0,-.55,.02,.26,.2,.3,STEEL,.045,true);
    add(a,v,false);
  }
  S.add(b.g);bots.push(b);spawnBot(b);return b;
}
