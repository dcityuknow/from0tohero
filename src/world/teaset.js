// Hai bộ bàn trà kiểu Nhật (thay cho 2 khối xanh bk(±8,0,-6,2,3.5,2,BL) cũ trong world.js).
// Mỗi bộ: nền đá + sàn gỗ + chiếu tatami, bàn thấp (chabudai) sơn nâu, 4 đệm ngồi đỏ, khay + ấm trà + 4 chén,
// mái che ngói đá phiến (giống mái nhà / chòi) trên cột gỗ, kèm đèn lồng. Cùng bảng màu với house.js / pavilion.js.
// Nạp SAU statues.js, TRƯỚC nature.js (xem loader.js). Chỉnh nhanh ở TEA bên dưới.
(function(){
const TEA={
  x:8*MAPK,z:-6*MAPK   // đúng chỗ 2 khối xanh cũ (x = ±, z = -)
};

// ---------- BẢNG MÀU (giống house.js) ----------
const STONE=[0x5a5a5a,0x6a6a6a,0x4c4c4c,0x777777,0x3e3e3e];
const POST=0x6b2d1c, RED=0x8a3b22, RED2=0x9c4a2c, DARK=0x2a1a10;
const WHITE=0xf2f0ea, PAPER=0xe8dcb8;
const ROOF=[0x2b2b33,0x22222a,0x1c1c22];      // ngói đá phiến (giống mái nhà + chòi)
const TRIM=[0x8a8a8a,0x767676,0x9a9a9a];      // viền đá mép mái

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

  // ---- mái che ngói + cột gỗ + đèn lồng, ở góc ngoài ----
  const px=sx*1.3,pz=-1.3;
  fb(px-.05,px+.05,TT,3.0,pz-.05,pz+.05,POST,.05);
  // mái ngói nhiều tầng thu nhỏ dần lên đỉnh (cùng kiểu mái nhà rubik), viền đá ở mép dưới
  for(let n=0;n<=4;n++){
    const hw=1.5-.25*n,nn=Math.round(hw*2/.125),y0=2.9+.25*n;
    fb(px-hw,px+hw,y0,y0+.25,pz-hw,pz+hw,(i,j,k)=>{
      if(n===0&&(i===0||i===nn-1||k===0||k===nn-1))return TRIM[(i+k)%3];
      return ROOF[(i+k+j*2)%3];
    },.125);
  }
  fb(px-.25,px+.25,4.15,4.35,pz-.25,pz+.25,(i,j,k)=>TRIM[(i+k)%3],.05);      // nóc đá
  fb(px-.15,px+.15,2.0,2.4,pz-.15,pz+.15,(i,j,k)=>(j===0||j===3)?DARK:0xffc860,.1);   // đèn lồng quanh cột

  return v;
}

const add=m=>{S.add(m);meshes.push(m)};   // meshes: để đạn để lại vết

function build(){
  for(const sx of[-1,1]){
    const x=sx*TEA.x,z=TEA.z;
    const m=buildSet(sx).mesh();m.position.set(x,0,z);add(m);
    // va chạm: nền + bàn + cột dù
    boxes.push({x0:x-1.6,x1:x+1.6,y0:0,y1:TT,z0:z-1.6,z1:z+1.6});
    boxes.push({x0:x-.8,x1:x+.8,y0:TT,y1:TOP,z0:z-.55,z1:z+.55});
    boxes.push({x0:x+sx*1.3-.06,x1:x+sx*1.3+.06,y0:TT,y1:3.0,z0:z-1.36,z1:z-1.24});
  }
}
build();
// nature.js đọc TeaKeeps trong keepOuts(): cây / đá / sông / đầu cầu né 2 hình chữ nhật này (nền + bàn + dù + lề an toàn)
window.TeaKeeps=[-1,1].map(sx=>({x0:sx*TEA.x-3.2,x1:sx*TEA.x+3.2,z0:TEA.z-3.2,z1:TEA.z+3.2}));
window.TeaSets={build};
})();
