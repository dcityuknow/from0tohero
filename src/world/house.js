// Nhà rubik "CMC Infinity Residence" - thay cho khối chắn dài màu xanh ở tầng 1 (ngay trước chỗ người chơi xuất hiện).
// Thân ốp gạch xám (mảnh rubik .25m), kính lớn thụt vào có nẹp đen, mái bê tông vươn ra + lan can kính, ban công tầng 2,
// biển hiệu chữ voxel, và LOGO xanh (hai vòng nối nhau) gắn giữa mặt tiền. Mặt tiền hướng +z (về phía người chơi xuất hiện).
// Nạp SAU voxel.js, TRƯỚC nature.js để cây / đá / sông tự né nhà (xem keepOuts trong nature.js).
// Muốn đổi vị trí: sửa HX,HZ. Muốn đổi cỡ logo: sửa LOGO_W. Muốn thêm 1 căn nữa: gọi thêm buildHouse(x,z) (xem cuối file).
(function(){
const HX=0,HZ=15.5;                 // tâm nhà (x,z) trên sàn tầng 1
const BW=14,BD=7,BH=5.75;           // thân nhà: rộng (x) · sâu (z) · cao (y); mặt tiền ở z=+BD/2 (cục bộ)
const LOGO_W=3.5,LOGO_Y=3.85,LOGO_X=-.5;   // logo: bề rộng (m), độ cao tâm, vị trí ngang trên mặt tiền

// ---------- tiện ích ----------
const TILE=[0xc4c7cd,0xb7bac1,0xced1d7,0xbdc0c7],BAND=[0xa5a9b1,0xb0b4bb];
const tile=(i,j,k)=>TILE[((i*7+j*13+k*5)^(i>>1))&3];
const mix=(a,b,t)=>{const r=((a>>16)&255)*(1-t)+((b>>16)&255)*t,g=((a>>8)&255)*(1-t)+((b>>8)&255)*t,l=(a&255)*(1-t)+(b&255)*t;return((r|0)<<16)|((g|0)<<8)|(l|0)};
const GRN=(a,b,c)=>(i,j,k)=>[a,b,c][(i+j*2+k)%3];
const inR=(a,b,r)=>a>r[0]&&a<r[1]&&b>r[2]&&b<r[3];
// cửa kính mặt tiền [x0,x1,y0,y1] (khớp lưới .25m để lỗ khoét vừa khít tấm kính) và cửa sổ mặt trái [z0,z1,y0,y1]
const WF=[[-5.75,-2.75,.25,5.25],[1.75,4.25,.25,5.25],[4.75,6.75,3.5,5.25],[4.75,6.5,.25,2.75]],WL=[-2.5,2,.75,5];

// thân nhà: chỉ dựng lớp vỏ ngoài, khoét lỗ ở chỗ cửa kính, có vạch sàn tầng 2 sẫm hơn
function bodyCol(i,j,k,nx,ny,nz){
  if(i>0&&i<nx-1&&k>0&&k<nz-1&&(j===0||j===ny-1))return -1;          // đáy + nóc (nóc có mái che)
  const x=-BW/2+(i+.5)*BW/nx,y=(j+.5)*BH/ny,z=-BD/2+(k+.5)*BD/nz;
  if(k===nz-1&&WF.some(r=>inR(x,y,r)))return -1;
  if(i===0&&inR(z,y,WL))return -1;
  if(j===11)return BAND[(i+k)&1];
  return tile(i,j,k);
}
// tấm kính thụt vào sau lỗ khoét: nẹp đen (viền + mỗi 1.5m + thanh ngang ở sàn tầng 2), phản chiếu trời xanh, vệt sáng chéo
const GS=.25;
function glass(v,ax,a0,a1,y0,y1,p){
  const w=a1-a0,h=y1-y0,n=Math.round(w/GS),m=Math.round(h/GS),tv=Math.round((2.75-y0)/GS);
  const col=(u,r)=>{
    if(u===0||u===n-1||r===0||r===m-1||(tv>0&&tv<m-1&&r===tv)||u%6===0)return 0x171a21;
    let c=mix(0x1f2b38,0x4a6a88,r/m);if((u+r)%13<2)c=mix(c,0x9fc4e0,.35);return c};
  if(ax==='z')v.box((a0+a1)/2,(y0+y1)/2,p,w,h,.1,(i,j)=>col(i,j),GS);
  else v.box(p,(y0+y1)/2,(a0+a1)/2,.1,h,w,(i,j,k)=>col(k,j),GS);
}
// lan can kính: nền xanh nhạt, nẹp sẫm mỗi 2.4m
const rail=(v,cx,cy,cz,w,h,d)=>v.box(cx,cy,cz,w,h,d,(i,j,k)=>((i+k)%8===0)?0x6d8aa0:0xbfe3f5,.3);

// LOGO: hai vòng nối nhau (hình "hạt đậu"), viền ngoài xanh sáng, lòng vòng xanh đậm, có ánh sáng theo từng thùy + bóng đổ lên tường
function logo(v,cx,cy,cz,LW){
  const sm=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k/4},
    so=(x,y)=>sm(Math.hypot(x-.52,y)-.48,Math.hypot(x+.52,y)-.48,.48),    // mép ngoài
    si=(x,y)=>sm(Math.hypot(x-.5,y)-.26,Math.hypot(x+.5,y)-.26,1.0);      // lỗ bên trong
  const LS=.05,nx=Math.round(LW/LS),ny=Math.round(LW/2/LS),u=LW/2;
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){
    const x=-1+(i+.5)/nx*2,y=.5-(j+.5)/ny,o=so(x,y),n=si(x,y);
    if(o>0||n<=0)continue;
    const w=-o/(-o+n),sg=x<0?-1:1,a=Math.atan2(y,x-sg*.52),br=.5+.5*Math.cos(a-(sg<0?2.4:Math.PI-2.4));
    let hex;
    if(w<.06)hex=0xc5ecff;                              // mép sáng
    else if(w<.55)hex=mix(0x1f62d6,0x74cbff,br);        // dải ngoài: xanh sáng
    else hex=mix(0x0f2f7a,0x2f6fe0,1-br);               // dải trong: xanh đậm
    v.cube(cx+x*u,cy+y*u,cz,LS*.95,LS*.95,.12,hex,i,j,0);
    v.cube(cx+x*u+.07,cy+y*u-.07,cz-.09,LS*.95,LS*.95,.02,0x7c808a,i,j,1);   // bóng đổ
  }
}

