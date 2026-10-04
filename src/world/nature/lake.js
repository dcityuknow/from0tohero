// ============================================================================
// nature/lake.js - Hồ / sông: độ sâu, sóng, đào lỗ trên sàn, đáy hồ bậc thang, thành hồ.
// (Tách ra từ nature.js cũ. Chia sẻ với các file nature/ khác qua NK = window.NatureKit.)
// ============================================================================
(function(){
const NK=window.NatureKit=window.NatureKit||{};
const {CFG,smooth,clamp01,_p,_s,_m,_q,ck,CELL,SLT}=NK;   // từ nature/kit.js


// ---- Độ sâu hồ: mực nước (m so với sàn) tại điểm (x,z). Dốc dần từ mép (0.1m) tới CFG.depth ở giữa ----
function lakeH(l,x,z){   // ĐỘ SÂU đáy hồ (m dưới mặt sàn) tại (x,z)
  if(l.ice)return .1;
  const m=Math.min(l.rx,l.rz),sh=Math.max(.5,Math.min(CFG.shelf,m*.7));
  const dist=(1-l.rho(x,z))*m;
  return .1+(l.dmax-.1)*smooth(clamp01(dist/sh));
}

const wdep=(l,x,z)=>Math.max(0,lakeH(l,x,z)-CFG.level);

function waveLake(l,t,px,pz){   // px,pz (tùy chọn): chỉ cập nhật ô trong bán kính 60m quanh người chơi (sông dài nhiều ô)
  const s=l.g*.995,cull=px!==undefined;
  for(let i=0;i<l.tiles.length;i++){const q=l.tiles[i];
    if(l.ice){_p.set(q.x,l.y+q.h0/2,q.z);_s.set(s,q.h0,s)}
    else{if(cull){const dx=q.x-px,dz=q.z-pz;if(dx*dx+dz*dz>3600)continue}
      const w=.018*(Math.sin(q.u*1.1-t*2.1)+Math.sin(q.v*1.5+t*1.2)+Math.sin((q.u+q.v)*.7-t*1.3)*.6)*Math.min(1,q.h0*2.5);   // sóng chạy xuôi dòng
      _p.set(q.x,l.y-CFG.level+w-.03,q.z);_s.set(s,.06,s)}   // mặt nước mỏng, nằm THẤP hơn sàn
    _m.compose(_p,_q,_s);l.mesh.setMatrixAt(i,_m)}
  l.mesh.instanceMatrix.needsUpdate=true;
}

// ---- Đào hồ: dựng hình học tùy biến (lát sàn có lỗ, đáy hồ bậc thang, thành hồ) ----
function GB(){return{p:[],n:[],c:[],u:[],a:[],b:[],k:0}}

function gq(g,pts,n,col,uv,top){   // 1 mặt phẳng 4 điểm, tự chỉnh chiều quay theo pháp tuyến n
  let [a,b,c,d]=pts;
  const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
  if((uy*vz-uz*vy)*n[0]+(uz*vx-ux*vz)*n[1]+(ux*vy-uy*vx)*n[2]<0)[b,d]=[d,b];
  const k=g.k,r=col?col.r:1,gr=col?col.g:1,bl=col?col.b:1;
  for(const q of[a,b,c,d]){g.p.push(q[0],q[1],q[2]);g.n.push(n[0],n[1],n[2]);g.c.push(r,gr,bl);g.u.push(uv?q[0]:0,uv?q[2]:0)}
  (top?g.b:g.a).push(k,k+1,k+2,k,k+2,k+3);g.k+=4;
}

function gfin(g,grouped){
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(g.p,3));
  geo.setAttribute('normal',new THREE.Float32BufferAttribute(g.n,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(g.c,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(g.u,2));
  geo.setIndex(g.a.concat(g.b));
  if(grouped){if(g.a.length)geo.addGroup(0,g.a.length,0);if(g.b.length)geo.addGroup(g.a.length,g.b.length,2)}
  return geo;
}

function topRuns(g,i0,i1,j0,j1,y,cells){   // mặt trên: mỗi hàng ô gộp thành các đoạn liền, bỏ những ô thuộc hồ
  for(let cj=j0;cj<j1;cj++){let run=null;
    for(let ci=i0;ci<=i1;ci++){
      const open=ci<i1&&!cells.has(ck(ci,cj));
      if(open&&run===null)run=ci;
      else if(!open&&run!==null){const xa=run*CELL,xb=ci*CELL,za=cj*CELL,zb=za+CELL;
        gq(g,[[xa,y,za],[xa,y,zb],[xb,y,zb],[xb,y,za]],[0,1,0],null,true,true);run=null}
    }}
}

const _bc1=new THREE.Color(),_bc2=new THREE.Color();

function bedColor(l,ci,cj,d,out){   // cát ở mép -> xanh đậm ở chỗ sâu
  const dd=clamp01((d-.1)/(l.dmax-.1));
  _bc1.setHex(l.T.sand[(ci+cj)&1]);_bc2.setHex(l.T.water[2]).multiplyScalar(.5);
  return out.copy(_bc1).lerp(_bc2,Math.pow(dd,.6));
}

function bedGeometry(l,Fl){   // đáy hồ dạng bậc thang (mỗi ô 1 độ sâu) + thành hồ dựng đứng
  const g=GB(),col=new THREE.Color(),wc=new THREE.Color(),y0=l.y;
  const dOf=(ci,cj)=>Fl.cells.get(ck(ci,cj))===l?lakeH(l,(ci+.5)*CELL,(cj+.5)*CELL):0;
  for(const [ci,cj] of l.cl){
    const d=dOf(ci,cj),xa=ci*CELL,xb=xa+CELL,za=cj*CELL,zb=za+CELL,yb=y0-d;
    bedColor(l,ci,cj,d,col);
    gq(g,[[xa,yb,za],[xa,yb,zb],[xb,yb,zb],[xb,yb,za]],[0,1,0],col,false,false);
    for(const [di,dj] of[[1,0],[-1,0],[0,1],[0,-1]]){
      const nd=dOf(ci+di,cj+dj);if(nd>=d-1e-4)continue;
      const yh=y0-nd;wc.copy(col).multiplyScalar(.8);let pts,n;
      if(di===1){pts=[[xb,yb,za],[xb,yb,zb],[xb,yh,zb],[xb,yh,za]];n=[-1,0,0]}
      else if(di===-1){pts=[[xa,yb,za],[xa,yb,zb],[xa,yh,zb],[xa,yh,za]];n=[1,0,0]}
      else if(dj===1){pts=[[xa,yb,zb],[xb,yb,zb],[xb,yh,zb],[xa,yh,zb]];n=[0,0,-1]}
      else{pts=[[xa,yb,za],[xb,yb,za],[xb,yh,za],[xa,yh,za]];n=[0,0,1]}
      gq(g,pts,n,wc,false,false);
    }
  }
  return gfin(g,false);
}

function carve(Fl,f,y0){   // cắt lỗ trên sàn ở chỗ có hồ
  if(!Fl.cells.size)return;
  const cells=Fl.cells,lk=(x,z)=>cells.has(ck(Math.floor(x/CELL),Math.floor(z/CELL)));
  if(f===0){
    const n=Math.round((HALF0+1)/CELL),g=GB();
    topRuns(g,-n,n,-n,n,0,cells);
    floor.geometry.dispose();floor.geometry=gfin(g,false);floor.rotation.set(0,0,0);floor.position.set(0,0,0);
    // lưới ô 2m: bỏ các đoạn nằm hoàn toàn trong lòng hồ
    const gp=grid.geometry.attributes.position,gc=grid.geometry.attributes.color,np=[],nc=[],gy=gp.getY(0),has=(a,b)=>cells.has(ck(a,b));
    for(let s=0;s+1<gp.count;s+=2){
      const ax=gp.getX(s),az=gp.getZ(s),bx=gp.getX(s+1),bz=gp.getZ(s+1),alongZ=Math.abs(bz-az)>Math.abs(bx-ax),
        cnt=Math.round((alongZ?Math.abs(bz-az):Math.abs(bx-ax))/CELL);
      for(let i=0;i<cnt;i++){
        const t0=i/cnt,t1=(i+1)/cnt,x0=ax+(bx-ax)*t0,z0=az+(bz-az)*t0,x1=ax+(bx-ax)*t1,z1=az+(bz-az)*t1,
          ci=Math.floor((x0+x1)/2/CELL),cj=Math.floor((z0+z1)/2/CELL),
          inside=alongZ?(has(Math.round(ax/CELL)-1,cj)&&has(Math.round(ax/CELL),cj)):(has(ci,Math.round(az/CELL)-1)&&has(ci,Math.round(az/CELL)));
        if(inside)continue;
        np.push(x0,gy,z0,x1,gy,z1);
        const r=gc?gc.getX(s):.42,gg=gc?gc.getY(s):.43,bl=gc?gc.getZ(s):.47;nc.push(r,gg,bl,r,gg,bl);
      }
    }
    const ng=new THREE.BufferGeometry();
    ng.setAttribute('position',new THREE.Float32BufferAttribute(np,3));ng.setAttribute('color',new THREE.Float32BufferAttribute(nc,3));
    grid.geometry.dispose();grid.geometry=ng;
    return;
  }
  // tầng 2-4: sàn là các tấm dày 1m (level.js). Tấm nào có hồ -> dựng lại mặt trên có lỗ + cho va chạm bỏ qua ô hồ
  const cl=[];for(const l of Fl.lakes)if(l.cl)for(const c of l.cl)cl.push(c);
  const tx=gridTex().clone();tx.needsUpdate=true;tx.repeat.set(.5,.5);tx._own=true;   // _own: floors.js giải phóng texture này khi dỡ tầng
  const topMat=new THREE.MeshLambertMaterial({map:tx});
  for(const b of boxes){
    if(Math.abs(b.y1-y0)>1e-6||Math.abs(b.y0-(y0-SLT))>1e-6)continue;
    const i0=Math.round(b.x0/CELL),i1=Math.round(b.x1/CELL),j0=Math.round(b.z0/CELL),j1=Math.round(b.z1/CELL);
    if(!cl.some(([ci,cj])=>ci>=i0&&ci<i1&&cj>=j0&&cj<j1))continue;
    const cx=(b.x0+b.x1)/2,cy=(b.y0+b.y1)/2,cz=(b.z0+b.z1)/2,
      m=meshes.find(q=>q.geometry&&q.geometry.type==='BoxGeometry'&&Array.isArray(q.material)&&Math.abs(q.position.x-cx)<1e-6&&Math.abs(q.position.y-cy)<1e-6&&Math.abs(q.position.z-cz)<1e-6);
    if(!m)continue;
    const g=GB(),yb=b.y0,yt=b.y1;
    topRuns(g,i0,i1,j0,j1,yt,cells);
    gq(g,[[b.x0,yb,b.z0],[b.x1,yb,b.z0],[b.x1,yb,b.z1],[b.x0,yb,b.z1]],[0,-1,0],null,false,false);
    gq(g,[[b.x0,yb,b.z0],[b.x0,yb,b.z1],[b.x0,yt,b.z1],[b.x0,yt,b.z0]],[-1,0,0],null,false,false);
    gq(g,[[b.x1,yb,b.z0],[b.x1,yb,b.z1],[b.x1,yt,b.z1],[b.x1,yt,b.z0]],[1,0,0],null,false,false);
    gq(g,[[b.x0,yb,b.z0],[b.x1,yb,b.z0],[b.x1,yt,b.z0],[b.x0,yt,b.z0]],[0,0,-1],null,false,false);
    gq(g,[[b.x0,yb,b.z1],[b.x1,yb,b.z1],[b.x1,yt,b.z1],[b.x0,yt,b.z1]],[0,0,1],null,false,false);
    const old=m.material;m.geometry.dispose();m.geometry=gfin(g,true);m.position.set(0,0,0);
    m.material=[old[0],old[0],topMat];
    b.hole=lk;   // physics.js: va chạm với tấm sàn này bỏ qua nếu tâm vật thể nằm trong ô hồ
  }
}

Object.assign(NK,{lakeH,bedGeometry,waveLake,carve,wdep});
})();
