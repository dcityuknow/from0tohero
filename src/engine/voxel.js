// Lõi dựng mô hình bằng khối rubik nhỏ (voxel). Mỗi bộ phận gộp thành 1 mesh nên vẫn nhẹ dù hàng nghìn khối.
// new VB(true) = nhớ lại từng khối (dùng cho bot để vỡ mảnh khi chết). shell=true = chỉ tạo lớp vỏ ngoài, bỏ khối ruột.
// Cách dùng: box(tâm x,y,z, rộng,cao,dài, màu hoặc hàm màu, cỡ khối) · cyl(...) hình trụ · ell(...) hình cầu/elip
const VMAT=new THREE.MeshLambertMaterial({vertexColors:true,emissive:0x1e1e1e});
// KHOẢNG HỞ GIỮA CÁC KHỐI: 1 = SÁT NHAU (không còn khe) -> mặt chung của 2 khối kề nhau trùng khít và bị BỎ HẲN (mesh() / meshLOD() bên dưới).
// Bản cũ dùng .93 (khe 7%, nên mặt chung không trùng khít và không bỏ được). Thử lại kiểu cũ: thêm ?vgap=.93 vào địa chỉ trang.
const VGAP=(()=>{const v=parseFloat(new URLSearchParams(location.search).get('vgap'));return v>0&&v<=1?v:.99})();
const VTIGHT=VGAP>=.999;
// Công tắc thử: thêm ?cull=0 vào địa chỉ trang để TẮT việc bỏ mặt khuất (vẫn sát khối) - dùng để xem một lỗi hiển thị có do bỏ mặt hay không.
const VCULL=new URLSearchParams(location.search).get('cull')!=='0';
// BỎ MẶT KHUẤT (mọi giá trị vgap): khối nào có đủ 6 khối cùng cỡ kề sát thì không ai nhìn thấy nó.
//  - vgap=1 (sát nhau): mặt nào có khối kề ngay phía ngoài thì bỏ (hai mặt chung trùng khít nhau).
//  - vgap<1 (có khe): vẫn nhìn xuyên vào khe được, nên GIỮ mọi mặt của khối còn lộ ra ngoài (thành khe sâu ~1 ô), chỉ bỏ mặt giữa 2 khối nằm sâu >= VCULLD ô trong lòng khối.
//  ?culld=N -> tự chọn độ sâu giữ lại (mặc định tự tính theo độ rộng khe; N lớn = khe nhìn sâu hơn, đổi lại bỏ ít mặt hơn).  ?cullbot=1 -> bỏ cả mặt khuất của VB nhớ khối (bot / boss).
const VCULLD=(()=>{const v=parseInt(new URLSearchParams(location.search).get('culld'));return v>=1?v:Math.max(1,Math.ceil((1-VGAP)*10))})();   // tự động: khe càng rộng càng giữ sâu (.93->1 ô, .8->2 ô, .7->3 ô)
const VCULLK=new URLSearchParams(location.search).get('cullbot')==='1';
const FACES=(()=>{const f=[];for(let a=0;a<3;a++)for(const s of[1,-1]){
  const A=(a+1)%3,B=(a+2)%3,u=s>0?A:B,v=s>0?B:A,n=[0,0,0];n[a]=s;
  f.push({n,q:[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>{const p=[0,0,0];p[a]=s;p[u]=x;p[v]=y;return p})})}return f})();
