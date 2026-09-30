// Nhà rubik "CMC Infinity Residence" - PHONG CÁCH NHÀ NHẬT TRUYỀN THỐNG (rừng tre)
// Mái ngói đá phiến tối nhiều tầng + viền đá, tường ván gỗ nâu đậm, cột đỏ nâu, cửa giấy shoji,
// nền móng đá + bậc thang, hiên (engawa) có lan can, đèn lồng, cờ noren trắng chấm đỏ.
// Nạp SAU voxel.js, TRƯỚC nature.js để cây / đá / sông tự né nhà (xem keepOuts trong nature.js).
(function(){
const HX=0,HZ=15.5;                 // tâm nhà (x,z) trên sàn tầng 1
const F=3.5;                        // (giữ tên cũ) mặt tiền ở z=+ cục bộ
const FL=.875, WT=3.375, RY=3.625;  // mặt sàn hiên · đỉnh tường · chân mái
const RZ=-.25;                      // tâm z của mái (lệch về phía sau, hiên phía trước)

// ---------- BẢNG MÀU ----------
const PLANK=[0x4a2e1e,0x3f2618,0x553522,0x38220f];
const POST=0x6b2d1c, RED=0x8a3b22, RED2=0x9c4a2c, DARK=0x2a1a10;
const STONE=[0x5a5a5a,0x6a6a6a,0x4c4c4c,0x777777,0x3e3e3e];
const ROOF=[0x2b2b33,0x22222a,0x1c1c22];
const TRIM=[0x8a8a8a,0x767676,0x9a9a9a];
const PAPER=0xe8dcb8;

const mix=(a,b,t)=>{const r=((a>>16)&255)*(1-t)+((b>>16)&255)*t,g=((a>>8)&255)*(1-t)+((b>>8)&255)*t,l=(a&255)*(1-t)+(b&255)*t;return((r|0)<<16)|((g|0)<<8)|(l|0)};
const GRN=(a,b,c)=>(i,j,k)=>[a,b,c][(i+j*2+k)%3];
const isP=(x,ps)=>ps.some(p=>Math.abs(x-p)<.13);

// ---------- LOGO (giữ nguyên) ----------
function logo(v,cx,cy,cz,LW,isBack=false){
  const sm=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k/4},
    so=(x,y)=>sm(Math.hypot(x-.52,y)-.48,Math.hypot(x+.52,y)-.48,.48),
    si=(x,y)=>sm(Math.hypot(x-.5,y)-.26,Math.hypot(x+.5,y)-.26,1.0);
  const LS=.05,nx=Math.round(LW/LS),ny=Math.round(LW/2/LS),u=LW/2;
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){
    const x=-1+(i+.5)/nx*2,y=.5-(j+.5)/ny,o=so(x,y),n=si(x,y);
    if(o>0||n<=0)continue;
    const w=-o/(-o+n),sg=x<0?-1:1,a=Math.atan2(y,x-sg*.52),br=.5+.5*Math.cos(a-(sg<0?2.4:Math.PI-2.4));
    let hex;
    if(w<.06)hex=0xffffff;
    else if(w<.55)hex=mix(0xdfe6ee,0xffffff,br);
    else hex=mix(0xaab6c6,0xf1f4f8,1-br);
    if(isBack){
      v.cube(cx+x*u,cy+y*u,cz,-LS*.95,LS*.95,.12,hex,i,j,0);
      v.cube(cx+x*u+.07,cy+y*u-.07,cz+.09,-LS*.95,LS*.95,.02,0x0a0a0a,i,j,1);
    } else {
      v.cube(cx+x*u,cy+y*u,cz,LS*.95,LS*.95,.12,hex,i,j,0);
      v.cube(cx+x*u+.07,cy+y*u-.07,cz-.09,LS*.95,LS*.95,.02,0x0a0a0a,i,j,1);
    }
  }
}

const FONT={C:['.###.','#...#','#....','#....','#....','#...#','.###.'],M:['#...#','##.##','#.#.#','#...#','#...#','#...#','#...#'],
  I:['#####','..#..','..#..','..#..','..#..','..#..','#####'],N:['#...#','##..#','#.#.#','#..##','#...#','#...#','#...#'],
  F:['#####','#....','#....','####.','#....','#....','#....'],T:['#####','..#..','..#..','..#..','..#..','..#..','..#..'],
  Y:['#...#','#...#','.#.#.','..#..','..#..','..#..','..#..'],R:['####.','#...#','#...#','####.','#.#..','#..#.','#...#'],
  E:['#####','#....','#....','####.','#....','#....','#####'],S:['.####','#....','#....','.###.','....#','....#','####.'],
  D:['####.','#...#','#...#','#...#','#...#','#...#','####.'],
  P:['####.','#...#','#...#','####.','#....','#....','#....'],
  W:['#...#','#...#','#...#','#.#.#','##.##','#...#','#...#'],
  B:['####.','#...#','#...#','####.','#...#','#...#','####.'],
  L:['#....','#....','#....','#....','#....','#....','#####']};
