// ============================================================================
// CỔNG KHÔNG GIAN - thay cho cầu thang lên tầng kế tiếp.
// - Hạ boss tầng f  -> 1 cổng xoáy xanh xuất hiện ở VỊ TRÍ NGẪU NHIÊN trên bản đồ tầng f (chọn từ fSpawns: không đè vật cản / nước / núi cao).
// - Bước qua cổng   -> dịch chuyển tới VỊ TRÍ NGẪU NHIÊN của tầng f+1. KHÔNG quay lại tầng dưới được nữa (tầng dưới không còn lối).
// - Lúc đến nơi, cổng "tàn dư" hiện sau lưng người chơi rồi tự CO LẠI và ĐÓNG hẳn trong PORTAL_CLOSE giây (30s). Cổng này chỉ để nhìn, không đi qua được.
// Nạp SAU floor-manager.js (xem loader.js). level.js gọi Portal.ready(f) (openGate) và Portal.reset() (resetLevel); floor-manager.js gọi Portal.tick(dt).
// Chỉnh nhanh: PORTAL (bán kính, thời gian đóng, khoảng cách tối thiểu so với người chơi).
// ============================================================================
const PORTAL={
  radius:1.9,       // bán kính vòng cổng (m)
  close:30,         // giây: cổng ở tầng mới co lại và đóng hẳn
  openT:1.2,        // giây: cổng nở ra khi xuất hiện
  minDist:25,       // cổng xuất hiện cách người chơi ít nhất chừng này (m) nếu bản đồ còn chỗ
  sparks:90,       // số tia lửa mỗi cổng
  color:0x3a8cff
};
const Portal=(function(){
  const list=[];            // mọi cổng đang tồn tại: {f,x,z,y,nx,nz,g,pts,age,mode:'open'|'closing',life}
  const ready_=[];          // ready_[f]=true: boss tầng f đã hạ -> tầng f có cổng (tạo lười khi người chơi ở tầng đó)
  const used=[];            // used[f]=true: đã bước qua cổng tầng f (đóng, không tạo lại)
  let busy=false;

  // ---- hình vẽ: xoáy xanh DÀY (nhiều lớp xếp theo chiều sâu), mép lượn sóng, quầng khói đen, mảnh vụn vuông ----
  const HALO=1.5;     // tấm vẽ rộng gấp HALO lần bán kính cổng để chứa quầng đen
  const LAYERS=8;     // số lớp xếp theo chiều sâu
  const DEPTH=1.3;    // bề dày cổng (m) - các lớp rải đều trong khoảng này, cộng thêm độ uốn
  const VERT=`
    varying vec2 vUv;uniform float uT;uniform float uL;uniform float uR;
    void main(){
      vUv=uv;vec2 p=(uv-.5)*2.*${HALO.toFixed(2)};float r=length(p),an=atan(p.y,p.x),ph=uL*5.3;
      // uốn lượn theo chiều sâu (trục z của cổng): sóng lan trên mặt + mép cuộn vào / ra, mỗi lớp lệch pha khác nhau
      float w=sin(p.x*2.7+uT*1.3+ph)*sin(p.y*2.4-uT*1.1+ph*1.7)*.2
             +sin(an*3.+uT*1.6+ph)*.2*smoothstep(.45,1.15,r)
             +sin(an*7.-uT*2.1+ph*.6)*.07*smoothstep(.6,1.2,r)
             -.16*(1.-min(r,1.))*(1.-min(r,1.));
      vec3 pos=position;pos.z+=uR*w+(uL-.5)*${DEPTH.toFixed(2)};
      // phình nhẹ theo bề ngang để các lớp ngoài rộng hơn lớp trong (khối cầu dẹt chứ không phải tấm phẳng)
      float sc=1.+(.5-abs(uL-.5))*.08;pos.xy*=sc;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.0);
    }`;
  const FRAG=`
    varying vec2 vUv;uniform float uT;uniform float uA;uniform float uL;
    float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
    float fbm(vec2 p){float v=0.,a=.5;for(int k=0;k<5;k++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
    void main(){
      vec2 p=(vUv-.5)*2.*${HALO.toFixed(2)};float r=length(p),an=atan(p.y,p.x);
      float T=uT+uL*1.9;   // mỗi lớp lệch thời gian -> nhìn xuyên qua thấy chiều sâu
      float edge=1.+(uL-.5)*.1+.07*sin(an*5.+T*1.7)+.05*sin(an*9.-T*2.4)+.03*sin(an*14.+T*3.3)+.05*(fbm(vec2(an*2.,T*.6))-.5);
      float sw=(1.-clamp(r,0.,1.))*(2.4+uL*1.6)+T*.55;float cs=cos(sw),sn=sin(sw);
      vec2 q=mat2(cs,-sn,sn,cs)*p;
      float w=fbm(q*2.6+T*.25)*.65+fbm(q*5.+vec2(-T*.4,T*.3))*.35;
      float swirl=fbm(vec2(an*1.5+sw*.8,r*3.-T*.8));
      vec3 deep=vec3(.02,.08,.35),mid=vec3(.1,.45,1.),lite=vec3(.6,.9,1.);
      vec3 c=mix(deep,mid,smoothstep(.2,.7,w));c=mix(c,lite,smoothstep(.55,.95,w*.6+swirl*.5)*.85);
      c+=vec3(.15,.35,.8)*(1.-r)*.6;
      float inside=1.-smoothstep(edge-.14,edge,r);
      c+=lite*.7*smoothstep(edge-.25,edge-.03,r)*inside;
      float sm=fbm(p*3.+vec2(T*.2,-T*.15));
      float fr=(1.-smoothstep(edge,edge+.42+.22*sm,r))*(1.-inside);
      float a=inside*.5+fr*(.2+.2*sm);                       // mỗi lớp chỉ mờ, 8 lớp chồng lên nhau mới đặc
      vec3 col=mix(vec3(.0,.0,.04),c,inside);
      gl_FragColor=vec4(col,a*uA*(1.-smoothstep(${(HALO*.86).toFixed(2)},${HALO.toFixed(2)},r)));
    }`;

  function make(f,x,z,yawN){
    const R=PORTAL.radius,n=PORTAL.sparks,g=new THREE.Group();
    const y0=FY(f)+((window.Nature&&Nature.heightAt&&Nature.heightAt(f,x,z))||0);
    g.position.set(x,y0+R+.15,z);g.rotation.y=yawN;   // cổng đứng thẳng, mặt hướng theo yawN
    const geo0=new THREE.PlaneGeometry(2*R*HALO,2*R*HALO,40,40),mats=[];
    for(let k=0;k<LAYERS;k++){
      const m=new THREE.ShaderMaterial({vertexShader:VERT,fragmentShader:FRAG,uniforms:{uT:{value:0},uA:{value:1},uL:{value:k/(LAYERS-1)},uR:{value:R}},transparent:true,depthWrite:false,side:THREE.DoubleSide});
      const mesh=new THREE.Mesh(geo0,m);mesh.renderOrder=k;mesh.frustumCulled=false;g.add(mesh);mats.push(m);
    }
    // mảnh vụn vuông nhỏ bay lơ lửng quanh và xuyên qua cổng
    const pos=new Float32Array(n*3),col=new Float32Array(n*3),pd=[];
    for(let i=0;i<n;i++){
      pd.push({a:Math.random()*6.283,r:R*(.25+Math.random()*1.15),dr:R*(.1+Math.random()*.45),w:(Math.random()-.5)*.5,z:(Math.random()-.5)*DEPTH*1.6,ph:Math.random(),sp:.12+Math.random()*.3});
      const k=Math.random();col[i*3]=.45+.5*k;col[i*3+1]=.8+.2*k;col[i*3+2]=1;
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));
    const pm=new THREE.PointsMaterial({size:.14,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
    const pts=new THREE.Points(geo,pm);pts.frustumCulled=false;g.add(pts);
    const lt=new THREE.PointLight(PORTAL.color,2,16);g.add(lt);
    S.add(g);
    return {f,x,z,y:y0,nx:Math.sin(yawN),nz:Math.cos(yawN),g,geo0,pts,pd,geo,pm,lt,mats,age:0,mode:'open',life:0,R,s:0}
  }
  function animate(p,dt){
    p.age+=dt;
    let s=Math.min(1,p.age/PORTAL.openT);s=s*s*(3-2*s);   // nở ra mượt
    if(p.mode==='closing'){p.life+=dt;s*=Math.max(0,1-p.life/PORTAL.close)}   // co dần về 0 trong PORTAL.close giây
    p.s=s;p.g.scale.setScalar(Math.max(.001,s));
    for(const m of p.mats)m.uniforms.uT.value=p.age;
    const a=p.geo.attributes.position.array;
    for(let i=0;i<p.pd.length;i++){
      const q=p.pd[i];q.a+=q.w*dt;
      const o=(p.age*q.sp+q.ph)%1,r=q.r+o*q.dr;
      a[i*3]=Math.cos(q.a)*r;a[i*3+1]=Math.sin(q.a)*r;a[i*3+2]=q.z+Math.sin(p.age*.8+q.ph*6)*.25;
    }
    p.geo.attributes.position.needsUpdate=true;
    p.lt.intensity=(1.6+.5*Math.sin(p.age*5))*s;p.pm.opacity=Math.min(1,s*1.3);
  }
  function kill(p){
    const i=list.indexOf(p);if(i>=0)list.splice(i,1);
    S.remove(p.g);p.geo.dispose();p.pm.dispose();p.geo0.dispose();for(const m of p.mats)m.dispose();
  }

  // ---- chọn vị trí ngẫu nhiên hợp lệ trên tầng f ----
  // chỗ "thoáng": không vật cản trong bán kính rad (cao tới 4.4m: kể cả mái chòi / cành cây), không nước, không dốc, không ở trong / sát chòi triển lãm
  function clearAt(f,x,z,rad){
    const y=FY(f)+.05;
    if(hit({x,y,z,r:rad,h:4.4}).length)return false;
    const N=window.Nature;
    if(N){
      if(N.isWater&&N.isWater(f,x,z,rad))return false;
      if(N.heightAt){const h0=N.heightAt(f,x,z)||0;if(Math.abs(h0)>1)return false;
        for(const [dx,dz] of [[rad,0],[-rad,0],[0,rad],[0,-rad]])if(Math.abs((N.heightAt(f,x+dx,z+dz)||0)-h0)>1.2)return false}   // đất bằng, không sườn dốc
    }
    if(f===0&&window.PavilionPeace)for(const [dx,dz] of [[0,0],[7,0],[-7,0],[0,7],[0,-7],[5,5],[-5,5],[5,-5],[-5,-5]])if(PavilionPeace(x+dx,y,z+dz))return false;   // tránh hẳn khu chòi + vành đai 7m
    return true}
  function randomSpot(f,minD,rad){
    const A=AF(f)-8,c=[];
    for(let x=-A;x<=A;x+=3)for(let z=-A;z<=A;z+=3)c.push([x,z]);
    for(let i=c.length-1;i>0;i--){const k=Math.floor(Math.random()*(i+1));[c[i],c[k]]=[c[k],c[i]]}   // xáo trộn
    for(const r of [rad,rad*.7,rad*.45]){   // không tìm được chỗ rộng thì hạ dần yêu cầu
      for(const d of(minD>0?[minD,0]:[0]))
        for(const s of c)if((!d||Math.hypot(s[0]-P.x,s[1]-P.z)>=d)&&clearAt(f,s[0],s[1],r))return s}
    const L=fSpawns(f);return L&&L.length?L[Math.floor(Math.random()*L.length)]:[0,0];
  }

  // boss tầng f vừa hạ (level.js: openGate): đánh dấu, cổng tự dựng khi người chơi đang ở tầng f
  function ready(f){if(f<0||f>=NF-1)return;ready_[f]=true}

  function spawnOn(f){
    if(list.some(p=>p.f===f&&p.mode==='open'))return;
    const s=randomSpot(f,PORTAL.minDist,PORTAL.radius+1.2),yawN=Math.random()*Math.PI*2;
    list.push(make(f,s[0],s[1],yawN));
    if(typeof showMsg==='function'&&typeof t==='function')showMsg(t('portalopen'));
  }

  // bước qua cổng p (ở tầng f): sang vị trí ngẫu nhiên của tầng f+1
  function enterPortal(p){
    if(busy)return;busy=true;
    const f=p.f,nf=f+1;used[f]=true;
    kill(p);
    FM.enter(nf);   // bảo đảm tầng mới đã được dựng TRƯỚC khi chọn chỗ (fSpawns cần cây / sông / núi của tầng đó)
    const s=randomSpot(nf,0,PORTAL.radius+2.6),h=(window.Nature&&Nature.heightAt&&Nature.heightAt(nf,s[0],s[1]))||0;
    // đặt người chơi cách cổng mới ~1.6m về phía đang nhìn, cổng "ra" nằm ngay sau lưng
    const fx=-Math.sin(yaw),fz=-Math.cos(yaw);
    P.x=s[0];P.z=s[1];P.y=FY(nf)+h+.3;P.vy=0;P.fy=undefined;P.ground=false;slideT=0;
    const px=P.x-fx*1.8,pz=P.z-fz*1.8;
    const yawN=Math.atan2(fx,fz);   // mặt cổng vuông góc hướng nhìn
    const q=make(nf,px,pz,yawN);q.mode='closing';q.age=0;list.push(q);   // cổng ra: nở ra rồi co lại đóng trong 30 giây, không đi vào được
    q.exit=true;
    // đồng minh đi theo ngay (không còn thang để đi bộ)
    if(typeof allies!=='undefined')for(const a of allies)a.gap=26;
    if(window.snd)try{snd(180,.5,'sawtooth',.06)}catch(e){}
    busy=false;
  }

  function tick(dt){
    // tạo cổng mới cho tầng hiện tại nếu boss đã hạ
    const c=curFl;
    if(c<NF-1&&(ready_[c]||bossDone[c])&&!used[c]&&!list.some(p=>p.f===c&&!p.exit))spawnOn(c);
    for(let i=list.length-1;i>=0;i--){
      const p=list[i];
      p.g.visible=(p.f===c);
      if(p.mode==='closing'&&p.life>=PORTAL.close){kill(p);continue}
      if(p.f===c)animate(p,dt);
      else if(p.mode==='closing')p.life+=dt;   // rời khỏi tầng vẫn đếm giờ đóng
      // bước qua cổng: cắt mặt phẳng cổng trong bán kính, đang đứng trên sàn/tầng đó
      if(!p.exit&&p.f===c&&p.s>.85&&!dead){
        const dx=P.x-p.x,dz=P.z-p.z,dn=dx*p.nx+dz*p.nz,dl=Math.abs(-dx*p.nz+dz*p.nx);
        const dy=(P.y+P.h*.5)-(p.g.position.y);
        if(Math.abs(dn)<.9&&dl<p.R*.75&&Math.abs(dy)<p.R){enterPortal(p);return}
      }
    }
    // vẽ chỉ báo cổng lên minimap
  }
  // minimap.js gọi: vẽ chấm cam nhấp nháy ở vị trí cổng (chỉ cổng chưa đi vào được)
  function drawMap(mc,X){
    for(const p of list)if(p.f===curFl&&!p.exit){
      const k=.6+.4*Math.sin(performance.now()/180);
      mc.fillStyle='rgba(60,150,255,'+k+')';mc.beginPath();mc.arc(X(p.x),X(p.z),7,0,6.3);mc.fill();
      mc.strokeStyle='#fff';mc.lineWidth=2;mc.stroke();
    }
  }
  function reset(){for(const p of list.slice())kill(p);ready_.length=0;used.length=0;busy=false}
  return {ready,tick,reset,drawMap,list,spawnOn,enterPortal};
})();
window.Portal=Portal;
