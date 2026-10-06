// Hai bệ vuông đỡ tượng đá (thay cho 2 khối hồng bk(±8,0,6,2,3.5,2,PK) cũ trong world.js).
// Bên TRÁI: tượng chibi đầu tròn to, kính VR, hai tay nâng vòng vô cực. Bên PHẢI: "bóng ma" tóc ngọn lửa, kính đen, hoodie, cầm laptop.
// + đèn pha đặt trên mặt đất PHÍA TRƯỚC mỗi tượng, chiếu sáng toàn thân tượng, tự bật khi trời tối (chỉnh ở LAMP).
// + TƯỢNG QUAY MẶT VỀ PHÍA SÔNG: lúc dựng chưa có sông (nature/ dựng SAU) nên tạm quay về -z (STA.face), khi sông dựng xong
//   thì tự xoay về điểm sông gần nhất và dời đèn pha theo (đèn tự lùi lại nếu rơi xuống nước). Tắt: STA.toRiver=false.
// Nạp SAU pavilion.js, TRƯỚC nature.js (xem loader.js). Chỉnh nhanh ở STA / Q bên dưới.
(function(){
const STA={
  x:8*MAPK,z:6*MAPK,   // vị trí 2 bệ
  face:Math.PI,        // hướng mặt tượng khi CHƯA biết sông (rad, quanh trục y): PI = quay về -z (sông nằm phía -z của 2 bệ)
  toRiver:true,        // true = khi sông dựng xong, tự xoay mặt tượng về phía điểm sông gần nhất
  faceOffset:0,        // lệch thêm sau khi quay về sông (rad). VD .3 = chếch sang một bên
  k:2                  // hệ số phóng to tượng (bệ giữ nguyên). 1 = cỡ cũ, 2 = gấp đôi
};
// ---------- ĐÈN PHA PHÍA TRƯỚC TƯỢNG ----------
const LAMP={
  on:true,             // false = tắt hết đèn
  n:1,                 // số đèn pha mỗi tượng (1 = một đèn giữa trước mặt, 2 = hai bên, 3 = hai bên + giữa...)
  dist:7,              // khoảng cách TỐI ĐA từ tâm bệ ra phía trước mặt tượng (m)
  minDist:3.5,         // gần nhất (m): nếu 7m rơi xuống sông thì đèn tự lùi dần vào bờ, nhưng không gần hơn mức này
  shore:1.0,           // đèn phải cách mép nước ít nhất bấy nhiêu mét
  side:2.6,            // độ lệch sang hai bên (m) khi n >= 2
  aimY:4.2,            // độ cao điểm đèn hướng tới (m, tính từ mặt bệ) ~ giữa thân tượng
  spread:24,           // độ loe TỐI THIỂU của chùm sáng nhìn thấy (độ); đèn càng gần tượng chùm càng tự loe rộng để phủ hết thân
  beamOpacity:.22,     // độ đậm chùm sáng nhìn thấy (0 = ẩn chùm)
  glow:1.8,            // kích thước quầng sáng ở đầu đèn
  pulse:true,          // sáng nhấp nhô nhẹ
  auto:true,           // TỰ BẬT/TẮT THEO NGÀY-ĐÊM của game (DayCycle). false = luôn sáng
  onAt:.2,             // độ tối (DayCycle.cur.lamp, 0 = ban ngày .. 1 = đêm) bắt đầu sáng đèn (~17h30)
  fullAt:.7,           // độ tối để đèn sáng hết cỡ; ban mai đèn tắt dần theo chiều ngược lại (~5h30 -> 7h)
  realLights:'auto',   // SpotLight thật chiếu lên đá: 'auto' (PC có, điện thoại tắt) | true | false
  lightPower:1.5,      // cường độ SpotLight
  lightRange:26,       // tầm chiếu (m)
  color:0xffc878       // màu ánh sáng (ấm)
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

// ---------- ĐÈN PHA: thân voxel trên mặt đất + chùm sáng + SpotLight thật ----------
// Chỉ phần đế đèn nằm trong meshes (đạn để lại vết); chùm sáng/quầng sáng tắt raycast nên đạn xuyên qua.
const FX={beams:[],glows:[],lights:[],lens:[],run:false,tex:null};
const LENS_ON=new THREE.Color(0xfff2cc),LENS_OFF=new THREE.Color(0x3a3a42);   // mặt kính: sáng / tắt
const ssm=(a,b,x)=>{x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x)};
// độ sáng của đèn theo ngày-đêm: k = độ tối của game (cùng biến các đèn lồng/đèn đá khác dùng), f = 0 (tắt) .. 1 (sáng hết)
function nightF(){
  const D=window.DayCycle;
  if(!LAMP.auto||!D||!D.cur)return{k:1,f:1};
  return{k:D.cur.lamp,f:ssm(LAMP.onAt,LAMP.fullAt,D.cur.lamp)};
}
function fxTick(t){
  if(!FACED&&ST_LIST.length)FACED=faceRiver();   // chờ sông dựng xong rồi xoay tượng về phía sông (chỉ làm 1 lần)
  const s=t*.001,n=nightF(),f=n.f,P=LAMP.pulse;
  for(const b of FX.beams){b.m.opacity=b.base*f*(P?.93+.07*Math.sin(s*1.6):1);b.m.visible=f>.01}
  for(const g of FX.glows){const q=P?1+.06*Math.sin(s*2.1+g.ph):1;g.sp.scale.set(g.base*q,g.base*q,1);g.sp.material.opacity=f;g.sp.visible=f>.01}
  // SpotLight: ban ngày gỡ hẳn khỏi shader (cùng ngưỡng với đèn lồng của DayCycle) để đỡ nặng
  for(const l of FX.lights){l.L.intensity=l.base*f*(P?.95+.05*Math.sin(s*2.1+l.ph):1);l.L.visible=n.k>.03}
  for(const m of FX.lens)m.color.copy(LENS_OFF).lerp(LENS_ON,f);
}
function fxStart(){
  if(FX.run)return;FX.run=true;
  (function loop(t){requestAnimationFrame(loop);fxTick(t)})(performance.now());
}
const noRay=m=>{m.raycast=function(){};return m};
function glowTex(){
  if(FX.tex)return FX.tex;
  const cv=document.createElement('canvas');cv.width=cv.height=128;
  const g=cv.getContext('2d'),gr=g.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,'rgba(255,248,225,1)');gr.addColorStop(.2,'rgba(255,214,140,.7)');
  gr.addColorStop(.55,'rgba(255,170,70,.2)');gr.addColorStop(1,'rgba(255,140,40,0)');
  g.fillStyle=gr;g.fillRect(0,0,128,128);
  return FX.tex=new THREE.CanvasTexture(cv);
}
// chùm sáng: nón hở, hẹp ở đèn, loe dần, mờ dần về 0 (cộng sáng nên tối = trong suốt); trục dọc theo +z cục bộ
function beamGeo(len,r0,r1){
  const g=new THREE.CylinderGeometry(r1,r0,len,28,8,true);
  g.translate(0,len/2,0);
  const p=g.attributes.position,col=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
    const f=Math.pow(1-p.getY(i)/len,1.5);
    col[i*3]=f;col[i*3+1]=.8*f;col[i*3+2]=.45*f;
  }
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  g.rotateX(Math.PI/2);   // +y -> +z
  return g;
}
const addMat=extra=>new THREE.MeshBasicMaterial(Object.assign({transparent:true,blending:THREE.AdditiveBlending,
  depthWrite:false,fog:false},extra));

