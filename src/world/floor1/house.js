// Nhà rubik "CMC Infinity Residence" - NHÀ NHẬT TRUYỀN THỐNG 2 TẦNG (rừng tre)
// Tầng 1: hiên (engawa) + phòng trà, bếp, kotatsu, tansu, kệ sách, bình phong...  Cầu thang gỗ trong nhà lên tầng 2.
// Tầng 2: có ban công lan can quanh nhà, phòng làm việc (dãy 6 máy tính), sofa, kệ sách...
// Mái ngói đá phiến 2 tầng (mái dưới + mái trên cong góc), đèn lồng / đèn treo phát sáng vàng (có quầng sáng + vài PointLight).
// Nạp SAU voxel.js, TRƯỚC nature.js để cây / đá / sông tự né nhà (xem keepOuts trong nature.js).
(function(){
const HX=0,HZ=15.5;                 // tâm nhà (x,z) trên sàn tầng 1
// QUAY MẶT NHÀ VỀ PHÍA SÔNG: sông tầng 1 chạy ngang bản đồ ở phía -z của nhà, nên xoay cả căn nhà 180° quanh tâm (HX,HZ):
// mặt tiền (hiên, bậc thang, biển hiệu logo) hướng -z (về sông), lưng nhà hướng +z. false = như cũ (mặt tiền +z).
// Mọi toạ độ bên dưới vẫn viết theo hệ cục bộ cũ; chỉ lúc đặt mesh / va chạm / đèn / che khuất mới đảo dấu (biến sg).
const FACE_RIVER=true;
const sg=FACE_RIVER?-1:1;           // -1 = đã xoay 180°: (x,z) cục bộ -> (HX-x, HZ-z)
const F=3.5;                        // (giữ tên cũ) mặt tiền ở z=+ cục bộ
const FL=.875, WT=3.375, RY=3.625;  // TẦNG 1: mặt sàn hiên · đỉnh tường · chân mái dưới
const RZ=-.25;                      // tâm z của mái dưới
const GF=FL+.125;                   // mặt chiếu tatami tầng 1 (=1.0)
const FL2=4.75, WT2=7.25, RY2=7.5;  // TẦNG 2: mặt sàn · đỉnh tường · chân mái trên
const RZ2=-.375;                    // tâm z của mái trên
// giếng cầu thang (khoét qua trần tầng 1, mái dưới và sàn tầng 2)
// Giếng thang. FIX 1: x1 = -1.5 (cũ -2.0) trong khi chân thang vẫn ở SX = -2.0 -> chừa .5m trống trên đầu chân thang.
//   Trước đây mép trần tầng 1 (y 3.375) nằm đúng x = -2.0: khi chân người chơi (bán kính .35) chạm bậc 3 thì đầu đã chui vào mép trần,
//   physics.js đẩy người chơi ra mép xa của khối trần dài (x ~ 6.35) -> bị "dịch chuyển" ra khỏi nhà.
const H={x0:-5.75,x1:-1.5,z0:-2.75,z1:-1.5};
const SX=-2.0;                      // x của chân thang (bậc đầu tiên)
const inH=(x,z)=>x>H.x0&&x<H.x1&&z>H.z0&&z<H.z1;
const GLOW_LIGHTS=true;             // true = thêm vài PointLight vàng trong nhà (tắt nếu thấy nặng)

// ---------- BẢNG MÀU ----------
const PLANK=[0x4a2e1e,0x3f2618,0x553522,0x38220f];
const POST=0x6b2d1c, RED=0x8a3b22, RED2=0x9c4a2c, DARK=0x2a1a10;
const STONE=[0x5a5a5a,0x6a6a6a,0x4c4c4c,0x777777,0x3e3e3e];
const ROOF=[0x2b2b33,0x22222a,0x1c1c22];
const TRIM=[0x8a8a8a,0x767676,0x9a9a9a];
const PAPER=0xe8dcb8;
const WOODC=[0x8a5a34,0x7d5030,0x946238];
const WD=(i,j,k)=>WOODC[(i*3+j+k*5)%3];
const GLOW=0xffd25a, GLOW2=0xffe58a, GLOW3=0xfff1b0;     // màu "phát sáng"
const BK=[0x8a2f2f,0x2f5a8a,0x2f7a4f,0xc9a227,0x6a3a8a,0x3a3a3a,0xd9d2c0,0xb5651d];
const LEAF=(i,j,k)=>[0x3d7a3f,0x4f8a4a,0x6aa85d][(i+j*2+k)%3];

const mix=(a,b,t)=>{const r=((a>>16)&255)*(1-t)+((b>>16)&255)*t,g=((a>>8)&255)*(1-t)+((b>>8)&255)*t,l=(a&255)*(1-t)+(b&255)*t;return((r|0)<<16)|((g|0)<<8)|(l|0)};
const GRN=(a,b,c)=>(i,j,k)=>[a,b,c][(i+j*2+k)%3];
const isP=(x,ps)=>ps.some(p=>Math.abs(x-p)<.13);
const cf=c=>typeof c==='function'?c:()=>c;

// ---------- LOGO (lấy mẫu trực tiếp từ ảnh gốc: vòng số 8 kim loại) ----------
// Lưới 120x66, '.' = trống, ký tự khác = độ sáng xám (0..63) -> giữ đúng hình dạng, độ cong và sắc độ của ảnh.
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
function logo(v,cx,cy,cz,LW,isBack=false){
  const LS=.05,nx=Math.round(LW/LS),ny=Math.round(nx/LOGO_ASPECT),LH=LW/LOGO_ASPECT,g=logoGrid(nx,ny);
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const l=g[j*nx+i];if(l<0)continue;
    const hex=(l<<16)|(l<<8)|l,x=(isBack?.5-(i+.5)/nx:-.5+(i+.5)/nx)*LW,y=(.5-(j+.5)/ny)*LH;   // isBack: nhìn từ phía sau nên lật ngang để đúng chiều như mặt trước
    if(isBack)v.cube(cx+x,cy+y,cz,-LS*.95,LS*.95,.12,hex,i,j,0);
    else v.cube(cx+x,cy+y,cz,LS*.95,LS*.95,.12,hex,i,j,0);
  }
}

const FONT={C:['.###.','#...#','#....','#....','#....','#...#','.###.'],M:['#...#','##.##','#.#.#','#...#','#...#','#...#','#...#'],
  I:['#####','..#..','..#..','..#..','..#..','..#..','#####'],N:['#...#','##..#','#.#.#','#..##','#...#','#...#','#...#'],
  F:['#####','#....','#....','####.','#....','#....','#....'],T:['#####','..#..','..#..','..#..','..#..','..#..','..#..'],
  Y:['#...#','#...#','.#.#.','..#..','..#..','..#..','..#..'],R:['####.','#...#','#...#','####.','#.#..','#..#.','#...#'],
  E:['#####','#....','#....','####.','#....','#....','#####'],S:['.####','#....','#....','.###.','....#','....#','####.'],
  D:['####.','#...#','#...#','#...#','#...#','#...#','####.'],
  P:['####.','#...#','#...#','####.','#....','#....','#....'],
  O:['.###.','#...#','#...#','#...#','#...#','#...#','.###.'],
  W:['#...#','#...#','#...#','#.#.#','##.##','#...#','#...#'],
  B:['####.','#...#','#...#','####.','#...#','#...#','####.'],
  L:['#....','#....','#....','#....','#....','#....','#####']};
function text(v,str,cx,cy,cz,cs,hex){
  const x0=cx-(str.length*6-1)*cs/2;
  for(let a=0;a<str.length;a++){const g=FONT[str[a]];if(!g)continue;
    for(let r=0;r<7;r++)for(let b=0;b<5;b++)if(g[r][b]==='#')v.box(x0+(a*6+b+.5)*cs,cy+(3-r)*cs,cz,cs,cs,.02,hex,cs)}
}

// ---------- QUẦNG SÁNG CHO ĐÈN ----------
let glowTexCache=null;
function glowTex(){
  if(glowTexCache)return glowTexCache;
  const cv=document.createElement('canvas');cv.width=cv.height=64;
  const g=cv.getContext('2d'),gr=g.createRadialGradient(32,32,2,32,32,32);
  gr.addColorStop(0,'rgba(255,236,160,.95)');gr.addColorStop(.35,'rgba(255,205,95,.40)');gr.addColorStop(1,'rgba(255,180,60,0)');
  g.fillStyle=gr;g.fillRect(0,0,64,64);
  return glowTexCache=new THREE.CanvasTexture(cv);
}
const prevObjs=[];   // sprite / light của lần dựng trước (để rebuild không bị nhân đôi)
// ---------- BIỂN HIỆU PHÁT SÁNG TRẮNG KHI TRỜI TỐI ----------
// Logo + chữ POWERED BY RLNC ở bảng trước nhà có thêm 1 BẢN PHỦ cùng hình dạng, vẽ bằng vật liệu KHÔNG ăn đèn (Basic), giống mắt bot (bot-model.js).
//   · ban ngày (nightK <= .25): visible=false -> không vẽ, thấy bảng như cũ
//   · hoàng hôn / rạng đông (.25 -> .9): sáng dần / tắt dần
//   · đêm (>= .9): sáng TRẮNG trung tính (r=g=b), giữ nguyên sắc độ trắng như ban ngày
// Đổi độ chói: sửa SIGNG (r=g=b để giữ màu trắng). Đổi lúc bắt đầu sáng: tham số .25 / .9.
const SIGNG=[1.2,1.2,1.2];
const SIGNGLOW=new THREE.MeshBasicMaterial({vertexColors:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
SIGNGLOW.visible=false;
if(window.DayCycle&&DayCycle.glow)DayCycle.glow(SIGNGLOW,[1,1,1],SIGNG,.25,.9);
else(function signLoop(){
  requestAnimationFrame(signLoop);
  const dc=window.DayCycle,k=dc&&dc.cur?dc.cur.lamp:0;
  if(!(k>.25)){SIGNGLOW.visible=false;return}
  const t=Math.min(1,(k-.25)/.65),s=t*t*(3-2*t);
  SIGNGLOW.visible=true;SIGNGLOW.color.setRGB(1+(SIGNG[0]-1)*s,1+(SIGNG[1]-1)*s,1+(SIGNG[2]-1)*s);
})();

// ---------- CHAT DISCORD TRÊN MÀN HÌNH ----------
// Mỗi màn hình = 1 kênh Discord, hiện 5 tin gần nhất dạng "tên: nội dung". Dữ liệu đến từ house-chat-server (xem house-chat-server/server.js) qua WebSocket.
// Thứ tự CHAT_KEYS = thứ tự máy: 6 máy tường sau (trái->phải), 2 máy tường đông, 2 máy tường trước. Tên phải trùng key trong house-chat-server/channels.json.
// Đổi địa chỉ server chat của nhà: đặt window.HOUSE_CHAT_URL = 'wss://...' trước khi nạp file này.
const CHAT_KEYS=['vietnamese','russian','nigerian','bengali','indonesian','hindi','mandarin','filipino','ukrainian','korean'];
const CHAT_URL=window.HOUSE_CHAT_URL||'ws://localhost:8787';
const CHAT_MAX=5;
// chữ trạng thái trên màn hình: [đang kết nối, chưa có tin] - mỗi kênh dùng đúng ngôn ngữ của kênh đó
const CHAT_TXT={
  vietnamese:['Đang kết nối…','Chưa có tin nhắn'],
  russian:['Подключение…','Сообщений пока нет'],
  nigerian:['E dey connect…','No message dey yet'],
  bengali:['সংযোগ হচ্ছে…','এখনও কোনো বার্তা নেই'],
  indonesian:['Menghubungkan…','Belum ada pesan'],
  hindi:['कनेक्ट हो रहा है…','अभी कोई संदेश नहीं'],
  mandarin:['正在连接…','暂无消息'],
  filipino:['Kumokonekta…','Wala pang mensahe'],
  ukrainian:['Підключення…','Повідомлень ще немає'],
  korean:['연결 중…','메시지가 없습니다']
};
const CHAT_FONT='"Segoe UI","Noto Sans","Noto Sans Devanagari","Noto Sans Bengali","Noto Sans SC","Malgun Gothic",sans-serif';
const CHAT={},SURF={};
for(const k of CHAT_KEYS)CHAT[k]={msgs:[],ok:false};
const nameCol=n=>{let h=0;for(const c of n)h=(h*31+c.codePointAt(0))>>>0;return 'hsl('+(h%360)+',70%,68%)'};
function wrapText(g,text,w0,w1){            // ngắt dòng theo từ, không có khoảng trắng (CJK) thì ngắt theo ký tự
  const out=[];let cur='',lim=w0;
  for(const ch of text){
    if(g.measureText(cur+ch).width>lim){
      const cut=cur.lastIndexOf(' ');
      if(cut>0&&ch!==' '){out.push(cur.slice(0,cut));cur=cur.slice(cut+1)+ch}
      else{out.push(cur);cur=ch.trim()?ch:''}
      lim=w1;
    }else cur+=ch;
  }
  out.push(cur);return out;
}
function drawChat(k){
  const s=SURF[k];if(!s)return;
  const g=s.g,W=s.cv.width,H=s.cv.height,c=CHAT[k];
  g.fillStyle='#313338';g.fillRect(0,0,W,H);
  g.fillStyle='#2b2d31';g.fillRect(0,0,W,32);
  g.textBaseline='middle';g.textAlign='left';
  g.font='bold 17px '+CHAT_FONT;g.fillStyle='#f2f3f5';g.fillText('# '+k,12,17);
  g.fillStyle=c.ok?'#23a55a':'#f23f43';g.beginPath();g.arc(W-16,16,5,0,Math.PI*2);g.fill();
  const LH=19;let y=32+8+LH/2;
  if(!c.msgs.length){
    g.font='15px '+CHAT_FONT;g.fillStyle='#949ba4';g.fillText((CHAT_TXT[k]||CHAT_TXT.vietnamese)[c.ok?1:0],12,y);
  }else for(const m of c.msgs){
    const name=m.author+': ';
    g.font='bold 15px '+CHAT_FONT;const wp=g.measureText(name).width;
    g.font='15px '+CHAT_FONT;
    let lines=wrapText(g,m.content,W-24-wp,W-24);
    if(lines.length>2){lines=lines.slice(0,2);lines[1]=lines[1].replace(/.{0,2}$/,'')+'…'}
    g.font='bold 15px '+CHAT_FONT;g.fillStyle=nameCol(m.author);g.fillText(name,12,y);
    g.font='15px '+CHAT_FONT;g.fillStyle='#dbdee1';
    lines.forEach((ln,i)=>{g.fillText(ln,i?12:12+wp,y);y+=LH});
  }
  s.tex.needsUpdate=true;
}
(function connectChat(){
  if(window.__houseChatWS)return;
  let delay=1000;
  const setOk=ok=>{for(const k of CHAT_KEYS){CHAT[k].ok=ok;drawChat(k)}};
  const open=()=>{
    let ws;try{ws=new WebSocket(CHAT_URL)}catch(e){return}
    window.__houseChatWS=ws;
    ws.onopen=()=>{delay=1000;setOk(true)};
    ws.onmessage=e=>{
      let d;try{d=JSON.parse(e.data)}catch(_){return}
      const c=CHAT[d.channel];if(!c)return;
      if(d.type==='history')c.msgs=(d.messages||[]).slice(-CHAT_MAX);
      else if(d.type==='message'){c.msgs.push({author:String(d.author),content:String(d.content)});if(c.msgs.length>CHAT_MAX)c.msgs.shift()}
      drawChat(d.channel);
    };
    ws.onclose=()=>{setOk(false);setTimeout(open,delay);delay=Math.min(delay*2,30000)};
    ws.onerror=()=>{try{ws.close()}catch(_){}};
  };
  open();
})();

function buildHouse(hx,hz){
  for(const o of prevObjs){try{S.remove(o)}catch(e){}const k=meshes.indexOf(o);if(k>=0)meshes.splice(k,1)}
  prevObjs.length=0;

  const v=new VB();
  const screens=[];                     // vị trí các màn hình chat theo thứ tự tạo (khớp CHAT_KEYS)
  const addScreen=(x,y,z,ry)=>screens.push({x,y,z,ry});
  const lamps=[];                       // đèn phát sáng: {x,y,z,s,light}
  // hộp voxel theo toạ độ min/max
  const fb=(x0,x1,y0,y1,z0,z1,c,s=.25)=>v.box((x0+x1)/2,(y0+y1)/2,(z0+z1)/2,x1-x0,y1-y0,z1-z0,c,s);
  // hộp voxel có hàm màu theo toạ độ thật (x,y,z) + chỉ số (i,j,k); trả -1 = trống
  const fp=(x0,x1,y0,y1,z0,z1,s,fn)=>fb(x0,x1,y0,y1,z0,z1,
    (i,j,k)=>fn(x0+(i+.5)*s,y0+(j+.5)*s,z0+(k+.5)*s,i,j,k),s);
  const ell=(x,y,z,rx,ry,rz,c,s=.05)=>v.ell(x,y,z,rx,ry,rz,cf(c),s);
  const tips=(hw,hd,rzc,y)=>{for(const sx of[-1,1])for(const sz of[-1,1]){
    const xa=sx>0?hw-.25:-hw-.25,zc=rzc+sz*hd;
    fb(xa,xa+.5,y,y+.5,zc-.25,zc+.25,(i,j,k)=>TRIM[(i+j+k)%3],.125);}};

  // ---------- ĐÈN TREO PHÁT SÁNG ----------
  // đèn lồng tròn (chochin): treo từ yTop xuống bằng sợi xích ngắn
  const chochin=(x,yTop,z,r=.26,len=.25,light=false)=>{
    const bh=r*1.25,yc=yTop-len-bh;
    fb(x-.025,x+.025,yTop-len,yTop,z-.025,z+.025,DARK,.025);
    fb(x-.1,x+.1,yc+bh-.05,yc+bh,z-.1,z+.1,DARK,.05);
    fb(x-.1,x+.1,yc-bh,yc-bh+.05,z-.1,z+.1,DARK,.05);
    ell(x,yc,z,r,bh,r,(i,j,k)=>(j%4===0)?0xb5651d:(((i+k)&1)?GLOW:GLOW2),.05);
    fb(x-.02,x+.02,yc-bh-.2,yc-bh,z-.02,z+.02,0xc0202a,.02);
    lamps.push({x,y:yc,z,s:r*8.5,light});
  };
  // đèn vuông (khung gỗ + giấy sáng)
  const pendant=(x,yTop,z,w=.3,h=.5,len=.25,light=false)=>{
    const yb=yTop-len-h,n=Math.round(w*2/.1)-1,m=Math.round(h/.1)-1;
    fb(x-.025,x+.025,yb+h+.05,yTop,z-.025,z+.025,DARK,.025);
    fb(x-w-.05,x+w+.05,yb+h,yb+h+.05,z-w-.05,z+w+.05,DARK,.05);
    fb(x-w,x+w,yb,yb+h,z-w,z+w,(i,j,k)=>(((i===0||i===n)&&(k===0||k===n))||j===0||j===m)?0x5a3418:GLOW2,.1);
    lamps.push({x,y:yb+h/2,z,s:w*7,light});
  };
  // đèn đứng (andon): khung gỗ + giấy sáng
  const andon=(x,z,y0,hgt=.8,w=.25,light=false)=>{
    const n=Math.round(w*2/.05)-1,m=Math.round(hgt/.05)-1;
    fb(x-w,x+w,y0,y0+hgt,z-w,z+w,(i,j,k)=>(((i===0||i===n)&&(k===0||k===n))||j===0||j===m)?0x4a2e1a:GLOW2,.05);
    fb(x-w-.05,x+w+.05,y0+hgt,y0+hgt+.05,z-w-.05,z+w+.05,0x3a2412,.05);
    lamps.push({x,y:y0+hgt/2,z,s:w*7+.4,light});
  };
  const cushion=(x,z,y,col,s=.34)=>{
    fb(x-s,x+s,y,y+.125,z-s,z+s,col,.125);
    fb(x-s+.125,x+s-.125,y+.125,y+.1875,z-s+.125,z+s-.125,mix(col,0xffffff,.18),.0625);
  };
  const teapot=(x,y,z)=>{
    ell(x,y+.09,z,.1,.08,.1,0x3a5a4a,.025);
    fb(x-.03,x+.03,y+.17,y+.2,z-.03,z+.03,0x2a4a3a,.03);
    fb(x+.09,x+.15,y+.09,y+.15,z-.015,z+.015,0x3a5a4a,.03);
    fb(x-.15,x-.09,y+.06,y+.15,z-.015,z+.015,0x2a4a3a,.03);
  };
  const cup=(x,y,z)=>fb(x-.04,x+.04,y,y+.06,z-.04,z+.04,0xe9e4d4,.02);
  const shelfFn=(nj,nk)=>(i,j,k)=>(k===0||k===nk-1||j===nj-1||j%5===0)?0x6b4a2e:BK[(k*5+((j/5)|0)*3+i)%8];
  const monitor=(cx,z,y,n=0)=>{
    fb(cx-.2,cx+.2,y,y+.05,z-.2,z+.05,0x2a2a30,.05);
    fb(cx-.05,cx+.05,y,y+.15,z-.1,z,0x2a2a30,.05);
    fb(cx-.45,cx+.45,y+.15,y+.7,z-.05,z,0x1a1a20,.05);
    addScreen(cx,y+.425,z+.006,0);   // mặt màn hình = canvas chat Discord (xem phần CHAT)
  };
  const monitorX=(cz,y,xf,n=0)=>{   // màn hình quay mặt về -x
    fb(xf-.05,xf+.2,y,y+.05,cz-.2,cz+.2,0x2a2a30,.05);
    fb(xf,xf+.1,y,y+.15,cz-.05,cz+.05,0x2a2a30,.05);
    fb(xf,xf+.05,y+.15,y+.7,cz-.45,cz+.45,0x1a1a20,.05);
    addScreen(xf-.006,y+.425,cz,-Math.PI/2);
  };
  const monitorN=(cx,y,zf,n=0)=>{   // màn hình quay mặt về -z
    fb(cx-.2,cx+.2,y,y+.05,zf-.05,zf+.2,0x2a2a30,.05);
    fb(cx-.05,cx+.05,y,y+.15,zf,zf+.1,0x2a2a30,.05);
    fb(cx-.45,cx+.45,y+.15,y+.7,zf,zf+.05,0x1a1a20,.05);
    addScreen(cx,y+.425,zf-.006,Math.PI);
  };
  const potPlant=(x,y,z,sc=1)=>{
    fb(x-.2*sc,x+.2*sc,y,y+.35*sc,z-.2*sc,z+.2*sc,0x9a5b3a,.05);
    ell(x,y+.55*sc,z,.28*sc,.2*sc,.28*sc,LEAF,.05);
    ell(x-.1*sc,y+.8*sc,z+.05*sc,.2*sc,.18*sc,.2*sc,LEAF,.05);
    ell(x+.12*sc,y+.75*sc,z-.05*sc,.18*sc,.16*sc,.18*sc,LEAF,.05);
  };
  // rào / lan can đỏ nâu (b = mặt sàn)
  const railX=(x0,x1,z0,z1,b)=>{const n=Math.round((x1-x0)/.125);
    fp(x0,x1,b,b+1.0,z0,z1,.125,(x,y,z,i,j)=>(i%8<2||i===n-1||j>=6||j===3)?(j>=6?RED2:RED):-1)};
  const railZ=(x0,x1,z0,z1,b)=>{const n=Math.round((z1-z0)/.125);
    fp(x0,x1,b,b+1.0,z0,z1,.125,(x,y,z,i,j,k)=>(k%8<2||k===n-1||j>=6||j===3)?(j>=6?RED2:RED):-1)};

  // ================= NỀN MÓNG ĐÁ + BẬC THANG =================
  fb(-7.5,7.5,0,.75,-3.75,4.5,(i,j,k)=>{
    const c=STONE[(i*3+j*5+k*7+((i*k)>>2))%5];
    return j===2?mix(c,0x999999,.25):c;
  },.25);
  fb(-1.75,1.75,0,.25,4.5,5.5,(i,j,k)=>STONE[(i*3+k*5)%5],.25);
  fb(-1.5,1.5,0,.5,4.5,5.0,(i,j,k)=>STONE[(i*5+j+k*3)%5],.25);

  // ================= TẦNG 1: SÀN HIÊN + CHIẾU TATAMI =================
  fb(-7,7,.75,FL,-3.5,4.0,(i,j,k)=>(k&1)?0x6b4a2e:0x5e402a,.125);
  fb(-6.25,6.25,FL,GF,-3.0,2.5,(i,j,k)=>{
    if(i%14===0||k%28===0)return 0x3a3a22;
    return (((i/14)|0)+((k/28)|0))&1?0x9c9a62:0xa8a670;
  },.125);

  // ================= TẦNG 1: TƯỜNG VÁN GỖ + CỘT ĐỎ + CỬA GIẤY =================
  const PF=[-6.375,-2.625,-1.375,1.375,2.625,6.375];
  fp(-6.5,6.5,FL,WT,2.5,2.75,.25,(x,y,z,i,j)=>{
    if(isP(x,PF))return POST;
    if(y>WT-.3)return 0x3a2012;
    const ax=Math.abs(x);
    if(x>-1.25&&x<1.25&&y<2.75){
      if(x>0)return -1;
      return(i%4===0||j%4===0)?DARK:PAPER;
    }
    if(ax>2.75&&ax<5.5&&y>1.375&&y<2.875)
      return(i%3===0||j%3===0)?DARK:PAPER;
    return PLANK[(i+((j*3)>>1))&3];
  });
  const PB=[-6.375,-4.375,-2.375,-.375,1.625,3.625,5.625,6.375];
  fp(-6.5,6.5,FL,WT,-3.25,-3.0,.25,(x,y,z,i,j)=>{
    if(isP(x,PB))return POST;
    if(y>WT-.3)return 0x3a2012;
    return PLANK[(i+((j*3)>>1))&3];
  });
  const PS=[-3.125,-1.125,.875,2.625];
  for(const [x0,x1] of [[-6.5,-6.25],[6.25,6.5]])
    fp(x0,x1,FL,WT,-3.25,2.75,.25,(x,y,z,i,j,k)=>{
      if(isP(z,PS))return POST;
      if(y>WT-.3)return 0x3a2012;
      if(z>-.875&&z<.625&&y>1.375&&y<2.875)return(k%3===0||j%3===0)?DARK:PAPER;
      return PLANK[(k+((j*3)>>1))&3];
    });

  // ================= TRẦN TẦNG 1 (có khoét giếng thang) + XÀ NGANG =================
  fp(-6.75,6.75,WT,RY,-3.5,3.0,.25,(x,y,z,i,j,k)=>inH(x,z)?-1:((i+k)&1?0x4d2313:0x431d10));
  for(const bx of[-1,1,3,5])fb(bx-.125,bx+.125,WT-.125,WT,-3.0,2.5,0x3a1c10,.125);   // xà lộ ra ở trần

  // ================= MÁI DƯỚI (2 tầng ngói) =================
  for(let n=0;n<=1;n++){
    const hw=8.5-.5*n,hd=4.75-.5*n,nx=Math.round(hw*8),nz=Math.round(hd*8),y0=RY+.5*n;
    fp(-hw,hw,y0,y0+.5,RZ-hd,RZ+hd,.25,(x,y,z,i,j,k)=>{
      if(inH(x,z))return -1;
      if(n===0&&(i===0||i===nx-1||k===0||k===nz-1))return TRIM[(i+k)%3];
      if((i<3||i>=nx-3)&&(k<3||k>=nz-3))return TRIM[(i+k)%3];
      return ROOF[(i+k+j*2)%3];
    });
  }
  tips(8.5,4.75,RZ,RY+.125);

  // ================= SÀN BAN CÔNG / SÀN TẦNG 2 (khoét giếng thang) =================
  fp(-7.25,7.25,RY+1.0,FL2,-3.75,3.25,.125,(x,y,z,i,j,k)=>{
    if(inH(x,z))return -1;
    if(x>-5.75&&x<5.75&&z>-2.5&&z<1.75){            // trong nhà: chiếu tatami
      const u=(x+5.75)/1.75,w=(z+2.5)/.875,fu=u-Math.floor(u),fw=w-Math.floor(w);
      if(fu<.07||fw<.14)return 0x3a3a22;
      return ((Math.floor(u)+Math.floor(w))&1)?0x9c9a62:0xa8a670;
    }
    return (k&1)?0x6b4a2e:0x5e402a;                  // ngoài ban công: ván gỗ
  });

  // ================= CẦU THANG GỖ (sát tường sau; bậc dưới ở phía +x mở ra phòng, đi lên về phía -x) =================
  for(let n=0;n<15;n++){
    const x1=SX-.25*n,x0=x1-.25,top=GF+.25*(n+1);
    fb(x0,x1,GF,top,H.z0,H.z1,(i,j,k)=>j===n?0x9a6a3c:0x5b3a22,.25);
    if(n<13){                                                // tay vịn phía nam (chừa 2 bậc trên cùng để bước ra tầng 2)
      fb(x0,x1,top+.55,top+.65,-1.55,-1.45,RED2,.05);
      if(n%3===0)fb(x0+.1,x0+.15,top,top+.55,-1.55,-1.45,RED,.05);
    }
  }
  railX(-4.75,H.x1,-1.625,-1.5,FL2);   // lan can phía nam giếng thang tầng 2 (chừa lối bước ra ở phía tây)
  railZ(H.x1-.125,H.x1,-2.75,-1.5,FL2);   // lan can đầu đông giếng thang

  // ================= TẦNG 2: TƯỜNG VÁN + CỬA GIẤY =================
  const PF2=[-5.875,-2.625,-1.375,1.375,2.625,5.875];
  fp(-6,6,FL2,WT2,1.75,2.0,.25,(x,y,z,i,j)=>{
    if(isP(x,PF2))return POST;
    if(y>WT2-.3)return 0x3a2012;
    const ax=Math.abs(x);
    if(x>-1.25&&x<1.25&&y<FL2+1.875){
      if(x>0)return -1;
      return(i%4===0||j%4===0)?DARK:PAPER;
    }
    if(ax>2.75&&ax<5.5&&y>FL2+.5&&y<FL2+2.0)return(i%3===0||j%3===0)?DARK:PAPER;
    return PLANK[(i+((j*3)>>1))&3];
  });
  const PB2=[-5.875,-3.875,-1.875,.125,2.125,4.125,5.875];
  fp(-6,6,FL2,WT2,-2.75,-2.5,.25,(x,y,z,i,j)=>{
    if(isP(x,PB2))return POST;
    if(y>WT2-.3)return 0x3a2012;
    if(x>2.5&&x<4.75&&y>FL2+.75&&y<FL2+2.0)return(i%3===0||j%3===0)?DARK:PAPER;
    return PLANK[(i+((j*3)>>1))&3];
  });
  const PS2=[-2.625,-.625,1.375];
  for(const [x0,x1] of [[-6,-5.75],[5.75,6]])
    fp(x0,x1,FL2,WT2,-2.75,2.0,.25,(x,y,z,i,j,k)=>{
      if(isP(z,PS2))return POST;
      if(y>WT2-.3)return 0x3a2012;
      if(z>-1.0&&z<1.0&&y>FL2+.5&&y<FL2+2.0)return(k%3===0||j%3===0)?DARK:PAPER;
      return PLANK[(k+((j*3)>>1))&3];
    });
  fb(-6.25,6.25,WT2,RY2,-3.0,2.25,(i,j,k)=>(i+k)&1?0x4d2313:0x431d10,.25);     // trần tầng 2
  for(const bx of[-3,-1,1,3,5])fb(bx-.125,bx+.125,WT2-.125,WT2,-2.5,1.75,0x3a1c10,.125);

  // ================= MÁI TRÊN NHIỀU TẦNG (hip) =================
  for(let n=0;n<=5;n++){
    const hw=8-.5*n,hd=4.25-.5*n,nx=Math.round(hw*8),nz=Math.round(hd*8),y0=RY2+.5*n;
    fb(-hw,hw,y0,y0+.5,RZ2-hd,RZ2+hd,(i,j,k)=>{
      if(n===0&&(i===0||i===nx-1||k===0||k===nz-1))return TRIM[(i+k)%3];
      if((i<3||i>=nx-3)&&(k<3||k>=nz-3))return TRIM[(i+k)%3];
      return ROOF[(i+k+j*2)%3];
    },.25);
  }
  fb(-5,5,RY2+3.0,RY2+3.25,RZ2-.75,RZ2+.75,(i,j,k)=>TRIM[(i+k)%3],.25);       // nóc đá
  for(const sx of[-1,1])fb(sx*5-.25,sx*5+.25,RY2+3.25,RY2+3.75,RZ2-.25,RZ2+.25,(i,j,k)=>TRIM[(i+j+k)%3],.125);   // đầu nóc
  tips(8,4.25,RZ2,RY2+.125);

  // ================= HIÊN TẦNG 1: CỘT ĐỠ MÁI + LAN CAN =================
  for(const x of[-6.875,-3.375,-1.875,1.875,3.375,6.875])
    fb(x-.125,x+.125,FL,RY,3.75,4.0,(i,j,k)=>(j&1)?POST:0x7a3520,.125);
  railX(-7,-1.75,3.875,4.0,FL);railX(1.75,7,3.875,4.0,FL);
  railZ(6.875,7,2.75,4.0,FL);railZ(-7,-6.875,2.75,4.0,FL);

  // ================= BAN CÔNG TẦNG 2: CỘT + LAN CAN + ĐỒ DÙNG =================
  for(const x of[-7.125,-3.375,-1.875,1.875,3.375,7.125])
    fb(x-.125,x+.125,FL2,RY2,3.0,3.25,(i,j,k)=>(j&1)?POST:0x7a3520,.125);
  for(const x of[-7.125,7.125])fb(x-.125,x+.125,FL2,RY2,-3.75,-3.5,(i,j,k)=>(j&1)?POST:0x7a3520,.125);
  railX(-7.25,7.25,3.125,3.25,FL2);
  railX(-7.25,7.25,-3.75,-3.625,FL2);
  railZ(7.125,7.25,-3.75,3.25,FL2);railZ(-7.25,-7.125,-3.75,3.25,FL2);
  // ghế dài bên trái
  fb(-6.0,-3.75,FL2+.4,FL2+.5,2.1,2.6,0xb98a56,.05);
  fb(-6.0,-3.75,FL2+.5,FL2+.95,2.1,2.2,0xa87a48,.05);
  for(const x of[-5.95,-3.85])for(const z of[2.15,2.5])fb(x,x+.1,FL2,FL2+.4,z,z+.1,0x6b4a2e,.05);
  // bàn trà nhỏ bên phải + 2 đệm
  fb(3.5,4.75,FL2+.35,FL2+.45,2.3,3.0,0x6b4a2e,.05);
  for(const x of[3.55,4.6])for(const z of[2.35,2.85])fb(x,x+.1,FL2,FL2+.35,z,z+.1,0x4a2e1a,.05);
  teapot(4.1,FL2+.45,2.65);cup(3.8,FL2+.45,2.55);cup(4.4,FL2+.45,2.75);
  cushion(3.1,2.65,FL2,0x8a2a2a);cushion(5.15,2.65,FL2,0x2a5a8a);
  // chậu cây ở góc ban công
  potPlant(-6.8,FL2,2.8,1.2);potPlant(6.8,FL2,2.8,1.2);potPlant(-6.8,FL2,-3.3,1.2);potPlant(6.8,FL2,-3.3,1.2);
  // đèn lồng treo dưới mái trên (ban công)
  chochin(-4.5,RY2,3.0,.26,.5);chochin(0,RY2,3.0,.3,.5);chochin(4.5,RY2,3.0,.26,.5);
  chochin(-6.8,RY2,-.5,.24,.5);chochin(6.8,RY2,-.5,.24,.5);

  // ================= NOREN + ĐÈN LỒNG HIÊN TẦNG 1 =================
  for(const sx of[-1,1]){
    const x0=sx>0?1.6:-2.4,x1=sx>0?2.4:-1.6,cx=sx>0?2.0:-2.0;
    fp(x0,x1,1.4,3.3,2.8,2.9,.1,(x,y)=>{
      if(y>3.2)return DARK;
      if(Math.hypot(x-cx,y-2.5)<.24)return 0xc0202a;
      return 0xf2f0ea;
    });
    chochin(sx*3.0,RY,3.6,.28,.3);
    chochin(sx*5.4,RY,3.6,.24,.3);
  }

  // ================= BIỂN HIỆU: LOGO + POWERED BY RLNC (gỗ đen) =================
  const BLK=[0x1b1613,0x15110e,0x221b16,0x100d0b];           // gỗ đen: thớ nhẹ
  const BLKF=[0x2c241d,0x26201a,0x322a22];                   // viền / cột: đen hơi sáng hơn để nổi khung
  fb(-6.8,-6.6,0,3.05,5.1,5.3,(i,j,k)=>BLKF[(i+j*2+k)%3],.1);fb(-4.4,-4.2,0,3.05,5.1,5.3,(i,j,k)=>BLKF[(i+j*2+k)%3],.1);
  fp(-6.8,-4.2,.75,3.05,5.15,5.25,.1,(x,y,z,i,j)=>(i<2||i>=24||j<2||j>=21)?BLKF[(i*3+j)%3]:BLK[(i*7+j*3)%4]);
  logo(v,-5.5,2.23,5.35,2.0,false);
  text(v,'POWERED',-5.5,1.47,5.261,.04,0xffffff);
  text(v,'BY RLNC',-5.5,1.15,5.261,.04,0xffffff);
  {const E=new VB();   // bản phủ phát sáng: cùng hình, nhích ra trước 1.2cm (cộng polygonOffset ở SIGNGLOW)
    logo(E,-5.5,2.23,5.35+.012,2.0,false);
    text(E,'POWERED',-5.5,1.47,5.261+.012,.04,0xffffff);
    text(E,'BY RLNC',-5.5,1.15,5.261+.012,.04,0xffffff);
    const gm=E.mesh();gm.material=SIGNGLOW;gm.position.set(hx,0,hz);if(FACE_RIVER)gm.rotation.y=Math.PI;S.add(gm);prevObjs.push(gm);}   // không vào meshes -> không ảnh hưởng va chạm / bắn
  fp(-2.0,2.0,1.15,3.35,-3.37,-3.25,.1,(x,y,z,i,j)=>(i<2||i>=38||j<2||j>=20)?BLKF[(i*3+j)%3]:BLK[(i*7+j*3)%4]);   // bảng gỗ đen, y chang mặt trước
  logo(v,0,2.25,-3.25-.18,3.0,true);

  // ====================================================================
  // ================= NỘI THẤT TẦNG 1 (mặt chiếu y = 1.0) ==============
  // ====================================================================
  // --- thảm giữa phòng ---
  fp(-2.0,2.25,GF,GF+.0625,-2.5,.5,.0625,(x,y,z,i,j,k)=>{
    const a=Math.min(x+2.0,2.25-x,z+2.5,.5-z);
    if(a<.06)return 0x2a1a10;
    if(a<.14)return 0xc9a227;
    if(a<.3)return 0x6a1f1f;
    return (((i>>3)+(k>>3))&1)?0x8a2f2f:0x7a2626;
  });
  // --- bàn trà thấp + đệm ngồi + bộ ấm chén + đèn bàn ---
  fp(-1.25,1.25,1.25,1.375,-1.75,-.75,.125,(x,y,z,i,j,k)=>(i===0||i===19||k===0||k===7)?0x3a2412:0x7a4a2a);
  for(const x of[-1.2,1.075])for(const z of[-1.7,-.875])fb(x,x+.125,GF,1.25,z,z+.125,0x3a2412,.125);
  cushion(-1.7,-1.1,GF,0x8a2a2a);cushion(1.95,-1.1,GF,0x8a2a2a);
  cushion(0,.05,GF,0x2a4a7a);
  fb(-.55,.15,1.375,1.4,-1.5,-1.0,0x2a2018,.025);                       // khay
  teapot(-.25,1.4,-1.25);cup(.0,1.4,-1.38);cup(.0,1.4,-1.12);
  fb(.45,.8,1.375,1.425,-1.4,-1.1,0xf2efe6,.05);                         // đĩa bánh
  ell(.55,1.46,-1.25,.06,.04,.06,0xf4b6c8,.02);ell(.68,1.46,-1.25,.06,.04,.06,0xc8e0a8,.02);
  andon(1.0,-1.55,1.375,.3,.125,true);                                   // đèn bàn nhỏ phát sáng
  // --- kotatsu bên phải: chăn đỏ, mặt bàn, cam, laptop, 4 đệm ---
  fb(2.625,4.875,GF,1.375,-.625,1.625,(i,j,k)=>j===0?0x6a1f1f:((((i>>1)+(k>>1))&1)?0x9c2f2f:0xb04141),.125);
  fb(2.75,4.75,1.375,1.5,-.5,1.5,(i,j,k)=>(i===0||i===15||k===0||k===15)?0x6b4a2e:0xb98a56,.125);
  fb(3.15,3.65,1.5,1.53,.05,.35,0xd9d2c0,.05);
  ell(3.4,1.58,.2,.17,.07,.17,0xd9d2c0,.03);
  ell(3.34,1.66,.17,.06,.06,.06,0xff8a1f,.02);ell(3.46,1.66,.22,.06,.06,.06,0xff8a1f,.02);ell(3.4,1.7,.2,.06,.06,.06,0xff9a2f,.02);
  fb(3.95,4.45,1.5,1.55,.55,.95,0x8a8d95,.05);                           // laptop (đế)
  fb(3.95,4.45,1.55,1.95,.5,.55,0x1a1a20,.05);                           // màn hình
  fb(3.975,4.425,1.6,1.9,.55,.575,(i,j,k)=>(j%3===1)?0x7fd0ff:0x14243a,.025);
  cushion(3.75,-1.1,GF,0x2a5a4a);cushion(3.75,2.0,GF,0x2a5a4a);cushion(5.4,.5,GF,0x6a3a8a);cushion(2.05,.5,GF,0x6a3a8a);
  andon(3.2,1.2,1.5,.3,.125,false);
  // --- bếp dọc tường sau bên phải ---
  fp(2.5,6.0,GF,2.0,-3.0,-2.25,.125,(x,y,z,i,j,k)=>(i%7===0||j===0||j===7)?0x3a2412:WD(i,j,k));
  fp(2.5,6.0,2.0,2.125,-3.0,-2.125,.125,(x,y,z)=>(x>3.0&&x<4.0&&z>-2.9&&z<-2.3)?0x6c7a86:0xd8d4c8);   // mặt đá + chậu rửa
  fb(3.45,3.55,2.125,2.5,-2.85,-2.75,0xb8c0c8,.05);fb(3.45,3.55,2.45,2.5,-2.85,-2.55,0xb8c0c8,.05);  // vòi nước
  fb(4.8,5.8,2.125,2.225,-2.9,-2.3,0x1e1e22,.1);                         // bếp
  fb(4.95,5.15,2.225,2.25,-2.7,-2.5,0x8a2a1a,.025);fb(5.45,5.65,2.225,2.25,-2.7,-2.5,0x8a2a1a,.025);
  ell(5.05,2.4,-2.6,.2,.17,.2,0x707880,.05);fb(4.95,5.15,2.55,2.6,-2.7,-2.5,0x5a6068,.05);            // nồi + nắp
  ell(5.55,2.38,-2.6,.16,.15,.16,0x2f6a58,.04);fb(5.7,5.85,2.35,2.45,-2.62,-2.58,0x2f6a58,.04);       // ấm
  ell(5.05,2.75,-2.6,.07,.05,.07,0xf4f6f8,.03);ell(5.1,2.9,-2.58,.06,.05,.06,0xf4f6f8,.03);ell(5.0,3.02,-2.62,.05,.04,.05,0xf4f6f8,.03);   // hơi nước
  fb(2.5,6.0,2.75,2.875,-3.0,-2.625,WD,.125);                            // kệ treo
  for(let i=0;i<7;i++)fb(2.75+i*.45-.1,2.75+i*.45+.1,2.875,3.125,-2.9,-2.7,[0xc9a227,0x8a2f2f,0xd9d2c0,0x2f7a4f,0x2f5a8a,0xb5651d,0xd9d2c0][i],.05);   // lọ gia vị
  // --- tansu (tủ ngăn kéo) + mèo thần tài + tranh núi Phú Sĩ (dời xa cầu thang) ---
  fp(-6.25,-5.5,GF,2.375,-.25,1.25,.125,(x,y,z,i,j,k)=>{
    if(j%3===0&&j>0)return 0x2a1a10;
    if(j%3===1&&(k%7===3||k%7===4))return 0xb08a3a;
    return WD(i,j,k);
  });
  ell(-5.85,2.52,.5,.12,.15,.1,0xf4f0e6,.03);ell(-5.85,2.72,.5,.1,.09,.09,0xf4f0e6,.03);
  fb(-5.95,-5.9,2.78,2.86,.4,.44,0xf4f0e6,.02);fb(-5.8,-5.75,2.78,2.86,.56,.6,0xf4f0e6,.02);
  fb(-5.78,-5.72,2.6,2.66,.4,.6,0xc0202a,.02);fb(-5.72,-5.68,2.62,2.74,.38,.44,0xf4f0e6,.02);
  fb(-5.76,-5.72,2.5,2.58,.38,.44,0xe0b030,.02);
  fp(-6.25,-6.2,2.55,3.2,-.1,1.1,.05,(x,y,z,i,j,k)=>{
    if(j===0||j===12||k===0||k===23)return DARK;
    const my=2.6+Math.max(0,.4-Math.abs(z-.5)*.6);
    if(y<my)return y>my-.08?0xffffff:0x4a6a8a;
    if(Math.hypot(z-.75,y-3.05)<.1)return 0xc0202a;
    return 0xcfe3f0;
  });
  // --- kệ sách tường trái phía trước ---
  fp(-6.25,-5.75,GF,2.75,1.25,2.375,.125,shelfFn(14,9));
  // --- bonsai trên bệ ---
  fb(-5.4,-4.6,1.45,1.5,1.65,2.45,WD,.05);
  for(const x of[-5.4,-4.65])for(const z of[1.65,2.4])fb(x,x+.05,GF,1.45,z,z+.05,0x4a2e1a,.05);
  fb(-5.2,-4.8,1.5,1.62,1.85,2.25,0x5a6a7a,.04);
  fb(-5.02,-4.98,1.62,1.9,2.03,2.07,0x5a3a22,.02);fb(-5.0,-4.9,1.78,1.9,2.03,2.07,0x5a3a22,.02);
  ell(-5.0,2.0,2.05,.18,.1,.16,LEAF,.03);ell(-4.88,2.1,2.05,.12,.08,.12,LEAF,.03);ell(-5.08,2.12,2.0,.1,.07,.1,LEAF,.03);
  ell(-4.95,2.18,2.08,.04,.03,.04,0xf08cbc,.02);ell(-5.1,2.05,2.12,.04,.03,.04,0xf08cbc,.02);
  // --- tranh thư pháp + bàn hoa (tokonoma nhỏ) ---
  fp(-3.9,-3.1,1.7,2.9,2.4,2.5,.05,(x,y,z,i,j,k)=>{
    if(i<2||i>=14||j<2||j>=22)return 0x2a1a10;
    const dx=x+3.5,dy=y-2.3;
    if((Math.abs(dx)<.12&&Math.abs(dy)<.42&&((i+j*3)%5<2))||(Math.hypot(dx-.03,dy+.5)<.1))return 0x1a1a1a;
    return 0xe8dcb8;
  });
  fb(-3.9,-3.1,1.4,1.45,1.9,2.4,WD,.05);
  for(const x of[-3.88,-3.17])for(const z of[1.92,2.33])fb(x,x+.05,GF,1.4,z,z+.05,0x4a2e1a,.05);
  ell(-3.5,1.58,2.15,.07,.13,.07,0x1f4f7a,.025);
  fb(-3.52,-3.48,1.7,1.95,2.13,2.17,0x3f7a3f,.02);fb(-3.44,-3.4,1.7,1.9,2.15,2.19,0x3f7a3f,.02);
  ell(-3.5,1.98,2.15,.07,.05,.07,0xe060a0,.025);ell(-3.42,1.93,2.17,.06,.05,.06,0xf08cbc,.025);
  // --- đèn đứng cạnh cửa ---
  andon(-2.2,2.1,GF,.8,.25,false);
  // --- kệ giày + guốc ở lối vào ---
  fp(1.4,2.4,GF,1.5,2.125,2.5,.125,(x,y,z,i,j,k)=>(j%3===0||i===0||i===7)?WD(i,j,k):-1);
  fb(1.5,1.7,1.125,1.2,2.25,2.45,0x2a2a30,.025);fb(1.8,2.0,1.125,1.2,2.25,2.45,0x2a2a30,.025);
  fb(1.5,1.7,1.375,1.45,2.25,2.45,0xb5651d,.025);fb(1.8,2.0,1.375,1.45,2.25,2.45,0xb5651d,.025);
  // --- tủ thấp bên phải gần cửa + bình hoa ---
  fp(5.5,6.25,GF,1.75,1.25,2.375,.125,(x,y,z,i,j,k)=>(j===0||j===5||k%4===0)?0x3a2412:WD(i,j,k));
  ell(5.9,1.95,1.8,.09,.17,.09,0xd9d2c0,.03);
  fb(5.88,5.92,2.05,2.5,1.78,1.82,0x3f7a3f,.02);ell(5.9,2.55,1.8,.1,.07,.1,0xf08cbc,.03);ell(5.95,2.45,1.85,.07,.05,.07,0xffd25a,.025);
  // --- ĐÈN TREO TẦNG 1 ---
  // (đèn lồng tổ ong chochin chỉ dùng ở ngoại thất: hiên + ban công; trong nhà chỉ còn đèn vuông. PointLight chuyển sang 2 đèn vuông dưới đây)
  pendant(4.2,WT,-2.0,.25,.45,.25,true);          // trên bếp / kotatsu
  pendant(0,WT,1.5,.22,.4,.25,true);              // gần cửa / bàn trà

  // ====================================================================
  // ================= NỘI THẤT TẦNG 2 (mặt sàn y = 4.75) ===============
  // ====================================================================
  // --- thảm giữa ---
  fp(-2.0,2.5,FL2,FL2+.0625,-.9,1.1,.0625,(x,y,z,i,j,k)=>{
    const a=Math.min(x+2.0,2.5-x,z+.9,1.1-z);
    if(a<.06)return 0x1a2230;
    if(a<.14)return 0xd9d2c0;
    if(a<.3)return 0x2c4a6e;
    return (((i>>3)+(k>>3))&1)?0x35577f:0x2f4f78;
  });
  // --- bàn thấp + đệm + trà ---
  fp(-.5,1.0,FL2+.375,FL2+.5,-.4,.6,.125,(x,y,z,i,j,k)=>(i===0||i===11||k===0||k===7)?0x3a2412:0xb98a56);
  for(const x of[-.45,.875])for(const z of[-.35,.475])fb(x,x+.125,FL2,FL2+.375,z,z+.125,0x4a2e1a,.125);
  cushion(-.85,.1,FL2,0x8a2a2a);cushion(1.6,.1,FL2,0x8a2a2a);cushion(.25,1.0,FL2,0x2a5a4a);
  teapot(.1,FL2+.5,.1);cup(.4,FL2+.5,.0);cup(.4,FL2+.5,.25);
  fb(.6,.9,FL2+.5,FL2+.525,-.2,.2,0xf2efe6,.025);ell(.75,FL2+.56,0,.07,.05,.07,0xf4b6c8,.02);
  // --- dãy bàn làm việc dọc tường sau: 6 máy tính (mỗi máy 1 màn hình, bàn phím, chuột, ghế xoay) ---
  const NPC=6,PC0=-.85,PCD=1.1,DX0=-1.4,DX1=5.6;
  fb(DX0,DX1,FL2+.75,FL2+.875,-2.5,-1.75,0x946238,.125);                    // mặt bàn dài
  for(const x of[DX0,DX1-.125,(DX0+DX1)/2-.0625])fb(x,x+.125,FL2,FL2+.75,-2.5,-1.75,0x6b4a2e,.125);   // chân bàn (2 đầu + giữa)
  fb(DX0,DX1,FL2+.375,FL2+.45,-2.5,-2.4,0x3a2412,.05);                      // thanh giằng sau
  for(let n=0;n<NPC;n++){
    const cx=PC0+n*PCD;
    monitor(cx,-2.2,FL2+.875,n%2);                                         // xen kẽ: 4 giọt · logo vòng
    fb(cx-.4,cx+.4,FL2+.875,FL2+.9,-2.05,-1.85,0x2a2a30,.025);              // bàn phím
    fb(cx+.5,cx+.6,FL2+.875,FL2+.9,-2.0,-1.9,0xdddddd,.025);                // chuột
    if(n%2===0)fb(cx+.62,cx+.72,FL2+.875,FL2+.975,-2.3,-2.2,0xc0392b,.025);  // cốc
    // ghế xoay (chỉ 2 ghế ở dãy sau: máy 2 và máy 5)
    if(n===1||n===4){
    const ch=[0x2a3a55,0x3a2a55,0x2a5545][n%3];
    fb(cx-.25,cx+.25,FL2+.45,FL2+.55,-1.3,-.8,ch,.05);fb(cx-.25,cx+.25,FL2+.55,FL2+1.1,-1.3,-1.2,ch,.05);
    fb(cx-.05,cx+.05,FL2+.1,FL2+.45,-1.1,-1.0,0x2a2a30,.05);
    fb(cx-.2,cx+.2,FL2,FL2+.05,-1.05,-1.0,0x2a2a30,.05);fb(cx-.025,cx+.025,FL2,FL2+.05,-1.25,-.85,0x2a2a30,.05);
    }
  }
  // --- nối tiếp dãy bàn dọc tường đông: thêm 2 máy (màn hình quay về -x) + 1 ghế ---
  fb(4.875,5.75,FL2+.75,FL2+.875,-1.75,1.75,0x946238,.125);
  for(const z of[-1.75,-.0625,1.625])fb(4.875,5.0,FL2,FL2+.75,z,z+.125,0x6b4a2e,.125);
  for(let n=0;n<2;n++){   // 2 máy (đã bỏ máy thứ 3 sát góc vì kẹt góc)
    const cz=-1.1+n*1.1;
    monitorX(cz,FL2+.875,5.35,(n+1)%2);
    fb(4.98,5.18,FL2+.875,FL2+.9,cz-.4,cz+.4,0x2a2a30,.025);                // bàn phím
    fb(5.0,5.1,FL2+.875,FL2+.9,cz+.5,cz+.6,0xdddddd,.025);                  // chuột
    if(n===1)fb(5.0,5.1,FL2+.875,FL2+.975,cz-.72,cz-.62,0xc0392b,.025);      // cốc
  }
  {const ch=0x2a5545,xc=4.175;
    fb(3.925,4.425,FL2+.45,FL2+.55,-.25,.25,ch,.05);fb(3.925,4.025,FL2+.55,FL2+1.1,-.25,.25,ch,.05);
    fb(xc-.05,xc+.05,FL2+.1,FL2+.45,-.05,.05,0x2a2a30,.05);
    fb(xc-.025,xc+.025,FL2,FL2+.05,-.2,.2,0x2a2a30,.05);fb(xc-.2,xc+.2,FL2,FL2+.05,-.025,.025,0x2a2a30,.05);}
  // --- góc tường trước (cạnh cửa sổ): thêm 2 máy, màn hình quay về -z ---
  fb(2.5,4.875,FL2+.75,FL2+.875,1.0,1.75,0x946238,.125);
  for(const x of[2.5,4.75])fb(x,x+.125,FL2,FL2+.75,1.0,1.75,0x6b4a2e,.125);
  for(let n=0;n<2;n++){
    const cx=3.1+n*1.1;
    monitorN(cx,FL2+.875,1.35,n%2);
    fb(cx-.4,cx+.4,FL2+.875,FL2+.9,1.02,1.22,0x2a2a30,.025);               // bàn phím
    fb(cx-.6,cx-.5,FL2+.875,FL2+.9,1.02,1.12,0xdddddd,.025);               // chuột
  }
  // --- CỜ QUỐC KỲ treo trên tường, ngay phía trên mỗi màn hình (cỡ .9 x .6m ~ bằng màn hình) ---
  {
    const FW=.9,FH=.6,FT=.03,FY0=FL2+1.6;
    const star=(X,Y,cx,cy,R,rot=Math.PI/2)=>{
      const pts=[];for(let q=0;q<10;q++){const a=rot+q*Math.PI/5,r=q%2?R*.382:R;pts.push([cx+r*Math.cos(a),cy+r*Math.sin(a)])}
      let ins=false;for(let a=0,b=9;a<10;b=a++){const[xa,ya]=pts[a],[xb,yb]=pts[b];if((ya>Y)!==(yb>Y)&&X<(xb-xa)*(Y-ya)/(yb-ya)+xa)ins=!ins}
      return ins};
    // mỗi cờ: (X,Y) với X 0..3 (trái->phải), Y 0..2 (dưới->trên) -> màu
    const FLAGS={
      vn:(X,Y)=>star(X,Y,1.5,1.0,.62)?0xffff00:0xda251d,
      ru:(X,Y)=>Y>1.333?0xffffff:(Y>.667?0x0039a6:0xd52b1e),
      ng:(X,Y)=>(X>1&&X<2)?0xffffff:0x008751,
      bd:(X,Y)=>Math.hypot(X-1.35,Y-1)<.6?0xf42a41:0x006a4e,
      id:(X,Y)=>Y>1?0xce1126:0xffffff,
      in:(X,Y)=>{const dx=X-1.5,dy=Y-1,d=Math.hypot(dx,dy);
        if(Y>.5&&Y<1.5&&(d<.05||(d>.25&&d<.34)))return 0x000080;
        if(Y>.5&&Y<1.5&&d<.34){const t=(((Math.atan2(dy,dx)/(Math.PI/12))%1)+1)%1;if(t<.14||t>.86)return 0x000080}
        return Y>1.333?0xff9933:(Y>.667?0xffffff:0x138808)},
      cn:(X,Y)=>{
        if(star(X,Y,.5,1.5,.42))return 0xffde00;
        for(const [px,py] of [[1.0,1.8],[1.2,1.6],[1.2,1.3],[1.0,1.1]])
          if(star(X,Y,px,py,.14,Math.atan2(1.5-py,.5-px)))return 0xffde00;
        return 0xde2910},
      ph:(X,Y)=>{
        if(Math.hypot(X-.52,Y-1)<.22||star(X,Y,.18,1.83,.17)||star(X,Y,.18,.17,.17)||star(X,Y,1.42,1.0,.17,0))return 0xfcd116;
        if(X<1.732*(1-Math.abs(Y-1)))return 0xffffff;
        return Y>1?0x0038a8:0xce1126},
      ua:(X,Y)=>Y>1?0x0057b7:0xffd700,
      kr:(X,Y)=>{
        const dx=X-1.5,dy=Y-1,d=Math.hypot(dx,dy);
        // 4 quẻ (trigram): 3 thanh song song, vuông góc trục chéo của cờ
        for(const [sx,sy,kind] of [[-1,1,0],[1,-1,1],[1,1,2],[-1,-1,3]]){
          const ax=sx*.83,ay=sy*.55,px=dx-ax*1.05,py=dy-ay*1.05,a=px*ax+py*ay,b=-px*ay+py*ax;
          const bar=(a2)=>Math.abs(a-a2)<.05&&Math.abs(b)<.25;
          const broken=(a2)=>bar(a2)&&Math.abs(b)>.05;
          const sol=(a2)=>bar(a2);
          const pat=[[sol,sol,sol],[broken,broken,broken],[broken,sol,broken],[sol,broken,sol]][kind];
          if(pat[0](-.2)||pat[1](0)||pat[2](.2))return 0x070707;
        }
        if(d<.5){
          const rx=dx*.83+dy*.55,ry=-dx*.55+dy*.83;
          if(Math.hypot(rx+.25,ry)<.25)return 0xcd2e3a;
          if(Math.hypot(rx-.25,ry)<.25)return 0x0047a0;
          return ry>0?0xcd2e3a:0x0047a0;
        }
        return 0xffffff}
    };
    const ORDER=['vn','ru','ng','bd','id','in','cn','ph','ua','kr'];
    let fi=0;
    const rod=(x0,x1,y,z0,z1)=>fb(x0,x1,y,y+.03,z0,z1,0x3a2412,.03);
    const flagB=cx=>{const k=ORDER[fi++],f=FLAGS[k],x0=cx-FW/2;     // tường sau (nhìn từ +z, u tăng theo +x)
      fp(x0,x0+FW,FY0,FY0+FH,-2.5,-2.5+FT,.03,(x,y)=>f((x-x0)/FW*3,(y-FY0)/FH*2));
      rod(x0-.03,x0+FW+.03,FY0+FH,-2.5,-2.5+FT*2)};
    const flagE=cz=>{const k=ORDER[fi++],f=FLAGS[k],z0=cz-FW/2;      // tường đông (nhìn từ -x, u tăng theo +z)
      fp(5.75-FT,5.75,FY0,FY0+FH,z0,z0+FW,.03,(x,y,z)=>f((z-z0)/FW*3,(y-FY0)/FH*2));
      rod(5.75-FT*2,5.75,FY0+FH,z0-.03,z0+FW+.03)};
    const flagF=cx=>{const k=ORDER[fi++],f=FLAGS[k],x1=cx+FW/2;      // tường trước (nhìn từ -z, u tăng theo -x)
      fp(x1-FW,x1,FY0,FY0+FH,1.75-FT,1.75,.03,(x,y)=>f((x1-x)/FW*3,(y-FY0)/FH*2));
      rod(x1-FW-.03,x1+.03,FY0+FH,1.75-FT*2,1.75)};
    for(let n=0;n<NPC;n++)flagB(PC0+n*PCD);       // 6 cờ trên tường sau
    flagE(-1.1);flagE(0);                          // 2 cờ trên tường đông
    flagF(3.1);flagF(4.2);                         // 2 cờ trên tường trước
  }
  // đèn bàn sáng ở đầu dãy bên phải
  fb(5.2,5.4,FL2+.875,FL2+.9,-2.4,-2.2,0x2a2a30,.025);
  fb(5.275,5.325,FL2+.9,FL2+1.3,-2.325,-2.275,0x2a2a30,.025);
  fb(5.15,5.45,FL2+1.3,FL2+1.4,-2.45,-2.15,GLOW3,.05);
  lamps.push({x:5.3,y:FL2+1.3,z:-2.3,s:1.3,light:true});
  // --- kệ sách tường trái ---
  fp(-5.75,-5.25,FL2,FL2+2.0,-.75,1.5,.125,shelfFn(16,18));
  // --- sofa thấp + logo Infinity trên tường ---
  const BLK2=[0x1b1613,0x15110e,0x221b16,0x100d0b], BLKF2=[0x2c241d,0x26201a,0x322a22];
  fb(-5.2,-3.2,FL2+.1,FL2+.4,.8,1.7,0x3a4a5a,.1);
  fb(-5.2,-3.2,FL2+.4,FL2+.9,1.55,1.7,0x34445a,.05);
  fb(-5.2,-5.0,FL2+.4,FL2+.65,.8,1.55,0x2f3f54,.05);fb(-3.4,-3.2,FL2+.4,FL2+.65,.8,1.55,0x2f3f54,.05);
  for(const x of[-5.15,-3.25])for(const z of[.85,1.6])fb(x,x+.05,FL2,FL2+.1,z,z+.05,0x2a1a10,.05);
  cushion(-4.6,1.15,FL2+.4,0xc9a227,.2);cushion(-3.8,1.15,FL2+.4,0x8a2f2f,.2);
  // bảng gỗ đen phía sau logo (sát mặt trong tường z=1.75)
  fp(-5.2,-3.0,5.55,6.85,1.68,1.75,.1,(x,y,z,i,j)=>(i<2||i>=20||j<2||j>=11)?BLKF2[(i*3+j)%3]:BLK2[(i*7+j*3)%4]);
  logo(v,-4.1,6.2,1.62,1.8,true);
  potPlant(-4.6,FL2,.1,1.1);
  // --- ĐÈN TREO TẦNG 2 ---
  pendant(0,WT2,-.375,.25,.45,.25,true);          // đèn treo duy nhất, giữa trần tầng 2

  // ================= ĐÈN ĐÁ (ishidoro) + CÂY CỎ NGOÀI VƯỜN =================
  fb(4.7,5.3,0,.2,5.3,5.9,0x666666,.1);fb(4.9,5.1,.2,.8,5.5,5.7,0x777777,.1);
  fb(4.8,5.2,.8,1.1,5.4,5.8,GLOW2,.1);fb(4.65,5.35,1.1,1.3,5.25,5.95,0x555555,.1);
  lamps.push({x:5.0,y:.95,z:5.6,s:1.4,light:false});
  const G=GRN(0x4f8a4a,0x6aa85d,0x3d7a3f),L=GRN(0x8a6fc9,0xa88be0,0x7658b5),P=GRN(0xe060a0,0xf08cbc,0xc84c88);
  v.ell(-8.1,.3,3.6,.6,.35,.5,G,.1);v.ell(-8.3,.22,2.6,.45,.22,.4,L,.1);
  v.ell(8.1,.3,3.8,.6,.35,.5,G,.1);v.ell(8.3,.22,2.7,.45,.22,.4,P,.1);
  v.ell(-7.9,.3,-3.4,.6,.35,.5,G,.1);v.ell(7.9,.3,-3.4,.6,.35,.5,G,.1);
  v.ell(3.5,.25,5.6,.45,.25,.4,G,.1);v.ell(-2.6,.25,5.7,.4,.2,.35,P,.1);

  for(const m of v.meshLOD()){m.position.set(hx,0,hz);if(FACE_RIVER)m.rotation.y=Math.PI;S.add(m);meshes.push(m)}   // meshLOD: cắt ô + bản xa nhẹ (engine/voxel.js)

  // ================= MÀN HÌNH CHAT (mặt phẳng canvas, không vào meshes -> không va chạm / không bắn trúng) =================
  screens.forEach((p,i)=>{
    const k=CHAT_KEYS[i];if(!k)return;
    const cv=document.createElement('canvas');cv.width=512;cv.height=288;
    const tex=new THREE.CanvasTexture(cv);if(THREE.SRGBColorSpace)tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
    SURF[k]={cv,g:cv.getContext('2d'),tex};
    const m=new THREE.Mesh(new THREE.PlaneGeometry(.8,.45),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));
    m.position.set(hx+sg*p.x,p.y,hz+sg*p.z);m.rotation.y=p.ry+(FACE_RIVER?Math.PI:0);
    S.add(m);prevObjs.push(m);drawChat(k);
  });

  // ================= QUẦNG SÁNG + ÁNH SÁNG VÀNG =================
  try{
    if(typeof THREE!=='undefined'){
      const tex=glowTex();
      for(const l of lamps){
        const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false}));
        sp.scale.set(l.s,l.s,1);sp.position.set(hx+sg*l.x,l.y,hz+sg*l.z);S.add(sp);prevObjs.push(sp);
        let pl=null;
        if(GLOW_LIGHTS&&l.light){
          pl=new THREE.PointLight(0xffc860,1.0,9,2);
          pl.position.set(hx+sg*l.x,l.y-.1,hz+sg*l.z);S.add(pl);prevObjs.push(pl);
        }
        if(window.DayCycle)DayCycle.reg(sp,pl);   // ban đêm đèn sáng rực, ban ngày chỉ còn quầng mờ
      }
    }
  }catch(e){}

  // ================= VA CHẠM =================
  // wh = true: khối này bao quanh giếng thang -> physics.js (nohole) bỏ qua nó khi TÂM người chơi đang nằm trong giếng.
  // FIX 2: người chơi có bán kính .35 nên đầu / vai chạm trần, lan can, tường sau ngay cả khi tâm vẫn trong giếng rộng 1.25m
  //        (còn ~.17m làn đi) -> lệch chút là bị đẩy văng. Giờ chỉ cần tâm nằm trong giếng là leo thang bình thường.
  const inWell=(x,z)=>inH(sg*(x-hx),sg*(z-hz));
  const cb=(x0,x1,y0,y1,z0,z1,wh)=>{if(x1<=x0||y1<=y0||z1<=z0)return;const o=FACE_RIVER?{x0:hx-x1,x1:hx-x0,y0,y1,z0:hz-z1,z1:hz-z0}:{x0:hx+x0,x1:hx+x1,y0,y1,z0:hz+z0,z1:hz+z1};if(wh)o.hole=inWell;boxes.push(o)};
  const cbHole=(x0,x1,y0,y1,z0,z1)=>{          // hộp va chạm có khoét giếng thang
    if(x1<=H.x0||x0>=H.x1||z1<=H.z0||z0>=H.z1)return cb(x0,x1,y0,y1,z0,z1);
    cb(x0,H.x0,y0,y1,z0,z1,1);cb(H.x1,x1,y0,y1,z0,z1,1);
    cb(Math.max(x0,H.x0),Math.min(x1,H.x1),y0,y1,z0,H.z0,1);cb(Math.max(x0,H.x0),Math.min(x1,H.x1),y0,y1,H.z1,z1,1);
  };
  cb(-7.5,7.5,0,.75,-3.75,4.5);                          // móng đá
  cb(-1.75,1.75,0,.25,4.5,5.5);cb(-1.5,1.5,0,.5,4.5,5.0); // bậc thang ngoài
  cb(-7,7,0,FL,-3.5,4.0);                                // sàn hiên
  cb(-6.25,6.25,0,GF,-3.0,2.5);                          // chiếu tatami
  // tường tầng 1
  cb(-6.5,-1.25,FL,WT,2.5,2.75);cb(1.25,6.5,FL,WT,2.5,2.75);cb(-1.25,1.25,2.75,WT,2.5,2.75);
  cb(-6.5,6.5,FL,WT,-3.25,-3.0);
  cb(-6.5,-6.25,FL,WT,-3.25,2.75);cb(6.25,6.5,FL,WT,-3.25,2.75);
  // tường tầng 2
  cb(-6,-1.25,FL2,WT2,1.75,2.0);cb(1.25,6,FL2,WT2,1.75,2.0);cb(-1.25,1.25,FL2+1.875,WT2,1.75,2.0);
  cb(-6,6,FL2,WT2,-2.75,-2.5,1);
  cb(-6,-5.75,FL2,WT2,-2.75,2.0);cb(5.75,6,FL2,WT2,-2.75,2.0);
  // các tường nhà làm vật che khuất cho occlusion culling (engine/occlusion.js đọc window.OccSrc)
  (window.OccSrc=window.OccSrc||{}).house=[
    [-6.5,-1.25,FL,WT,2.5,2.75],[1.25,6.5,FL,WT,2.5,2.75],[-1.25,1.25,2.75,WT,2.5,2.75],[-6.5,6.5,FL,WT,-3.25,-3.0],[-6.5,-6.25,FL,WT,-3.25,2.75],[6.25,6.5,FL,WT,-3.25,2.75],
    [-6,-1.25,FL2,WT2,1.75,2.0],[1.25,6,FL2,WT2,1.75,2.0],[-1.25,1.25,FL2+1.875,WT2,1.75,2.0],[-6,6,FL2,WT2,-2.75,-2.5],[-6,-5.75,FL2,WT2,-2.75,2.0],[5.75,6,FL2,WT2,-2.75,2.0]]
    .map(([x0,x1,y0,y1,z0,z1])=>FACE_RIVER?{x0:hx-x1,x1:hx-x0,y0,y1,z0:hz-z1,z1:hz-z0}:{x0:hx+x0,x1:hx+x1,y0,y1,z0:hz+z0,z1:hz+z1});
  // trần tầng 1 + mái dưới + sàn tầng 2 (khoét giếng thang)
  cbHole(-6.75,6.75,WT,RY,-3.5,3.0);
  cbHole(-8.5,8.5,RY,RY+.5,RZ-4.75,RZ+4.75);
  cbHole(-8,8,RY+.5,RY+1.0,RZ-4.25,RZ+4.25);
  cbHole(-7.25,7.25,RY+1.0,FL2,-3.75,3.25);
  cb(-6.25,6.25,WT2,RY2,-3.0,2.25);                      // trần tầng 2
  cb(-8,8,RY2,RY2+.5,RZ2-4.25,RZ2+4.25);                 // mép mái trên
  // cầu thang
  for(let n=0;n<15;n++)cb(SX-.25*(n+1),SX-.25*n,GF,GF+.25*(n+1),H.z0,H.z1);
  // lan can hiên tầng 1
  cb(-7,-1.75,FL,FL+1,3.875,4.0);cb(1.75,7,FL,FL+1,3.875,4.0);
  cb(6.875,7,FL,FL+1,2.75,4.0);cb(-7,-6.875,FL,FL+1,2.75,4.0);
  // lan can ban công tầng 2 + giếng thang
  cb(-7.25,7.25,FL2,FL2+1,3.125,3.25);cb(-7.25,7.25,FL2,FL2+1,-3.75,-3.625);
  cb(7.125,7.25,FL2,FL2+1,-3.75,3.25);cb(-7.25,-7.125,FL2,FL2+1,-3.75,3.25);
  cb(-4.75,H.x1,FL2,FL2+1,-1.625,-1.5,1);cb(H.x1-.125,H.x1,FL2,FL2+1,-2.75,-1.5,1);
  // nội thất tầng 1
  cb(-1.25,1.25,GF,1.375,-1.75,-.75);                    // bàn trà
  cb(2.625,4.875,GF,1.5,-.625,1.625);                    // kotatsu
  cb(2.5,6.0,GF,2.125,-3.0,-2.125);                      // bếp
  cb(-6.25,-5.5,GF,2.375,-.25,1.25);                      // tansu
  cb(-6.25,-5.75,GF,2.75,1.25,2.375);                      // kệ sách
  cb(5.5,6.25,GF,1.75,1.25,2.375);                       // tủ thấp
  cb(1.4,2.4,GF,1.5,2.125,2.5);                          // kệ giày
  cb(-5.4,-4.6,GF,1.5,1.65,2.45);                        // bệ bonsai
  // nội thất tầng 2
  cb(-1.4,5.6,FL2,FL2+.9,-2.5,-1.75);                     // dãy bàn làm việc (6 máy)
  cb(-5.75,-5.25,FL2,FL2+2.0,-.75,1.5);                  // kệ sách
  cb(-.5,1.0,FL2,FL2+.5,-.4,.6);                         // bàn thấp
  cb(-5.2,-3.2,FL2,FL2+.9,.8,1.75);                      // sofa
  cb(2.5,4.875,FL2,FL2+.9,1.0,1.75);                      // bàn tường trước (2 máy)
  cb(4.875,5.75,FL2,FL2+.9,-1.75,1.75);                  // dãy bàn tường đông (2 máy)
  // đồ ngoài
  cb(-6.8,-4.2,0,2.75,5.1,5.3);                          // biển hiệu
  cb(4.65,5.35,0,1.3,5.25,5.95);                         // đèn đá
}
buildHouse(HX,HZ);
window.HouseZone=(x,z)=>x>HX-8.8&&x<HX+8.8&&(FACE_RIVER?(z>HZ-6.2&&z<HZ+5.4):(z>HZ-5.4&&z<HZ+6.2));
window.House={build:buildHouse,rebuild:()=>buildHouse(HX,HZ)};
})();