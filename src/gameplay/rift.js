// ============================================================================
// LỖ HỔNG KHÔNG GIAN (Rift): cổng sang thế giới Optimum World (game 1) trong 1 iframe toàn màn hình.
// Đặt file này ở: src/gameplay/rift.js  (khai báo trong src/loader.js, sau 'gameplay/fall.js')
// Cần (nạp trước): THREE, S, C, P, yaw, playing, dead (core.js, state.js, main.js)
// Dùng tên Rift (không đụng world/common/portal.js - cổng thang máy của game).
//
// CÁCH HOẠT ĐỘNG (bản mới):
//  - Cổng thỉnh thoảng xuất hiện trước mặt người chơi, rồi TỒN TẠI MÃI (không tự biến mất, không biến mất sau khi bước vào).
//  - Bước qua cổng -> sang Optimum World. Bên đó cũng có 1 cổng; bước qua cổng đó (hoặc bấm "Quay lại") -> về lại đây,
//    đứng ngay trước cổng. Có thể đi qua đi lại giữa 2 thế giới bao nhiêu lần tuỳ ý.
//  - Hình cổng: vành voxel xanh + vòng xoáy tia lửa cam ở giữa + cửa sổ nhìn thấy cảnh Optimum World (ảnh chụp nhúng sẵn).
//  - Game kia được TẢI SẴN (ẩn) khi cổng xuất hiện và giữ lại: bước vào là có ngay (không load, không đen màn hình);
//    khi ở game bạn thì game kia tự dừng vẽ + tắt âm thanh.
//  - BOT chạy theo qua cổng: bot thường ở Block Arena chạy tới cổng là chui qua và đuổi theo bạn bên Optimum; bot bên đó cũng chạy theo bạn về.
//    Trong lúc ở game kia, nhân vật này không bị mất máu (game vẫn chạy ngầm).
//  - Qua cổng xong, cổng luôn nằm SAU LƯNG nhân vật (quay mặt ra xa cổng): cứ đi tới là rời xa, không bị lọt ngược vào cổng.
//  - Game kia báo "đã bước qua cổng" bằng postMessage({type:'optimum-rift-back'}) (xem js/visit-portal.js bên optimum-world).
// Lệnh thử: Rift.spawn() mở cổng ngay · Rift.leave() về từ game kia · Rift.close() xoá cổng · Rift.inside (đang ở game kia?)
// ============================================================================
(function(){
  const RIFT={
    chance:.05,        // 5% mỗi lần tung xúc xắc (chỉ tung khi chưa có cổng)
    every:30000,       // ms giữa 2 lần tung (30 giây)
    preload:true,      // tải sẵn Optimum World (ẩn) ngay khi cổng xuất hiện -> bước vào là có ngay, không phải chờ load / đen màn hình
    follow:true,       // bot Block Arena chạy theo qua cổng (và bot bên Optimum chạy theo về)
    followMax:16,      // tối đa số bot chạy qua cổng mỗi lần bạn sang game kia
    backGap:4.5,       // m: về lại đứng cách cổng chừng này (phía mình đã đi vào)
    // Game 1 (Optimum World) đã deploy trên GitHub Pages. ?visit=1 = chế độ tham quan (js/visit-mode.js bên game 1)
    url:'https://dcityuknow.github.io/optimum-world/?visit=1',
    // --- hình dáng cổng ---
    radius:2.2,        // bán kính gốc (m)
    blue:1.45,         // phần xanh rộng gấp chừng này lần bán kính gốc
    lift:.8,           // đáy phần xanh cách mặt đất chừng này (m)
    size:1,            // nhân kích thước cả cổng (vd .8 cho nhỏ lại; vùng bước vào tự co theo)
    hole:.62,          // bán kính cửa sổ nhìn sang thế giới khác (tỉ lệ so với phần xanh)
    openT:1.2,         // giây: cổng nở ra khi xuất hiện
    sparks:70,         // số mảnh vụn voxel bay quanh
    embers:900,        // số tia lửa của vòng xoáy lửa (máy yếu giật thì hạ còn ~500)
    color:0xff8a30,    // màu đèn điểm (ánh lửa cam hắt xuống đất)
    preview:null       // đường dẫn ảnh cảnh game kia (vd 'assets/rift-view.jpg'); null = dùng ảnh chụp nhúng sẵn bên dưới
  };

  // ==========================================================================
  // ĐỒ HOẠ CỔNG (dùng chung cho cả 2 game, cùng 1 đoạn code):
  //  - vành voxel trong suốt xanh uốn lượn + quầng khói đen (kiểu cổng thang máy portal.js)
  //  - vòng xoáy TIA LỬA cam ở giữa (như ảnh mẫu), bên trong là "cửa sổ" nhìn thấy cảnh của game bên kia
  //    (ảnh chụp thật của game kia, méo lượn sóng + xoáy nhẹ + dịch theo góc nhìn)
  // makePortalGfx({scene,preview,...}) -> {build(x,y,z,yawN), animate(p,dt,remain,camPos), dispose(p), RB}
  // ==========================================================================
  function makePortalGfx(cfg){
    const RADIUS=cfg.radius||2.2,BLUE=cfg.blue||1.45,HOLE=cfg.hole||.62,SIZE=cfg.size||1,LIFT=cfg.lift==null?.8:cfg.lift,
      OPENT=cfg.openT||1.2,CLOSET=cfg.closeT||2,NSP=cfg.sparks==null?70:cfg.sparks,NEMB=cfg.embers||900,LCOL=cfg.color||0xff8a30;
    const RB=RADIUS*BLUE;   // bán kính phần xanh (m, trước khi nhân size)
    const VS=.2,GC=25,GZ=9,MAXB=9000,MAXH=7000,HALO=2.25/BLUE,LAYS=5;
    const STOPS=[[0,[.02,.08,.38]],[.35,[.08,.38,.95]],[.65,[.36,.74,1]],[1,[.9,.99,1]]];
    const hh=(a,b,c)=>{const x=Math.sin(a*127.1+b*311.7+c*74.7)*43758.5453;return x-Math.floor(x)};
    const ss=(a,b,x)=>{x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x)};
    const vn=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y);let fx=x-ix,fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
      const a=hh(ix,iy,1),b=hh(ix+1,iy,1),c=hh(ix,iy+1,1),d=hh(ix+1,iy+1,1);return(a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy};
    const _c=[0,0,0];
    function grad(v){v=Math.min(1,Math.max(0,v));for(let q=1;q<STOPS.length;q++)if(v<=STOPS[q][0]){const a=STOPS[q-1],b=STOPS[q],t=(v-a[0])/(b[0]-a[0]);for(let c=0;c<3;c++)_c[c]=a[1][c]+(b[1][c]-a[1][c])*t;return _c}
      return STOPS[STOPS.length-1][1]}
    const occ=new Int32Array(2*GZ+1);let stamp=0;
    const wave=(px,py,an,r,rc,T,ph)=>Math.sin(px*2.7+T*1.3+ph)*Math.sin(py*2.4-T*1.1+ph*1.7)*.2+Math.sin(an*3+T*1.6+ph)*.2*ss(.45,1.15,r)+Math.sin(an*7-T*2.1+ph*.6)*.07*ss(.6,1.2,r)-.16*(1-rc)*(1-rc);
    // s (0..1) = mức nguyên vẹn: khối rụng dần khi cổng mở / đóng
    function field(T,s,R,o){
      let n=0,nh=0;const B=o.pos,BC=o.col,H=o.posH,HC=o.colH;
      for(let i=0;i<=2*GC;i++)for(let j=0;j<=2*GC;j++){
        const x=(i-GC)*VS,y=(j-GC)*VS,px=x/R,py=y/R,r=Math.hypot(px,py);if(r>HALO)continue;
        const an=Math.atan2(py,px),rc=Math.min(r,1);
        const edge=1+.07*Math.sin(an*5+T*1.7)+.05*Math.sin(an*9-T*2.4)+.03*Math.sin(an*14+T*3.3);
        stamp++;
        if(r<edge+.06&&r>=HOLE){   // r<HOLE: để trống cho cửa sổ nhìn sang thế giới khác
          const sw=(1-rc)*3.2+T*.55,cs=Math.cos(sw),sn=Math.sin(sw),qx=cs*px-sn*py,qy=sn*px+cs*py;
          const v0=.5+.36*Math.sin(an*3-r*8+T*1.4)+(vn(qx*2.6+T*.25,qy*2.6+T*.25)-.5)*.55+(1-rc)*.25;
          const rim=ss(edge-.16,edge-.02,r);
          for(let l=0;l<LAYS;l++){
            const el=edge+(l-(LAYS-1)/2)*.035;if(r>=el)continue;
            const zc=R*wave(px,py,an,r,rc,T,l*1.1)+(l-(LAYS-1)/2)*.2,k=Math.round(zc/VS);
            if(k<-GZ||k>GZ||occ[k+GZ]===stamp)continue;occ[k+GZ]=stamp;
            if(hh(i,j,k+l*17)>s||n>=MAXB)continue;
            const c=grad(Math.max(v0+(l-(LAYS-1)/2)*.07,rim*.8)),jt=((i+j+k)&1)?.94:1;
            B[n*3]=x;B[n*3+1]=y;B[n*3+2]=k*VS;BC[n*3]=c[0]*jt;BC[n*3+1]=c[1]*jt;BC[n*3+2]=c[2]*jt;n++;
          }
        }
        if(r>edge-.02){
          const d=r-edge,fw=(.12+.055*vn(px*2+T*.2,py*2-T*.15))*3;
          const keep=Math.pow(1-Math.max(0,d)/fw,.7),tq=Math.floor(T*2.5);
          for(let l=0;l<3;l++){
            const zc=R*wave(px,py,an,r,rc,T,l*2.3+.7)+(l-1)*.45,k=Math.round(zc/VS);
            if(k<-GZ||k>GZ||hh(i,j,k+l*31)>s||nh>=MAXH)continue;
            if(hh(i+tq,j+l,k+tq*3)>keep*.95)continue;
            HC[nh*3]=.02;HC[nh*3+1]=.03;HC[nh*3+2]=.12;H[nh*3]=x;H[nh*3+1]=y;H[nh*3+2]=k*VS;nh++;
          }
        }
      }
      o.n=n;o.nh=nh;return o;
    }
    const _out={pos:new Float32Array(MAXB*3),col:new Float32Array(MAXB*3),posH:new Float32Array(MAXH*3),colH:new Float32Array(MAXH*3),n:0,nh:0};
    const FACE=[.84,.68,1,.52,.93,.76];   // độ sáng riêng từng mặt khối -> thấy rõ hình khối dù vật liệu không phụ thuộc ánh sáng
    function voxGeo(sz){const g=new THREE.BoxGeometry(sz,sz,sz),c=new Float32Array(24*3);
      for(let f=0;f<6;f++)for(let v=0;v<4;v++){const o=(f*4+v)*3;c[o]=c[o+1]=c[o+2]=FACE[f]}
      g.setAttribute('color',new THREE.BufferAttribute(c,3));return g}
    // InstancedMesh r128: phải gọi setColorAt khi count còn đầy, rồi mới đặt count=0
    function instMesh(geo,N,opacity,order){
      const m=new THREE.MeshBasicMaterial({fog:false,vertexColors:true,transparent:opacity<1,opacity,depthWrite:false});
      const im=new THREE.InstancedMesh(geo,m,N);im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);im.frustumCulled=false;im.renderOrder=order;
      im.setColorAt(0,new THREE.Color());im.count=0;return im}
    function fill(im,n,pos,col,m,c){
      for(let i=0;i<n;i++){m.makeTranslation(pos[i*3],pos[i*3+1],pos[i*3+2]);im.setMatrixAt(i,m);c.setRGB(col[i*3],col[i*3+1],col[i*3+2]);im.setColorAt(i,c)}
      im.count=n;im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true}

    // ---- cửa sổ sang thế giới khác ----
    let viewTex=null;
    function getViewTex(){
      if(viewTex)return viewTex;
      const img=new Image();
      viewTex=new THREE.Texture(img);
      viewTex.minFilter=viewTex.magFilter=THREE.LinearFilter;viewTex.generateMipmaps=false;
      viewTex.wrapS=viewTex.wrapT=THREE.ClampToEdgeWrapping;
      img.onload=()=>{viewTex.needsUpdate=true};
      img.src=cfg.preview;
      return viewTex;
    }
    const WIN_VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
    const WIN_FS=[
      'uniform sampler2D map;uniform float uT,uA;uniform vec2 uShift;varying vec2 vUv;',
      'void main(){',
      ' vec2 c=vUv-.5;float r=length(c)*2.;',
      ' float tw=(1.-r)*.22*sin(uT*.5);float cs=cos(tw),sn=sin(tw);c=vec2(cs*c.x-sn*c.y,sn*c.x+cs*c.y);',   // xoáy nhẹ quanh tâm
      ' vec2 d=vec2(sin(c.y*22.+uT*2.3)+.5*sin(c.y*47.-uT*3.1),.55*sin(c.x*11.+uT*1.7))*.011*(.35+r);',      // méo lượn sóng như mặt nước / kính vỡ
      ' vec2 uv=.5+c*.9+d+uShift;',
      ' vec3 col=texture2D(map,clamp(uv,.002,.998)).rgb;',
      ' col*=.9+.1*sin(uT*1.3+r*5.);',
      ' col=mix(col,vec3(1.,.52,.14),smoothstep(.8,1.,r)*.35);',                                              // viền ánh lửa
      ' gl_FragColor=vec4(col,uA*(1.-smoothstep(.94,1.,r)));',
      '}'].join('\n');
    // ---- tia lửa: điểm sáng cộng màu, bay xoáy rồi tản ra, trắng vàng -> cam -> đỏ sẫm ----
    const EMB_VS=[
      'attribute float aSize;attribute vec4 aCol;varying vec4 vCol;',
      'void main(){vCol=aCol;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*520./max(.5,-mv.z);gl_Position=projectionMatrix*mv;}'].join('\n');
    const EMB_FS=[
      'varying vec4 vCol;',
      'void main(){vec2 q=gl_PointCoord-.5;float d=length(q)*2.;if(d>1.)discard;float a=pow(1.-d,1.6);gl_FragColor=vec4(vCol.rgb*(.6+.8*a),vCol.a*a);}'].join('\n');
    const _cl=[0,0,0];
    function fire(u){
      if(u<.25){const k=u/.25;_cl[0]=1;_cl[1]=.95-.3*k;_cl[2]=.7-.5*k}
      else if(u<.7){const k=(u-.25)/.45;_cl[0]=1;_cl[1]=.65-.3*k;_cl[2]=.2-.12*k}
      else{const k=(u-.7)/.3;_cl[0]=1-.45*k;_cl[1]=.35-.25*k;_cl[2]=.08*(1-k)}
      return _cl}

    function build(x,y,z,yawN){
      const g=new THREE.Group();
      g.position.set(x,y+RB*SIZE+LIFT,z);g.rotation.y=yawN;
      const bg=voxGeo(VS),im=instMesh(bg,MAXB,.5,3),hm=instMesh(bg,MAXH,.6,2);g.add(hm);g.add(im);
      // mảnh vụn voxel nhỏ bay lơ lửng quanh và xuyên qua cổng
      const sg=voxGeo(.12),sm=new THREE.MeshBasicMaterial({fog:false,vertexColors:true});
      const sp=new THREE.InstancedMesh(sg,sm,NSP);sp.instanceMatrix.setUsage(THREE.DynamicDrawUsage);sp.frustumCulled=false;sp.renderOrder=4;
      const pd=[],cc=new THREE.Color();
      for(let i=0;i<NSP;i++){
        pd.push({a:Math.random()*6.283,r:RADIUS*(.25+Math.random()*1.15),dr:RADIUS*(.1+Math.random()*.45),w:(Math.random()-.5)*.5,z:(Math.random()-.5)*1.8,ph:Math.random(),sp:.12+Math.random()*.3});
        const k=Math.random();cc.setRGB(.45+.5*k,.8+.2*k,1);sp.setColorAt(i,cc);
      }
      g.add(sp);
      let lt=null;if(cfg.light){lt=new THREE.PointLight(LCOL,2,16);g.add(lt)}
      // cửa sổ
      const WR=HOLE*RB*1.04;
      const wm=new THREE.ShaderMaterial({uniforms:{map:{value:getViewTex()},uT:{value:0},uA:{value:0},uShift:{value:new THREE.Vector2(0,0)}},
        vertexShader:WIN_VS,fragmentShader:WIN_FS,transparent:true,depthWrite:false,side:THREE.DoubleSide});
      wm.fog=false;
      const win=new THREE.Mesh(new THREE.CircleGeometry(WR,48),wm);win.renderOrder=1;win.frustumCulled=false;g.add(win);
      // vòng lửa liền mạch ở mép cửa sổ
      const rm=new THREE.MeshBasicMaterial({color:0xff9a2a,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false});
      const ring=new THREE.Mesh(new THREE.TorusGeometry(WR*1.02,.12,8,64),rm);ring.renderOrder=5;g.add(ring);
      const rm2=new THREE.MeshBasicMaterial({color:0xfff2c0,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false});
      const ring2=new THREE.Mesh(new THREE.TorusGeometry(WR*1.02,.035,6,64),rm2);ring2.renderOrder=6;g.add(ring2);
      // tia lửa
      const ep=new Float32Array(NEMB*3),ec=new Float32Array(NEMB*4),es=new Float32Array(NEMB),ed=[];
      for(let i=0;i<NEMB;i++)ed.push({a:Math.random()*6.283,w:(1.3+Math.random()*1.6)*(Math.random()<.85?1:-.6),ph:Math.random(),rate:.25+Math.random()*.55,
        r0:WR*(.97+Math.random()*.1),sp:WR*(.15+Math.random()*.95),z:(Math.random()-.5)*.6,sz:.14+Math.random()*.26,tw:Math.random()*6.283});
      const eg=new THREE.BufferGeometry();
      eg.setAttribute('position',new THREE.BufferAttribute(ep,3));eg.setAttribute('aCol',new THREE.BufferAttribute(ec,4));eg.setAttribute('aSize',new THREE.BufferAttribute(es,1));
      const em=new THREE.ShaderMaterial({vertexShader:EMB_VS,fragmentShader:EMB_FS,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
      em.fog=false;
      const emb=new THREE.Points(eg,em);emb.frustumCulled=false;emb.renderOrder=7;g.add(emb);
      g.scale.setScalar(.55*SIZE);
      cfg.scene.add(g);
      return {g,im,hm,bg,sp,sg,sm,pd,lt,wm,win,ring,rm,ring2,rm2,eg,em,ep,ec,es,ed,m4:new THREE.Matrix4(),cc,age:0,acc:1,s:0,
        x,z,nx:Math.sin(yawN),nz:Math.cos(yawN),ry:y};
    }

    // remain = số giây còn lại trước khi cổng đóng (Infinity = tồn tại mãi); camPos = vị trí camera (cho parallax)
    function animate(p,dt,remain,camPos){
      p.age+=dt;
      let s=Math.min(1,p.age/OPENT);s=s*s*(3-2*s);
      if(remain<CLOSET)s*=Math.max(0,remain/CLOSET);
      p.s=s;p.g.scale.setScalar((.55+.45*s)*SIZE);
      p.acc+=dt;
      if(p.acc>=.05){   // 20 lần/giây: đủ mượt, nhẹ CPU
        p.acc=0;field(p.age,s,RB,_out);
        fill(p.im,_out.n,_out.pos,_out.col,p.m4,p.cc);fill(p.hm,_out.nh,_out.posH,_out.colH,p.m4,p.cc);
      }
      const sp=p.sp,m=p.m4;
      for(let i=0;i<p.pd.length;i++){
        const q=p.pd[i];q.a+=q.w*dt;const o=(p.age*q.sp+q.ph)%1,r=q.r+o*q.dr,zz=q.z+Math.sin(p.age*.8+q.ph*6)*.25;
        m.makeTranslation(Math.round(Math.cos(q.a)*r/.12)*.12,Math.round(Math.sin(q.a)*r/.12)*.12,Math.round(zz/.12)*.12);sp.setMatrixAt(i,m);
      }
      sp.count=Math.round(p.pd.length*Math.min(1,s*1.3));sp.instanceMatrix.needsUpdate=true;
      if(p.lt)p.lt.intensity=(1.6+.5*Math.sin(p.age*5))*s;
      // cửa sổ: thời gian + dịch theo góc nhìn (parallax)
      const u=p.wm.uniforms;u.uT.value=p.age;u.uA.value=s;
      if(camPos){const lc=p.g.worldToLocal(camPos.clone()),ld=Math.max(1,Math.hypot(lc.x,lc.y,lc.z));u.uShift.value.set(-lc.x/ld*.12,-lc.y/ld*.12)}
      const pulse=.85+.15*Math.sin(p.age*7);
      p.rm.opacity=.7*s*pulse;p.rm2.opacity=.3*s*pulse;
      // tia lửa xoáy: bay quanh vòng, tản ra ngoài, nhỏ dần + đổi màu theo tuổi
      const ep=p.ep,ec=p.ec,es=p.es,ed=p.ed;
      for(let i=0;i<ed.length;i++){
        const q=ed[i],k=(p.age*q.rate+q.ph)%1,a=q.a+q.w*p.age+k*1.4,r=q.r0+k*k*q.sp;
        ep[i*3]=Math.cos(a)*r;ep[i*3+1]=Math.sin(a)*r;ep[i*3+2]=q.z*(.4+k*2);
        const c=fire(k),fl=.75+.25*Math.sin(p.age*30+q.tw);
        ec[i*4]=c[0]*fl;ec[i*4+1]=c[1]*fl;ec[i*4+2]=c[2]*fl;ec[i*4+3]=(1-k)*(k<.06?k/.06:1)*s;
        es[i]=q.sz*(1.15-.8*k);
      }
      p.eg.attributes.position.needsUpdate=true;p.eg.attributes.aCol.needsUpdate=true;p.eg.attributes.aSize.needsUpdate=true;
    }

    function dispose(p){
      cfg.scene.remove(p.g);
      p.im.dispose&&p.im.dispose();p.hm.dispose&&p.hm.dispose();p.sp.dispose&&p.sp.dispose();
      p.bg.dispose();p.sg.dispose();p.im.material.dispose();p.hm.material.dispose();p.sm.dispose();
      p.win.geometry.dispose();p.wm.dispose();p.ring.geometry.dispose();p.rm.dispose();p.ring2.geometry.dispose();p.rm2.dispose();p.eg.dispose();p.em.dispose();   // viewTex dùng chung, không giải phóng
    }
    return {build,animate,dispose,RB};
  }

  const VIEW_B64='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';   // ảnh chụp Optimum World (ban ngày, màu rực) dùng cho cửa sổ trong cổng
  const G=makePortalGfx({scene:S,preview:RIFT.preview||('data:image/jpeg;base64,'+VIEW_B64),light:true,
    radius:RIFT.radius,blue:RIFT.blue,lift:RIFT.lift,size:RIFT.size,hole:RIFT.hole,openT:RIFT.openT,sparks:RIFT.sparks,embers:RIFT.embers,color:RIFT.color});

  const T=(vi,en)=>(typeof L!=='undefined'&&L==='vi')?vi:en;
  const msg=s=>{try{if(typeof showMsg==='function')showMsg(s)}catch(e){}};
  const charKey=()=>{try{return (window.PROFILE&&PROFILE.char)||(window.CharPick&&CharPick.current&&CharPick.current())||'vn'}catch(e){return 'vn'}};   // cùng cách chọn như player/thirdperson.js
  const busy=()=>!!(window.Apoc&&Apoc.active)||!!(window.NET&&NET.on);   // đang cảnh tận thế / đang chơi LAN thì ẩn cổng, không cho đi

  let obj=null,gy=0,armed=true,side=1,arrSide=1,crossed=0,pend=[];   // pend: bot đã qua cổng nhưng game kia chưa tải xong -> chờ gửi
  let ov=null,fr=null,card=null,frChar='',frReady=false,bootOn=false,bootTimer=0,bootTO=0;   // iframe game kia: tạo 1 lần, giữ lại, chỉ ẩn / hiện
  const ORIGIN=(()=>{try{return new URL(RIFT.url).origin}catch(e){return '*'}})();
  const post=m=>{try{if(fr&&fr.contentWindow)fr.contentWindow.postMessage(m,ORIGIN)}catch(e){}};
  const R_={inside:false};
  window.Rift=R_;

  // Nhả khóa chuột để sang game kia -> ui.js coi là "Tạm dừng" và dừng cả game (bot đứng yên, hiện bảng Tạm dừng). Hoàn tác như portrait-info.js đã làm:
  // game này PHẢI luôn chạy tiếp (bot vẫn chạy tới cổng) và khi về không bị kẹt ở màn hình Tạm dừng.
  const keepPlaying=()=>{
    if(!R_.inside&&!R_.keep)return;
    try{if(typeof dead!=='undefined'&&dead)return;playing=true;const o=document.getElementById('ov');if(o)o.style.display='none'}catch(e){}
  };
  document.addEventListener('pointerlockchange',()=>{keepPlaying();setTimeout(keepPlaying,0);setTimeout(keepPlaying,80)});   // setTimeout: phòng khi handler của ui.js chạy SAU handler này

  // Đang ở game kia thì người chơi KHÔNG bị mất máu: game này vẫn chạy ngầm, bot đang chạy tới chỗ cổng nơi nhân vật đứng
  try{if(typeof hurt==='function'&&!hurt.__rift){const h0=hurt,w=function(){if(R_.inside)return;return h0.apply(this,arguments)};w.__rift=1;window.hurt=w}}catch(e){}

  function groundAt(x,z){
    let v=P.y;
    try{if(typeof groundY==='function'){const r=groundY(x,z,P.y+1);if(typeof r==='number'&&isFinite(r))v=r}}catch(e){}
    return v;
  }

  R_.spawn=function(){
    if(obj||R_.inside)return false;
    const tries=[[9,0],[11,.5],[11,-.5],[8,0],[13,0]];   // [khoảng cách, lệch góc]
    for(const [d,da] of tries){
      const a=yaw+da,x=P.x-Math.sin(a)*d,z=P.z-Math.cos(a)*d,y=groundAt(x,z);
      if(Math.abs(y-P.y)>3)continue;                     // tránh vách / hố sâu
      gy=y;
      obj=G.build(x,y,z,Math.atan2(P.x-x,P.z-z));        // mặt cổng quay về phía người chơi
      obj.f=(typeof curFl!=='undefined')?curFl:null;      // cổng thuộc tầng nào (game có nhiều tầng)
      armed=true;
      if(RIFT.preload)setTimeout(()=>{if(obj&&!fr)ensureFrame()},1500);   // trễ chút cho khỏi giật đúng lúc cổng hiện
      msg(T('Một lỗ hổng không gian vừa xuất hiện!','A space rift has appeared!'));
      return true;
    }
    return false;
  };
  R_.close=function(){if(obj){G.dispose(obj);obj=null}killFrame()};

  // ---- iframe game kia: dựng 1 lần (ẩn bằng visibility, vẫn đủ kích thước nên game kia dựng + vẽ đúng cỡ), sau đó chỉ ẩn / hiện ----
  function killFrame(){if(ov)ov.remove();ov=fr=card=null;frReady=false}
  function ensureFrame(){
    if(fr&&frChar===charKey())return;                       // đã có sẵn (cùng nhân vật) -> dùng lại
    killFrame();frChar=charKey();
    ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;z-index:99999;background:#000;opacity:.01;pointer-events:none';
    ov.inert=true;   // KHÔNG dùng visibility:hidden: Chrome coi iframe ẩn là không hiển thị -> dừng requestAnimationFrame, game kia không bao giờ vẽ / báo ready
    fr=document.createElement('iframe');
    fr.src=RIFT.url+'&char='+encodeURIComponent(frChar);fr.allow='autoplay; fullscreen';   // gắn nhân vật đang chọn vào link sang game 1
    fr.style.cssText='width:100%;height:100%;border:0;display:block';
    // màn hình chờ (chỉ hiện nếu bước vào trước khi game kia tải xong)
    card=document.createElement('div');
    card.style.cssText='position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:radial-gradient(circle at 50% 45%,#1a0d44,#07031a);color:#d5ccff;font:600 18px system-ui,sans-serif;pointer-events:none';
    card.innerHTML='<style>@keyframes riftspin{to{transform:rotate(360deg)}}</style><div style="width:54px;height:54px;border-radius:50%;border:5px solid rgba(255,150,50,.25);border-top-color:#ff9a2a;animation:riftspin 1s linear infinite"></div><div>'+T('Đang mở cổng sang Optimum World…','Opening the portal to Optimum World…')+'</div>';
    const bt=document.createElement('button');
    bt.textContent='⮌ '+T('Quay lại Block Arena','Back to Block Arena');
    bt.style.cssText='position:absolute;top:calc(12px + env(safe-area-inset-top,0px));right:12px;padding:10px 16px;border:0;border-radius:10px;background:#7c4dff;color:#fff;font:600 16px system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,.5)';
    bt.onclick=leave;
    ov.append(fr,card,bt);document.body.appendChild(ov);
  }

  function enter(){
    ensureFrame();
    R_.inside=true;crossed=0;
    for(const k in keys)keys[k]=false;                    // nhả hết phím, tránh kẹt phím khi quay lại
    try{md=false;holding=false;autoP=false;scoped=false}catch(e){}
    if(document.exitPointerLock)document.exitPointerLock();
    if(frReady)showOv();                                  // đã tải sẵn: hiện ngay
    else if(bootStart()){}                                // chưa xong: dùng màn hình LOADING của chính game này (vòng xoáy + vầng sáng)
    else{showOv();card.style.display='flex'}              // không có BOOT: dùng màn chờ dự phòng
  }
  function showOv(){
    if(!ov)return;
    ov.inert=false;ov.style.opacity='1';ov.style.pointerEvents='auto';if(card)card.style.display='none';
    post({type:'rift-resume',w:(typeof cur==='string'?cur:null)});   // gửi kèm súng đang cầm sang game kia                           // game kia chạy lại + bật âm thanh
    if(frReady&&pend.length){pend.forEach(post);pend=[]}   // gửi các bot đã chạy qua cổng trong lúc game kia còn đang tải
    try{fr.focus()}catch(e){}
  }
  // ---- màn hình LOADING của game (#boot trong index.html, điều khiển bởi window.BOOT): đưa lên trên lớp iframe trong lúc chờ ----
  function bootStart(){
    const b=document.getElementById('boot');
    if(!window.BOOT||!b||!BOOT.again)return false;
    bootOn=true;b.style.zIndex='100000';BOOT.again();
    let pr=0;bootTimer=setInterval(()=>{pr+=(.9-pr)*.06;BOOT.set(pr)},200);   // tiến độ giả lập chạy dần tới ~90%
    bootTO=setTimeout(bootFinish,10000);                    // chờ quá 25 giây thì vẫn mở ra (game kia có thể tự báo lỗi)
    return true;
  }
  function bootFinish(){
    if(!bootOn)return;
    bootOn=false;clearInterval(bootTimer);clearTimeout(bootTO);
    const b=document.getElementById('boot');
    showOv();                                             // iframe hiện ngay bên dưới, màn loading mờ dần để lộ ra game kia
    BOOT.done(()=>{if(b)b.style.zIndex=''});              // chạy nốt vòng sáng rồi mở
  }

  function leave(){
    if(!R_.inside)return;
    if(bootOn){bootOn=false;clearInterval(bootTimer);clearTimeout(bootTO);const b=document.getElementById('boot');BOOT.done(()=>{if(b)b.style.zIndex=''})}   // đang chờ loading mà bấm về: đóng màn loading
    if(ov){ov.style.opacity='.01';ov.style.pointerEvents='none';ov.inert=true}    // chỉ ẩn, KHÔNG gỡ iframe: lần sau bước vào là có ngay. inert: iframe ẩn không nhận tiêu điểm / chuột / phím
    post({type:'rift-pause'});                            // game kia dừng vẽ + tắt âm thanh (đỡ tốn máy, đỡ ồn)
    R_.inside=false;armed=false;                          // armed=false: phải bước ra xa cổng rồi mới đi vào lại được
    if(obj){
      // đi xuyên qua cổng: ra ở PHÍA BÊN KIA, quay mặt ra xa cổng (cổng nằm sau lưng) -> cứ đi tới là rời xa cổng, không lọt lại
      let sd=-side;arrSide=sd;
      let x=obj.x+obj.nx*sd*RIFT.backGap,z=obj.z+obj.nz*sd*RIFT.backGap,y=groundAt(x,z);
      if(Math.abs(y-gy)>3){sd=side;arrSide=sd;x=obj.x+obj.nx*sd*RIFT.backGap;z=obj.z+obj.nz*sd*RIFT.backGap;y=groundAt(x,z)}   // bên kia là vách / hố: ra phía cũ
      if(Math.abs(y-gy)<=3){
        P.x=x;P.z=z;P.y=y;
        try{P.vy=0;P.fy=undefined;P.ground=false}catch(e){}
        try{yaw=Math.atan2(-obj.nx*sd,-obj.nz*sd)}catch(e){}   // hướng nhìn = (-sin yaw,-cos yaw) = ra xa cổng
      }
    }
    R_.keep=true;setTimeout(()=>{R_.keep=false},1500);keepPlaying();   // 1,5 giây sau khi về: vẫn chặn Tạm dừng do việc nhả / khóa chuột
    // ---- lấy lại điều khiển từ iframe: nếu không, khóa chuột + tiêu điểm bàn phím vẫn nằm ở game kia (chuột không xoay, bấm bắn là bắn bên đó) ----
    try{if(fr)fr.blur()}catch(e){}
    try{if(document.activeElement&&document.activeElement.blur)document.activeElement.blur()}catch(e){}
    try{window.focus()}catch(e){}
    try{document.exitPointerLock()}catch(e){}
    let tries=0;
    const tryLock=()=>{                                   // game kia nhả khóa chuột hơi trễ (sau tin nhắn 'rift-pause') -> thử lại tới khi khóa được
      if(R_.inside||document.pointerLockElement===cv)return;
      try{const pr=cv.requestPointerLock();if(pr&&pr.catch)pr.catch(()=>{})}catch(e){}
      if(++tries<24)setTimeout(tryLock,150);
      else if(document.pointerLockElement!==cv)msg(T('Bấm vào màn hình để điều khiển chuột','Click the screen to take mouse control'));
    };
    tryLock();
    const onDown=()=>{try{cv.requestPointerLock()}catch(e){}};   // chưa khóa được thì cú bấm chuột đầu tiên sẽ khóa (game vẫn chạy, không Tạm dừng)
    document.addEventListener('mousedown',onDown,true);setTimeout(()=>document.removeEventListener('mousedown',onDown,true),8000);
  }
  R_.leave=leave;

  // ---- BOT CHẠY THEO QUA CỔNG ----
  // Block Arena -> game kia: bot thường chạy tới chỗ nhân vật đứng (đúng chỗ cổng) thì "chui qua cổng": biến mất ở đây (không tính hạ gục, không rơi đồ),
  // xuất hiện bên kia và đuổi theo bạn. Tối đa RIFT.followMax bot mỗi lần. Boss / lính cung / đồng minh không đi.
  function sendBot(b){
    const m={type:'rift-bot',hp:b.hp,maxhp:b.maxhp,nm:b.nm||null};
    if(frReady&&R_.inside)post(m);else pend.push(m);
  }
  function crossBots(){
    if(!RIFT.follow||typeof bots==='undefined'||crossed>=RIFT.followMax)return;
    for(const b of bots){
      if(!b.on||b.hp<=0||b.boss||b.arch||b.ally||!b.g.visible)continue;
      if(Math.hypot(b.x-P.x,b.z-P.z)<2.4&&Math.abs(b.y-P.y)<2.5){
        const info={hp:b.hp,maxhp:b.maxhp||100,nm:b.nm||null};            // lấy máu TRƯỚC khi đánh dấu bot đã rời đi
        b.hp=0;b.g.visible=false;b.respawn=3/(1+.7*(typeof curFl==='number'?curFl:0));   // như bot chết, nhưng không tính điểm / rơi đồ
        sendBot(info);
        if(++crossed===1)msg(T('Bot đang đuổi theo qua cổng!','Bots are following you through the rift!'));
        if(crossed>=RIFT.followMax)break;
      }
    }
  }
  // game kia -> Block Arena: bot chạy theo bạn về, xuất hiện ở cổng (phía bạn vừa ra) rồi đuổi tiếp
  function spawnFollower(x){
    if(!obj||typeof mkBot!=='function'||typeof bots==='undefined'||typeof spawnBot!=='function')return;
    if(obj.f!==null&&typeof curFl!=='undefined'&&curFl!==obj.f)return;
    let alive=0,free=null;
    for(const b of bots){if(b.boss||b.arch||b.ally)continue;if(b.on&&b.hp>0)alive++;else if(!free)free=b}
    if(alive>=48)return;                                  // = MAXBOT trong spawner.js
    if(!free)free=mkBot();
    free.on=true;spawnBot(free);
    try{if(x.nm&&window.BN&&BN.setName)BN.setName(free,x.nm)}catch(e){}   // giữ nguyên tên bot đã chạy qua cổng
    const lat=(Math.random()-.5)*G.RB*RIFT.size*1.2;
    free.x=obj.x+obj.nx*arrSide*1.2+obj.nz*lat;free.z=obj.z+obj.nz*arrSide*1.2-obj.nx*lat;free.y=gy;
    free.hp=Math.max(20,Math.min(free.maxhp||100,+x.hp||100));free.vy=0;free.fy=undefined;
    free.g.position.set(free.x,free.y,free.z);
  }

  // tin nhắn từ game kia: 'optimum-ready' (đã dựng xong) · 'optimum-rift-back' (người chơi vừa bước qua cổng bên đó)
  addEventListener('message',e=>{
    if(!fr||e.source!==fr.contentWindow||!e.data)return;
    const t=e.data.type;
    if(t==='optimum-ready'){frReady=true;if(card)card.style.display='none';if(R_.inside){if(bootOn)bootFinish();else showOv()}else post({type:'rift-pause'})}
    else if(t==='optimum-rift-back'&&R_.inside){
      leave();
      try{const w=e.data.w;if(typeof w==='string'&&typeof W!=='undefined'&&W[w]&&typeof pick==='function'&&w!==cur)pick(w)}catch(err){}   // game kia đang cầm súng gì thì về đây cầm đúng súng đó
      if(RIFT.follow&&Array.isArray(e.data.bots))e.data.bots.slice(0,RIFT.followMax).forEach(x=>setTimeout(()=>spawnFollower(x),Math.max(0,+x.delay||0)*1000));   // bot bên kia chạy theo về, tới nơi lần lượt
    }
  });

  // tung xúc xắc: chỉ khi chưa có cổng
  setInterval(()=>{
    if(obj||R_.inside||!playing||dead||busy())return;
    if(Math.random()<RIFT.chance)R_.spawn();
  },RIFT.every);

  // hoạt ảnh + kiểm tra bước vào (vòng lặp riêng, không phải sửa main.js)
  let t0=performance.now();
  (function loop(now){
    requestAnimationFrame(loop);
    const dt=Math.min(.05,(now-t0)/1000);t0=now;
    if(!obj)return;
    const here=(obj.f===null||typeof curFl==='undefined'||curFl===obj.f);   // chỉ hiện ở tầng của nó
    obj.g.visible=here&&!busy();
    if(!obj.g.visible)return;
    G.animate(obj,dt,Infinity,C.position);
    if(R_.inside)crossBots();                              // đang ở game kia: bot tới chỗ cổng thì chui qua
    const dx=P.x-obj.x,dz=P.z-obj.z;
    if(!armed){if(Math.hypot(dx,dz)>RIFT.backGap-1)armed=true;return}      // vừa về: chờ bước ra khỏi cổng
    // bước qua cổng: cắt mặt phẳng cổng trong bán kính, đứng trên cùng mặt đất
    const dn=dx*obj.nx+dz*obj.nz,dl=Math.abs(-dx*obj.nz+dz*obj.nx);
    if(playing&&!dead&&!R_.inside&&obj.s>.85&&Math.abs(dn)<.9&&dl<G.RB*RIFT.size*.9&&P.y>gy-.6&&P.y<gy+2.6){side=dn>=0?1:-1;enter()}
  })(performance.now());
})();
