// Hai TƯỢNG KHỔNG LỒ MỚI đặt ĐỐI DIỆN hai tượng cũ (statues.js) ở BÊN KIA SÔNG (phía -z), mặt quay về phía sông.
//  - Bên TRÁI: HIỆP SĨ chibi ("Hero"): mũ giáp có mào, áo choàng, tay trái cầm khiên khắc logo vô cực, tay phải giơ cao thanh kiếm.
//  - Bên PHẢI: PHI HÀNH GIA chibi ("to the moon"): mũ kính tròn khắc logo vô cực, ba lô oxy, tay phải giơ cao lá cờ vô cực, đứng trên mặt trăng đá.
//  Cùng bệ vuông 3x3m có logo vô cực 4 mặt, cùng bảng màu đá, cùng đèn pha tự bật ban đêm như 2 tượng cũ (dùng chung LAMP với statues.js).
// Vị trí: đối xứng gương với tượng cũ qua sông. Chỗ đó đã có 2 bộ bàn trà (teaset.js) nên file tự DÒ chỗ trống gần nhất
//  (né bàn trà, chòi, hồ tắm, rừng thang) rồi đặt tượng ở đó; kết quả in ở F12 > Console: "[statues2] ...". Muốn tự đặt: STB.auto=false và sửa STB.x / STB.z.
// Cần statues.js bản mới có xuất `kit` + `STA` (dòng cuối của statues.js).
// Nạp SAU statues.js, teaset.js, bath.js, stairgrove.js (cần các vùng cấm của chúng), TRƯỚC nature.js (xem loader.js).
// nature/placement.js đọc window.Statues2Keeps để cây / đá / sông / đầu cầu né ra.
(function(){
const SK=window.Statues;
if(!SK||!SK.kit||!SK.STA){console.warn('[statues2] thiếu window.Statues.kit / STA: hãy dùng statues.js bản mới (dòng cuối xuất kit + STA).');return}
const {ring,pedestal,ST,STD,GD,D,LT,MOSS,c,Y}=SK.kit;
const OLD=SK.STA;

const STB={
  x:OLD.x,             // |x| mong muốn (mặc định = tượng cũ, rồi tự dò chỗ trống gần đó)
  z:-OLD.z,            // z mong muốn: đối xứng gương tượng cũ qua sông (sông ở giữa, z ~ 0)
  auto:true,           // true = tự dò chỗ trống (né bàn trà / chòi / hồ tắm / rừng thang); false = đặt đúng STB.x / STB.z
  riverGap:4,          // tự dò: cho phép tiến gần sông hơn vị trí mong muốn tối đa bấy nhiêu mét (không cho lùi xa hơn quá STB.far)
  far:14,              // tự dò: tối đa lệch bao xa so với vị trí mong muốn (m)
  face:0,              // hướng mặt khi CHƯA biết sông (rad): 0 = quay về +z (sông nằm phía +z của 2 bệ)
  toRiver:true,        // true = khi sông dựng xong, tự xoay mặt tượng về phía điểm sông gần nhất
  faceOffset:0,        // lệch thêm sau khi quay về sông (rad)
  k:OLD.k||2,          // hệ số phóng to tượng (bệ giữ nguyên), mặc định bằng tượng cũ
  keep:3.8             // nửa cạnh vùng cấm quanh bệ cho cây / đá / sông / cầu (m)
};
const LAMP=Object.assign({},SK.LAMP);   // dùng chung thông số đèn pha với statues.js (sửa riêng ở đây nếu muốn)
const Q=.5;             // (độ mịn khối nằm trong c() của statues.js)

// ---------- TÌM CHỖ ĐẶT (đối xứng trái/phải) ----------
const R_BODY=3.6;       // bệ + tượng + lề an toàn
function keepsList(){
  const L=[];
  if(window.TeaKeeps)L.push(...window.TeaKeeps);
  if(window.PavilionKeep)L.push(window.PavilionKeep);
  if(window.BathKeeps)L.push(...window.BathKeeps);
  if(window.StairGroveKeep)L.push(window.StairGroveKeep);
  return L;
}
const hit=(x,z,L)=>L.some(q=>x>q.x0-R_BODY&&x<q.x1+R_BODY&&z>q.z0-R_BODY&&z<q.z1+R_BODY);
function findSpot(){
  const ix=STB.x,iz=STB.z;
  if(!STB.auto)return{x:ix,z:iz,moved:false};
  const L=keepsList(),lim=(typeof HALF0==='number'?HALF0:40)-6,zNear=iz+STB.riverGap;
  let best=null,bs=1e9;
  for(let dx=-STB.far;dx<=STB.far;dx+=.5)for(let dz=-STB.far;dz<=STB.far;dz+=.5){
    const x=ix+dx,z=iz+dz;
    if(x<5||x>lim||z>zNear||z<-lim)continue;
    if(hit(x,z,L)||hit(-x,z,L))continue;       // 2 tượng đối xứng nên kiểm tra cả hai bên
    const s=Math.hypot(dx,dz);if(s<bs){bs=s;best={x,z,moved:s>.01}}
  }
  return best||{x:ix,z:iz,moved:false,failed:true};
}
const POS=findSpot();
console.log('[statues2] đặt 2 tượng ở |x|='+POS.x.toFixed(1)+', z='+POS.z.toFixed(1)+(POS.failed?' (KHÔNG tìm được chỗ trống, đặt đúng vị trí mong muốn - hãy chỉnh STB.x/STB.z)':POS.moved?' (đã dịch khỏi vị trí mong muốn để né vật thể khác)':''));

// vùng cấm quanh 2 bệ (nature/placement.js đọc)
window.Statues2Keeps=[-1,1].map(sx=>({x0:sx*POS.x-STB.keep,x1:sx*POS.x+STB.keep,z0:POS.z-STB.keep,z1:POS.z+STB.keep}));

// ---------- TƯỢNG TRÁI: HIỆP SĨ chibi, khiên vô cực, kiếm giơ cao ----------
function statueC(){
  const v=new VB(),HY=Y+2.55;
  // --- chân + ủng ---
  for(const sx of[-1,1]){
    v.ell(sx*.3,Y+.1,.16,.28,.1,.4,STD,c(.06),true);            // ủng
    v.ell(sx*.3,Y+.55,0,.27,.5,.29,ST,c(.08),true);             // chân
    v.box(sx*.3,Y+.66,.14,.34,.12,.12,STD,c(.05),true);         // đệm gối
  }
  // --- thân giáp ---
  v.ell(0,Y+1.05,0,.62,.45,.44,ST,c(.08),true);                 // hông
  v.ell(0,Y+1.5,0,.66,.46,.46,ST,c(.08),true);                  // ngực giáp
  v.ell(0,Y+1.05,0,.68,.07,.48,D,c(.04),true);                  // thắt lưng
  v.box(0,Y+1.05,.47,.2,.16,.04,LT,.03);                        // khóa thắt lưng
  ring(v,0,Y+1.55,.47,.5,.02,.04,D);                            // logo vô cực khắc trên ngực
  v.box(0,Y+1.82,0,.34,.14,.3,STD,c(.05),true);                 // cổ
  for(const sx of[-1,1])v.ell(sx*.74,Y+1.85,0,.3,.22,.32,STD,c(.06),true);   // giáp vai
  // --- áo choàng sau lưng + hai ghim cổ ---
  v.box(0,Y+1.4,-.5,1.05,1.5,.12,STD,c(.06),true);
  v.ell(0,Y+.75,-.56,.62,.55,.22,STD,c(.06),true);
  for(const sx of[-1,1])v.ell(sx*.3,Y+1.84,.3,.1,.1,.1,LT,.04,true);
  // --- đầu tròn to + mũ giáp có mào ---
  v.ell(0,HY,0,.8,.8,.78,ST,c(.07),true);
  v.ell(0,HY+.2,-.02,.84,.68,.82,STD,c(.06),true);              // mũ giáp phủ nửa trên đầu
  v.box(0,HY+.02,.79,.74,.14,.05,D,.03);                        // khe nhìn
  v.box(0,HY-.42,.65,.16,.03,.04,D,.02);v.box(-.1,HY-.39,.64,.05,.03,.04,D,.02);v.box(.1,HY-.39,.64,.05,.03,.04,D,.02);   // miệng cười
  for(let n=0;n<=6;n++){const t=n/6;                            // mào mũ hất ra sau
    v.ell(0,HY+.78+.3*Math.sin(t*Math.PI),.35-t*1.05,.09,.18,.2,STD,c(.05),true)}
  // --- tay trái (trái người xem): cầm khiên khắc logo vô cực ---
  v.box(-.84,Y+1.5,.02,.26,.6,.3,ST,c(.06),true);               // bắp tay
  v.box(-.8,Y+1.18,.3,.26,.24,.5,ST,c(.06),true);               // cẳng tay đưa ra trước
  v.ell(-.95,Y+1.35,.64,.58,.76,.1,STD,c(.05),true);            // viền khiên
  v.ell(-.95,Y+1.35,.7,.5,.68,.1,ST,c(.05),true);               // mặt khiên
  ring(v,-.95,Y+1.35,.82,.68,.025,.04,D);                       // logo vô cực trên khiên
  // --- tay phải: giơ cao thanh kiếm ---
  v.box(.86,Y+1.95,.04,.26,.75,.3,ST,c(.06),true);              // bắp tay
  v.box(.9,Y+2.55,.12,.26,.62,.28,ST,c(.06),true);              // cẳng tay
  v.ell(.9,Y+2.95,.12,.2,.18,.2,ST,c(.05),true);                // nắm tay
  v.box(.9,Y+3.12,.12,.6,.09,.14,D,.03);                        // chắn kiếm
  v.box(.9,Y+3.85,.12,.16,1.35,.06,ST,c(.05),true);             // lưỡi kiếm
  v.box(.9,Y+4.57,.12,.1,.2,.05,ST,.03);                        // mũi kiếm
  v.box(.9,Y+3.9,.155,.04,1.1,.01,D,.01);                       // rãnh lưỡi
  return v;
}

// ---------- TƯỢNG PHẢI: PHI HÀNH GIA chibi, mũ kính tròn, cắm cờ vô cực ----------
function statueD(){
  const v=new VB(),HY=Y+2.6;
  // --- mặt trăng đá dưới chân ---
  v.ell(.9,Y+.06,.9,.35,.12,.3,ST,c(.06),true);v.ell(-.8,Y+.05,.7,.25,.09,.25,ST,c(.06),true);v.ell(-.4,Y+.04,-.9,.3,.1,.28,ST,c(.06),true);
  // --- chân + ủng ---
  for(const sx of[-1,1]){
    v.ell(sx*.3,Y+.1,.14,.3,.11,.42,STD,c(.06),true);           // ủng
    v.ell(sx*.3,Y+.55,0,.28,.5,.3,ST,c(.08),true);              // chân
  }
  // --- bộ đồ du hành ---
  v.ell(0,Y+1.05,0,.66,.5,.46,ST,c(.08),true);
  v.ell(0,Y+1.55,0,.66,.46,.46,ST,c(.08),true);
  v.box(0,Y+1.5,.46,.5,.3,.04,STD,c(.04),true);                 // bảng điều khiển trước ngực
  ring(v,0,Y+1.5,.5,.4,.02,.03,null);                           // logo vô cực trên bảng
  for(const dx of[-.16,0,.16])v.box(dx,Y+1.2,.47,.07,.07,.03,D,.02);   // nút bấm
  v.cyl(0,Y+1.9,0,.5,.22,STD,c(.06),'y');                       // vòng cổ nối mũ
  // --- ba lô oxy ---
  v.box(0,Y+1.5,-.62,.86,1.0,.42,STD,c(.06),true);
  for(const sx of[-1,1])v.cyl(sx*.22,Y+1.5,-.92,.16,.8,ST,c(.05),'y');
  // --- mũ kính tròn: kính tối khắc logo vô cực ---
  v.ell(0,HY,0,.86,.86,.84,ST,c(.07),true);
  v.ell(0,HY+.04,.46,.7,.56,.4,STD,c(.05),true);                // viền kính
  v.ell(0,HY+.04,.5,.64,.5,.4,D,c(.05),true);                   // mặt kính tối
  ring(v,0,HY+.04,.93,.56,.022,.04,null);                       // logo vô cực phản chiếu trên kính
  for(const sx of[-1,1])v.box(sx*.86,HY,0,.12,.3,.3,STD,.05,true);   // tai nghe hai bên
  v.box(.6,HY+.9,-.1,.05,.45,.05,D,.03);v.ell(.6,HY+1.17,-.1,.09,.09,.09,LT,.04,true);   // ăng-ten
  // --- tay trái (trái người xem): chống hông ---
  v.ell(-.78,Y+1.85,0,.26,.24,.28,STD,c(.06),true);
  v.box(-.82,Y+1.5,0,.28,.7,.32,ST,c(.06),true);
  v.box(-.6,Y+1.15,.22,.3,.26,.5,ST,c(.06),true);
  v.ell(-.36,Y+1.1,.42,.17,.15,.17,STD,c(.05),true);
  // --- tay phải: giơ cao cột cờ + lá cờ vô cực ---
  v.ell(.78,Y+1.85,0,.26,.24,.28,STD,c(.06),true);              // vai
  v.box(.9,Y+1.95,.05,.28,.72,.32,ST,c(.06),true);              // bắp tay
  v.box(.95,Y+2.58,.12,.26,.6,.3,ST,c(.06),true);               // cẳng tay
  v.ell(.95,Y+2.95,.12,.2,.18,.2,STD,c(.05),true);              // nắm tay
  v.box(.95,Y+3.55,.12,.07,2.4,.07,D,.04);                      // cột cờ
  v.ell(.95,Y+4.8,.12,.1,.1,.1,LT,.04,true);                    // đầu cột
  v.box(1.65,Y+4.25,.12,1.3,.8,.05,ST,c(.05),true);             // lá cờ
  ring(v,1.65,Y+4.25,.16,.95,.03,.03,D,'z+');                   // logo mặt trước
  ring(v,1.65,Y+4.25,.08,.95,.03,.03,D,'z-');                   // logo mặt sau
  return v;
}

// ---------- ĐÈN PHA (cùng kiểu statues.js, tick riêng) ----------
const FX={beams:[],glows:[],lights:[],lens:[],run:false,tex:null};
const LENS_ON=new THREE.Color(0xfff2cc),LENS_OFF=new THREE.Color(0x3a3a42);
const ssm=(a,b,x)=>{x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x)};
function nightF(){
  const DC=window.DayCycle;
  if(!LAMP.auto||!DC||!DC.cur)return{k:1,f:1};
  return{k:DC.cur.lamp,f:ssm(LAMP.onAt,LAMP.fullAt,DC.cur.lamp)};
}
function fxTick(t){
  if(!FACED&&ST_LIST.length)FACED=faceRiver();
  const s=t*.001,n=nightF(),f=n.f,P=LAMP.pulse;
  for(const b of FX.beams){b.m.opacity=b.base*f*(P?.93+.07*Math.sin(s*1.6+.7):1);b.m.visible=f>.01}
  for(const g of FX.glows){const q=P?1+.06*Math.sin(s*2.1+g.ph):1;g.sp.scale.set(g.base*q,g.base*q,1);g.sp.material.opacity=f;g.sp.visible=f>.01}
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
function beamGeo(len,r0,r1){
  const g=new THREE.CylinderGeometry(r1,r0,len,28,8,true);
  g.translate(0,len/2,0);
  const p=g.attributes.position,col=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){const f=Math.pow(1-p.getY(i)/len,1.5);col[i*3]=f;col[i*3+1]=.8*f;col[i*3+2]=.45*f}
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  g.rotateX(Math.PI/2);
  return g;
}
const addMat=extra=>new THREE.MeshBasicMaterial(Object.assign({transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false},extra));

// ---------- QUAY TƯỢNG VỀ PHÍA SÔNG ----------
const ST_LIST=[];let FACED=false;
function riverOf(){
  const N=window.Nature;if(!N||!N.has||!N.has(0)||!N.floors)return null;
  const Fl=N.floors.find(q=>q.f===0);
  return Fl&&Fl.lakes?(Fl.lakes.find(l=>!l.pool&&!l.ice&&l.rho)||null):null;
}
function faceRiver(){
  if(!STB.toRiver)return true;
  const lk=riverOf();if(!lk)return false;
  const e=.5;
  for(const st of ST_LIST){
    const gx=lk.rho(st.x+e,st.z)-lk.rho(st.x-e,st.z),gz=lk.rho(st.x,st.z+e)-lk.rho(st.x,st.z-e);
    if(Math.hypot(gx,gz)<1e-6)continue;
    st.psi=Math.atan2(-gx,-gz)+STB.faceOffset;
    for(const m of st.meshes)m.rotation.y=st.psi;
    placeLamps(st);
  }
  if(window.BXG&&BXG.dirty)BXG.dirty();
  return true;
}
const wetAt=(x,z)=>{const N=window.Nature;return !!(N&&N.wetAt&&N.has&&N.has(0)&&N.wetAt(0,x,z,LAMP.shore))};

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
    const len=d+1.5,th=Math.max(LAMP.spread*Math.PI/180,Math.atan(4.8/d)*.8);
    const kz=len/lp.len0,kxy=len*Math.tan(th)/(lp.len0*Math.tan(LAMP.spread*Math.PI/180));
    for(const b of lp.beams){b.scale.set(kxy,kxy,kz);b.position.z=.3*kz}
    if(lp.L){
      lp.L.position.copy(lp.gp.position).addScaledVector(dir,.4);
      lp.L.angle=Math.min(1.25,Math.atan(5.2/d)+.12);
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
    const bv=new VB();
    bv.box(0,.2,0,.9,.4,.9,ST,c(.1),true);          // bệ đá nhỏ
    bv.box(0,.62,0,.16,.45,.16,D,.03);              // trụ
    for(const m of bv.meshLOD()){add(m);lp.base.push(m)}
    boxes.push(lp.box);
    const gp=lp.gp=new THREE.Group();S.add(gp);
    const hv=new VB();
    hv.box(0,0,0,.7,.45,.5,GD[2],.03);
    hv.box(0,0,.26,.7,.45,.04,D,.03);
    hv.box(0,.27,-.02,.74,.05,.56,D,.03);
    for(const m of hv.meshLOD())gp.add(m);
    const lens=noRay(new THREE.Mesh(lensGeo,lensMat));lens.position.z=.285;gp.add(lens);
    for(const [g,mat] of[[gOut,mOut],[gIn,mIn]]){const b=noRay(new THREE.Mesh(g,mat));b.renderOrder=2;gp.add(b);lp.beams.push(b)}
    const sp=lp.sp=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex(),blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,fog:false}));
    sp.scale.set(LAMP.glow,LAMP.glow,1);noRay(sp);S.add(sp);
    FX.glows.push({sp,base:LAMP.glow,ph:i*1.9+1});
    if(useLights){
      const L=lp.L=new THREE.SpotLight(LAMP.color,LAMP.lightPower,LAMP.lightRange,.62,.55,1);
      L.target.position.copy(aim);S.add(L);S.add(L.target);
      FX.lights.push({L,base:LAMP.lightPower,ph:i*1.3+.5});
    }
    st.lamps.push(lp);
  }
  placeLamps(st);
}

