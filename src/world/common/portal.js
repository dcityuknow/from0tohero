// ============================================================================
// CỔNG KHÔNG GIAN - thay cho cầu thang lên tầng kế tiếp.
// - Hạ boss tầng f  -> 1 cổng xoáy xanh xuất hiện ở VỊ TRÍ NGẪU NHIÊN trên bản đồ tầng f (chọn từ fSpawns: không đè vật cản / nước / núi cao).
// - Bước qua cổng   -> dịch chuyển tới VỊ TRÍ NGẪU NHIÊN của tầng f+1. KHÔNG quay lại tầng dưới được nữa (tầng dưới không còn lối).
// - Lúc đến nơi, cổng "tàn dư" hiện sau lưng người chơi rồi tự CO LẠI và ĐÓNG hẳn trong PORTAL_CLOSE giây (30s). Cổng này chỉ để nhìn, không đi qua được.
// Nạp SAU floor-manager.js (xem loader.js). level.js gọi Portal.ready(f) (openGate) và Portal.reset() (resetLevel); floor-manager.js gọi Portal.tick(dt).
// Chỉnh nhanh: PORTAL (bán kính, thời gian đóng, khoảng cách tối thiểu so với người chơi).
// ============================================================================
const PORTAL={
  radius:2.2,       // bán kính gốc (m): tổng đường kính cổng (xanh + quầng đen) ~ 2.25 x radius, GIỮ NGUYÊN
  blue:1.45,        // phần XANH rộng gấp chừng này lần so với gốc (quầng đen co lại tương ứng để tổng không đổi)
  lift:.8,          // đáy phần xanh cách mặt đất chừng này (m): nhấc cổng lên để thấy trọn vẹn, không lún xuống đất
  close:30,         // giây: cổng ở tầng mới co lại và đóng hẳn
  openT:1.2,        // giây: cổng nở ra khi xuất hiện
  minDist:25,       // cổng xuất hiện cách người chơi ít nhất chừng này (m) nếu bản đồ còn chỗ
  sparks:70,       // số tia lửa mỗi cổng
  color:0x3a8cff
};
const Portal=(function(){
  const list=[];            // mọi cổng đang tồn tại: {f,x,z,y,nx,nz,g,pts,age,mode:'open'|'closing',life}
  const ready_=[];          // ready_[f]=true: boss tầng f đã hạ -> tầng f có cổng (tạo lười khi người chơi ở tầng đó)
  const used=[];            // used[f]=true: đã bước qua cổng tầng f (đóng, không tạo lại)
  let busy=false;

  // ---- hình vẽ: cổng cấu tạo bằng VOXEL TRONG SUỐT (giống mặt nước trong game: khối mỏng, mờ, màu chuyển sắc, uốn lượn) ----
  // Gồm LAYS tấm khối xếp theo chiều sâu, mỗi tấm uốn lượn lệch pha nhau (làm tròn theo lưới khối 0.2m nên sóng thành bậc voxel) + 1 lớp khói đen mờ bao quanh.
  // Hai InstancedMesh (thân cổng + khói) mờ như mặt nước hồ (build.js: MeshLambertMaterial transparent, depthWrite=false). Tính lại 20 lần/giây.
  const VS=.2,GC=25,GZ=9,MAXB=9000,MAXH=7000,HALO=2.25/PORTAL.blue,LAYS=5;   // HALO: bán kính tối đa tính theo R (cổng ~1R + quầng đen dày ~1.1R)
  const STOPS=[[0,[.02,.08,.38]],[.35,[.08,.38,.95]],[.65,[.36,.74,1]],[1,[.9,.99,1]]];   // xanh thẫm -> xanh -> xanh nhạt -> trắng xanh (chuyển mượt, như bản shader)
  const hh=(a,b,c)=>{const x=Math.sin(a*127.1+b*311.7+c*74.7)*43758.5453;return x-Math.floor(x)};
  const ss=(a,b,x)=>{x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x)};
  const vn=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y);let fx=x-ix,fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
    const a=hh(ix,iy,1),b=hh(ix+1,iy,1),c=hh(ix,iy+1,1),d=hh(ix+1,iy+1,1);return(a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy};
  const _c=[0,0,0];
  function grad(v){v=Math.min(1,Math.max(0,v));for(let q=1;q<STOPS.length;q++)if(v<=STOPS[q][0]){const a=STOPS[q-1],b=STOPS[q],t=(v-a[0])/(b[0]-a[0]);for(let c=0;c<3;c++)_c[c]=a[1][c]+(b[1][c]-a[1][c])*t;return _c}
    return STOPS[STOPS.length-1][1]}
  const occ=new Int32Array(2*GZ+1);let stamp=0;   // occ: ô z nào của cột này đã có khối (tránh 2 tấm chồng cùng 1 ô)
  // độ cong theo chiều sâu của tấm có pha ph: sóng lan trên mặt + mép cuộn vào ra + lõm nhẹ ở giữa
  const wave=(px,py,an,r,rc,T,ph)=>Math.sin(px*2.7+T*1.3+ph)*Math.sin(py*2.4-T*1.1+ph*1.7)*.2+Math.sin(an*3+T*1.6+ph)*.2*ss(.45,1.15,r)+Math.sin(an*7-T*2.1+ph*.6)*.07*ss(.6,1.2,r)-.16*(1-rc)*(1-rc);
  // out: {pos,col,n (thân), posH,colH,nh (khói)} · s (0..1) = mức nguyên vẹn (mở / đóng cổng thì khối rụng dần)
  function field(T,s,R,o){
    let n=0,nh=0;const B=o.pos,BC=o.col,H=o.posH,HC=o.colH;
    for(let i=0;i<=2*GC;i++)for(let j=0;j<=2*GC;j++){
      const x=(i-GC)*VS,y=(j-GC)*VS,px=x/R,py=y/R,r=Math.hypot(px,py);if(r>HALO)continue;
      const an=Math.atan2(py,px),rc=Math.min(r,1);
      const edge=1+.07*Math.sin(an*5+T*1.7)+.05*Math.sin(an*9-T*2.4)+.03*Math.sin(an*14+T*3.3);   // mép lượn sóng nhấp nhô
      stamp++;
      if(r<edge+.06){
        // màu xoáy chuyển mượt: 3 nhánh xoắn vào tâm + nhiễu, sáng dần về tâm, viền sáng sát mép
        const sw=(1-rc)*3.2+T*.55,cs=Math.cos(sw),sn=Math.sin(sw),qx=cs*px-sn*py,qy=sn*px+cs*py;
        const v0=.5+.36*Math.sin(an*3-r*8+T*1.4)+(vn(qx*2.6+T*.25,qy*2.6+T*.25)-.5)*.55+(1-rc)*.25;
        const rim=ss(edge-.16,edge-.02,r);
        for(let l=0;l<LAYS;l++){
          const el=edge+(l-(LAYS-1)/2)*.035;if(r>=el)continue;
          const zc=R*wave(px,py,an,r,rc,T,l*1.1)+(l-(LAYS-1)/2)*.2,k=Math.round(zc/VS);
          if(k<-GZ||k>GZ||occ[k+GZ]===stamp)continue;occ[k+GZ]=stamp;
          if(hh(i,j,k+l*17)>s||n>=MAXB)continue;
          const c=grad(Math.max(v0+(l-(LAYS-1)/2)*.07,rim*.8)),jt=((i+j+k)&1)?.94:1;   // so le tối nhẹ như mặt nước
          B[n*3]=x;B[n*3+1]=y;B[n*3+2]=k*VS;BC[n*3]=c[0]*jt;BC[n*3+1]=c[1]*jt;BC[n*3+2]=c[2]*jt;n++;
        }
      }
      if(r>edge-.02){
        // quầng khói đen DÀY (gấp 3 bản trước): 3 tấm khối mờ, đặc ở sát mép rồi thưa dần ra ngoài, bồng bềnh theo thời gian
        const d=r-edge,fw=(.12+.055*vn(px*2+T*.2,py*2-T*.15))*3;   // quầng đen mỏng lại (đơn vị theo R đã phóng to)if(d>fw)continue;
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
  // khối lập phương có độ sáng riêng từng mặt (nhân với màu từng khối) -> thấy rõ hình khối dù vật liệu không phụ thuộc ánh sáng
  const FACE=[.84,.68,1,.52,.93,.76];   // +x, -x, +y(trên), -y(dưới), +z, -z
  function voxGeo(sz){const g=new THREE.BoxGeometry(sz,sz,sz),c=new Float32Array(24*3);
    for(let f=0;f<6;f++)for(let v=0;v<4;v++){const o=(f*4+v)*3;c[o]=c[o+1]=c[o+2]=FACE[f]}
    g.setAttribute('color',new THREE.BufferAttribute(c,3));return g}
  // InstancedMesh r128: setColorAt cấp bộ đệm màu theo .count LÚC GỌI -> phải gọi khi count còn đầy, rồi mới đặt count=0 (đặt trước thì bộ đệm rỗng, cả khối đen thui)
  function instMesh(geo,N,opacity,order){
    const m=new THREE.MeshBasicMaterial({fog:false,vertexColors:true,transparent:opacity<1,opacity,depthWrite:false});
    const im=new THREE.InstancedMesh(geo,m,N);im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);im.frustumCulled=false;im.renderOrder=order;
    im.setColorAt(0,new THREE.Color());im.count=0;return im}

  function make(f,x,z,yawN,yy){
    const R=PORTAL.radius,g=new THREE.Group();
    const y0=(yy!=null)?yy:(FY(f)+((window.Nature&&Nature.heightAt&&Nature.heightAt(f,x,z))||0));   // yy: độ cao bề mặt tuyệt đối (đất / mặt nước / mặt cầu)
    g.position.set(x,y0+R*PORTAL.blue+PORTAL.lift,z);g.rotation.y=yawN;   // cổng đứng thẳng, mặt hướng theo yawN
    const bg=voxGeo(VS),im=instMesh(bg,MAXB,.5,3),hm=instMesh(bg,MAXH,.6,2);g.add(hm);g.add(im);
    // mảnh vụn voxel nhỏ bay lơ lửng quanh và xuyên qua cổng
    const NS=PORTAL.sparks,sg=voxGeo(.12),sm=new THREE.MeshBasicMaterial({fog:false,vertexColors:true});
    const sp=new THREE.InstancedMesh(sg,sm,NS);sp.instanceMatrix.setUsage(THREE.DynamicDrawUsage);sp.frustumCulled=false;sp.renderOrder=4;
    const pd=[],cc=new THREE.Color();
    for(let i=0;i<NS;i++){
      pd.push({a:Math.random()*6.283,r:R*(.25+Math.random()*1.15),dr:R*(.1+Math.random()*.45),w:(Math.random()-.5)*.5,z:(Math.random()-.5)*1.8,ph:Math.random(),sp:.12+Math.random()*.3});
      const k=Math.random();cc.setRGB(.45+.5*k,.8+.2*k,1);sp.setColorAt(i,cc);
    }
    g.add(sp);
    const lt=new THREE.PointLight(PORTAL.color,2,16);g.add(lt);
    S.add(g);
    return {f,x,z,y:y0,nx:Math.sin(yawN),nz:Math.cos(yawN),g,im,hm,bg,sp,sg,sm,pd,lt,acc:1,m4:new THREE.Matrix4(),cc,age:0,mode:'open',life:0,R,s:0,wet:false}
  }
  function fill(im,n,pos,col,m,c){
    for(let i=0;i<n;i++){m.makeTranslation(pos[i*3],pos[i*3+1],pos[i*3+2]);im.setMatrixAt(i,m);c.setRGB(col[i*3],col[i*3+1],col[i*3+2]);im.setColorAt(i,c)}
    im.count=n;im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true}
  function animate(p,dt){
    p.age+=dt;
    let s=Math.min(1,p.age/PORTAL.openT);s=s*s*(3-2*s);   // nở ra mượt (khối hiện dần)
    if(p.mode==='closing'){p.life+=dt;s*=Math.max(0,1-p.life/PORTAL.close)}   // khối rụng dần, cổng đóng sau PORTAL.close giây
    p.s=s;p.g.scale.setScalar(.55+.45*s);
    p.acc+=dt;
    if(p.acc>=.05){   // 20 lần/giây: đủ mượt, kiểu hoạt ảnh voxel, nhẹ CPU
      p.acc=0;field(p.age,s,p.R*PORTAL.blue,_out);
      fill(p.im,_out.n,_out.pos,_out.col,p.m4,p.cc);fill(p.hm,_out.nh,_out.posH,_out.colH,p.m4,p.cc);
    }
    const sp=p.sp,m=p.m4;
    for(let i=0;i<p.pd.length;i++){
      const q=p.pd[i];q.a+=q.w*dt;const o=(p.age*q.sp+q.ph)%1,r=q.r+o*q.dr,zz=q.z+Math.sin(p.age*.8+q.ph*6)*.25;
      m.makeTranslation(Math.round(Math.cos(q.a)*r/.12)*.12,Math.round(Math.sin(q.a)*r/.12)*.12,Math.round(zz/.12)*.12);sp.setMatrixAt(i,m);   // bám lưới .12 cho đúng kiểu voxel
    }
    sp.count=Math.round(p.pd.length*Math.min(1,s*1.3));sp.instanceMatrix.needsUpdate=true;
    p.lt.intensity=(1.6+.5*Math.sin(p.age*5))*s;
  }
  function kill(p){
    const i=list.indexOf(p);if(i>=0)list.splice(i,1);
    S.remove(p.g);p.im.dispose&&p.im.dispose();p.hm.dispose&&p.hm.dispose();p.sp.dispose&&p.sp.dispose();
    p.bg.dispose();p.sg.dispose();p.im.material.dispose();p.hm.material.dispose();p.sm.dispose();
  }

  // ---- chọn vị trí ngẫu nhiên hợp lệ trên tầng f: ĐẤT BẰNG, MẶT NƯỚC, hoặc MẶT CẦU ----
  const _tb=[];
  // đỉnh khối cao nhất tại (x,z) nằm cao hơn sàn .3m tới 5m (mặt cầu); null nếu không có
  function bridgeTop(f,x,z){
    const base=FY(f);let best=null;
    bxGather(x-.05,x+.05,z-.05,z+.05,_tb);
    for(const b of _tb)if(x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1&&b.y1>base+.3&&b.y1<=base+5&&(best===null||b.y1>best))best=b.y1;
    return best}
  const RING4=r=>[[r,0],[-r,0],[0,r],[0,-r]];
  // trả về {y,kind} (y = độ cao bề mặt tuyệt đối, kind = 'ground'|'water'|'bridge') hoặc null nếu không hợp lệ
  function spotAt(f,x,z,rad){
    const base=FY(f),N=window.Nature,wet=(px,pz,r)=>!!(N&&N.isWater&&N.isWater(f,px,pz,r));
    if(f===0&&window.PavilionPeace)for(const [dx,dz] of [[0,0],[7,0],[-7,0],[0,7],[0,-7],[5,5],[-5,5],[5,-5],[-5,-5]])if(PavilionPeace(x+dx,base+.05,z+dz))return null;   // tránh khu chòi
    if(wet(x,z,.3)){
      // (a) CẦU: có khối cao hơn sàn nằm trên nước -> đứng trên mặt cầu, mặt cầu phải phẳng quanh đó
      const top=bridgeTop(f,x,z);
      if(top!==null){
        const rr=Math.min(rad,1.3);
        for(const [dx,dz] of RING4(rr)){const t=bridgeTop(f,x+dx,z+dz);if(t===null||Math.abs(t-top)>.15)return null}
        if(hit({x,y:top+.05,z,r:Math.min(rad,1.2),h:4.4}).length)return null;
        return {y:top,kind:'bridge'};
      }
      // (b) MẶT NƯỚC: cả vùng quanh đều là nước, không vật cản nhô lên
      const rr=Math.min(rad,2.2);
      for(const [dx,dz] of RING4(rr))if(!wet(x+dx,z+dz,.3))return null;
      if(hit({x,y:base+.05,z,r:rad,h:4.4}).length)return null;
      const wy=(N.waterLevel&&N.waterLevel(f,x,z));   // nếu nature.js có hàm độ cao mặt nước thì dùng, không thì lấy mặt sàn
      return {y:(typeof wy==='number')?wy:base,kind:'water'};
    }
    // (c) ĐẤT: như cũ (không vật cản, không nước ven, đất bằng)
    if(hit({x,y:base+.05,z,r:rad,h:4.4}).length)return null;
    let h0=0;
    if(N){
      if(wet(x,z,rad))return null;
      if(N.heightAt){h0=N.heightAt(f,x,z)||0;if(Math.abs(h0)>1)return null;
        for(const [dx,dz] of RING4(rad))if(Math.abs((N.heightAt(f,x+dx,z+dz)||0)-h0)>1.2)return null}
    }
    return {y:base+h0,kind:'ground'};
  }
  // trả về [x,z,yBềMặt,kind]
  function randomSpot(f,minD,rad){
    const A=AF(f)-8,c=[];
    for(let x=-A;x<=A;x+=3)for(let z=-A;z<=A;z+=3)c.push([x+(Math.random()-.5)*2,z+(Math.random()-.5)*2]);   // lệch nhẹ để không bỏ sót cầu hẹp
    for(let i=c.length-1;i>0;i--){const k=Math.floor(Math.random()*(i+1));[c[i],c[k]]=[c[k],c[i]]}   // xáo trộn
    for(const r of [rad,rad*.7,rad*.45]){   // không tìm được chỗ rộng thì hạ dần yêu cầu
      for(const d of(minD>0?[minD,0]:[0]))
        for(const s of c)if(!d||Math.hypot(s[0]-P.x,s[1]-P.z)>=d){const q=spotAt(f,s[0],s[1],r);if(q)return [s[0],s[1],q.y,q.kind]}
    }
    const L=fSpawns(f),s=L&&L.length?L[Math.floor(Math.random()*L.length)]:[0,0];
    return [s[0],s[1],FY(f)+((window.Nature&&Nature.heightAt&&Nature.heightAt(f,s[0],s[1]))||0),'ground'];
  }

  // boss tầng f vừa hạ (level.js: openGate): đánh dấu, cổng tự dựng khi người chơi đang ở tầng f
  function ready(f){if(f<0||f>=NF-1)return;ready_[f]=true}

  function spawnOn(f){
    if(list.some(p=>p.f===f&&p.mode==='open'))return;
    const s=randomSpot(f,PORTAL.minDist,PORTAL.radius*2.1),yawN=Math.random()*Math.PI*2;
    const p=make(f,s[0],s[1],yawN,s[2]);p.wet=(s[3]==='water');
    list.push(p);
    if(typeof showMsg==='function'&&typeof t==='function')showMsg(t('portalopen'));
  }

  // bước qua cổng p (ở tầng f): sang vị trí ngẫu nhiên của tầng f+1
  // bước qua cổng: nếu bật cảnh tận thế (gameplay/apocalypse.js) thì camera kéo lên xem tầng cũ sụp đổ, XONG mới dịch chuyển (finishEnter); không thì dịch chuyển ngay như cũ
  function enterPortal(p){
    if(busy)return;busy=true;
    used[p.f]=true;
    if(window.Apoc&&Apoc.canPlay()){
      p.exit=true;   // cổng vẫn còn đó nhưng không đi qua thêm lần nữa, minimap cũng thôi chỉ báo
      Apoc.start(p,()=>finishEnter(p));
      return;
    }
    finishEnter(p);
  }
  function finishEnter(p){
    const f=p.f,nf=f+1;used[f]=true;
    kill(p);
    FM.enter(nf);   // bảo đảm tầng mới đã được dựng TRƯỚC khi chọn chỗ (fSpawns cần cây / sông / núi của tầng đó)
    const s=randomSpot(nf,0,PORTAL.radius*2.1+1.8);   // s = [x,z,yBềMặt,kind]
    // đặt người chơi cách cổng mới ~1.6m về phía đang nhìn, cổng "ra" nằm ngay sau lưng
    const fx=-Math.sin(yaw),fz=-Math.cos(yaw);
    P.x=s[0];P.z=s[1];P.y=s[2]+.3;P.vy=0;P.fy=undefined;P.ground=false;slideT=0;
    const px=P.x-fx*4.5,pz=P.z-fz*4.5;
    const yawN=Math.atan2(fx,fz);   // mặt cổng vuông góc hướng nhìn
    const q=make(nf,px,pz,yawN,s[2]);q.mode='closing';q.age=0;q.wet=(s[3]==='water');list.push(q);   // cổng ra: nở ra rồi co lại đóng trong 30 giây, không đi vào được
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
        if(Math.abs(dn)<.9&&dl<p.R*1.3&&Math.abs(dy)<p.R*PORTAL.blue+(p.wet?2.6:0)){enterPortal(p);return}
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
  return {ready,tick,reset,drawMap,list,spawnOn,enterPortal,field:(T,s)=>{const o={pos:new Float32Array(MAXB*3),col:new Float32Array(MAXB*3),posH:new Float32Array(MAXH*3),colH:new Float32Array(MAXH*3),n:0,nh:0};return field(T,s==null?1:s,PORTAL.radius*PORTAL.blue,o)}};
})();
window.Portal=Portal;