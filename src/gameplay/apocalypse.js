// ============================================================================
// TẬN THẾ - cảnh chuyển tầng. Người chơi bước qua cổng không gian (portal.js) -> KHÔNG dịch chuyển ngay, mà:
//   1. Camera tự kéo vút lên góc nhìn từ trên cao (top-down / bird-eye) bao quát toàn bộ tầng vừa rời.
//   2. Tầng đó sụp đổ chậm rãi theo trình tự:  (a) công trình kiến trúc rạn nứt rồi tan rã
//                                            (b) cảnh quan thiên nhiên (cây, đá, hồ, mây, gió, sương) vỡ vụn
//                                            (c) nền đất nát thành từng khối voxel rồi bay vào hư không
//      Mỗi thành phần sụp đổ -> màn hình rung nhẹ (screen shake) + tiếng ầm.
//   3. Hết cảnh: chỉ còn cánh cổng trôi dạt giữa vũ trụ đen. Camera lao vào cổng -> sang tầng kế (portal.js: finish()).
// CÁCH LÀM: không đụng vào mô hình gốc. Lúc bắt đầu, mô hình gốc của từng nhóm được LẤY MẪU bề mặt rồi gom thành các ô voxel thô
//   (InstancedMesh, mỗi ô 1 khối màu trung bình). Tới lượt nhóm nào thì ẩn bản gốc (đưa sang layer 2, camera không vẽ) và cho khối voxel
//   thế chỗ: rung, rạn (khối tối màu), rồi từng khối bung ra, xoay, bay lên và thu nhỏ biến mất. Xong cảnh thì trả mọi thứ về như cũ.
// Chỉnh nhanh: APOC bên dưới (thời gian từng giai đoạn, cỡ khối, số khối tối đa, độ rung).
// Tắt hẳn: thêm ?apoc=0 vào địa chỉ trang (portal.js dùng lại cách dịch chuyển tức thời cũ). LAN (kể cả team hòa bình) cũng chạy; chỉ chủ phòng đang chạy quái mới dùng cách cũ.
// Nạp SAU portal.js (xem loader.js). Móc vào: portal.js (start/finish) · main.js (Apoc.update, Apoc.fov, đóng băng thế giới) · floor-manager.js (không sinh quái).
// ============================================================================
const APOC={
  enabled:new URLSearchParams(location.search).get('apoc')!=='0',
  rise:4.5,                       // giây: camera kéo lên cao
  arch:{at:4.5,len:9,cell:.55,cap:70000,binCap:30000,up:.5,spd:5,kick:7,floor:true},    // kiến trúc: bắt đầu lúc (s) · tổng thời gian · cỡ khối (m) · số khối tối đa · gia tốc bay lên
  nat:{at:11,len:10,cell:.5,cap:90000,binCap:40000,up:.35,spd:4,kick:6,floor:true},    // thiên nhiên
  grd:{at:18,len:10,cell:.7,cap:9000,binCap:9000,up:.9,spd:2,kick:2.5,floor:false},
  bot:{at:3,len:5,cell:.14,cap:12000,up:0,spd:6,kick:7,floor:true},   // bot / boss / đồng minh còn lại: vỡ thành voxel nhỏ (cell = cỡ khối) ngay sau khi camera bắt đầu kéo lên      // nền đất
  crack:2.4,                      // giây đầu của mỗi giai đoạn: rung + rạn nứt trước khi bung
  life:[2.2,3.4],                 // thời gian sống của mỗi khối sau khi bung (s) [ngắn nhất, dài nhất]
  hold:4.5,dive:1.8,              // giây: cổng trôi giữa vũ trụ · giây: camera lao vào cổng
  fov:58,el:1.38,spin:.035,       // FOV khi nhìn từ trên · góc ngẩng camera (rad, 1.57 = thẳng đứng) · tốc độ xoay chậm (rad/s)
  shake:1,                        // nhân độ rung màn hình (0 = tắt)
  stars:2600,                     // số sao trong vũ trụ
  // GIỚI HẠN ĐỘ CAO CAMERA THEO TỪNG TẦNG (để camera không chui qua trần = sàn tầng trên).
  // camTop[f] = độ cao tối đa của camera tính từ mặt sàn tầng f (m). null/undefined = tự tính theo trần: cao tầng - SLAB - margin.
  // Tầng trên cùng (không có trần) không giới hạn. Ví dụ muốn tầng 1 cho phép tối đa 18m: camTop:[18,null,null,null]
  grav:15,bounce:.38,             // vỡ vụn kiểu bot: trọng lực (m/s²) · độ nảy khi chạm sàn (0..1)
  minCube:.1,                     // khối voxel GỐC từ cỡ này trở lên được vỡ đúng nguyên hình (cỡ, hướng, màu); nhỏ hơn thì gộp lại thành ô cỡ `cell`
  nearCam:7,                      // khối voxel bay lại gần camera trong bán kính này (m) sẽ thu nhỏ dần, khỏi che kín màn hình
  camTop:[],
  camMargin:.6,                   // chừa cách trần bao nhiêu mét
  fovMax:100,                     // FOV tối đa khi camera sát trần mà vẫn muốn thấy rộng
  ceilPitch:.75                   // góc cúi (rad) của camera sát trần nhìn xuống sàn (.75 ≈ 43°; lớn hơn = nhìn dốc xuống hơn, thấy ít hơn)
};
const Apoc=(function(){
  const A={active:false,enabled:APOC.enabled};
  let st=null;
  const clamp=(x,a=0,b=1)=>x<a?a:x>b?b:x;
  const sm=x=>{x=clamp(x);return x*x*(3-2*x)};
  const sm5=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10)};
  const rnd=Math.random;
  const BLACK=new THREE.Color(0x000004);

  // ------------------------------------------------------------------ ẩn / hiện bản gốc (layer 2 = camera không vẽ; không bị nature.js / occlusion.js bật lại)
  function hide(objs,saved){for(const r of objs)if(r)r.traverse(o=>{if(!saved.has(o)){saved.set(o,o.layers.mask);o.layers.set(2)}})}
  function unhide(saved){for(const [o,m] of saved)o.layers.mask=m;saved.clear()}

  // ------------------------------------------------------------------ LẤY MẪU BỀ MẶT -> ô voxel
  // Trả về {n,X,Y,Z,R,G,B} (mỗi điểm mẫu: vị trí thế giới + màu). Tam giác lớn (tường, sàn) lấy mẫu theo lưới đều, tam giác bé (voxel) lấy tâm.
  const _bm=new THREE.Matrix4(),_qq=new THREE.Quaternion(),_u3=new THREE.Vector3(),_v3=new THREE.Vector3(),_w3=new THREE.Vector3();
  function collect(roots,step,capS,yEps,lodMap,opt){
    opt=opt||{};
    const minCube=opt.minCube||0,natCap=minCube>0?(opt.natCap||0):0,budget=opt.budget||1500000,NMAX=opt.natMax||3;
    const X=new Float32Array(capS),Y=new Float32Array(capS),Z=new Float32Array(capS),R=new Float32Array(capS),G=new Float32Array(capS),B=new Float32Array(capS);
    let n=0;
    // KHỐI GỐC (native): mỗi mặt vuông của voxel gốc (2 tam giác vuông) -> dựng lại ĐÚNG khối lập phương đó (cùng cỡ, cùng hướng, cùng màu), nên vỡ ra đúng từng ô voxel
    const NT={n:0,P:new Float32Array(natCap*3),Q:new Float32Array(natCap*4),Z:new Float32Array(natCap*3),C:new Float32Array(natCap*3),map:new Map()};
    const meshes=[];
    for(const r of roots)if(r)r.traverse(o=>{
      if(!o.isMesh)return;
      const geo=(lodMap&&lodMap.get(o))||o.geometry;
      if(!geo||!geo.attributes||!geo.attributes.position)return;
      meshes.push([o,geo]);
    });
    let est=0;
    for(const [o,geo] of meshes)est+=(o.isInstancedMesh?o.count:1)*(geo.index?geo.index.count:geo.attributes.position.count)/3;
    const keep=Math.min(1,capS*.55/(est+1)),keepT=Math.min(1,budget/(est+1)),sp=step*.7,A0=sp;
    const push=(x,y,z,r,g,b)=>{if(n>=capS)return;X[n]=x;Y[n]=y-yEps;Z[n]=z;R[n]=r;G[n]=g;B[n]=b;n++};
    const _m=new THREE.Matrix4(),_w=new THREE.Matrix4(),_c=new THREE.Color();
    // duyệt toàn bộ tam giác của 1 hình học dưới ma trận me (16 số); ic = màu nhân thêm của instance (hoặc null)
    function tris(geo,me,mcol,mats,ic){
      const pa=geo.attributes.position.array,idx=geo.index,ia=idx?idx.array:null;
      const ca=geo.attributes.color,carr=ca?ca.array:null,cs=ca?ca.itemSize:3;
      const cn=ca&&ca.normalized?(carr instanceof Uint8Array?1/255:carr instanceof Uint16Array?1/65535:1):1;
      const nT=ia?ia.length/3:pa.length/9,groups=geo.groups||[];
      const matOf=t=>{if(mats.length===1)return 0;for(const gr of groups)if(t*3>=gr.start&&t*3<gr.start+gr.count)return gr.materialIndex;return 0};
      let ax,ay,az,bx,by,bz,cx,cy,cz;
      for(let t=0;t<nT&&n<capS;t++){
        if(keepT<1&&rnd()>keepT)continue;
        const mi=matOf(t),mc=mcol[mi];if(!mc)continue;
        const i0=ia?ia[t*3]:t*3,i1=ia?ia[t*3+1]:t*3+1,i2=ia?ia[t*3+2]:t*3+2;
        let x=pa[i0*3],y=pa[i0*3+1],z=pa[i0*3+2];const lax=x,lay=y,laz=z;
        ax=me[0]*x+me[4]*y+me[8]*z+me[12];ay=me[1]*x+me[5]*y+me[9]*z+me[13];az=me[2]*x+me[6]*y+me[10]*z+me[14];
        x=pa[i1*3];y=pa[i1*3+1];z=pa[i1*3+2];const lbx=x,lby=y,lbz=z;
        bx=me[0]*x+me[4]*y+me[8]*z+me[12];by=me[1]*x+me[5]*y+me[9]*z+me[13];bz=me[2]*x+me[6]*y+me[10]*z+me[14];
        x=pa[i2*3];y=pa[i2*3+1];z=pa[i2*3+2];const lcx=x,lcy=y,lcz=z;
        cx=me[0]*x+me[4]*y+me[8]*z+me[12];cy=me[1]*x+me[5]*y+me[9]*z+me[13];cz=me[2]*x+me[6]*y+me[10]*z+me[14];
        const e1=Math.hypot(bx-ax,by-ay,bz-az),e2=Math.hypot(cx-bx,cy-by,cz-bz),e3=Math.hypot(ax-cx,ay-cy,az-cz),em=Math.max(e1,e2,e3);
        // màu 3 đỉnh
        let r0=mc[0],g0=mc[1],b0=mc[2],r1=r0,g1=g0,b1=b0,r2=r0,g2=g0,b2=b0;
        if(mc[3]&&carr){
          r0*=carr[i0*cs]*cn;g0*=carr[i0*cs+1]*cn;b0*=carr[i0*cs+2]*cn;
          r1*=carr[i1*cs]*cn;g1*=carr[i1*cs+1]*cn;b1*=carr[i1*cs+2]*cn;
          r2*=carr[i2*cs]*cn;g2*=carr[i2*cs+1]*cn;b2*=carr[i2*cs+2]*cn;
        }
        if(ic){r0*=ic[0];g0*=ic[1];b0*=ic[2];r1*=ic[0];g1*=ic[1];b1*=ic[2];r2*=ic[0];g2*=ic[1];b2*=ic[2]}
        // ---- khối gốc: tam giác vuông nhỏ (nửa mặt vuông của 1 voxel) ----
        if(natCap&&NT.n<natCap&&em<=NMAX&&mats[mi].side!==THREE.BackSide){
          let vx1,vy1,vz1,vx2,vy2,vz2,hx,hy,hz;   // v1, v2 = 2 cạnh góc vuông (xuất phát từ đỉnh góc vuông) · h = trung điểm cạnh huyền
          if(e1>=e2&&e1>=e3){vx1=ax-cx;vy1=ay-cy;vz1=az-cz;vx2=bx-cx;vy2=by-cy;vz2=bz-cz;hx=(ax+bx)/2;hy=(ay+by)/2;hz=(az+bz)/2}
          else if(e2>=e3){vx1=bx-ax;vy1=by-ay;vz1=bz-az;vx2=cx-ax;vy2=cy-ay;vz2=cz-az;hx=(bx+cx)/2;hy=(by+cy)/2;hz=(bz+cz)/2}
          else{vx1=cx-bx;vy1=cy-by;vz1=cz-bz;vx2=ax-bx;vy2=ay-by;vz2=az-bz;hx=(cx+ax)/2;hy=(cy+ay)/2;hz=(cz+az)/2}
          const l1=Math.hypot(vx1,vy1,vz1),l2=Math.hypot(vx2,vy2,vz2),sz0=(l1+l2)/2;
          // chiều sâu: cạnh voxel ở hệ cục bộ (trung bình 2 cạnh góc vuông cục bộ) x độ giãn của ma trận theo pháp tuyến (cây co giãn không đều x/z khác y vẫn đúng)
          const el1=Math.hypot(lbx-lax,lby-lay,lbz-laz),el2=Math.hypot(lcx-lbx,lcy-lby,lcz-lbz),el3=Math.hypot(lax-lcx,lay-lcy,laz-lcz);
          const dl=e1>=e2&&e1>=e3?(el2+el3)/2:e2>=e3?(el1+el3)/2:(el1+el2)/2;
          let lnx=(lby-lay)*(lcz-laz)-(lbz-laz)*(lcy-lay),lny=(lbz-laz)*(lcx-lax)-(lbx-lax)*(lcz-laz),lnz=(lbx-lax)*(lcy-lay)-(lby-lay)*(lcx-lax);
          const lnl=Math.hypot(lnx,lny,lnz)||1;lnx/=lnl;lny/=lnl;lnz/=lnl;
          const sz=dl*Math.hypot(me[0]*lnx+me[4]*lny+me[8]*lnz,me[1]*lnx+me[5]*lny+me[9]*lnz,me[2]*lnx+me[6]*lny+me[10]*lnz)||sz0;
          if(l1>1e-5&&l2>1e-5&&sz0>=minCube&&Math.abs(vx1*vx2+vy1*vy2+vz1*vz2)<.12*l1*l2){
            // pháp tuyến theo chiều quấn của tam giác (hướng ra ngoài)
            let nx=(by-ay)*(cz-az)-(bz-az)*(cy-ay),ny=(bz-az)*(cx-ax)-(bx-ax)*(cz-az),nz=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);
            const nl=Math.hypot(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;
            const ccx=hx-nx*sz*.5,ccy=hy-ny*sz*.5,ccz=hz-nz*sz*.5;
            const key=((Math.round(ccx*100)+40000)*100000+(Math.round(ccy*100)+40000))*100000+(Math.round(ccz*100)+40000);
            if(NT.map.has(key))continue;   // khối này đã được dựng từ mặt khác của nó
            NT.map.set(key,1);
            _u3.set(vx1/l1,vy1/l1,vz1/l1);_w3.set(nx,ny,nz);_v3.crossVectors(_w3,_u3).normalize();
            _bm.makeBasis(_u3,_v3,_w3);_qq.setFromRotationMatrix(_bm);
            const k=NT.n++;
            NT.P[k*3]=ccx;NT.P[k*3+1]=ccy-yEps;NT.P[k*3+2]=ccz;
            NT.Q[k*4]=_qq.x;NT.Q[k*4+1]=_qq.y;NT.Q[k*4+2]=_qq.z;NT.Q[k*4+3]=_qq.w;
            NT.Z[k*3]=l1;NT.Z[k*3+1]=l2;NT.Z[k*3+2]=sz;
            NT.C[k*3]=(r0+r1+r2)/3;NT.C[k*3+1]=(g0+g1+g2)/3;NT.C[k*3+2]=(b0+b1+b2)/3;
            continue;
          }
        }
        if(em<=A0){   // tam giác bé (voxel rất nhỏ / mặt cong): lấy tâm, thưa bớt nếu quá nhiều
          if(keep<1&&rnd()>keep)continue;
          push((ax+bx+cx)/3,(ay+by+cy)/3,(az+bz+cz)/3,(r0+r1+r2)/3,(g0+g1+g2)/3,(b0+b1+b2)/3);
        }else{        // tam giác lớn: lưới tọa độ trọng tâm, khoảng cách <= sp nên ô nào cũng có điểm
          const m=Math.min(220,Math.ceil(em/sp));
          for(let i=0;i<=m&&n<capS;i++)for(let j=0;j<=m-i;j++){
            const u=i/m,v=j/m,w=1-u-v;
            push(ax*w+bx*u+cx*v,ay*w+by*u+cy*v,az*w+bz*u+cz*v,r0*w+r1*u+r2*v,g0*w+g1*u+g2*v,b0*w+b1*u+b2*v);
          }
        }
      }
    }
    for(const [o,geo] of meshes){
      if(n>=capS)break;
      const mats=Array.isArray(o.material)?o.material:[o.material];
      if(!mats.length||mats.every(m=>!m||m.isShaderMaterial))continue;
      o.updateWorldMatrix(true,false);
      const mcol=mats.map(m=>{
        if(!m||m.isShaderMaterial||(m.transparent&&m.opacity<.12))return null;
        const c=m.color||_c.setRGB(1,1,1);let k=1;if(m.map&&c.r>.9&&c.g>.9&&c.b>.9)k=.55;
        return [c.r*k,c.g*k,c.b*k,!!m.vertexColors]});
      if(o.isInstancedMesh){   // cây / bụi...: mỗi instance là CẢ mô hình -> duyệt mọi khối của từng instance (trước đây mỗi cây chỉ thành 1 ô)
        for(let i=0;i<o.count&&n<capS;i++){
          o.getMatrixAt(i,_m);_w.multiplyMatrices(o.matrixWorld,_m);
          let ic=null;if(o.instanceColor){o.getColorAt(i,_c);ic=[_c.r,_c.g,_c.b]}
          tris(geo,_w.elements,mcol,mats,ic);
        }
      }else tris(geo,o.matrixWorld.elements,mcol,mats,null);
    }
    return {n,X,Y,Z,R,G,B,nat:NT};
  }
  // gom điểm mẫu vào lưới ô lập phương cạnh c; tăng c dần tới khi số ô <= cap
  function bin(S0,c0,cap,thick){
    let c=c0,out=null;
    for(let it=0;it<14;it++){
      const mp=new Map(),ix=[],iy=[],iz=[],sr=[],sg=[],sb=[],cn=[];
      for(let i=0;i<S0.n;i++){
        const a=Math.floor(S0.X[i]/c),b=Math.floor(S0.Y[i]/c),d=Math.floor(S0.Z[i]/c);
        const key=((a+4096)*8192+(d+4096))*8192+(b+4096);
        let k=mp.get(key);
        if(k===undefined){k=ix.length;mp.set(key,k);ix.push(a);iy.push(b);iz.push(d);sr.push(0);sg.push(0);sb.push(0);cn.push(0)}
        sr[k]+=S0.R[i];sg[k]+=S0.G[i];sb[k]+=S0.B[i];cn[k]++;
      }
      let total=ix.length;
      if(thick){   // nền đất: thêm 1 lớp khối bên dưới cho dày
        for(let k=0,N=ix.length;k<N&&total<cap*1.0;k++)if(rnd()<.55){ix.push(ix[k]);iy.push(iy[k]-1);iz.push(iz[k]);sr.push(sr[k]*.8);sg.push(sg[k]*.8);sb.push(sb[k]*.8);cn.push(cn[k]);total++}
      }
      out={c,n:ix.length,ix,iy,iz,sr,sg,sb,cn};
      if(out.n<=cap)break;
      if(c*1.18>c0*1.35){   // đã phóng to tối đa: bỏ bớt ngẫu nhiên các ô thừa thay vì làm khối to hơn
        const idx=ix.map((_,k)=>k);
        for(let k=idx.length-1;k>0;k--){const m=Math.floor(rnd()*(k+1));const t=idx[k];idx[k]=idx[m];idx[m]=t}
        idx.length=cap;
        const pk=a=>idx.map(k=>a[k]);
        out={c,n:cap,ix:pk(ix),iy:pk(iy),iz:pk(iz),sr:pk(sr),sg:pk(sg),sb:pk(sb),cn:pk(cn)};
        break;
      }
      c*=1.18;
    }
    return out;
  }

  // gộp ô lưới (cells, từ bin) + khối gốc (nat, từ collect) thành 1 danh sách: mỗi khối có vị trí, hướng (quaternion), kích thước 3 chiều, màu. Quá cap thì bỏ ngẫu nhiên bớt.
  function mkList(cells,nat,cap){
    const nb=cells?cells.n:0,nn=nat?nat.n:0,tot=nb+nn;
    const p=tot>cap?cap/tot:1,M=Math.min(tot,Math.ceil(tot*p)+8);
    const L={n:0,bx:new Float32Array(M),by:new Float32Array(M),bz:new Float32Array(M),qx:new Float32Array(M),qy:new Float32Array(M),qz:new Float32Array(M),qw:new Float32Array(M),
      sx:new Float32Array(M),sy:new Float32Array(M),sz:new Float32Array(M),cr:new Float32Array(M),cg:new Float32Array(M),cb:new Float32Array(M)};
    let k=0;
    for(let i=0;i<nn&&k<M;i++){
      if(p<1&&rnd()>p)continue;
      L.bx[k]=nat.P[i*3];L.by[k]=nat.P[i*3+1];L.bz[k]=nat.P[i*3+2];
      L.qx[k]=nat.Q[i*4];L.qy[k]=nat.Q[i*4+1];L.qz[k]=nat.Q[i*4+2];L.qw[k]=nat.Q[i*4+3];
      L.sx[k]=nat.Z[i*3];L.sy[k]=nat.Z[i*3+1];L.sz[k]=nat.Z[i*3+2];
      L.cr[k]=nat.C[i*3];L.cg[k]=nat.C[i*3+1];L.cb[k]=nat.C[i*3+2];k++;
    }
    for(let i=0;i<nb&&k<M;i++){
      if(p<1&&rnd()>p)continue;
      const c=cells.c,q=cells.cn[i]||1;
      L.bx[k]=(cells.ix[i]+.5)*c;L.by[k]=(cells.iy[i]+.5)*c;L.bz[k]=(cells.iz[i]+.5)*c;
      L.qw[k]=1;L.sx[k]=L.sy[k]=L.sz[k]=c;
      L.cr[k]=cells.sr[i]/q;L.cg[k]=cells.sg[i]/q;L.cb[k]=cells.sb[i]/q;k++;
    }
    L.n=k;return L;
  }

  // ------------------------------------------------------------------ nhóm khối voxel bị phá (1 InstancedMesh)
  const _p=new THREE.Vector3(),_q=new THREE.Quaternion(),_s=new THREE.Vector3(),_M=new THREE.Matrix4(),_C=new THREE.Color();
  const IDQ=new THREE.Quaternion(),_q2=new THREE.Quaternion();
  function makeGroup(name,cfg,L,f,opt){
    const N=L.n;
    if(!N)return null;
    const geo=new THREE.BoxGeometry(1,1,1),mat=new THREE.MeshLambertMaterial({emissive:0x161616});
    const im=new THREE.InstancedMesh(geo,mat,N);im.frustumCulled=false;im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);im.visible=false;im.renderOrder=1;
    const bx=new Float32Array(N),by=new Float32Array(N),bz=new Float32Array(N),vx=new Float32Array(N),vy=new Float32Array(N),vz=new Float32Array(N),
      rel=new Float32Array(N),life=new Float32Array(N),ax=new Float32Array(N),ay=new Float32Array(N),az=new Float32Array(N),w=new Float32Array(N),
      rk=new Float32Array(N),state=new Uint8Array(N),cr=new Float32Array(N),cg=new Float32Array(N),cb=new Float32Array(N),
      X=new Float32Array(N),Y=new Float32Array(N),Z=new Float32Array(N),fy=new Float32Array(N),an=new Float32Array(N),hz=new Float32Array(N);
    const qx=L.qx,qy=L.qy,qz=L.qz,qw=L.qw,sx=L.sx,sy=L.sy,sz=L.sz;
    let y0=1e9,y1=-1e9,cx=0,cz=0,rmax=1;
    for(let i=0;i<N;i++){
      bx[i]=L.bx[i];by[i]=L.by[i];bz[i]=L.bz[i];hz[i]=(sx[i]+sy[i]+sz[i])/3;
      if(by[i]<y0)y0=by[i];if(by[i]>y1)y1=by[i];
    }
    cx=opt.cx||0;cz=opt.cz||0;
    for(let i=0;i<N;i++){const d=Math.hypot(bx[i]-cx,bz[i]-cz);if(d>rmax)rmax=d}
    const spread=Math.max(1,cfg.len-APOC.crack-APOC.life[1]);
    for(let i=0;i<N;i++){
      const j=.92+rnd()*.16;   // sắc độ lệch nhẹ cho đúng kiểu voxel
      cr[i]=clamp(L.cr[i]*j,0,1.4);cg[i]=clamp(L.cg[i]*j,0,1.4);cb[i]=clamp(L.cb[i]*j,0,1.4);
      _C.setRGB(cr[i],cg[i],cb[i]);im.setColorAt(i,_C);
      let d;const nz=rnd();
      if(opt.order==='top')d=clamp((1-(by[i]-y0)/Math.max(.01,y1-y0))*.75+nz*.25);       // trên đổ trước
      else if(opt.order==='far')d=clamp((1-Math.hypot(bx[i]-cx,bz[i]-cz)/rmax)*.85+nz*.15);   // xa tâm (xa cổng) đổ trước, gần cổng đổ sau cùng
      else d=clamp(nz*.65+Math.hypot(bx[i]-cx,bz[i]-cz)/rmax*.35);
      rel[i]=(rnd()<.04)?APOC.crack*(.55+rnd()*.4):APOC.crack+d*spread;   // vài khối bong sớm ngay lúc đang rạn
      life[i]=APOC.life[0]+rnd()*(APOC.life[1]-APOC.life[0]);
      const dx=bx[i]-cx,dz=bz[i]-cz,dl=Math.hypot(dx,dz)||1,sp=.4+rnd()*1.6;
      vx[i]=dx/dl*sp*.6+(rnd()-.5)*1.2;vz[i]=dz/dl*sp*.6+(rnd()-.5)*1.2;vy[i]=.4+rnd()*1.6;
      {const a0=rnd()-.5,a1=rnd()-.5,a2=rnd()-.5,al=Math.hypot(a0,a1,a2)||1;ax[i]=a0/al;ay[i]=a1/al;az[i]=a2/al}w[i]=(rnd()-.5)*3.2;   // trục xoay PHẢI là vector đơn vị (bản cũ chia cho độ dài của 3 số ngẫu nhiên KHÁC -> quaternion không chuẩn -> khối bị kéo méo thành tấm khổng lồ)
      rk[i]=rnd();
      _p.set(bx[i],by[i],bz[i]);_q.set(qx[i],qy[i],qz[i],qw[i]);_s.set(sx[i],sy[i],sz[i]);_M.compose(_p,_q,_s);im.setMatrixAt(i,_M);
    }
    im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;
    S.add(im);
    return {name,cfg,im,geo,mat,N,qx,qy,qz,qw,sx,sy,sz,hz,bx,by,bz,vx,vy,vz,rel,life,ax,ay,az,w,rk,state,cr,cg,cb,X,Y,Z,fy,an,cx,cz,f,up:cfg.up,started:false,done:false,alive:N,acc:0,bump:0,saved:new Map(),roots:opt.roots||[],extra:opt.extra||null};
  }
  // khối ở gần camera thì nhỏ dần về 0 (camera sát trần nên mảnh vỡ bay ngang qua mặt trông như tấm phẳng khổng lồ)
  function nearK(x,y,z){
    const R=APOC.nearCam;if(!(R>0))return 1;
    const dx=x-C.position.x,dy=y-C.position.y,dz=z-C.position.z,d2=dx*dx+dy*dy+dz*dz;
    if(d2>=R*R)return 1;
    return sm((Math.sqrt(d2)-R*.25)/(R*.75));
  }
  // cập nhật 1 nhóm theo thời gian tt (giây kể từ lúc nhóm bắt đầu)
  function stepGroup(g,tt,dt){
    if(g.done||tt<0)return;
    if(!g.started){
      g.started=true;g.im.visible=true;hide(g.roots,g.saved);   // ẩn bản gốc, bản voxel thế chỗ
      if(g.extra&&g.extra.onStart)g.extra.onStart();
      bump(.65);
    }
    const crack=APOC.crack,N=g.N,IM=g.im;
    g.acc+=dt;const tremble=g.acc>=.045;if(tremble)g.acc=0;
    const prog=clamp(tt/crack);
    let dirtyC=false,active=0,alive=0;
    const ramp=.012+.05*prog;
    for(let i=0;i<N;i++){
      const s=g.state[i];if(s===2)continue;
      // rạn nứt: khối tối dần (như vết nứt lan)
      if(s===0&&g.rk[i]<prog*.42&&!(g.state[i]&4)){
        g.state[i]|=4;_C.setRGB(g.cr[i]*.5,g.cg[i]*.48,g.cb[i]*.5);IM.setColorAt(i,_C);dirtyC=true;
      }
      const t=tt-g.rel[i];
      if(t<0){
        alive++;
        if(tremble){   // đứng yên nhưng rung + hơi co lại (hở khe giữa các khối = rạn)
          const c=g.hz[i],kk=(1-.07*prog)*nearK(g.bx[i],g.by[i],g.bz[i]);
          _p.set(g.bx[i]+(rnd()-.5)*ramp*c*2,g.by[i]+(rnd()-.5)*ramp*c*2,g.bz[i]+(rnd()-.5)*ramp*c*2);
          _q.set(g.qx[i],g.qy[i],g.qz[i],g.qw[i]);_s.set(g.sx[i]*kk,g.sy[i]*kk,g.sz[i]*kk);_M.compose(_p,_q,_s);IM.setMatrixAt(i,_M);
        }
        continue;
      }
      const L=g.life[i];
      if(t>=L){g.state[i]=2;_s.setScalar(0);_p.set(0,-9999,0);_M.compose(_p,IDQ,_s);IM.setMatrixAt(i,_M);continue}
      if(!(s&1)){   // vừa bong ra: văng khỏi tâm + tung lên, xoay ngẫu nhiên (giống xác bot vỡ thành voxel)
        const dx=g.bx[i]-g.cx,dz=g.bz[i]-g.cz,dl=Math.hypot(dx,dz)||1,sp=g.cfg.spd*(.35+rnd()*.9);
        g.vx[i]=dx/dl*sp*.55+(rnd()-.5)*sp;g.vz[i]=dz/dl*sp*.55+(rnd()-.5)*sp;g.vy[i]=g.cfg.kick*(.25+rnd()*.95);
        g.X[i]=g.bx[i];g.Y[i]=g.by[i];g.Z[i]=g.bz[i];g.an[i]=0;g.w[i]=(rnd()-.5)*9;
        if(g.cfg.floor){const Nt=window.Nature;let th=0;try{th=(Nt&&Nt.heightAt&&Nt.heightAt(g.f,g.bx[i],g.bz[i]))||0}catch(e){}
          g.fy[i]=Math.min(FY(g.f)+th,g.by[i]-g.hz[i]*.5)}else g.fy[i]=-1e9;
      }
      g.state[i]=(g.state[i]&4)|1;active++;alive++;
      const u=t/L,sh=(1-Math.pow(u,2.2))*.97,hs=g.hz[i]*sh;
      g.vy[i]-=APOC.grav*dt;
      g.X[i]+=g.vx[i]*dt;g.Y[i]+=g.vy[i]*dt;g.Z[i]+=g.vz[i]*dt;g.an[i]+=g.w[i]*dt;
      const gy=g.fy[i]+hs*.5;
      if(g.Y[i]<gy){   // chạm sàn: nảy rồi nằm yên, ma sát làm chậm dần
        g.Y[i]=gy;
        if(g.vy[i]<-1.6)g.vy[i]=-g.vy[i]*APOC.bounce;else g.vy[i]=0;
        const fr=Math.exp(-dt*5);g.vx[i]*=fr;g.vz[i]*=fr;g.w[i]*=fr;
      }
      const sn=Math.sin(g.an[i]*.5);
      _p.set(g.X[i],g.Y[i],g.Z[i]);
      _q.set(g.ax[i]*sn,g.ay[i]*sn,g.az[i]*sn,Math.cos(g.an[i]*.5));
      _q2.set(g.qx[i],g.qy[i],g.qz[i],g.qw[i]);_q.multiply(_q2);   // xoay thêm (quay trong lúc rơi) lên trên hướng gốc của khối
      const kk=sh*nearK(g.X[i],g.Y[i],g.Z[i]);
      _s.set(g.sx[i]*kk,g.sy[i]*kk,g.sz[i]*kk);
      _M.compose(_p,_q,_s);IM.setMatrixAt(i,_M);
    }
    g.alive=alive;
    IM.instanceMatrix.needsUpdate=true;if(dirtyC&&IM.instanceColor)IM.instanceColor.needsUpdate=true;
    // mỗi ~0.8s khi đang có khối bung ra: rung nhẹ + tiếng ầm
    if(active>0){g.bump-=dt;if(g.bump<=0){g.bump=.7+rnd()*.35;bump(.28+rnd()*.28)}}
    if(alive===0&&tt>crack){
      g.done=true;IM.visible=false;bump(.5);
      if(g.extra&&g.extra.onEnd)g.extra.onEnd();
    }
  }

  // ------------------------------------------------------------------ rung màn hình + tiếng
  let trauma=0;
  function bump(a){
    trauma=Math.min(1,Math.max(trauma,a*APOC.shake));
    if(typeof snd==='function'&&APOC.shake>0){try{snd(46+rnd()*34,.8,'sawtooth',.06+a*.08);snd(90+rnd()*50,.35,'square',.025)}catch(e){}}
  }

  // ------------------------------------------------------------------ vũ trụ: sao
  function makeStars(){
    const n=APOC.stars,pos=new Float32Array(n*3),col=new Float32Array(n*3);
    for(let i=0;i<n;i++){
      const u=rnd()*2-1,a=rnd()*6.2832,r=Math.sqrt(1-u*u),d=420+rnd()*40;
      pos[i*3]=Math.cos(a)*r*d;pos[i*3+1]=u*d;pos[i*3+2]=Math.sin(a)*r*d;
      const k=.55+rnd()*.45,tn=rnd();col[i*3]=k*(tn<.2?1:.82+.18*tn);col[i*3+1]=k*(.88+.12*tn);col[i*3+2]=k*(tn>.7?1:.9);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));
    const m=new THREE.PointsMaterial({size:2.2,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:0,depthWrite:false,fog:false});
    const p=new THREE.Points(g,m);p.frustumCulled=false;p.renderOrder=-1;S.add(p);return p;
  }
  // gió: các vệt trắng dài cuộn quanh tầng (giai đoạn thiên nhiên)
  function makeWind(f,Ahalf){
    const n=70,geo=new THREE.BoxGeometry(1,.1,.1),mat=new THREE.MeshBasicMaterial({color:0xeaf4ff,transparent:true,opacity:.5,depthWrite:false,fog:false});
    const im=new THREE.InstancedMesh(geo,mat,n);im.frustumCulled=false;im.visible=false;im.renderOrder=2;
    const d=[];for(let i=0;i<n;i++)d.push({a:rnd()*6.283,r:6+rnd()*(Ahalf+6),y:FY(f)+2+rnd()*16,w:(.5+rnd()*1.1)*(rnd()<.5?1:-1),len:4+rnd()*6});
    S.add(im);return {im,geo,mat,d};
  }
  function stepWind(W,u,T,f,cx,cz){
    if(!W)return;const on=u>0&&u<1;W.im.visible=on;if(!on)return;
    const env=Math.sin(Math.PI*clamp(u));
    for(let i=0;i<W.d.length;i++){
      const q=W.d[i],a=q.a+q.w*T*.35,tx=-Math.sin(a)*Math.sign(q.w),tz=Math.cos(a)*Math.sign(q.w);
      _p.set(cx+Math.cos(a)*q.r,q.y+Math.sin(T+i)*.6,cz+Math.sin(a)*q.r);
      _q.setFromAxisAngle(_s.set(0,1,0),Math.atan2(-tz,tx));_s.set(q.len*env,1,1);
      _M.compose(_p,_q,_s);W.im.setMatrixAt(i,_M);
    }
    W.im.instanceMatrix.needsUpdate=true;
  }

  // ------------------------------------------------------------------ sương + mây của tầng (sky.js: _sk.fl)
  function skyFloor(f){
    try{if(typeof _sk!=='undefined'&&_sk&&_sk.fl)return _sk.fl.find(q=>q.f===f)||null}catch(e){}
    return null;
  }
  function mistInit(q){
    const list=[];
    q.g.traverse(o=>{
      if(!o.isMesh||!o.material)return;
      const m=o.material;
      if(m.isShaderMaterial&&m.uniforms&&m.uniforms.uA)list.push({m,u:true,v:m.uniforms.uA.value});
      else list.push({m,u:false,v:m.opacity});
    });
    return list;
  }
  function mistSet(L,k){for(const e of L){if(e.u)e.m.uniforms.uA.value=e.v*k;else e.m.opacity=e.v*k}}

  // ------------------------------------------------------------------ giao diện phụ: dải đen điện ảnh + lớp chớp sáng
  function makeUI(){
    const root=document.createElement('div');
    root.style.cssText='position:fixed;inset:0;z-index:30;pointer-events:none';
    const bar=(top)=>{const b=document.createElement('div');b.style.cssText='position:absolute;left:0;right:0;height:0;background:#000;transition:height 1.6s ease;'+(top?'top:0':'bottom:0');root.appendChild(b);return b};
    const t=bar(true),b=bar(false);
    const fl=document.createElement('div');fl.style.cssText='position:absolute;inset:0;background:#dff0ff;opacity:1';root.appendChild(fl);
    document.body.appendChild(root);
    requestAnimationFrame(()=>{t.style.height=b.style.height='9vh'});
    return {root,flash:fl};
  }

  // ------------------------------------------------------------------ BẮT ĐẦU
  A.canPlay=function(){
    if(!A.enabled||A.active)return false;
    // LAN: chế độ hòa bình / team không bot chạy được (cảnh chỉ là góc nhìn riêng của máy này). Chủ phòng đang chạy quái cho cả phòng thì giữ cách cũ, vì cảnh đóng băng AI quái.
    if(window.NET&&NET.on&&NET.botsHost&&NET.botsHost()&&!(NET.peaceMode&&NET.peaceMode())){console.log('[Block Arena] tận thế: bỏ qua (chủ phòng đang chạy quái)');return false}   // phòng hòa bình: quái chỉ đi lang thang, không đánh -> đóng băng AI vài chục giây cũng không sao, chủ phòng vẫn xem được
    else if(window.NET&&NET.on)console.log('[Block Arena] tận thế: chạy trong LAN (peace='+!!(NET.peaceMode&&NET.peaceMode())+')');
    const ok=!!(window.FM&&FM.objsOf&&window.Nature&&typeof S!=='undefined');
    if(!ok)console.warn('[Block Arena] tận thế: thiếu FM.objsOf / Nature - kiểm tra floors.js đã cập nhật chưa');
    return ok;
  };
  // p = cổng vừa bước qua (portal.js) · done() = gọi khi hết cảnh để dịch chuyển sang tầng kế
  A.start=function(p,done){
    try{
      begin(p,done);
    }catch(err){
      console.error('[Block Arena] cảnh tận thế lỗi, bỏ qua:',err);
      abort(done);
    }
  };
  function abort(done){try{restore()}catch(e){console.error(e)}A.active=false;st=null;if(done)done()}

  function begin(p,done){
    const f=p.f,t0=performance.now();
    const ui=makeUI();
    st={f,p,done,T:0,ui,saved:new Map(),savedOther:new Map(),groups:[],stars:null,wind:null,
      cam0:null,tmp:new THREE.Object3D(),
      fog0:S.fog?{n:S.fog.near,f:S.fog.far,c:S.fog.color.clone()}:null,
      bg0:(S.background&&S.background.isColor)?S.background.clone():null,
      vd0:Nature.cfg?Nature.cfg.viewDist:null,oc0:(typeof OC!=='undefined'&&OC.cfg)?OC.cfg.on:null,
      hud:document.getElementById('hud'),hud0:null,
      pos0:p.g.position.clone(),az0:(typeof yaw==='number'?yaw:0),finished:false,mist:null,mistL:null,cl:null,vm0:null};
    A.active=true;
    if(st.hud){st.hud0=st.hud.style.visibility;st.hud.style.visibility='hidden'}
    // ẨN MỌI LỚP HUD (thanh oxy khi bơi, tâm ngắm, thông báo, minimap...): mọi phần tử trong trang đều ẩn, trừ canvas 3D và giao diện cảnh tận thế (.apoc-keep). Phần tử tạo thêm giữa chừng cũng bị ẩn.
    if(!document.getElementById('apoc-style')){
      const sty=document.createElement('style');sty.id='apoc-style';
      sty.textContent='body.apoc-hide *{visibility:hidden!important}body.apoc-hide .apoc-keep,body.apoc-hide .apoc-keep *{visibility:visible!important}';   // (không giữ mọi <canvas>: canvas bản đồ nhỏ #mm cũng là canvas)
      document.head.appendChild(sty);
    }
    st.ui.root.classList.add('apoc-keep');
    st.keepEls=[];   // chỉ giữ canvas 3D chính (phủ gần hết màn hình); bản đồ nhỏ / canvas phụ khác bị ẩn
    for(const cv of document.querySelectorAll('canvas'))if(cv.clientWidth>=innerWidth*.5&&cv.clientHeight>=innerHeight*.5){cv.classList.add('apoc-keep');st.keepEls.push(cv)}
    document.body.classList.add('apoc-hide');
    // tắt các cơ chế tự ẩn / hiện theo khoảng cách để thấy trọn cả tầng từ trên cao
    if(Nature.cfg)Nature.cfg.viewDist=400;
    if(st.oc0!==null)OC.set(false);
    if(window.VLOD&&VLOD.cfg)st.vl0=VLOD.cfg.on;   // VLOD vẫn chạy (bản xa nhẹ hơn); chỉ lấy mẫu từ bản gần
    // ---- phân loại các vật của tầng f ----
    const arch=[],nat=[],grd=[],other=[];
    const structAll=FM.structAll();
    for(const [m,g] of structAll){
      if(g!==f){other.push(m);continue}
      const bb=new THREE.Box3().setFromObject(m),h=bb.max.y-bb.min.y,w=Math.max(bb.max.x-bb.min.x,bb.max.z-bb.min.z);
      if(h<=SLAB+.05&&w>2*AF(f)-2)grd.push(m);else arch.push(m);
    }
    if(typeof grid!=='undefined'&&grid)grd.push(grid);
    if(f===0)for(const o of FM.objsOf('set0'))arch.push(o);
    if(f===1)for(const o of FM.objsOf('wall'))arch.push(o);
    for(const o of FM.objsOf('N'+f))nat.push(o);
    for(let g=0;g<NF;g++){
      if(g!==f)for(const o of FM.objsOf('N'+g))other.push(o);
      if(g===0&&f!==0)for(const o of FM.objsOf('set0'))other.push(o);
    }
    if(f!==1)for(const o of FM.objsOf('wall'))other.push(o);
    if(window.NetAvatar&&NetAvatar.root)other.push(NetAvatar.root);   // LAN: người chơi khác không lơ lửng giữa hư không
    // LAN: avatar người chơi khác (net/avatar.js) bị tạo lại / thêm mới giữa chừng nên đổi layer là không đủ (vật mới mặc định layer 0) -> tắt hẳn cả nhóm gốc bằng visible, mỗi khung ép lại ở A.post
    if(window.NetAvatar&&NetAvatar.root){st.na=NetAvatar.root;st.na0=NetAvatar.root.visible;NetAvatar.root.visible=false}
    hide(other,st.savedOther);   // tầng khác (kể cả trần = sàn tầng trên) biến mất khỏi tầm nhìn
    // ---- sương / mây ----
    const q=skyFloor(f);st.cl=q;
    if(q){st.mistL=mistInit(q);st.clouds=(q.cs||[]).map(m=>({m,s:m.scale.clone()}))}
    // ---- lấy mẫu + dựng khối voxel ----
    const lodMap=new Map();if(window.VLOD&&VLOD.list)for(const e of VLOD.list)if(e.gn)lodMap.set(e.m,e.gn);
    const big=f>=1?1.8:1,cx=0,cz=0;
    const mk=(name,cfg,roots,capS,yEps,order,thick,ex,cellK,nopt)=>{
      const S0=collect(roots,cfg.cell*(cellK||1),capS,yEps,lodMap,nopt);
      const cells=bin(S0,cfg.cell*(cellK||1),Math.round((cfg.binCap||cfg.cap)*big),thick);
      const L=mkList(cells,S0.nat,Math.round(cfg.cap*big));
      const g=makeGroup(name,cfg,L,f,{cx,cz,order,roots,extra:ex});
      if(g)st.groups.push(g);
      return g;
    };
    // kiến trúc
    mk('arch',APOC.arch,arch,900000,0,'top',false,null,f>=1?1.5:1,{minCube:APOC.minCube,natCap:200000});
    // bot / boss / đồng minh còn trên tầng: hiện nguyên hình lúc đầu, rồi vỡ thành voxel nhỏ (cùng cơ chế vỡ với các nhóm khác)
    {
      const roots=[],wp=new THREE.Vector3(),y0=FY(f)-2,y1=(f<NF-1?FY(f+1)-SLAB:FY(NF)+10);
      const add=o=>{if(!o||!o.g||o.g.visible===false)return;o.g.getWorldPosition(wp);if(wp.y>=y0&&wp.y<y1)roots.push(o.g)};
      if(window.bots)for(const b of bots)add(b);
      if(typeof allies!=='undefined')for(const a of allies)add(a);
      // VẬT LẠ không thuộc bot / kiến trúc / thiên nhiên: người chơi khác trong LAN (avatar + tên), hướng dẫn viên, nhân viên chòi, hạt bụi, đạn...
      // Cùng tầng + nằm trong sảnh -> vỡ thành voxel như bot; ở tầng khác / quá lớn -> chỉ ẩn (khỏi lơ lửng giữa vũ trụ). Vật ở xa (mặt trời, vòm trời) giữ nguyên.
      {
        const known=new Set([...other,...nat,...arch,...grd,...roots]),addK=o=>{if(o)known.add(o)};
        addK(p.g);if(window.Portal&&Portal.list)for(const q of Portal.list)addK(q.g);
        for(const [m] of structAll)known.add(m);
        addK(typeof grid!=='undefined'?grid:null);
        if(typeof _sk!=='undefined'&&_sk){addK(_sk.dome);addK(_sk.cl);if(_sk.fl)for(const q of _sk.fl)addK(q.g)}
        const bb=new THREE.Box3(),cc=new THREE.Vector3(),sz=new THREE.Vector3(),R=AF(f)+6,hideOnly=[];
        for(const o of S.children.slice()){
          if(known.has(o)||o.isLight||o.isCamera||o.isPoints||!o.visible||o.layers.mask===4)continue;
          let has=false;o.traverse(c=>{if(c.isMesh||c.isSprite)has=true});if(!has)continue;
          bb.setFromObject(o);if(bb.isEmpty())continue;bb.getCenter(cc);bb.getSize(sz);
          if(Math.hypot(cc.x,cc.z)>R||sz.y>200)continue;   // rất xa / khổng lồ (mặt trời, trăng, vòm trời): không đụng
          if(cc.y>=y0&&cc.y<y1&&sz.x<R&&sz.z<R&&sz.y<40)roots.push(o);else hideOnly.push(o);
        }
        hide(hideOnly,st.savedOther);
      }
      if(roots.length)mk('bot',APOC.bot,roots,400000,0,'rand',false,null,1);
    }
    // thiên nhiên (+ cụm mây trắng dựng từ các đám mây nhỏ)
    {
      const cloudPts=[];
      if(st.clouds)for(const c of st.clouds){const s=Math.max(c.s.x,c.s.y,c.s.z)*2;for(let i=0;i<26;i++)cloudPts.push([c.m.position.x+(rnd()-.5)*s*2,c.m.position.y+(rnd()-.5)*s*.8,c.m.position.z+(rnd()-.5)*s*2])}
      const S0=collect(nat,APOC.nat.cell*(f>=1?1.8:1),1100000,0,lodMap,{minCube:APOC.minCube,natCap:250000,budget:2500000});
      for(const c of cloudPts){if(S0.n<S0.X.length){const i=S0.n++;S0.X[i]=c[0];S0.Y[i]=c[1];S0.Z[i]=c[2];S0.R[i]=S0.G[i]=.97;S0.B[i]=1}}
      const cells=bin(S0,APOC.nat.cell*(f>=1?1.8:1),Math.round(APOC.nat.binCap*big),false);
      const L=mkList(cells,S0.nat,Math.round(APOC.nat.cap*big));
      const g=makeGroup('nat',APOC.nat,L,f,{cx,cz,order:'rand',roots:nat,extra:{onStart(){
        if(window.bots)for(const b of bots)if(b&&b.g)b.g.visible=false;
        if(typeof allies!=='undefined')for(const a of allies)if(a&&a.g)a.g.visible=false;
        if(typeof pickups!=='undefined')for(const k of pickups)if(k&&k.g)k.g.visible=false;
      }}});
      if(g)st.groups.push(g);
    }
    // nền đất: rơi dần từ ngoài vào, gần cổng sập sau cùng
    {
      const px=p.x,pz=p.z;
      const S0=collect(grd,APOC.grd.cell*(f>=1?1.8:1),500000,.002,lodMap);
      const cells=bin(S0,APOC.grd.cell*(f>=1?1.8:1),Math.round(APOC.grd.cap*big),true);
      const L=mkList(cells,S0.nat,Math.round(APOC.grd.cap*big*1.9));
      const g=makeGroup('grd',APOC.grd,L,f,{cx:px,cz:pz,order:'far',roots:grd,extra:null});
      if(g)st.groups.push(g);
    }
    st.wind=makeWind(f,AF(f));
    st.stars=makeStars();
    // thời điểm các mốc
    st.tVoid=APOC.grd.at+APOC.grd.len;
    st.tDive=st.tVoid+APOC.hold;
    st.tEnd=st.tDive+APOC.dive;
    console.log('[Block Arena] tận thế: dựng '+st.groups.map(g=>g.name+' '+g.N).join(' · ')+' khối trong '+Math.round(performance.now()-t0)+' ms');
    bump(.35);
  }

  // ------------------------------------------------------------------ MỖI KHUNG (main.js gọi sau khi đặt camera)
  A.update=function(dt){
    if(!A.active||!st)return;
    try{tick(dt)}catch(err){console.error('[Block Arena] cảnh tận thế lỗi giữa chừng:',err);const d=st&&st.done;finishNow(d)}
  };
  A.fov=function(){return st?st.fov:75};

  // độ cao (toạ độ thế giới) tối đa của camera ở tầng f; Infinity = không giới hạn
  function camCap(f){
    const o=APOC.camTop&&APOC.camTop[f];
    if(typeof o==='number')return FY(f)+o;
    if(f>=NF-1)return Infinity;                       // tầng trên cùng: không có trần
    return FY(f)+FHT[f]-SLAB-APOC.camMargin;          // dưới mặt dưới của sàn tầng trên
  }
  function topPose(T,out){
    const s=st,f=s.f,asp=innerWidth/Math.max(1,innerHeight),mn=Math.min(1,asp);
    const az=s.az0+APOC.spin*T,k=(1-.06*sm(T/(s.tVoid||30))),cap=camCap(f);
    out.fov=APOC.fov;
    if(cap<Infinity){
      // TẦNG CÓ TRẦN: camera bám sát trần (như góc nhìn thứ 3 nhưng ở trên cao), CÚI XUỐNG nhìn mặt sàn rồi xoay chậm quanh tâm tầng
      const gy=FY(f),hh=Math.max(4,cap-gy),A=AF(f);
      const R=Math.min(hh/Math.tan(APOC.ceilPitch),A*.8)*k;   // bán kính quỹ đạo: đủ xa để góc cúi ~ceilPitch, không vượt tường
      out.tgt.set(0,gy+1,0);
      out.pos.set(Math.sin(az)*R,cap,Math.cos(az)*R);
      const dist=Math.hypot(R,cap-(gy+1));
      const fv=2*Math.atan((A*.75)/dist/mn)*180/Math.PI;   // FOV đủ rộng để thấy gần hết tầng
      out.fov=Math.min(APOC.fovMax,Math.max(APOC.fov,fv));
      return;
    }
    // TẦNG TRÊN CÙNG (không có trần): kéo vút lên cao như cũ
    const H=Math.tan(APOC.fov*Math.PI/360)*mn;
    const Af=AF(f)+3,wallH=FHT[f]-1,el=APOC.el;
    const d=Math.max(40,(Af/H+wallH*Math.sin(el))*1.02)*k;
    out.tgt.set(0,FY(f)+3,0);
    out.pos.set(Math.sin(az)*Math.cos(el)*d,Math.sin(el)*d,Math.cos(az)*Math.cos(el)*d).add(out.tgt);
  }
  const TP_={tgt:new THREE.Vector3(),pos:new THREE.Vector3(),fov:58},VP_={tgt:new THREE.Vector3(),pos:new THREE.Vector3()},_a=new THREE.Vector3(),_b=new THREE.Vector3();

  function tick(dt){
    const s=st,f=s.f,T=(s.T+=dt),p=s.p;
    if(typeof reviveT==='number')reviveT=Math.max(reviveT,2);   // bất tử suốt cảnh (đạn boss vẫn bay)
    if(s.ui.flash){   // chớp sáng lúc bước qua cổng -> mờ dần; cuối cảnh chớp trắng
      let o=1-sm(T/.9);
      if(T>s.tDive)o=Math.max(o,sm((T-(s.tEnd-.55))/.55));
      s.ui.flash.style.opacity=o.toFixed(3);
    }
    // ---- các nhóm bị phá ----
    for(const g of s.groups)stepGroup(g,T-g.cfg.at,dt);
    const tn=T-APOC.nat.at,tg=T-APOC.grd.at;
    stepWind(s.wind,tn/APOC.nat.len,T,f,0,0);
    // sương + mây tan dần (mờ bớt khi camera bay lên để thấy tầng bên dưới, rồi biến mất theo giai đoạn thiên nhiên)
    if(s.mistL){
      const base=1-.72*sm((T-1)/(APOC.rise-1)),k=base*(1-sm(tn/(APOC.nat.len*.8)));
      mistSet(s.mistL,k);
      if(s.clouds)for(const c of s.clouds){const e=1-sm(tn/(APOC.nat.len*.7));c.m.scale.set(c.s.x*e,c.s.y*e,c.s.z*e)}
    }
    // ---- bầu trời: tối dần thành vũ trụ, sao hiện ra khi nền đất tan ----
    const dk=sm((T-APOC.arch.at)/(APOC.grd.at+APOC.grd.len-APOC.arch.at));
    s.dk=dk;
    s.stars.material.opacity=sm((T-(APOC.grd.at+APOC.crack))/(APOC.grd.len));
    s.stars.position.copy(C.position);
    // ---- cổng trôi dạt ----
    {
      const dr=sm((T-(APOC.grd.at+APOC.crack+2))/5),tv=Math.max(0,T-s.tVoid);
      p.g.position.set(s.pos0.x+Math.sin(T*.55)*.9*dr,s.pos0.y+Math.sin(T*.7)*.55*dr+.25*tv*dr,s.pos0.z+Math.cos(T*.4)*.8*dr);
      p.g.rotation.y+=dt*.12*dr;
    }
    // ---- camera ----
    const rise=sm5(T/APOC.rise);
    if(!s.cam0){s.cam0={pos:C.position.clone(),q:C.quaternion.clone(),fov:C.fov}}
    topPose(T,TP_);
    // cảnh cuối: bay tới trước mặt cổng
    const vb=sm5((T-s.tVoid+1.5)/3.2);
    {
      const R=4.2,ang=Math.atan2(p.nx,p.nz)+.3*Math.sin((T-s.tVoid)*.35);
      const dist=14-12.5*sm5((T-s.tDive)/APOC.dive);
      _a.copy(p.g.position);
      VP_.tgt.copy(_a);
      VP_.pos.set(_a.x+Math.sin(ang)*dist,_a.y+dist*.28+1,_a.z+Math.cos(ang)*dist);
    }
    _a.copy(TP_.tgt).lerp(VP_.tgt,vb);_b.copy(TP_.pos).lerp(VP_.pos,vb);
    const cap=camCap(f);if(cap<Infinity&&_b.y>cap)_b.y=cap;   // cảnh lao vào cổng cũng không vượt trần
    s.tmp.position.copy(_b);s.tmp.up.set(0,1,0);_M.lookAt(_b,_a,s.tmp.up);s.tmp.quaternion.setFromRotationMatrix(_M);   // Matrix4.lookAt(eye,target): hướng -Z của camera quay về target. (Object3D.lookAt của vật KHÔNG phải camera quay +Z về target -> camera sẽ nhìn ngược ra sau lưng)
    // đoạn kéo lên: nội suy vị trí + hướng từ góc nhìn người chơi
    if(rise<1&&vb<=0){
      C.position.copy(s.cam0.pos).lerp(_b,rise);
      C.quaternion.copy(s.cam0.q).slerp(s.tmp.quaternion,rise);
    }else{
      C.position.copy(_b);C.quaternion.copy(s.tmp.quaternion);
    }
    s.fov=s.cam0.fov+(TP_.fov-s.cam0.fov)*rise+(75-TP_.fov)*vb*.85;
    // rung màn hình
    trauma=Math.max(0,trauma-dt*1.5);
    if(trauma>0){
      const a=trauma*trauma,r=()=>rnd()-.5,sc=1+C.position.distanceTo(_a)*.012;
      C.rotation.x+=r()*.05*a;C.rotation.y+=r()*.05*a;C.rotation.z+=r()*.04*a;
      C.position.x+=r()*.9*a*sc;C.position.y+=r()*.9*a*sc;C.position.z+=r()*.9*a*sc;
    }
    if(cap<Infinity&&C.position.y>cap)C.position.y=cap;   // rung xong vẫn không chui qua trần
    if(T>=s.tEnd)finishNow(s.done);
  }

  // ------------------------------------------------------------------ SAU skyTick: ép sương / nền / vòm trời theo cảnh
  A.post=function(){
    const s=st;if(!A.active||!s)return;
    try{
      const f=s.f;
      if(s.na&&s.na.visible)s.na.visible=false;
      if(S.fog){const k=sm(s.T/2.2);S.fog.near=s.fog0.n+(500-s.fog0.n)*k;S.fog.far=s.fog0.f+(900-s.fog0.f)*k;if(s.dk>0)S.fog.color.copy(s.fog0.c).lerp(BLACK,s.dk)}
      if(S.background&&S.background.isColor&&s.bg0)S.background.copy(s.bg0).lerp(BLACK,s.dk||0);
      if(typeof _sk!=='undefined'&&_sk){
        if(_sk.dome)_sk.dome.visible=false;if(_sk.cl)_sk.cl.visible=false;
        if(_sk.fl)for(const q of _sk.fl){if(q.f!==f)q.g.visible=false;else if(s.mistL&&(s.T-APOC.nat.at)>APOC.nat.len*.8)q.g.visible=false}
      }
    }catch(e){}
  };
  if(typeof tickSky==='function'&&!window.__apocSky){   // móc vào tickSky của sky.js
    window.__apocSky=true;
    const _ts=tickSky;
    window.tickSky=function(dt){const r=_ts(dt);if(A.active)A.post();return r};
  }

  // ------------------------------------------------------------------ KẾT THÚC / TRẢ LẠI NGUYÊN TRẠNG
  function restore(){
    const s=st;if(!s||s.restored)return;s.restored=true;
    unhide(s.savedOther);
    if(s.na)s.na.visible=s.na0!==false;
    for(const g of s.groups){unhide(g.saved);S.remove(g.im);g.geo.dispose();g.mat.dispose();if(g.im.dispose)g.im.dispose()}
    if(s.wind){S.remove(s.wind.im);s.wind.geo.dispose();s.wind.mat.dispose()}
    if(s.stars){S.remove(s.stars);s.stars.geometry.dispose();s.stars.material.dispose()}
    if(s.mistL)mistSet(s.mistL,1);
    if(s.clouds)for(const c of s.clouds)c.m.scale.copy(c.s);
    if(window.bots)for(const b of bots)if(b&&b.g)b.g.visible=true;
    if(typeof allies!=='undefined')for(const a of allies)if(a&&a.g)a.g.visible=true;
    if(typeof pickups!=='undefined')for(const k of pickups)if(k&&k.g)k.g.visible=true;
    if(S.fog&&s.fog0){S.fog.near=s.fog0.n;S.fog.far=s.fog0.f;S.fog.color.copy(s.fog0.c)}
    if(S.background&&S.background.isColor&&s.bg0)S.background.copy(s.bg0);
    if(Nature.cfg&&s.vd0!==null)Nature.cfg.viewDist=s.vd0;
    if(s.oc0)OC.set(true);
    if(s.hud)s.hud.style.visibility=s.hud0||'';
    document.body.classList.remove('apoc-hide');
    if(s.keepEls)for(const e of s.keepEls)e.classList.remove('apoc-keep');
    if(s.ui&&s.ui.root.parentNode)s.ui.root.parentNode.removeChild(s.ui.root);
    trauma=0;
  }
  function finishNow(done){
    if(!st||st.finished)return;st.finished=true;
    const d=st.done;
    try{restore()}catch(e){console.error(e)}
    A.active=false;st=null;
    if(typeof reviveT==='number')reviveT=Math.max(reviveT,2.5);
    if(d)d();
  }
  A.skip=function(){if(A.active&&st)finishNow(st.done)};
  window.APOC=APOC;
  return A;
})();
window.Apoc=Apoc;