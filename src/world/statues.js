// Hai bệ vuông đỡ tượng đá (thay cho 2 khối hồng bk(±8,0,6,2,3.5,2,PK) cũ trong world.js).
// Bên TRÁI: tượng chibi đeo kính VR, hai tay nâng vòng sáng vô cực. Bên PHẢI: tượng "bóng ma" kính đen, áo hoodie, cầm laptop.
// Nạp SAU pavilion.js, TRƯỚC nature.js (xem loader.js). Chỉnh nhanh ở STA bên dưới.
(function(){
const STA={
  x:8*MAPK,z:6*MAPK,   // vị trí 2 bệ = đúng chỗ 2 khối hồng cũ (x = ±, z = +)
  turn:.4              // xoay tượng hướng vào giữa (rad), 0 = nhìn thẳng về +z
};
const Y=1.4;           // mặt trên của bệ (m)
// ---------- BẢNG MÀU ĐÁ ----------
const G=[0x8d8f96,0x9a9ca3,0x7f818a,0xa6a8ae];
const GD=[0x6e7079,0x62646d,0x777983,0x5a5c65];   // đá tối (kính, mũ)
const D=0x43454d, LT=0xe6e8ee, MOSS=[0x6f8f5a,0x5d7d4c];
const ST=(i,j,k)=>G[(i*3+j*5+k*7)&3], STD=(i,j,k)=>GD[(i*3+j*5+k*7)&3];   // màu đá theo ô (đừng đặt tên S: trùng scene toàn cục)

// vòng vô cực (cùng công thức logo của house.js): LW = bề rộng, dz = độ dày theo z
function ring(v,cx,cy,cz,LW,LS,dz,hex){
  const sm=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k/4},
    so=(x,y)=>sm(Math.hypot(x-.52,y)-.48,Math.hypot(x+.52,y)-.48,.48),
    si=(x,y)=>sm(Math.hypot(x-.5,y)-.26,Math.hypot(x+.5,y)-.26,1.0);
  const nx=Math.round(LW/LS),ny=Math.round(LW/2/LS),u=LW/2;
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){
    const x=-1+(i+.5)/nx*2,y=.5-(j+.5)/ny,o=so(x,y),n=si(x,y);
    if(o>0||n<=0)continue;
    v.cube(cx+x*u,cy+y*u,cz,LS*.95,LS*.95,dz,hex,i,j,0);
  }
}

// ---------- BỆ VUÔNG (3 x 3 m, cao 1.4 m = cùng chân đế với khối hồng cũ) ----------
function pedestal(){
  const v=new VB();
  v.box(0,.25,0,3,.5,3,(i,j,k)=>(j===0&&(i*7+k*3)%5===0)?MOSS[(i+k)&1]:ST(i,j,k),.25,true);   // đế
  v.box(0,.85,0,2.6,.7,2.6,ST,.13,true);                                                        // thân bệ
  v.box(0,1.3,0,2.8,.2,2.8,(i,j,k)=>(i<1||k<1||i>26||k>26)?G[1]:ST(i,j,k),.1,true);            // mặt bệ (hơi nhô ra)
  v.box(0,.85,1.31,1.3,.45,.03,D,.03);                                                         // tấm bảng khắc
  ring(v,0,.85,1.335,.8,.03,.03,0xb4b6bd);                                                     // logo vô cực khắc nổi
  return v;
}

// ---------- TƯỢNG TRÁI: chibi kính VR nâng vòng sáng ----------
function statueA(){
  const v=new VB();
  v.box(0,Y+.55,0,1.4,1.1,.85,ST,.1,true);                      // thân (áo khoác)
  v.ell(0,Y+1.0,0,.85,.42,.52,ST,.1,true);                      // vai
  v.box(0,Y+.55,.43,.05,1.05,.03,D,.03);                       // khóa kéo
  v.box(-.34,Y+.55,.43,.04,1.0,.03,D,.03);v.box(.34,Y+.55,.43,.04,1.0,.03,D,.03);   // viền áo
  v.box(0,Y+1.17,0,.6,.14,.5,ST,.08,true);v.box(0,Y+1.3,0,.4,.2,.4,ST,.08,true);      // cổ áo + cổ
  v.ell(0,Y+1.95,0,.62,.62,.6,ST,.07,true);                     // đầu tròn to
  v.ell(0,Y+1.98,.1,.66,.27,.56,STD,.06,true);                  // kính VR ôm mặt
  v.box(-.64,Y+1.98,0,.1,.22,.4,D,.05);v.box(.64,Y+1.98,0,.1,.22,.4,D,.05);        // dây đeo kính
  ring(v,0,Y+1.98,.6,.52,.03,.14,D);                           // logo vô cực trên kính
  v.box(0,Y+1.6,.54,.2,.03,.04,D,.02);v.box(-.12,Y+1.63,.53,.04,.03,.04,D,.02);v.box(.12,Y+1.63,.53,.04,.03,.04,D,.02);   // miệng cười
  for(const sx of[-1,1]){
    v.box(sx*.88,Y+.7,0,.3,.8,.4,ST,.1,true);                   // bắp tay
    v.box(sx*.7,Y+.5,.4,.3,.28,.7,ST,.1,true);                  // cẳng tay đưa ra trước
    v.ell(sx*.47,Y+.5,.8,.17,.16,.17,ST,.05,true);              // nắm tay
  }
  ring(v,0,Y+.5,.82,.9,.04,.14,LT);                            // vòng vô cực sáng giữa hai tay
  return v;
}

