// Hai bộ bàn trà kiểu Nhật (thay cho 2 khối xanh bk(±8,0,-6,2,3.5,2,BL) cũ trong world.js).
// Mỗi bộ: nền đá + sàn gỗ + chiếu tatami, bàn thấp (chabudai) sơn nâu, 4 đệm ngồi đỏ, khay + ấm trà + 4 chén,
// và một CÂY CỔ THỤ DÁNG BONSAI (thân uốn cong, tán lá nhiều tầng dẹt vươn ra che trọn bộ bàn trà thay cho mái che ngói cũ), có đèn lồng treo trên cành.
// Cùng bảng màu với house.js / pavilion.js.
// Nạp SAU statues.js, TRƯỚC nature.js (xem loader.js). Chỉnh nhanh ở TEA bên dưới.
(function(){
const TEA={
  x:8*MAPK,z:-6*MAPK   // đúng chỗ 2 khối xanh cũ (x = ±, z = -)
};

// ---------- BẢNG MÀU (giống house.js) ----------
const STONE=[0x5a5a5a,0x6a6a6a,0x4c4c4c,0x777777,0x3e3e3e];
const POST=0x6b2d1c, RED=0x8a3b22, RED2=0x9c4a2c, DARK=0x2a1a10;
const WHITE=0xf2f0ea, PAPER=0xe8dcb8;
// màu cây bonsai: vỏ nâu, gỗ chết bạc (jin) như thân bonsai mẫu, lá xanh từ tối (đáy tán) tới sáng (mặt tán)
const BARK=[0x6b4a2e,0x5b3f27,0x7a5636,0x4e3722];
const JIN=[0xb9b09c,0xa89f8c,0xcfc7b4];
const LEAF=[0x2c6632,0x38783b,0x468f43,0x5aa84e];

// độ cao các lớp (m)
const PL=.2, DK=.4, TT=.5;          // đỉnh nền đá · đỉnh sàn gỗ · đỉnh chiếu tatami
const LEG=.9, TOP=1.05;             // đỉnh chân bàn · mặt bàn

function buildSet(sx){
  const v=new VB();
  const fb=(x0,x1,y0,y1,z0,z1,c,s=.125)=>v.box((x0+x1)/2,(y0+y1)/2,(z0+z1)/2,x1-x0,y1-y0,z1-z0,c,s);

  // ---- nền đá + sàn gỗ + chiếu tatami ----
  fb(-1.6,1.6,0,PL,-1.6,1.6,(i,j,k)=>STONE[(i*3+j*5+k*7+((i*k)>>2))%5],.1);
  fb(-1.5,1.5,PL,DK,-1.5,1.5,(i,j,k)=>(k&1)?0x6b4a2e:0x5e402a,.1);
  fb(-1.25,1.25,DK,TT,-1.25,1.25,(i,j,k)=>{
    if(i%10===0||k%10===0)return 0x3a3a22;              // viền chiếu
    return (((i/10)|0)+((k/10)|0))&1?0x9c9a62:0xa8a670;
  },.125);

  // ---- bàn thấp: mặt nâu có viền đỏ nâu + 4 chân ----
  fb(-.8,.8,LEG,TOP,-.55,.55,(i,j,k)=>{
    const e=i<2||k<2||i>=30||k>=20;                     // viền đỏ nâu quanh mặt bàn
    return e?RED:0x5a3a20;
  },.05);
  for(const x of[-.7,.6])for(const z of[-.45,.35])fb(x,x+.1,TT,LEG,z,z+.1,0x3a2412,.05);

  // ---- 4 đệm ngồi (zabuton) ----
  const cu=(x0,x1,z0,z1)=>fb(x0,x1,TT,TT+.12,z0,z1,(i,j,k)=>(i<1||k<1)?0x6e1f1f:0x8a2a2a,.06);
  cu(-.48,.48,.78,1.26);cu(-.48,.48,-1.26,-.78);
  cu(.96,1.44,-.36,.36);cu(-1.44,-.96,-.36,.36);

  // ---- khay + ấm trà + chén ----
  fb(-.36,.36,TOP,TOP+.04,-.22,.22,DARK,.04);
  const Y0=TOP+.04;
  v.ell(0,Y0+.13,0,.16,.13,.16,(i,j,k)=>(i+j+k)&1?0x2f3b3a:0x3a4746,.04);   // thân ấm
  v.ell(0,Y0+.27,0,.09,.04,.09,0x2f3b3a,.03);                                 // nắp
  fb(-.02,.02,Y0+.3,Y0+.34,-.02,.02,RED,.02);                                 // núm nắp
  fb(.14,.3,Y0+.14,Y0+.18,-.025,.025,0x2f3b3a,.025);                          // vòi
  fb(-.24,-.2,Y0+.1,Y0+.22,-.03,.03,0x2f3b3a,.03);                            // quai
  for(const [x,z] of[[-.48,.3],[.48,.3],[-.48,-.3],[.48,-.3]]){
    fb(x-.06,x+.06,Y0-.04+.04,Y0+.08,z-.06,z+.06,WHITE,.04);                  // chén (đặt trên mặt bàn)
    fb(x-.04,x+.04,Y0+.08,Y0+.1,z-.04,z+.04,0x7aa85a,.02);                    // nước trà xanh
  }

  // ---- CÂY BONSAI cổ thụ: gốc ở góc ngoài, thân uốn chữ S nghiêng vào giữa, các tầng tán dẹt vươn ra che bàn trà ----
  // Toạ độ cây vẽ cho sx=+1; sx=-1 thì lật x (đối xứng gương). Trả về {trunk,leaf}: thân gộp vào mesh nền (đạn để lại vết), tán lá là mesh riêng (đạn bay xuyên tán).
  const X=x=>sx*x,lerp=(p,q,t)=>p+(q-p)*t;
  const bez=(p0,p1,p2,p3,t)=>{const u=1-t;return p0.map((_,i)=>u*u*u*p0[i]+3*u*u*t*p1[i]+3*u*t*t*p2[i]+t*t*t*p3[i])};
  const T0=[2.5,-.1,-2.4],T1=[2.9,1.3,-2.5],T2=[1.7,1.7,-1.6],T3=[1.2,2.8,-1.1];   // đường cong thân
  const ts=.11,NS=36,pts=[];
  for(let n=0;n<=NS;n++){const t=n/NS,p=bez(T0,T1,T2,T3,t);pts.push({x:p[0],y:p[1],z:p[2],r:lerp(.44,.16,Math.pow(t,.8)),t})}
  const bark=(a,b,l)=>BARK[(a*3+b*5+l*7)%BARK.length];
  for(const q of pts){
    if(q.t<.5)v.cyl(X(q.x),q.y,q.z,q.r,.36,bark,ts,'y',Math.max(0,q.r-ts*1.6));   // phần gốc to: các đốt trụ rỗng xếp chồng
    else{const d=Math.max(ts*.9,2*q.r);v.cube(X(q.x),q.y,q.z,d,d,d,BARK[(q.t*40|0)%4],q.t*40|0,1,2)}   // phần trên nghiêng nhiều: khối nhỏ nối nhau
  }
  for(const [dx,dz,w,d] of[[1,0,.34,.18],[-1.4,0,.5,.2],[0,1,.18,.34],[0,-1.2,.2,.45],[-1,-1,.3,.3]])fb(X(T0[0]+dx*.5)-w/2,X(T0[0]+dx*.5)+w/2,0,.2,T0[2]+dz*.5-d/2,T0[2]+dz*.5+d/2,BARK[0],.06);   // rễ nổi
  for(let n=9;n<=15;n++){const q=pts[n];v.cube(X(q.x-q.r*.85),q.y,q.z+q.r*.3,.12,.16,.12,JIN[n%3],n,3,5)}   // vệt gỗ chết bạc màu trên thân (như bonsai mẫu)
  const limb=(a,b,r0,r1)=>{   // cành: dãy khối nối a -> b, mảnh dần
    const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz),m=Math.max(2,Math.ceil(len/.09));
    for(let k=0;k<=m;k++){const t=k/m,r=lerp(r0,r1,t),d=Math.max(.1,2*r);v.cube(X(a[0]+dx*t),a[1]+dy*t,a[2]+dz*t,d,d,d,BARK[(k+(k>>2))%4],k,k>>1,m)}
  };
  const L=new VB(),LS=.2;
  const padCol=ny=>(i,j,k)=>LEAF[Math.min(3,Math.floor(j/Math.max(1,ny-1)*2.6+((i*7+k*13+j*5)%5)*.12))];
  const pad=(c,rx,rz,ry,sd)=>{   // tầng tán dẹt: 1 khối elip lớn + 3 cụm nhỏ lệch ra cho mép lồi lõm
    const col=padCol(Math.round(2*ry/LS));
    L.ell(X(c[0]),c[1],c[2],rx,ry,rz,col,LS,true);
    for(let q=0;q<3;q++){const an=sd*1.7+q*2.1,dd=.55*Math.min(rx,rz);
      L.ell(X(c[0]+Math.cos(an)*dd),c[1]+.06,c[2]+Math.sin(an)*dd,rx*.5,ry*.9,rz*.5,col,LS,true)}
  };
  const tp=pts[NS];                                  // ngọn thân
  const PADS=[                                       // [tâm x,y,z], rx, rz, ry  - tầng 1 che ngay trên bàn
    [[.1,3.15,.1],1.55,1.45,.42],[[-1.25,3.45,.55],1.15,1.0,.38],[[1.55,3.75,-1.0],1.25,1.1,.4],
    [[-.3,3.85,-1.35],1.0,.9,.36],[[1.0,3.1,1.2],1.05,.95,.36],[[.25,4.3,-.2],.8,.75,.3]];
  const FR=[pts[27],pts[NS],pts[NS],pts[NS],pts[27],pts[NS]];   // cành mọc ra từ điểm nào của thân
  PADS.forEach((P_,n)=>{
    const c=P_[0],f=FR[n],a=[f.x,f.y,f.z],end=[c[0],c[1]-P_[3]*.6,c[2]],mid=[(a[0]+end[0])/2,Math.max(a[1],end[1])-.15,(a[2]+end[2])/2];
    limb(a,mid,.13,.09);limb(mid,end,.09,.05);pad(c,P_[1],P_[2],P_[3],n+1);
  });
  // đèn lồng treo dưới tầng tán thấp nhất
  fb(X(1.0)-.015,X(1.0)+.015,2.5,2.76,1.2-.015,1.2+.015,DARK,.02);
  fb(X(1.0)-.14,X(1.0)+.14,2.1,2.5,1.2-.14,1.2+.14,(i,j,k)=>(j===0||j===3)?DARK:0xffc860,.1);
  // điểm va chạm của thân (chỉ phần thấp hơn đầu người)
  const hit=[];for(let n=0;n<=NS;n+=2){const q=pts[n];if(q.y-q.r<1.9)hit.push({x:X(q.x),y:q.y,z:q.z,r:q.r})}
  return {v,L,hit};
}

const add=m=>{S.add(m);meshes.push(m)};   // meshes: để đạn để lại vết

function build(){
  for(const sx of[-1,1]){
    const x=sx*TEA.x,z=TEA.z,{v,L,hit}=buildSet(sx);
    const m=v.mesh();m.position.set(x,0,z);add(m);
    const lf=L.mesh();lf.position.set(x,0,z);S.add(lf);   // tán lá: KHÔNG đưa vào meshes -> đạn bay xuyên tán (giống cây ở nature/)
    // va chạm: nền + bàn + thân cây (tán ở trên đầu, không chặn)
    boxes.push({x0:x-1.6,x1:x+1.6,y0:0,y1:TT,z0:z-1.6,z1:z+1.6});
    boxes.push({x0:x-.8,x1:x+.8,y0:TT,y1:TOP,z0:z-.55,z1:z+.55});
    for(const h of hit){const r=h.r+.04;boxes.push({x0:x+h.x-r,x1:x+h.x+r,y0:Math.max(0,h.y-h.r-.15),y1:h.y+h.r+.15,z0:z+h.z-r,z1:z+h.z+r})}
  }
}
build();
// nature.js đọc TeaKeeps trong keepOuts(): cây / đá / sông / đầu cầu né 2 hình chữ nhật này (nền + bàn + cây + lề an toàn)
window.TeaKeeps=[-1,1].map(sx=>({x0:sx*TEA.x-3.2,x1:sx*TEA.x+3.2,z0:TEA.z-3.2,z1:TEA.z+3.2}));
window.TeaSets={build};
})();
