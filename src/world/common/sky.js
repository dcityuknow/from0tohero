// Bầu trời: (1) vòm trời gradient + mây kim loại bóng dạng "giọt nước" (metaball) ở tầng cao nhất, không có trần;
// (2) các tầng dưới có trần: nhiều lớp sương mù trắng đặc sát trần che kín trần + mây nhỏ bay lơ lửng bên dưới (SKYFOG).
// Chỉnh nhanh ở SKY. Nạp SAU world.js, TRƯỚC level.js (level.js gọi ceilWhite khi dựng sàn).
const SKY={
  clouds:34,             // số đám mây ở tầng cao nhất
  hMin:40,hMax:90,       // độ cao mây tính từ đỉnh tòa nhà (m) - tăng lên cho mây nhìn cao hơn
  sMin:7,sMax:17,        // cỡ đám mây (m)
  spread:200,            // mây rải trong bán kính này quanh tâm map
  drift:1.6,             // tốc độ trôi (m/s)
  horizon:0xcfe8ff,mid:0x8ec5f5,top:0x3f8fe6,  // màu chân trời -> giữa -> đỉnh vòm
  // Độ mịn lưới của MỖI đám mây [số đoạn ngang, số đoạn dọc]. Bản cũ 96x64 = ~12.000 tam giác / lớp mây (mỗi đám 3 lớp, tầng cao nhất 34 đám = ~1,2 triệu tam giác).
  // Mây trắng mờ nên giảm lưới gần như không đổi hình; muốn trả lại như cũ: [96,64].
  segTop:[56,36],        // mây ở tầng cao nhất (to, ở xa)
  segFl:[36,24]          // mây nhỏ lơ lửng ở các tầng 1-3
};
// Hình dạng mây = 4 "hạt" (đo từ ảnh mẫu): 1 hạt tròn, 2 hạt nối (hình đậu phộng), 3 hạt nối (tam giác bo tròn), 4 hạt nối (hình thoi bo tròn).
// Mây ĐỨNG THẲNG và luôn quay mặt về phía người chơi (xem tickSky), màu trắng mờ nhiều lớp như lớp sương trên trần.
// Mỗi hạt: b = các giọt [x,y,bán kính] trên mặt phẳng đứng của đám mây (khớp ảnh mẫu: x ngang, y dọc),
//          K = độ hòa trộn giữa các giọt (lớn = eo thắt mượt, nhỏ = lộ rõ từng giọt),
//          w = bán kính bo tròn mép, h = nửa độ dày (h>w thì giữa phẳng như chiếc gối; h=w=1 ở hạt đơn = hình cầu thật).
const CLOUD_SHAPES=[
  {K:.7, w:1,  h:1,   b:[[0,0,1]]},
  {K:1.32,w:.6, h:.75,b:[[-1.14,0,1],[1.14,0,1]]},
  {K:.82,w:.45,h:.6, b:[[-.66,1.1,1],[-.66,-1.1,1],[1.2,0,1],[0,0,1.13]]},
  {K:.58,w:.4, h:.55,b:[[0,1.41,.8],[0,-1.41,.8],[-1.95,0,1],[1.95,0,1],[0,0,1.79]]}
];
const CLOUD_FLAT=.8;   // nhân độ dày mây theo chiều nhìn (từ người chơi tới mây): 1 = dày như ảnh mẫu, nhỏ hơn = mỏng hơn
const CLOUD_LAYERS=[[1,.50],[.8,.45],[.6,.40]];   // các lớp lồng nhau của 1 đám mây: [tỉ lệ cỡ, độ đặc 0..1]; giữa đám dày (các lớp chồng nhau), mép loãng dần
const _hex=h=>[(h>>16)&255,(h>>8)&255,h&255];
const HAZE=[],CEILMATS=[];   // vật liệu mây / sương / mặt dưới sàn: daycycle.js nhân màu theo giờ trong ngày
// Mây 3D: viền 2D là "hợp mượt" (smooth-union) của các giọt tròn, rồi "bơm phồng" thành khối có mép bo tròn (mặt giữa phẳng, mép cong như giọt thủy ngân).
// Dựng lưới bằng cách chiếu tia từ tâm ra mặt SDF; pháp tuyến lấy từ gradient nên bóng mịn, không lộ đường nối.
function cloudGeometry(sh,ws,hs){
  const B=sh.b,K=sh.K,w=sh.w,hh=sh.h;
  const sdf=(x,y,z)=>{
    let d=1e9;
    for(const b of B){const q=Math.hypot(x-b[0],z-b[1])-b[2],k=Math.max(K-Math.abs(d-q),0)/K;d=Math.min(d,q)-k*k*K/4}
    const A=d+w,E=Math.abs(y)-(hh-w);
    return Math.min(Math.max(A,E),0)+Math.hypot(Math.max(A,0),Math.max(E,0))-w;
  };
  const cx=B.reduce((a,b)=>a+b[0],0)/B.length,cz=B.reduce((a,b)=>a+b[1],0)/B.length;
  const g=new THREE.SphereGeometry(1,ws||96,hs||64),p=g.attributes.position,n=g.attributes.normal,e=.01;
  for(let i=0;i<p.count;i++){
    // nén hướng tia về phía xích đạo để phần mép bo tròn có nhiều đỉnh lưới hơn mặt phẳng giữa
    let dx=p.getX(i),dy=p.getY(i)*.4,dz=p.getZ(i);const dl=Math.hypot(dx,dy,dz)||1;dx/=dl;dy/=dl;dz/=dl;
    let lo=0,hi=7;
    for(let k=0;k<24;k++){const m=(lo+hi)/2;if(sdf(cx+dx*m,dy*m,cz+dz*m)<0)lo=m;else hi=m}
    const x=cx+dx*lo,y=dy*lo,z=cz+dz*lo;p.setXYZ(i,x,y,z);
    const gx=sdf(x+e,y,z)-sdf(x-e,y,z),gy=sdf(x,y+e,z)-sdf(x,y-e,z),gz=sdf(x,y,z+e)-sdf(x,y,z-e),l=Math.hypot(gx,gy,gz)||1;
    n.setXYZ(i,gx/l,gy/l,gz/l);
  }
  g.rotateX(Math.PI/2);   // dựng đứng: hình mây nằm trên mặt đứng (x,y), độ dày hướng về phía người chơi (+z)
  return g;
}
// Chất liệu mây: trắng mờ như lớp sương trên trần. Đặc ở phần giữa, loãng dần ra mép (mép mềm, không viền); đỉnh trắng, đáy hơi xanh xám để có khối.
// fog=true cho mây nhỏ ở các tầng (chịu sương của cảnh), false cho mây tầng cao nhất.
function hazeMaterial(fog,alpha){
  const hm=new THREE.ShaderMaterial({
    fog:fog,transparent:true,depthWrite:false,
    uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{uA:{value:alpha},uT:{value:new THREE.Color(1,1,1)}}]),
    vertexShader:`varying vec3 vN;varying vec3 vP;
#include <fog_pars_vertex>
void main(){
  vec4 mvPosition=modelViewMatrix*vec4(position,1.0);
  vP=mvPosition.xyz;vN=normalize(normalMatrix*normal);
  gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`,
    fragmentShader:`uniform float uA;uniform vec3 uT;varying vec3 vN;varying vec3 vP;
#include <fog_pars_fragment>
float ss(float a,float b,float x){x=clamp((x-a)/(b-a),0.0,1.0);return x*x*(3.0-2.0*x);}
void main(){
  vec3 N=normalize(vN),V=normalize(vP);
  float c=clamp(dot(N,-V),0.0,1.0);                        // độ hướng về người chơi: 1 = chính diện, 0 = mép
  float a=uA*ss(0.0,0.8,c);                                // mép trong suốt, giữa đặc dần
  vec3 col=mix(vec3(0.90,0.94,0.99),vec3(1.0),ss(-0.7,0.2,N.y));   // chỉ đáy mây hơi xanh nhạt, còn lại trắng
  gl_FragColor=vec4(col*uT,a);
#include <fog_fragment>
}`
  });
  HAZE.push(hm);return hm;
}
function cloudMats(fog){return CLOUD_LAYERS.map(l=>hazeMaterial(fog,l[1]))}
// 1 đám mây = nhiều lớp cùng hình, lồng nhau, mỗi lớp nhỏ hơn và mờ: chồng lên nhau thành mây trắng mờ nhiều lớp
function cloudObj(geo,mats){
  const g=new THREE.Group();
  CLOUD_LAYERS.forEach((l,i)=>{const m=new THREE.Mesh(geo,mats[i]);m.scale.setScalar(l[0]);m.renderOrder=2;m.frustumCulled=false;g.add(m)});
  return g;
}
// mây luôn đứng thẳng và quay mặt về phía người chơi (chỉ xoay quanh trục dọc)
function _face(m){m.rotation.y=Math.atan2(C.position.x-m.position.x,C.position.z-m.position.z)}
// ---- Trần các tầng 1-3: sương mù trắng đặc thành nhiều lớp sát trần + mây nhỏ lơ lửng bên dưới ----
const SKYFOG={
  layers:[[.05,.97],[.5,.9],[1.1,.78],[1.9,.64],[2.9,.5],[4.1,.34]],   // [cách trần (m), độ đặc 0..1]: lớp trên đặc, lớp dưới loãng dần
  layers2:[[.05,.98],[.4,.95],[.8,.9],[1.3,.84],[1.9,.76],[2.6,.67],[3.4,.57],[4.3,.47],[5.4,.36],[6.8,.24]],   // tầng 2 (núi cao ~21m, trần cách sàn 29.6m): nhiều lớp hơn, dày hơn để che hẳn trần
  f2K:.85,           // tầng 2: nhân độ đặc các lớp sương với số này (trước đây .3 nên lộ trần)
  tile:30,           // 1 ô họa tiết sương rộng bao nhiêu mét
  speed:.6,          // tốc độ trôi của các lớp (m/s; mỗi lớp nhân hệ số riêng, xen kẽ chiều)
  clouds:9,          // số mây nhỏ lơ lửng mỗi tầng
  cMin:1,cMax:2.2,   // cỡ mây nhỏ (m; đám mây rộng khoảng 4 lần số này)
  cLo:7.6,cHi:9.4,   // độ cao mây nhỏ so với sàn tầng (m): cao hơn khối chắn, thấp hơn lớp sương
  cDrift:.9,         // tốc độ trôi mây nhỏ (m/s)
  topK:.6            // tầng cao nhất (không có trần, thấy bầu trời): nhân độ đặc các lớp sương với số này (1 = đặc như tầng 1-3, nhỏ hơn = thấy trời rõ hơn)
};
let _fogTex=null;
// họa tiết sương: nhiễu fBm liền mạch (wrap), trắng, độ trong suốt loang lổ
function fogTexture(){
  if(_fogTex)return _fogTex;
  const N=256,c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d'),id=x.createImageData(N,N),d=id.data;
  let sd=11;const rnd=()=>(sd=(sd*1664525+1013904223)>>>0)/4294967296,ss=(a,b,v)=>{v=Math.min(1,Math.max(0,(v-a)/(b-a)));return v*v*(3-2*v)};
  const oc=[];for(let o=0;o<4;o++){const g=4<<o,lat=new Float32Array(g*g);for(let i=0;i<lat.length;i++)lat[i]=rnd();oc.push([g,lat])}
  const val=(g,L,u,v)=>{const X=u*g,Y=v*g,x0=Math.floor(X),y0=Math.floor(Y),fx=X-x0,fy=Y-y0,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),
    a=L[(y0%g)*g+x0%g],b=L[(y0%g)*g+(x0+1)%g],cc=L[((y0+1)%g)*g+x0%g],e=L[((y0+1)%g)*g+(x0+1)%g];return a+(b-a)*sx+(cc-a)*sy+(a-b-cc+e)*sx*sy};
  for(let y=0;y<N;y++)for(let xx=0;xx<N;xx++){
    let n=0,am=.5,tt=0;for(const [g,L] of oc){n+=am*val(g,L,xx/N,y/N);tt+=am;am*=.5}n/=tt;
    const o=(y*N+xx)*4;d[o]=236+19*n;d[o+1]=241+14*n;d[o+2]=250+5*n;d[o+3]=255*(.42+.58*ss(.28,.72,n));
  }
  x.putImageData(id,0,0);_fogTex=new THREE.CanvasTexture(c);_fogTex.wrapS=_fogTex.wrapT=THREE.RepeatWrapping;_fogTex.anisotropy=4;return _fogTex;
}
// mặt dưới tấm sàn (= trần tầng dưới) tô trắng để không lộ màu xám sau lớp sương (level.js gọi)
function ceilWhite(m){const cm=new THREE.MeshBasicMaterial({color:0xf2f6fc,fog:false});CEILMATS.push(cm);m.material[3]=cm}
// tô gradient vòm trời: chân trời H -> giữa Mi -> đỉnh To (mỗi màu [r,g,b] 0..255). daycycle.js gọi lại khi giờ trong ngày đổi.
function paintDome(gd,H,Mi,To){
  const gp=gd.attributes.position,col=new Float32Array(gp.count*3);let o=0;
  for(let i=0;i<gp.count;i++){
    const u=Math.pow(Math.max(0,gp.getY(i)/450),.55),A=u<.5?H:Mi,B=u<.5?Mi:To,k=u<.5?u*2:(u-.5)*2;
    for(let c=0;c<3;c++)col[o++]=(A[c]+(B[c]-A[c])*k)/255;
  }
  if(gd.attributes.color){gd.attributes.color.array.set(col);gd.attributes.color.needsUpdate=true}
  else gd.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
}
// ---- Vòm trời + mây ở tầng cao nhất, sương + mây nhỏ ở tầng 1-3 (dựng lười ở lần gọi đầu, khi NF/FH/AF đã có) ----
let _sk=null;
function buildSky(){
  const gd=new THREE.SphereGeometry(450,32,20);
  paintDome(gd,_hex(SKY.horizon),_hex(SKY.mid),_hex(SKY.top));
  const dome=new THREE.Mesh(gd,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false,depthWrite:false}));
  dome.renderOrder=-1;dome.frustumCulled=false;S.add(dome);
  const geos=CLOUD_SHAPES.map(sh=>cloudGeometry(sh,SKY.segTop[0],SKY.segTop[1])),geosF=CLOUD_SHAPES.map(sh=>cloudGeometry(sh,SKY.segFl[0],SKY.segFl[1])),
    mat=cloudMats(false),cl=new THREE.Group(),list=[],top=FY(NF);
  for(let i=0;i<SKY.clouds;i++){
    const m=cloudObj(geos[i%4],mat),s=SKY.sMin+Math.random()*(SKY.sMax-SKY.sMin),a=Math.random()*6.283,r=SKY.spread*Math.pow(Math.random(),.8);
    m.scale.set(s,s,s*CLOUD_FLAT);m.rotation.z=(Math.random()-.5)*.8;
    m.position.set(Math.cos(a)*r,top+SKY.hMin+Math.random()*(SKY.hMax-SKY.hMin),Math.sin(a)*r);
    m.userData.v=SKY.drift*(.5+Math.random());cl.add(m);list.push(m);
  }
  S.add(cl);
  // tầng 1..NF-1: mỗi tầng 1 nhóm (sương nhiều lớp + mây nhỏ), chỉ hiện khi người chơi đang ở tầng đó
  const FT=fogTexture(),cmat=cloudMats(true),fl=[];
  for(let f=0;f<NF;f++){
    const A=AF(f),yc=FY(f+1)-SLAB,sz=2*A+2,g=new THREE.Group(),lay=[],cs=[];
    (f===1?SKYFOG.layers2:SKYFOG.layers).forEach(([dy,op],i)=>{
      const t=FT.clone();t.needsUpdate=true;t.repeat.set(sz/SKYFOG.tile,sz/SKYFOG.tile);t.offset.set(Math.random(),Math.random());
      const m=new THREE.Mesh(new THREE.PlaneGeometry(sz,sz),new THREE.MeshBasicMaterial({map:t,transparent:true,opacity:f===NF-1?op*SKYFOG.topK:f===1?op*SKYFOG.f2K:op,depthWrite:false,side:THREE.DoubleSide,fog:false}));
      m.rotation.x=-Math.PI/2;m.position.y=yc-dy;m.renderOrder=1;m.frustumCulled=false;g.add(m);lay.push({t,m,k:(i%2?-1:1)*(.6+i*.25)});
    });
    for(let i=0;i<SKYFOG.clouds;i++){
      const m=cloudObj(geosF[i%4],cmat),s=SKYFOG.cMin+Math.random()*(SKYFOG.cMax-SKYFOG.cMin);
      m.scale.set(s,s,s*CLOUD_FLAT);m.rotation.z=(Math.random()-.5)*.8;
      m.position.set((Math.random()*2-1)*(A-5),FY(f)+SKYFOG.cLo+Math.random()*(SKYFOG.cHi-SKYFOG.cLo),(Math.random()*2-1)*(A-5));
      m.userData.v=SKYFOG.cDrift*(.5+Math.random());g.add(m);cs.push(m);
    }
    g.visible=false;S.add(g);fl.push({f,g,lay,cs,A});
  }
  return {dome,cl,list,fl};
}
// gọi mỗi khung (main.js, sau khi đặt camera)
function tickSky(dt){
  if(!_sk)_sk=buildSky();
  const up=P.y>FY(NF-1)-2,sk=up;_sk.dome.visible=_sk.cl.visible=sk;   // tầng 3 nay rộng bằng tầng 2 nên tầng 2 có trần kín: chỉ tầng cao nhất mới thấy trời
  if(S.fog&&!(window.Nature&&Nature.wading)&&!P.under){const wf=window.DayCycle&&DayCycle.worlds&&DayCycle.worlds[curFl],tn=wf?wf.fog[0]:(curFl===1?40:18),tf=wf?wf.fog[1]:(curFl===1?150:55),k=Math.min(1,dt*3);S.fog.near+=(tn-S.fog.near)*k;S.fog.far+=(tf-S.fog.far)*k}   // tầng 2: sương xa hơn để thấy núi
  if(sk){_sk.dome.position.copy(C.position);for(const c of _sk.list){c.position.x+=c.userData.v*dt;if(c.position.x>SKY.spread)c.position.x-=2*SKY.spread;_face(c)}}
  for(const q of _sk.fl){
    const on=curFl===q.f&&(!up||q.f===NF-1);   // tầng cao nhất luôn có sương (dù đang ở vùng thấy vòm trời)
    q.g.visible=on;if(!on)continue;
    for(const l of q.lay)l.t.offset.x+=SKYFOG.speed*l.k*dt/SKYFOG.tile;
    for(const c of q.cs){c.position.x+=c.userData.v*dt;if(c.position.x>q.A-3)c.position.x=-(q.A-3);_face(c)}
  }
  if(window.DayCycle)DayCycle.tick(dt);   // mặt trời / trăng / ánh sáng theo giờ thật (world/common/daycycle.js)
}