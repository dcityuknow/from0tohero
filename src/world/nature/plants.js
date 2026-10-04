// ============================================================================
// nature/plants.js - Mô hình voxel của cây, thông, tảng đá, bụi cây, khúc gỗ, bướm.
// (Tách ra từ nature.js cũ. Chia sẻ với các file nature/ khác qua NK = window.NatureKit.)
// ============================================================================
(function(){
const NK=window.NatureKit=window.NatureKit||{};
const {clamp01,TV,bandFn,geoOf,V,rockFn}=NK;   // từ nature/kit.js


// ---- Cây: thân thẳng hoặc cong/nghiêng, cành chính + cành phụ xòe ra, tán lá là các cụm ở đầu cành ----
function bendFn(rand,amt){   // đường cong của thân: amt = độ lệch tối đa ở ngọn (m); 0 = thẳng tắp
  const a=rand()*6.283,c=Math.cos(a),sn=Math.sin(a),ph=rand()*6.283;
  return u=>{u=clamp01(u);const m=amt*(Math.pow(u,1.5)+.3*Math.sin(u*4.4+ph)*u),p=amt*.25*Math.sin(u*3.4+ph*1.7)*u;return[c*m-sn*p,sn*m+c*p]};
}

function bTrunk(v,T,r,H,off,tp=.6){   // thân: các đốt trụ xếp chồng, mỗi đốt lệch theo đường cong, thu nhỏ dần + 4 rễ
  const ts=TV(.1),hs=.3,col=(a,b,l)=>T.trunk[(a*3+b*5+l*7)%T.trunk.length];
  for(let y=-.15;y<H;y+=hs){const u=(y+hs/2)/H,rr=r*(1.35-tp*Math.min(1,u*1.5)),[ox,oz]=off(u);
    v.cyl(ox,y+hs/2,oz,rr,hs*1.25,col,ts,'y',Math.max(0,rr-ts*1.6))}
  for(const [x,z,w,d] of [[1,0,.3,.16],[-1,0,.3,.16],[0,1,.16,.3],[0,-1,.16,.3]])v.box(x*r*1.45,.09,z*r*1.45,w,.18,d,T.trunk[0],ts);
}

function limb(v,T,a,b,r0,r1,ts){   // 1 cành: dãy khối nhỏ nối từ a tới b, mảnh dần
  const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz),n=Math.max(2,Math.ceil(len/(ts*.8)));
  for(let k=0;k<=n;k++){const t=k/n,r=r0+(r1-r0)*t,d=Math.max(ts*.9,2*r);
    v.cube(a[0]+dx*t,a[1]+dy*t,a[2]+dz*t,d,d,d,T.trunk[(k+(k>>2))%T.trunk.length],k,k>>1,n)}
}

function roundTree(T,rand,cols,vi=0,wide=false){   // vi: 0,1 = thân thẳng · 2 = cong nhẹ · 3 = cong/nghiêng mạnh; wide = anh đào (cành xòe ngang, rủ)
  const v=new VB(),s=TV(.22),ts=TV(.1),tr=rand.range(.2,.27),H=rand.range(2.6,3.4),
    amt=[0,0,rand.range(.5,.8),rand.range(.95,1.4)][vi%4],off=bendFn(rand,amt);let ext=1,top=H;
  bTrunk(v,T,tr,H,off);
  const blob=(x,y,z,rx,ry,rz)=>{v.ell(x,y,z,rx,ry,rz,bandFn(cols,Math.round(2*ry/s)),s,true);ext=Math.max(ext,Math.hypot(x,z)+rx);top=Math.max(top,y+ry)};
  const n=rand.int(wide?5:4,wide?7:6),a0=rand()*6.283;
  for(let i=0;i<n;i++){
    const a=a0+i/n*6.283+rand.range(-.35,.35),hb=H*rand.range(.5,.92),[ox,oz]=off(hb/H),hl=rand.range(.85,1.5)*(wide?1.2:1),
      rise=hl*rand.range(wide?.05:.3,wide?.45:.85),p0=[ox,hb,oz],p1=[ox+Math.cos(a)*hl,hb+rise,oz+Math.sin(a)*hl],
      r0=tr*(1.35-.6*Math.min(1,hb/H*1.5))*.55;
    limb(v,T,p0,p1,r0,r0*.4,ts);                                         // cành chính
    const R=rand.range(.55,.85);blob(p1[0],p1[1]+R*.35,p1[2],R,R*.8,R);   // cụm lá ở đầu cành
    const sa=a+rand.range(.5,.9)*(rand()<.5?1:-1),m=[(p0[0]+p1[0])/2,(p0[1]+p1[1])/2,(p0[2]+p1[2])/2],sl=hl*rand.range(.5,.75),
      p2=[m[0]+Math.cos(sa)*sl,m[1]+sl*rand.range(.2,.7),m[2]+Math.sin(sa)*sl];
    limb(v,T,m,p2,r0*.6,r0*.3,ts);                                       // cành phụ tách ra từ giữa cành chính
    const R2=R*rand.range(.6,.85);blob(p2[0],p2[1]+R2*.3,p2[2],R2,R2*.8,R2);
  }
  const [tx,tz]=off(1),R3=rand.range(.75,1);blob(tx,H+R3*.35,tz,R3,R3*.8,R3);   // cụm lá trên ngọn
  return {geo:geoOf(v),crown:Math.max(1.3,ext*.8),tr,th:H,h:top+.05,off,tp:.6,Ht:H};   // off/tp/Ht: để solidTrunk() dựng va chạm bám theo thân cong
}

function pineTree(T,rand,vi=0){   // thông: mỗi tầng là 1 vòng cành rủ xuống, đầu cành có cụm kim; thân thẳng hoặc hơi nghiêng
  const v=new VB(),tr=rand.range(.16,.21),H=rand.range(2.2,2.6),s=TV(.18),ts=TV(.1),tiers=rand.int(6,7),step=rand.range(.58,.68),R0=rand.range(1.2,1.5),cols=T.pine,
    Ht=H-.25+tiers*step+.3,amt=[0,0,rand.range(.3,.5),rand.range(.6,.9)][vi%4],off=bendFn(rand,amt);
  bTrunk(v,T,tr,Ht,off,.95);   // thân chạy suốt chiều cao cây, mảnh dần về ngọn
  for(let q=0;q<tiers;q++){
    const u=q/(tiers-1),rr=R0*(1-u*.86)+.12,y=H-.25+q*step,base=q%2?0:2,[ox,oz]=off(y/Ht),nb=Math.max(4,Math.round(3+rr*3.2)),a0=rand()*6.283;
    for(let k=0;k<nb;k++){
      const a=a0+k/nb*6.283+rand.range(-.25,.25),hl=rr*rand.range(.85,1.05),dr=hl*rand.range(.12,.3),ca=Math.cos(a),sa=Math.sin(a);
      if(hl>.45)limb(v,T,[ox,y,oz],[ox+ca*hl,y-dr,oz+sa*hl],tr*.3,tr*.15,ts);
      const cw=Math.max(.32,hl*.45),cx=ox+ca*hl*.72,cz=oz+sa*hl*.72,cy=y-dr*.7;
      v.ell(cx,cy,cz,cw,TV(.15),cw,(i,j,kk)=>cols[((i*5+j*3+q*2+k)%7===0)?1:base],s,true);
      if(T.cap)v.ell(cx,cy+TV(.12),cz,cw*.85,TV(.07),cw*.85,(i,j,kk)=>T.cap[(i+kk)&1],TV(.09),false);
    }
    v.cyl(ox,y,oz,rr*.38,s,(a,b)=>cols[((a*5+b*3+q*2)%7===0)?1:base],s,'y');
    if(T.cap)v.cyl(ox,y+s*.85,oz,rr*.3,s*.8,(a,b)=>T.cap[(a+b)&1],s,'y');
  }
  const top=H-.25+tiers*step,[tx,tz]=off(top/Ht);v.cyl(tx,top-.1,tz,.1,.5,cols[1],TV(.08),'y');
  return {geo:geoOf(v),crown:R0,tr,th:H,h:top+.2,off,tp:.95,Ht};
}

function boulder(T,rand){
  const v=new VB(),s=V(.16),rx=rand.range(.65,1),ry=rx*rand.range(.65,.9),rz=rx*rand.range(.85,1.1);
  const blob=(x,y,z,a,b,c)=>v.ell(x,y,z,a,b,c,rockFn(T,Math.round(2*b/s)),s,true);
  blob(0,ry*.8,0,rx,ry,rz);
  for(let i=0,n=rand.int(1,2);i<n;i++){const a=rand()*6.283;blob(Math.cos(a)*rx*.65,ry*.5,Math.sin(a)*rz*.65,rx*.55,ry*.6,rz*.55)}
  return {geo:geoOf(v),half:Math.max(rx,rz)*1.15,ch:ry*1.8};   // hộp phủ hết đá kể cả blob phụ; chiều cao = đỉnh đá thật (1.8*ry)
}

function pillar(T,rand){   // trụ đá đứng, làm chỗ nấp
  const v=new VB(),s=V(.14),w=rand.range(.55,.75);let y=0;
  for(const [k,h] of [[1,1.05],[.85,.95],[.65,.85]]){const ww=w*k;
    v.box(rand.range(-.05,.05),y+h/2,rand.range(-.05,.05),ww,h,ww,(i,j,kk,nx,ny)=>(T.moss&&j>=ny-2)?T.moss:T.rock[(i+j*2+kk)%3],s,true);y+=h}
  return {geo:geoOf(v),half:w*.5+.06,ch:2.85};   // nửa cạnh đáy = w/2 (+ độ lệch ngẫu nhiên .05); cao 1.05+.95+.85
}

function pebbles(T,rand){
  const v=new VB(),s=V(.07);
  for(let i=0,n=rand.int(3,5);i<n;i++){const r=rand.range(.09,.2);v.ell(rand.range(-.4,.4),r*.5,rand.range(-.4,.4),r,r*.65,r,rockFn(T,4),s,false)}
  return {geo:geoOf(v)};
}

function bush(T,rand,cols){
  const v=new VB(),s=V(.14);let r0=.4,y0=.3;
  for(let i=0,n=rand.int(2,3);i<n;i++){
    const rr=rand.range(.36,.52),ry=rr*.8,x=i?rand.range(-.4,.4):0,z=i?rand.range(-.4,.4):0;
    v.ell(x,ry*.9,z,rr,ry,rr,bandFn(cols,Math.round(2*ry/s)),s,true);if(!i){r0=rr;y0=ry}}
  for(let i=0;i<8;i++){const th=rand()*6.283,ph=rand.range(0,1.2);   // hoa / quả trên mặt bụi
    v.cube(Math.cos(th)*Math.sin(ph)*r0*1.02,y0*.9+Math.cos(ph)*y0*1.02,Math.sin(th)*Math.sin(ph)*r0*1.02,.09,.09,.09,rand.pick(T.flower),i,3,7)}
  return {geo:geoOf(v)};
}

function logMesh(T,rand){   // BÃI GỖ: nhiều khúc gỗ xếp chồng thành đống (dưới rộng, trên hẹp), đầu khúc lộ vòng năm
  const v=new VB(),s=V(.09),r=rand.range(.24,.3),Lb=rand.range(1.7,2.3),rows=rand.int(2,3),n0=rand.int(3,4);
  let W=0,Hh=0,idx=0;
  for(let row=0;row<rows;row++){
    const cnt=n0-row,y=r+row*r*1.72;
    for(let i=0;i<cnt;i++){
      const z=(i-(cnt-1)/2)*r*2.02,Li=Lb*rand.range(.82,1),x=rand.range(-.12,.12),rr=r*rand.range(.92,1.04),id=idx++,
        nl=Math.max(1,Math.round(2*rr/s)),c2=(nl-1)/2,ring=(a,b)=>((Math.hypot(a-c2,b-c2)|0)&1)?0xd9b38c:0xb8895f;
      v.cyl(x,y,z,rr,Li,(a,b,l)=>T.trunk[(a+b*2+l*3+id)%T.trunk.length],s,'x',rr-s*1.6);
      for(const sx of[-1,1])v.cyl(x+sx*(Li/2-s*.4),y,z,rr,s*.8,ring,s,'x');
      W=Math.max(W,Math.abs(z)*2+2*rr);Hh=Math.max(Hh,y+rr);
    }
  }
  if(T.moss)v.box(rand.range(-.3,.3),Hh+.02,0,.5,.07,.24,T.moss,s);
  return {geo:geoOf(v),L:Lb,W,H:Hh};
}

function stumpMesh(T){
  const v=new VB(),s=V(.07),r=.38;
  v.cyl(0,.24,0,r,.48,(a,b,l)=>T.trunk[(a+b*2+l*3)%T.trunk.length],s,'y',r-s*1.6);
  v.cyl(0,.48,0,r,s*.8,(a,b)=>((Math.hypot(a-4,b-4)|0)&1)?0xd9b38c:0xb8895f,s,'y');
  return {geo:geoOf(v)};
}

function butterfly(col){
  const g=new THREE.Group(),b=new THREE.Mesh(UG,M(0x2b2a3a));b.scale.set(.03,.03,.12);g.add(b);
  const mk=sd=>{const p=new THREE.Group();p.position.x=sd*.02;const w=new THREE.Mesh(UG,M(col));w.scale.set(.12,.012,.1);w.position.x=sd*.06;p.add(w);g.add(p);return p};
  S.add(g);return {g,wl:mk(-1),wr:mk(1)};
}

Object.assign(NK,{boulder,pillar,pebbles,pineTree,roundTree,bush,logMesh,stumpMesh,butterfly});
})();
