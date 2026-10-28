// LÕI DỰNG VÀNH NÚI VOXEL DÙNG CHUNG cho tầng 2, 3, 4 (tầng 1 có bản riêng world/floor1/hills.js kèm thác nước + khắc tên).
// Cùng thuật toán với hills.js của tầng 1: một VÀNH NÚI liền khối bao 4 phía (kể cả 4 góc hình quạt) quanh sàn vuông của tầng,
// nằm NGOÀI ranh giới sàn, chỉ dựng lớp vỏ ngoài bằng khối voxel; đá có vân tầng, rêu ở chân núi, tuyết phủ đỉnh, rải rác cây thông.
// Khác tầng 1:
//  - Mỗi tầng có TỆP CẤU HÌNH RIÊNG (world/floorN/hillsN.js) gọi HillsKit.make({f, cfg, pal}) -> chỉnh độ cao / màu / cây / đỉnh núi từng tầng độc lập.
//  - Độ cao tính từ SÀN CỦA TẦNG (FY(f)), cỡ vành tự theo AF(f) (nửa cạnh sàn). Đỉnh núi phải thấp hơn trần (FHT[f]-SLAB = 29.6m).
//  - 4 tường bao (level.js) chỉ còn va chạm vô hình; núi thay phần nhìn thấy. Đặt cfg.on=false -> dựng lại 4 tường phẳng.
//  - Không có thác nước / bảng khắc tên (đó là đồ riêng của tầng 1).
//  - Không tự dựng khi nạp file: floors.js (FM) gọi FloorHills[f].build() khi tầng f được nạp và tự dỡ khi tầng f bị dỡ (khóa 'hills'+f).
// Nạp SAU world.js / level.js / voxel.js, TRƯỚC các file world/floor2/hills2.js, floor3/hills3.js, floor4/hills4.js (xem loader.js). Kiểm tra trong Console: FloorHills[1].info().
(function(){
const hash=(i,j,s)=>{let h=(Math.imul(i,374761393)+Math.imul(j,668265263)+Math.imul(s,2147483647))|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296};
const sm=t=>t*t*(3-2*t),cl=(x,a,b)=>x<a?a:x>b?b:x,lerp=(a,b,t)=>a+(b-a)*t;
function vn(x,y,s){const i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,a=hash(i,j,s),b=hash(i+1,j,s),c=hash(i,j+1,s),d=hash(i+1,j+1,s),u=sm(fx),v=sm(fy);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function fbm(x,y,s,o=4){let a=.5,f=1,t=0,n=0;for(let k=0;k<o;k++){t+=a*vn(x*f,y*f,s+k*17);n+=a;a*=.5;f*=2}return t/n}

// bảng màu mặc định (giống tầng 1); mỗi tầng ghi đè từng nhóm màu qua opt.pal
const PAL0={
  rock:[0x80848c,0x6f737b,0x8f939c,0x5f636b,0x787c84],warm:[0x8a8379,0x7c766d,0x948d82],
  moss:[0x5e8c4a,0x6c9c57,0x4f7d45,0x78a65f],dirt:[0x7a5c3e,0x6a4f35],snow:[0xf5f8fc,0xe6edf5,0xd7e0ec],
  bark:[0x6b4a2e,0x5b3f27,0x7a5636],leaf:[0x2c6b3d,0x37804a,0x469556,0x58a864],wall:0x9ccfff
};
// cấu hình mặc định (đơn vị m, tính từ sàn tầng). Mỗi tầng ghi đè qua opt.cfg
const CFG0={
  on:true,               // false = trả lại 4 tường phẳng
  seed:0,                // cộng vào mọi hạt giống nhiễu -> mỗi tầng một dáng núi khác nhau
  cs:.7,                 // cạnh khối voxel (m); nhỏ = mịn nhưng nặng. Tầng 1 dùng .6, tầng rộng 150m nên để .7-.75
  D:34,                  // độ sâu khối núi ra phía ngoài (m)
  corner:10,             // bán kính \"cung\" tính tọa độ dọc vành ở góc
  crest:[16,20],         // độ cao sống núi phía trước (m): thấp nhất / cao nhất
  crestU:[11,17],        // sống núi phía trước cách chân bao xa (m): càng lớn sườn càng thoải
  peaks:null,            // null = tự rải đỉnh nhô lên theo peakGap / peakH / peakW; hoặc truyền mảng 4 tường [[u, độ cao thêm, độ rộng],...] như hills.js tầng 1
  peakGap:24,            // (tự rải) khoảng cách trung bình giữa 2 đỉnh dọc một tường (m)
  peakH:[4,7],           // (tự rải) độ cao thêm của đỉnh (m)
  peakW:[5.5,8.5],       // (tự rải) độ rộng đỉnh (m)
  top:26,                // đỉnh cao nhất cho phép (m). Tầng 2-3 có trần ở 29.6m nên giữ dưới ~27
  rough:1.25,            // nhân độ gồ ghề mặt núi (0 = nhẵn)
  snow:20.5,             // từ độ cao này trở lên là tuyết (m)
  pines:90,              // số cây thông mỗi tường (0 = không cây)
  pineU:[5,18],          // cây chỉ mọc cách chân núi trong khoảng này (m)
  pineH:[3,16],          // cây chỉ mọc ở độ cao nằm trong khoảng này (m)
  pineSlope:3.6,         // cây chỉ mọc chỗ chênh độ cao quanh gốc <= bấy nhiêu m (sườn thoải); nới ra nếu cây quá thưa
  cell:14,               // cạnh ô cắt mesh (m)
  apron:2.1              // lớp vỏ ở chân núi kéo sâu xuống dưới sàn bấy nhiêu m (phải < SLAB=2.4 để không thò xuống tầng dưới)
};

function make(opt){
  const F=opt.f,CFG=Object.assign({},CFG0,opt.cfg||{}),PAL=Object.assign({},PAL0,opt.pal||{}),SD=CFG.seed|0;
  const A=AF(F);                                       // nửa cạnh sàn của tầng (level.js)
  const NC=Math.round(2*A/CFG.cs),CS=2*A/NC;           // CS ~ cfg.cs, chỉnh nhẹ để mép sàn (±A) trùng đúng cạnh ô
  const MG=Math.ceil(CFG.D/CS),NG=NC+2*MG;
  const APR=Math.round(CFG.apron/CS);
  const R0=CFG.corner,AC=R0*Math.PI/2,PER=8*A+4*AC,NP=Math.max(4,Math.round(PER/6.5));
  const SOFF=[7*A+3*AC,3*A+AC,5*A+2*AC,A];            // tọa độ dọc vành a = SOFF[tường] + u (0 Bắc, 1 Nam, 2 Tây, 3 Đông)
  const DIR=[[0,-1],[0,1],[-1,0],[1,0]];
  const SLOPE=Math.max(2,Math.round(CFG.pineSlope/CS)); // chênh độ cao tối đa (số lớp) quanh gốc cây thông

  // ---------- đỉnh nhô lên: tự rải đều dọc mỗi tường (có xê dịch ngẫu nhiên nhưng cố định theo seed) ----------
  const PEAKS=CFG.peaks||[0,1,2,3].map(q=>{
    const n=Math.max(3,Math.round(2*(A-10)/CFG.peakGap)),out=[];
    for(let i=0;i<n;i++){
      const base=-(A-10)+(i+.5)*(2*(A-10)/n),jit=(hash(i,q,901+SD)-.5)*CFG.peakGap*.5;
      out.push([base+jit,lerp(CFG.peakH[0],CFG.peakH[1],hash(i,q,902+SD)),lerp(CFG.peakW[0],CFG.peakW[1],hash(i,q,903+SD))]);
    }
    return out;
  });

  function vnp(a,y,s){   // nhiễu TUẦN HOÀN theo a (đi hết một vòng quanh sàn thì khớp lại, không có vết nối)
    const x=a/PER*NP,i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,i0=((i%NP)+NP)%NP,i1=(i0+1)%NP,u=sm(fx),v=sm(fy),
      q=hash(i0,j,s),b=hash(i1,j,s),c=hash(i0,j+1,s),d=hash(i1,j+1,s);
    return q+(b-q)*u+(c-q)*v+(q-b-c+d)*u*v;
  }
  const clA=v=>v<-A?-A:v>A?A:v;
  function perim(x,z){
    const ax=Math.abs(x)-A,az=Math.abs(z)-A;
    if(az<=0)return x>0?z+A:4*A+2*AC+(A-z);
    if(ax<=0)return z>0?2*A+AC+(A-x):6*A+3*AC+(x+A);
    if(x>0&&z>0)return 2*A+Math.atan2(az,ax)*R0;
    if(x<0&&z>0)return 4*A+AC+Math.atan2(ax,az)*R0;
    if(x<0&&z<0)return 6*A+2*AC+Math.atan2(az,ax)*R0;
    return 8*A+3*AC+Math.atan2(ax,az)*R0;
  }
  function peakSum(a){
    let s=0;
    for(let q=0;q<4;q++)for(const p of PEAKS[q]){
      let d=Math.abs(a-(((SOFF[q]+p[0])%PER+PER)%PER));d=Math.min(d,PER-d)/p[2];s+=p[1]*Math.exp(-d*d);
    }
    return s;
  }
  const ucAt=(fx,fz)=>lerp(CFG.crestU[0],CFG.crestU[1],fbm(fx/40,fz/40,16+SD));
  function field(x,z){   // độ cao (m, tính từ sàn tầng) của núi tại (x,z) ngoài sàn; u = khoảng cách tới sàn vuông
    const fx=clA(x),fz=clA(z),u=Math.hypot(x-fx,z-fz),a=perim(x,z);
    let hc=lerp(CFG.crest[0],CFG.crest[1],fbm(fx/34,fz/34,11+SD))+peakSum(a);
    hc=Math.min(CFG.top-1,hc);
    const uc=ucAt(fx,fz),top2=Math.min(CFG.top,hc+1.5+3.5*fbm(fx/26+3.3,fz/26+1.7,20+SD)),t=u/uc;
    let h=t<1?hc*Math.pow(t,1.15):hc+(top2-hc)*sm(cl((u-uc)/9,0,1));
    const ramp=cl(u/4,0,1)*(.35+.65*sm(cl(t,0,1)));
    const gul=1-Math.abs(2*vnp(a,u/22,20+SD)-1);   // khe núi chạy dọc sườn
    h+=((gul-.5)*3+(fbm(x/4,z/4,14+SD)-.5)*2.2)*ramp*CFG.rough;
    return cl(h,0,CFG.top);
  }

  // ---------- lưới độ cao (số lớp khối) ----------
  const IN=-30000,FAR=-29000;                          // IN: ô trong sàn · FAR: ô quá độ sâu D (góc cắt tròn)
  const HQ=new Int16Array(NG*NG);let ready=false;
  const gi=v=>Math.floor((v+A)/CS)+MG,gc=k=>-A+(k-MG+.5)*CS;
  const cellOk=(kx,kz)=>kx>=0&&kx<NG&&kz>=0&&kz<NG;
  const ly=(x,z)=>{const kx=gi(x),kz=gi(z);if(!cellOk(kx,kz))return null;const w=HQ[kz*NG+kx];return w<=FAR?null:w};
  function grid(){
    if(ready)return;ready=true;
    for(let kz=0;kz<NG;kz++)for(let kx=0;kx<NG;kx++){
      const x=gc(kx),z=gc(kz),dx=Math.abs(x)-A,dz=Math.abs(z)-A;let v;
      if(dx<=0&&dz<=0)v=IN;
      else v=Math.hypot(Math.max(dx,0),Math.max(dz,0))>CFG.D?FAR:Math.round(field(x,z)/CS);
      HQ[kz*NG+kx]=v;
    }
  }
  const sidePt=(s,c,u)=>s===0?[c,-(A+u)]:s===1?[-c,A+u]:s===2?[-(A+u),-c]:[A+u,c];   // điểm thế giới: tường s, vị trí dọc tường c, cách chân núi u

  // ---------- màu ----------
  function colorOf(y,x,z,kx,kz,flat){
    if(y<0)return PAL.dirt[hash(kx,kz,3+SD)<.5?0:1];   // lớp vỏ dưới sàn
    const n=hash(kx,kz,77+SD),n2=hash(kz,kx,91+SD);
    const snowLine=CFG.snow+(fbm(x/9,z/9,31+SD)-.5)*3;
    if(y>=snowLine)return PAL.snow[(n*PAL.snow.length)|0];
    const mossN=fbm(x/7,z/7,9+SD);
    if(y<2.4+(mossN-.5)*3.2)return n<.12?PAL.dirt[(n2*PAL.dirt.length)|0]:PAL.moss[(n*PAL.moss.length)|0];
    if(flat&&y<9.5&&mossN>.6&&n<.75)return PAL.moss[(n*PAL.moss.length)|0];
    const band=Math.floor(y/1.2+(fbm(x/12,z/12,5+SD)-.5)*7);
    const pal=(band%7===0)?PAL.warm:PAL.rock;
    return pal[Math.min(pal.length-1,((band&1?.35:0)+n*.65)*pal.length|0)];
  }

  // ---------- dựng ----------
  const nbh=(kx,kz,own)=>{if(!cellOk(kx,kz))return own;const w=HQ[kz*NG+kx];return w===IN?-APR:(w<=FAR?own:w)};
  function buildRing(v,y0){
    for(let kz=0;kz<NG;kz++)for(let kx=0;kx<NG;kx++){
      const k=kz*NG+kx,hq=HQ[k];if(hq<=FAR)continue;
      const n1=nbh(kx-1,kz,hq),n2=nbh(kx+1,kz,hq),n3=nbh(kx,kz-1,hq),n4=nbh(kx,kz+1,hq);
      const foot=n1===-APR||n2===-APR||n3===-APR||n4===-APR;   // ô sát sàn: kéo vỏ xuống dưới sàn (bịt đầu lòng sông)
      if(hq<=0&&!foot)continue;
      let lo=Math.min(hq,n1,n2,n3,n4);if(lo>=hq)lo=hq-1;
      const x=gc(kx),z=gc(kz);
      for(let l=lo;l<hq;l++){
        const y=(l+.5)*CS,top=l===hq-1;
        v.cube(x,y0+y,z,CS,CS,CS,colorOf(y,x,z,kx,kz,top),kx,l,kz);
      }
    }
  }
  let PINES=0;const BUILT=[];
  function buildPines(v,y0){
    const tiers=[[2,2,1,1,0],[3,3,2,2,1,1,0],[2,2,1,1,0]],LEAF=PAL.leaf,BARK=PAL.bark;
    PINES=0;
    for(let s=0;s<4;s++){
      const placed=[],R=(a,b)=>hash(a,b,555+s+SD),d=DIR[s];let tries=0;
      while(placed.length<CFG.pines&&tries++<CFG.pines*400){
        const u=lerp(CFG.pineU[0],CFG.pineU[1],R(tries,1)),c=-A+3+R(tries,2)*(2*A-6),p=sidePt(s,c,u),x=p[0],z=p[1];
        const kx=gi(x),kz=gi(z);if(!cellOk(kx,kz))continue;
        const hq=HQ[kz*NG+kx];if(hq<=FAR)continue;
        const h=hq*CS;if(h<CFG.pineH[0]||h>CFG.pineH[1])continue;
        const ha=ly(x+d[0]*2*CS,z+d[1]*2*CS),hb=ly(x-d[0]*2*CS,z-d[1]*2*CS);
        if(ha===null||hb===null||Math.abs(ha-hb)>SLOPE)continue;                  // chỉ mọc chỗ sườn thoải
        if(fbm(x/11,z/11,15+s+SD)<.3)continue;                                    // thành từng cụm
        if(placed.some(q=>Math.hypot(q[0]-x,q[1]-z)<3.2))continue;
        placed.push([x,z]);PINES++;
        const tp=tiers[(R(tries,3)*3)|0];let l=hq;
        for(let t=0;t<2;t++,l++)v.cube(gc(kx),y0+(l+.5)*CS,gc(kz),CS,CS,CS,BARK[(t+kx+kz)%BARK.length],kx,l,kz);   // thân
        for(let m=0;m<tp.length;m++,l++){
          const r=tp[m];
          for(let di=-r;di<=r;di++)for(let dk=-r;dk<=r;dk++){
            if(r>=2&&Math.abs(di)===r&&Math.abs(dk)===r)continue;
            const ci=kx+di,ck=kz+dk;if(!cellOk(ci,ck))continue;
            const w=HQ[ck*NG+ci];if(w<=FAR||l<w)continue;                         // không dựng khối nằm trong núi
            const col=LEAF[Math.min(LEAF.length-1,((m/tp.length)*(LEAF.length-.8)+hash(ci,ck,l)*.6)|0)];
            v.cube(gc(ci),y0+(l+.5)*CS,gc(ck),CS,CS,CS,col,ci,l,ck);
          }
        }
      }
    }
  }
  const S_add=m=>{S.add(m);meshes.push(m)};   // meshes: để đạn để lại vết trên núi
  function flatWalls(y0){   // cfg.on=false: 4 tường phẳng như level.js cũ (chỉ phần nhìn thấy; va chạm do level.js giữ sẵn)
    const H=F<NF-1?FHT[F]-SLAB:FHT[F]-1,wm=(x,z,w,d)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,H,d),new THREE.MeshLambertMaterial({color:PAL.wall}));m.position.set(x,y0+H/2,z);S_add(m);BUILT.push(m)};
    for(const sx of[-1,1])wm(sx*(A+.5),0,1,2*A+3);
    for(const sz of[-1,1])wm(0,sz*(A+.5),2*A+3,1);
  }
  function build(){
    BUILT.length=0;const y0=FY(F);
    if(!CFG.on){flatWalls(y0);return}
    grid();
    const v=new VB();
    buildRing(v,y0);
    if(CFG.pines>0)buildPines(v,y0);
    for(const m of v.meshLOD(CFG.cell)){S_add(m);BUILT.push(m)}
  }
  function info(){
    grid();let mx=0,cnt=0;
    for(let k=0;k<HQ.length;k++){const w=HQ[k];if(w>FAR){cnt++;if(w>mx)mx=w}}
    let tri=0;for(const m of BUILT)if(m.parent)tri+=(m.geometry.index?m.geometry.index.count:0)/3;
    return{tang:F+1,cotCaoNhat_m:+(mx*CS).toFixed(1),tran_m:+(FHT[F]-SLAB).toFixed(1),soCot:cnt,thong:PINES,tamGiac:Math.round(tri),mesh:BUILT.filter(m=>m.parent).length};
  }
  // độ cao mặt núi (m, TUYỆT ĐỐI trong thế giới) tại (x,z) ngoài sàn; null nếu không có núi
  const surf=(x,z)=>{grid();const w=ly(x,z);return w===null?null:FY(F)+w*CS};
  return{build,cfg:CFG,pal:PAL,info,surf,floor:F};
}
window.HillsKit={make};
window.FloorHills=window.FloorHills||{};   // FloorHills[f] (f = 1,2,3 ~ tầng 2,3,4): đăng ký ở world/floorN/hillsN.js, floors.js đọc để dựng / dỡ theo tầng
})();
