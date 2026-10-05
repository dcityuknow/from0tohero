// Hai bệ vuông đỡ tượng đá (thay cho 2 khối hồng bk(±8,0,6,2,3.5,2,PK) cũ trong world.js).
// Bên TRÁI: tượng chibi đầu tròn to, kính VR, hai tay nâng vòng vô cực. Bên PHẢI: "bóng ma" tóc ngọn lửa, kính đen, hoodie, cầm laptop.
// Nạp SAU pavilion.js, TRƯỚC nature.js (xem loader.js). Chỉnh nhanh ở STA / Q bên dưới.
(function(){
const STA={
  x:8*MAPK,z:6*MAPK,   // vị trí 2 bệ
  turn:.4,             // xoay tượng hướng vào giữa (rad)
  k:2                  // hệ số phóng to tượng (bệ giữ nguyên). 1 = cỡ cũ, 2 = gấp đôi
};
// Q = độ mịn khối rubic. Nhỏ hơn = chi tiết hơn nhưng nặng hơn.
// 1 = thô như bản cũ, .7 = mặc định, .5 = rất mịn (nếu máy yếu thì tăng lên .8~1).
const Q=.5;   // tượng được phóng to nên dùng ô nhỏ hơn để vẫn mịn; nếu lag thì tăng lên .6~.8
const c=s=>+(s*Q).toFixed(3);
const Y=1.4;           // mặt trên của bệ (m)

// ---------- BẢNG MÀU ĐÁ ----------
const G=[0x8d8f96,0x9a9ca3,0x7f818a,0xa6a8ae];
const GD=[0x6e7079,0x62646d,0x777983,0x5a5c65];   // đá tối (kính, mũ)
const D=0x43454d, LT=0xe6e8ee, MOSS=[0x6f8f5a,0x5d7d4c];
const ST=(i,j,k)=>G[(i*3+j*5+k*7)&3], STD=(i,j,k)=>GD[(i*3+j*5+k*7)&3];   // màu đá theo ô

// ---------- LOGO VÔ CỰC: lấy mẫu từ ảnh gốc (cùng dữ liệu với house.js) ----------
// Lưới 120x66, '.' = trống, ký tự khác = độ sáng xám 0..63 -> đúng hình dạng, độ cong, độ dày và sắc độ của logo.
const LOGO_W=120,LOGO_H=66,LOGO_ASPECT=1.8207,LOGO_B64='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/';
const LOGO_PX=[
  '............................hjklmmmkj..............................................jkllmmnk.............................',
  '........................jkmqsuwyyyxwutspok....................................imortvxxyyzzxwvsqn........................',
  '.....................jlqvBGKMOPPPPPPOMKGBxson..............................kmpuAGKMPQQQQQQPOMKFBxup.....................',
  '...................jnvDJMMJHFDDCDDEFIJMOPOKEzto..........................kovCJOQONMMMMNNOOPQRRRQNJEyro..................',
  '.................jntCKKGBzxxxxyyyzzAABCEGKPQPGxtm......................intENQOKIIJKLMNNNOOPPQRSSTTQKFAs.................',
  '................kqAGGCywwwwxxxxyyyzzzzAABDGJMPMExrl...................lsBKOLIHIJKLLMMNNOOOPPQQRSTUUTRMFwo...............',
  '..............imuCBywvvvwwwxxxxyyyyzzzzzABCDFIMPLEwo................jozKMJGGHJKLLLMMMMNNOOPPPQQRRSUVXWSLDv..............',
  '.............kpwzwuvvvvwwwwxxxyyyyyzzzzzzAABCDGJNPKAuo............jmuGMIEFHIJKLLMMMMNNNNNOOPPQQRRRSTUWYWRJBq............',
  '...........hkrwwuuuvvvvvwwwxxyyzzzyyyyyyyyzAACDEHKOOJCvqok.....kmpwELKFFGIJKLMNNNNNMMMMMNNOOPPQQQRSTTUVYYWPFu...........',
  '...........kqvutuuuuvvvwwwxyzAAzzzyxxwwwwwwyzABCEGJNPPKCxvtrqrstzGNNIDEHIJLMNOOONMLJJJIJJKLNOOPPQQRSTUUVY+YQHr..........',
  '..........jottttuuuuvvwxxyABBBBBCDEFEDCBywvuvwyABDFIKMPPOLIHGHKMONJFDFHJKNPQQPNLKJJIHHGFEEFIJLNPQQRSTUUUVYZYQFq.........',
  '........ginrsttuuvvvvwxzBDEDEGKNPQQPPPPPNKFAwtuwyABDEGHJLMNONMLJGFEFHJKOQSRPNMNPQQQQQQQOLIECCDHLNPQRSTUUVVXZYRIu........',
  '........imqrsttuuvvwwyBFGGHLOPNJEByvuuwyCHMOLEwtuwzBCCEEFFFGFFFFFGHIJMQTTQOPQPMHDAyxzBDGKOOMICADHLPQRSUUVVVX+ZTKs.......',
  '.......hlpqsttuuvvwxzDIJJMPNIBtr..........puCKKBvtuyACDDEEFFFFGGHIJKNSTRPPPJBtr.........qtAHMNHAzDIOQRTUVVVWX++UG.......',
  '......gjnqrstuuvvwwzEJLMOPIzqk..............jqDLGyttwzBDDEEFFGGHHJMPSSQPPLym..............lpwFOIByBINQSUVVVWWY+ZQz......',
  '......hlprsstuuvvwzFKMNPMDv...................myIJBvuvyACDEEFGHIJLOQQPQNCs...................qALKCxBHNRTUVVWWXZ+XLs.....',
  '.....gjnqssstuvvwzHNOOPGyq......................ozJIEzwwyzBCEFGHJLMOPPFs......................mtDJCwzFNRTVWWWWX+/VF.....',
  '....ghlprsstuvvwzGPRPODu..........................qDLMJGDCBCDFHJMPRPJw..........................owGAwyGOSUVWWWXY++Qy....',
  '....hjnqssstuvvxEOTQPDu............................krBKONMLMNPRSSOHyo............................nvEyvAJRTVWWWXX+/WLr...',
  '...ghkorssstuvwAKTRPGw................................quBFIJKJHEzt................................nwBwvDNSTVWXXXY+ZSA...',
  '...gimpsssstuvyHTUPFy..............................................................................ntytxGPSUWXXXXZ+ZM...',
  '...hknrrssstvxEPWRGyq..............................................................................jmsvtAJRTVWXXXY++Tw..',
  '..gilprrsstuvALWWLAp................................................................................jmutvENSTVWXXY+/YG..',
  '..gjmqrrsstuwFSYSDw..................................................................................kputzJRTUWXXY+/+Pp.',
  '..gknqrrsstuyKWYNzr..................................................................................jltrvEPTUVWXYZ//Tw.',
  '..hlprrrsstvBRZWGw....................................................................................jptsAMSTUWXYY+/XA.',
  '.gilprrrstuwFW+TBs....................................................................................ilurwISTUVWXYZ/ZH.',
  '.gimqrrrstuxKYZOzp.....................................................................................jtrtFQTUVWXYZ/+O.',
  '.gjnqrrrstvyN+YKy......................................................................................jrtsCPSUVWXYZ//Qp',
  '.gjnqrrrttvAQ+XHw......................................................................................ipvsBOTTUVXXY+/St',
  '.gjoqrrstuvBS+VFu......................................................................................hnwrzMSTUVXYY+/Ux',
  'fgjoqrrstuvCU+UDs......................................................................................ilxryLSTUVXYY+/Vw',
  'ggjoqqrstuvDU+TCt......................................................................................ilxsxLSTUWXYY+/Wv',
  'fgjoqrrttuvCU+UDs......................................................................................ilxsxKSTUWXYY+/Wv',
  'ggjoqrsttuvCT+UDs......................................................................................hlxsxLSUVWXYY+/Vv',
  'hginqrsttuvBS+VEt......................................................................................hnxsyMSUVXYYY+/Vw',
  'hginqrsttuvzQ+XHw......................................................................................ipwsANTUWXYYY+/Tv',
  '.gimqrsstuvyO+ZKy......................................................................................irvtCOTVWXXYY++Qq',
  '.gimqrrstuvxLZ+Ozo.....................................................................................jutuEQTVWXYYZ/+Om',
  '.hhlprrstuuwGW+TBr....................................................................................hkvswHRUWXXYYZ/ZK.',
  '.hhkoqrsttuvCS+XFv....................................................................................hovtzKSVWXXYY+/XC.',
  '.hhjnqrrstuvzNYZNyq...................................................................................jttwDOUVWXXYY+/Ty.',
  '..hilprrsstuxHUZTBt..................................................................................hmwtyHRUVWXXYZ/+Pq.',
  '..hikorrrrtuvCOYWIxl.................................................................................jsvwBLSUVXXXY+/YJ..',
  '..gijmqrrrstvyGTYQBv................................................................................inxvAHPTUWXXXY++Uz..',
  '...iikprrrrsuvAKWWKyt..............................................................................ilxxyFNSTVWXXXZ+YNr..',
  '...hijnqrrrstuwCPXSIyr.................................lnortutrqo.................................imxzyCLQSUVWXXY+ZTD...',
  '...hijlprrrrstvxHTWQFwp.............................klqtyCFIJJIFAxrn.............................hlwAzBHPRSUVWXXZ+WMu...',
  '....ijknrrrrssuvAKUUNCvn..........................jnsyCHKNOPPQQQOLFztn..........................iltBBBFMRSTUVWXX+ZRE....',
  '.....jklprrrsstuwCMSTMCwq........................luCHKONMLKKLMOQRSQNIBs........................knvDDDELQRSTUWWXZ+UIq....',
  '.....ikknprrssstuwCJQRMExuo....................lsAEHIGEDDEEFGHJKNPSTSNGyq....................jlsAFGEFKQRSTTVWXY+XNv.....',
  '......kllnqssssstvxCIPRMHyurl................jnxEEFCAABCDEEFFGGHJLPSVVPJBvm.................lnuEHJGGLPRRSTUVWY+YRF......',
  '......immmorsssstuvxBINQNJDwtqn............lnuCFEDAyABCDDEEFFFFGGIKNRVWSMFzsq............klorAGLKHHMPRSSTUUVXZZULu......',
  '.......lnnmorsssstuvxAFKOPOJEzvtqpqonmnonquyDHHEAyyBBCCDDDDDDDEEFGHIKPUWWRMFByurronmmopoqtyCHLNKHJNPQRSTUUVWZYTNy.......',
  '........nponprsssttuvwyCFINQPNKGDBAyyyzBDGJLLHCyyzBCDEEDCCBBAAAzACEFHJMRUVUROLHEBAzzyzACFJMOPMJJLOQRRSTUUVWYYSOC........',
  '.........nrqoprssttuvvwxyAEHKNPQPONMMMNNONKHCzyzBBDEFEEFHJKLLJHEAyyzCFILNQSTUTSQPONNNNOPQQOMKKMOPQRSSTTUVWYWSPB.........',
  '..........pvroprstttuvwwxxyBCDFILMNONNMKGCAzzzABCDFGGGLQUUVVVVUTPHAwxAEHIKNPQRRSSSSSRQQONLLLMNPQRRSSTTTUWYWRRC..........',
  '...........rxtppqstttuvvwwxxyzABBCCCCCBAzzzzzABCEFGIMRTOFACyyCAGOSOHAwzDGHJLMNOPOPOOONMMMMNOPPQQRRSSTTUWWUSRE...........',
  '............rBztqqsttuvvvwwwwxxxyyyyyzzzzzzzABCEFHLSTJx..........vJSQGyxAEGIJKLMMMMNNNNNNOOPPPQQRRSSTUVURRSE............',
  '.............rDHAtqqsttuvvvvwwwwxxxxyyyyzzAABDEGJPTIv..............tGSNCyyBFHIJKLLMMMMMNNNOOPPQQQRSTUTRQSNy.............',
  '...............vJJAvrrstuuvvvwwwwxxxyyyyzAABCEJPTQy..................wNRLEzyBDGIJKLLLMMMNNOOPPQQRRRQPPSRD...............',
  '................oJQMEwsrsstuvvwwwwxxxxyyzABCGMTTHs....................pJTSLDzzADGHJKLLMMNNOOOPPPPNMNRUOu................',
  '..................zLQNGAwutttuuvvvwwxxyzBEJOSTKv........................wISRNIDBBCEFHIJKKLLLMLLLLNRTPD..................',
  '....................vFQSQMHECAzzzAABCFILQTUPFw............................vEOTSPMIGFEEEFGGHIKMPSUTHz....................',
  '.......................yAKQSSSRRRSSSTTSQKBu..................................tBJPTTTSRRRRSTTTRMDCq......................',
  '............................vxABAzzzyv............................................wzBDEEFCyxy...........................'
].join('');
const LOGO_CACHE={};
function logoGrid(nx,ny){
  const key=nx+'x'+ny;if(LOGO_CACHE[key])return LOGO_CACHE[key];
  const out=new Array(nx*ny).fill(-1);
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const ya=Math.floor(j*LOGO_H/ny),yb=Math.max(Math.floor((j+1)*LOGO_H/ny),ya+1),
          xa=Math.floor(i*LOGO_W/nx),xb=Math.max(Math.floor((i+1)*LOGO_W/nx),xa+1);
    let cnt=0,tot=0,sum=0;
    for(let r=ya;r<yb;r++)for(let c=xa;c<xb;c++){tot++;const ch=LOGO_PX[r*LOGO_W+c];if(ch!=='.'){cnt++;sum+=LOGO_B64.indexOf(ch)}}
    if(cnt/tot>=.5)out[j*nx+i]=Math.round(sum/cnt/63*255);
  }
  return LOGO_CACHE[key]=out;
}
// nhân màu hex với hệ số f
const mulc=(h,f)=>{const r=Math.min(255,((h>>16)&255)*f)|0,g=Math.min(255,((h>>8)&255)*f)|0,b=Math.min(255,(h&255)*f)|0;return(r<<16)|(g<<8)|b};
// logo tại tâm (cx,cy,cz), rộng LW, ô LS, dày dz, hướng mặt: 'z+' (mặc định) | 'z-' | 'x+' | 'x-'
// hex = null -> màu xám bạc đúng như logo gốc; hex = màu khác -> giữ đúng hình + đổ bóng sáng/tối theo logo gốc
function ring(v,cx,cy,cz,LW,LS,dz,hex,face){
  face=face||'z+';
  const nx=Math.round(LW/LS),ny=Math.round(nx/LOGO_ASPECT),LH=LW/LOGO_ASPECT,g=logoGrid(nx,ny);
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const l=g[j*nx+i];if(l<0)continue;
    const col=hex==null?((l<<16)|(l<<8)|l):mulc(hex,.7+.6*(l-69)/186);
    const u=(-.5+(i+.5)/nx)*LW,y=cy+(.5-(j+.5)/ny)*LH,w=LS*.95;
    if(face==='z+')v.cube(cx+u,y,cz,w,w,dz,col,i,j,0);
    else if(face==='z-')v.cube(cx-u,y,cz,w,w,dz,col,i,j,0);
    else if(face==='x+')v.cube(cx,y,cz-u,dz,w,w,col,i,j,0);
    else v.cube(cx,y,cz+u,dz,w,w,col,i,j,0);
  }
}