// ---------- QUAY TƯỢNG VỀ PHÍA SÔNG ----------
const ST_LIST=[];let FACED=false;
// sông chính của tầng 1 (Nature dựng SAU file này, nên chỉ có khi game đã nạp xong tầng 1)
function riverOf(){
  const N=window.Nature;if(!N||!N.has||!N.has(0)||!N.floors)return null;
  const Fl=N.floors.find(q=>q.f===0);
  return Fl&&Fl.lakes?(Fl.lakes.find(l=>!l.pool&&!l.ice&&l.rho)||null):null;
}
function faceRiver(){
  if(!STA.toRiver)return true;
  const lk=riverOf();if(!lk)return false;
  const e=.5;
  for(const st of ST_LIST){
    // rho tăng dần khi đi xa lòng sông => hướng ngược gradient chính là hướng tới sông gần nhất
    const gx=lk.rho(st.x+e,st.z)-lk.rho(st.x-e,st.z),gz=lk.rho(st.x,st.z+e)-lk.rho(st.x,st.z-e);
    if(Math.hypot(gx,gz)<1e-6)continue;
    st.psi=Math.atan2(-gx,-gz)+STA.faceOffset;
    applyFace(st);
  }
  if(window.BXG&&BXG.dirty)BXG.dirty();   // va chạm của đèn đã dời chỗ -> physics dựng lại lưới
  return true;
}
function applyFace(st){
  for(const m of st.meshes)m.rotation.y=st.psi;
  placeLamps(st);
}
const wetAt=(x,z)=>{const N=window.Nature;return !!(N&&N.wetAt&&N.has&&N.has(0)&&N.wetAt(0,x,z,LAMP.shore))};

