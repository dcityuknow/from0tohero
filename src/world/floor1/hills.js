// ĐỒI NÚI VOXEL BAO CẢ 4 PHÍA của tầng 1 (thay cho 4 bức tường: Bắc/Nam hồng, Tây/Đông xanh).
// Một VÀNH NÚI liền khối quanh sân vuông (x, z = ±HALF0), kể cả 4 GÓC (góc là núi hình quạt tròn, không hở trời).
//  - Núi nằm NGOÀI ranh giới sân, sâu CFG.D m: chân núi chạm đúng vị trí tường cũ, sườn dốc lên sống núi (cao tới ~19m, dưới sàn tầng 2 ở 22.4m),
//    phía sau sống thứ nhất còn sống cao hơn + vài đỉnh nhô lên (CFG.peaks theo từng tường).
//  - Chỉ dựng LỚP VỎ ngoài bằng khối .6m; đá xám có vân tầng, rêu xanh ở chân núi, tuyết phủ đỉnh cao, rải rác cây thông.
//  - 4 tường cũ KHÔNG còn mesh (world.js chỉ giữ va chạm vô hình) nên người chơi / bot / lựu đạn không đi xuyên ra ngoài được.
//  - Khắc tên (gameplay/engrave.js): ngắm trúng SƯỜN NÚI (Hills.ray), bảng bám theo sườn núi qua Hills.fit() - nghiêng theo dốc, tự ẩn nếu sau bảng không có núi.
//  - THÁC NƯỚC: 2 hồ tắm (bath.js) có 3 dòng suối bắt nguồn từ gần sống núi, chảy theo máng khoét trên sườn núi, qua vai đá chân núi,
//    rồi nối vào các bậc thác của hồ. Máng + nước dựng ở đây (carveFalls / buildFalls), vật liệu + hạt nước dùng chung với bath.js (window.BathWater).
// Nạp SAU bath.js / stairgrove.js, TRƯỚC nature.js (xem loader.js). floors.js (FM) gọi Hills.build() sau Bath.build() mỗi khi dựng lại bộ đồ tầng 1.
// Tắt hẳn: CFG.on=false (dựng lại 4 tường phẳng). Tắt thác núi: CFG.falls.on=false. Kiểm tra trong Console: Hills.info().
(function(){
const CFG={
  on:true,               // false = trả lại 4 tường phẳng
  D:34,                  // độ sâu khối núi ra phía ngoài (m)
  corner:10,             // bán kính "cung" dùng để tính tọa độ dọc vành ở góc (chỉ ảnh hưởng nhiễu, không đổi hình)
  crest:[13.2,16.8],     // độ cao sống núi phía trước (m): thấp nhất / cao nhất
  crestU:[10,16],        // sống núi phía trước cách chân bao xa (m): càng lớn sườn càng thoải
  peaks:[                // đỉnh nhô lên: mỗi tường [vị trí dọc tường u (cùng hệ với engrave.js), độ cao thêm (m), độ rộng (m)]
    [[-32,5,6.5],[-10,6.2,8],[12,4.4,5.5],[33,5.6,7]],     // 0 Bắc (z = -HALF0)
    [[-30,5.6,7],[-7,4.2,5.5],[15,6.6,8],[34,4.8,6]],      // 1 Nam (z = +HALF0)
    [[31,4.6,6],[9,6.4,8],[-14,4.2,5.5],[-34,5.2,7]],      // 2 Tây (x = -HALF0)
    [[-34,5.4,7],[-12,4,5.5],[8,6.4,8],[30,4.4,6]]         // 3 Đông (x = +HALF0)
  ],
  top:19.2,              // đỉnh cao nhất cho phép (m)
  rough:1.25,            // nhân độ gồ ghề mặt núi (0 = nhẵn)
  snow:15.6,             // từ độ cao này trở lên là tuyết (m)
  pines:58,              // số cây thông mỗi tường (0 = không cây)
  pineU:[5,17],          // cây chỉ mọc cách chân núi trong khoảng này (m)
  cell:14,               // cạnh ô cắt mesh (m)
  apron:3.6,             // lớp vỏ ở chân núi kéo sâu xuống dưới sàn bấy nhiêu m
  falls:{
    on:true,
    plat:5.2,            // vai đá sau hồ tắm: cao ở sát tường (m), cao hơn đỉnh vách đá của hồ (~3.9m) để nước chảy xuống vách
    platSlope:.35,       // vai đá dốc lên bấy nhiêu m cho mỗi m đi sâu vào núi
    platHalf:6,          // vai đá rộng nửa bề ngang (m) quanh tâm hồ
    join:4.2,            // độ cao đáy máng ở sát tường (m): từ đây nước đổ xuống bậc thác trên cùng của hồ
    src:.92              // suối bắt nguồn ở khoảng này (tỉ lệ) của quãng từ chân tới sống núi
  }
};
const A=HALF0;
const NC=Math.round(2*A/.6),CS=2*A/NC;                 // CS ~ .6m, chỉnh nhẹ để mép sân (±A) trùng đúng cạnh ô
const MG=Math.ceil(CFG.D/CS),NG=NC+2*MG;               // lưới NG x NG ô, gồm cả phần trong sân (đánh dấu IN)
const APR=Math.round(CFG.apron/CS);
const R0=CFG.corner,AC=R0*Math.PI/2,PER=8*A+4*AC,NP=Math.max(4,Math.round(PER/6.5));
const SOFF=[7*A+3*AC,3*A+AC,5*A+2*AC,A];               // tọa độ dọc vành a = SOFF[tường] + u (u: tọa độ dọc tường kiểu engrave.js)
const ROCK=[0x80848c,0x6f737b,0x8f939c,0x5f636b,0x787c84],WARM=[0x8a8379,0x7c766d,0x948d82];
const MOSS=[0x5e8c4a,0x6c9c57,0x4f7d45,0x78a65f],DIRT=[0x7a5c3e,0x6a4f35];
const SNOW=[0xf5f8fc,0xe6edf5,0xd7e0ec],WETC=0x4a525c;
const BARK=[0x6b4a2e,0x5b3f27,0x7a5636],LEAF=[0x2c6b3d,0x37804a,0x469556,0x58a864];

// ---------- nhiễu giá trị ----------
const hash=(i,j,s)=>{let h=(Math.imul(i,374761393)+Math.imul(j,668265263)+Math.imul(s,2147483647))|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296};
const sm=t=>t*t*(3-2*t),cl=(x,a,b)=>x<a?a:x>b?b:x,lerp=(a,b,t)=>a+(b-a)*t;
function vn(x,y,s){const i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,a=hash(i,j,s),b=hash(i+1,j,s),c=hash(i,j+1,s),d=hash(i+1,j+1,s),u=sm(fx),v=sm(fy);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function fbm(x,y,s,o=4){let a=.5,f=1,t=0,n=0;for(let k=0;k<o;k++){t+=a*vn(x*f,y*f,s+k*17);n+=a;a*=.5;f*=2}return t/n}
function vnp(a,y,s){   // nhiễu TUẦN HOÀN theo a (đi hết một vòng quanh sân thì khớp lại, không có vết nối)
  const x=a/PER*NP,i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,i0=((i%NP)+NP)%NP,i1=(i0+1)%NP,u=sm(fx),v=sm(fy),
    q=hash(i0,j,s),b=hash(i1,j,s),c=hash(i0,j+1,s),d=hash(i1,j+1,s);
  return q+(b-q)*u+(c-q)*v+(q-b-c+d)*u*v;
}

// ---------- hình học vành núi ----------
const clA=v=>v<-A?-A:v>A?A:v;
function perim(x,z){   // tọa độ a dọc vành (ngược chiều kim đồng hồ, liên tục, tuần hoàn PER)
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
  for(let q=0;q<4;q++)for(const p of CFG.peaks[q]){
    let d=Math.abs(a-(((SOFF[q]+p[0])%PER+PER)%PER));d=Math.min(d,PER-d)/p[2];s+=p[1]*Math.exp(-d*d);
  }
  return s;
}
const ucAt=(fx,fz)=>lerp(CFG.crestU[0],CFG.crestU[1],fbm(fx/40,fz/40,16));
function field(x,z){   // độ cao (m) của núi tại (x,z) ngoài sân; u = khoảng cách tới sân vuông
  const fx=clA(x),fz=clA(z),u=Math.hypot(x-fx,z-fz),a=perim(x,z);
  let hc=lerp(CFG.crest[0],CFG.crest[1],fbm(fx/34,fz/34,11))+peakSum(a);
  hc=Math.min(CFG.top-1,hc);
  const uc=ucAt(fx,fz),top2=Math.min(CFG.top,hc+1.5+3.5*fbm(fx/26+3.3,fz/26+1.7,20)),t=u/uc;
  let h=t<1?hc*Math.pow(t,1.15):hc+(top2-hc)*sm(cl((u-uc)/9,0,1));
  const ramp=cl(u/4,0,1)*(.35+.65*sm(cl(t,0,1)));
  const gul=1-Math.abs(2*vnp(a,u/22,20)-1);   // khe núi chạy dọc sườn
  h+=((gul-.5)*3+(fbm(x/4,z/4,14)-.5)*2.2)*ramp*CFG.rough;
  return cl(h,0,CFG.top);
}

// ---------- lưới độ cao (số lớp khối) ----------
const IN=-30000,FAR=-29000;                            // IN: ô trong sân · FAR: ô quá độ sâu D (góc cắt tròn)
const HQ=new Int16Array(NG*NG),WET=new Uint8Array(NG*NG);   // chỉ số = kz*NG+kx
let ready=false;const FALLS=[];
const gi=v=>Math.floor((v+A)/CS)+MG,gc=k=>-A+(k-MG+.5)*CS;
const cellOk=(kx,kz)=>kx>=0&&kx<NG&&kz>=0&&kz<NG;
const ly=(x,z)=>{const kx=gi(x),kz=gi(z);if(!cellOk(kx,kz))return null;const w=HQ[kz*NG+kx];return w<=FAR?null:w};
const kxOf=(sx,i)=>sx>0?MG+NC+i:MG-1-i;                 // ô thứ i (từ chân núi ra ngoài) ở tường Đông (sx>0) / Tây
function grid(){
  if(ready)return;ready=true;
  for(let kz=0;kz<NG;kz++)for(let kx=0;kx<NG;kx++){
    const x=gc(kx),z=gc(kz),dx=Math.abs(x)-A,dz=Math.abs(z)-A;let v;
    if(dx<=0&&dz<=0)v=IN;
    else v=Math.hypot(Math.max(dx,0),Math.max(dz,0))>CFG.D?FAR:Math.round(field(x,z)/CS);
    HQ[kz*NG+kx]=v;
  }
  carveFalls();
}
// vai đá + máng suối phía sau mỗi hồ tắm (đọc vị trí từ window.BathPools[].base do bath.js tạo)
function carveFalls(){
  FALLS.length=0;
  const F=CFG.falls,BP=window.BathPools;if(!F.on||!BP)return;
  const JL=Math.round(F.join/CS),ST=(window.BathWater&&BathWater.streams)||[[0,.75],[-2.7,.375],[2.7,.375]];
  for(const p of BP){
    const b=p.base;if(!b)continue;const sx=b.sx;
    // 1) vai đá: nâng mặt núi sát tường quanh hồ lên F.plat (dốc nhẹ vào trong) để suối có chỗ chảy xuống vách đá của hồ
    const kz0=gi(b.z-F.platHalf)-1,kz1=gi(b.z+F.platHalf)+1;
    for(let i=0;i<MG;i++){
      const u=(i+.5)*CS,kx=kxOf(sx,i);
      for(let kz=kz0;kz<=kz1;kz++){
        if(!cellOk(kx,kz))continue;const k=kz*NG+kx;if(HQ[k]<=FAR)continue;
        const e=sm(cl((F.platHalf-Math.abs(gc(kz)-b.z))/2.4,0,1));if(e<=0)continue;
        const hb=Math.round(e*(F.plat+F.platSlope*u)/CS);if(hb>HQ[k])HQ[k]=hb;
      }
    }
    // 2) máng: độ cao không giảm khi đi vào núi -> nước luôn chảy xuống phía sân
    const uc=ucAt(sx*A,clA(b.z)),iSrc=Math.max(4,Math.min(MG-3,Math.floor(uc*F.src/CS)));
    const fall={b,sx,iSrc,st:[]};
    for(const [zl,hw] of ST){
      const zs=b.z+sx*zl;let jmin=1e9,jmax=-1;
      for(let kz=gi(zs-hw)-1;kz<=gi(zs+hw)+1;kz++)if(Math.abs(gc(kz)-zs)<=hw){jmin=Math.min(jmin,kz);jmax=Math.max(jmax,kz)}
      if(jmax<0)jmin=jmax=gi(zs);
      const jc=(jmin+jmax)>>1,c=new Int16Array(iSrc+1);let run=1e9;
      for(let i=iSrc;i>=0;i--){run=Math.min(run,HQ[jc*NG+kxOf(sx,i)]);c[i]=Math.max(run,JL)}
      c[0]=JL;
      for(let i=0;i<=iSrc;i++){
        const kx=kxOf(sx,i);
        for(let j=jmin;j<=jmax;j++){HQ[j*NG+kx]=c[i];WET[j*NG+kx]=1}
        for(const j of[jmin-1,jmax+1]){const k=j*NG+kx;if(HQ[k]>FAR&&HQ[k]<c[i]+1)HQ[k]=c[i]+1}   // bờ máng
      }
      const kh=kxOf(sx,iSrc+1);   // chặn đầu nguồn
      for(let j=jmin-1;j<=jmax+1;j++){const k=j*NG+kh;if(HQ[k]>FAR&&HQ[k]<c[iSrc]+1)HQ[k]=c[iSrc]+1}
      fall.st.push({jmin,jmax,c});
    }
    FALLS.push(fall);
  }
}
const sidePt=(s,c,u)=>s===0?[c,-(A+u)]:s===1?[-c,A+u]:s===2?[-(A+u),-c]:[A+u,c];   // điểm thế giới: tường s, vị trí dọc tường c (kiểu engrave.js), cách chân núi u
const DIR=[[0,-1],[0,1],[-1,0],[1,0]];
const inFall=(x,z)=>{for(const f of FALLS)if(f.sx*x>A&&Math.abs(z-f.b.z)<8)return true;return false};

// vị trí MẶT NÚI (m, từ chân núi ra ngoài) ở độ cao y tại tường s, vị trí dọc tường c: -1 nếu núi không cao tới đó
function faceU(s,c,y){
  grid();const l=Math.max(0,Math.floor(y/CS));
  for(let i=0;i<MG;i++){const p=sidePt(s,c,(i+.5)*CS),w=ly(p[0],p[1]);if(w!==null&&w>l)return i*CS}
  return -1;
}
// engrave.js: bảng tên (tường s: 0 Bắc 1 Nam 2 Tây 3 Đông; u dọc tường, cao v, rộng w, cao h)
// -> {g: độ lùi của bảng so với mặt phẳng tường (m), tilt: góc ngả ra sau (rad)} hoặc null nếu không có núi sau bảng
function fit(s,u,v,w,h){
  if(!CFG.on)return{g:0,tilt:0};
  const yb=v-h/2,yt=v+h/2,N=6,MM=4,zs=[];
  for(let n=0;n<=N;n++)zs.push(u+(-.5+n/N)*w);
  let gb=1e9,gt=1e9;
  for(const z of zs){const a=faceU(s,z,yb),b=faceU(s,z,yt);if(a<0||b<0)return null;gb=Math.min(gb,a);gt=Math.min(gt,b)}
  const tilt=cl(Math.atan((gt-gb)/h),0,1.0),sl=Math.tan(tilt);
  let g0=1e9;
  for(const z of zs)for(let m=0;m<=MM;m++){const y=lerp(yb,yt,m/MM),f=faceU(s,z,y);if(f<0)return null;g0=Math.min(g0,f-sl*(y-yb))}
  return{g:Math.max(0,g0+sl*(v-yb)-.03),tilt};
}
// engrave.js: tia ngắm từ (ox,oy,oz) hướng (dx,dy,dz) trúng mặt núi ở đâu (trong maxT mét) -> {x,y,z,t} hoặc null
function ray(ox,oy,oz,dx,dy,dz,maxT){
  if(!CFG.on)return null;grid();
  const inside=t=>{const w=ly(ox+dx*t,oz+dz*t);return w!==null&&oy+dy*t<w*CS};
  let tp=0;
  for(let t=.2;t<=maxT;t+=.2){
    if(inside(t)){
      let a=tp,b=t;for(let k=0;k<7;k++){const m=(a+b)/2;if(inside(m))b=m;else a=m}
      return{x:ox+dx*b,y:oy+dy*b,z:oz+dz*b,t:b};
    }
    tp=t;
  }
  return null;
}
const surf=(x,z)=>{grid();const w=ly(x,z);return w===null?null:w*CS};

// ---------- màu ----------
function colorOf(y,x,z,kx,kz,flat){
  if(y<0)return DIRT[hash(kx,kz,3)<.5?0:1];             // lớp vỏ dưới sàn
  const n=hash(kx,kz,77),n2=hash(kz,kx,91);
  const snowLine=CFG.snow+(fbm(x/9,z/9,31)-.5)*3;
  if(y>=snowLine)return SNOW[(n*3)|0];
  const mossN=fbm(x/7,z/7,9);
  if(y<2.4+(mossN-.5)*3.2)return n<.12?DIRT[(n2*2)|0]:MOSS[(n*4)|0];
  if(flat&&y<9.5&&mossN>.6&&n<.75)return MOSS[(n*4)|0];
  const band=Math.floor(y/1.2+(fbm(x/12,z/12,5)-.5)*7);
  const pal=(band%7===0)?WARM:ROCK;
  return pal[Math.min(pal.length-1,((band&1?.35:0)+n*.65)*pal.length|0)];
}

// ---------- dựng ----------
const nbh=(kx,kz,own)=>{if(!cellOk(kx,kz))return own;const w=HQ[kz*NG+kx];return w===IN?-APR:(w<=FAR?own:w)};
function buildRing(v){
  for(let kz=0;kz<NG;kz++)for(let kx=0;kx<NG;kx++){
    const k=kz*NG+kx,hq=HQ[k];if(hq<=FAR)continue;
    const n1=nbh(kx-1,kz,hq),n2=nbh(kx+1,kz,hq),n3=nbh(kx,kz-1,hq),n4=nbh(kx,kz+1,hq);
    const foot=n1===-APR||n2===-APR||n3===-APR||n4===-APR;   // ô sát sân: kéo vỏ xuống dưới sàn (bịt đầu lòng sông)
    if(hq<=0&&!foot)continue;
    let lo=Math.min(hq,n1,n2,n3,n4);if(lo>=hq)lo=hq-1;
    const x=gc(kx),z=gc(kz);
    for(let l=lo;l<hq;l++){
      const y=(l+.5)*CS,top=l===hq-1;
      v.cube(x,y,z,CS,CS,CS,(top&&WET[k])?WETC:colorOf(y,x,z,kx,kz,top),kx,l,kz);
    }
  }
}
let PINES=0;const BUILT=[];
function buildPines(v){
  const tiers=[[2,2,1,1,0],[3,3,2,2,1,1,0],[2,2,1,1,0]];
  PINES=0;
  for(let s=0;s<4;s++){
    const placed=[],R=(a,b)=>hash(a,b,555+s),d=DIR[s];let tries=0;
    while(placed.length<CFG.pines&&tries++<CFG.pines*400){
      const u=lerp(CFG.pineU[0],CFG.pineU[1],R(tries,1)),c=-A+3+R(tries,2)*(2*A-6),p=sidePt(s,c,u),x=p[0],z=p[1];
      const kx=gi(x),kz=gi(z);if(!cellOk(kx,kz))continue;
      const hq=HQ[kz*NG+kx];if(hq<=FAR)continue;
      const h=hq*CS;if(h<3||h>13.5)continue;
      const ha=ly(x+d[0]*2*CS,z+d[1]*2*CS),hb=ly(x-d[0]*2*CS,z-d[1]*2*CS);
      if(ha===null||hb===null||Math.abs(ha-hb)>5)continue;                      // chỉ mọc chỗ sườn thoải
      if(fbm(x/11,z/11,15+s)<.3)continue;                                       // thành từng cụm
      if(inFall(x,z))continue;                                                  // không mọc trên vai đá / suối
      if(placed.some(q=>Math.hypot(q[0]-x,q[1]-z)<3.2))continue;
      placed.push([x,z]);PINES++;
      const tp=tiers[(R(tries,3)*3)|0];let l=hq;
      for(let t=0;t<2;t++,l++)v.cube(gc(kx),(l+.5)*CS,gc(kz),CS,CS,CS,BARK[(t+kx+kz)%3],kx,l,kz);   // thân
      for(let m=0;m<tp.length;m++,l++){
        const r=tp[m];
        for(let di=-r;di<=r;di++)for(let dk=-r;dk<=r;dk++){
          if(r>=2&&Math.abs(di)===r&&Math.abs(dk)===r)continue;
          const ci=kx+di,ck=kz+dk;if(!cellOk(ci,ck))continue;
          const w=HQ[ck*NG+ci];if(w<=FAR||l<w)continue;                         // không dựng khối nằm trong núi
          const col=LEAF[Math.min(3,((m/tp.length)*3.2+hash(ci,ck,l)*.6)|0)];
          v.cube(gc(ci),(l+.5)*CS,gc(ck),CS,CS,CS,col,ci,l,ck);
        }
      }
    }
  }
}
// nước chảy trên máng (cùng chất liệu + hạt nước với bath.js; gắn vào đúng nhóm của hồ tắm nên tọa độ cục bộ giống bath.js: +x = hướng ra núi)
function buildFalls(){
  const W=window.BathWater;if(!W||!FALLS.length)return;
  for(const fl of FALLS){
    const b=fl.b,sx=fl.sx,xw=A-sx*b.x,hp=[],hu=[],vp=[],vu=[],em=[],lz=zw=>sx*(zw-b.z);
    for(const s of fl.st){
      const e1=lz(gc(s.jmin)-CS/2),e2=lz(gc(s.jmax)+CS/2),za=Math.min(e1,e2),zb=Math.max(e1,e2),w=zb-za;
      for(let i=fl.iSrc;i>=0;i--){
        const xa=xw+i*CS,xb=xa+CS,y=s.c[i]*CS+.03;
        hp.push(xa,y,za,xb,y,za,xb,y,zb,xa,y,zb);hu.push(xa*.6,za*.6,xb*.6,za*.6,xb*.6,zb*.6,xa*.6,zb*.6);
        const y2=i>0?s.c[i-1]*CS+.03:W.topY;   // i=0: đổ xuống bậc trên cùng của vách đá hồ tắm
        if(y-y2>.02){
          const x=xa-.015;vp.push(x,y2,za,x,y,za,x,y,zb,x,y2,zb);vu.push(0,y2*.35,1,y2*.35,1,y*.35,0,y*.35);
          em.push({k:'drip',x:xa-.06,y0:y2,y1:y,za,zb,rate:w*6+2,acc:0});
          em.push({k:'splash',x:xa-.2,y:y2+.04,za,zb,rate:i===0?w*30+8:w*10+3,up:i===0?1.1:.75,acc:0});
        }
      }
    }
    if(hp.length)W.attach(b.x,b.z,[W.quad(hp,hu,W.flowMat),W.quad(vp,vu,W.fallMat)],em);
  }
}
const S_add=m=>{S.add(m);meshes.push(m)};   // meshes: để đạn để lại vết trên núi
function build(){
  BUILT.length=0;
  if(!CFG.on){
    for(const sx of[-1,1])box(sx*(A+.5),0,0,1,WH0,2*A+3,BL);
    for(const sz of[-1,1])box(0,0,sz*(A+.5),2*A+3,WH0,1,PK);
    return;
  }
  grid();
  const v=new VB();
  buildRing(v);
  if(CFG.pines>0)buildPines(v);
  for(const m of v.meshLOD(CFG.cell)){S_add(m);BUILT.push(m)}
  buildFalls();
}
build();
function info(){
  grid();let mx=0,cnt=0;
  for(let k=0;k<HQ.length;k++){const w=HQ[k];if(w>FAR){cnt++;if(w>mx)mx=w}}
  let tri=0;for(const m of BUILT)if(m.parent)tri+=(m.geometry.index?m.geometry.index.count:0)/3;
  return{cotCaoNhat_m:+(mx*CS).toFixed(1),soCot:cnt,thong:PINES,thacNui:FALLS.length,tamGiac:Math.round(tri),mesh:BUILT.filter(m=>m.parent).length};
}
// tương thích cũ: Hf(si,u,z) = độ cao núi ở tường Tây (si=0) / Đông (si=1), cách chân u, vị trí z
const Hf=(si,u,z)=>surf(si===0?-(A+u):A+u,z)||0;
window.Hills={build,cfg:CFG,fit,ray,surf,Hf,info};
})();