// dải đai quấn quanh đầu (bỏ phần phía trước để chừa chỗ cho kính), tâm (0,cy,0), bán kính rx/rz
function band(v,cy,rx,rz,h,th,hex,skip){
  const N=48;
  for(let n=0;n<N;n++){
    const t=n/N*Math.PI*2;
    if(Math.abs(Math.atan2(Math.sin(t),Math.cos(t)))<skip)continue;   // t=0 là hướng +z (mặt)
    v.cube(Math.sin(t)*rx,cy,Math.cos(t)*rz,th,h,th,hex,n,0,0);
  }
}

// ---------- BỆ VUÔNG (3 x 3 m, cao 1.4 m) ----------
function pedestal(){
  const v=new VB();
  v.box(0,.25,0,3,.5,3,(i,j,k)=>(j===0&&(i*7+k*3)%5===0)?MOSS[(i+k)&1]:ST(i,j,k),c(.25),true);   // đế
  v.box(0,.85,0,2.6,.7,2.6,ST,c(.13),true);                                                        // thân bệ
  v.box(0,1.3,0,2.8,.2,2.8,(i,j,k)=>(i<1||k<1||i>26||k>26)?G[1]:ST(i,j,k),c(.1),true);            // mặt bệ
  // dải đá đen chạy quanh cả 4 cạnh thân bệ, mỗi cạnh 1 logo vô cực
  v.box(0,.85,1.315,2.65,.5,.03,D,.03);v.box(0,.85,-1.315,2.65,.5,.03,D,.03);     // mặt trước / sau
  v.box(1.315,.85,0,.03,.5,2.6,D,.03);v.box(-1.315,.85,0,.03,.5,2.6,D,.03);       // mặt phải / trái
  ring(v,0,.85,1.34,.62,.02,.03,null,'z+');
  ring(v,0,.85,-1.34,.62,.02,.03,null,'z-');
  ring(v,1.34,.85,0,.62,.02,.03,null,'x+');
  ring(v,-1.34,.85,0,.62,.02,.03,null,'x-');
  return v;
}