// ---------- ĐÈN PHA: thân voxel trên mặt đất + chùm sáng + SpotLight thật ----------
// Đặt/dời đèn theo hướng mặt tượng st.psi (front = (sin psi, cos psi)); lùi vào bờ nếu rơi xuống nước.
function placeLamps(st){
  const fx=Math.sin(st.psi),fz=Math.cos(st.psi),rx=Math.cos(st.psi),rz=-Math.sin(st.psi);
  for(const lp of st.lamps){
    let d=LAMP.dist;
    while(d>LAMP.minDist&&wetAt(st.x+fx*d+rx*lp.off,st.z+fz*d+rz*lp.off))d-=.5;
    d=Math.max(d,LAMP.minDist);
    const lx=st.x+fx*d+rx*lp.off,lz=st.z+fz*d+rz*lp.off;
    for(const m of lp.base)m.position.set(lx,0,lz);
    Object.assign(lp.box,{x0:lx-.45,x1:lx+.45,z0:lz-.45,z1:lz+.45});
    lp.gp.position.set(lx,1.05,lz);lp.gp.lookAt(st.aim);
    const dir=st.aim.clone().sub(lp.gp.position).normalize();
    lp.sp.position.copy(lp.gp.position).addScaledVector(dir,.35);
    // chùm sáng nhìn thấy: dài theo khoảng cách, loe đủ rộng để phủ cả chiều cao tượng
    const len=d+1.5,th=Math.max(LAMP.spread*Math.PI/180,Math.atan(4.8/d)*.8);
    const kz=len/lp.len0,kxy=len*Math.tan(th)/(lp.len0*Math.tan(LAMP.spread*Math.PI/180));
    for(const b of lp.beams){b.scale.set(kxy,kxy,kz);b.position.z=.3*kz}
    if(lp.L){
      lp.L.position.copy(lp.gp.position).addScaledVector(dir,.4);
      lp.L.angle=Math.min(1.25,Math.atan(5.2/d)+.12);   // càng gần tượng càng cần góc rộng để chiếu tới đỉnh đầu
    }
  }
}
function lampFX(st){
  if(!LAMP.on)return;
  const aim=st.aim=new THREE.Vector3(st.x,Y+LAMP.aimY,st.z);
  const useLights=LAMP.realLights==='auto'?!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent):!!LAMP.realLights;
  const len0=LAMP.dist+1.5,r1=len0*Math.tan(LAMP.spread*Math.PI/180);
  const gOut=beamGeo(len0,.2,r1),gIn=beamGeo(len0*.85,.15,r1*.55);
  const mOut=addMat({vertexColors:true,opacity:LAMP.beamOpacity*.7,side:THREE.DoubleSide});
  const mIn=addMat({vertexColors:true,opacity:LAMP.beamOpacity,side:THREE.DoubleSide});
  FX.beams.push({m:mOut,base:LAMP.beamOpacity*.7},{m:mIn,base:LAMP.beamOpacity});
  const lensGeo=new THREE.BoxGeometry(.5,.3,.02),lensMat=new THREE.MeshBasicMaterial({color:0xfff2cc,fog:false});FX.lens.push(lensMat);
  const N=Math.max(1,LAMP.n|0);
  for(let i=0;i<N;i++){
    const lp={off:N===1?0:-LAMP.side+2*LAMP.side*i/(N-1),len0,base:[],beams:[],box:{x0:0,x1:0,y0:0,y1:.85,z0:0,z1:0},L:null};
    // đế + trụ đèn (đứng trên mặt đất) - vị trí đặt ở placeLamps
    const bv=new VB();
    bv.box(0,.2,0,.9,.4,.9,ST,c(.1),true);          // bệ đá nhỏ
    bv.box(0,.62,0,.16,.45,.16,D,.03);              // trụ
    for(const m of bv.meshLOD()){add(m);lp.base.push(m)}
    boxes.push(lp.box);
    // đầu đèn: nhóm xoay về phía tượng (+z cục bộ = hướng chiếu)
    const gp=lp.gp=new THREE.Group();S.add(gp);
    const hv=new VB();
    hv.box(0,0,0,.7,.45,.5,GD[2],.03);              // thân đèn
    hv.box(0,0,.26,.7,.45,.04,D,.03);               // viền mặt đèn
    hv.box(0,.27,-.02,.74,.05,.56,D,.03);           // nắp che trên
    for(const m of hv.meshLOD())gp.add(m);
    const lens=noRay(new THREE.Mesh(lensGeo,lensMat));lens.position.z=.285;gp.add(lens);   // mặt kính phát sáng
    for(const [g,mat] of[[gOut,mOut],[gIn,mIn]]){const b=noRay(new THREE.Mesh(g,mat));b.renderOrder=2;gp.add(b);lp.beams.push(b)}
    // quầng sáng (luôn quay về camera) ngay trước mặt đèn
    const sp=lp.sp=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex(),blending:THREE.AdditiveBlending,
      transparent:true,depthWrite:false,fog:false}));
    sp.scale.set(LAMP.glow,LAMP.glow,1);noRay(sp);S.add(sp);
    FX.glows.push({sp,base:LAMP.glow,ph:i*1.9});
    // ánh sáng thật chiếu lên thân tượng
    if(useLights){
      const L=lp.L=new THREE.SpotLight(LAMP.color,LAMP.lightPower,LAMP.lightRange,.62,.55,1);
      L.target.position.copy(aim);S.add(L);S.add(L.target);
      FX.lights.push({L,base:LAMP.lightPower,ph:i*1.3});
    }
    st.lamps.push(lp);
  }
  placeLamps(st);
}

