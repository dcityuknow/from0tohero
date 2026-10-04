// RỪNG CAY CAO + HÀNG RÀO HOA che bức tường trong của THANG LÊN TẦNG 2 (tầng 1).
// Bức tường đó (level.js: box ở x = ±(A-4.15), dài STLf(0) ≈ 25m, cao tới trần) là một mảng xanh phẳng, trống trơn nên nhìn thô.
// Ở đây dựng ngay phía trong sàn, sát chân tường:
//  - 1 hàng bụi rậm thấp (xanh + điểm hoa hồng) che phần chân tường,
//  - 2 hàng cây cao 15-19m so le nhau (thân nâu, tán nhiều tầng thu nhỏ dần lên ngọn) che phần thân tường tới sát trần.
// Cây dùng chung 3 mô hình (3 chiều cao), mỗi cây chỉ khác tỉ lệ / góc xoay / màu → nhẹ. Tán lá không chặn đạn (không đưa vào meshes), thân + bụi có va chạm.
// Chân thang (cổng ở phía nam, z > zs) và đường lên thang luôn để trống: rừng dừng cách đó vài mét.
// Nạp SAU bath.js, TRƯỚC nature.js (xem loader.js): nature.js đọc StairGroveKeep trong keepOuts() để cây / đá / sông / đầu cầu né ra.
// floors.js (FM) gọi StairGrove.build() mỗi khi dựng lại bộ đồ tầng 1. Chỉnh nhanh ở CFG bên dưới.
(function(){
const CFG={
  rows:[                 // mỗi hàng: cách tường (m) · bước giữa 2 cây (m) · lệch đầu hàng (m) · tỉ lệ ngang [nhỏ, lớn]
    {off:2.9,step:3.5,z0:0,sc:[.78,.92]},      // hàng sát tường: tán không được chọc sang phía thang (bán kính tán tối đa ≈ off - 0.2)
    {off:5.9,step:3.9,z0:1.8,sc:[.85,1.08]}    // hàng ngoài, so le
  ],
  N:[7,8,9],             // số tầng tán của 3 mô hình ≈ cao 15 / 16.6 / 18.2m (trần tầng 1 ở 20m: 10 tầng sẽ chạm trần, đừng tăng quá 9)
  R0:2.9,                // bán kính tầng tán dưới cùng (m) khi tỉ lệ = 1
  hedge:{step:2.3,off:1.15}   // bụi thấp: bước dọc tường (m) · cách tường (m)
};
const LEAF=[0x2f8c4e,0x3da25a,0x52b86a,0x6bcf7c];   // xanh tươi (hợp tông sáng của tầng 1): tối dưới đáy tầng tán -> sáng trên mặt
const BARK=[0x7a5636,0x6b4a2e,0x5b3f27,0x84603d];
const HEDGE=[0x2c7a45,0x38904f,0x48a85f], BLOOM=[0xffb3cf,0xff9fbf,0xffd1e0];

const rng=s=>()=>(s=(s*1664525+1013904223)>>>0)/4294967296;

// ---- mô hình 1 cây: thân + các tầng tán dẹt thu nhỏ dần, đỉnh nhọn ----
function treeGeo(n,seed){
  const v=new VB(),r=rng(seed),Sz=.6,step=1.6,Y0=2.7;   // khối .6m: đủ chi tiết mà nhẹ (mỗi mô hình ~2k khối)
  // thân: các đốt trụ rỗng xếp chồng, mảnh dần
  const bk=(a,b,l)=>BARK[(a*3+b*5+l*7)%4],topT=Y0+3.4;   // thân chỉ cần dựng tới vài mét đầu tầng tán (phần trên bị tán che kín)
  for(let y=-.1;y<topT;y+=1.1){const u=y/topT,rr=.46-.22*u,len=1.25;v.cyl(0,y+len/2,0,rr,len,bk,.2,'y',Math.max(0,rr-.2*1.5))}
  for(const [dx,dz,w,d] of[[1,0,.5,.3],[-1,0,.5,.3],[0,1,.3,.5],[0,-1,.3,.5]])v.box(dx*.55,.12,dz*.55,w,.24,d,BARK[0],.12);   // rễ nổi
  let Rmax=0;   // bán kính ngang lớn nhất của tán (để khống chế tán không chọc qua tường)
  // tầng tán: bán kính giảm dần (hơi cong), mỗi tầng 1 elip dẹt + 1 cụm nhỏ lệch ra cho mép lồi lõm
  for(let i=0;i<n;i++){
    const u=n>1?i/(n-1):0,R=CFG.R0*(1-.84*Math.pow(u,.9))+.5,ry=.8-.15*u,y=Y0+i*step+ry,ny=Math.round(2*ry/Sz);
    const col=(a,b,c)=>LEAF[Math.min(3,Math.floor(b/Math.max(1,ny-1)*2.3+((a*7+c*13+b*5+i*3)%5)*.12))];
    const jx=(r()-.5)*.25*R,jz=(r()-.5)*.25*R;
    v.ell(jx,y,jz,R,ry,R,col,Sz,true);Rmax=Math.max(Rmax,Math.hypot(jx,jz)+R);
    if(R>1.2){const an=r()*6.283,dd=R*.45;v.ell(jx+Math.cos(an)*dd,y+.1,jz+Math.sin(an)*dd,R*.45,ry*.9,R*.45,col,Sz,true)}
  }
  const yt=Y0+(n-1)*step+.65*2-.1;                     // đỉnh nhọn
  v.ell(0,yt+.55,0,.55,.95,.55,(a,b,c)=>LEAF[1+((a+b+c)&1)*2],.3,true);
  const g=v.mesh().geometry;g.userData={maxR:Rmax};return g;
}

// ---- hình học bố trí (theo level.js, tự co giãn theo MAPK) ----
function layout(){
  const A=AS(0),sg=-1,dir=-sg,wx=sg*(A-4.15),zs=A-4,zlo=zs-STLf(0)+1.0,zhi=zs-2.0;   // wx: tường trong thang · dir: hướng vào lòng sàn · zlo..zhi: đoạn tường cần che
  return {wx,dir,zlo,zhi};
}
window.StairGroveKeep=(()=>{const L=layout(),xa=L.wx-L.dir*1.0,xb=L.wx+L.dir*(CFG.rows[1].off+2.7);
  return{x0:Math.min(xa,xb),x1:Math.max(xa,xb),z0:L.zlo-1.2,z1:L.zhi+1.2}})();

function build(){
  const L=layout(),R=rng(777),geos=CFG.N.map((n,i)=>treeGeo(n,31+i*17));
  let k=0;
  // cây cao
  for(const row of CFG.rows){
    const x0=L.wx+L.dir*row.off;
    for(let z=L.zlo+row.z0;z<=L.zhi;z+=row.step){
      const gi=(k++*7+(R()*3|0))%3,sc=Math.min(row.sc[0]+R()*(row.sc[1]-row.sc[0]),(row.off-.3)/geos[gi].userData.maxR),x=x0+(R()-.5)*.8,zz=z+(R()-.5)*.8;
      const m=new THREE.Mesh(geos[gi],VMAT);m.position.set(x,0,zz);m.rotation.y=R()*6.283;m.scale.set(sc,1,sc);S.add(m);   // KHÔNG đưa vào meshes: đạn bay xuyên tán
      boxes.push({x0:x-.42,x1:x+.42,y0:0,y1:3.0,z0:zz-.42,z1:zz+.42});   // va chạm thân (tán ở trên đầu, không chặn)
    }
  }
  // hàng bụi thấp sát chân tường (nhiều hoa hồng) - gộp 1 mesh
  const hv=new VB(),hs=.3,hc=(i,j,kk)=>((i*5+j*11+kk*7)%9===0)?BLOOM[(i+kk)%3]:HEDGE[Math.min(2,Math.floor(j/3)+((i+kk)&1))];
  const hx=L.wx+L.dir*CFG.hedge.off;
  for(let z=L.zlo-.2;z<=L.zhi+.4;z+=CFG.hedge.step){
    const zz=z+(R()-.5)*.5,rx=.95+R()*.35,rz=1.15+R()*.35,ry=.8+R()*.45;
    hv.ell(hx,ry*.9,zz,rx,ry,rz,hc,hs,true);
    boxes.push({x0:hx-rx*.85,x1:hx+rx*.85,y0:0,y1:ry*1.3,z0:zz-rz*.85,z1:zz+rz*.85});
  }
  const hm=hv.mesh();S.add(hm);meshes.push(hm);
}
build();
window.StairGrove={build};
})();