class VB{
  constructor(keep=false){this.keep=keep;this.cc=[];this.cubes=[];this.p=[];this.n=[];this.c=[];this.i=[];this.k=0;this.seed=0}
  cube(x,y,z,sx,sy,sz,hex,ci,cj,ck){
    const h=((ci*73856093)^(cj*19349663)^(ck*83492791)^(this.seed*2654435761))>>>0;
    const col=new THREE.Color(hex).multiplyScalar([.88,.95,1,1.07][(h>>>7)&3]);
    this.cc.push(x,y,z,sx,sy,sz);   // tâm + kích thước (dùng để tìm khối kề khi bỏ mặt khuất)
    if(this.keep)this.cubes.push({x,y,z,sx,sy,sz,hex});
    for(const f of FACES){
      const b=this.k;
      for(const q of f.q){this.p.push(x+q[0]*sx/2,y+q[1]*sy/2,z+q[2]*sz/2);this.n.push(f.n[0],f.n[1],f.n[2]);this.c.push(col.r,col.g,col.b)}
      this.i.push(b,b+1,b+2,b,b+2,b+3);this.k+=4;
    }
  }
  box(cx,cy,cz,w,h,d,col,s=.024,shell=false){
    const nx=Math.max(1,Math.round(w/s)),ny=Math.max(1,Math.round(h/s)),nz=Math.max(1,Math.round(d/s)),cw=w/nx,ch=h/ny,cd=d/nz,g=VGAP;this.seed++;
    for(let i=0;i<nx;i++)for(let j=0;j<ny;j++)for(let k=0;k<nz;k++){
      if(shell&&i>0&&i<nx-1&&j>0&&j<ny-1&&k>0&&k<nz-1)continue;
      const hex=typeof col==='function'?col(i,j,k,nx,ny,nz):col;if(hex<0)continue;
      this.cube(cx+(i+.5-nx/2)*cw,cy+(j+.5-ny/2)*ch,cz+(k+.5-nz/2)*cd,cw*g,ch*g,cd*g,hex,i,j,k);
    }
  }
  // trụ tròn theo trục ax ('x'|'y'|'z'), ri>0 để khoét rỗng (làm vòng)
  cyl(cx,cy,cz,r,len,col,s=.02,ax='z',ri=0){
    const n=Math.max(1,Math.round(2*r/s)),nl=Math.max(1,Math.round(len/s)),cs=2*r/n,cl=len/nl,g=VGAP;this.seed++;
    for(let a=0;a<n;a++)for(let b=0;b<n;b++)for(let l=0;l<nl;l++){
      const u=(a+.5-n/2)*cs,v=(b+.5-n/2)*cs,d2=u*u+v*v;if(d2>r*r*1.05||d2<ri*ri)continue;
      const w=(l+.5-nl/2)*cl,hex=typeof col==='function'?col(a,b,l):col;if(hex<0)continue;
      if(ax==='z')this.cube(cx+u,cy+v,cz+w,cs*g,cs*g,cl*g,hex,a,b,l);
      else if(ax==='x')this.cube(cx+w,cy+u,cz+v,cl*g,cs*g,cs*g,hex,a,b,l);
      else this.cube(cx+u,cy+w,cz+v,cs*g,cl*g,cs*g,hex,a,b,l);
    }
  }
  ell(cx,cy,cz,rx,ry,rz,col,s=.02,shell=false){
    const nx=Math.round(2*rx/s),ny=Math.round(2*ry/s),nz=Math.round(2*rz/s),g=VGAP;this.seed++;
    const ins=(i,j,k)=>((i+.5-nx/2)*s/rx)**2+((j+.5-ny/2)*s/ry)**2+((k+.5-nz/2)*s/rz)**2<=1;
    for(let i=0;i<nx;i++)for(let j=0;j<ny;j++)for(let k=0;k<nz;k++){
      if(!ins(i,j,k))continue;
      if(shell&&ins(i-1,j,k)&&ins(i+1,j,k)&&ins(i,j-1,k)&&ins(i,j+1,k)&&ins(i,j,k-1)&&ins(i,j,k+1))continue;
      const hex=typeof col==='function'?col(i,j,k):col;
      this.cube(cx+(i+.5-nx/2)*s,cy+(j+.5-ny/2)*s,cz+(k+.5-nz/2)*s,s*g,s*g,s*g,hex,i,j,k);
    }
  }
  mesh(){
    let p=this.p,n=this.n,c=this.c,ix=this.i;
    if(VCULL&&(!this.keep||VCULLK)){try{const r=this.cullFaces();if(r){p=r.p;n=r.n;c=r.c;ix=r.i}}catch(e){console.warn('VB.cullFaces',e)}}
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
    geo.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));
    geo.setAttribute('color',new THREE.Float32BufferAttribute(c,3));
    geo.setIndex(Array.isArray(ix)?ix:new THREE.BufferAttribute(ix,1));   // r128: setIndex chỉ nhận mảng thường hoặc BufferAttribute (không nhận Uint16Array)
    geo.computeBoundingSphere();
    // mesh LỚN tĩnh (nhà, chòi, tượng...: bán kính > 3m) cho three.js tự bỏ vẽ khi nằm ngoài tầm nhìn; vật nhỏ / súng cầm tay giữ không cull như cũ (tránh nhấp nháy)
    const m=new THREE.Mesh(geo,VMAT);m.frustumCulled=geo.boundingSphere.radius>3;return m;
  }
}
const chk=(a,b)=>(i,j,k)=>((i+j+k)&1)?a:b;
const DKC=chk(0x3a3850,0x2b2a3a),YLC=chk(0xf2b84b,0xffd76a);

