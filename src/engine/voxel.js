// Lõi dựng mô hình bằng khối rubik nhỏ (voxel). Mỗi bộ phận gộp thành 1 mesh nên vẫn nhẹ dù hàng nghìn khối.
// new VB(true) = nhớ lại từng khối (dùng cho bot để vỡ mảnh khi chết). shell=true = chỉ tạo lớp vỏ ngoài, bỏ khối ruột.
// Cách dùng: box(tâm x,y,z, rộng,cao,dài, màu hoặc hàm màu, cỡ khối) · cyl(...) hình trụ · ell(...) hình cầu/elip
const VMAT=new THREE.MeshLambertMaterial({vertexColors:true,emissive:0x1e1e1e});
const FACES=(()=>{const f=[];for(let a=0;a<3;a++)for(const s of[1,-1]){
  const A=(a+1)%3,B=(a+2)%3,u=s>0?A:B,v=s>0?B:A,n=[0,0,0];n[a]=s;
  f.push({n,q:[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>{const p=[0,0,0];p[a]=s;p[u]=x;p[v]=y;return p})})}return f})();
class VB{
  constructor(keep=false){this.keep=keep;this.cubes=[];this.p=[];this.n=[];this.c=[];this.i=[];this.k=0;this.seed=0}
  cube(x,y,z,sx,sy,sz,hex,ci,cj,ck){
    const h=((ci*73856093)^(cj*19349663)^(ck*83492791)^(this.seed*2654435761))>>>0;
    const col=new THREE.Color(hex).multiplyScalar([.88,.95,1,1.07][(h>>>7)&3]);
    if(this.keep)this.cubes.push({x,y,z,sx,sy,sz,hex});
    for(const f of FACES){
      const b=this.k;
      for(const q of f.q){this.p.push(x+q[0]*sx/2,y+q[1]*sy/2,z+q[2]*sz/2);this.n.push(f.n[0],f.n[1],f.n[2]);this.c.push(col.r,col.g,col.b)}
      this.i.push(b,b+1,b+2,b,b+2,b+3);this.k+=4;
    }
  }
  box(cx,cy,cz,w,h,d,col,s=.024,shell=false){
    const nx=Math.max(1,Math.round(w/s)),ny=Math.max(1,Math.round(h/s)),nz=Math.max(1,Math.round(d/s)),cw=w/nx,ch=h/ny,cd=d/nz,g=.93;this.seed++;
    for(let i=0;i<nx;i++)for(let j=0;j<ny;j++)for(let k=0;k<nz;k++){
      if(shell&&i>0&&i<nx-1&&j>0&&j<ny-1&&k>0&&k<nz-1)continue;
      const hex=typeof col==='function'?col(i,j,k,nx,ny,nz):col;if(hex<0)continue;
      this.cube(cx+(i+.5-nx/2)*cw,cy+(j+.5-ny/2)*ch,cz+(k+.5-nz/2)*cd,cw*g,ch*g,cd*g,hex,i,j,k);
    }
  }
  // trụ tròn theo trục ax ('x'|'y'|'z'), ri>0 để khoét rỗng (làm vòng)
  cyl(cx,cy,cz,r,len,col,s=.02,ax='z',ri=0){
    const n=Math.max(1,Math.round(2*r/s)),nl=Math.max(1,Math.round(len/s)),cs=2*r/n,cl=len/nl,g=.93;this.seed++;
    for(let a=0;a<n;a++)for(let b=0;b<n;b++)for(let l=0;l<nl;l++){
      const u=(a+.5-n/2)*cs,v=(b+.5-n/2)*cs,d2=u*u+v*v;if(d2>r*r*1.05||d2<ri*ri)continue;
      const w=(l+.5-nl/2)*cl,hex=typeof col==='function'?col(a,b,l):col;if(hex<0)continue;
      if(ax==='z')this.cube(cx+u,cy+v,cz+w,cs*g,cs*g,cl*g,hex,a,b,l);
      else if(ax==='x')this.cube(cx+w,cy+u,cz+v,cl*g,cs*g,cs*g,hex,a,b,l);
      else this.cube(cx+u,cy+w,cz+v,cs*g,cl*g,cs*g,hex,a,b,l);
    }
  }
  ell(cx,cy,cz,rx,ry,rz,col,s=.02,shell=false){
    const nx=Math.round(2*rx/s),ny=Math.round(2*ry/s),nz=Math.round(2*rz/s),g=.93;this.seed++;
    const ins=(i,j,k)=>((i+.5-nx/2)*s/rx)**2+((j+.5-ny/2)*s/ry)**2+((k+.5-nz/2)*s/rz)**2<=1;
    for(let i=0;i<nx;i++)for(let j=0;j<ny;j++)for(let k=0;k<nz;k++){
      if(!ins(i,j,k))continue;
      if(shell&&ins(i-1,j,k)&&ins(i+1,j,k)&&ins(i,j-1,k)&&ins(i,j+1,k)&&ins(i,j,k-1)&&ins(i,j,k+1))continue;
      const hex=typeof col==='function'?col(i,j,k):col;
      this.cube(cx+(i+.5-nx/2)*s,cy+(j+.5-ny/2)*s,cz+(k+.5-nz/2)*s,s*g,s*g,s*g,hex,i,j,k);
    }
  }
  mesh(){
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));
    geo.setAttribute('normal',new THREE.Float32BufferAttribute(this.n,3));
    geo.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));
    geo.setIndex(this.i);
    geo.computeBoundingSphere();
    // mesh LỚN tĩnh (nhà, chòi, tượng...: bán kính > 3m) cho three.js tự bỏ vẽ khi nằm ngoài tầm nhìn; vật nhỏ / súng cầm tay giữ không cull như cũ (tránh nhấp nháy)
    const m=new THREE.Mesh(geo,VMAT);m.frustumCulled=geo.boundingSphere.radius>3;return m;
  }
}
const chk=(a,b)=>(i,j,k)=>((i+j+k)&1)?a:b;
const DKC=chk(0x3a3850,0x2b2a3a),YLC=chk(0xf2b84b,0xffd76a);

const tri=(a,b,c)=>(i,j,k)=>[a,b,c][(i+j+k)%3];