// ---------- TƯỢNG TRÁI: chibi đầu tròn to, kính VR, nâng vòng vô cực ----------
function statueA(){
  const v=new VB();
  const HY=Y+2.55;   // tâm đầu
  // --- chân + bàn chân (ngắn, mập, tách nhau) ---
  for(const sx of[-1,1]){
    v.ell(sx*.3,Y+.08,.12,.27,.09,.36,ST,c(.06),true);          // bàn chân
    v.ell(sx*.3,Y+.5,0,.28,.5,.3,ST,c(.08),true);               // chân
  }
  // --- thân jumpsuit hình quả lê ---
  v.ell(0,Y+1.0,0,.68,.5,.46,ST,c(.08),true);                   // hông / bụng
  v.ell(0,Y+1.5,0,.6,.45,.44,ST,c(.08),true);                   // ngực
  v.box(0,Y+1.78,0,.5,.16,.42,ST,c(.06),true);                  // cổ áo đứng
  v.box(0,Y+1.72,.0,.34,.12,.3,STD,c(.06),true);                // cổ
  v.box(0,Y+1.42,.44,.05,.8,.03,D,.03);                         // khóa kéo
  v.box(0,Y+1.84,.2,.4,.04,.03,D,.03);                          // viền cổ áo
  v.box(-.3,Y+.95,.44,.04,.34,.03,D,.03);v.box(.3,Y+.95,.44,.04,.34,.03,D,.03);   // dây đai bụng
  v.box(-.2,Y+.78,.45,.04,.2,.03,D,.03);v.box(.2,Y+.78,.45,.04,.2,.03,D,.03);
  // --- đầu tròn rất to ---
  v.ell(0,HY,0,.8,.8,.78,ST,c(.07),true);
  // dây đeo kính quấn quanh đầu + miếng đệm hai bên
  band(v,HY+.04,.8,.78,.2,.12,GD[3],.95);
  for(const sx of[-1,1])v.box(sx*.8,HY+.04,.12,.12,.3,.4,STD,c(.05),true);
  // kính VR: hai thùy phồng + cầu nối giữa
  v.ell(-.28,HY+.04,.5,.42,.27,.32,STD,c(.05),true);
  v.ell(.28,HY+.04,.5,.42,.27,.32,STD,c(.05),true);
  v.box(0,HY+.04,.5,.5,.4,.3,STD,c(.05),true);
  ring(v,0,HY+.04,.84,.5,.025,.06,D);                            // logo vô cực trên kính
  // miệng cười nhỏ
  v.box(0,HY-.46,.66,.16,.03,.04,D,.02);v.box(-.1,HY-.43,.65,.05,.03,.04,D,.02);v.box(.1,HY-.43,.65,.05,.03,.04,D,.02);
  // --- hai tay: nâng vòng vô cực trước ngực ---
  for(const sx of[-1,1]){
    v.ell(sx*.68,Y+1.55,0,.24,.26,.26,ST,c(.06),true);          // vai
    v.box(sx*.74,Y+1.3,.05,.28,.5,.32,ST,c(.06),true);          // bắp tay
    v.box(sx*.58,Y+1.13,.36,.28,.26,.5,ST,c(.06),true);         // cẳng tay đưa ra trước
    v.box(sx*.4,Y+1.12,.5,.14,.04,.04,D,.02);                   // viền tay áo
    v.ell(sx*.31,Y+1.15,.64,.17,.16,.17,ST,c(.05),true);        // nắm tay
  }
  ring(v,0,Y+1.15,.66,.62,.03,.1,null);                           // vòng vô cực sáng giữa hai tay
  return v;
}