// chữ voxel 5x7 cho biển hiệu
const FONT={C:['.###.','#...#','#....','#....','#....','#...#','.###.'],M:['#...#','##.##','#.#.#','#...#','#...#','#...#','#...#'],
  I:['#####','..#..','..#..','..#..','..#..','..#..','#####'],N:['#...#','##..#','#.#.#','#..##','#...#','#...#','#...#'],
  F:['#####','#....','#....','####.','#....','#....','#....'],T:['#####','..#..','..#..','..#..','..#..','..#..','..#..'],
  Y:['#...#','#...#','.#.#.','..#..','..#..','..#..','..#..'],R:['####.','#...#','#...#','####.','#.#..','#..#.','#...#'],
  E:['#####','#....','#....','####.','#....','#....','#####'],S:['.####','#....','#....','.###.','....#','....#','####.'],
  D:['####.','#...#','#...#','#...#','#...#','#...#','####.']};
function text(v,str,cx,cy,cz,cs,hex){
  const x0=cx-(str.length*6-1)*cs/2;
  for(let a=0;a<str.length;a++){const g=FONT[str[a]];if(!g)continue;
    for(let r=0;r<7;r++)for(let b=0;b<5;b++)if(g[r][b]==='#')v.box(x0+(a*6+b+.5)*cs,cy+(3-r)*cs,cz,cs,cs,.02,hex,cs)}
}

