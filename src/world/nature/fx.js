// ============================================================================
// nature/fx.js - Hiệu ứng nước: tóe nước, bong bóng, gợn sóng, đạn / lựu đạn rơi xuống nước.
// (Tách ra từ nature.js cũ. Chia sẻ với các file nature/ khác qua NK = window.NatureKit.)
// ============================================================================
(function(){
const NK=window.NatureKit=window.NatureKit||{};
const {CFG,ck,CELL}=NK;   // từ nature/kit.js
const {FL,act}=NK;   // từ nature/state.js


function splash(x,z,l,n){
  for(let i=0;i<n;i++){const m=new THREE.Mesh(UG,M(i&1?0x9fd8ff:0xffffff)),s=.04+Math.random()*.05;
    m.scale.set(s,s,s);m.position.set(x+(Math.random()-.5)*.5,l.y-CFG.level+.05,z+(Math.random()-.5)*.5);
    spawnPart(m,(Math.random()-.5)*2.5,1.5+Math.random()*2,(Math.random()-.5)*2.5,.5+Math.random()*.3,false,.02)}
}

function bubble(x,y,z){
  const m=new THREE.Mesh(UG,M(0xeafcff)),s=.02+Math.random()*.03;
  m.scale.set(s,s,s);m.position.set(x,y,z);
  spawnPart(m,(Math.random()-.5)*.3,.9+Math.random()*.6,(Math.random()-.5)*.3,.8+Math.random()*.4,false,.02);
}

// ---- Đạn bắn xuống nước: nước tóe lên + gợn sóng + tiếng tõm ----
function rayWater(ray,maxD){   // tia bắn cắt mặt nước ở đâu (chỉ tính khi bắn từ phía trên xuống)
  const dy=ray.direction.y,o=ray.origin;if(dy>=-1e-5)return null;let best=null;
  for(const Fl of FL){if(!Fl.cells.size||!act(Fl.f))continue;
    const sy=Fl.y-CFG.level;if(o.y<=sy)continue;
    const t=(sy-o.y)/dy;if(t<=0||t>=maxD||(best&&t>=best.dist))continue;
    const x=o.x+ray.direction.x*t,z=o.z+ray.direction.z*t,l=Fl.cells.get(ck(Math.floor(x/CELL),Math.floor(z/CELL)));
    if(l)best={dist:t,point:new THREE.Vector3(x,sy,z),lake:l};
  }
  return best;
}

function shotSplash(x,z,l){
  const sy=l.y-CFG.level,pos={x,y:sy,z};
  for(let i=0;i<18;i++){const m=new THREE.Mesh(UG,M(i%3?0x9fd8ff:0xffffff)),sz=.05+Math.random()*.07;
    m.scale.set(sz,sz,sz);m.position.set(x+(Math.random()-.5)*.25,sy+.05,z+(Math.random()-.5)*.25);
    spawnPart(m,(Math.random()-.5)*2.2,4+Math.random()*4.5,(Math.random()-.5)*2.2,.6+Math.random()*.4,false,.02)}
  ripple(x,z,l,1.6);
  snd(650,.08,'sine',.12,pos);snd(260,.16,'triangle',.1,pos);
}

function bulletSplash(x,y,z){   // đạn (của mình hoặc của boss) chạm mặt nước tại (x,y,z)
  const ci=Math.floor(x/CELL),cj=Math.floor(z/CELL);
  for(const Fl of FL){const l=Fl.cells.size&&Fl.cells.get(ck(ci,cj));
    if(l&&y<l.y+1&&y>l.y-l.dmax-1){shotSplash(x,z,l);return true}}
  return false;
}

// ---- Lựu đạn nổ dưới nước: cột nước phun lên + vòng bọt bắn ra + nhiều lớp sóng + tiếng tõm lớn (to và nhiều hơn bọt đạn nhiều lần) ----
function explosionSplash(x,y,z){
  const ci=Math.floor(x/CELL),cj=Math.floor(z/CELL);
  for(const Fl of FL){const l=Fl.cells.size&&Fl.cells.get(ck(ci,cj));
    if(!(l&&y<l.y+1&&y>l.y-l.dmax-1))continue;
    const sy=l.y-CFG.level,pos={x,y:sy,z},col=i=>M(i%3?0x9fd8ff:0xffffff);
    const add=(n,size,jit,vh,vy0,vy1,life)=>{for(let i=0;i<n;i++){
      const a=Math.random()*6.283,r=Math.random()*jit,sz=size[0]+Math.random()*(size[1]-size[0]),m=new THREE.Mesh(UG,col(i)),v=vh[0]+Math.random()*(vh[1]-vh[0]);
      m.scale.set(sz,sz,sz);m.position.set(x+Math.cos(a)*r,sy+.05,z+Math.sin(a)*r);
      spawnPart(m,Math.cos(a)*v,vy0+Math.random()*(vy1-vy0),Math.sin(a)*v,life[0]+Math.random()*(life[1]-life[0]),false,.02)}};
    add(45,[.12,.28],.5,[0,1.2],9,16,[1.1,1.6]);       // cột nước phun cao ở giữa
    add(70,[.08,.2],.8,[3,8],4,9,[.9,1.4]);            // vòng bọt lớn tóe ra xung quanh
    add(80,[.04,.1],1.6,[1,10],2,7,[.6,1.1]);          // bụi nước mịn bay tứ tung
    ripple(x,z,l,3.5);ripple(x,z,l,5.5);ripple(x,z,l,8);
    setTimeout(()=>{ripple(x,z,l,10);add(25,[.08,.18],1.2,[1,6],3,7,[.7,1.1])},220);   // đợt bọt thứ hai khi cột nước đổ xuống
    setTimeout(()=>{ripple(x,z,l,12)},450);
    splashSnd(true);snd(220,.3,'sine',.14,pos);snd(120,.5,'triangle',.12,pos);
    return true;
  }
  return false;
}
   // (camera không cần hạ nữa: người chơi thật sự lún xuống đáy hồ)
// ---- Gợn sóng lan trên mặt nước ----
const RG=new THREE.RingGeometry(.84,1,28);

const ripples=[];

function ripple(x,z,l,sz){
  if(ripples.length>=24){const o=ripples.shift();S.remove(o.m);o.m.material.dispose()}
  const m=new THREE.Mesh(RG,new THREE.MeshBasicMaterial({color:l.T.water[3],transparent:true,opacity:.6,depthWrite:false,side:THREE.DoubleSide}));
  m.position.set(x,l.y-CFG.level+.02,z);m.scale.setScalar(.15);S.add(m);ripples.push({m,t:0,sz});
}

function tickRipples(dt){
  for(let i=ripples.length-1;i>=0;i--){const r=ripples[i];r.t+=dt;const u=r.t/1.1;
    if(u>=1){S.remove(r.m);r.m.material.dispose();ripples.splice(i,1);continue}
    r.m.scale.setScalar(.15+u*r.sz);r.m.material.opacity=.6*(1-u)}
}

Object.assign(NK,{splash,ripple,bubble,RG,tickRipples,rayWater,bulletSplash,explosionSplash});
})();
