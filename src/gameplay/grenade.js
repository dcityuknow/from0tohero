// Lựu đạn: giữ - thả để ném, vật lý, nổ
const PIN_T=1;    // thời gian hoàn tất thao tác giật chốt (giữ chuột đủ lâu = chốt đã rút, chờ thả để ném)
const AUTO_K=1.5; // bấm nhanh (thả sớm): tự động chạy tiếp thao tác giật chốt với tốc độ này rồi ném luôn
function pick4(){if(!playing)return;if(gren<=0){showMsg(t('nogren'));return}pick('grenade')}
function startHold(){if(throwT>0||holding||autoP||gren<=0||gcd>0)return;holding=true;holdT=0;snd(240,.08,'sine',.03)}
function doThrow(p){wt=1;tpow=p;throwT=TH;thrown=false;snd(300,.1,'sine',.04)}
// Thả chuột: nếu đã giật chốt xong -> ném ngay (giữ lâu ném xa hơn). Nếu thả sớm (bấm nhanh) -> tự giật chốt nốt rồi ném.
function releaseG(){if(!holding)return;holding=false;if(!playing)return;
  if(holdT<PIN_T){autoP=true;return}
  doThrow(9+7*Math.min(1,(holdT-PIN_T)/.7))}
function tickThrow(dt){
  if(holding)holdT+=dt;
  if(autoP){holdT+=dt*AUTO_K;if(holdT>=PIN_T){autoP=false;holdT=PIN_T;doThrow(12)}}
  if(throwT<=0)return;throwT-=dt;if(!thrown&&throwT<=TH*.55){thrown=true;launchG()}if(throwT<=0){throwT=0;if(gren<=0&&cur==='grenade')pick(prevW)}}
// Câu thoại khi ném lựu đạn: hiện chữ trên màn hình + đọc thành tiếng (Web Speech API, giọng tiếng Anh)
const GREN_LINE='Optimum fire in the house';
function sayGren(){
  showMsg('🗣️ "'+GREN_LINE+'"');
  try{const ss=window.speechSynthesis;if(!ss)return;
    ss.cancel();   // ném liên tiếp thì không dồn hàng đợi
    const u=new SpeechSynthesisUtterance(GREN_LINE);u.lang='en-US';u.rate=1;u.pitch=.9;u.volume=1;ss.speak(u)}catch(e){}
}
function launchG(){
  gren--;gcd=.8;sayGren();
  const d=new THREE.Vector3();C.getWorldDirection(d);
  const m=grenadeModel();
  S.add(m);
  grenades.push({x:C.position.x+d.x*.5,y:C.position.y-.3+d.y*.5,z:C.position.z+d.z*.5,vx:d.x*tpow,vy:d.y*tpow+3,vz:d.z*tpow,r:.12,h:.24,ground:false,t:2,m});
  snd(200,.12,'sine');
}
const BLG=new THREE.SphereGeometry(1,10,8);   // dùng chung cho mọi vụ nổ
function explode(g){
  const c=new THREE.Vector3(g.x,g.y+.2,g.z),RAD=10;
  boom(c);quake(c);
  if(window.Nature&&Nature.explosionSplash)Nature.explosionSplash(g.x,g.y,g.z);   // nổ dưới nước: cột nước + bọt lớn
  for(const b of bots){
    if(b.hp<=0||!b.on||g.foe||b.ally)continue;
    const o=new THREE.Vector3(b.x,b.y+.9,b.z).sub(c),d=o.length();
    if(d<RAD){b.hp-=160*(1-d/RAD);blood(new THREE.Vector3(b.x,b.y+.9,b.z),new THREE.Vector3(0,1,0),o.clone().normalize(),8);if(b.hp<=0)killBot(b,o.normalize())}
  }
  const dp=Math.hypot(P.x-c.x,P.y+1-c.y,P.z-c.z);
  if(dp<RAD&&!dead&&!(g.foe&&peace))hurt(70*(1-dp/RAD));   // lựu đạn của bot không làm đau người chơi đang ở trong chòi
  const bl=new THREE.Mesh(BLG,new THREE.MeshBasicMaterial({color:0xffb040,transparent:true,opacity:.75}));
  bl.position.copy(c);S.add(bl);blasts.push({m:bl,t:.3,R:RAD});
  for(let i=0;i<72;i++){
    const sz=.08+Math.random()*.12;fxPools();   // effects.js: pool InstancedMesh
    fxS.add(c.x,c.y,c.z,(Math.random()-.5)*24,Math.random()*16,(Math.random()-.5)*24,.6+Math.random()*.6,true,undefined,sz,sz,sz,i%2?0xff9a3c:0xffe066,null);
  }
}
function tickG(dt){
  for(let i=grenades.length-1;i>=0;i--){
    const g=grenades[i];g.t-=dt;g.vy-=22*dt;
    const pv=g.vy,ex=g.x+g.vx*dt,ez=g.z+g.vz*dt;
    move(g,g.vx*dt,g.vy*dt,g.vz*dt);
    if(Math.abs(g.x-ex)>.001)g.vx*=-.4;
    if(Math.abs(g.z-ez)>.001)g.vz*=-.4;
    if(g.ground){g.vy=pv<-2?-pv*.4:0;const f=Math.pow(.1,dt);g.vx*=f;g.vz*=f}
    g.m.position.set(g.x,g.y+.12,g.z);g.m.rotation.x+=dt*6;g.m.rotation.z+=dt*4;
    if(g.t<=0){S.remove(g.m);grenades.splice(i,1);explode(g)}
  }
  for(let i=blasts.length-1;i>=0;i--){
    const b=blasts[i];b.t-=dt;const u=1-b.t/.3;
    if(b.t<=0){S.remove(b.m);b.m.material.dispose();blasts.splice(i,1);continue}
    b.m.scale.setScalar(.3+u*b.R*.8);b.m.material.opacity=.75*(1-u);
  }
}