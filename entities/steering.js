// Di chuyển của quái: né vật cản (steering) + nhảy qua khối thấp + ĐI QUA CẦU + AI chiến thuật (bọc sườn, rình, lượn né đạn)
// b.dry = true: bot KHÔNG lội xuống sông (chỉ đi trên cầu). Được botNav() bật khi tầng có cầu và đích không nằm dưới nước.
const free=(b,ax,az,len,dy=.3,h=1.2)=>!hitAny({x:b.x+ax*len,y:b.y+dy,z:b.z+az*len,r:b.r,h})&&!(b.dry&&Nature.wetAt(curFl,b.x+ax*len,b.z+az*len,.3));
function steer(b,tx,tz,sp,dt){
  const a0=Math.atan2(tx-b.x,tz-b.z),s=b.side||1,len=b.r+.5,so=b.sw?1.4:0;let a=null;   // so: đang bơi -> dò vật cản cao hơn mặt nước, bờ/sàn không chặn đường
  if(b.ground&&!free(b,Math.sin(a0),Math.cos(a0),len,.6)&&free(b,Math.sin(a0),Math.cos(a0),len,1.5,.3)){b.vy=8;b.ground=false}
  for(const o of[0,.6*s,-.6*s,1.2*s,-1.2*s,1.9*s,-1.9*s]){
    const A=a0+o;if(free(b,Math.sin(A),Math.cos(A),len,.6+so)){a=A;if(o)b.side=Math.sign(o);break}}
  if(a===null)a=a0+Math.PI*s;
  move(b,Math.sin(a)*sp*dt,b.vy*dt,Math.cos(a)*sp*dt);
}

// ---------------- ĐI QUA CẦU ----------------
// Cầu do nature.js đăng ký: Nature.bridges(tầng) -> [{along,q,wa,wb}] (q = tọa độ cố định của trục cầu, wa..wb = đoạn cầu chạy dọc theo w).
const brLoc=(B,x,z)=>B.along?[x,z]:[z,x];      // (x,z) -> [q,w]
const brPt=(B,q,w)=>B.along?[q,w]:[w,q];        // [q,w] -> [x,z]
// đường thẳng (x0,z0)->(x1,z1) có cắt nước không (bỏ 1.5m cuối để đích sát bờ không bị tính)
function crossesWater(x0,z0,x1,z1){
  const L=Math.hypot(x1-x0,z1-z0),n=Math.floor((L-1.5)/1.1);
  for(let i=1;i<=n;i++){const u=i*1.1/L;if(Nature.wetAt(curFl,x0+(x1-x0)*u,z0+(z1-z0)*u,.2))return true}
  return false;
}
// Trả về điểm cần đi tới (đầu cầu, hoặc điểm dẫn đường dọc trục cầu) nếu sông đang chắn giữa bot và đích (tx,tz); không cần qua cầu thì trả null.
// Dùng chung cho bot thường và boss.
function botNav(b,tx,tz,dt){
  b.dry=false;
  const NA=window.Nature;if(!NA||!NA.bridges||b.sw)return null;   // đang bơi thì cứ đi thẳng cho lên bờ
  const br=NA.bridges(curFl);if(!br.length)return null;
  const V=b.nv||(b.nv={brg:null,nT:0,cool:0,bt:0});
  V.nT-=dt;V.cool-=dt;
  if(NA.wetAt(curFl,tx,tz,.3)){V.brg=null;return null}   // đích ở dưới nước (người chơi đang bơi): lao thẳng, không né nước
  b.dry=true;                                            // bình thường bot không lội xuống sông, chỉ qua cầu
  if(V.nT<=0){
    V.nT=.35+Math.random()*.15;
    const cr=crossesWater(b.x,b.z,tx,tz);
    if(V.brg){V.bt+=.4;if(!cr||V.bt>30){V.brg=null}}      // hết bị sông chắn, hoặc kẹt quá lâu -> bỏ
    else if(cr&&V.cool<=0){                                // sông chắn đường -> chọn cầu + chiều đi rẻ nhất
      let best=null,bc=1e9;
      br.forEach((B,i)=>{for(const s of[1,-1]){
        const wE=s>0?B.wa-3:B.wb+3,wX=s>0?B.wb+3:B.wa-3,E=brPt(B,B.q,wE),X=brPt(B,B.q,wX);
        let c=Math.hypot(E[0]-b.x,E[1]-b.z)+(B.wb-B.wa)+Math.hypot(tx-X[0],tz-X[1]);
        if(crossesWater(b.x,b.z,E[0],E[1]))c+=200;         // đầu cầu nằm bên kia sông
        if(crossesWater(X[0],X[1],tx,tz))c+=200;           // qua cầu rồi vẫn bị sông chắn
        if(c<bc){bc=c;best={i,s}}}});
      if(best){V.brg=best;V.bt=0}
    }
  }
  if(!V.brg)return null;
  const B=br[V.brg.i];if(!B){V.brg=null;return null}
  const s=V.brg.s,[qq,ww]=brLoc(B,b.x,b.z),wE=s>0?B.wa-3:B.wb+3,wX=s>0?B.wb+3:B.wa-3;
  if(Math.abs(qq-B.q)<3&&(s>0?ww>=wX-.4:ww<=wX+.4)){V.brg=null;V.cool=2.5;return null}   // qua cầu xong
  // đã vào hành lang cầu: nhắm vào điểm phía trước NGAY TRÊN trục cầu (tự căn giữa, không cạ lan can); chưa vào thì tới đầu cầu
  const inC=Math.abs(qq-B.q)<2.4&&(s>0?ww>=wE-1.5&&ww<=wX:ww<=wE+1.5&&ww>=wX);
  const w2=inC?(s>0?Math.min(wX,ww+3):Math.max(wX,ww-3)):wE,p=brPt(B,B.q,w2);
  return {x:p[0],z:p[1]};
}