const tri=(a,b,c)=>(i,j,k)=>[a,b,c][(i+j+k)%3];

// ---- BỎ MẶT KHUẤT: tìm mặt nào cần GIỮ. Trả về {keep:Uint8Array(số khối*6), nC} hoặc null (không cắt được) ----
VB.prototype.faceKeep=function(){
  const nC=(this.k/24)|0,cc=this.cc;if(nC<2||!cc||cc.length!==nC*6)return null;
  const G=VGAP;let mn=1e9,mx=0;
  for(let c=0;c<nC;c++){const o=c*6;mn=Math.min(mn,cc[o+3],cc[o+4],cc[o+5]);mx=Math.max(mx,Math.abs(cc[o]),Math.abs(cc[o+1]),Math.abs(cc[o+2]))}
  const Q=Math.min(500,8/mn),OFF=65536;if((mx+1)*Q>=OFF-2)return null;   // quá xa gốc toạ độ cho khoá số nguyên: không cắt (an toàn)
  const key=(x,y,z)=>((Math.round(x*Q)+OFF)*131072+(Math.round(y*Q)+OFF))*131072+(Math.round(z*Q)+OFF);
  const mp=new Map();for(let c=0;c<nC;c++)mp.set(key(cc[c*6],cc[c*6+1],cc[c*6+2]),c);
  const nb=new Int32Array(nC*6).fill(-1);   // nb[c*6+f] = khối cùng cỡ kề sát ở mặt f (hoặc -1)
  for(let c=0;c<nC;c++){
    const o=c*6,sx=cc[o+3],sy=cc[o+4],sz=cc[o+5],cx=sx/G,cy=sy/G,cz=sz/G;   // cx = bề rộng 1 ô (đã tính cả khe)
    for(let f=0;f<6;f++){const nv=FACES[f].n,j=mp.get(key(cc[o]+nv[0]*cx,cc[o+1]+nv[1]*cy,cc[o+2]+nv[2]*cz));
      if(j!==undefined&&Math.abs(cc[j*6+3]-sx)<2e-4&&Math.abs(cc[j*6+4]-sy)<2e-4&&Math.abs(cc[j*6+5]-sz)<2e-4)nb[c*6+f]=j}
  }
  const keep=new Uint8Array(nC*6);
  if(G>=.999){for(let i=0;i<nC*6;i++)keep[i]=nb[i]<0?1:0}   // sát khối: mặt nào có khối kề thì hai mặt chung trùng nhau -> bỏ
  else{
    // có khe: độ sâu = số ô tính từ khối lộ ngoài (lan theo 6 hướng). Chỉ bỏ mặt giữa 2 khối cùng nằm sâu >= VCULLD.
    const dep=new Uint8Array(nC).fill(255),qu=[];
    for(let c=0;c<nC;c++){for(let f=0;f<6;f++)if(nb[c*6+f]<0){dep[c]=0;qu.push(c);break}}
    for(let h=0;h<qu.length;h++){const c=qu[h],d=dep[c];if(d>=VCULLD)continue;
      for(let f=0;f<6;f++){const j=nb[c*6+f];if(j>=0&&dep[j]>d+1){dep[j]=d+1;qu.push(j)}}}
    for(let c=0;c<nC;c++)for(let f=0;f<6;f++){const j=nb[c*6+f];keep[c*6+f]=(j<0||dep[c]<VCULLD||dep[j]<VCULLD)?1:0}
  }
  return {keep,nC};
};
// dựng lại mảng đỉnh chỉ với các mặt được giữ (null nếu không bỏ được mặt nào)
VB.prototype.cullFaces=function(){
  const r=this.faceKeep();if(!r)return null;
  const keep=r.keep,tot=keep.length;let kept=0;for(let i=0;i<tot;i++)kept+=keep[i];
  if(kept===tot)return null;
  const P=this.p,N=this.n,C=this.c,p=new Float32Array(kept*12),n=new Float32Array(kept*12),c=new Float32Array(kept*12),
    ix=(kept*4>65535)?new Uint32Array(kept*6):new Uint16Array(kept*6);
  let q=0;
  for(let i=0;i<tot;i++){if(!keep[i])continue;const s=i*12,w=q*12;   // mặt (khối c, hướng f) bắt đầu ở đỉnh c*24+f*4 = i*4
    for(let k=0;k<12;k++){p[w+k]=P[s+k];n[w+k]=N[s+k];c[w+k]=C[s+k]}
    const b=q*4,o=q*6;ix[o]=b;ix[o+1]=b+1;ix[o+2]=b+2;ix[o+3]=b;ix[o+4]=b+2;ix[o+5]=b+3;q++}
  return {p,n,c,i:ix};
};