// ---------- dựng nhà ----------
function buildHouse(hx,hz){
  const v=new VB(),F=BD/2;
  // thân + mái + bậc thềm + ban công
  v.box(0,BH/2,0,BW,BH,BD,bodyCol,.25,true);
  v.box(0,BH+.25,.4,15.2,.5,8.6,(i,j,k)=>(i+k)&1?0xc9ccd2:0xbfc2c9,.5);                  // mái bê tông vươn ra phía trước 1.2m
  v.box(2.925,.11,F+.45,9.35,.22,.9,(i,j,k)=>(i+k)&1?0xaeb1b8:0xb9bcc3,.3);               // bậc thềm trước cửa
  v.box(6.05,3.15,F+.5,3.1,.5,1.0,(i,j,k)=>(i+k)&1?0xb2b5bc:0xa8abb3,.25);                // sàn ban công tầng 2
  // lan can kính: nóc mái + ban công
  rail(v,0,BH+.5+.45,F+1.15,15.2,.9,.06);rail(v,0,BH+.5+.45,-F-.35,15.2,.9,.06);
  rail(v,-7.55,BH+.5+.45,.4,.06,.9,8.6);rail(v,7.55,BH+.5+.45,.4,.06,.9,8.6);
  rail(v,6.05,3.4+.5,F+.95,3.1,1.0,.06);rail(v,7.55,3.4+.5,F+.5,.06,1.0,1.0);rail(v,4.55,3.4+.5,F+.5,.06,1.0,1.0);
  // kính (thụt vào .3m sau mặt tường)
  WF.forEach(r=>glass(v,'z',r[0],r[1],r[2],r[3],F-.3));glass(v,'x',WL[0],WL[1],WL[2],WL[3],-BW/2+.3);
  // biển hiệu ở chân nhà (bảng trắng + chữ voxel)
  v.box(-3.75,.475,F+.225,4.0,.95,.45,(i,j,k)=>(i+j)&1?0xe4e6ea:0xd8dade,.25);
  text(v,'CMC INFINITY',-3.75,.70,F+.461,.05,0x2a2c33);text(v,'RESIDENCE',-3.75,.27,F+.461,.05,0x2a2c33);
  // LOGO xanh: điểm nhấn giữa mặt tiền
  logo(v,LOGO_X,LOGO_Y,F+.1,LOGO_W);
  // cây cảnh: bụi xanh + oải hương quanh chân nhà, chậu cây trên mái
  const G=GRN(0x4f8a4a,0x6aa85d,0x3d7a3f),L=GRN(0x8a6fc9,0xa88be0,0x7658b5);
  v.ell(-6.55,.3,F+.8,.55,.32,.45,G,.1);v.ell(-7.5,.22,F+.1,.45,.22,.4,L,.1);
  v.ell(8,.3,F+.4,.55,.3,.5,G,.1);v.ell(8.3,.2,F+1.2,.4,.2,.35,L,.1);
  v.ell(6.6,BH+.5+.3,F-.4,.4,.3,.4,G,.1);
  const m=v.mesh();m.position.set(hx,0,hz);S.add(m);meshes.push(m);
  // va chạm (người chơi / bot / đạn / đá): thân đặc, mái + ban công vươn ra ở trên cao, bậc thềm thấp, biển hiệu
  const cb=(x0,x1,y0,y1,z0,z1)=>boxes.push({x0:hx+x0,x1:hx+x1,y0,y1,z0:hz+z0,z1:hz+z1});
  cb(-BW/2,BW/2,0,BH,-BD/2,BD/2);
  cb(-7.6,7.6,BH,BH+.5,-3.9,4.7);
  cb(4.5,7.6,2.9,3.4,F,F+1);
  cb(-1.75,7.6,0,.22,F,F+.9);
  cb(-5.75,-1.75,0,.95,F,F+.45);
}
buildHouse(HX,HZ);
window.House={build:buildHouse};   // ví dụ căn thứ hai: House.build(0,-15.5) (mặt tiền vẫn hướng +z)
})();
