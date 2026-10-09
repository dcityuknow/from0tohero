// ============================================================================
// nature/build.js - buildFloor(f): dựng toàn bộ 1 tầng (địa hình, sông, cầu, cây, đá, cỏ, hoa...).
// (Tách ra từ nature.js cũ. Chia sẻ với các file nature/ khác qua NK = window.NatureKit.)
// ============================================================================
(function(){
const NK=window.NatureKit=window.NatureKit||{};
const {THM,RNG,CFG,ck,CELL,V,SLT,clamp01,smooth,variants:variants0,MOBILE,WC}=NK;
// Cây / đá / bụi / gỗ / nấm: mỗi mẫu dựng 1 lần rồi dùng lại -> bỏ các mặt nằm trong lòng khối ngay lúc dựng mẫu (merge.js: cullHiddenFaces).
// Hình ảnh không đổi (chỉ xóa mặt không ai nhìn thấy). Tắt nhanh: window.CULL_FACES=false trước khi nạp tầng.
const variants=(key,fn,n)=>variants0(key,function(){
  const v=fn.apply(this,arguments);
  if(typeof cullHiddenFaces==='function'&&window.CULL_FACES!==false)
    for(const o of(Array.isArray(v)?v:[v]))if(o&&o.geo&&o.geo.isBufferGeometry){try{o.geo._culled=(o.geo._culled||0)+cullHiddenFaces(o.geo)}catch(e){console.warn('cullHiddenFaces',e)}}
  return v},n);   // từ nature/kit.js
const {keepOuts,circleRect}=NK;   // từ nature/placement.js
const {boulder,pillar,pebbles,pineTree,roundTree,bush,logMesh,stumpMesh,butterfly}=NK;   // từ nature/plants.js
const {bedGeometry,lakeH,waveLake,carve}=NK;   // từ nature/lake.js
const {fishGeos,fishOK,makeFish}=NK;   // từ nature/fish.js


// ==== CÁ BƠI (kết thúc) ====
let _ct=null;

function carpetTex(){   // viền nhạt quanh mỗi mảnh 0.5m -> nhìn như miếng dán rubik
  if(_ct)return _ct;const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d');
  x.fillStyle='#fff';x.fillRect(0,0,32,32);x.fillStyle='rgba(0,0,0,.16)';x.fillRect(0,0,32,2);x.fillRect(0,0,2,32);x.fillRect(0,30,32,2);x.fillRect(30,0,2,32);
  _ct=new THREE.CanvasTexture(c);_ct.anisotropy=4;return _ct}

function buildFloor(f){
  const T=THM[f],A=AF(f),y0=FY(f),rand=RNG(CFG.seed*131+f*7919+1),k=Math.pow(A/20,CFG.scaleExp)*CFG.density;
  const Fl={f,y:y0,objs:[],lakes:[],crit:[],deco:null,cells:new Map(),terr:[],detail:[],hg:false,hAt:null,bridges:[],stones:[]},keep=keepOuts(f),placed=[],d=new VB(),lim=A-1.2;
  let cn=0,pn=0;
  const dkC=new THREE.Color(),dkG=(h,m)=>dkC.setHex(h).multiplyScalar(m).getHex();
  let hAt=()=>0;   // độ cao địa hình tại (x,z) - gán ở bước 1d
  const dc=(x,y,z,sx,sy,sz,hex)=>d.cube(x,y+hAt(x,z),z,sx,sy,sz,hex,cn++,(cn*7)&63,(cn*13)&31);   // 1 mảnh rubik gộp vào mesh trang trí
  const sup=(x,z,r)=>f===0||[[0,0],[r,0],[-r,0],[0,r],[0,-r]].every(([a,b])=>hitAny({x:x+a,y:y0-.6,z:z+b,r:.05,h:.3}));   // có sàn đỡ bên dưới (tầng trên có lỗ thang)
  const inLk=(x,z)=>Fl.cells.has(ck(Math.floor(x/CELL),Math.floor(z/CELL)));
  const wet=(x,z,m)=>inLk(x,z)||Fl.lakes.some(l=>l.rho(x,z)<1+m/Math.min(l.rx,l.rz));
  const okAt=(x,z,rad,edge)=>{
    if(Math.abs(x)>lim-edge||Math.abs(z)>lim-edge)return false;
    if(keep.some(q=>circleRect(x,z,rad+.3,q)))return false;
    if(wet(x,z,rad+.8))return false;
    for(const p of placed)if(Math.hypot(x-p.x,z-p.z)<rad+p.r+.25)return false;
    if(hitAny({x,y:y0+.02,z,r:rad,h:1.7}))return false;
    if(f===1&&hAt(x,z)>6.5)return false;   // tầng 2: cây chỉ mọc ở thung lũng / chân núi
    return sup(x,z,rad+.4);
  };
  const spot=(rad,edge)=>{for(let n=0;n<50;n++){const x=rand.range(-lim,lim),z=rand.range(-lim,lim);if(okAt(x,z,rad,edge))return{x,z}}return null};
  const inst=(geo,x,y,z,sc,ry,solid)=>{const m=new THREE.Mesh(geo,VMAT);m.position.set(x,y+hAt(x,z),z);m.rotation.y=ry;m.scale.setScalar(sc);S.add(m);if(solid)meshes.push(m);Fl.objs.push(m);return m};
  const solidBox=(x,z,hx,hz,h)=>boxes.push({x0:x-hx,x1:x+hx,y0:y0,y1:y0+hAt(x,z)+h,z0:z-hz,z1:z+hz});
  // Va chạm thân cây: chia thân thành các hộp xếp chồng, mỗi hộp bao trọn đoạn thân (kể cả thân cong), có tính góc xoay ry và tỉ lệ sc
  const solidTrunk=(x,z,v,sc,ry)=>{
    const c=Math.cos(ry),s=Math.sin(ry),n=Math.max(1,Math.round(v.th/1.1)),gy=hAt(x,z),seg=v.th*sc/n;
    for(let i=0;i<n;i++){
      let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
      for(let q=0;q<=2;q++){   // lấy mẫu đầu / giữa / cuối đoạn
        const u=(i+q/2)/n*v.th/v.Ht,[ox,oz]=v.off(u),rr=v.tr*(1.35-v.tp*Math.min(1,u*1.5))*sc+.05,
          wx=x+(ox*c+oz*s)*sc,wz=z+(-ox*s+oz*c)*sc;   // cùng phép xoay quanh trục Y như mesh (rotation.y=ry)
        x0=Math.min(x0,wx-rr);x1=Math.max(x1,wx+rr);z0=Math.min(z0,wz-rr);z1=Math.max(z1,wz+rr)}
      boxes.push({x0,x1,z0,z1,y0:i?y0+gy+i*seg:y0,y1:y0+gy+(i+1)*seg})}   // đoạn dưới cùng cao >= .9m nên stp() không tự leo lên gốc cây
  };
  const patch=(px,pz,pr)=>{   // mảng cỏ / rêu / tuyết: lát mảnh mỏng
    const g=V(.34),yy=y0+.045+.008*(pn++%4);
    for(let x=px-pr*1.3;x<=px+pr*1.3;x+=g)for(let z=pz-pr*1.3;z<=pz+pr*1.3;z+=g){
      const dx=x-px,dz=z-pz,a=Math.atan2(dz,dx),rr=pr*(1+.18*Math.sin(a*3+px)+.1*Math.sin(a*5+pz));
      if(Math.hypot(dx,dz)>=rr||wet(x,z,1.6)||(f&&!hitAny({x,y:y0-.6,z,r:.05,h:.3})))continue;
      dc(x,yy,z,g*.94,.05,g*.94,T.ice?T.ground[Math.floor(rand()*3)]:dkG(T.ground[Math.floor(rand()*3)],.55));
    }
  };
  const shroom=(x,z)=>{
    const cap=rand.pick(T.shroom);
    for(let i=0,n=rand.int(2,4);i<n;i++){const mx=x+rand.range(-.25,.25),mz=z+rand.range(-.25,.25),h=rand.range(.15,.32),cr=rand.range(.1,.18);
      d.cyl(mx,y0+hAt(mx,mz)+h/2,mz,.035,h,0xf4ecd8,.035,'y');
      d.ell(mx,y0+hAt(mx,mz)+h+cr*.3,mz,cr,cr*.6,cr,(a,b,c)=>((a+b*2+c)%4===0)?0xffffff:cap,.05,true)}
  };

  // 1) Sông (đặt trước để mọi thứ khác tránh ra): 1 dải nước dài, uốn lượn, chạy xuyên hết map từ tường này sang tường kia.
  //    Chỗ có vật cản (cột, bục...) của map thì chừa lại thành "đảo"; chỗ có lỗ thang / vùng cấm thì tự tránh.
  const inm=(x,z)=>Math.abs(x)<A-.5&&Math.abs(z)<A-.5;
  const blocked=(x,z)=>hitAny({x,y:y0+.02,z,r:.05,h:.5})||keep.some(q=>circleRect(x,z,.5,q))||(f>0&&!sup(x,z,1));
  const mkRiver=()=>{
    const W=CFG.riverW*(1+.04*f),dmax=f>0?Math.min(Math.max(.2,CFG.depth),SLT-.3):Math.max(.2,CFG.depth),bend=CFG.riverBend;
    let best=null,bs=1e9;
    for(let n=0;n<160&&bs>=1;n++){   // thử nhiều đường đi ngẫu nhiên, lấy đường ít đụng vật cản / vùng cấm nhất
      const th=(rand()<.5?0:Math.PI/2)+rand.range(-.2,.2),ux=Math.cos(th),uz=Math.sin(th),nx=-uz,nz=ux,c0=rand.range(-.5,.5)*A,
        a1=rand.range(1.6,3.4)*bend,k1=6.283/rand.range(30,46),p1=rand()*6.283,a2=rand.range(.4,1.1)*bend,k2=6.283/rand.range(13,19),p2=rand()*6.283,
        wv=rand.range(.08,.16),kw=6.283/rand.range(16,28),pw=rand()*6.283,cx=nx*c0,cz=nz*c0,
        cv=u=>a1*Math.sin(u*k1+p1)+a2*Math.sin(u*k2+p2),dv=u=>a1*k1*Math.cos(u*k1+p1)+a2*k2*Math.cos(u*k2+p2),wf=u=>W*(1+wv*Math.sin(u*kw+pw));
      let sc=0;
      for(let u=-A*1.3;u<=A*1.3;u+=2){
        const c=cv(u),w=wf(u),sl=dv(u),il=1/Math.sqrt(1+sl*sl);
        for(const q of[-1,-.5,0,.5,1]){
          const x=cx+ux*u+nx*c+(nx-ux*sl)*il*q*w,z=cz+uz*u+nz*c+(nz-uz*sl)*il*q*w;
          if(Math.abs(x)>A-.3||Math.abs(z)>A-.3)continue;
          if(hitAny({x,y:y0+.02,z,r:.45,h:.5}))sc+=1;
          if(keep.some(k=>circleRect(x,z,1.2,k)))sc+=40;
          if(f>0&&!sup(x,z,1.2))sc+=40;
        }
      }
      sc+=rand()*.5;
      if(sc<bs){bs=sc;best={ux,uz,nx,nz,cx,cz,cv,dv,wf}}
    }
    const {ux,uz,nx,nz,cx,cz,cv,dv,wf}=best;
    const loc=(x,z)=>{const X=x-cx,Z=z-cz;return[X*ux+Z*uz,X*nx+Z*nz]};   // toạ độ (dọc dòng, ngang dòng)
    // at(góc,p): điểm dọc theo bờ sông; p=1 đúng mép, p>1 ngoài bờ, p<1 trong lòng sông (góc<π: bờ này, còn lại: bờ kia)
    const at=(a,p)=>{const side=a<Math.PI?1:-1,u=(((a%Math.PI)/Math.PI)*2-1)*A*1.15,c=cv(u),sl=dv(u),il=1/Math.sqrt(1+sl*sl),w=wf(u)*p*side;
      return[cx+ux*u+nx*c+(nx-ux*sl)*il*w,cz+uz*u+nz*c+(nz-uz*sl)*il*w]};
    return {cx,cz,ux,uz,rx:A*1.2,rz:W,y:y0,f,dmax,ice:!!T.ice,T,loc,at,
      rho:(x,z)=>{const [u,v]=loc(x,z),sl=dv(u);return Math.abs(v-cv(u))/Math.sqrt(1+sl*sl)/wf(u)}};   // <1: trong lòng sông
  };
  if(f===1&&window.GreatWall&&GreatWall.makeLakes)Fl.lakes.push(...GreatWall.makeLakes({y:y0,f,dmax:Math.min(Math.max(.2,CFG.depth),SLT-.3),T,A}));   // tầng 2: các dòng suối uốn theo thung lũng núi (world/greatwall.js)
  else Fl.lakes.push(mkRiver());
  if(f===0&&window.BathPools)for(const sp of window.BathPools)Fl.lakes.push(Object.assign({},sp,{y:y0,f,ice:false,T:Object.assign({},T,{water:sp.water,sand:sp.sand})}));   // hồ tắm lõm (world/bath.js): đào sàn, đáy hồ, nước, lội nước dùng chung hệ thống với sông
  // 1b) Khối vật cản (của map) nằm giữa lòng sông -> gỡ bỏ cả va chạm lẫn mô hình. Không đụng tường ngoài, sàn, thang, cổng.
  if(f!==1){const rv=Fl.lakes[0],M=A-.6,
     cand=b=>b.y0>=y0-.05&&b.y0<y0+FHT[f]-3&&b.y1-y0<8&&b.x0>-M&&b.x1<M&&b.z0>-M&&b.z1<M&&b.x1-b.x0<=20&&b.z1-b.z0<=20&&!keep.some(k=>b.x1>k.x0&&b.x0<k.x1&&b.z1>k.z0&&b.z0<k.z1),
     inRv=b=>{const nx=Math.max(1,Math.ceil((b.x1-b.x0)/.5)),nz=Math.max(1,Math.ceil((b.z1-b.z0)/.5));
       for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++)if(rv.rho(b.x0+(b.x1-b.x0)*i/nx,b.z0+(b.z1-b.z0)*j/nz)<1.05)return true;return false},
     rem=boxes.filter(b=>cand(b)&&inRv(b));
   for(let ch=true;ch;){ch=false;   // khối xếp chồng lên khối bị gỡ cũng gỡ theo (khỏi lơ lửng)
     for(const b of boxes)if(!rem.includes(b)&&b.y0>y0+.05&&cand(b)&&rem.some(r=>Math.abs(b.y0-r.y1)<.02&&b.x0>=r.x0-.02&&b.x1<=r.x1+.02&&b.z0>=r.z0-.02&&b.z1<=r.z1+.02)){rem.push(b);ch=true}}
   for(const b of rem){const cx=(b.x0+b.x1)/2,cy=(b.y0+b.y1)/2,cz=(b.z0+b.z1)/2,
       mi=meshes.findIndex(q=>q.isMesh&&!q.isInstancedMesh&&Math.abs(q.position.x-cx)<.01&&Math.abs(q.position.y-cy)<.01&&Math.abs(q.position.z-cz)<.01);
     if(mi>=0){S.remove(meshes[mi]);meshes.splice(mi,1)}
     boxes.splice(boxes.indexOf(b),1)}}
  for(const l of Fl.lakes){
    const g=CELL,pos=[],edge=.9/l.rz,nC=Math.floor(A/g);l.g=g;l.cl=[];
    for(let ci=-nC;ci<nC;ci++)for(let cj=-nC;cj<nC;cj++){
      const x=(ci+.5)*g,z=(cj+.5)*g,p=l.rho(x,z);
      if(p<1){
        if(l.pool?hitAny({x,y:y0+.02,z,r:.05,h:.5}):blocked(x,z))continue;   // vật cản / lỗ thang -> không có nước (thành đảo)
        const [u,v]=l.loc(x,z);
        pos.push({x,z,p,u,v,ix:ci,iz:cj,h0:.1});
        if(!l.ice){Fl.cells.set(ck(ci,cj),l);l.cl.push([ci,cj])}
      }
      else if(!l.pool&&p<1+edge&&(f===0||hitAny({x,y:y0-.6,z,r:.05,h:.3}))&&!hitAny({x,y:y0+.02,z,r:.05,h:.5}))dc(x,y0+.045,z,g*.94,.05,g*.94,T.sand[(ci+cj)&1]);   // bãi cát / tuyết ven sông
    }
    if(!l.ice&&l.cl.length){   // đáy hồ lõm xuống (raycast được để đạn để lại vết)
      const bed=new THREE.Mesh(bedGeometry(l,Fl),new THREE.MeshLambertMaterial({vertexColors:true}));
      bed.frustumCulled=false;S.add(bed);meshes.push(bed);l.bed=bed;
    }
    if(pos.length){
      // mặt nước mỏng, trong; màu đáy hồ (cát -> xanh đậm) hiện xuyên qua nên càng sâu càng tối
      const mesh=new THREE.InstancedMesh(UG,new THREE.MeshLambertMaterial({color:0xffffff,transparent:!T.ice,opacity:T.ice?1:.62,depthWrite:!!T.ice,emissive:0x000000}),pos.length),col=new THREE.Color(),deep=new THREE.Color(),shal=new THREE.Color();
      pos.forEach((q,i)=>{const w=T.water;
        q.h0=lakeH(l,q.x,q.z);const dd=T.ice?Math.min(1,(1-q.p)/.85):clamp01((q.h0-.1)/(l.dmax-.1));
        if(T.ice){shal.setHex(w[3]);deep.setHex(w[2]).multiplyScalar(.85);col.copy(shal).lerp(deep,Math.pow(dd,.7))}
        else{shal.setHex(w[1]);deep.setHex(w[2]).multiplyScalar(.7);col.copy(shal).lerp(deep,dd*.85)}
        if((q.ix+q.iz)&1)col.multiplyScalar(.95);mesh.setColorAt(i,col)});
      mesh.frustumCulled=false;S.add(mesh);l.mesh=mesh;l.tiles=pos;waveLake(l,0);
    }
    // đá cuội, lau sậy, lá súng ven và trên hồ
    const per=l.pool?0:Math.round((l.rx+l.rz)*2.2*CFG.density);
    for(let i=0;i<per;i++){const [x,z]=l.at(rand()*6.283,1+rand.range(.04,.32)),sz=rand.range(.1,.26);
      if(inm(x,z)&&(f===0||hitAny({x,y:y0-.6,z,r:.05,h:.3}))&&!inLk(x,z)&&!hitAny({x,y:y0+.02,z,r:.05,h:.5}))dc(x,y0+sz*.4,z,sz,sz*.8,sz,T.rock[rand.int(0,2)])}
    for(let i=0,n=Math.round(per*.35);i<n;i++){const [cx,cz]=l.at(rand()*6.283,1+rand.range(.06,.22));
      if(!inm(cx,cz)||(f&&!hitAny({x:cx,y:y0-.6,z:cz,r:.05,h:.3})))continue;
      for(let b=0,m=rand.int(3,5);b<m;b++){const x=cx+rand.range(-.25,.25),z=cz+rand.range(-.25,.25),h=rand.range(1,1.7);
        if(inLk(x,z)||!inm(x,z))continue;
        dc(x,y0+h/2,z,.045,h,.045,rand.pick(T.reed));if(rand()<.5)dc(x,y0+h-.12,z,.075,.24,.075,0x6b4a32)}}
    // lá súng nổi trên mặt nước
    if(!T.ice)for(let i=0,n=l.pool?0:Math.round(A*l.rz*.12*CFG.density);i<n;i++){const [x,z]=l.at(rand()*6.283,rand.range(.1,.8)),r=rand.range(.22,.32),wy=y0-CFG.level;
      if(!inLk(x,z))continue;
      d.cyl(x,wy+.03,z,r,.03,rand.pick(T.pad),V(.075),'y');if(rand()<.4)dc(x,wy+.07,z,.09,.07,.09,rand()<.5?0xff9fbf:0xffffff)}
  }

  const flat=[];   // vùng phải phẳng (đầu cầu)
  // 1c) Cầu vòm gỗ bắc ngang sông (lưng cầu cong lên, lan can gỗ 2 bên). Tầng 4 sông đóng băng nên không cần cầu.
  //     Cầu chạy vuông góc (theo trục x hoặc z) với dòng sông, chọn chỗ hẹp nhất mà 2 đầu cầu có đất trống.
  for(const rv of Fl.lakes.filter(l=>!l.pool)){
   if(rv&&!rv.ice){
    const along=Math.abs(rv.ux)>Math.abs(rv.uz),pt=(q,w)=>along?[q,w]:[w,q],wat=(q,w)=>{const [x,z]=pt(q,w);return rv.rho(x,z)<1},
      okLand=(q,w)=>{const [x,z]=pt(q,w);return Math.abs(x)<lim-.3&&Math.abs(z)<lim-.3&&!keep.some(k=>circleRect(x,z,1.9,k))&&!hitAny({x,y:y0+.02,z,r:.5,h:.5})&&(f===0||sup(x,z,.6))},
      HW=1.25,OFF=[-1.4,0,1.4],bq=[];
    const plan=q=>{
      let w1=1e9,w2=-1e9;
      for(const o of OFF)for(let w=-lim;w<=lim;w+=.25)if(wat(q+o,w)){if(w<w1)w1=w;if(w>w2)w2=w}
      if(w2<w1||w2-w1>rv.rz*4.2)return null;
      const wa=w1-2.6,wb=w2+2.6;if(wa<-lim+.6||wb>lim-.6)return null;
      for(const o of OFF)for(let w=wa;w<=wb;w+=.5)if(!wat(q+o,w)&&!okLand(q+o,w))return null;
      return {q,wa,wb,sp:w2-w1};
    };
    const build=c=>{
      const {q,wa,wb}=c,Lt=wb-wa,N=Math.max(8,Math.round(Lt/.6)),sl=Lt/N,Hh=Math.max(1.2,Math.min(1.9,Lt*.12)),   // Hh: độ cao lưng cầu
        top=i=>y0+.14+Hh*Math.sin(Math.PI*(i+.5)/N),                                                          // mặt cầu: cung sin, bước lên mỗi tấm chỉ ~0.2m
        cb=(qq,ww,yy,dq,dw,dy,hex)=>{const [x,z]=pt(qq,ww);if(along)dc(x,yy,z,dq,dy,dw,hex);else dc(x,yy,z,dw,dy,dq,hex)},
        bx=(q0,q1,w0,w1,ya,yb)=>boxes.push(along?{x0:q0,x1:q1,z0:w0,z1:w1,y0:ya,y1:yb}:{x0:w0,x1:w1,z0:q0,z1:q1,y0:ya,y1:yb});
      for(let i=0;i<N;i++){
        const w=wa+(i+.5)*sl,tp=top(i);
        cb(q,w,tp-.09,2*HW,sl*.94,.18,i&1?0xa8794a:0x93653b);                       // ván cầu
        bx(q-HW,q+HW,w-sl/2,w+sl/2,tp-.4,tp);                                        // va chạm mặt cầu
        for(const sd of[-1,1]){
          const qq=q+sd*(HW-.08);
          cb(q+sd*(HW-.14),w,tp-.36,.24,sl*1.02,.36,0x5e4029);                        // dầm gỗ dưới ván
          cb(qq,w,tp+.98,.13,sl*1.04,.13,0xc08a52);                                   // tay vịn trên
          cb(qq,w,tp+.5,.09,sl*1.04,.09,0xa8794a);                                    // thanh giữa
          if(i%2===0||i===N-1){cb(qq,w,tp+.5,.16,.16,1.05,0x6b4a2b);cb(qq,w,tp+1.1,.22,.22,.1,0xd9a066)}   // cột + mũ cột
          if(i%2===0){const w1=Math.min(w+sl*1.5,wb),t2=top(Math.min(N-1,i+1));   // va chạm lan can (mỗi 2 tấm 1 khối)
            bx(qq-.09,qq+.09,w-sl/2,w1,Math.min(tp,t2),Math.max(tp,t2)+1.05)}
        }
      }
      for(let w=wa-2;w<=wb+2;w+=2){const [x,z]=pt(q,w);placed.push({x,z,r:2.2});flat.push({x,z,r:3.4})}Fl.bridges.push({along,q,wa,wb});   // đăng ký cầu cho AI bot (steering.js) · cây / đá tránh đầu cầu, địa hình phẳng quanh cầu
    };
    for(let nb=rv.nb||(A>=30?2:1);nb>0;nb--){
      let best=null;
      for(let q=-lim+5;q<=lim-5;q+=1){
        if(bq.some(p=>Math.abs(p-q)<16))continue;
        const c=plan(q);if(!c)continue;
        c.s=c.sp+Math.abs(q)*.08+rand()*1.5;if(!best||c.s<best.s)best=c;
      }
      if(!best)break;
      bq.push(best.q);build(best);
    }
    for(const h of CFG.extraBridges||[]){   // CẦU THÊM theo tọa độ (kit.js: extraBridges): chọn q gần điểm (x,z) nhất mà 2 đầu cầu có đất trống, cách cầu khác >= 8m; không dùng rand() nên không làm đổi bố cục cây / đá
      if(h.f!==f||typeof h.x!=='number'||typeof h.z!=='number')continue;
      const q0=along?h.x:h.z;let best=null;
      for(let dq=0;dq<=12&&!best;dq+=.5)for(const s of dq?[-1,1]:[1]){
        const q=q0+s*dq;if(Math.abs(q)>lim-5||bq.some(p=>Math.abs(p-q)<8))continue;
        const c=plan(q);if(c){best=c;break}}
      if(best){bq.push(best.q);build(best)}else console.warn('extraBridges: không đặt được cầu gần',h);
    }
   }}

  // 1d) ĐỊA HÌNH: bản đồ độ cao lưới .5m (tra bằng nội suy). Phẳng hẳn quanh sông, đầu cầu, thang, vật cản, sát tường.
  const HS=.5,NH=Math.round(2*A/HS)+1,HG=new Float32Array(NH*NH),hz=(x,z)=>HG[Math.round((z+A)/HS)*NH+Math.round((x+A)/HS)];
  const GWH=(f===1&&window.GreatWall&&GreatWall.terrainGrid)?GreatWall.terrainGrid():null;   // tầng 2: độ cao núi + sống tường + thung lũng suối do greatwall.js tính sẵn (lưới .5m)
  if(CFG.terrain&&(CFG.hill>0||GWH)){
    const rv=Fl.lakes[0],rvs=Fl.lakes.filter(l=>!l.pool),ph=[0,1,2,3].map(()=>rand()*6.283),
      ob=boxes.filter(b=>b.y0>=y0-.05&&b.y0<y0+FHT[f]-3&&!b.gw),   // b.gw: khối của tường thành (greatwall.js) - địa hình ở đó do chính greatwall.js tạo
      dR=(x,z,b)=>Math.hypot(Math.max(b.x0-x,0,x-b.x1),Math.max(b.z0-z,0,z-b.z1));
    for(let j=0;j<NH;j++)for(let i=0;i<NH;i++){
      const x=-A+i*HS,z=-A+j*HS;
      let m=clamp01((Math.min(A-Math.abs(x),A-Math.abs(z))-1)/5);
      if(GWH){for(const l of rvs){if(m<=0)break;m=Math.min(m,clamp01(((l.rho(x,z)-1)*l.rz-1.5)/3))}}   // suối: thung lũng đã phẳng sẵn, chỉ cần bảo đảm sát bờ = 0
      else m=Math.min(m,clamp01(((rv.rho(x,z)-1)*rv.rz-2.5)/7));
      if(m>0)for(const k of keep){m=Math.min(m,clamp01((dR(x,z,k)-1.5)/6));if(m<=0)break}
      if(m>0)for(const c of flat){m=Math.min(m,clamp01((Math.hypot(x-c.x,z-c.z)-c.r)/5));if(m<=0)break}
      if(m>0)for(const b of ob){m=Math.min(m,clamp01((dR(x,z,b)-1.2)/5));if(m<=0)break}
      if(m<=0){HG[j*NH+i]=0;continue}
      if(GWH){HG[j*NH+i]=GWH[j*NH+i]*m;continue}
      const n=.5*Math.sin(x*.11+ph[0])*Math.sin(z*.10+ph[1])+.3*Math.sin(x*.19+z*.15+ph[2])+.2*Math.sin(x*.31-z*.26+ph[3]);   // sóng dài -> đồi rộng
      HG[j*NH+i]=CFG.hill*smooth(clamp01((n+.1)/1.0))*m;
    }
    // Tầng 2: gọt các "mũi nhọn" cô lập giữa thung lũng. Mũi nhọn = đỉnh hẹp (< ~8m ngang) nhô cao hơn hẳn nền quanh nó.
    // Dùng phép "mở" hình thái (xói mòn rồi nở ra, cửa sổ vuông bán kính OR): đỉnh hẹp bị cắt về mức nền, núi / đồi rộng giữ nguyên.
    // Chỉ áp dụng ở chỗ nền quanh thấp (< OPLOW m: thung lũng), và không đụng ô sát chân Vạn Lý Trường Thành / sát mép map (do greatwall.js thiết kế sẵn).
    if(GWH){const OR=8,OPLOW=7.5,KEEP=1.0,GP=GreatWall.prep(),N2=NH*NH,T1=new Float32Array(N2),ER=new Float32Array(N2),OP=new Float32Array(N2);
      const pass=(src,dst,horiz,isMin)=>{   // min / max trượt (đơn giản, O(N*OR)) theo 1 chiều
        for(let j=0;j<NH;j++)for(let i=0;i<NH;i++){
          let m=isMin?1e9:-1e9;
          for(let k=-OR;k<=OR;k++){const a=horiz?Math.min(NH-1,Math.max(0,i+k)):i,b=horiz?j:Math.min(NH-1,Math.max(0,j+k)),v=src[b*NH+a];if(isMin?v<m:v>m)m=v}
          dst[j*NH+i]=m}};
      pass(HG,T1,true,true);pass(T1,ER,false,true);      // xói mòn
      pass(ER,T1,true,false);pass(T1,OP,false,false);    // nở ra -> OP = HG đã bỏ đỉnh hẹp (luôn <= HG)
      for(let j=0;j<NH;j++)for(let i=0;i<NH;i++){
        const o=j*NH+i,res=HG[o]-OP[o];if(res<=KEEP||OP[o]>=OPLOW)continue;
        const x=-A+i*HS,z=-A+j*HS;if(GP.bil(GP.fDW,x,z)<GreatWall.cfg.HWID+8||A-Math.max(Math.abs(x),Math.abs(z))<9)continue;
        HG[o]=OP[o]+KEEP*Math.min(1,KEEP/res)}   // còn lại một chút gồ ghề tự nhiên
    }
    hAt=(x,z)=>{let u=(x+A)/HS,v=(z+A)/HS;const mx=NH-1.001;u=u<0?0:u>mx?mx:u;v=v<0?0:v>mx?mx:v;
      const i=u|0,j=v|0,fu=u-i,fv=v-j,a=HG[j*NH+i],b=HG[j*NH+i+1],c=HG[(j+1)*NH+i],e=HG[(j+1)*NH+i+1];
      return a+(b-a)*fu+(c-a)*fv+(a-b-c+e)*fu*fv};
    Fl.hAt=hAt;Fl.hg=true;
  }

  // 2) Tảng đá (kể cả vài tảng sát mép hồ)
  const putRock=(x,z,ok)=>{
    const q=rand();
    if(q<.62){const v=rand.pick(variants(f+'boulder',()=>boulder(T,rand))),sc=rand.range(.8,1.3),hh=v.half*sc;
      if(!ok&&!(ok=spot(hh+.2,hh)))return;
      if(ok===true)ok={x,z};
      inst(v.geo,ok.x,y0-.05,ok.z,sc,rand()*6.283,true);solidBox(ok.x,ok.z,hh,hh,v.ch*sc);placed.push({x:ok.x,z:ok.z,r:hh*1.1});Fl.stones.push({x:ok.x,z:ok.z,r:hh+.2,n:3,max:3,t:0})}   // nguồn đá cho bot nhặt
    else if(q<.8){const v=rand.pick(variants(f+'pillar',()=>pillar(T,rand))),hh=v.half,pt=spot(hh+.3,hh+.3);
      if(!pt)return;inst(v.geo,pt.x,y0-.05,pt.z,1,rand()*6.283,true);solidBox(pt.x,pt.z,hh,hh,v.ch);placed.push({x:pt.x,z:pt.z,r:hh*1.2})}
    else{const v=rand.pick(variants(f+'pebbles',()=>pebbles(T,rand))),pt=spot(.5,.5);if(!pt)return;inst(v.geo,pt.x,y0,pt.z,rand.range(.9,1.4),rand()*6.283,false);placed.push({x:pt.x,z:pt.z,r:.4});Fl.stones.push({x:pt.x,z:pt.z,r:.25,n:5,max:5,t:0})}
  };
  for(let i=0,n=Math.round(T.rocks*k);i<n;i++)putRock();
  for(const l of Fl.lakes)if(!l.pool)for(let j=0;j<7;j++){   // đá to ngay bờ sông
    const [x,z]=l.at(rand()*6.283,1.3+rand()*.15),v=rand.pick(variants(f+'boulder',()=>boulder(T,rand))),sc=rand.range(.8,1.2),hh=v.half*sc;
    if(okAt(x,z,hh+.1,hh)){inst(v.geo,x,y0-.05,z,sc,rand()*6.283,true);solidBox(x,z,hh,hh,v.ch*sc);placed.push({x,z,r:hh*1.1});Fl.stones.push({x,z,r:hh+.2,n:3,max:3,t:0})}
  }

  // 3) Cây
  for(let i=0,n=Math.round(T.trees*k);i<n;i++){
    const kind=rand.pick(T.kinds),v=rand.pick(variants(f+kind,(_,vi)=>kind==='pine'?pineTree(T,rand,vi):roundTree(T,rand,kind==='cherry'?T.leafB:T.leaf,vi,kind==='cherry'),4));
    const sc=Math.min(rand.range(.85,1.3),8.3/v.h),pt=spot(v.crown*sc*.5,v.crown*sc*.7);if(!pt)continue;
    const ry=rand()*6.283;inst(v.geo,pt.x,y0-.05,pt.z,sc,ry,true);
    solidTrunk(pt.x,pt.z,v,sc,ry);   // chỉ thân cây có va chạm (bám theo thân cong), tán lá đi xuyên được
    placed.push({x:pt.x,z:pt.z,r:v.crown*sc*.5});
    if(rand()<.65)patch(pt.x,pt.z,v.crown*sc*.7);
  }

  // 4) Bụi cây, khúc gỗ, gốc cây, nấm
  for(let i=0,n=Math.round(T.bushes*k);i<n;i++){
    const pal=rand()<.5?T.leaf:T.leafB,v=rand.pick(variants(f+'bush'+(pal===T.leaf?0:1),()=>bush(T,rand,pal))),pt=spot(.55,.6);if(!pt)continue;
    inst(v.geo,pt.x,y0-.03,pt.z,rand.range(.8,1.3),rand()*6.283,true);placed.push({x:pt.x,z:pt.z,r:.5});Fl.stones.push({x:pt.x,z:pt.z,r:.55,n:2,max:2,t:0});
  }
  for(let i=0,n=Math.max(1,Math.round(T.logs*k*.6));i<n;i++){   // mỗi "log" giờ là 1 đống gỗ nhiều khúc nên đặt ít đống hơn
    const v=rand.pick(variants(f+'log',()=>logMesh(T,rand))),rad=Math.hypot(v.L,v.W)/2*.9,pt=spot(rad,rad);if(!pt)continue;
    const o=rand()<.5?0:Math.PI/2,hl=v.L/2*.95,hw=v.W/2*.95;
    inst(v.geo,pt.x,y0-.02,pt.z,1,o,true);solidBox(pt.x,pt.z,o?hw:hl,o?hl:hw,v.H*.95);placed.push({x:pt.x,z:pt.z,r:rad});
  }
  for(let i=0,n=Math.round(T.stumps*k);i<n;i++){
    const v=rand.pick(variants(f+'stump',()=>stumpMesh(T))),pt=spot(.5,.5);if(!pt)continue;
    inst(v.geo,pt.x,y0-.02,pt.z,rand.range(.9,1.3),rand()*6.283,true);solidBox(pt.x,pt.z,.28,.28,.47);placed.push({x:pt.x,z:pt.z,r:.45});
  }
  for(let i=0,n=Math.round(T.shrooms*k);i<n;i++){const pt=spot(.3,.3);if(!pt)continue;shroom(pt.x,pt.z);placed.push({x:pt.x,z:pt.z,r:.3})}

  // 5) Mảng cỏ, bụi cỏ, hoa
  for(let i=0,n=Math.round(T.patches*k);i<n;i++){const x=rand.range(-lim,lim),z=rand.range(-lim,lim),pr=rand.range(2.2,3.8);
    if(!wet(x,z,pr+.5)&&(f===0||sup(x,z,pr*.6)))patch(x,z,pr)}
  for(let i=0,n=Math.round(T.tufts*k);i<n;i++){const x=rand.range(-lim,lim),z=rand.range(-lim,lim);
    if(wet(x,z,.2)||hitAny({x,y:y0+.02,z,r:.08,h:.2})||(f&&!sup(x,z,0)))continue;
    for(let b=0,m=rand.int(3,5);b<m;b++){const h=rand.range(.16,.42);dc(x+rand.range(-.1,.1),y0+h/2,z+rand.range(-.1,.1),.05,h,.05,rand.pick(T.tuft))}}
  for(let i=0,n=Math.round(T.flowers*k);i<n;i++){const x=rand.range(-lim,lim),z=rand.range(-lim,lim);
    if(wet(x,z,.3)||hitAny({x,y:y0+.02,z,r:.08,h:.3})||(f&&!sup(x,z,0)))continue;
    const c=rand.pick(T.flower);dc(x,y0+.11,z,.03,.22,.03,T.tuft[2]);dc(x,y0+.25,z,.1,.07,.1,c);dc(x,y0+.27,z,.04,.05,.04,0xffd23f)}
  // 5b) Lá / cánh hoa rơi vãi (mảnh phẳng nhỏ, gộp chung mesh trang trí)
  for(let i=0,n=Math.round(CFG.litter*k);i<n;i++){const x=rand.range(-lim,lim),z=rand.range(-lim,lim);
    if(wet(x,z,.2)||hitAny({x,y:y0+.02,z,r:.08,h:.3})||(f&&!sup(x,z,0)))continue;
    const s=rand.range(.06,.13);dc(x,y0+.105,z,s,.02,s*rand.range(.7,1.2),rand.pick(rand()<.55?T.leaf:T.leafB))}
  const dm=d.mesh();dm.frustumCulled=false;S.add(dm);Fl.deco=dm;

  // 6) Bướm bay
  if(CFG.critters&&!T.ice)for(let i=0,n=3+f*2;i<n;i++){
    const cx=rand.range(-lim*.8,lim*.8),cz=rand.range(-lim*.8,lim*.8);
    if(hitAny({x:cx,y:y0+.02,z:cz,r:.5,h:1})||!sup(cx,cz,.5))continue;
    const b=butterfly(rand.pick([0xffd23f,0xff7fa8,0x7fbfff,0xffffff,0xc9a7ff]));
    Fl.crit.push({...b,cx,cz,rr:rand.range(1.2,2.8),sp:rand.range(.5,1),ph:rand()*6.283,by:y0});
  }
  // 6b) CÁ: rải trong sông (chỗ nước sâu >= .6m). Sông đóng băng (tầng tuyết) thì không có cá.
  Fl.fish=[];
  if(CFG.fish>0)for(const l of Fl.lakes){
    if(l.pool||l.ice||!l.cl||!l.cl.length)continue;
    const n=Math.min(60,Math.round(CFG.fish*(MOBILE?.6:1)*A/30)),G=fishGeos();
    for(let i=0,tries=0;i<n&&tries<n*40;tries++){
      const c=l.cl[Math.floor(rand()*l.cl.length)],x=(c[0]+.5)*CELL,z=(c[1]+.5)*CELL;
      if(!fishOK(Fl,l,x,z))continue;i++;
      const q=makeFish(G,rand),dp=rand.range(.2,.8),bed=l.y-lakeH(l,x,z),surf=l.y-CFG.level-.05,th=rand()*6.283;
      Object.assign(q,{Fl,l,x,z,th,tt:th,tw:rand.range(0,3),hold:0,sp:rand.range(.5,1.1),dp,ph:rand()*6.283,y:Math.max(bed+.25,Math.min(surf-.3,bed+(surf-bed)*dp))});
      q.g.position.set(x,q.y,z);Fl.fish.push(q);
    }
  }
  // 7) THẢM CỎ: mỗi "mảnh rubik" 0.5m (CFG.carpet) có màu riêng + viền nhạt như miếng dán. 3 tông: xanh nhạt · xanh đậm · xanh cực đậm, loang thành dải,
  //    rải thêm vài mảnh lệch tông sang tông kế bên cho có chi tiết.
  if(CFG.terrain){
    const Pal=T.ice?[0xf2f7ff,0xd6e6f7,0xaec6e4]:f===2?[0x92b24c,0x5b8a34,0x2c501f]:[0x62b85c,0x2f8a45,0x113f26],   // [nhạt, đậm, cực đậm]
      q=[0,1,2,3].map(()=>rand()*6.283),col=new THREE.Color(),CH=16,chunks=new Map(),ty=y0+.03,CS0=f===1?Math.max(.8,CFG.carpet):(CFG.carpet>=1?1:Math.max(.2,CFG.carpet)),NC=Math.round(2*A/CS0),CS=2*A/NC,
      band=(x,z)=>{const v=.55*Math.sin(x*.085+q[0])*Math.sin(z*.075+q[1])+.35*Math.sin(x*.16-z*.12+q[2])+.25*Math.sin(x*.29+z*.24+q[3]);
        return v<-.35?2:v<.2?1:0};
    const GRC=[0x6aa14b,0x4a8340,0x2f5a2d],RKC=[0x8c8478,0x756d62,0x9d9488],_rc=new THREE.Color();   // tầng 2: màu rừng / màu đá
    const CAP=Math.pow(Math.ceil(CH/Math.min(CS,.5))+1,2);   // số ô tối đa / khối 16m (bộ nhớ cấp phát 1 lần, dạng số nguyên 8-bit cho nhẹ)
    const emit=(xa,za,s,i,j)=>{
      const xb=xa+s,zb=za+s,ya=ty+hAt(xa,za),yb=ty+hAt(xb,za),yc=ty+hAt(xb,zb),yd=ty+hAt(xa,zb),
        hh=(ya+yb+yc+yd)/4-ty,h1=(Math.imul(i,73856093)^Math.imul(j,19349663))>>>0,jt=(h1%1000)/1000,sp=((h1>>>10)%1000)/1000;
      let bi=band(xa+s/2,za+s/2);if(sp<.14)bi=Math.max(0,Math.min(2,bi+(sp<.07?-1:1)));   // ~14% mảnh lệch tông
      if(f===1){   // núi: rừng xanh ở thấp, đá xám nâu ở cao / dốc
        const sl=Math.max(Math.abs(ya-yc),Math.abs(yb-yd))/(s*1.414),rk=clamp01((hh-5)/10+(sl-.55)*.9);
        col.setHex(GRC[bi]);_rc.setHex(RKC[(h1>>>3)%3]);col.lerp(_rc,rk*rk*(3-2*rk)).multiplyScalar(.9+.2*jt);
      }else col.setHex(Pal[bi]).multiplyScalar((.88+.16*jt)*(1+.1*hh/Math.max(.1,CFG.hill)));
      const R=Math.round(Math.min(1,col.r)*255),G=Math.round(Math.min(1,col.g)*255),B=Math.round(Math.min(1,col.b)*255);
      const key=Math.floor((xa+A)/CH)*1000+Math.floor((za+A)/CH);let c=chunks.get(key);
      if(!c)chunks.set(key,c={n:0,p:new Float32Array(CAP*18),c:new Uint8Array(CAP*18),u:new Uint8Array(CAP*12),nr:new Int8Array(CAP*18)});
      let pi=c.n*18,ui=c.n*12;c.n++;
      const tri=(a,b,e)=>{
        const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=e[0]-a[0],vy=e[1]-a[1],vz=e[2]-a[2],
          nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,l=Math.hypot(nx,ny,nz)||1;
        for(const v of[a,b,e]){c.p[pi]=v[0];c.p[pi+1]=v[1];c.p[pi+2]=v[2];c.c[pi]=R;c.c[pi+1]=G;c.c[pi+2]=B;
          c.nr[pi]=Math.round(nx/l*127);c.nr[pi+1]=Math.round(ny/l*127);c.nr[pi+2]=Math.round(nz/l*127);pi+=3;c.u[ui++]=v[3]*255;c.u[ui++]=v[4]*255}};
      const a=[xa,ya,za,0,0],b=[xb,yb,za,1,0],cc=[xb,yc,zb,1,1],dd=[xa,yd,zb,0,1];
      if(Math.abs(ya-yc)<Math.abs(yb-yd)){tri(a,cc,b);tri(a,dd,cc)}else{tri(a,dd,b);tri(b,dd,cc)}
    };
    const holeRects=f>0?keep.map(k=>({x0:k.x0-1,x1:k.x1+1,z0:k.z0-1,z1:k.z1+1})):[],
      noSlab=(x,z)=>holeRects.length&&holeRects.some(k=>x>k.x0&&x<k.x1&&z>k.z0&&z<k.z1)&&!hitAny({x,y:y0-.6,z,r:.05,h:.3});   // lỗ thang: không trải thảm
    for(let j=0;j<NC;j++)for(let i=0;i<NC;i++){
      const xa=-A+i*CS,za=-A+j*CS;
      if(CS<1){const h=CS/2;if(inLk(xa+h,za+h)||noSlab(xa+h,za+h))continue;emit(xa,za,CS,i,j);continue}
      const w=[inLk(xa+.25,za+.25),inLk(xa+.75,za+.25),inLk(xa+.25,za+.75),inLk(xa+.75,za+.75)],nw=w[0]+w[1]+w[2]+w[3];   // chế độ nhẹ (1m): chỗ sát nước chia nhỏ .5m
      if(nw===0){if(!noSlab(xa+.5,za+.5))emit(xa,za,1,i,j)}
      else if(nw<4)for(let k=0;k<4;k++)if(!w[k])emit(xa+(k&1)*.5,za+(k>>1)*.5,.5,i*2+(k&1),j*2+(k>>1));
    }
    const tm=new THREE.MeshLambertMaterial({vertexColors:true,map:carpetTex()});
    for(const c of chunks.values()){
      const n=c.n,g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.BufferAttribute(c.p.slice(0,n*18),3));
      g.setAttribute('color',new THREE.BufferAttribute(c.c.slice(0,n*18),3,true));
      g.setAttribute('normal',new THREE.BufferAttribute(c.nr.slice(0,n*18),3,true));
      g.setAttribute('uv',new THREE.BufferAttribute(c.u.slice(0,n*12),2,true));
      const m=new THREE.Mesh(g,tm);S.add(m);meshes.push(m);Fl.terr.push(m);
    }
    // 8) CỎ NHỎ DỰNG ĐỨNG · HOA · ĐÁ VỤN rải trên nền. Gộp thành khối 16m, chỉ vẽ khối ở gần; không có va chạm, đạn xuyên qua.
    if(CFG.detail>0){
      const DG=new Map(),cvt=(hex,m)=>{col.setHex(hex).multiplyScalar(m);return[Math.min(1,col.r),Math.min(1,col.g),Math.min(1,col.b)]};
      const bx8=(x,y,z,sx,sy,sz,cb,ct)=>{   // hộp không đáy: (x,z) tâm, y = đáy, màu đáy -> màu đỉnh
        const kx=Math.floor((x+A)/CH),kz=Math.floor((z+A)/CH),key=kx*1000+kz;let c=DG.get(key);
        if(!c)DG.set(key,c={p:[],c:[],n:[],cx:(kx+.5)*CH-A,cz:(kz+.5)*CH-A});
        const P=c.p,C=c.c,N=c.n,x0=x-sx/2,x1=x+sx/2,z0=z-sz/2,z1=z+sz/2,y1=y+sy;
        const face=(n,vs)=>{for(const k of[0,1,2,0,2,3]){const v=vs[k],cc=v[3]?ct:cb;P.push(v[0],v[1],v[2]);C.push(cc[0],cc[1],cc[2]);N.push(n[0],n[1],n[2])}};
        face([0,1,0],[[x0,y1,z0,1],[x0,y1,z1,1],[x1,y1,z1,1],[x1,y1,z0,1]]);
        face([1,0,0],[[x1,y,z0,0],[x1,y1,z0,1],[x1,y1,z1,1],[x1,y,z1,0]]);
        face([-1,0,0],[[x0,y,z1,0],[x0,y1,z1,1],[x0,y1,z0,1],[x0,y,z0,0]]);
        face([0,0,1],[[x1,y,z1,0],[x1,y1,z1,1],[x0,y1,z1,1],[x0,y,z1,0]]);
        face([0,0,-1],[[x0,y,z0,0],[x0,y1,z0,1],[x1,y1,z0,1],[x1,y,z0,0]]);
      };
      const ar=4*lim*lim*CFG.detail,ok=(x,z,m)=>Math.abs(x)<lim&&Math.abs(z)<lim&&(f!==1||hAt(x,z)<9)&&!wet(x,z,m)&&!(f===0&&window.BathKeeps&&BathKeeps.some(q=>x>q.x0&&x<q.x1&&z>q.z0&&z<q.z1))&&!noSlab(x,z)&&!hitAny({x,y:y0+.02,z,r:.06,h:.3}),
        gY=(x,z)=>y0+.02+hAt(x,z);
      for(let i=0,n=Math.round(ar*.22);i<n;i++){   // cụm cỏ 3-5 lá
        const x=rand.range(-lim,lim),z=rand.range(-lim,lim);if(!ok(x,z,1.2))continue;
        const gy=gY(x,z),top=rand.pick(T.tuft),m=rand.range(.85,1.15)*(T.ice?1:.72);
        for(let b=0,nb=rand.int(3,5);b<nb;b++){const h=rand.range(.13,.34),w=rand.range(.035,.06);
          bx8(x+rand.range(-.1,.1),gy,z+rand.range(-.1,.1),w,h,w,cvt(top,.5*m),cvt(top,1.1*m))}
      }
      for(let i=0,n=Math.round(ar*.05);i<n;i++){   // hoa
        const x=rand.range(-lim,lim),z=rand.range(-lim,lim);if(!ok(x,z,1.2))continue;
        const gy=gY(x,z),h=rand.range(.2,.38),hc=rand.pick(T.flower),st=T.tuft[2];
        bx8(x,gy,z,.03,h,.03,cvt(st,.7),cvt(st,1));bx8(x,gy+h,z,.11,.07,.11,cvt(hc,.8),cvt(hc,1.05));bx8(x,gy+h+.07,z,.05,.03,.05,cvt(0xffd23f,1),cvt(0xffd23f,1));
      }
      for(let i=0,n=Math.round(ar*.06);i<n;i++){   // cụm đá vụn (4-6 viên)
        const cx=rand.range(-lim,lim),cz=rand.range(-lim,lim);
        for(let b=0,nb=rand.int(4,6);b<nb;b++){
          const x=cx+rand.range(-.4,.4),z=cz+rand.range(-.4,.4);if(!ok(x,z,.8))continue;
          const sz=rand.range(.05,.13),c=rand.pick(T.rock),m=rand.range(.85,1.15);
          bx8(x,gY(x,z)-.01,z,sz*rand.range(.8,1.3),sz*.6,sz*rand.range(.8,1.3),cvt(c,.8*m),cvt(c,1.05*m));
        }
      }
      const dmat=new THREE.MeshLambertMaterial({vertexColors:true});
      for(const c of DG.values()){
        const g=new THREE.BufferGeometry();
        g.setAttribute('position',new THREE.Float32BufferAttribute(c.p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c.c,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(c.n,3));
        const m=new THREE.Mesh(g,dmat);m.userData={cx:c.cx,cz:c.cz};S.add(m);Fl.detail.push(m);
      }
    }
    if(f===0&&typeof grid!=='undefined'&&grid)grid.visible=false;   // bỏ lưới caro xám của tầng 1
  }
  carve(Fl,f,y0);   // đào hồ thật sự (sau khi mọi vật thể khác đã đặt xong)
  // bản đồ thô (ô 2m) đánh dấu chỗ GẦN nước (<= ~3m quanh mép hồ). wetAt() gọi rất nhiều lần mỗi khung (AI bot), ở ô không đánh dấu thì trả lời ngay mà khỏi tính rho
  {const NW=Math.ceil(2*A/WC)+1,wc=new Uint8Array(NW*NW);
    for(const l of Fl.lakes){if(l.ice)continue;
      for(let j=0;j<NW;j++)for(let i=0;i<NW;i++){if(wc[j*NW+i])continue;
        if(l.rho(-A+(i+.5)*WC,-A+(j+.5)*WC)<1+3/l.rz)wc[j*NW+i]=1}}
    Fl.wc=wc;Fl.wn=NW;Fl.wA=A}
  return Fl;
}

Object.assign(NK,{buildFloor});
})();