// ---------------- AI CHIẾN THUẬT CHO BOT THƯỜNG ----------------
// 3 kiểu (chọn ngẫu nhiên mỗi lần xuất hiện):
//  0 XÔNG PHA (30%): lao thẳng nhưng lượn zíc-zắc để né đạn
//  1 BỌC SƯỜN (50%): đi vòng xoắn ốc về phía sau lưng người chơi rồi mới lao vào
//  2 RÌNH RẬP (20%): khi bị người chơi nhìn thì lết chậm và né sang bên; khi người chơi quay đi thì lao nhanh
// Chung: tự đi qua cầu, đẩy nhau ra (không dồn cục), phát hiện kẹt thì đổi hướng vòng qua.
// Trả về mv (0..1.25) để main.js làm hoạt ảnh chân.
function botAI(b,dt,dx,dz,d){
  let A=b.ai;
  if(!A){const r=Math.random();A=b.ai={style:r<.3?0:r<.8?1:2,fs:Math.random()<.5?1:-1,ph:Math.random()*6.283,wv:.9+Math.random()*.7,fT:0,tw:0,sx:b.x,sz:b.z,sT:0,uT:0,ux:0,uz:0}}
  const dd=d||1,nx=dx/dd,nz=dz/dd;                                   // hướng từ bot tới người chơi
  const fx=-Math.sin(yaw),fz=-Math.cos(yaw),watched=-(fx*nx+fz*nz)>.5;   // bot nằm trong nón 60° trước mặt người chơi
  let tx=P.x,tz=P.z,sp=A.style===0?3:2.7;
  const nv=botNav(b,P.x,P.z,dt);                                     // sông chắn giữa bot và NGƯỜI CHƠI -> đi qua cầu (bỏ qua chiến thuật cho tới khi qua cầu xong)
  if(nv){tx=nv.x;tz=nv.z}
  else{
    if(A.style===1&&d>7){                                            // bọc sườn: xoắn ốc về phía sau lưng (góc yaw) lệch sang 1 bên
      const th=Math.atan2(b.x-P.x,b.z-P.z);let df=yaw+A.fs*.6-th;df=Math.atan2(Math.sin(df),Math.cos(df));
      const th2=th+Math.max(-.5,Math.min(.5,df)),R=Math.max(3,d-3);
      tx=P.x+Math.sin(th2)*R;tz=P.z+Math.cos(th2)*R;
    }else if(A.style===2&&d>4){
      if((A.fT-=dt)<=0){A.fT=2+Math.random()*3;A.fs=-A.fs}
      if(watched&&d<40){sp=1.5;tx=b.x-nz*A.fs*6+nx*2;tz=b.z+nx*A.fs*6+nz*2}   // đang bị nhìn: né ngang, nhích dần lại
      else sp=3.3;                                                   // người chơi quay đi: lao nhanh
    }
    if(b.dry&&(tx!==P.x||tz!==P.z)&&Nature.wetAt(curFl,tx,tz,.5)){tx=P.x;tz=P.z}   // điểm chiến thuật rơi xuống sông -> quay về đích thật
  }
  let ux=tx-b.x,uz=tz-b.z;const ul=Math.hypot(ux,uz)||1;ux/=ul;uz/=ul;
  if(!nv&&d<16&&d>3&&A.style<2){                                     // lượn zíc-zắc né đạn khi ở tầm bắn
    A.tw+=dt*A.wv*3.2;const w=Math.sin(A.tw+A.ph)*.55,px=-uz,pz=ux;ux+=px*w;uz+=pz*w;
  }
  for(const o of bots){                                              // đẩy nhau ra, không dồn thành 1 cục
    if(o===b||!o.on||o.hp<=0)continue;
    const ox=b.x-o.x,oz=b.z-o.z;if(ox>1.6||ox<-1.6||oz>1.6||oz<-1.6||Math.abs(o.y-b.y)>2)continue;
    const od=Math.hypot(ox,oz)||.01;if(od<1.6){const k=(1.6-od)/1.6*1.4/od;ux+=ox*k;uz+=oz*k}
  }
  A.sT+=dt;                                                          // phát hiện kẹt: 0.7s mà nhích < .45m -> đổi hướng vòng qua 1 lúc
  if(A.sT>=.7){
    const mvd=Math.hypot(b.x-A.sx,b.z-A.sz);A.sx=b.x;A.sz=b.z;A.sT=0;
    if(mvd<.45*(sp/2.6)&&d>2.5&&A.uT<=0){
      const a=(Math.random()<.5?1:-1)*(1.6+Math.random()*1.2),c=Math.cos(a),s=Math.sin(a),l0=Math.hypot(ux,uz)||1;
      A.ux=(ux*c-uz*s)/l0;A.uz=(ux*s+uz*c)/l0;A.uT=1.1+Math.random()*.8}}
  if(A.uT>0){A.uT-=dt;ux=ux*.25+A.ux;uz=uz*.25+A.uz}
  const l=Math.hypot(ux,uz)||1;ux/=l;uz/=l;
  b.hd=Math.atan2(ux,uz);b.hdUse=(d>12||nv)?1:0;                     // ở xa / đang đi cầu: quay mặt theo hướng đi; ở gần: nhìn thẳng người chơi
  steer(b,b.x+ux*8,b.z+uz*8,sp,dt);
  return Math.min(1.25,sp/2.6);
}

