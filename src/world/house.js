// Nhà rubik "CMC Infinity Residence" - Tông ĐEN, Kính xanh da trời mờ nhìn xuyên nội thất.
// Nạp SAU voxel.js, TRƯỚC nature.js để cây / đá / sông tự né nhà (xem keepOuts trong nature.js).
(function(){
const HX=0,HZ=15.5;                 // tâm nhà (x,z) trên sàn tầng 1
const BW=14,BD=7,BH=5.75;           // thân nhà: rộng (x) · sâu (z) · cao (y); mặt tiền ở z=+BD/2 (cục bộ)
const LOGO_W=3.5,LOGO_Y=3.85,LOGO_X=-.5;   // logo trắng mặt trước: bề rộng (m), độ cao tâm, vị trí ngang
const BACK_LOGO_W=5.5,BACK_LOGO_Y=3.85,BACK_LOGO_X=0; // logo trắng mặt sau
const FL2=3.5;                      // mặt sàn tầng 2 (sàn dày .5m: 3.0 -> 3.5)

// ---------- TÔNG MÀU ĐEN ----------
const TILE=[0x222222,0x1a1a1a,0x2c2c2c,0x161616],BAND=[0x0d0d0d,0x141414],ROOFC=[0x111111,0x090909];
const tile=(i,j,k)=>TILE[(j*3+((i*5+k*3)>>2))&3];
const mix=(a,b,t)=>{const r=((a>>16)&255)*(1-t)+((b>>16)&255)*t,g=((a>>8)&255)*(1-t)+((b>>8)&255)*t,l=(a&255)*(1-t)+(b&255)*t;return((r|0)<<16)|((g|0)<<8)|(l|0)};
const GRN=(a,b,c)=>(i,j,k)=>[a,b,c][(i+j*2+k)%3];
const inR=(a,b,r)=>a>r[0]&&a<r[1]&&b>r[2]&&b<r[3];
const WF=[[-5.75,-2.75,.25,5.25],[1.75,4.25,.25,5.25]],DR=[[4.75,6.5,0,2.5],[4.75,6.5,FL2,5.25]],WL=[-2.5,2,.75,5];

function bodyCol(i,j,k,nx,ny,nz){
  if(i>0&&i<nx-1&&k>0&&k<nz-1&&(j===0||j===ny-1))return -1;
  const x=-BW/2+(i+.5)*BW/nx,y=(j+.5)*BH/ny,z=-BD/2+(k+.5)*BD/nz;
  if(k===nz-1&&(WF.some(r=>inR(x,y,r))||DR.some(r=>inR(x,y,r))))return -1;
  if(i===0&&inR(z,y,WL))return -1;
  if(j===12||j===13)return BAND[(i+k)&1];
  return tile(i,j,k);
}

// KÍNH XANH DA TRỜI MỜ: Viền khung đen, phần kính có màu xanh da trời nhưng đan xen voxel trống để nhìn xuyên thấu
const GS=.25;
function glass(v,ax,a0,a1,y0,y1,p){
  const w=a1-a0,h=y1-y0,n=Math.round(w/GS),m=Math.round(h/GS),tv=Math.round((2.75-y0)/GS);
  const col=(u,r)=>{
    if(u===0||u===n-1||r===0||r===m-1||(tv>0&&tv<m-1&&r===tv)||u%6===0)return 0x111111; // Khung nẹp đen
    if((u + r) % 2 === 0) return 0x5a9bd8; // Xanh da trời mờ đan xen
    return -1; // Trong suốt để nhìn vào nội thất
  };
  if(ax==='z')v.box((a0+a1)/2,(y0+y1)/2,p,w,h,.1,(i,j)=>col(i,j),GS);
  else v.box(p,(y0+y1)/2,(a0+a1)/2,.1,h,w,(i,j,k)=>col(k,j),GS);
}

const rail=(v,cx,cy,cz,w,h,d)=>v.box(cx,cy,cz,w,h,d,(i,j,k)=>((i+k)%8===0)?0x333333:0x1a1a1a,.3);

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

const NST=14,RISE=FL2/NST,RUN=.39,SX0=-1.29;
function buildHouse(hx,hz){
  const v=new VB(),F=BD/2;
  const fb=(x0,x1,y0,y1,z0,z1,c,s=.25)=>v.box((x0+x1)/2,(y0+y1)/2,(z0+z1)/2,x1-x0,y1-y0,z1-z0,c,s);
  
  v.box(0,BH/2,0,BW,BH,BD,bodyCol,.25,true);
  v.box(0,BH+.25,.4,15.2,.5,8.6,(i,j,k)=>ROOFC[(i+k)&1],.5);
  v.box(2.925,.11,F+.45,9.35,.22,.9,(i,j,k)=>(i+k)&1?0x222222:0x151515,.3);
  v.box(6.05,3.25,F+.5,3.1,.5,1.0,(i,j,k)=>(i+k)&1?0x222222:0x1a1a1a,.25);
  rail(v,0,BH+.5+.45,F+1.15,15.2,.9,.06);rail(v,0,BH+.5+.45,-F-.35,15.2,.9,.06);
  rail(v,-7.55,BH+.5+.45,.4,.06,.9,8.6);rail(v,7.55,BH+.5+.45,.4,.06,.9,8.6);
  rail(v,6.05,FL2+.5,F+.95,3.1,1.0,.06);rail(v,7.55,FL2+.5,F+.5,.06,1.0,1.0);rail(v,4.55,FL2+.5,F+.5,.06,1.0,1.0);
  
  WF.forEach(r=>glass(v,'z',r[0],r[1],r[2],r[3],F-.3));glass(v,'x',WL[0],WL[1],WL[2],WL[3],-BW/2+.3);
  
  v.box(-3.75,.475,F+.225,4.0,.95,.45,(i,j,k)=>(i+j)&1?0x2a2a2a:0x1f1f1f,.25);
  text(v,'POWERED',-3.75,.70,F+.461,.05,0xffffff);text(v,'BY RLNC',-3.75,.27,F+.461,.05,0xffffff);
  logo(v,LOGO_X,LOGO_Y,F+.1,LOGO_W,false);
  
  v.box(BACK_LOGO_X, BACK_LOGO_Y, -F - 0.06, 6.2, 3.4, 0.12, (i,j,k)=>0x111111, 0.25);
  logo(v,BACK_LOGO_X,BACK_LOGO_Y,-F-.18,BACK_LOGO_W,true);

  const G=GRN(0x4f8a4a,0x6aa85d,0x3d7a3f),L=GRN(0x8a6fc9,0xa88be0,0x7658b5);
  v.ell(-6.55,.3,F+.8,.55,.32,.45,G,.1);v.ell(-7.5,.22,F+.1,.45,.22,.4,L,.1);
  v.ell(8,.3,F+.4,.55,.3,.5,G,.1);v.ell(8.3,.2,F+1.2,.4,.2,.35,L,.1);
  v.ell(6.6,BH+.5+.3,F-.4,.4,.3,.4,G,.1);

  const SL=(i,j,k)=>(i+k)&1?0x222222:0x191919;
  fb(-6.75,6.75,3.0,FL2,-1.85,3.25,SL);fb(SX0,6.75,3.0,FL2,-3.25,-1.85,SL);
  for(let n=1;n<=NST;n++){const xb=SX0-(n-1)*RUN,xa=xb-RUN;fb(xa,xb,0,n*RISE,-3.25,-1.85,n&1?0x262626:0x1c1c1c,.3)}
  
  fb(-6.75,6.75,0,.06,-3.25,3.25,(i,j,k)=>(k&1)?0x222222:0x1b1b1b,.5);
  fb(-5.6,-2.0,.06,.09,-1.0,1.4,(i,j,k)=>(i+k)&1?0x2a2a2a:0x202020,.3);
  fb(-6.7,-5.85,.06,.45,-1.0,1.6,0x1a2634);fb(-6.7,-6.3,.45,1.0,-1.0,1.6,0x151f2a);
  fb(-4.6,-3.6,.36,.42,-.2,.8,0x1f1f1f,.25);for(const x of[-4.55,-3.65])for(const z of[-.15,.75])fb(x-.04,x+.04,.06,.36,z-.04,z+.04,0x0d0d0d,.08);
  fb(.3,3.3,0,2.2,-3.25,-2.85,(i,j,k)=>(j%4===3)?0x111111:[0x262626,0x1f1f1f,0x333333,0x2b2b2b,0x1a1a1a][(i+j)%5],.2);
  fb(2.4,4.2,.7,.78,-.6,.6,0x222222,.2);for(const x of[2.5,4.1])for(const z of[-.5,.5])fb(x-.05,x+.05,0,.7,z-.05,z+.05,0x0d0d0d,.1);

  fb(.6,2.8,FL2,FL2+.4,-3.25,-1.1,0x1f1f1f);fb(.6,2.8,FL2+.4,FL2+.55,-3.15,-1.2,0x333333);
  fb(.6,2.8,FL2+.55,FL2+1.1,-3.25,-3.12,0x111111,.15);fb(.75,1.55,FL2+.55,FL2+.68,-3.05,-2.6,0xcccccc,.15);fb(1.85,2.65,FL2+.55,FL2+.68,-3.05,-2.6,0xcccccc,.15);
  fb(.6,2.8,FL2+.55,FL2+.6,-2.4,-1.1,0x2c2c3c,.25);
  fb(3.9,6.1,FL2+.7,FL2+.78,-3.25,-2.45,0x222222,.2);for(const x of[4.0,6.0])for(const z of[-3.15,-2.55])fb(x-.05,x+.05,FL2,FL2+.7,z-.05,z+.05,0x0d0d0d,.1);
  fb(4.6,5.2,FL2+.78,FL2+1.05,-3.1,-2.85,0x161622,.1);
  fb(4.7,5.3,FL2,FL2+.45,-2.2,-1.75,0x111111,.15);

  const m=v.mesh();m.position.set(hx,0,hz);S.add(m);meshes.push(m);

  const cb=(x0,x1,y0,y1,z0,z1)=>boxes.push({x0:hx+x0,x1:hx+x1,y0,y1,z0:hz+z0,z1:hz+z1});
  cb(-7,4.75,0,BH,F-.25,F);cb(6.5,7,0,BH,F-.25,F);
  cb(4.75,6.5,2.5,FL2,F-.25,F);cb(4.75,6.5,5.25,BH,F-.25,F);
  cb(-7,7,0,BH,-F,-F+.25);cb(-7,-6.75,0,BH,-F+.25,F-.25);cb(6.75,7,0,BH,-F+.25,F-.25);
  cb(-6.75,6.75,3.0,FL2,-1.85,F-.25);cb(SX0,6.75,3.0,FL2,-F+.25,-1.85);
  for(let n=1;n<=NST;n++){const xb=SX0-(n-1)*RUN;cb(xb-RUN,xb,0,n*RISE,-F+.25,-1.85)}
  cb(-7.6,7.6,BH,BH+.5,-3.9,4.7);
  cb(4.5,7.6,3.0,FL2,F,F+1);
  cb(4.5,7.6,FL2,FL2+1,F+.92,F+.98);cb(4.5,4.58,FL2,FL2+1,F,F+1);cb(7.52,7.6,FL2,FL2+1,F,F+1);
  cb(-1.75,7.6,0,.22,F,F+.9);cb(-5.75,-1.75,0,.95,F,F+.45);
  cb(-6.7,-5.85,0,.8,-1,1.6);cb(.3,3.3,0,2.2,-F+.25,-2.85);cb(2.4,4.2,0,.78,-.6,.6);
  cb(.6,2.8,FL2,FL2+.4,-F+.25,-1.1);cb(3.9,6.1,FL2,FL2+.78,-F+.25,-2.45);
}
buildHouse(HX,HZ);
window.HouseZone=(x,z)=>x>HX-8.6&&x<HX+8.6&&z>HZ-4.6&&z<HZ+5.6;
window.House={build:buildHouse};
})();