// Hồ tắm đá kiểu onsen LÕM XUỐNG + vách đá thác nước (thay cho 2 khối mint ở hai góc tầng 1: bk(±15,0,±14,6,1.2,3,MT) cũ trong world.js).
// - Lòng hồ là 1 "hồ" thật của nature.js (window.BathPools -> nature.js đào sàn, dựng đáy, mặt nước, lội nước + tiếng bì bõm), nông hơn sông: sâu tối đa BATH_DEPTH.
// - Quanh hồ: nền lát đá, viền đá tảng tự nhiên (rải theo đúng đường bờ), vài tảng đá nhô lên giữa nước, 2 cột đèn.
// - Vách đá = bản đồ độ cao có nhiễu (đồi đá nhấp nhô), 3 dòng suối chảy theo các bậc rồi đổ xuống hồ.
// Nạp SAU teaset.js, TRƯỚC nature.js (xem loader.js): cây / đá / sông né hồ qua window.BathKeeps; nature.js đọc window.BathPools.
// Chỉnh nhanh: BATHS (vị trí, bỏ bớt hồ) · BATH_DEPTH (độ sâu hồ) · POOL / LOBE (hình dạng hồ) · STREAMS (các dòng thác).
(function(){
const BATHS=[
  {x:15*MAPK, z:14*MAPK, sx:1},    // chỗ khối mint cũ bk(15,0,14,...); sx = hướng vách thác (+1 = về tường Đông)
  {x:-15*MAPK,z:-14*MAPK,sx:-1}    // chỗ khối mint cũ bk(-15,0,-14,...); vách thác về tường Tây
];
const BATH_DEPTH=1.0;                                  // độ sâu đáy hồ ở giữa (m dưới mặt sàn). Sông là 3.2 -> hồ nông hơn nhiều, lội được
const POOL={cx:-1.3,a:4.4,b:3.4,p:2.6};                // bể chính (khung tọa độ cục bộ: +x = phía vách thác, -x = lối vào)
const LOBE={cx:2.6,a:1.45,b:2.4};                      // vịnh nhỏ sát chân vách: chỗ thác đổ xuống
const X0=4.1,CS=.25,NX=14,NZ=44,ZH=5.5;               // lưới vách đá: x từ X0 tới sát tường, z từ -ZH..ZH, ô .25m
const STREAMS=[[0,.75],[-2.7,.375],[2.7,.375]];       // [z tâm, nửa bề rộng] của các dòng thác

const ROCK=[0x77828f,0x6b7684,0x84909c,0x5f6a78,0x8a8f98], MOSS=[0x5f8a5a,0x6f9a62], DARK=0x2a1a10;
const PAVE=[0x9a9fa8,0x8d939c,0xa6abb2,0x80868f], MORT=0x6a6f78;
const S1=t=>{t=t<0?0:t>1?1:t;return t*t*(3-2*t)};
const rockC=(i,j,k)=>(j<2&&((i+k)%6===0))?MOSS[(i+k)&1]:ROCK[(i*3+j*5+k*7+((j*k)>>2))&3];

// ---------- hình dạng hồ (tọa độ cục bộ) ----------
const wob=th=>1+.07*Math.sin(2*th+1)+.05*Math.sin(3*th+.4)+.03*Math.sin(5*th+2);   // bờ hồ lượn nhẹ, không tròn trịa
function rhoL(x,z){   // <1: trong lòng hồ
  const u=x-POOL.cx,th=Math.atan2(z,u),
    r1=Math.pow(Math.pow(Math.abs(u)/POOL.a,POOL.p)+Math.pow(Math.abs(z)/POOL.b,POOL.p),1/POOL.p)/wob(th),
    r2=Math.hypot((x-LOBE.cx)/LOBE.a,z/LOBE.b);
  return Math.min(r1,r2);
}
function edgeT(th,p){   // khoảng cách từ tâm bể chính tới bờ (rho=p) theo hướng th, lấy giao điểm ngoài cùng
  const dx=Math.cos(th),dz=Math.sin(th);let t=12;
  while(t>0&&rhoL(POOL.cx+dx*t,dz*t)>=p)t-=.05;
  return t;
}
const hsh=(a,b,s)=>{let h=Math.imul(a|0,374761393)^Math.imul(b|0,668265263)^Math.imul(s|0,2147483647);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967295};
const vn=(x,z,s)=>{const i=Math.floor(x),j=Math.floor(z),fx=S1(x-i),fz=S1(z-j),a=hsh(i,j,s),b=hsh(i+1,j,s),c=hsh(i,j+1,s),d=hsh(i+1,j+1,s);return a+(b-a)*fx+(c-a)*fz+(a-b-c+d)*fx*fz};
const base0=u=>u<.9?1.0:u<1.9?2.4:3.9;                              // 3 bậc dựng đứng: chân vách 1.0 -> 2.4 -> 3.9 m (thác đổ thẳng xuống từng bậc)
const dome=(x,z)=>1.3*Math.exp(-Math.pow(z/2.4,2))*S1((x-X0-2.0)/1.2);   // đỉnh núi nhô cao ở giữa, sát tường

// ---------- hồ cho nature.js (tọa độ thế giới) ----------
window.BathPools=BATHS.map(b=>{
  const L=(x,z)=>[b.sx*(x-b.x),b.sx*(z-b.z)],W=(lx,lz)=>[b.x+b.sx*lx,b.z+b.sx*lz],cw=W(POOL.cx,0);
  return {
    cx:cw[0],cz:cw[1],ux:b.sx,uz:0,rx:POOL.a,rz:POOL.b,dmax:BATH_DEPTH,pool:true,
    rho:(x,z)=>{const [lx,lz]=L(x,z);return rhoL(lx,lz)},
    loc:(x,z)=>L(x,z),
    at:(a,p)=>{const t=edgeT(a,p);return W(POOL.cx+Math.cos(a)*t,Math.sin(a)*t)},
    water:[0x3fb8b0,0x6fe0d0,0x2a9a9a,0xbff5ea],            // xanh ngọc như ảnh: [trung bình, sáng, tối, bọt]
    sand:[0x9a9fa8,0x8d939c]                                // màu đáy ở chỗ nông (đá lát)
  };
});
// cây / đá / sông / đầu cầu né toàn bộ khu hồ tắm (nền + vách đá + lề)
window.BathKeeps=BATHS.map(b=>{const ax=b.x-b.sx*8.6,bx=b.x+b.sx*7.6;return{x0:Math.min(ax,bx),x1:Math.max(ax,bx),z0:b.z-6.8,z1:b.z+6.8}});

// ---------- họa tiết nước chảy / thác / bọt (dùng chung, có hoạt ảnh) ----------
function cvs(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function waterTex(){
  const N=128,c=cvs(N,N),x=c.getContext('2d'),g=x.createLinearGradient(0,0,N,N);
  g.addColorStop(0,'rgb(90,205,190)');g.addColorStop(1,'rgb(140,228,210)');x.fillStyle=g;x.fillRect(0,0,N,N);
  let sd=7;const r=()=>(sd=(sd*1664525+1013904223)>>>0)/4294967296;x.lineWidth=2;
  for(let n=0;n<22;n++){const px=r()*N,py=r()*N,rad=6+r()*14,a=.15+r()*.25;x.strokeStyle='rgba(240,255,250,'+a+')';
    for(const ox of[-N,0,N])for(const oy of[-N,0,N]){x.beginPath();x.arc(px+ox,py+oy,rad,r()*6,r()*6+2.2);x.stroke()}}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,2);return t;
}
function fallTex(){
  const W=32,H=128,c=cvs(W,H),x=c.getContext('2d');
  x.fillStyle='rgba(165,225,240,.6)';x.fillRect(0,0,W,H);
  let sd=3;const r=()=>(sd=(sd*1664525+1013904223)>>>0)/4294967296;
  for(let n=0;n<22;n++){const px=r()*W,len=20+r()*60,py=r()*H,a=.35+r()*.55;x.fillStyle='rgba(255,255,255,'+a+')';
    for(const oy of[-H,0,H])x.fillRect(px,py+oy,1+r()*2.5,len)}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,2);return t;
}
const WT=waterTex(),FT=fallTex();
const flowMat=new THREE.MeshBasicMaterial({map:WT,transparent:true,opacity:.85,depthWrite:false,side:THREE.DoubleSide});
const fallMat=new THREE.MeshBasicMaterial({map:FT,transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide});
const foamMat=new THREE.MeshBasicMaterial({color:0xf4fffb,transparent:true,opacity:.5,depthWrite:false,side:THREE.DoubleSide});

function quadMesh(P,U,mat){
  const g=new THREE.BufferGeometry(),idx=[];
  for(let q=0;q<P.length/12;q++){const k=q*4;idx.push(k,k+1,k+2,k,k+2,k+3)}
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.setIndex(idx);
  const m=new THREE.Mesh(g,mat);m.renderOrder=2;m.frustumCulled=false;return m;
}

function buildBath(b,idx){
  let sd=101+idx*977;const rnd=(a,c)=>a+(sd=(sd*1664525+1013904223)>>>0)/4294967296*(c-a);   // seed cố định -> dựng lại ra y hệt
  const v=new VB(),g=new THREE.Group(),rot=b.sx>0?0:Math.PI,seed=idx*131+7;
  const fb=(x0,x1,y0,y1,z0,z1,c,s=.25,sh=false)=>v.box((x0+x1)/2,(y0+y1)/2,(z0+z1)/2,x1-x0,y1-y0,z1-z0,c,s,sh);
  const fp=(x0,x1,y0,y1,z0,z1,s,fn,sh=false)=>fb(x0,x1,y0,y1,z0,z1,(i,j,k)=>fn(x0+(i+.5)*s,y0+(j+.5)*s,z0+(k+.5)*s,i,j,k),s,sh);
  // va chạm: tọa độ cục bộ -> thế giới (hồ sx=-1 xoay 180 độ quanh tâm)
  const col=(x0,x1,y0,y1,z0,z1)=>boxes.push(b.sx>0?{x0:b.x+x0,x1:b.x+x1,y0,y1,z0:b.z+z0,z1:b.z+z1}:{x0:b.x-x1,x1:b.x-x0,y0,y1,z0:b.z-z1,z1:b.z-z0});

  // ---- nền lát đá phẳng quanh hồ (chừa lòng hồ để nature.js đào) ----
  const PH=.09;
  fp(-7.2,X0,0,PH,-5.4,5.4,.25,(x,y,z)=>{
    if(Math.pow(Math.abs(x+1.55)/5.65,6)+Math.pow(Math.abs(z)/5.4,6)>=1||rhoL(x,z)<1.04)return -1;
    const tx=(x+9)/1.3,tz=(z+9)/1.1;
    if(tx%1<.2||tz%1<.23)return MORT;
    return PAVE[(Math.floor(tx)*7+Math.floor(tz)*13+Math.floor(tx)*Math.floor(tz))&3];
  });
  col(-7.2,-6.2,0,PH,-5.4,5.4);col(-7.2,X0,0,PH,4.5,5.4);col(-7.2,X0,0,PH,-5.4,-4.5);   // chặn cỏ mọc xuyên nền (vùng gần hồ cỏ đã tránh sẵn)

  // ---- viền hồ: đá tảng dài, xếp theo đúng đường bờ (chừa lối vào phía -x) ----
  const ell=(x,y,z,rx,ry,rz,s)=>v.ell(x,y,z,rx,ry,rz,rockC,s,true);
  for(let th=rnd(0,.3);th<6.283;){
    const t=edgeT(th,1),bx=POOL.cx+Math.cos(th)*t,bz=Math.sin(th)*t;
    th+=Math.min(.45,rnd(.8,1.05)/Math.max(t,1.5));
    const e=.05,gx=rhoL(bx+e,bz)-rhoL(bx-e,bz),gz=rhoL(bx,bz+e)-rhoL(bx,bz-e),gl=Math.hypot(gx,gz)||1,nx=gx/gl,nz=gz/gl,
      off=.72,px=bx+nx*off,pz=bz+nz*off;
    if(px<-3.3&&Math.abs(pz)<1.7)continue;      // lối vào
    if(px>X0-.5&&Math.abs(pz)<ZH)continue;      // đã có vách đá
    const Wr=rnd(.55,.75),Lr=rnd(.7,1.0),ry=rnd(.35,.72),tx=-nz,tz=nx,
      rx=Math.abs(tx)*Lr+Math.abs(nx)*Wr,rz=Math.abs(tz)*Lr+Math.abs(nz)*Wr,top=ry*1.55;
    ell(px,ry*.55,pz,rx,ry,rz,.2);
    col(px-.4,px+.4,0,top*.92,pz-.4,pz+.4);
    if(rnd(0,1)<.35)ell(px+rnd(-.2,.2),top-.08,pz+rnd(-.2,.2),rnd(.3,.45),rnd(.2,.3),rnd(.3,.45),.15);   // đá nhỏ chồng lên
  }
  // ---- đá nhô lên giữa nước (nature.js tự chừa chỗ: ô dưới đá không có nước) ----
  for(const [x,z,rx,ry,rz] of [[-2.6,-1.1,.85,.6,.7],[.4,1.4,.7,.5,.6],[-1.0,-2.0,.45,.35,.45]]){
    ell(x,ry*.5,z,rx,ry,rz,.15);col(x-rx*.8,x+rx*.8,0,ry*1.4*.9,z-rz*.8,z+rz*.8);
  }
  // ---- 2 cột đèn ở lối vào ----
  for(const sz of[-1,1]){const x=-6.4,z=sz*2.6;
    fb(x-.06,x+.06,PH,3.2,z-.06,z+.06,DARK,.06);
    fb(x-.2,x+.2,3.2,3.7,z-.2,z+.2,(i,j,k)=>(j===0||j===3)?DARK:0xffd070,.1);
    fb(x-.28,x+.28,3.7,3.85,z-.28,z+.28,DARK,.07);
    col(x-.1,x+.1,0,3.2,z-.1,z+.1);
  }

  // ---- vách đá: bản đồ độ cao (bậc + đồi + nhiễu), suối chảy trong lòng máng ----
  const H=[],bumps=[];
  for(let n=0;n<10;n++)bumps.push([rnd(4.4,7.2),rnd(-4.4,4.4),rnd(.5,1.0),rnd(.4,1.0)]);
  for(let i=0;i<NX;i++){H[i]=[];const x=X0+(i+.5)*CS,u=x-X0;
    for(let j=0;j<NZ;j++){const z=-ZH+(j+.5)*CS,
      e=S1((5.0-Math.abs(z)+(vn(x*.6,z*.6,seed)-.5)*2.4)/2.4);
      if(e<=0){H[i][j]=0;continue}
      let h=(base0(u+(vn(z*.9,x*.3,seed+3)-.5)*.6)+dome(x,z))*e+(vn(x*2.2,z*2.2,seed+1)-.5)*.6;
      for(const [bx,bz,r,am] of bumps)h+=am*Math.exp(-2*((x-bx)*(x-bx)+(z-bz)*(z-bz))/(r*r))*e;
      H[i][j]=Math.max(0,Math.round(h/CS)*CS);
    }}
  const chan=[];   // thông tin từng dòng suối: dải ô + độ cao theo x
  for(const [zs,hw] of STREAMS){
    const pf=i=>{const x=X0+(i+.5)*CS;return Math.max(.25,Math.round((base0(x-X0)-.15)/CS)*CS)};
    let jmin=NZ,jmax=-1;
    for(let j=0;j<NZ;j++){const z=-ZH+(j+.5)*CS,d=Math.abs(z-zs);
      for(let i=0;i<NX;i++){
        if(d<=hw){H[i][j]=pf(i)}
        else if(d<=hw+.5)H[i][j]=Math.max(H[i][j],pf(i)+.25);
      }
      if(d<=hw){jmin=Math.min(jmin,j);jmax=Math.max(jmax,j)}}
    chan.push({zs,jmin,jmax});
  }
  const Hg=(i,j)=>i<0?0:i>=NX?1e9:j<0||j>=NZ?0:H[i][j];
  for(let i=0;i<NX;i++)for(let j=0;j<NZ;j++){
    const h=H[i][j];if(h<CS*.5)continue;
    const hn=Math.min(Hg(i-1,j),Hg(i+1,j),Hg(i,j-1),Hg(i,j+1)),k0=Math.max(0,Math.floor(Math.min(hn,h-CS)/CS+1e-6)),k1=Math.round(h/CS);
    const x=X0+(i+.5)*CS,z=-ZH+(j+.5)*CS;
    for(let k=k0;k<k1;k++){
      const top=k===k1-1,y=(k+.5)*CS;
      let hex=ROCK[(k*3+(i>>1)*5+(j>>1)*7+((i*j)>>3))&3];
      if(top&&y<2.4&&hsh(i,j,seed+5)<.28)hex=MOSS[(i+j)&1];
      else if(!top&&k<3&&hsh(i,j,seed+k)<.2)hex=MOSS[j&1];
      else if(top&&hsh(i,j,seed+9)<.15)hex=ROCK[4];
      v.cube(x,y,z,CS*.93,CS*.93,CS*.93,hex,i,j,k);
    }
  }
  for(let bi=0;bi<NX;bi+=4)for(let bj=0;bj<NZ;bj+=4){   // va chạm: khối 1m lấy độ cao lớn nhất trong khối
    let m=0;for(let di=0;di<4&&bi+di<NX;di++)for(let dj=0;dj<4&&bj+dj<NZ;dj++)m=Math.max(m,H[bi+di][bj+dj]);
    if(m>.3)col(X0+bi*CS,X0+Math.min(NX,bi+4)*CS,0,m,-ZH+bj*CS,-ZH+Math.min(NZ,bj+4)*CS);
  }
  // tảng đá lớn dựa chân vách (cạnh hồ, không đè lên suối)
  for(const [x,z,rx,ry,rz] of [[X0+.4,-4.3,.9,.7,.8],[X0+.5,4.2,.8,.6,.9],[X0+1.2,-5.2,.7,.55,.6]]){ell(x,ry*.5,z,rx,ry,rz,.2);col(x-rx*.7,x+rx*.7,0,ry*1.3,z-rz*.7,z+rz*.7)}

  for(const m of v.meshLOD()){m.position.set(b.x,0,b.z);m.rotation.y=rot;S.add(m);meshes.push(m)}
  if(window.DayCycle)for(const sz of[-1,1]){   // 2 cột đèn lối vào sáng lên ban đêm (toạ độ cục bộ x=-6.4,z=±2.6 -> thế giới, theo góc xoay rot)
    const lx=-6.4,lz=sz*2.6,wx=b.x+lx*Math.cos(rot)+lz*Math.sin(rot),wz=b.z-lx*Math.sin(rot)+lz*Math.cos(rot);
    DayCycle.lamp(wx,3.45,wz,2.4,{light:true,I:.9,dist:9});
  }

  // ---- suối + thác chảy theo bề mặt vách (bám từng bậc), bọt chân thác ----
  g.position.set(b.x,0,b.z);g.rotation.y=rot;
  const hp=[],hu=[],vp=[],vu=[],em=[];
  for(const {zs,jmin,jmax} of chan){
    const za=-ZH+jmin*CS,zb=-ZH+(jmax+1)*CS,w=zb-za;
    for(let i=NX-1;i>=0;i--){
      const xa=X0+i*CS,xb=xa+CS,y=H[i][jmin]+.03;
      hp.push(xa,y,za,xb,y,za,xb,y,zb,xa,y,zb);hu.push(xa*.6,za*.6,xb*.6,za*.6,xb*.6,zb*.6,xa*.6,zb*.6);
      const y2=i>0?H[i-1][jmin]+.03:-.1;
      if(y-y2>.02){const x=xa-.015;vp.push(x,y2,za,x,y,za,x,y,zb,x,y2,zb);vu.push(0,y2*.35,1,y2*.35,1,y*.35,0,y*.35);
        const big=i===0;   // i=0: bậc cuối đổ thẳng xuống hồ -> bọt nước nhiều + cao; các bậc trên bọt nhỏ
        em.push({k:'drip',x:xa-.06,y0:y2,y1:y,za,zb,rate:(zb-za)*14+4,acc:0});
        em.push({k:'splash',x:big?X0-.4:xa-.2,y:big?-.04:y2+.04,za,zb,rate:big?(zb-za)*75+25:(zb-za)*28+8,up:big?1.5:.85,acc:0})}
    }
    const f=new THREE.Mesh(new THREE.CircleGeometry(.55,16),foamMat);f.rotation.x=-Math.PI/2;f.scale.set(1,1,Math.max(.5,w*.5));   // bọt trắng chân thác
    f.position.set(X0-.3,.04,zs);f.renderOrder=3;g.add(f);
  }
  g.add(quadMesh(hp,hu,flowMat));g.add(quadMesh(vp,vu,fallMat));
  S.add(g);
  mkSpray(b,g,em);
}
// ---------- giọt nước + bọt tóe (giống bọt khi bắn súng xuống nước): rơi dọc mặt thác, tóe lên ở chân từng bậc và chỗ thác đổ xuống hồ ----
const sprays=[];
const dropMats=[0xffffff,0x9fd8ff,0xdff6ff].map(c=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.92}));
if(window.DayCycle)[flowMat,fallMat,foamMat,...dropMats].forEach(DayCycle.unlit);   // MeshBasic không ăn đèn: nhân màu theo giờ để ban đêm thác không trắng sáng
function mkSpray(b,g,em){
  const geo=new THREE.BoxGeometry(1,1,1),pool=[];
  for(let i=0;i<450;i++){const m=new THREE.Mesh(geo,dropMats[i%3]);m.visible=false;g.add(m);pool.push({m,on:false,vx:0,vy:0,vz:0,t:0,life:0,fy:0})}
  sprays.push({b,g,em,pool,geo});
}
function spawn(sp,e){
  const q=sp.pool.find(p=>!p.on);if(!q)return;
  const R=Math.random,s=e.k==='drip'?.07+R()*.07:.09+R()*.13;   // bọt to hơn giọt
  q.on=true;q.t=0;q.m.visible=true;q.m.scale.set(s,s,s);
  if(e.k==='drip'){   // giọt rơi sát mặt thác
    q.m.position.set(e.x-R()*.08,e.y0+R()*(e.y1-e.y0),e.za+R()*(e.zb-e.za));
    q.vx=-.15-R()*.25;q.vy=-R()*.8;q.vz=(R()-.5)*.3;q.life=2;q.fy=e.y0;
  }else{              // bọt tóe lên rồi rơi lại
    q.m.position.set(e.x+(R()-.5)*.7,e.y+.03,e.za-.15+R()*(e.zb-e.za+.3));
    q.vx=-(.2+R()*1.3)*e.up;q.vy=(1.4+R()*2.8)*e.up;q.vz=(R()-.5)*1.3;q.life=1.2;q.fy=e.y-.02;
  }
}
function tickSpray(dt){
  const hasP=typeof P!=='undefined';
  for(let n=sprays.length-1;n>=0;n--){const sp=sprays[n];
    if(!sp.g.parent){sp.geo.dispose();sprays.splice(n,1);continue}   // tầng 1 đã bị dỡ
    const near=!hasP||Math.hypot(P.x-sp.b.x,P.z-sp.b.z)<48;
    for(const q of sp.pool){if(!q.on)continue;
      q.t+=dt;q.vy-=9.8*dt;const p=q.m.position;
      p.x+=q.vx*dt;p.y+=q.vy*dt;p.z+=q.vz*dt;
      if(p.y<q.fy||q.t>q.life){q.on=false;q.m.visible=false}}
    if(!near)continue;
    for(const e of sp.em){e.acc+=e.rate*dt;while(e.acc>=1){e.acc-=1;spawn(sp,e)}}
  }
}
function build(){BATHS.forEach(buildBath)}
build();
window.Bath={build,rebuild:build};

// hoạt ảnh: suối chảy, thác đổ, bọt nhấp nhô (1 vòng lặp riêng, rất nhẹ)
let _t=performance.now();
(function loop(t){requestAnimationFrame(loop);const dt=Math.min(.1,(t-_t)/1000);_t=t;
  FT.offset.y+=dt*1.7;WT.offset.x+=dt*.35;foamMat.opacity=.45+.2*Math.sin(t/260);tickSpray(dt);
})(_t);
})();
