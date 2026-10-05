// VẠN LÝ TRƯỜNG THÀNH + ĐỊA HÌNH NÚI + SUỐI CỦA TẦNG 2 (theo ảnh minh họa "Vạn Lý Trường Thành - Khu vực rừng thánh tích").
// Không còn tường chạy 4 phía. Thay vào đó:
//  - MỘT bức tường uốn lượn dọc theo SỐNG NÚI từ góc Tây-Bắc xuống Đông-Nam (MAIN) + một nhánh leo lên đỉnh phía Đông-Bắc (SPUR),
//    mặt đi lát đá có lan can, tháp canh (vào được bên trong), cầu thang gạch lên tường ở vài chỗ.
//  - Phía Đông-Bắc của tường = dãy núi đá cao (khối "ngoài tường"); phía Tây-Nam = thung lũng rừng thấp có suối. Núi cao tới ~20m.
//  - SUỐI uốn theo thung lũng (makeLakes): suối chính rộng + 1 nhánh nhỏ đổ vào suối chính. nature.js dùng chúng như "sông" của các tầng khác.
// Bản vẽ thiết kế ở hệ toạ độ nửa cạnh 75 (DA) và tự co giãn theo AF(1).
// Nạp SAU bath.js, TRƯỚC nature.js (xem loader.js). KHÔNG tự dựng khi nạp file: floors.js (FM) gọi GreatWall.build() khi tầng 2 được nạp
// và tự dỡ khi tầng 2 bị dỡ. nature.js đọc GreatWall.terrainGrid() (độ cao nền) và GreatWall.makeLakes() (suối).
// Tháp canh (chòi nghỉ) XOAY theo hướng tường (không còn cố định 4 hướng trục), thân cao hơn để cung thủ đi lọt, và có đuốc ở trụ cửa (xem TORCH + khối ĐUỐC).
// Chỉnh nhanh ở các hằng số / bảng MAIN, SPUR, STREAMS ngay bên dưới.
(function(){
const FLOOR=1;
const DA=75;          // nửa cạnh dùng để vẽ bản thiết kế (m)
const WH=4;           // tường cao hơn mặt đất ở sống núi bao nhiêu (m)
const HWID=4;         // nửa bề rộng thân tường (m): mặt đi rộng 6m + 1 ô lan can mỗi bên (trước đây 3m)
const STW=3;          // nửa bề rộng lối cầu thang lên tường (m): lối lên rộng 6m (trước đây 3.2m)
const PAR=1.1;        // chiều cao lan can (m)
const TW=12,TH=5.2;    // cạnh tháp canh (m), chiều cao thân tháp phía trên mặt sàn tháp (m) (trước đây 3.6 -> thấp quá, cung thủ cao ~3.2m kể cả mũ không lọt)
const DH=4.1;         // chiều cao cửa vòm tính từ sàn tháp (m) (trước đây 2.4). Cung thủ cao ~3.2m (mũ nhọn) nên chừa dư ~.9m
// Đuốc gắn ở 2 trụ cạnh mỗi cửa vòm của tháp (tháp đầu mút chỉ có 1 cửa nên 2 đuốc, tháp thường 4 đuốc). Cung thủ đi bộ tới thắp khi trời tối (xem archer.js).
const TORCH={
  pu:.6,           // cột đuốc cách mặt tháp bao xa (m)
  y0:1.25,y1:2.3,  // chân / đỉnh cột đuốc so với sàn tháp (m)
  reachU:.95,      // cung thủ đứng cách mặt tháp bao xa (m) khi thắp
  reachLat:2.7,    // cung thủ đứng lệch khỏi tim đường đi bao xa (m) về phía ngọn đuốc
  lights:3,        // số đèn thật (PointLight) dùng chung cho các đuốc gần người chơi nhất. 0 = tắt đèn thật (chỉ còn lửa + quầng sáng)
  light:2.2,       // độ sáng đèn thật
  lightR:70,       // chỉ gắn đèn thật cho đuốc cách người chơi không quá ngần này (m)
  draw:130         // đuốc xa hơn ngần này (m) thì không vẽ lửa
};
const SLOPE=.36;      // độ dốc tối đa của mặt đi (m cao / m dài): <= .38 để bước tự động (.55m) lên được ở cả đường chéo
const HK=1;           // hệ số nhân độ cao núi + sống tường (1 = như thiết kế gốc, trần tầng 2 cao 32m). Hạ xuống (vd .8) nếu muốn núi thấp hơn
const HMAX=24*HK;     // độ cao tối đa của núi (m)
const HILL=9;         // độ cao đồi trung bình sát tường giới hạn bản đồ (m). 0 = tắt
const ROLL=9;         // biên độ gợn sóng của đồi đó (m)
const HCAP=21;        // đồi thêm vào không được đẩy mặt đất vượt quá mức này (m) - trần tầng 2 cách sàn 29.6m
const HILLW=28;       // đồi bắt đầu nhô lên từ cách tường bản đồ bao nhiêu m
const LOWAMP=.14;     // biên độ đồi thấp ở thung lũng (so với núi)
const TILE=2;         // 1 ô họa tiết = 2m
const clamp=(x,a,b)=>x<a?a:x>b?b:x,smooth=t=>t*t*(3-2*t),lerp=(a,b,t)=>a+(b-a)*t;

// ---------- BẢN THIẾT KẾ (toạ độ x,z; A=75) ----------
// Tường chính: từ góc Tây-Bắc, theo sống núi xuống Đông-Nam, kết thúc gần mép Đông. Chỉ số tháp = chỉ số điểm điều khiển.
const MAIN=[[-58,-58],[-42,-45],[-24,-38],[-12,-38],[-2,-30],[10,-25],[20,-19],[29,-17],[40,-16],[56,-8],[60,8],[66,24],[67,32]];
const MAIN_TOWERS=[0,2,4,7,9,11];
// Nhánh: rẽ ở điểm 7 của tường chính, leo lên đỉnh phía Đông-Bắc
const SPUR=[[29,-17],[27,-25],[31,-33],[39,-40],[48,-46],[53,-49]];
const SPUR_TOWERS=[2,5];
// Suối: pts = đường đi (kéo dài ra ngoài mép map), hw = nửa bề rộng (m), nb = số cầu.
// Suối chính chảy giữa thung lũng, vòng qua phía Tây của lỗ thang xuống tầng 1; nhánh nhỏ từ phía Đông đổ vào suối chính.
const STREAMS=[
  {pts:[[-84,-26],[-75,-22],[-62,-8],[-50,8],[-44,26],[-34,42],[-18,50],[-2,54],[10,64],[12,84]],hw:5,nb:3},
  {pts:[[82,62],[72,62],[54,58],[36,58],[20,60],[8,63]],hw:3.2,nb:2}
];

// ---------- HÌNH HỌC ĐƯỜNG ĐI ----------
function spline(pts,per){   // Catmull-Rom đi qua mọi điểm điều khiển (điểm i nằm ở chỉ số i*per)
  const out=[],n=pts.length,P=i=>pts[Math.max(0,Math.min(n-1,i))];
  for(let i=0;i<n-1;i++){const p0=P(i-1),p1=P(i),p2=P(i+1),p3=P(i+2);
    for(let k=0;k<per;k++){const t=k/per,t2=t*t,t3=t2*t,c=a=>.5*(2*p1[a]+(-p0[a]+p2[a])*t+(2*p0[a]-5*p1[a]+4*p2[a]-p3[a])*t2+(-p0[a]+3*p1[a]-3*p2[a]+p3[a])*t3);out.push([c(0),c(1)])}}
  out.push(pts[n-1].slice());return out;
}
function arcLen(poly){const c=[0];for(let i=1;i<poly.length;i++)c.push(c[i-1]+Math.hypot(poly[i][0]-poly[i-1][0],poly[i][1]-poly[i-1][1]));return c}
function resample(poly,cum,step){   // chia đều theo chiều dài cung
  const L=cum[cum.length-1],n=Math.max(2,Math.round(L/step)+1),out=[];let j=0;
  for(let k=0;k<n;k++){const s=L*k/(n-1);while(j<cum.length-2&&cum[j+1]<s)j++;const t=(s-cum[j])/((cum[j+1]-cum[j])||1);
    out.push([poly[j][0]+(poly[j+1][0]-poly[j][0])*t,poly[j][1]+(poly[j+1][1]-poly[j][1])*t])}
  return {pts:out,len:L,step:L/(n-1)};
}
// ---------- NHIỄU (giá trị, xác định theo toạ độ) ----------
function hash(i,j,s){let h=(Math.imul(i,374761393)+Math.imul(j,668265263)+Math.imul(s,1274126177))|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return(h>>>0)/4294967296}
function vn(x,z,s){const i=Math.floor(x),j=Math.floor(z),fx=x-i,fz=z-j,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz),a=hash(i,j,s),b=hash(i+1,j,s),c=hash(i,j+1,s),d=hash(i+1,j+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function mountain(x,z){   // 0..1: sống núi gồ ghề (nhiễu "ridged") + đá vụn
  const r1=1-Math.abs(vn(x/42,z/42,1)*2-1),r2=1-Math.abs(vn(x/21+7.3,z/21-3.1,2)*2-1),f3=vn(x/10+1.7,z/10+9.2,3),f4=vn(x/5+5.1,z/5+2.3,4);
  return clamp(.5*Math.pow(r1,1.6)+.28*Math.pow(r2,1.4)+.15*f3+.07*f4,0,1);
}

let ST=null;
// Tính 1 lần cho mỗi kích thước tầng: đường đi, độ cao sống tường, tháp, ô tường, bản đồ độ cao
function prep(){
  const A=AF(FLOOR);if(ST&&ST.A===A)return ST;
  const k=A/DA,sc=p=>[p[0]*k,p[1]*k];
  // ---- các nhánh tường ----
  const mkBranch=(ctl,towers,both)=>{
    const poly=spline(ctl,24),cum=arcLen(poly),rs=resample(poly,cum,1),ctlS=ctl.map((_,i)=>cum[Math.min(i*24,poly.length-1)]);
    const n=rs.pts.length;
    return {pts:rs.pts,len:rs.len,step:rs.step,n,both,ctlS,twI:towers.map(i=>Math.round(ctlS[i]/rs.step)),R:new Float64Array(n),px:Float64Array.from(rs.pts,p=>p[0]),pz:Float64Array.from(rs.pts,p=>p[1])};
  };
  const main=mkBranch(MAIN.map(sc),MAIN_TOWERS,false),spur=mkBranch(SPUR.map(sc),SPUR_TOWERS,true);
  // ---- độ cao sống tường R(s): nền + sóng, san phẳng quanh tháp, giới hạn độ dốc ----
  const limit=(R,fixStart)=>{const n=R.length;
    for(let i=1;i<n;i++)R[i]=clamp(R[i],R[i-1]-SLOPE,R[i-1]+SLOPE);
    for(let i=n-2;i>=(fixStart?1:0);i--)R[i]=clamp(R[i],R[i+1]-SLOPE,R[i+1]+SLOPE);
    for(let i=1;i<n;i++)R[i]=clamp(R[i],R[i-1]-SLOPE,R[i-1]+SLOPE)};
  const plateau=(b)=>{const R=b.R,v0=b.twI.map(i=>R[i]);
    b.twI.forEach((it,q)=>{for(let i=0;i<b.n;i++){const d=Math.abs(i-it)*b.step,w=1-smooth(clamp((d-10)/4,0,1));if(w>0)R[i]=lerp(R[i],v0[q],w)}})};
  {const L=main.len,TP=6.283;
    for(let i=0;i<main.n;i++){const s=i*main.step;main.R[i]=HK*clamp(13-6*(s/L)+3*Math.sin(TP*s/70+1.1)+1.6*Math.sin(TP*s/31+.4)+.8*Math.sin(TP*s/17+2),7,17.5)}
    plateau(main);limit(main.R,false);}
  const jI=main.twI[MAIN_TOWERS.indexOf(7)],Rj=main.R[jI];
  {const L=spur.len,TP=6.283,o=2*Math.sin(.7)+Math.sin(1.5);
    for(let i=0;i<spur.n;i++){const s=i*spur.step;spur.R[i]=clamp(Rj+HK*(5.5*(s/L)+2*Math.sin(TP*s/40+.7)+Math.sin(TP*s/19+1.5)-o),7*HK,18*HK)}
    spur.R[0]=Rj;plateau(spur);spur.R[0]=Rj;limit(spur.R,true);}
  const BR=[main,spur];
  // ---- khoảng cách tới tường: đoạn thẳng gần nhất (có tính nhánh, chỉ số, tham số t, phía) ----
  const near=(x,z)=>{let bd=1e18,bb=0,bi=0,bt=0;
    for(let b=0;b<2;b++){const B=BR[b],px=B.px,pz=B.pz,n=B.n;
      for(let i=0;i<n-1;i++){const ax=px[i],az=pz[i],dx=px[i+1]-ax,dz=pz[i+1]-az;let t=((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz);t=t<0?0:t>1?1:t;
        const ex=ax+dx*t-x,ez=az+dz*t-z,d=ex*ex+ez*ez;if(d<bd){bd=d;bb=b;bi=i;bt=t}}}
    const B=BR[bb],dx=B.px[bi+1]-B.px[bi],dz=B.pz[bi+1]-B.pz[bi],l=Math.hypot(dx,dz)||1,tx=dx/l,tz=dz/l,qx=B.px[bi]+dx*bt,qz=B.pz[bi]+dz*bt;
    const sd=B.both?-1:((x-qx)*-tz+(z-qz)*tx);   // >0: phía thung lũng (Tây-Nam); nhánh SPUR coi như núi cả hai phía
    return {d:Math.sqrt(bd),b:bb,i:bi,t:bt,R:lerp(B.R[bi],B.R[bi+1],bt),sd,tx,tz,qx,qz};
  };
  // ---- suối ----
  const streams=STREAMS.map((def,si)=>{
    const pts=def.pts.map(sc),poly=spline(pts,20),cum=arcLen(poly),rs=resample(poly,cum,1),n=rs.pts.length,ph=si*2.3+.7;
    const x=new Float64Array(n),z=new Float64Array(n),u=new Float64Array(n);
    for(let i=0;i<n;i++){const p=rs.pts[i],q=rs.pts[Math.min(n-1,i+1)],o=rs.pts[Math.max(0,i-1)],tx=q[0]-o[0],tz=q[1]-o[1],l=Math.hypot(tx,tz)||1,s=i*rs.step,
        off=(1.8*Math.sin(s/9+ph)+1.0*Math.sin(s/4.1+ph*2))*(si?.6:1);   // uốn lượn nhỏ
      x[i]=p[0]-tz/l*off;z[i]=p[1]+tx/l*off;u[i]=s}
    const hw=def.hw*(A>=DA?1:1),hwf=s=>hw*(1+.1*Math.sin(s*.2+ph*3));
    return {x,z,u,n,hw,hwf,nb:def.nb,len:rs.len,step:rs.step,ux:(x[n-1]-x[0]),uz:(z[n-1]-z[0])};
  });
  const nearS=(S,px,pz)=>{let bd=1e18,bi=0;const x=S.x,z=S.z,n=S.n;
    for(let i=0;i<n-1;i++){const ax=x[i],az=z[i],dx=x[i+1]-ax,dz=z[i+1]-az;let t=((px-ax)*dx+(pz-az)*dz)/(dx*dx+dz*dz);t=t<0?0:t>1?1:t;
      const ex=ax+dx*t-px,ez=az+dz*t-pz,d=ex*ex+ez*ez;if(d<bd){bd=d;bi=i+(t>.5?1:0)}}
    return {d:Math.sqrt(bd),i:bi};};
  // ---- bản đồ 1m: khoảng cách tới tường / độ cao sống / phía / khoảng cách tới bờ suối ----
  const N1=Math.round(2*A)+1,fDW=new Float32Array(N1*N1),fR=new Float32Array(N1*N1),fSD=new Float32Array(N1*N1),fDS=new Float32Array(N1*N1);
  streams.forEach(S=>{S.rho1=new Float32Array(N1*N1)});
  for(let j=0;j<N1;j++)for(let i=0;i<N1;i++){
    const x=-A+i,z=-A+j,q=near(x,z),o=j*N1+i;fDW[o]=q.d;fR[o]=q.R;fSD[o]=q.sd;
    let ds=1e9;streams.forEach(S=>{const r=nearS(S,x,z),hw=S.hwf(S.u[r.i]);S.rho1[o]=r.d/hw;ds=Math.min(ds,r.d-hw)});fDS[o]=ds;
  }
  const bil=(F,x,z)=>{let u=x+A,v=z+A;const m=N1-1.001;u=u<0?0:u>m?m:u;v=v<0?0:v>m?m:v;const i=u|0,j=v|0,fu=u-i,fv=v-j,a=F[j*N1+i],b=F[j*N1+i+1],c=F[(j+1)*N1+i],d=F[(j+1)*N1+i+1];return a+(b-a)*fu+(c-a)*fv+(a-b-c+d)*fu*fv};
  // ---- bản đồ độ cao (lưới .5m, trùng HS/NH của nature.js) ----
  const HS=.5,NH=Math.round(2*A/HS)+1,H=new Float32Array(NH*NH);
  for(let j=0;j<NH;j++)for(let i=0;i<NH;i++){
    const x=-A+i*HS,z=-A+j*HS,dw=bil(fDW,x,z),rw=bil(fR,x,z),sd=bil(fSD,x,z),ds=bil(fDS,x,z);
    const amp=sd<0?1:lerp(1,LOWAMP,smooth(clamp(dw/45,0,1)));
    let hm=HMAX*amp*mountain(x,z);
    hm=Math.min(hm,rw+.5*Math.max(0,dw-HWID-.5));                       // sống tường là đỉnh cục bộ: núi chỉ dốc lên từ sống với độ dốc <= .5
    hm*=smooth(clamp((ds-2.5)/18,0,1));                           // thung lũng phẳng quanh suối, rộng dần ra
    const h0=lerp(hm,rw,1-smooth(clamp((dw-HWID-1)/13,0,1)));        // gần tường: đúng bằng độ cao sống tường
    // đồi uốn lượn leo dần lên tường giới hạn bản đồ (che chân tường bao, kết hợp rừng thông): càng sát tường càng cao + gợn sóng.
    // Tắt ở gần Vạn Lý Trường Thành (để không chôn tường) và ở bờ suối (để suối chảy ra khỏi bản đồ qua một khe thung lũng).
    const bd=A-Math.max(Math.abs(x),Math.abs(z)),up=smooth(clamp(1-bd/HILLW,0,1)),kb=smooth(clamp((dw-HWID-5)/10,0,1))*smooth(clamp((ds-3)/8,0,1));
    const hb=up*(HILL*Math.pow(up,.6)+(vn(x/16+3.1,z/16-7.7,31)-.5)*ROLL+(vn(x/7-2.3,z/7+4.9,32)-.5)*ROLL*.35);
    H[j*NH+i]=Math.max(0,Math.min(h0+hb*kb,Math.max(h0,HCAP)));   // không để đồi + núi cộng dồn chạm trần tầng
  }
  const G=(x,z)=>{let u=(x+A)/HS,v=(z+A)/HS;const m=NH-1.001;u=u<0?0:u>m?m:u;v=v<0?0:v>m?m:v;const i=u|0,j=v|0,fu=u-i,fv=v-j,a=H[j*NH+i],b=H[j*NH+i+1],c=H[(j+1)*NH+i],d=H[(j+1)*NH+i+1];return a+(b-a)*fu+(c-a)*fv+(a-b-c+d)*fu*fv};
  // ---- tháp: XOAY theo hướng tường (trục u = tiếp tuyến đường đi lấy theo dây cung +-6m, trục v = pháp tuyến về phía thung lũng) ----
  // Trước đây tháp chỉ có 4 hướng song song trục x/z nên ở đoạn tường chéo cửa tháp bị lệch khỏi mặt đi. Giờ tx,tz,nx,nz là hệ trục riêng của từng tháp.
  const towers=[];
  BR.forEach((B,b)=>B.twI.forEach((it,q)=>{
    const p=B.pts[it],a=B.pts[Math.max(0,it-6)],c=B.pts[Math.min(B.n-1,it+6)];
    let tx=c[0]-a[0],tz=c[1]-a[1];const l=Math.hypot(tx,tz)||1;tx/=l;tz/=l;
    const nx=-tz,nz=tx;
    const horiz=Math.abs(tx)>Math.abs(tz),cand=horiz?[0,2]:[1,3],VD=[[0,1],[-1,0],[0,-1],[1,0]];   // (giữ lại f / ax cho các file khác nếu có dùng)
    const f=cand.reduce((u,v)=>(VD[u][0]*nx+VD[u][1]*nz)>=(VD[v][0]*nx+VD[v][1]*nz)?u:v);
    const last=(q===B.twI.length-1&&b===1)||(q===0&&b===0);   // đầu mút của đường: chỉ 1 cửa
    towers.push({b,i:it,s:it*B.step,cx:p[0],cz:p[1],tx,tz,nx,nz,ang:Math.atan2(tz,tx),f,Ht:B.R[it]+WH,end:last,ax:horiz,junc:b===0&&MAIN_TOWERS[q]===7});
  }));
  ST={A,k,BR,near,streams,nearS,N1,bil,fDW,fDS,H,HS,NH,G,towers,main,spur,Rj};
  return ST;
}
// nature.js gọi: bản đồ độ cao thô (lưới .5m, NH*NH, đã tính sẵn; nature.js nhân thêm mặt nạ phẳng quanh thang / cầu / suối)
function terrainGrid(){return prep().H}
// nature.js gọi: tạo các đối tượng "sông" (suối) có cùng giao diện với mkRiver() của nature.js
function makeLakes(o){
  const P=prep(),A=P.A,N1=P.N1;
  return P.streams.map(S=>{
    const R=S.rho1;
    const rho=(x,z)=>{let u=x+A,v=z+A;if(u<0||v<0||u>=N1-1||v>=N1-1)return 9;const i=u|0,j=v|0,fu=u-i,fv=v-j,a=R[j*N1+i],b=R[j*N1+i+1],c=R[(j+1)*N1+i],d=R[(j+1)*N1+i+1];return a+(b-a)*fu+(c-a)*fv+(a-b-c+d)*fu*fv};
    const loc=(x,z)=>{const r=P.nearS(S,x,z),i=Math.min(S.n-1,r.i);return [S.u[i],r.d*((x-S.x[i])*(S.z[Math.min(S.n-1,i+1)]-S.z[Math.max(0,i-1)])-(z-S.z[i])*(S.x[Math.min(S.n-1,i+1)]-S.x[Math.max(0,i-1)])>=0?1:-1)]};
    const at=(a,p)=>{const side=a<Math.PI?1:-1,t=(a%Math.PI)/Math.PI,i=Math.min(S.n-2,Math.floor(t*(S.n-1))),tx=S.x[i+1]-S.x[i],tz=S.z[i+1]-S.z[i],l=Math.hypot(tx,tz)||1,w=S.hwf(S.u[i])*p*side;
      return [S.x[i]-tz/l*w,S.z[i]+tx/l*w]};
    const L=Math.hypot(S.ux,S.uz)||1;
    return {cx:S.x[0],cz:S.z[0],ux:S.ux/L,uz:S.uz/L,rx:S.len/2,rz:S.hw,y:o.y,f:o.f,dmax:o.dmax,ice:false,T:o.T,loc,at,rho,nb:S.nb};
  });
}

// ---------- HỌA TIẾT (vẽ bằng canvas 64px, lặp theo tọa độ thế giới nên các khối ghép liền mạch) ----------
const rng=s=>()=>(s=(s*1664525+1013904223)>>>0)/4294967296;
const DRAW={
  brick:(x,n)=>{const r=rng(7),P=['#8d877b','#9a9486','#807b70','#a39d8d','#8a8478'],C=[];
    for(let j=0;j<4;j++)C.push([P[(r()*5)|0],P[(r()*5)|0]]);
    x.fillStyle='#5f5a51';x.fillRect(0,0,n,n);
    for(let j=0;j<4;j++)for(let i=-1;i<3;i++){x.fillStyle=C[j][((i%2)+2)%2];x.fillRect(i*32+(j&1)*16+1,j*16+1,30,14)}},
  pave:(x,n)=>{const r=rng(3),P=['#9d9a92','#8f8c85','#a7a49b','#96938b'];
    x.fillStyle='#6a675f';x.fillRect(0,0,n,n);
    for(let j=0;j<4;j++)for(let i=0;i<4;i++){x.fillStyle=P[(r()*4)|0];x.fillRect(i*16+1,j*16+1,14,14)}},
  roof:(x,n)=>{x.fillStyle='#26262e';x.fillRect(0,0,n,n);
    for(let j=0;j<8;j++){for(let i=0;i<8;i++){x.fillStyle=(i+j)&1?'#30303a':'#22222a';x.fillRect(i*8,j*8,7,7)}x.fillStyle='#14141a';x.fillRect(0,j*8+7,n,1)}},
  wood:(x,n)=>{x.fillStyle='#6b2d1c';x.fillRect(0,0,n,n);x.fillStyle='#55231a';for(let i=0;i<8;i++)x.fillRect(i*8+3,0,1,n)},
  dark:(x,n)=>{x.fillStyle='#15151c';x.fillRect(0,0,n,n)},
  trim:(x,n)=>{const r=rng(5);x.fillStyle='#b7b2a4';x.fillRect(0,0,n,n);
    for(let i=0;i<24;i++){x.fillStyle=r()<.5?'#a9a496':'#c4bfb1';x.fillRect((r()*60)|0,(r()*60)|0,4,4)}}
};
const KIND=Object.keys(DRAW);
let MAT=null;
function mats(){
  if(MAT)return MAT;MAT={};
  for(const k of KIND){
    const c=document.createElement('canvas');c.width=c.height=64;DRAW[k](c.getContext('2d'),64);
    const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.NearestFilter;t.anisotropy=4;
    MAT[k]=new THREE.MeshLambertMaterial({map:t,emissive:0x1a1a1a});
  }
  return MAT;
}
// ---------- GOM MẶT: mỗi loại họa tiết = 1 mesh duy nhất (rất ít draw call) ----------
let Q=null;
const CELLQ=24;   // chia mesh tường theo ô 24m: mỗi mảnh có hình cầu bao riêng -> three.js bỏ vẽ mảnh ngoài tầm nhìn, tia bắn không phải duyệt cả bức tường
const newQ=()=>{Q=new Map()};
const qOf=(kind,a)=>{const key=kind+'|'+Math.floor(a[0]/CELLQ)+'|'+Math.floor(a[2]/CELLQ);let q=Q.get(key);if(!q){q={kind,p:[],n:[],u:[],i:[],k:0};Q.set(key,q)}return q};
function quad(kind,a,b,c,d,n,uv){
  const q=qOf(kind,a),base=q.k;
  for(const p of[a,b,c,d]){q.p.push(p[0],p[1],p[2]);q.n.push(n[0],n[1],n[2]);const t=uv(p);q.u.push(t[0]/TILE,t[1]/TILE)}
  q.i.push(base,base+1,base+2,base,base+2,base+3);q.k+=4;
}
const ux=p=>[p[2],p[1]],uz=p=>[p[0],p[1]],uy=p=>[p[0],p[2]];
// sk = họa tiết mặt bên, tk = họa tiết mặt trên, bot = có vẽ mặt dưới không (chỉ cần cho trần mái)
function addBox(sk,tk,x0,x1,y0,y1,z0,z1,bot){
  quad(sk,[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[1,0,0],ux);
  quad(sk,[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[-1,0,0],ux);
  quad(tk,[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],[0,1,0],uy);
  if(bot)quad(sk,[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[0,-1,0],uy);
  quad(sk,[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[0,0,1],uz);
  quad(sk,[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[0,0,-1],uz);
}
const RF=[(u,v)=>[u,v],(u,v)=>[-v,u],(u,v)=>[-u,-v],(u,v)=>[v,-u]];   // 4 hướng trục của tháp: u = dọc đường đi, v = hướng vào thung lũng

// ---------- RỪNG THÔNG CAO che tường giới hạn bản đồ ----------
// Cây thông voxel (thân + 7 tầng tán thu nhỏ dần, mỗi tầng chỉ vài khối lớn nên rất nhẹ ~600 đỉnh/cây). Vẽ bằng InstancedMesh, chia theo 4 cạnh bản đồ
// (mỗi cạnh có hình cầu bao riêng nên cạnh nào khuất sau lưng là không vẽ). Có va chạm ở thân cây; đạn bay xuyên tán.
const PINE={
  max:520,        // số cây tối đa (giảm nếu máy yếu)
  step:3,         // bước lưới lấy mẫu (m): nhỏ hơn = dày hơn
  band:[3.5,26],  // dải đặt cây: cách tường bản đồ từ ... đến ... m
  dense:[.9,.55,.2],   // xác suất có cây ở: sát tường (< 9m) / giữa (< 17m) / xa hơn
  sy:[.95,1.75],  // hệ số cao ở sát tường (cây gốc cao ~14m -> tới ~24m), giảm dần khi vào trong
  sx:[.9,1.5]     // hệ số rộng
};
function pineGeo(c1,c2){
  const v=new VB(),TR=tri(0x6b4a2e,0x5b3f27,0x7a5636),G=tri(c1,c2,c1);
  v.box(0,3.1,0,1.1,6.2,1.1,TR,1.1);
  for(let k=0;k<7;k++){const w=6.4-k*.9;v.box(0,2.3+k*1.75+.65,0,w,1.3,w,G,w>3.5?w/2:w)}   // 3 tầng đáy = 2x2 khối, các tầng trên = 1 khối
  v.box(0,14.7,0,.8,1.2,.8,c1,1.2);
  return v.mesh().geometry;
}
function buildPines(P,cells,keyOf,Y0,B_){
  const A=P.A,R=rng(4242),HWd=HWID,exs=[];
  {const A1=AS(1),cx1=A1-2,A0=AS(0);   // chừa chỗ cho 2 đầu thang (thang lên tầng 3 ở phía Đông, lỗ thang từ tầng 1 lên ở phía Tây)
    // Thang lên tầng 3 nằm SÁT tường Đông: chừa trống LỐI VÀO (góc Đông-Nam, nơi có cổng đỏ) + phần sau tường thang (x > tường trong), còn dải trước tường thang để thông che tường cho đẹp
    exs.push([cx1-24,A1+2,A1-4-2.5,A1+2]);exs.push([cx1+1.6,A1+2,A1-4-STLf(1)-8,A1+2]);
    exs.push([-A0-3,-A0+10,A0-4-STLf(0)-8,A0+2])}
  const A1s=AS(1),inSW=(x,z)=>x>A1s-13&&x<A1s-4.5&&z>A1s-4-STLf(1)-2&&z<A1s-7;   // dải thông trước tường thang tầng 3: cao nhất để che tường
  const inEx=(x,z)=>exs.some(e=>x>e[0]&&x<e[1]&&z>e[2]&&z<e[3]);
  const hasCell=(x,z)=>{for(const dx of[-2.5,0,2.5])for(const dz of[-2.5,0,2.5])if(cells.has(keyOf(x+dx,z+dz)))return true;return false};
  const cand=[],W=PINE.band[1];
  for(let gx=-A+1;gx<=A-1;gx+=PINE.step)for(let gz=-A+1;gz<=A-1;gz+=PINE.step){
    const x=gx+(R()-.5)*PINE.step*.9,z=gz+(R()-.5)*PINE.step*.9,r1=R(),r2=R(),r3=R(),r4=R(),r5=R();
    const bd=A-Math.max(Math.abs(x),Math.abs(z));
    if(bd<PINE.band[0]||bd>W)continue;
    if(P.bil(P.fDS,x,z)<4.5||P.bil(P.fDW,x,z)<HWd+6)continue;   // không sát suối / không đè lên Vạn Lý Trường Thành
    if(r1>(inSW(x,z)?1:bd<9?PINE.dense[0]:bd<17?PINE.dense[1]:PINE.dense[2]))continue;
    if(inEx(x,z)||hasCell(x,z))continue;
    const k=inSW(x,z)?1:1-(bd-PINE.band[0])/(W-PINE.band[0]),gy=P.G(x,z);   // k: 1 sát tường -> 0 ở rìa trong: cây sát tường cao nhất
    const sy=Math.min((inSW(x,z)?PINE.sy[1]:PINE.sy[0]+r4*(PINE.sy[1]-PINE.sy[0]))*(.55+.45*k),(27.5-gy)/15);   // ngọn cây không chọc thủng trần tầng
    if(sy<.35)continue;
    cand.push([x,z,gy,r2*6.283,PINE.sx[0]+r3*(PINE.sx[1]-PINE.sx[0]),sy,r5]);
  }
  cand.sort((a,b)=>a[6]-b[6]);cand.length=Math.min(cand.length,PINE.max);
  const d=new THREE.Object3D(),side=p=>Math.abs(p[0])>Math.abs(p[1])?(p[0]>0?0:1):(p[1]>0?2:3),
    pal=[[0x2f6b3a,0x275a31],[0x3d8048,0x32703c]],gs=[pal.map(q=>pineGeo(q[0],q[1])),null];
  for(let sd=0;sd<4;sd++)for(let k=0;k<2;k++){
    const L=cand.filter((p,i)=>side(p)===sd&&(i&1)===k);if(!L.length)continue;
    const geo=gs[0][k].clone(),m=new THREE.InstancedMesh(geo,VMAT,L.length);
    let cx=0,cz=0,cy=0;for(const p of L){cx+=p[0];cz+=p[1];cy+=p[2]}cx/=L.length;cz/=L.length;cy=Y0+cy/L.length+10;
    let r=0;L.forEach((p,i)=>{r=Math.max(r,Math.hypot(p[0]-cx,p[2]+Y0-cy+10,p[1]-cz));
      d.position.set(p[0],Y0+p[2]-.4,p[1]);d.rotation.set(0,p[3],0);d.scale.set(p[4],p[5],p[4]);d.updateMatrix();m.setMatrixAt(i,d.matrix)});
    geo.boundingSphere=new THREE.Sphere(new THREE.Vector3(cx,cy,cz),r+30);   // bao cả cây cao nhất -> three.js tự bỏ vẽ cạnh nào nằm ngoài tầm nhìn
    m.instanceMatrix.needsUpdate=true;S.add(m);   // không đưa vào meshes: đạn bay xuyên tán cây
  }
  for(const p of cand)B_(p[0]-.6,p[0]+.6,p[2]-.5,p[2]+7,p[1]-.6,p[1]+.6);   // va chạm thân cây (người / quái không đi xuyên thân)
  return cand.length;
}

// ---------- ĐUỐC ----------
// Mỗi đuốc: {x,y,z (tâm lửa), b/s/lat (chỗ cung thủ đứng để thắp: nhánh, mét dọc đường, lệch ngang), lit, claim (cung thủ đang đi thắp), ign (0..1 lửa bùng lên)}.
// archer.js đọc GreatWall.torches, gọi GreatWall.lightTorch(t) khi cung thủ thắp xong; GreatWall.torchTick(dt) do archer.js gọi mỗi khung hình khi người chơi ở tầng 2.
// Trời sáng (DayCycle.cur.lamp < .12) thì đuốc tự tắt; tối lại cung thủ thắp lại.
let TORCHES=[],LIGHTS=[],TT=0,FXT=null;
const lampK=()=>{const dc=window.DayCycle;return dc&&dc.cur&&typeof dc.cur.lamp==='number'?dc.cur.lamp:0};
function fxT(){
  if(FXT)return FXT;
  const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);
  r.addColorStop(0,'rgba(255,235,170,1)');r.addColorStop(.3,'rgba(255,150,50,.55)');r.addColorStop(1,'rgba(255,100,20,0)');g.fillStyle=r;g.fillRect(0,0,64,64);
  FXT={outer:new THREE.BoxGeometry(.34,.5,.34),inner:new THREE.BoxGeometry(.2,.36,.2),tip:new THREE.BoxGeometry(.12,.2,.12),
    mo:new THREE.MeshBasicMaterial({color:0xff7a1c}),mi:new THREE.MeshBasicMaterial({color:0xffd24d}),mt:new THREE.MeshBasicMaterial({color:0xfff2b8}),
    halo:new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,color:0xffa050,opacity:.85})};
  return FXT;
}
function mkTorch(x,y,z,o){
  const F=fxT(),g=new THREE.Group(),a=new THREE.Mesh(F.outer,F.mo),b=new THREE.Mesh(F.inner,F.mi),c=new THREE.Mesh(F.tip,F.mt);
  b.position.y=-.02;c.position.y=.3;g.add(a,b,c);g.position.set(x,y,z);g.visible=false;S.add(g);   // không đưa vào meshes: đạn bay xuyên lửa
  const h=new THREE.Sprite(F.halo);h.position.set(x,y+.1,z);h.scale.set(3,3,1);h.visible=false;S.add(h);
  return Object.assign({x,y,z,lit:false,claim:null,ign:0,ph:Math.random()*6.283,g,halo:h,f:1,d2:0},o);
}
function lightTorch(t){if(t.lit)return;t.lit=true;t.ign=0;t.claim=null}
function torchTick(dt){
  if(!TORCHES.length)return;
  TT+=dt;
  const pl=typeof P!=='undefined'?P:null,k=lampK(),dark=clamp((k-.15)/.5,0,1),day=k<.12,near=[];
  for(const t of TORCHES){
    if(!t.lit)continue;
    if(day){t.lit=false;t.claim=null;t.g.visible=t.halo.visible=false;continue}   // hết đêm: tắt
    t.ign=Math.min(1,t.ign+dt*2);
    const dx=pl?pl.x-t.x:0,dz=pl?pl.z-t.z:0,dy=pl?pl.y-t.y:0;t.d2=dx*dx+dz*dz+dy*dy*.25;
    if(t.d2>TORCH.draw*TORCH.draw){t.g.visible=t.halo.visible=false;continue}
    const f=1+.16*Math.sin(TT*14+t.ph)+.1*Math.sin(TT*23+t.ph*2.1),w=t.ign*(1+.07*Math.sin(TT*9+t.ph*1.7));
    t.f=f;t.g.visible=t.halo.visible=true;t.g.scale.set(w,t.ign*f,w);t.g.rotation.y=Math.sin(TT*3+t.ph)*.3;
    const hs=(2.7+(1-t.ign)*2.2)*(.92+.08*f)*(.4+.6*t.ign);t.halo.scale.set(hs,hs,1);
    near.push(t);
  }
  if(!LIGHTS.length)return;
  near.sort((p,q)=>p.d2-q.d2);
  const top=near.slice(0,LIGHTS.length).filter(t=>t.d2<TORCH.lightR*TORCH.lightR);
  for(const L of LIGHTS)if(L.tt&&top.indexOf(L.tt)<0)L.tt=null;               // đèn nào đang gắn đuốc không còn trong nhóm gần nhất thì nhả ra
  for(const t of top)if(!LIGHTS.some(L=>L.tt===t)){const L=LIGHTS.find(q=>!q.tt);if(L){L.tt=t;L.position.set(t.x,t.y+.5,t.z);L.intensity=0}}
  for(const L of LIGHTS){const t=L.tt,want=t?TORCH.light*dark*t.ign*(.88+.12*t.f):0;L.intensity+=(want-L.intensity)*Math.min(1,dt*(t?6:12))}
}
function torchIdle(){for(const L of LIGHTS){L.intensity=0;L.tt=null}}   // rời tầng 2: tắt đèn thật
function torchReset(){for(const t of TORCHES){t.lit=false;t.claim=null;t.g.visible=t.halo.visible=false}torchIdle()}

// ---------- DỰNG ----------
function build(){
  const P=prep(),Y0=FY(FLOOR),A=P.A;
  newQ();
  const cells=new Map(),key=(i,j)=>i*4096+j,keyOf=(x,z)=>key(Math.floor(x),Math.floor(z));
  const B_=(x0,x1,y0,y1,z0,z1)=>boxes.push({x0,x1,y0:Y0+y0,y1:Y0+y1,z0,z1,gw:true});   // gw: nature.js không "ép phẳng" địa hình quanh các khối này
  TORCHES=[];LIGHTS=[];
  // toạ độ cục bộ của tháp (u dọc đường đi, v về phía thung lũng, 0..TW, gốc ở góc) -> toạ độ thế giới
  const toW=(t,u,v)=>[t.cx+(u-TW/2)*t.tx+(v-TW/2)*t.nx,t.cz+(u-TW/2)*t.tz+(v-TW/2)*t.nz];
  // --- 1) tháp canh: chiếm ô lưới trước để ô tường né ra. Tháp xoay tuỳ ý nên chiếm các ô 1m có TÂM nằm trong hình vuông đã xoay ---
  const towerCells=[];
  for(const t of P.towers){
    const R=TW*.7072+1;
    for(let i=Math.floor(t.cx-R);i<=Math.ceil(t.cx+R);i++)for(let j=Math.floor(t.cz-R);j<=Math.ceil(t.cz+R);j++){
      const x=i+.5,z=j+.5,dx=x-t.cx,dz=z-t.cz,lu=dx*t.tx+dz*t.tz,lv=dx*t.nx+dz*t.nz;
      if(Math.abs(lu)>TW/2||Math.abs(lv)>TW/2||cells.has(key(i,j)))continue;
      const c={ci:i,cj:j,x,z,d:0,top:t.Ht,tower:true,sd:0,par:false,stair:false};
      cells.set(key(i,j),c);towerCells.push(c);
    }
  }
  // --- 2) ô tường: tâm cách đường đi <= HWID ---
  const bb=[1e9,-1e9,1e9,-1e9];
  for(const B of P.BR)for(let i=0;i<B.n;i++){bb[0]=Math.min(bb[0],B.px[i]);bb[1]=Math.max(bb[1],B.px[i]);bb[2]=Math.min(bb[2],B.pz[i]);bb[3]=Math.max(bb[3],B.pz[i])}
  const wall=[];
  const PD=Math.ceil(HWID)+2;
  for(let ci=Math.floor(bb[0])-PD;ci<=Math.ceil(bb[1])+PD;ci++)for(let cj=Math.floor(bb[2])-PD;cj<=Math.ceil(bb[3])+PD;cj++){
    const x=ci+.5,z=cj+.5;if(cells.has(key(ci,cj)))continue;
    const q=P.near(x,z);if(q.d>HWID)continue;
    const c={ci,cj,x,z,d:q.d,top:q.R+WH,sd:q.sd,b:q.b,i:q.i,par:false,stair:false};
    cells.set(key(ci,cj),c);wall.push(c);
  }
  // --- 3) cầu thang gạch bên hông tường (phía thung lũng): bậc .5m, rộng 3m, hạ dần tới khi bằng mặt đất ---
  const SITES=[[0,.27],[0,.5],[0,.78],[1,.55]],noPar=new Set(),stairs=[];
  for(const [b,fr] of SITES){
    const B=P.BR[b];let i=Math.round(B.n*fr);
    for(let tries=0;tries<12;tries++){   // lùi xa tháp (>= 10m)
      const p=B.pts[i];if(!P.towers.some(t=>Math.hypot(t.cx-p[0],t.cz-p[1])<TW/2+8))break;i+=3;if(i>=B.n-6)i=Math.round(B.n*fr)-3*tries}
    const p=B.pts[i],a=B.pts[i-1],c=B.pts[i+1],l=Math.hypot(c[0]-a[0],c[1]-a[1])||1,tx=(c[0]-a[0])/l,tz=(c[1]-a[1])/l,nx=-tz,nz=tx,T=B.R[i]+WH,SD=.8;
    let N=1;for(;N<30;N++){const g=P.G(p[0]+nx*(HWID+SD*(N-.5)),p[1]+nz*(HWID+SD*(N-.5)));if(T-.5*N<=g+.45)break}
    const R=HWID+SD*N+2;
    for(let ci=Math.floor(p[0]-R);ci<=Math.ceil(p[0]+R);ci++)for(let cj=Math.floor(p[1]-R);cj<=Math.ceil(p[1]+R);cj++){
      const x=ci+.5,z=cj+.5,dx=x-p[0],dz=z-p[1],al=dx*tx+dz*tz,pe=dx*nx+dz*nz;
      if(Math.abs(al)>STW)continue;
      const e=cells.get(key(ci,cj));
      if(e){if(!e.tower&&!e.stair&&pe>0&&e.d>1.2){noPar.add(key(ci,cj))}continue}   // lối vào tường: bỏ lan can phía thung lũng
      if(pe<=HWID)continue;
      const j=Math.min(N,Math.ceil((pe-HWID)/SD));
      const c2={ci,cj,x,z,d:99,top:T-.5*j,sd:1,par:false,stair:true};cells.set(key(ci,cj),c2);wall.push(c2);
    }
    stairs.push({b,i,N});
  }
  for(const c of wall)if(!c.stair&&c.d>HWID-1&&!noPar.has(key(c.ci,c.cj)))c.par=true;
  for(const c of towerCells)wall.push(c);   // móng tháp: vẽ như ô tường, va chạm gộp theo hàng bên dưới
  // --- 4) xuất hình + va chạm cho từng ô ---
  const nb4=[[1,0],[-1,0],[0,1],[0,-1]];
  for(const c of wall){
    const x0=c.ci,x1=c.ci+1,z0=c.cj,z1=c.cj+1,top=c.top;
    if(!c.tower)B_(x0,x1,0,top,z0,z1);
    const yb=nb4.map(([di,dj])=>{const n=cells.get(key(c.ci+di,c.cj+dj));
      if(n)return n.top>=top-.001?null:n.top;   // hàng xóm thấp hơn: chỉ vẽ phần cao hơn
      return Math.max(0,P.G(c.x+di,c.z+dj)-.7)}); // không có hàng xóm: vẽ xuống tới mặt đất
    const T=Y0+top;
    if(yb[0]!==null)quad('brick',[x1,Y0+yb[0],z1],[x1,Y0+yb[0],z0],[x1,T,z0],[x1,T,z1],[1,0,0],ux);
    if(yb[1]!==null)quad('brick',[x0,Y0+yb[1],z0],[x0,Y0+yb[1],z1],[x0,T,z1],[x0,T,z0],[-1,0,0],ux);
    if(yb[2]!==null)quad('brick',[x0,Y0+yb[2],z1],[x1,Y0+yb[2],z1],[x1,T,z1],[x0,T,z1],[0,0,1],uz);
    if(yb[3]!==null)quad('brick',[x1,Y0+yb[3],z0],[x0,Y0+yb[3],z0],[x0,T,z0],[x1,T,z0],[0,0,-1],uz);
    if(c.par){
      B_(x0,x1,top,top+PAR,z0,z1);
      addBox('brick','trim',x0,x1,T,T+PAR,z0,z1,false);
      if(((c.ci+c.cj)&1)===0&&(c.sd<=0))addBox('brick','trim',x0+.05,x1-.05,T+PAR,T+PAR+.55,z0+.05,z1-.05,false);   // lỗ châu mai phía ngoài
    }else quad(c.stair?'brick':'pave',[x0,T,z1],[x1,T,z1],[x1,T,z0],[x0,T,z0],[0,1,0],uy);
  }
  // --- 5) tháp canh (xoay theo tường): sàn lát đá, thân gạch, cửa vòm hai đầu (hướng ra tường), cửa sổ, mái ngói 4 tầng thu nhỏ, đuốc ở trụ cửa ---
  // va chạm gộp theo hàng cho móng tháp (các ô tâm nằm trong hình vuông đã xoay)
  {towerCells.sort((p,q)=>p.cj-q.cj||p.ci-q.ci);let run=null;
    for(const c of towerCells){
      if(run&&run.cj===c.cj&&run.x1===c.ci&&run.top===c.top)run.x1=c.ci+1;
      else{if(run)B_(run.x0,run.x1,0,run.top,run.cj,run.cj+1);run={x0:c.ci,x1:c.ci+1,cj:c.cj,top:c.top}}
    }
    if(run)B_(run.x0,run.x1,0,run.top,run.cj,run.cj+1);}
  // hộp quay theo tháp: 4 mặt bên + mặt trên (+ mặt dưới). Họa tiết lấy theo toạ độ cục bộ của tháp nên gạch luôn thẳng hàng với thân tháp
  function quadN(kind,pts,n,uv){   // tự đảo thứ tự đỉnh cho đúng chiều mặt (back-face culling)
    let [a,b,c,d]=pts;
    const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const cx=e1[1]*e2[2]-e1[2]*e2[1],cy=e1[2]*e2[0]-e1[0]*e2[2],cz=e1[0]*e2[1]-e1[1]*e2[0];
    if(cx*n[0]+cy*n[1]+cz*n[2]<0)[b,d]=[d,b];
    quad(kind,a,b,c,d,n,uv);
  }
  function addBoxR(t,sk,tk,u0,u1,y0,y1,v0,v1,bot){
    const W=(u,v,y)=>{const a=toW(t,u,v);return [a[0],y,a[1]]};
    const lu=p=>(p[0]-t.cx)*t.tx+(p[2]-t.cz)*t.tz+TW/2,lv=p=>(p[0]-t.cx)*t.nx+(p[2]-t.cz)*t.nz+TW/2;
    const uU=p=>[lv(p),p[1]],uV=p=>[lu(p),p[1]],uT=p=>[lu(p),lv(p)];
    quadN(sk,[W(u1,v0,y0),W(u1,v1,y0),W(u1,v1,y1),W(u1,v0,y1)],[t.tx,0,t.tz],uU);
    quadN(sk,[W(u0,v0,y0),W(u0,v1,y0),W(u0,v1,y1),W(u0,v0,y1)],[-t.tx,0,-t.tz],uU);
    quadN(sk,[W(u0,v1,y0),W(u1,v1,y0),W(u1,v1,y1),W(u0,v1,y1)],[t.nx,0,t.nz],uV);
    quadN(sk,[W(u0,v0,y0),W(u1,v0,y0),W(u1,v0,y1),W(u0,v0,y1)],[-t.nx,0,-t.nz],uV);
    quadN(tk,[W(u0,v0,y1),W(u1,v0,y1),W(u1,v1,y1),W(u0,v1,y1)],[0,1,0],uT);
    if(bot)quadN(sk,[W(u0,v0,y0),W(u1,v0,y0),W(u1,v1,y0),W(u0,v1,y0)],[0,-1,0],uT);
  }
  // va chạm cho 1 khối cục bộ của tháp (các hộp AABB của thế giới xấp xỉ khối đã xoay)
  function colR(t,u0,u1,v0,v1,y0,y1){
    if(Math.abs(t.tx*t.tz)<.002){const a=toW(t,u0,v0),b=toW(t,u1,v1);B_(Math.min(a[0],b[0]),Math.max(a[0],b[0]),y0,y1,Math.min(a[1],b[1]),Math.max(a[1],b[1]));return}   // tháp thẳng trục: 1 hộp
    const L=u1-u0,Wd=v1-v0;
    if(Math.min(L,Wd)<=1.6){   // khối mỏng (tường, trụ, lanh tô): rải hộp 1m dọc theo cạnh dài, bước .5m (không để lọt khe)
      const along=L>=Wd,n=Math.max(1,Math.ceil((along?L:Wd)/.5)),m=Math.max(1,Math.ceil((along?Wd:L)/.9));
      for(let i=0;i<n;i++)for(let j=0;j<m;j++){
        const a=u0+(along?(i+.5)*L/n:(j+.5)*L/m),c=v0+(along?(j+.5)*Wd/m:(i+.5)*Wd/n),w=toW(t,a,c);
        B_(w[0]-.5,w[0]+.5,y0,y1,w[1]-.5,w[1]+.5);
      }
      return;
    }
    // khối lớn (mái): các ô 1m có tâm trong hình đã xoay, gộp theo hàng
    const cs=[],cr=[toW(t,u0,v0),toW(t,u1,v0),toW(t,u0,v1),toW(t,u1,v1)],xs=cr.map(p=>p[0]),zs=cr.map(p=>p[1]);
    for(let i=Math.floor(Math.min(...xs));i<=Math.ceil(Math.max(...xs));i++)for(let j=Math.floor(Math.min(...zs));j<=Math.ceil(Math.max(...zs));j++){
      const dx=i+.5-t.cx,dz=j+.5-t.cz,lu=dx*t.tx+dz*t.tz+TW/2,lv=dx*t.nx+dz*t.nz+TW/2;
      if(lu>=u0-.25&&lu<=u1+.25&&lv>=v0-.25&&lv<=v1+.25)cs.push([i,j])}
    cs.sort((p,q)=>p[1]-q[1]||p[0]-q[0]);let run=null;
    for(const [i,j] of cs){
      if(run&&run.j===j&&run.x1===i)run.x1=i+1;else{if(run)B_(run.x0,run.x1,y0,y1,run.j,run.j+1);run={x0:i,x1:i+1,j}}}
    if(run)B_(run.x0,run.x1,y0,y1,run.j,run.j+1);
  }
  const DW=7,D0=(TW-DW)/2,D1=D0+DW,WC=(D1+TW)/2;   // cửa vòm rộng 7m, nằm giữa tháp
  for(const t of P.towers){
    const Ht=t.Ht,top=Ht+TH,dh=Ht+DH,B=P.BR[t.b];
    const put=(sk,tk,u0,u1,v0,v1,y0,y1,solid,bot)=>{addBoxR(t,sk,tk,u0,u1,Y0+y0,Y0+y1,v0,v1,bot);if(solid)colR(t,u0,u1,v0,v1,y0,y1)};
    const col=(u0,u1,v0,v1,y0,y1)=>colR(t,u0,u1,v0,v1,y0,y1);
    // móng gạch hơi thấp hơn sàn: che chỗ thân tháp (đã xoay) nhô ra khỏi các ô móng bậc thang; sàn lát đá xoay theo tháp nổi cao hơn mặt ô 2cm để không nhấp nháy
    put('brick','pave',0,TW,0,TW,Ht-1.2,Ht-.02,false,false);
    put('pave','pave',0,TW,0,TW,Ht,Ht+.02,false,false);
    for(const [ua,door] of[[0,!(t.end&&t.b===0)],[TW-1,!(t.end&&t.b===1)]]){   // đầu mút đường đi thì đóng cửa phía ngoài
      if(door){
        put('brick','brick',ua,ua+1,0,D0,Ht,top,true);put('brick','brick',ua,ua+1,D1,TW,Ht,top,true);put('brick','brick',ua,ua+1,D0,D1,dh,top,true);
        put('wood','wood',ua-.06,ua+1.06,D0-.18,D0,Ht,dh,false);put('wood','wood',ua-.06,ua+1.06,D1,D1+.18,Ht,dh,false);put('wood','wood',ua-.06,ua+1.06,D0-.18,D1+.18,dh-.2,dh,false);
      }else put('brick','brick',ua,ua+1,0,TW,Ht,top,true);
    }
    if(t.junc){put('brick','brick',1,D0,0,1,Ht,top,true);put('brick','brick',D1,TW-1,0,1,Ht,top,true);put('brick','brick',D0,D1,0,1,dh,top,true);put('wood','wood',D0,D1,-.18,0,dh-.2,dh,false)}   // tháp ngã ba: mở cửa phía núi để đi sang nhánh SPUR
    else put('brick','brick',1,TW-1,0,1,Ht,top,true);
    put('brick','brick',1,TW-1,TW-1,TW,Ht,top,true);
    col(0,TW,0,TW,top,top+.35);
    put('trim','trim',-.15,TW+.15,-.15,TW+.15,top-.2,top,false);
    for(let n=0;n<4;n++){const o=-1+1.1*n;put('roof','roof',o,TW-o,o,TW-o,top+.35*n,top+.35*(n+1),false,n===0)}
    put('trim','trim',TW/2-.4,TW/2+.4,TW/2-.4,TW/2+.4,top+1.4,top+1.8,false);
    const y0=Ht+1.9;   // cửa sổ cao hơn cho hợp thân tháp mới
    const winU=(uf,s,c)=>{put('dark','dark',uf,uf+s*.08,c-.5,c+.5,y0,y0+1.5,false);put('dark','dark',uf,uf+s*.08,c-.3,c+.3,y0+1.5,y0+1.8,false);put('trim','trim',uf,uf+s*.14,c-.65,c+.65,y0-.12,y0,false)};
    const winV=c=>{put('dark','dark',c-.5,c+.5,TW,TW+.08,y0,y0+1.5,false);put('dark','dark',c-.3,c+.3,TW,TW+.08,y0+1.5,y0+1.8,false);put('trim','trim',c-.65,c+.65,TW,TW+.14,y0-.12,y0,false)};
    winU(TW,1,WC);if(t.end)winU(0,-1,WC);
    winV(TW/2-1.6);winV(TW/2+1.6);
    // ---- đuốc: 2 trụ cạnh mỗi cửa vòm (bracket gỗ + cột gỗ + chén sắt). Lửa / đèn là đối tượng riêng, chỉ hiện khi cung thủ đã thắp ----
    for(const [uf,out,open] of[[0,-1,!(t.end&&t.b===0)],[TW,1,!(t.end&&t.b===1)]]){
      if(!open)continue;
      for(const vv of[D0-.45,D1+.45]){
        const pu=uf+out*TORCH.pu,ya=Ht+TORCH.y0,yb=Ht+TORCH.y1;
        put('wood','wood',Math.min(uf,pu+out*.1),Math.max(uf,pu+out*.1),vv-.07,vv+.07,ya+.12,ya+.3,false);   // tay đỡ gắn vào mặt tháp
        put('wood','wood',pu-.1,pu+.1,vv-.1,vv+.1,ya,yb,false);                                           // cột đuốc
        put('dark','dark',pu-.19,pu+.19,vv-.19,vv+.19,yb,yb+.22,false);                                     // chén sắt giữ lửa
        const w=toW(t,pu,vv);
        TORCHES.push(mkTorch(w[0],Y0+yb+.5,w[1],{b:t.b,s:t.i*B.step+out*(TW/2+TORCH.reachU),lat:(vv>TW/2?1:-1)*TORCH.reachLat,tw:t}));
      }
    }
  }
  // đèn thật dùng chung (chỉ vài cái, gắn vào đuốc gần người chơi nhất mỗi khung hình)
  for(let i=0;i<TORCH.lights;i++){const L=new THREE.PointLight(0xff9a40,0,34,1.6);L.position.set(0,-500,0);L.tt=null;S.add(L);LIGHTS.push(L)}
  // --- xuất mesh ---
  const M=mats();
  for(const q of Q.values()){
    if(!q.k)continue;
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(q.p,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(q.n,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(q.u,2));
    g.setIndex(q.i);
    const m=new THREE.Mesh(g,M[q.kind]);S.add(m);meshes.push(m);   // meshes: đạn để lại vết trên gạch
  }
  Q=null;
  buildPines(P,cells,keyOf,Y0,B_);
}
window.GreatWall={build,floor:FLOOR,prep,terrainGrid,makeLakes,cfg:{WH,HWID,HMAX,SLOPE,TW,TH,DH},get torches(){return TORCHES},torchCfg:TORCH,lightTorch,torchTick,torchIdle,torchReset};
})();