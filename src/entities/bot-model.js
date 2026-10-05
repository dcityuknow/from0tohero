// Bot thường: mô hình voxel chi tiết (đầu, thân, tay, chân), spawn, nhân bản bot
const bots=[],botMeshes=[];
const spawns=[[-10,-16],[14,-14],[-14,14],[14,10],[0,-17],[-12,2],[12,-2]];
// ---------- DỮ LIỆU LOGO (lấy mẫu từ ảnh gốc) ----------
// Lưới 120x66, '.' = trống, ký tự khác = độ sáng xám 0..63.
const BLG_W=120,BLG_H=66,BLG_ASPECT=1.8207,BLG_B64='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/';
const BLG_PX=[
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
function botLogoGrid(nx,ny){
  const out=new Array(nx*ny).fill(-1);
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const ya=Math.floor(j*BLG_H/ny),yb=Math.max(Math.floor((j+1)*BLG_H/ny),ya+1),
          xa=Math.floor(i*BLG_W/nx),xb=Math.max(Math.floor((i+1)*BLG_W/nx),xa+1);
    let cnt=0,tot=0,sum=0;
    for(let r=ya;r<yb;r++)for(let c=xa;c<xb;c++){tot++;const ch=BLG_PX[r*BLG_W+c];if(ch!=='.'){cnt++;sum+=BLG_B64.indexOf(ch)}}
    if(cnt/tot>=.5)out[j*nx+i]=Math.round(sum/cnt/63*255);
  }
  return out;
}
// ---------- MẮT PHÁT SÁNG KHI TRỜI TỐI ----------
// "Mắt" của bot = logo vô cực trên kính đen. Ngoài logo thường (ăn đèn nên tối thui về đêm), mỗi bot có thêm 1 BẢN PHỦ cùng hình dạng, vẽ bằng
// vật liệu KHÔNG ăn đèn (Basic). daycycle.js điều khiển vật liệu này theo cùng đường cong "độ tối" (nightK) với đèn lồng:
//   · nightK <= .25 (ban ngày / sáng / chiều): material.visible=false -> KHÔNG vẽ, không tốn thêm draw call; thấy logo thường như cũ
//   · .25 -> .9 (hoàng hôn / rạng đông): màu nội suy từ trắng thường sang màu EYEG nên mắt sáng dần lên (và tắt dần khi bình minh)
//   · >= .9 (đêm): sáng rực màu EYEG. Sương mù vẫn che như vật thường, nên bot ở xa trong sương không lộ chấm sáng.
// Đổi màu mắt: sửa EYEG (r,g,b có thể > 1 để chói). Ví dụ đỏ [2.2,.5,.4] · vàng [2.2,1.7,.5] · xanh lá [.6,2.1,.8]. Đổi lúc bắt đầu sáng: tham số .25 / .9 bên dưới.
const EYEG=[.7,1.8,2.1];
const BOTEYE=new THREE.MeshBasicMaterial({vertexColors:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});   // polygonOffset: bản phủ thắng logo thường trong depth test, không nhấp nháy
BOTEYE.visible=false;
if(window.DayCycle&&DayCycle.glow)DayCycle.glow(BOTEYE,[1,1,1],EYEG,.25,.9);
// bản phủ chỉ cần mặt TRƯỚC (+z, là mặt thứ 5 trong FACES của voxel.js) của mỗi khối logo; 5 mặt còn lại bị kính che hoặc quay đi -> bỏ, giảm 6 lần số tam giác
function frontOnly(vb){
  const P=[],N=[],C=[],I=[],nC=(vb.k/24)|0;let k=0;
  for(let c=0;c<nC;c++){
    for(let v=0;v<4;v++){const s=(c*24+4*4+v)*3;P.push(vb.p[s],vb.p[s+1],vb.p[s+2]);N.push(vb.n[s],vb.n[s+1],vb.n[s+2]);C.push(vb.c[s],vb.c[s+1],vb.c[s+2])}
    I.push(k,k+1,k+2,k,k+2,k+3);k+=4;
  }
  vb.p=P;vb.n=N;vb.c=C;vb.i=I;vb.k=k;
}
function buildBot(){
  const b={x:0,y:0,z:0,vy:0,r:.4,h:1.7,hp:100,ground:false,respawn:0,t:0,mv:0,parts:[],g:new THREE.Group()};
  // mỗi bộ phận = 1 mesh gộp (VB nhớ lại từng khối để vỡ mảnh); head=true để tính headshot
  const add=(par,vb,head)=>{const m=vb.mesh();m.userData.bot=b;if(head)m.userData.head=true;par.add(m);botMeshes.push(m);b.parts.push({mesh:m,vb});return m};
  const pivot=(x,y)=>{const q=new THREE.Group();q.position.set(x,y,0);b.g.add(q);return q};
  // BỘ MÀU ĐEN: RED = thân + tay áo, DRED = chân + giáp vai (đen sâu hơn), BLU = ba lô (đen xám), ORG = găng tay. PINK = đầu (giữ hồng, đổi ở đây nếu muốn đầu cũng đen)
  const RED=tri(0x26262d,0x30303a,0x1d1d24),PINK=tri(0xff7a88,0xff95a0,0xf0606f),DRED=tri(0x15151a,0x1c1c22,0x101014),BLU=tri(0x2d3340,0x384050,0x252b36),ORG=tri(0x3a3a44,0x45454f,0x2f2f38);
  // thân: đai vàng, huy hiệu kim cương trước ngực, khóa thắt lưng, dây đeo, ba lô xanh
  const T=new VB(true);
  T.box(0,.95,0,.7,.7,.4,(i,j,k,nx,ny,nz)=>{
    if(j<2)return (i+k)&1?0xffd23f:0xffe680;
    if(k===nz-1){const d=Math.abs(i-(nx-1)/2)+Math.abs(j-8);if(d<=1)return 0xff4d5e;if(d<=3)return 0xffd23f}
    return RED(i,j,k)},.05,true);
  T.box(0,.66,.215,.14,.1,.03,0xffd23f,.02);T.box(0,.66,.235,.05,.05,.02,0x4d9dff,.015);
  T.box(-.2,.98,.212,.07,.6,.03,0x3a3850,.02);T.box(.2,.98,.212,.07,.6,.03,0x3a3850,.02);
  T.box(0,1.32,0,.3,.06,.28,0x3a3850,.03,true);
  T.box(0,1.0,-.28,.42,.44,.16,BLU,.045,true);T.box(0,1.15,-.29,.44,.1,.18,0x3a4256,.04,true);
  T.box(0,.88,-.375,.28,.16,.03,0xffd23f,.03,true);T.box(0,1.05,-.375,.06,.06,.02,0xff4d5e,.02);
  add(b.g,T,false);
  // đầu (to hơn ~27%): kính đen chắn mắt + logo trắng như boss, miệng có răng, má hồng, tai nghe, mũ nhiều màu, ăng-ten
  const H=new VB(true),HY=1.6,VY=1.65,VF=.32;
  const E=new VB();E.seed=2;   // E = bản phủ phát sáng của logo mắt (seed=2 như H lúc dựng logo -> sắc độ từng khối giống hệt logo thường)
  H.box(0,HY,0,.56,.56,.56,PINK,.05,true);
  H.box(0,VY,.27,.6,.28,.1,(i,j,k)=>(i+j+k)&1?0x14141b:0x1e1e27,.04,true);   // kính đen
  // logo vô cực trên kính: lấy mẫu trực tiếp từ ảnh logo gốc (cùng dữ liệu với house.js) -> đúng hình dạng, độ cong, sắc độ
  {const LW=.46,LS=.0139,nx=Math.round(LW/LS),ny=Math.round(nx/BLG_ASPECT),LH=LW/BLG_ASPECT,lg=botLogoGrid(nx,ny);
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
      const l=lg[j*nx+i];if(l<0)continue;
      const px=(-.5+(i+.5)/nx)*LW,py=VY+(.5-(j+.5)/ny)*LH,lc=(l<<16)|(l<<8)|l;
      H.cube(px,py,VF+.01,LS*.95,LS*.95,.02,lc,i,j,0);
      E.cube(px,py,VF+.012,LS*.95,LS*.95,.02,lc,i,j,0)}}   // bản phủ nhích ra trước 2mm (cộng polygonOffset ở BOTEYE)
  H.box(0,1.4,.292,.28,.06,.02,0x2b2a3a,.01);H.box(0,1.4,.305,.25,.035,.01,(i)=>i&1?0xffffff:-1,.02);
  for(const sx of[-.2,.2])H.box(sx,1.45,.286,.07,.04,.012,0xff9fbf,.02);
  for(const sx of[-1,1]){H.cyl(sx*.3,1.6,0,.08,.05,0xffd23f,.02,'x');H.cyl(sx*.325,1.6,0,.045,.02,0x3a3850,.015,'x')}
  H.box(0,1.91,0,.4,.06,.4,tri(0xffd23f,0x4d9dff,0x7fe0a0),.04,true);H.box(0,1.89,.26,.4,.03,.14,0xff9a3c,.03);
  H.cyl(.1,2.0,0,.012,.12,0x3a3850,.012,'y');H.ell(.1,2.09,0,.035,.035,.035,0xff2a4d,.015);
  add(b.g,H,true);
  {frontOnly(E);const eye=E.mesh();eye.material=BOTEYE;b.g.add(eye);b.eyes=eye}   // mắt phát sáng: cố ý KHÔNG đưa vào parts / botMeshes (không ảnh hưởng bắn trúng, headshot, vỡ mảnh)
  b.lL=pivot(-.17,.6);b.lR=pivot(.17,.6);b.aL=pivot(-.46,1.27);b.aR=pivot(.46,1.27);
  // chân: đầu gối vàng, giày trắng viền xanh, đế đen
  for(const l of[b.lL,b.lR]){
    const v=new VB(true);
    v.box(0,-.24,0,.3,.48,.32,DRED,.05,true);v.box(0,-.27,.175,.22,.14,.05,0xffd23f,.03);v.box(0,-.47,0,.32,.05,.34,0xffd23f,.025,true);
    v.box(0,-.54,.05,.32,.12,.44,(i,j)=>j===0?0x3a3850:((i+j)&1?0xf4f4f8:0xe4e4ee),.04,true);v.box(0,-.54,.24,.3,.11,.06,0x4d9dff,.03);
    add(l,v,false);
  }
  // tay: vai giáp, tay áo, cổ tay vàng, găng cam
  for(const a of[b.aL,b.aR]){
    const v=new VB(true);
    v.box(0,-.22,0,.22,.44,.26,RED,.05,true);v.box(0,-.47,0,.24,.06,.28,0xffd23f,.03,true);v.box(0,-.56,0,.2,.12,.24,ORG,.04,true);
    v.box(0,-.6,.1,.18,.03,.05,0x3a3850,.02);
    v.box(0,.02,0,.3,.1,.34,DRED,.05,true);v.box(0,.075,0,.3,.02,.34,0xffd23f,.02);
    add(a,v,false);
  }
  S.add(b.g);bots.push(b);spawnBot(b);return b;
}
function spawnBot(b){
  const SPL=fSpawns(curFl);let best=SPL[0],bd=-1;
  for(const s of SPL){const d=Math.hypot(s[0]-P.x,s[1]-P.z);if(d>bd&&Math.random()<.7){bd=d;best=s}}
  b.x=best[0];b.z=best[1];b.y=FY(curFl);b.vy=0;b.hp=b.maxhp||100;b.respawn=0;b.g.visible=true;
  b.fy=undefined;b.ai=null;b.nv=null;b.dry=false;b.hdUse=0;b.ry=undefined;   // AI + đường đi (steering.js) tạo lại mỗi lần xuất hiện
  b.talker=!b.boss&&Math.random()<.3;b.tt=1.5+Math.random()*5;b.tShow=0;b.tw=0;b.tTok=(b.tTok||0)+1;   // 30% bot nói chuyện được (boss-talk.js)
}
// Bot thứ 2 trở đi dùng chung geometry với bot đầu tiên (nhẹ RAM, tạo tức thì) - cần cho việc sinh hàng chục/trăm bot
function mkBot(){
  const p=bots[0];if(!p)return buildBot();
  const b={x:0,y:0,z:0,vy:0,r:.4,h:1.7,hp:100,ground:false,respawn:0,t:0,mv:0,parts:[],g:new THREE.Group()};
  const pv=(x,y)=>{const q=new THREE.Group();q.position.set(x,y,0);b.g.add(q);return q};
  b.lL=pv(-.17,.6);b.lR=pv(.17,.6);b.aL=pv(-.46,1.27);b.aR=pv(.46,1.27);
  const mp=new Map([[p.g,b.g],[p.lL,b.lL],[p.lR,b.lR],[p.aL,b.aL],[p.aR,b.aR]]);
  for(const pt of p.parts){const m=new THREE.Mesh(pt.mesh.geometry,VMAT);m.userData.bot=b;if(pt.mesh.userData.head)m.userData.head=true;mp.get(pt.mesh.parent).add(m);botMeshes.push(m);b.parts.push({mesh:m,vb:pt.vb})}
  if(p.eyes){const e=new THREE.Mesh(p.eyes.geometry,BOTEYE);b.g.add(e);b.eyes=e}   // dùng chung geometry mắt với bot đầu tiên
  S.add(b.g);bots.push(b);spawnBot(b);return b;
}
for(let i=0;i<4;i++)mkBot();