// ============================================================================
// VOXEL LOD: mesh voxel LỚN (nhà, chòi, tượng, bể tắm) được cắt thành các ô ~6m. Mỗi ô có 2 bản hình học:
//   · GẦN: y hệt cũ (đủ mặt, có khe 7% giữa các khối) -> chất lượng gần không đổi.
//   · XA : CHỈ giữ mặt lộ ra ngoài (bỏ mặt giữa 2 khối kề nhau), đồng thời PHÓNG khối ra 1/.93 để BỊT khe.
//          (nếu chỉ bỏ mặt mà không bịt khe thì mỗi điểm ảnh rơi vào khe sẽ nhìn xuyên ra nền -> đốm nhấp nháy, vì game không bật antialias)
//          Khe 7% ở xa nhỏ hơn 1 điểm ảnh nên mắt không thấy khác; thuộc tính bản xa nén (normal Int8, màu Uint8) để bớt VRAM.
// VLOD.tick() (gọi 1 lần/khung từ main.js) đổi bản gần <-> bản xa theo khoảng cách camera tới ô (có độ trễ để không nhấp nháy ranh giới).
// Chỉnh: VLOD.cfg.far (m, mặc định 16 ~ sát chỗ sương bắt đầu 18m). Thử nhanh: ?vlod=0 tắt hẳn · ?vlodd=24 đổi khoảng cách · ?vlodc=0 tắt nén thuộc tính.
// Console: VLOD.log() xem số ô gần / xa và số tam giác tiết kiệm.
// ============================================================================
const VLOD=(function(){
  const qs=new URLSearchParams(location.search);
  const cfg={on:qs.get('vlod')!=='0',far:parseFloat(qs.get('vlodd'))||16,hyst:3,cell:6,minCubes:2000,compact:qs.get('vlodc')!=='0',K:1.1};
  const list=[];let VMATF=null;
  const farMat=()=>{if(!VMATF){VMATF=VMAT.clone();VMATF.color.setRGB(cfg.K,cfg.K,cfg.K)}return VMATF};   // màu Uint8 chỉ tới 1.0 mà màu đỉnh gốc tới 1.07 -> nhân lại ở vật liệu
  const _s=new THREE.Sphere(),_v=new THREE.Vector3();
  function tick(){
    if(!cfg.on||!list.length)return;
    const cp=C.position;
    for(let i=list.length-1;i>=0;i--){
      const e=list[i],m=e.m;
      if(!m.parent){if(++e.off>1800)list.splice(i,1);continue}   // đã bị dỡ tầng: ~30 giây sau thì quên
      e.off=0;
      if(!e.ok){m.updateWorldMatrix(true,false);_s.copy(e.gn.boundingSphere).applyMatrix4(m.matrixWorld);e.cx=_s.center.x;e.cy=_s.center.y;e.cz=_s.center.z;e.r=_s.radius;e.ok=true}
      const d=Math.hypot(cp.x-e.cx,cp.y-e.cy,cp.z-e.cz)-e.r;
      const far=e.far?d>cfg.far-cfg.hyst:d>cfg.far;
      if(far!==e.far){e.far=far;m.geometry=far?e.gf:e.gn;m.material=far?e.mf:VMAT}
    }
  }
  function log(){let n=0,f=0,tn=0,tf=0;for(const e of list){if(!e.m.parent)continue;n++;tn+=e.tn;tf+=e.far?e.tf:e.tn;if(e.far)f++}
    console.log('[Block Arena] voxel LOD: '+(cfg.on?'BẬT':'TẮT')+' · ô '+n+' (xa: '+f+') · tam giác '+tf+' / '+tn+' (tiết kiệm '+(tn?((1-tf/tn)*100).toFixed(0):0)+'%)');return{cells:n,far:f,tris:tf,full:tn}}
  return {cfg,list,tick,log,farMat};
})();