// ---------- TƯỢNG PHẢI: bóng ma kính đen, tóc ngọn lửa, hoodie, cầm laptop ----------
function statueB(){
  const v=new VB();
  const HY=Y+2.7;   // tâm đầu
  // --- chân dài + giày ---
  for(const sx of[-1,1]){
    v.ell(sx*.3,Y+.09,.16,.26,.1,.38,ST,c(.06),true);           // giày
    v.ell(sx*.28,Y+.65,0,.26,.6,.27,ST,c(.07),true);            // ống quần
  }
  // --- hoodie ---
  v.ell(0,Y+1.5,0,.7,.5,.44,ST,c(.08),true);                    // thân
  v.box(0,Y+1.12,0,1.3,.14,.82,ST,c(.07),true);                 // gấu áo
  v.ell(0,Y+1.85,0,.8,.3,.46,ST,c(.08),true);                   // vai
  v.ell(0,Y+2.0,-.2,.62,.3,.4,ST,c(.07),true);                  // mũ hoodie phía sau
  v.ell(0,Y+1.98,.12,.5,.2,.32,ST,c(.06),true);                 // viền mũ phía trước
  v.box(0,Y+1.82,.4,.3,.3,.04,STD,c(.05));                      // cổ áo thun bên trong
  v.box(-.1,Y+1.55,.45,.03,.3,.03,D,.03);v.box(.1,Y+1.55,.45,.03,.3,.03,D,.03);   // dây rút mũ
  v.box(0,Y+1.3,.45,.7,.22,.03,D,.03);                          // túi bụng
  // --- đầu trứng ---
  v.ell(0,HY,0,.58,.72,.54,ST,c(.06),true);
  // tóc ngọn lửa hất ra sau
  for(let k=0;k<7;k++){
    const t=k/6;
    v.ell(0,HY+.55+t*.65,-.08-t*t*.55,.46*(1-t*.6),.2,.4*(1-t*.55),ST,c(.05),true);
  }
  v.ell(-.22,HY+.62,.08,.14,.3,.14,ST,c(.05),true);v.ell(.24,HY+.58,.06,.14,.28,.13,ST,c(.05),true);   // lọn tóc mái
  for(const sx of[-1,1])v.ell(sx*.56,HY+.1,-.04,.1,.2,.12,ST,c(.04),true);                           // tai / tóc mai
  // --- kính đen: viền vô cực dày bao quanh mắt + gọng vòng ra sau ---
  ring(v,0,HY+.1,.36,.98,.03,.4,D);
  for(const sx of[-1,1])v.box(sx*.57,HY+.1,-.08,.08,.1,.7,D,.04);
  // miệng mếu
  v.box(0,HY-.4,.46,.16,.03,.04,D,.02);v.box(-.1,HY-.43,.45,.05,.03,.04,D,.02);v.box(.1,HY-.43,.45,.05,.03,.04,D,.02);
  // --- tay trái (người xem): thumbs-up ---
  v.ell(-.78,Y+1.8,0,.24,.26,.26,ST,c(.06),true);               // vai
  v.box(-.82,Y+1.6,0,.3,.7,.4,ST,c(.06),true);                  // bắp tay
  v.box(-.58,Y+1.42,.38,.3,.28,.6,ST,c(.06),true);              // cẳng tay co lên
  v.ell(-.4,Y+1.5,.7,.17,.16,.17,ST,c(.05),true);               // nắm tay
  v.ell(-.4,Y+1.74,.7,.06,.14,.06,ST,c(.04),true);              // ngón cái dựng lên
  // --- tay phải (người xem): đỡ laptop ---
  v.ell(.78,Y+1.8,0,.24,.26,.26,ST,c(.06),true);                // vai
  v.box(.82,Y+1.6,0,.3,.7,.4,ST,c(.06),true);                   // bắp tay
  v.box(.7,Y+1.3,.38,.3,.26,.6,ST,c(.06),true);                 // cẳng tay
  v.ell(.62,Y+1.22,.78,.17,.14,.17,ST,c(.05),true);             // bàn tay đỡ dưới laptop
  // laptop: đế bàn phím gần người, màn hình dựng ra xa & ngả nhẹ về sau
  v.box(.8,Y+1.35,.9,.9,.07,.7,GD[0],c(.05),true);              // thân laptop
  for(let i=0;i<8;i++)for(let j=0;j<3;j++)                      // phím
    v.box(.8-.34+i*.097,Y+1.4,.7+j*.1,.07,.03,.07,GD[3],.03);
  for(let j=0;j<9;j++)                                          // màn hình dựng lên, ngả ra sau
    v.box(.8,Y+1.4+j*.085,1.23+j*.035,.9,.09,.05,j<1?D:(j%2?GD[1]:GD[2]),.045);
  v.box(.8,Y+1.78,1.4,.78,.62,.02,D,.03);                       // mặt màn hình tối (hướng về người đứng)
  return v;
}

const add=m=>{S.add(m);meshes.push(m)};   // meshes: để đạn để lại vết trên đá

function build(){
  for(const [sx,mk] of[[-1,statueA],[1,statueB]]){
    const x=sx*STA.x,z=STA.z;
    for(const pm of pedestal().meshLOD()){pm.position.set(x,0,z);add(pm)}
    const k=STA.k;
    for(const sm of mk().meshLOD()){
      sm.scale.set(k,k,k);
      sm.position.set(x,Y*(1-k),z);          // phóng to quanh mặt bệ: chân tượng vẫn đứng đúng trên bệ
      sm.rotation.y=-sx*STA.turn;add(sm);
    }
    // va chạm: bệ 3x3 + thân tượng (đã nhân hệ số k)
    boxes.push({x0:x-1.5,x1:x+1.5,y0:0,y1:Y,z0:z-1.5,z1:z+1.5});
    boxes.push({x0:x-1.0*k,x1:x+1.0*k,y0:Y,y1:Y+4*k,z0:z-.8*k,z1:z+.9*k});
  }
}
build();
window.Statues={build};
})();