// ---------- TƯỢNG PHẢI: bóng ma kính đen, hoodie, cầm laptop ----------
function statueB(){
  const v=new VB();
  v.box(0,Y+.55,0,1.5,1.1,.9,ST,.1,true);                       // thân hoodie
  v.ell(0,Y+1.0,0,.88,.42,.54,ST,.1,true);                      // vai
  v.ell(0,Y+1.3,-.15,.62,.4,.45,ST,.08,true);                   // mũ hoodie phía sau cổ
  v.box(0,Y+.35,.46,.6,.3,.03,D,.03);                          // túi bụng
  v.box(0,Y+1.3,0,.4,.2,.4,ST,.08,true);                        // cổ
  v.ell(0,Y+1.85,0,.5,.68,.46,ST,.06,true);                     // đầu trứng
  v.ell(-.22,Y+2.55,0,.13,.3,.13,ST,.05);v.ell(.05,Y+2.68,0,.11,.3,.11,ST,.05);v.ell(.28,Y+2.5,0,.13,.28,.12,ST,.05);   // đỉnh đầu như ngọn lửa
  v.ell(-.5,Y+2.7,0,.08,.08,.08,ST,.04);v.ell(-.64,Y+2.85,0,.05,.05,.05,ST,.03);                                          // giọt bong bóng
  ring(v,0,Y+1.95,.32,.8,.03,.3,D);                            // kính đen = vòng vô cực dày
  v.box(0,Y+1.55,.4,.16,.03,.04,D,.02);v.box(-.09,Y+1.52,.39,.04,.03,.04,D,.02);v.box(.09,Y+1.52,.39,.04,.03,.04,D,.02); // miệng mếu
  // tay trái (người xem): khoanh tay giơ ngón cái
  v.box(-.88,Y+.65,0,.3,.8,.42,ST,.1,true);
  v.box(-.35,Y+.55,.42,.75,.25,.3,ST,.1,true);
  v.ell(-.25,Y+.78,.5,.16,.16,.16,ST,.05,true);v.ell(-.25,Y+1.0,.5,.05,.12,.05,ST,.04);
  // tay phải (người xem): cầm laptop
  v.box(.88,Y+.65,0,.3,.8,.42,ST,.1,true);
  v.box(.7,Y+.45,.4,.3,.25,.6,ST,.1,true);
  v.box(.85,Y+.3,.6,.8,.08,.7,GD[0],.08,true);                 // thân laptop
  for(let j=0;j<10;j++)v.box(.85,Y+.36+j*.085,.27-j*.03,.8,.09,.05,j<1?D:(j%2?GD[1]:GD[2]),.045);   // màn hình nghiêng ra sau
  return v;
}

const add=m=>{S.add(m);meshes.push(m)};   // meshes: để đạn để lại vết trên đá

function build(){
  for(const [sx,mk] of[[-1,statueA],[1,statueB]]){
    const x=sx*STA.x,z=STA.z;
    const pm=pedestal().mesh();pm.position.set(x,0,z);add(pm);
    const sm=mk().mesh();sm.position.set(x,0,z);sm.rotation.y=-sx*STA.turn;add(sm);
    // va chạm: bệ 3x3 + thân tượng
    boxes.push({x0:x-1.5,x1:x+1.5,y0:0,y1:Y,z0:z-1.5,z1:z+1.5});
    boxes.push({x0:x-1.25,x1:x+1.25,y0:Y,y1:Y+3.2,z0:z-.95,z1:z+.95});
  }
}
build();
window.Statues={build};
})();