const add=m=>{S.add(m);meshes.push(m)};   // meshes: để đạn để lại vết trên đá

function build(){
  FX.beams.length=FX.glows.length=FX.lights.length=FX.lens.length=0;ST_LIST.length=0;FACED=false;   // dựng lại (đổi tầng...) -> bỏ đăng ký của lần trước
  for(const [sx,mk] of[[-1,statueA],[1,statueB]]){
    const x=sx*STA.x,z=STA.z,k=STA.k,st={sx,x,z,psi:STA.face,meshes:[],lamps:[]};
    for(const pm of pedestal().meshLOD()){pm.position.set(x,0,z);add(pm)}
    for(const sm of mk().meshLOD()){
      sm.scale.set(k,k,k);
      sm.position.set(x,Y*(1-k),z);          // phóng to quanh mặt bệ: chân tượng vẫn đứng đúng trên bệ
      sm.rotation.y=st.psi;add(sm);st.meshes.push(sm);
    }
    ST_LIST.push(st);
    lampFX(st);   // đèn pha phía trước tượng
    // va chạm: bệ 3x3 + thân tượng (đã nhân hệ số k)
    boxes.push({x0:x-1.5,x1:x+1.5,y0:0,y1:Y,z0:z-1.5,z1:z+1.5});
    boxes.push({x0:x-1.0*k,x1:x+1.0*k,y0:Y,y1:Y+4*k,z0:z-.8*k,z1:z+.9*k});
  }
  fxTick(performance.now());   // đặt đúng trạng thái ngay khung đầu (không chớp)
  fxStart();
}
build();
window.Statues={build,LAMP};
})();