function text(v,str,cx,cy,cz,cs,hex){
  const x0=cx-(str.length*6-1)*cs/2;
  for(let a=0;a<str.length;a++){const g=FONT[str[a]];if(!g)continue;
    for(let r=0;r<7;r++)for(let b=0;b<5;b++)if(g[r][b]==='#')v.box(x0+(a*6+b+.5)*cs,cy+(3-r)*cs,cz,cs,cs,.02,hex,cs)}
}

function buildHouse(hx,hz){
  const v=new VB();
  // hộp voxel theo toạ độ min/max
  const fb=(x0,x1,y0,y1,z0,z1,c,s=.25)=>v.box((x0+x1)/2,(y0+y1)/2,(z0+z1)/2,x1-x0,y1-y0,z1-z0,c,s);
  // hộp voxel có hàm màu theo toạ độ thật (x,y,z) + chỉ số (i,j,k); trả -1 = trống
  const fp=(x0,x1,y0,y1,z0,z1,s,fn)=>fb(x0,x1,y0,y1,z0,z1,
    (i,j,k)=>fn(x0+(i+.5)*s,y0+(j+.5)*s,z0+(k+.5)*s,i,j,k),s);

  // ================= NỀN MÓNG ĐÁ + BẬC THANG =================
  fb(-7.5,7.5,0,.75,-3.75,4.5,(i,j,k)=>{
    const c=STONE[(i*3+j*5+k*7+((i*k)>>2))%5];
    return j===2?mix(c,0x999999,.25):c;               // hàng trên cùng sáng hơn
  },.25);
  fb(-1.75,1.75,0,.25,4.5,5.5,(i,j,k)=>STONE[(i*3+k*5)%5],.25);   // bậc 1
  fb(-1.5,1.5,0,.5,4.5,5.0,(i,j,k)=>STONE[(i*5+j+k*3)%5],.25);    // bậc 2

  // ================= SÀN HIÊN + CHIẾU TATAMI =================
  fb(-7,7,.75,FL,-3.5,4.0,(i,j,k)=>(k&1)?0x6b4a2e:0x5e402a,.125);
  fb(-6.25,6.25,FL,FL+.125,-3.0,2.5,(i,j,k)=>{
    if(i%14===0||k%28===0)return 0x3a3a22;              // viền chiếu
    return (((i/14)|0)+((k/28)|0))&1?0x9c9a62:0xa8a670;
  },.125);

  // ================= TƯỜNG VÁN GỖ + CỘT ĐỎ + CỬA GIẤY =================
  const PF=[-6.375,-2.625,-1.375,1.375,2.625,6.375];
  // mặt trước
  fp(-6.5,6.5,FL,WT,2.5,2.75,.25,(x,y,z,i,j)=>{
    if(isP(x,PF))return POST;
    if(y>WT-.3)return 0x3a2012;
    const ax=Math.abs(x);
    if(x>-1.25&&x<1.25&&y<2.75){                        // cửa trượt: nửa trái đóng, nửa phải mở
      if(x>0)return -1;
      return(i%4===0||j%4===0)?DARK:PAPER;
    }
    if(ax>2.75&&ax<5.5&&y>1.375&&y<2.875)               // cửa sổ giấy
      return(i%3===0||j%3===0)?DARK:PAPER;
    return PLANK[(i+((j*3)>>1))&3];
  });
  // mặt sau
  const PB=[-6.375,-4.375,-2.375,-.375,1.625,3.625,5.625,6.375];
  fp(-6.5,6.5,FL,WT,-3.25,-3.0,.25,(x,y,z,i,j)=>{
    if(isP(x,PB))return POST;
    if(y>WT-.3)return 0x3a2012;
    return PLANK[(i+((j*3)>>1))&3];
  });
  // hai bên hông
  const PS=[-3.125,-1.125,.875,2.625];
  for(const [x0,x1] of [[-6.5,-6.25],[6.25,6.5]])
    fp(x0,x1,FL,WT,-3.25,2.75,.25,(x,y,z,i,j,k)=>{
      if(isP(z,PS))return POST;
      if(y>WT-.3)return 0x3a2012;
      if(z>-.875&&z<.625&&y>1.375&&y<2.875)return(k%3===0||j%3===0)?DARK:PAPER;
      return PLANK[(k+((j*3)>>1))&3];
    });

  // ================= DẦM + TRẦN =================
  fb(-6.75,6.75,WT,RY,-3.5,3.0,(i,j,k)=>(i+k)&1?0x4d2313:0x431d10,.25);

  // ================= MÁI NGÓI NHIỀU TẦNG (hip) =================
  for(let n=0;n<=6;n++){
    const hw=8.5-.5*n,hd=4.75-.5*n,nx=Math.round(hw*8),nz=Math.round(hd*8),y0=RY+.5*n;
    fb(-hw,hw,y0,y0+.5,RZ-hd,RZ+hd,(i,j,k)=>{
      if(n===0&&(i===0||i===nx-1||k===0||k===nz-1))return TRIM[(i+k)%3];   // viền đá mép mái
      if((i<3||i>=nx-3)&&(k<3||k>=nz-3))return TRIM[(i+k)%3];              // đường đá ở bốn góc mái
      return ROOF[(i+k+j*2)%3];
    },.25);
  }
  fb(-5.5,5.5,RY+3.5,RY+3.75,RZ-.75,RZ+.75,(i,j,k)=>TRIM[(i+k)%3],.25);       // nóc đá
  // đầu mái cong vút ở bốn góc
  for(const sx of[-1,1])for(const [z0,z1] of [[4.25,4.75],[-5.25,-4.75]]){
    const xa=sx>0?8.25:-8.75,xb=sx>0?8.75:-8.25;
    fb(xa,xb,RY+.125,RY+.625,z0,z1,(i,j,k)=>TRIM[(i+j+k)%3],.125);
  }

  // ================= HIÊN: CỘT ĐỠ MÁI + LAN CAN ĐỎ NÂU =================
  for(const x of[-6.875,-3.375,-1.875,1.875,3.375,6.875])
    fb(x-.125,x+.125,FL,RY,3.75,4.0,(i,j,k)=>(j&1)?POST:0x7a3520,.125);
  const railX=(x0,x1,z0,z1)=>{const n=Math.round((x1-x0)/.125);
    fp(x0,x1,FL,FL+1.0,z0,z1,.125,(x,y,z,i,j)=>(i%8<2||i===n-1||j>=6||j===3)?(j>=6?RED2:RED):-1)};
  const railZ=(x0,x1,z0,z1)=>{const n=Math.round((z1-z0)/.125);
    fp(x0,x1,FL,FL+1.0,z0,z1,.125,(x,y,z,i,j,k)=>(k%8<2||k===n-1||j>=6||j===3)?(j>=6?RED2:RED):-1)};
  railX(-7,-1.75,3.875,4.0);railX(1.75,7,3.875,4.0);         // mặt trước chừa lối lên bậc
  railZ(6.875,7,2.75,4.0);railZ(-7,-6.875,2.75,4.0);         // hai đầu hiên

  // ================= NOREN (cờ trắng chấm đỏ) + ĐÈN LỒNG =================
  for(const sx of[-1,1]){
    const x0=sx>0?1.6:-2.4,x1=sx>0?2.4:-1.6,cx=sx>0?2.0:-2.0;
    fp(x0,x1,1.4,3.3,2.8,2.9,.1,(x,y)=>{
      if(y>3.2)return DARK;
      if(Math.hypot(x-cx,y-2.5)<.24)return 0xc0202a;
      return 0xf2f0ea;
    });
    const lx=sx*3.0;
    fb(lx-.15,lx+.15,2.65,3.05,3.45,3.75,(i,j,k)=>(j===0||j===3)?DARK:0xffc860,.1);
    fb(lx-.025,lx+.025,3.05,RY,3.575,3.625,DARK,.05);
  }

  // ================= BIỂN HIỆU: LOGO + POWERED BY RLNC (trước nhà, bên trái) =================
  fb(-6.8,-6.6,0,2.75,5.1,5.3,PLANK[1],.1);fb(-4.4,-4.2,0,2.75,5.1,5.3,PLANK[1],.1);
  fp(-6.8,-4.2,.85,2.75,5.15,5.25,.1,(x,y,z,i,j)=>(i<2||i>=24||j<2||j>=17)?POST:0x2b1c12);
  logo(v,-5.5,2.1,5.35,2.2,false);
  text(v,'POWERED',-5.5,1.38,5.261,.05,0xffffff);
  text(v,'BY RLNC',-5.5,1.03,5.261,.05,0xffffff);
  // biển logo mặt sau
  fp(-1.8,1.8,1.3,3.2,-3.37,-3.25,.1,(x,y,z,i,j)=>(i<2||i>=34||j<2||j>=17)?POST:0x2b1c12);
  logo(v,0,2.25,-3.25-.18,3.0,true);

  // ================= NỘI THẤT NHỎ (nhìn thấy qua cửa mở) =================
  fb(-1.0,1.0,1.25,1.375,-1.75,-.75,0x5a3a20,.125);                                   // bàn thấp
  for(const x of[-1.0,.875])for(const z of[-1.75,-.875])fb(x,x+.125,1.0,1.25,z,z+.125,0x3a2412,.125);
  fb(-.125,.125,1.375,1.625,-1.375,-1.125,0xffd070,.125);                             // đèn bàn
  fb(-2.0,-1.25,1.0,1.125,-1.5,-.75,0x8a2a2a,.125);fb(1.25,2.0,1.0,1.125,-1.5,-.75,0x8a2a2a,.125); // đệm ngồi

  // ================= ĐÈN ĐÁ (ishidoro) + CÂY CỎ =================
  fb(4.7,5.3,0,.2,5.3,5.9,0x666666,.1);fb(4.9,5.1,.2,.8,5.5,5.7,0x777777,.1);
  fb(4.8,5.2,.8,1.1,5.4,5.8,0xffd070,.1);fb(4.65,5.35,1.1,1.3,5.25,5.95,0x555555,.1);
  const G=GRN(0x4f8a4a,0x6aa85d,0x3d7a3f),L=GRN(0x8a6fc9,0xa88be0,0x7658b5),P=GRN(0xe060a0,0xf08cbc,0xc84c88);
  v.ell(-8.1,.3,3.6,.6,.35,.5,G,.1);v.ell(-8.3,.22,2.6,.45,.22,.4,L,.1);
  v.ell(8.1,.3,3.8,.6,.35,.5,G,.1);v.ell(8.3,.22,2.7,.45,.22,.4,P,.1);
  v.ell(-7.9,.3,-3.4,.6,.35,.5,G,.1);v.ell(7.9,.3,-3.4,.6,.35,.5,G,.1);
  v.ell(3.5,.25,5.6,.45,.25,.4,G,.1);v.ell(-2.6,.25,5.7,.4,.2,.35,P,.1);

  const m=v.mesh();m.position.set(hx,0,hz);S.add(m);meshes.push(m);

  // ================= VA CHẠM =================
  const cb=(x0,x1,y0,y1,z0,z1)=>boxes.push({x0:hx+x0,x1:hx+x1,y0,y1,z0:hz+z0,z1:hz+z1});
  cb(-7.5,7.5,0,.75,-3.75,4.5);                          // móng đá
  cb(-1.75,1.75,0,.25,4.5,5.5);cb(-1.5,1.5,0,.5,4.5,5.0); // bậc thang
  cb(-7,7,0,FL,-3.5,4.0);                                // sàn hiên
  cb(-6.25,6.25,0,FL+.125,-3.0,2.5);                     // chiếu tatami
  cb(-6.5,-1.25,FL,WT,2.5,2.75);cb(1.25,6.5,FL,WT,2.5,2.75);cb(-1.25,1.25,2.75,WT,2.5,2.75); // tường trước (chừa cửa)
  cb(-6.5,6.5,FL,WT,-3.25,-3.0);                         // tường sau
  cb(-6.5,-6.25,FL,WT,-3.25,2.75);cb(6.25,6.5,FL,WT,-3.25,2.75); // hai hông
  cb(-6.75,6.75,WT,RY,-3.5,3.0);                         // dầm / trần
  cb(-8.5,8.5,RY,RY+.5,RZ-4.75,RZ+4.75);                 // mép mái
  cb(-1,1,FL+.125,1.375,-1.75,-.75);                     // bàn
  cb(-7,-1.75,FL,FL+1,3.875,4.0);cb(1.75,7,FL,FL+1,3.875,4.0);   // lan can trước
  cb(6.875,7,FL,FL+1,2.75,4.0);cb(-7,-6.875,FL,FL+1,2.75,4.0);   // lan can hông
  cb(-6.8,-4.2,0,2.75,5.1,5.3);                          // biển hiệu
  cb(4.65,5.35,0,1.3,5.25,5.95);                         // đèn đá
}
buildHouse(HX,HZ);
window.HouseZone=(x,z)=>x>HX-8.8&&x<HX+8.8&&z>HZ-5.4&&z<HZ+6.2;
window.House={build:buildHouse};
})();