VB.prototype.meshLOD=function(cellSize){
  const nC=(this.k/24)|0;
  if(!VLOD.cfg.on||nC<VLOD.cfg.minCubes)return[this.mesh()];   // vật nhỏ / LOD tắt: như cũ
  const cell=cellSize||VLOD.cfg.cell,P=this.p,N=this.n,Cl=this.c,G=VGAP,Q=500,OFF=65536,CMP=VLOD.cfg.compact&&!VTIGHT,K=VLOD.cfg.K;
  // 1) tâm + kích thước từng khối (suy từ 24 đỉnh)
  const cc=new Float32Array(nC*6);let gx0=1e9,gx1=-1e9,gy0=1e9,gy1=-1e9,gz0=1e9,gz1=-1e9;
  for(let c=0;c<nC;c++){
    let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,z0=1e9,z1=-1e9;
    for(let v=c*72,e=v+72;v<e;v+=3){const x=P[v],y=P[v+1],z=P[v+2];if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;if(z<z0)z0=z;if(z>z1)z1=z}
    cc[c*6]=(x0+x1)/2;cc[c*6+1]=(y0+y1)/2;cc[c*6+2]=(z0+z1)/2;cc[c*6+3]=x1-x0;cc[c*6+4]=y1-y0;cc[c*6+5]=z1-z0;
    if(x0<gx0)gx0=x0;if(x1>gx1)gx1=x1;if(y0<gy0)gy0=y0;if(y1>gy1)gy1=y1;if(z0<gz0)gz0=z0;if(z1>gz1)gz1=z1;
  }
  if(Math.max(Math.abs(gx0),Math.abs(gx1),Math.abs(gy0),Math.abs(gy1),Math.abs(gz0),Math.abs(gz1))*Q>=OFF-2)return[this.mesh()];   // ngoài vùng khoá số nguyên: an toàn thì dùng mesh cũ
  const key=(x,y,z)=>((Math.round(x*Q)+OFF)*131072+(Math.round(y*Q)+OFF))*131072+(Math.round(z*Q)+OFF);
  const mp=new Map();for(let c=0;c<nC;c++)mp.set(key(cc[c*6],cc[c*6+1],cc[c*6+2]),c);
  // 2) chia ô theo không gian
  const grp=new Map();
  for(let c=0;c<nC;c++){const k=Math.floor(cc[c*6]/cell)+','+Math.floor(cc[c*6+1]/cell)+','+Math.floor(cc[c*6+2]/cell);let a=grp.get(k);if(!a)grp.set(k,a=[]);a.push(c)}
  const gbox=new THREE.Box3(new THREE.Vector3(gx0,gy0,gz0),new THREE.Vector3(gx1,gy1,gz1));
  const out=[],info=(VCULL&&!VTIGHT)?this.faceKeep():null;
  for(const cubes of grp.values()){
    const n=cubes.length;
    // ---- bản GẦN: sao chép nguyên các khối của ô ----
    const fl=[];for(let i=0;i<n;i++){const c=cubes[i];for(let f=0;f<6;f++)if(!info||info.keep[c*6+f])fl.push(c*6+f)}   // mặt giữ lại của ô này
    const nf=fl.length;if(!nf)continue;   // ô toàn khối nằm sâu trong lòng: không ai nhìn thấy
    const pn=new Float32Array(nf*12),nn=new Float32Array(nf*12),cn=new Float32Array(nf*12),in_=(nf*4>65535)?new Uint32Array(nf*6):new Uint16Array(nf*6);
    for(let q=0;q<nf;q++){const s=fl[q]*12,w=q*12;for(let k=0;k<12;k++){pn[w+k]=P[s+k];nn[w+k]=N[s+k];cn[w+k]=Cl[s+k]}
      const b=q*4,o=q*6;in_[o]=b;in_[o+1]=b+1;in_[o+2]=b+2;in_[o+3]=b;in_[o+4]=b+2;in_[o+5]=b+3}
    const gn=new THREE.BufferGeometry();
    gn.setAttribute('position',new THREE.BufferAttribute(pn,3));gn.setAttribute('normal',new THREE.BufferAttribute(nn,3));gn.setAttribute('color',new THREE.BufferAttribute(cn,3));gn.setIndex(new THREE.BufferAttribute(in_,1));
    gn.computeBoundingSphere();gn.boundingBox=gbox;   // hộp bao = cả mô hình như cũ (floors.js / bóng đổ phân tầng dựa vào hộp bao này)
    // ---- bản XA: chỉ mặt lộ ra ngoài, phóng 1/.93 quanh tâm khối để bịt khe ----
    const fp=[],fn=[],fc=[];let fq=0;
    for(let i=0;i<n;i++){
      const c=cubes[i],ox=cc[c*6],oy=cc[c*6+1],oz=cc[c*6+2],sx=cc[c*6+3],sy=cc[c*6+4],sz=cc[c*6+5],cx=sx/G,cy=sy/G,cz=sz/G;
      for(let f=0;f<6;f++){
        const nv=FACES[f].n,j=mp.get(key(ox+nv[0]*cx,oy+nv[1]*cy,oz+nv[2]*cz));
        if(j!==undefined&&Math.abs(cc[j*6+3]-sx)<2e-4&&Math.abs(cc[j*6+4]-sy)<2e-4&&Math.abs(cc[j*6+5]-sz)<2e-4)continue;   // có khối cùng cỡ ngay sát -> mặt này bị che
        for(let v=0;v<4;v++){const s=(c*24+f*4+v)*3;
          fp.push(ox+(P[s]-ox)/G,oy+(P[s+1]-oy)/G,oz+(P[s+2]-oz)/G);fn.push(N[s],N[s+1],N[s+2]);fc.push(Cl[s],Cl[s+1],Cl[s+2])}
        fq++;
      }
    }
    const fi=(fq*4>65535)?new Uint32Array(fq*6):new Uint16Array(fq*6);
    for(let q=0;q<fq;q++){const b=q*4,o=q*6;fi[o]=b;fi[o+1]=b+1;fi[o+2]=b+2;fi[o+3]=b;fi[o+4]=b+2;fi[o+5]=b+3}
    const gf=new THREE.BufferGeometry();
    if(CMP){
      const nb=new Int8Array(fn.length),cb=new Uint8Array(fc.length);
      for(let i=0;i<fn.length;i++){nb[i]=Math.round(fn[i]*127);cb[i]=Math.min(255,Math.round(fc[i]/K*255))}
      gf.setAttribute('position',new THREE.BufferAttribute(new Float32Array(fp),3));gf.setAttribute('normal',new THREE.BufferAttribute(nb,3,true));gf.setAttribute('color',new THREE.BufferAttribute(cb,3,true));
    }else{
      gf.setAttribute('position',new THREE.BufferAttribute(new Float32Array(fp),3));gf.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(fn),3));gf.setAttribute('color',new THREE.BufferAttribute(new Float32Array(fc),3));
    }
    gf.setIndex(new THREE.BufferAttribute(fi,1));gf.boundingSphere=gn.boundingSphere;gf.boundingBox=gbox;
    // dỡ tầng (floors.js) chỉ dispose hình học đang gắn -> nối để dispose luôn bản kia
    if(VTIGHT&&VCULL){gn.dispose();const m=new THREE.Mesh(gf,VMAT);m.frustumCulled=true;out.push(m);continue}   // sát khối: bản đã bỏ mặt khuất dùng luôn cho cả gần lẫn xa
    const dn=gn.dispose,df=gf.dispose;gn.dispose=function(){dn.call(gn);df.call(gf)};gf.dispose=function(){df.call(gf);dn.call(gn)};
    const m=new THREE.Mesh(gn,VMAT);m.frustumCulled=true;   // ô tĩnh có hình cầu bao chính xác nên cull được an toàn
    VLOD.list.push({m,gn,gf,mf:CMP?VLOD.farMat():VMAT,far:false,ok:false,off:0,cx:0,cy:0,cz:0,r:0,tn:n*12,tf:fq*2});
    out.push(m);
  }
  this.p=this.n=this.c=this.i=this.cc=null;   // giải phóng bộ nhớ CPU
  return out;
};