// ---------------- ĐI LẠI BÌNH THƯỜNG (người chơi đang ở trong chòi: peace=true) ----------------
// Bot không đuổi / không đánh: đi thong thả tới 1 điểm ngẫu nhiên quanh mình, dừng nghỉ 1-4 giây (tùy lần), rồi chọn điểm khác. Né nước như bot thường, kẹt thì đổi điểm.
// Trả về mv (như botAI) để main.js làm hoạt ảnh chân. Boss cũng dùng hàm này (boss.js) và không bắn.
function botWander(b,dt){
  let W=b.wd;if(!W)W=b.wd={tx:b.x,tz:b.z,t:0,wait:Math.random()*2,sx:b.x,sz:b.z,sT:0};
  b.dry=!!(window.Nature&&Nature.wetAt);                       // không lội xuống sông
  if(W.wait>0){W.wait-=dt;move(b,0,b.vy*dt,0);return 0}        // đứng nghỉ (vẫn áp trọng lực: main.js / bossAI đã trừ b.vy)
  let dx=W.tx-b.x,dz=W.tz-b.z,d=Math.hypot(dx,dz);
  W.t-=dt;
  if(d<.7||W.t<=0){                                            // tới nơi / quá lâu -> chọn điểm mới (trong 3-10m)
    const a=Math.random()*6.283,r=3+Math.random()*7,nx=b.x+Math.sin(a)*r,nz=b.z+Math.cos(a)*r;
    if(!(window.Nature&&Nature.wetAt&&Nature.wetAt(curFl,nx,nz,.5))){W.tx=nx;W.tz=nz;W.t=8+Math.random()*4}
    W.wait=Math.random()<.5?1+Math.random()*3:0;move(b,0,b.vy*dt,0);return 0}
  W.sT+=dt;if(W.sT>=1){const mvd=Math.hypot(b.x-W.sx,b.z-W.sz);W.sx=b.x;W.sz=b.z;W.sT=0;if(mvd<.3)W.t=0}   // kẹt (nhích < .3m trong 1s) -> chọn điểm khác
  b.hd=Math.atan2(dx,dz);b.hdUse=1;                            // quay mặt theo hướng đi
  steer(b,W.tx,W.tz,1.6,dt);
  return .6;
}