const add=m=>{S.add(m);meshes.push(m)};   // meshes: để đạn để lại vết trên đá

function build(){
  FX.beams.length=FX.glows.length=FX.lights.length=FX.lens.length=0;ST_LIST.length=0;FACED=false;
  for(const [sx,mk,bw] of[[-1,statueC,1.2],[1,statueD,1.1]]){
    const x=sx*POS.x,z=POS.z,k=STB.k,st={sx,x,z,psi:STB.face,meshes:[],lamps:[]};
    for(const pm of pedestal().meshLOD()){pm.position.set(x,0,z);add(pm)}
    for(const sm of mk().meshLOD()){
      sm.scale.set(k,k,k);
      sm.position.set(x,Y*(1-k),z);          // phóng to quanh mặt bệ: chân tượng vẫn đứng đúng trên bệ
      sm.rotation.y=st.psi;add(sm);st.meshes.push(sm);
    }
    ST_LIST.push(st);
    lampFX(st);
    // va chạm: bệ 3x3 + thân tượng (đã nhân hệ số k)
    boxes.push({x0:x-1.5,x1:x+1.5,y0:0,y1:Y,z0:z-1.5,z1:z+1.5});
    boxes.push({x0:x-bw*k,x1:x+bw*k,y0:Y,y1:Y+3.6*k,z0:z-.8*k,z1:z+.95*k});
  }
  fxTick(performance.now());
  fxStart();
}
build();
window.Statues2={build,STB,LAMP,pos:POS};
})();
