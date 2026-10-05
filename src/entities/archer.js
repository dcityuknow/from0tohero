// CUNG THỦ trên Vạn Lý Trường Thành (tầng 2).
// - Dáng người gầy, cao hơn bot thường (~2,5m so với ~2,1m): mũ nhọn đen dải xanh, mắt xanh phát sáng, thắt lưng khóa bạc, ống tên sau lưng, cung cong dài (dựng riêng bằng VB, các lính dùng chung geometry).
// - Mỗi lính tuần tra MỘT ĐOẠN tường giữa 2 tháp canh (không chui vào tháp). Người chơi tới gần (CFG.flee) thì chạy dọc tường ra xa; vừa chạy vừa quay lại giương cung bắn.
//   Hết đường lùi (đầu đoạn tường) thì đứng lại bắn. Người chơi đi xa thì đứng yên.
// - Là "bot" thường (cờ b.arch): bắn trúng / lựu đạn / đồng minh đều hạ được, vỡ mảnh như bot khác. KHÔNG nằm trong bộ sinh quái (spawner.js), không bị "quái thường chết hết" khi hạ boss.
//   Hạ xong sẽ có lính khác thế chỗ sau CFG.respawn giây (nếu người chơi đứng xa).
// - Chỉ hoạt động khi người chơi ở tầng 2 và tầng 2 đã dựng xong; rời tầng thì ẩn hết.
// Phát sáng ban đêm (cùng cơ chế mắt bot): cung nâu, dây cung trắng, logo đai trắng, mắt + ngọc xanh lá. Cần bot-model.js nạp trước (botLogoGrid, BOTEYE). Màu: EG_* trong file.
// Chỉnh nhanh ở CFG. Nạp SAU boss.js / ally.js (cần sight, hurt, snd, move).
const Archer=(function(){
  const CFG={
    n:20,           // số cung thủ tối đa trên tường
    gap:8,          // mỗi đoạn tường (giữa 2 tháp) có 1 lính cho mỗi `gap` mét
    hp:70,          // máu (bot thường 100)
    range:62,       // tầm bắn ngang (m)
    cd:[2.6,4.4],   // giây giữa 2 phát bắn (ngẫu nhiên trong khoảng)
    phase:[.32,.26,.38,.22],   // giây cho từng động tác: (1) với tay ra ống tên rút tên · (2) đưa tên vào dây · (3) giương cung kéo căng rồi bắn · (4) thu tay về
    runK:.75,       // đang chạy thì mỗi động tác nhanh hơn (nhân với số này)
    speed:32,       // tốc độ mũi tên (m/s)
    g:14,           // trọng lực mũi tên (m/s²)
    dmg:10,         // sát thương mỗi mũi tên
    spread:1.2,     // độ lệch ngẫu nhiên mỗi 30m (m); đang chạy bắn lệch gấp đôi
    run:5.2,        // tốc độ chạy (m/s) - người chơi chạy 6 m/s
    flee:22,        // người chơi lại gần hơn mức này (m) thì lính chạy ra xa
    calm:32,        // người chơi xa hơn mức này thì lính thôi chạy
    scale:.92,      // tỉ lệ thân (1 = ~2,7m kể cả mũ)
    respawn:45,     // giây để có lính mới thay lính bị hạ
    show:95,        // chỉ vẽ / tính lính trong bán kính này quanh người chơi (m): nhẹ máy
    torchOn:.3,     // trời tối hơn mức này (DayCycle.cur.lamp, 0 = sáng, 1 = tối) thì cung thủ đi thắp đuốc ở các tháp canh
    walk:3.4,       // tốc độ đi bộ khi đi thắp đuốc (m/s); đi xuyên được qua tháp (cửa đã cao hơn mũ cung thủ)
    lightR:75,      // chỉ nhận thắp đuốc cách mình không quá ngần này (m dọc tường), cùng nhánh tường
    lightT:[.5,.9,.5]   // giây: giơ tay tới đuốc · giữ tay sát đuốc (hết giây này đuốc bùng cháy) · hạ tay. Thắp xong lính đi bộ về chỗ tuần tra cũ
  };
  const TWR=6+.9;   // nửa cạnh tháp canh (6) + lề: lính không bước vào phạm vi này
  const list=[],arrows=[];let placed=false,on=false,TPL=null;
  const AG=new THREE.BoxGeometry(.045,.045,1.0),AM=new THREE.MeshBasicMaterial({color:0xe8c88a}),AT=new THREE.BoxGeometry(.1,.1,.18),ATM=new THREE.MeshBasicMaterial({color:0xcfd6df});

  // ---------- PHÁT SÁNG BAN ĐÊM ----------
  // Cùng cơ chế mắt bot (bot-model.js): mỗi bộ phận phát sáng có thêm 1 BẢN PHỦ dùng CHUNG geometry, vẽ bằng vật liệu Basic (không ăn đèn). Vật liệu ẩn hẳn khi trời sáng (không tốn draw call),
  // từ nightK > .25 sáng dần, >= .9 sáng rực (cùng đường cong DayCycle.glow(.25,.9) của bot). Bản phủ KHÔNG nằm trong parts/botMeshes -> không ảnh hưởng bắn trúng / vỡ mảnh.
  //   · cung: nâu phát sáng (EG_BOW)  · dây cung: trắng (EG_STR)  · mắt + ngọc + khóa mũ: xanh lá (EG_EYE, kèm quầng sáng)  · logo thắt lưng: trắng như mắt bot (dùng chung BOTEYE)
  // Đổi màu: sửa 3 mảng EG_* (r,g,b có thể > 1 để chói; màu gốc của khối được NHÂN với mảng này).
  const EG_BOW=[2.3,1.9,1.5],EG_STR=[1.8,1.8,1.9],EG_EYE=[1.25,1.5,1.25],EG_HALO=[.45,1,.5];
  const GLS=[];
  function glowMat(Cls,from,to,opt){
    const m=new Cls(Object.assign({polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2},opt));
    m.visible=false;
    if(window.DayCycle&&DayCycle.glow)DayCycle.glow(m,from,to,.25,.9);else GLS.push({m,from,to});
    return m;
  }
  if(!(window.DayCycle&&DayCycle.glow))(function archGlowLoop(){   // daycycle.js bản cũ / chưa nạp: tự đọc độ tối DayCycle.cur.lamp mỗi khung
    requestAnimationFrame(archGlowLoop);
    const dc=window.DayCycle,k=dc&&dc.cur?dc.cur.lamp:0;
    for(const g of GLS){
      if(!(k>.25)){g.m.visible=false;continue}
      const t=Math.min(1,(k-.25)/.65),s=t*t*(3-2*t);
      g.m.visible=true;g.m.color.setRGB(g.from[0]+(g.to[0]-g.from[0])*s,g.from[1]+(g.to[1]-g.from[1])*s,g.from[2]+(g.to[2]-g.from[2])*s);
    }
  })();
  const BOWGLOW=glowMat(THREE.MeshBasicMaterial,[1,1,1],EG_BOW,{vertexColors:true}),
        STRGLOW=glowMat(THREE.MeshBasicMaterial,[1,1,1],EG_STR,{vertexColors:true}),
        EYEGLOW=glowMat(THREE.MeshBasicMaterial,[1,1,1],EG_EYE,{vertexColors:true});
  let HALO_TEX=null;
  const HALOMAT=glowMat(THREE.SpriteMaterial,[0,0,0],EG_HALO,{blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,color:0x000000,polygonOffset:false});   // quầng xanh quanh mắt: đen (không thấy) -> xanh
  function haloTex(){
    if(HALO_TEX)return HALO_TEX;
    const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);
    r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.35,'rgba(255,255,255,.55)');r.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=r;g.fillRect(0,0,64,64);HALO_TEX=new THREE.CanvasTexture(c);HALOMAT.map=HALO_TEX;HALOMAT.needsUpdate=true;return HALO_TEX;
  }
  // giữ lại mặt hướng +z (fi=4) hoặc -z (fi=5) của mỗi khối (24 đỉnh/khối, 6 mặt x 4 đỉnh theo thứ tự FACES của voxel.js) -> bản phủ logo nhẹ gấp 6 lần
  function keepFace(vb,fi){
    const P=[],N=[],C=[],I=[],nC=(vb.k/24)|0;let k=0;
    for(let c=0;c<nC;c++){
      for(let v=0;v<4;v++){const s=(c*24+fi*4+v)*3;P.push(vb.p[s],vb.p[s+1],vb.p[s+2]);N.push(vb.n[s],vb.n[s+1],vb.n[s+2]);C.push(vb.c[s],vb.c[s+1],vb.c[s+2])}
      I.push(k,k+1,k+2,k,k+2,k+3);k+=4;
    }
    vb.p=P;vb.n=N;vb.c=C;vb.i=I;vb.k=k;
  }
  // ---------- MÔ HÌNH ----------
  // Bảng màu theo ảnh mẫu: da / áo nâu be loang, da thuộc nâu, mũ đen, xanh lá (dải mũ, ngọc), bạc (khóa thắt lưng)
  const TAN=tri(0xc9a077,0xb48a62,0xdab48c),TAN2=tri(0x8f6c48,0x7c5b3b,0xa2805a),LEA=tri(0x7a4f2c,0x6a4325,0x8c5d36),LEA2=tri(0x3a2619,0x2e1d13,0x47301f),
    BLK=tri(0x17151b,0x221f27,0x0f0d13),GRN=0x1f8a3a,GLOW=0x4dff5e,SIL=0xe3e8ee,CLOTH=chk(0xcbb08a,0x9a7a56),
    PANT=tri(0xc4a074,0xad8960,0xd2b084),BELT=chk(0x9a643a,0x6e4426),BOWC=tri(0x4a2f22,0x5a3a29,0x3b261b);
  function buildBody(b){
    const add=(par,vb,head)=>{const m=vb.mesh();m.userData.bot=b;if(head)m.userData.head=true;par.add(m);botMeshes.push(m);b.parts.push({mesh:m,vb});return m};
    const pivot=(x,y)=>{const q=new THREE.Group();q.position.set(x,y,0);b.g.add(q);return q};
    // fx = các mesh phát sáng (không phải parts) để các lính sau dựng lại cùng geometry: {par: nhóm cha, mk: tạo mesh}
    const fx=b.fx=[],glow=(par,geo,mat)=>{const mk=()=>new THREE.Mesh(geo,mat);fx.push({par,mk});par.add(mk())},
      halo=(par,x,y,z,s)=>{haloTex();const mk=()=>{const sp=new THREE.Sprite(HALOMAT);sp.position.set(x,y,z);sp.scale.set(s,s,1);return sp};fx.push({par,mk});par.add(mk())};
    // thân: áo dài hẹp, thắt lưng da + khóa bạc hình số 8, dây chéo, ống tên sau lưng với 3 mũi tên lông vàng
    const T=new VB(true);
    T.box(0,1.52,0,.58,.8,.38,(i,j,k)=>(j<3?LEA2(i,j,k):CLOTH(i,j,k)),.05,true);
    T.box(0,1.2,0,.62,.28,.42,BLK,.04,true);                                                  // thắt lưng dày, cao
    // LOGO in trên đai (mặt trước + mặt sau lưng) = dữ liệu logo lấy mẫu từ ảnh gốc, DÙNG CHUNG với kính bot (botLogoGrid trong bot-model.js): đúng hình dạng, độ cong, sắc độ.
    // Trắng xám trên nền đai đen (lỗ giữa vòng để lộ đai). Ban đêm bản phủ LF/LB (chỉ mặt trước / mặt sau của khối) sáng trắng bằng BOTEYE, y hệt mắt bot.
    const LF=new VB(),LB=new VB();LF.seed=LB.seed=2;
    {const LW=.46,LS=.0125,nx=Math.round(LW/LS),ny=Math.round(nx/BLG_ASPECT),LH=LW/BLG_ASPECT,lg=botLogoGrid(nx,ny),BF=.21;   // BF = mặt trước thắt lưng
      for(const sd of[1,-1])for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){   // sd=1: mặt trước · sd=-1: mặt sau lưng (lật ngang để logo không bị ngược)
        const l=lg[j*nx+i];if(l<0)continue;
        const px=(-.5+(i+.5)/nx)*LW*sd,py=1.2+(.5-(j+.5)/ny)*LH,lc=(l<<16)|(l<<8)|l;
        T.cube(px,py,sd*(BF+.012),LS*.95,LS*.95,.024,lc,i,j,0);
        (sd>0?LF:LB).cube(px,py,sd*(BF+.014),LS*.95,LS*.95,.024,lc,i,j,0)}
    }
    keepFace(LF,4);keepFace(LB,5);
    for(let k=0;k<4;k++)T.box(.15-k*.075,1.8-k*.11,.2,.1,.13,.025,LEA2,.015);                  // dây đeo chéo từ vai phải xuống hông trái
    T.box(0,1.88,.15,.36,.12,.2,TAN2,.04,true);                                                // cổ áo
    T.box(.12,1.67,-.27,.24,.66,.2,LEA,.04,true);T.box(.12,2.02,-.27,.25,.07,.21,LEA2,.03);   // ống tên
    for(const [x,dz] of[[.04,0],[.12,.03],[.2,-.02]]){T.box(x,2.14,-.27+dz,.03,.3,.03,0x3a2619,.015);T.box(x,2.32,-.27+dz,.055,.13,.03,0xf0e04a,.015)}   // cán + lông vàng
    add(b.g,T,false);
    {const lf=LF.mesh(),lb=LB.mesh();lf.material=lb.material=BOTEYE;fx.push({par:b.g,mk:()=>new THREE.Mesh(lf.geometry,BOTEYE)},{par:b.g,mk:()=>new THREE.Mesh(lb.geometry,BOTEYE)});b.g.add(lf,lb)}   // logo đai phát sáng trắng: dùng chung BOTEYE với mắt bot (cùng màu EYEG, cùng giờ sáng/tắt)
    // đầu: mặt nâu, mắt xanh phát sáng, ngọc xanh ở cổ, mũ phù thủy đen (vành rộng, thân nhọn nhiều tầng, đỉnh cong ra sau) + dải xanh + khóa
    const H=new VB(true),HY=2.13;
    H.box(0,HY,0,.5,.5,.5,TAN,.045,true);
    const EYE=new VB(true);   // mắt + ngọc miệng + khóa mũ: mesh riêng (cùng 'head' để tính headshot), có bản phủ xanh phát sáng ban đêm
    EYE.box(-.11,HY+.03,.255,.12,.11,.02,GLOW,.02);EYE.box(.11,HY+.03,.255,.12,.11,.02,GLOW,.02);   // mắt
    EYE.box(-.11,HY+.03,.268,.06,.06,.012,0xe9ffe9,.012);EYE.box(.11,HY+.03,.268,.06,.06,.012,0xe9ffe9,.012);
    H.box(0,HY-.07,.26,.07,.1,.04,TAN2,.025);                                                  // mũi
    H.box(0,HY-.19,.26,.22,.05,.02,0x3a2619,.015);                                             // miệng
    H.box(0,HY-.17,.27,.14,.12,.07,GRN,.03);EYE.box(0,HY-.17,.31,.08,.08,.02,GLOW,.02);         // ngọc xanh ở miệng
    H.box(0,2.42,0,1.1,.06,1.1,BLK,.05,true);H.box(0,2.48,0,.78,.05,.78,BLK,.05,true);       // vành mũ
    H.box(0,2.52,0,.56,.08,.56,GRN,.03,true);H.box(0,2.52,.285,.16,.11,.02,SIL,.02);EYE.box(0,2.52,.295,.08,.06,.01,GLOW,.015);   // dải xanh + khóa
    for(let k=0;k<6;k++){const w=.5-k*.07;H.box(0,2.59+k*.12-k*.0,-k*.014,w,.125,w,BLK,.04,w>.3)}   // thân mũ nhọn dần
    H.box(0,3.32,-.1,.06,.2,.06,BLK,.02);H.box(0,3.45,-.17,.04,.18,.04,BLK,.02);              // đỉnh cong ra sau
    add(b.g,H,true);
    const em=add(b.g,EYE,true);glow(b.g,em.geometry,EYEGLOW);
    halo(b.g,-.11,HY+.03,.3,.34);halo(b.g,.11,HY+.03,.3,.34);halo(b.g,0,HY-.17,.34,.26);   // quầng xanh quanh 2 mắt + ngọc
    b.lL=pivot(-.16,1.1);b.lR=pivot(.16,1.1);b.aL=pivot(-.38,1.84);b.aR=pivot(.38,1.84);
    // chân dài và gầy: quần be, bắp chân quấn da, giày da
    for(const l of[b.lL,b.lR]){
      const v=new VB(true);
      v.box(0,-.32,0,.24,.64,.26,PANT,.045,true);v.box(0,-.82,0,.25,.4,.27,TAN2,.045,true);
      for(let k=0;k<3;k++)v.box(0,-.7-k*.1,0,.28,.06,.3,LEA,.03);                           // dây quấn bắp chân
      v.box(0,-1.02,.05,.32,.2,.44,LEA2,.04,true);v.box(0,-.9,0,.3,.07,.34,LEA,.03);
      add(l,v,false);
    }
    // tay dài: tay trái cầm cung cong dài + mũi tên đã lắp; tay phải kéo dây
    for(const a of[b.aL,b.aR]){
      const v=new VB(true);
      v.box(0,-.36,0,.17,.72,.19,TAN2,.04,true);v.box(0,-.74,0,.19,.12,.21,LEA,.03,true);v.box(0,-.84,0,.15,.1,.17,TAN,.03,true);
      v.box(0,.01,0,.24,.12,.24,LEA2,.04,true);
      if(a===b.aL){
        // cung (trục z cục bộ = chiều dọc cung khi tay giơ ngang): thân cong, bụng cung hướng ra trước (y âm), hai đầu cong về phía thân
        // cung + dây cung là MESH RIÊNG (BW / SG) để mỗi cái có bản phủ phát sáng riêng: cung nâu, dây trắng
        const BW=new VB(true),SG=new VB();
        BW.box(0,-.9,0,.08,.12,.34,BOWC,.03);
        BW.box(0,-.88,.3,.075,.11,.3,BOWC,.03);BW.box(0,-.88,-.3,.075,.11,.3,BOWC,.03);
        BW.box(0,-.82,.58,.07,.11,.28,BOWC,.03);BW.box(0,-.82,-.58,.07,.11,.28,BOWC,.03);
        BW.box(0,-.72,.82,.045,.08,.24,BOWC,.03);BW.box(0,-.72,-.82,.045,.08,.24,BOWC,.03);
        BW.box(0,-.62,1.0,.04,.07,.18,BOWC,.03);BW.box(0,-.62,-1.0,.04,.07,.18,BOWC,.03);
        SG.box(0,-.62,.0,.012,.012,2.1,0xeeeeee,.01);                                          // dây cung
        const bm=add(a,BW,false),sm=add(a,SG,false);
        glow(a,bm.geometry,BOWGLOW);glow(a,sm.geometry,STRGLOW);
      }
      add(a,v,false);
    }
  }
  // mũi tên cầm tay / mũi tên đã lắp vào dây: 1 geometry dùng chung (trục y cục bộ, đầu tên hướng -y)
  let ARWG=null;
  function arrowMesh(){
    if(!ARWG){const v=new VB();v.box(0,0,0,.028,1.0,.028,0x4a3220,.014);v.box(0,-.54,0,.07,.1,.07,0xf4f4f8,.025);v.box(0,.44,0,.06,.12,.02,0xe6d63e,.015);v.box(0,.4,0,.02,.1,.06,0xe6d63e,.015);ARWG=v.mesh().geometry}
    return new THREE.Mesh(ARWG,VMAT);   // không đưa vào botMeshes: đạn xuyên qua
  }
  function body(){   // lính đầu tiên dựng đầy đủ, các lính sau dùng chung geometry (nhẹ RAM, tức thì)
    const b={x:0,y:0,z:0,vy:0,r:.42,h:2.3,hp:CFG.hp,ground:false,respawn:0,t:0,mv:0,parts:[],g:new THREE.Group()};
    if(!TPL){buildBody(b);TPL=b}
    else{
      const pv=(x,y)=>{const q=new THREE.Group();q.position.set(x,y,0);b.g.add(q);return q};
      b.lL=pv(-.16,1.1);b.lR=pv(.16,1.1);b.aL=pv(-.38,1.84);b.aR=pv(.38,1.84);
      const mp=new Map([[TPL.g,b.g],[TPL.lL,b.lL],[TPL.lR,b.lR],[TPL.aL,b.aL],[TPL.aR,b.aR]]);
      for(const pt of TPL.parts){const m=new THREE.Mesh(pt.mesh.geometry,VMAT);m.userData.bot=b;if(pt.mesh.userData.head)m.userData.head=true;mp.get(pt.mesh.parent).add(m);botMeshes.push(m);b.parts.push({mesh:m,vb:pt.vb})}
      for(const f of TPL.fx)mp.get(f.par).add(f.mk());   // bản phủ phát sáng dùng chung geometry + vật liệu
    }
    b.hold=arrowMesh();b.hold.position.set(0,-1.0,0);b.hold.visible=false;b.aR.add(b.hold);   // tên đang cầm ở tay phải
    b.nock=arrowMesh();b.nock.position.set(0,-.9,0);b.nock.visible=false;b.aL.add(b.nock);      // tên đã lắp lên dây cung (tay trái giữ cung)
    b.ph=0;b.pt=0;b.pL=-.9;b.pRx=.15;b.pRy=0;
    b.g.scale.setScalar(CFG.scale);
    S.add(b.g);bots.push(b);
    b.arch=true;b.talker=false;b.tShow=0;b.maxhp=CFG.hp;b.on=false;b.g.visible=false;b.cd=1+Math.random()*2;b.dr=0;b.dd=undefined;b.ry=undefined;b.dir=0;b.dT=0;
    return b;
  }

  // ---------- VỊ TRÍ DỌC TƯỜNG ----------
  let GP=null;
  function surf(x,z,y0){   // mặt tường dưới chân (quét từ trên xuống)
    for(let y=y0+1.6;y>y0-1.6;y-=.1)if(hit({x,y,z,r:.15,h:.05}).length)return y+.02;
    return y0;
  }
  // toạ độ thế giới của điểm s (m dọc đường) trên nhánh bi, lệch ngang lat (m)
  function at(b,s,out){
    const B=GP.BR[b.bi],f=Math.max(0,Math.min(B.n-1.001,s/B.step)),i=f|0,u=f-i,p0=B.pts[i],p1=B.pts[i+1],a=B.pts[Math.max(0,i-1)],c=B.pts[Math.min(B.n-1,i+2)];
    const tx=c[0]-a[0],tz=c[1]-a[1],l=Math.hypot(tx,tz)||1;
    out.x=p0[0]+(p1[0]-p0[0])*u-tz/l*b.lat;out.z=p0[1]+(p1[1]-p0[1])*u+tx/l*b.lat;
    out.y=FY(1)+B.R[i]+(B.R[i+1]-B.R[i])*u+GreatWall.cfg.WH+b.yo;
    return out;
  }
  const _q={x:0,y:0,z:0},_q2={x:0,y:0,z:0};
  // Tháp canh là hình vuông cạnh 12m, xoay theo hướng đường tường (greatwall.js). Kiểm tra trực tiếp theo hình vuông đã xoay, cho mọi tháp (kể cả tháp ngã ba của nhánh kia).
  const TMARG=6+.9;
  function inTower(x,z,pad){   // tháp giờ xoay theo tường: kiểm tra trong hệ trục riêng của tháp (tx,tz = dọc đường, nx,nz = ngang)
    const m=TMARG+(pad||0),T=GP.towers;
    for(let i=0;i<T.length;i++){const t=T[i],dx=x-t.cx,dz=z-t.cz;
      if(t.tx===undefined){if(Math.abs(dx)<m&&Math.abs(dz)<m)return true}
      else if(Math.abs(dx*t.tx+dz*t.tz)<m&&Math.abs(dx*t.nx+dz*t.nz)<m)return true}
    return false}
  // vị trí s (và lệch lat) có đứng được không: không trong tháp + không đụng khối đặc ở ngang thân (lan can, thân tháp, đồi...)
  const _p={x:0,y:0,z:0};
  function okAt(b,s){
    at(b,s,_p);
    if(inTower(_p.x,_p.z,.0))return false;
    return !hitAny({x:_p.x,y:_p.y+.6,z:_p.z,r:b.r*CFG.scale,h:1.4});
  }
  function place(){
    GP=GreatWall.prep();const slots=[];
    GP.BR.forEach((B,bi)=>{
      const tw=B.twI.map(i=>i*B.step).sort((u,v)=>u-v),cuts=[0,...tw,B.len];
      for(let k=0;k<cuts.length-1;k++){
        // ước lượng thô như cũ, rồi thu hẹp lại bằng kiểm tra thật (tháp ở BẤT KỲ nhánh nào, kể cả đầu nhánh SPUR nằm trong tháp ngã ba)
        let lo=cuts[k]+(k===0?3:TWR),hi=cuts[k+1]-(k===cuts.length-2?3:TWR);
        const pr={bi,lat:0,yo:0},bad=sv=>{for(const l of[-2.2,0,2.2]){pr.lat=l;at(pr,sv,_q);if(inTower(_q.x,_q.z,0))return true}return false};   // xét cả 2 mép lệch ngang
        while(lo<hi&&bad(lo))lo+=.5;
        while(hi>lo&&bad(hi))hi-=.5;
        const len=hi-lo;
        if(len<6)continue;
        const m=Math.max(1,Math.floor(len/CFG.gap));   // số lính đoạn này
        for(let q=0;q<m;q++)slots.push({bi,lo,hi,s:lo+len*(q+.5)/m,r:((bi*977+k*131+q*17)%100)/100});
      }
    });
    slots.sort((u,v)=>u.r-v.r);slots.length=Math.min(slots.length,CFG.n);
    while(list.length<slots.length)list.push(body());
    slots.forEach((q,i)=>{const b=list[i];b.bi=q.bi;b.lo=q.lo;b.hi=q.hi;b.s=q.s;b.lat=(i&1?1:-1)*(1+q.r*1.2);b.yo=0;
      at(b,b.s,_q);const sy=surf(_q.x,_q.z,_q.y);b.yo=sy-_q.y;at(b,b.s,_q);
      // lệch ngang làm điểm đặt rơi vào tháp -> thu về giữa đường
      if(inTower(_q.x,_q.z,0)){b.lat=0;b.yo=0;at(b,b.s,_q);const sy2=surf(_q.x,_q.z,_q.y);b.yo=sy2-_q.y;at(b,b.s,_q)}
      b.x=_q.x;b.y=_q.y;b.z=_q.z;b.hp=CFG.hp;b.dd=undefined;b.vy=0;b.g.position.set(b.x,b.y,b.z);b.home={lo:b.lo,hi:b.hi,s:b.s,lat:b.lat};b.job=null});
    list.length=slots.length;placed=true;
  }

  // ---------- TÊN ----------
  function show(v){for(const b of list){b.on=v&&b.hp>0;b.g.visible=b.on}}
  function clearArrows(){for(const a of arrows)S.remove(a.m);arrows.length=0}
  function fire(b,run,d){
    const k=CFG.scale,mx=b.x+Math.sin(b.ry||0)*.6,my=b.y+1.95*k,mz=b.z+Math.cos(b.ry||0)*.6,
      sp=CFG.spread*(d/30)*(run?2:1),tx=P.x+(Math.random()-.5)*sp,ty=P.y+1.0+(Math.random()-.5)*sp*.5,tz=P.z+(Math.random()-.5)*sp,
      ex=tx-mx,ey=ty-my,ez=tz-mz,D=Math.hypot(ex,ey,ez),T=Math.max(.15,D/CFG.speed);
    const m=new THREE.Group(),sh=new THREE.Mesh(AG,AM),tip=new THREE.Mesh(AT,ATM);tip.position.z=.52;m.add(sh);m.add(tip);m.position.set(mx,my,mz);S.add(m);
    arrows.push({m,x:mx,y:my,z:mz,vx:ex/T,vy:(ey+.5*CFG.g*T*T)/T,vz:ez/T,life:T+1.5});
    snd(190+Math.random()*50,.14,'triangle',.06*GV,m.position);
  }
  function tickArrows(dt){
    for(let i=arrows.length-1;i>=0;i--){
      const a=arrows[i];let gone=false;a.life-=dt;
      const n=Math.max(1,Math.ceil(CFG.speed*dt/.3)),s=dt/n;
      for(let k=0;k<n&&!gone;k++){
        a.vy-=CFG.g*s;a.x+=a.vx*s;a.y+=a.vy*s;a.z+=a.vz*s;
        const gy=FY(1)+(window.Nature&&Nature.heightAt?Nature.heightAt(1,a.x,a.z):0);
        if(a.y<gy||hitAny({x:a.x,y:a.y-.03,z:a.z,r:.04,h:.06}))gone=true;
        else if(!dead&&Math.hypot(P.x-a.x,P.z-a.z)<P.r+.2&&a.y>P.y&&a.y<P.y+P.h){hurt(CFG.dmg);gone=true;snd(120,.1,'square',.05*GV)}
      }
      if(gone||a.life<=0){S.remove(a.m);arrows.splice(i,1)}
      else{a.m.position.set(a.x,a.y,a.z);a.m.lookAt(a.x+a.vx,a.y+a.vy,a.z+a.vz)}
    }
  }

  // ---------- THẮP ĐUỐC ----------
  // Trời tối (lamp > CFG.torchOn): cung thủ nào đang rảnh (người chơi không ở gần) nhận ngọn đuốc chưa thắp + chưa ai nhận gần nhất trên cùng nhánh tường,
  // đi bộ tới (xuyên qua tháp nếu cần), quay mặt về đuốc, giơ tay phải, đuốc bùng cháy, rồi đi về chỗ tuần tra cũ. Đuốc tự tắt khi trời sáng (greatwall.js).
  const lamp=()=>{const dc=window.DayCycle;return dc&&dc.cur&&typeof dc.cur.lamp==='number'?dc.cur.lamp:0};
  function pickTorch(b){
    const T=window.GreatWall&&GreatWall.torches;if(!T)return null;
    let best=null,bd=CFG.lightR;
    for(const t of T){if(t.lit||t.claim||t.b!==b.bi)continue;const d=Math.abs(t.s-b.s);if(d<bd){bd=d;best=t}}
    return best;
  }
  function dropJob(b){if(b.job&&b.job.t.claim===b)b.job.t.claim=null;b.job=null}
  function walkTo(b,s,lat,dt){   // đi bộ tới (s,lat); trả về true nếu đã tới
    const ds=s-b.s,st=Math.min(Math.abs(ds),CFG.walk*dt);
    if(st>0){b.s+=Math.sign(ds)*st;b.dir=Math.sign(ds)}
    b.lat+=(lat-b.lat)*Math.min(1,dt*3);
    return Math.abs(s-b.s)<.05&&Math.abs(lat-b.lat)<.15;
  }
  function jobStep(b,dt,day){   // trả về 1 nếu đang đi bộ (để chạy hoạt cảnh chân)
    const J=b.job,T=J.t;let mv=0;
    if(J.ph<2&&(day||(T.lit&&J.ph===0))){if(T.claim===b)T.claim=null;J.ph=2}   // trời sáng hoặc đuốc đã có lửa: về
    if(J.ph===0){mv=1;if(walkTo(b,T.s,T.lat,dt)){J.ph=1;J.tm=0}}
    else if(J.ph===1){
      J.tm+=dt;const [a,h,l]=CFG.lightT;
      if(!T.lit&&J.tm>=a+h){GreatWall.lightTorch(T);snd(420,.18,'sawtooth',.05*GV,{x:T.x,y:T.y,z:T.z});snd(180,.3,'triangle',.04*GV,{x:T.x,y:T.y,z:T.z})}
      if(J.tm>=a+h+l){if(T.claim===b)T.claim=null;J.ph=2}
    }else{
      const H=b.home;
      if(walkTo(b,H.s,H.lat,dt)){b.lo=H.lo;b.hi=H.hi;b.dir=0;b.job=null}else mv=1;
    }
    return mv;
  }

  // ---------- VÒNG LẶP ----------
  const turn=(b,ty,k)=>{if(b.ry===undefined)b.ry=ty;let da=ty-b.ry;da=Math.atan2(Math.sin(da),Math.cos(da));b.ry+=da*Math.min(1,k)};
  function tick(dt){
    const act=curFl===1&&window.FM&&FM.has(1);
    if(!act){if(on){on=false;show(false);clearArrows();for(const b of list)dropJob(b);if(window.GreatWall&&GreatWall.torchIdle)GreatWall.torchIdle()}return}
    if(!placed)place();
    if(!on){on=true;for(const b of list)if(b.dd===undefined&&b.hp>0){b.cd=1+Math.random()*2;b.ph=0}}
    const lampV=lamp(),night=lampV>CFG.torchOn;
    for(const b of list){
      let dx=P.x-b.x,dz=P.z-b.z,d=Math.hypot(dx,dz);
      if(b.hp<=0){   // bị hạ: chờ lính thay (chỉ khi người chơi đứng xa để không "hiện hình" trước mặt)
        b.on=false;b.g.visible=false;if(b.job)dropJob(b);if(b.dd===undefined)b.dd=CFG.respawn;
        if((b.dd-=dt)<=0&&d>40){b.hp=CFG.hp;b.dd=undefined;b.cd=2;b.ph=0;b.mv=0;b.hold.visible=b.nock.visible=false;if(b.home){b.s=b.home.s;b.lat=b.home.lat;b.lo=b.home.lo;b.hi=b.home.hi}}
        continue;
      }
      if(d>CFG.show){b.on=false;b.g.visible=false;continue}
      b.on=true;b.g.visible=true;
      // ---- chạy dọc tường ra xa người chơi ----
      const dyp=P.y-b.y;let mv=0;
      if(!b.job&&!dead&&night&&d>CFG.flee&&b.home){const t=pickTorch(b);if(t){t.claim=b;b.job={t,ph:0,tm:0};b.dir=0}}   // tối rồi + người chơi không ở gần: nhận đi thắp đuốc
      if(b.job)mv=jobStep(b,dt,lampV<.15);
      else if(!dead&&Math.abs(dyp)<30){
        if(d<CFG.flee){
          b.dT-=dt;
          if(b.dT<=0||b.dir===0){   // chọn hướng làm tăng khoảng cách tới người chơi (giữ hướng ~.6s cho khỏi giật)
            at(b,Math.min(b.hi,b.s+2),_q);at(b,Math.max(b.lo,b.s-2),_q2);
            const dF=Math.hypot(P.x-_q.x,P.z-_q.z),dB=Math.hypot(P.x-_q2.x,P.z-_q2.z);
            b.dir=dF>dB?1:-1;b.dT=.6;
          }
          let room=b.dir>0?b.hi-b.s:b.s-b.lo;
          for(const o of list)if(o!==b&&o.hp>0&&o.bi===b.bi&&(o.s-b.s)*b.dir>0&&Math.abs(o.s-b.s)<1.4)room=0;   // đồng đội chặn đường: không xuyên nhau
          if(room>.2){const st=Math.min(room,CFG.run*dt);if(okAt(b,b.s+b.dir*(st+.5))){b.s+=b.dir*st;mv=1}}   // dò trước 0.5m: sắp chạm tháp/tường thì dừng (không xuyên)
          else b.dir=-b.dir*(Math.random()<.02?1:0)||0;   // cụt đường: đứng lại bắn (thỉnh thoảng thử quay đầu)
        }else if(d>CFG.calm)b.dir=0;
      }
      at(b,b.s,_q);b.x=_q.x;b.y=_q.y;b.z=_q.z;dx=P.x-b.x;dz=P.z-b.z;d=Math.hypot(dx,dz);
      // người chơi không được đi xuyên lính (đẩy ra qua move() nên không bị đẩy vào tường)
      if(!dead&&d<P.r+b.r&&Math.abs(P.y-b.y)<1.6){const o=P.r+b.r-d+.01,ux=d>1e-3?dx/d:1,uz=d>1e-3?dz/d:0,g0=P.ground;move(P,ux*o,0,uz*o);P.ground=g0}
      // ---- ngắm / bắn ----
      const aim=!dead&&d<CFG.range&&dyp>-26&&dyp<22,rk=mv?CFG.runK:1;
      b.cd-=dt;
      const lighting=b.job&&b.job.ph===1;   // đang giơ tay thắp đuốc: không rút tên
      if(b.ph===0){if(aim&&!lighting&&b.cd<=0&&sight(b)){b.ph=1;b.pt=CFG.phase[0]*rk}}
      else{
        b.pt-=dt;
        if(b.pt<=0){
          if(b.ph===3){if(aim&&sight(b))fire(b,mv,d);b.nock.visible=false;b.cd=CFG.cd[0]+Math.random()*(CFG.cd[1]-CFG.cd[0])}   // thả dây: tên bay
          if(b.ph===1){b.hold.visible=true}                    // vừa rút được tên khỏi ống
          if(b.ph===2){b.hold.visible=false;b.nock.visible=true}   // tên đã vào dây
          if(b.ph===4){b.ph=0}else{b.ph++;b.pt=CFG.phase[b.ph-1]*rk}
        }
      }
      // ---- hướng người: đang giương cung thì quay mặt về phía người chơi; đang chạy thì nhìn theo hướng chạy ----
      const toP=Math.atan2(dx,dz);
      if(lighting&&b.ph===0)turn(b,Math.atan2(b.job.t.x-b.x,b.job.t.z-b.z),dt*8);   // quay mặt về ngọn đuốc đang thắp
      else if(b.ph>0||!mv)turn(b,toP,dt*8);
      else if(b.job){at(b,b.s+b.dir*2,_q2);turn(b,Math.atan2(_q2.x-b.x,_q2.z-b.z),dt*10)}   // đi thắp đuốc: nhìn theo hướng đi (không bị kẹp trong đoạn tường tuần tra)
      else{at(b,Math.max(b.lo,Math.min(b.hi,b.s+b.dir)),_q2);turn(b,Math.atan2(_q2.x-b.x,_q2.z-b.z),dt*10)}
      b.g.rotation.y=b.ry;
      // ---- hoạt cảnh: chân chạy, tay trái giơ cung, tay phải kéo dây ----
      b.mv+=(mv-b.mv)*Math.min(1,dt*8);b.t+=dt*10*b.mv;
      const sw=Math.sin(b.t)*.85*b.mv;
      b.lL.rotation.x=sw;b.lR.rotation.x=-sw;
      // tay: nghỉ -> (1) tay phải với ra sau lưng tới ống tên, tay trái nâng cung -> (2) đưa tên về phía dây -> (3) kéo dây căng -> (4) thu về
      const ph=b.ph,pr=ph?1-Math.max(0,b.pt)/(CFG.phase[ph-1]*rk):0,L=(a,c,t)=>a+(c-a)*t;
      let tL=-.9,tRx=.15,tRy=0;
      if(ph===1){tL=L(-.9,-1.5,pr);tRx=L(.15,2.4,pr);tRy=L(0,-.2,pr)}
      else if(ph===2){tL=-1.5;tRx=L(2.4,-1.3,pr);tRy=L(-.2,-.55,pr)}
      else if(ph===3){tL=-1.5;tRx=L(-1.3,-.9,pr);tRy=L(-.55,-.8,pr)}
      else if(ph===4){tL=L(-1.5,-.9,pr);tRx=L(-.9,.15,pr);tRy=L(-.8,0,pr)}
      if(lighting&&ph===0){   // tay phải giơ chếch lên phía trước tới ngọn đuốc, run nhẹ lúc châm lửa
        const [ta,th,tl]=CFG.lightT,tm=b.job.tm,u=tm<ta?tm/ta:tm<ta+th?1:Math.max(0,1-(tm-ta-th)/tl);
        tRx=L(.15,-2.3,u)+(u>=1?Math.sin(tm*38)*.06:0);
      }
      const k=Math.min(1,dt*14);b.pL+=(tL-b.pL)*k;b.pRx+=(tRx-b.pRx)*k;b.pRy+=(tRy-b.pRy)*k;
      b.aL.rotation.x=b.pL;b.aR.rotation.x=b.pRx;b.aR.rotation.z=b.pRy;   // z (không phải y): xoay y quanh trục cánh tay sẽ không thấy gì
      
      b.nock.position.y=-.9+(ph===3?.38*pr:0);   // tên được kéo lùi về phía thân cùng dây
      b.g.position.set(b.x,b.y+Math.abs(Math.sin(b.t))*.06*b.mv,b.z);
      if(b.mv>.5&&Math.sin(b.t)*Math.sin(b.t-dt*10*b.mv)<0&&d<16)botStepSnd(b.g.position,false);
    }
    tickArrows(dt);
    if(window.GreatWall&&GreatWall.torchTick)GreatWall.torchTick(dt);   // lửa đuốc nhấp nháy + đèn thật (greatwall.js); chỉ chạy khi người chơi ở tầng 2
  }
  function reset(){clearArrows();if(window.GreatWall&&GreatWall.torchReset)GreatWall.torchReset();for(const b of list){dropJob(b);if(b.home){b.s=b.home.s;b.lat=b.home.lat;b.lo=b.home.lo;b.hi=b.home.hi}b.hp=CFG.hp;b.dd=undefined;b.ph=0;b.dir=0;b.mv=0;b.hold.visible=b.nock.visible=false}on=false;show(false)}
  return {tick,reset,cfg:CFG,list};
})();
