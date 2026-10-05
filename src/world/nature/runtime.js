// ============================================================================
// nature/runtime.js - Thanh hơi thở, lớp màu nước + sương mù, vòng lặp mỗi khung, nạp / dỡ tầng, window.Nature.
// (Tách ra từ nature.js cũ. Chia sẻ với các file nature/ khác qua NK = window.NatureKit.)
// ============================================================================
(function(){
const NK=window.NatureKit=window.NatureKit||{};
const {CLK}=NK;   // từ nature/kit.js
const {clamp01,CFG,CELL,ck,SLT}=NK;   // từ nature/kit.js
const {waveLake,lakeH}=NK;   // từ nature/lake.js
const {FL,vis,act,lakeAt,isWater,wetAt}=NK;   // từ nature/state.js
const {RG,tickRipples,splash,ripple,bubble,rayWater,bulletSplash,explosionSplash}=NK;   // từ nature/fx.js
const {tickFish}=NK;   // từ nature/fish.js
const {swimUpdate}=NK;   // từ nature/swim.js
const {buildFloor}=NK;   // từ nature/build.js


// thanh hơi thở của người chơi (chỉ hiện khi đang bơi hoặc chưa hồi đủ hơi)
const bw=document.createElement('div');

bw.style.cssText='position:fixed;left:50%;top:calc(50% + 52px);transform:translateX(-50%);z-index:6;display:none;pointer-events:none;font:700 15px sans-serif;color:#fff;text-shadow:0 1px 3px #000;text-align:center';

bw.innerHTML='<div id="brT">\u{1F4A7}</div><div style="width:150px;height:10px;background:rgba(0,0,0,.55);border:2px solid #fff;border-radius:6px;overflow:hidden"><div id="brF" style="height:100%;width:100%;background:#7fe0ff"></div></div>';

(document.body||document.documentElement).appendChild(bw);

let brShown=false,brF=null,skT=0,wasUnder=false;

function breathUI(show){
  if(show!==brShown){bw.style.display=show?'block':'none';brShown=show;if(show&&!brF)brF=document.getElementById('brF')}
  if(!show)return;
  const u=clamp01(P.air/CFG.air);brF.style.width=(u*100)+'%';
  const low=P.air<3.5;brF.style.background=low?'#ff4d5e':'#7fe0ff';bw.style.opacity=low?(0.6+0.4*Math.abs(Math.sin(performance.now()/120))):1;
}

// ---- Chìm xuống nước: hạ camera + lớp màu nước + sương mù (không cần biết tên biến camera) ----
let sink=0;
RG.rotateX(-Math.PI/2);

if(THREE.WebGLRenderer&&!THREE.WebGLRenderer.prototype.__natureSink){
  const _r=THREE.WebGLRenderer.prototype.render;
  THREE.WebGLRenderer.prototype.render=function(sc,cam){
    if(sink>.002&&cam&&cam.position){cam.position.y-=sink;try{return _r.call(this,sc,cam)}finally{cam.position.y+=sink}}
    return _r.call(this,sc,cam);
  };
  THREE.WebGLRenderer.prototype.__natureSink=true;
}

const ov=document.createElement('div');

ov.style.cssText='position:fixed;left:0;top:0;right:0;bottom:0;pointer-events:none;z-index:5;opacity:0;transition:none';

(document.body||document.documentElement).appendChild(ov);

let ovT=null,uw=0,fog0=null,fogOn=false;

const _wc=new THREE.Color();

function tintOverlay(T){
  if(ovT===T)return;ovT=T;
  const c=new THREE.Color(T.water[2]).multiplyScalar(.75),r=Math.round(c.r*255),g=Math.round(c.g*255),b=Math.round(c.b*255);
  ov.style.background='linear-gradient(rgba('+r+','+g+','+b+',.55),rgba('+r+','+g+','+b+',.8))';
}

function fogApply(k,T){
  const F=S.fog;if(!F)return;
  if(!fog0)fog0={c:F.color.clone(),n:F.near,f:F.far,d:F.density};
  if(!fogOn&&window.DayCycle)fog0.c.copy(DayCycle.fog);   // màu sương gốc đổi theo giờ trong ngày (daycycle.js)
  if(k<.005){
    if(fogOn){F.color.copy(fog0.c);if(F.near!==undefined){F.near=fog0.n;F.far=fog0.f}else if(F.density!==undefined)F.density=fog0.d;fogOn=false}
    return;
  }
  fogOn=true;_wc.setHex(T.water[2]).multiplyScalar(.8);
  F.color.copy(fog0.c).lerp(_wc,k);
  if(F.near!==undefined){F.near=fog0.n+(.3-fog0.n)*k;F.far=fog0.f+(18-fog0.f)*k}
  else if(F.density!==undefined)F.density=fog0.d+(.11-fog0.d)*k;
}

let last=performance.now(),cl=0,wv=0,spl=0,inW=false,lx=0,lz=0,wasUW=false,bub=0,rip=0,gyHook=false;

function loop(now){
  requestAnimationFrame(loop);
  const dt=Math.min(.1,(now-last)/1000);last=now;CLK.tm+=dt;
  if(!gyHook&&typeof groundY==='function'){   // effects.js nạp sau nature.js nên móc vào lúc chạy: hạt (giọt nước, máu...) rơi xuống MẶT NƯỚC thay vì lơ lửng ở mặt sàn
    gyHook=true;const _g=groundY;
    groundY=function(x,y,z){const g=_g(x,y,z),ci=Math.floor(x/CELL),cj=Math.floor(z/CELL);
      for(const Fl of FL){const l=Fl.cells.size&&Fl.cells.get(ck(ci,cj));
        if(l&&g<=l.y+.001&&y<l.y+FHT[l.f]-SLT-.1&&y>l.y-l.dmax-1)return l.y-CFG.level-.02}
      for(const Fl of FL){if(!Fl.hg)continue;   // hạt (máu, bụi...) rơi xuống mặt đồi
        if(y>Fl.y-1.2&&y<Fl.y+FHT[Fl.f]-3){const h=Fl.y+Fl.hAt(x,z);if(h>g&&y>h-.3)return h;break}}
      return g};
  }
  tickRipples(dt);
  try{   // bơi / nín thở
    if(playing&&!dead){
      swimUpdate(P,true,dt,keys.ShiftLeft||keys.ShiftRight,keys.Space);
      if(wasUnder&&!P.under&&P.air<4.5)snd(520,.18,'triangle',.06);   // ngoi lên thở hắt
      wasUnder=!!P.under;
      breathUI(!!P.sw||P.air<CFG.air-.05);
    }else{if(dead){P.sw=0;P.under=false;P.air=CFG.air;P._mt=0}breathUI(false)}
    if(playing&&typeof bots!=='undefined')for(const b of bots){
      if(!b.on||b.hp<=0){if(b.sw){b.sw=0;b.dive=false;b._mt=0}b.air=CFG.air;continue}
      if(b.sw&&!b.boss){b.dvT=(b.dvT||0)-dt;   // bot thỉnh thoảng tự lặn
        if(b.dvT<=0){if(b.dive){b.dive=false;b.dvT=1.5+Math.random()*4}else if(Math.random()<.55){b.dive=true;b.dvT=3+Math.random()*12}else b.dvT=2+Math.random()*3}}
      swimUpdate(b,false,dt,b.dive,false);
    }
  }catch(err){}
  cl-=dt;if(cl<=0){cl=.2;vis()}
  wv-=dt;const doW=CFG.waves&&wv<=0;if(doW)wv=1/24;
  for(const Fl of FL){if(!act(Fl.f))continue;
    if(doW)for(const l of Fl.lakes)if(l.mesh&&!l.ice)waveLake(l,CLK.tm,P.x,P.z);
    for(const c of Fl.crit){const a=c.ph+CLK.tm*c.sp;
      c.g.position.set(c.cx+Math.cos(a)*c.rr,c.by+.6+Math.sin(CLK.tm*2+c.ph)*.25,c.cz+Math.sin(a*1.3)*c.rr*.8);
      c.g.rotation.y=Math.atan2(-Math.sin(a)*c.rr,Math.cos(a*1.3)*1.3*c.rr*.8);
      const w=Math.sin(CLK.tm*22+c.ph)*.9;c.wl.rotation.z=-w;c.wr.rotation.z=w}
    if(Fl.fish&&Fl.fish.length)tickFish(Fl,dt);
  }
  let l=null,under=false;
  if(playing){l=lakeAt(P.x,P.y,P.z);
    if(l){
      const mvg=Math.hypot(P.x-lx,P.z-lz)>dt*1.5;
      if(!inW){inW=true;if(CFG.splash)splash(P.x,P.z,l,14);ripple(P.x,P.z,l,2.8);splashSnd(true)}
      spl-=dt;if(CFG.splash&&spl<=0&&mvg){spl=.13;splash(P.x,P.z,l,4)}
      rip-=dt;if(rip<=0){rip=mvg?.24:1.1;ripple(P.x,P.z,l,mvg?1.6:1)}
      if(P.sw&&mvg){skT-=dt;if(skT<=0){skT=.7;wadeSnd()}}}
    else{if(inW)splashSnd(false);inW=false}}
  else inW=false;
  if(window.Nature)window.Nature.wading=!!l;
  // mắt có nằm dưới mặt nước không? (chỗ sâu giữa hồ thì chìm hẳn)
  if(l&&CFG.underwater){const ey=typeof eye==='number'?eye:CFG.eye;under=P.y+ey<l.y-CFG.level-.03}
  const T=l?l.T:ovT;
  uw+=((under?1:0)-uw)*Math.min(1,dt*10);
  if(T){tintOverlay(T);ov.style.opacity=uw<.01?0:uw.toFixed(2);fogApply(uw,T)}
  if(under){
    if(!wasUW)snd(150,.25,'sine',.05);
    bub-=dt;if(bub<=0){bub=.3+Math.random()*.3;bubble(P.x+(Math.random()-.5)*.6,P.y+CFG.eye-sink-.35,P.z+(Math.random()-.5)*.6)}
  }
  wasUW=under;
  lx=P.x;lz=P.z;
}

const timedBuild=f=>{const t0=performance.now(),r=buildFloor(f);console.log('[Block Arena] dựng tầng '+(f+1)+': '+Math.round(performance.now()-t0)+' ms');return r};
   // xem thời gian dựng từng tầng ở F12 > Console
// NẠP LƯỜI: chỉ dựng tầng được yêu cầu (floors.js quyết định). FM.cap ghi lại mọi mesh / va chạm do lần dựng này thêm vào để dỡ sạch được.
function loadFloor(f){
  if(FL.some(q=>q.f===f))return;
  const Fl=FM.cap('N'+f,()=>timedBuild(f));
  FL.push(Fl);vis();
}

function unloadFloor(f){
  const i=FL.findIndex(q=>q.f===f);if(i<0)return;
  FL.splice(i,1);FM.drop('N'+f);
  console.log('[Block Arena] dỡ tầng '+(f+1));
}

loadFloor(0);

requestAnimationFrame(loop);

window.Nature={cfg:CFG,floors:FL,load:loadFloor,unload:unloadFloor,has:f=>FL.some(q=>q.f===f),stones:f=>{const Fl=FL.find(q=>q.f===f);return Fl&&Fl.stones||[]},lakeH,rayWater,bulletSplash,explosionSplash,isWater,wetAt,bridges:f=>{const Fl=FL.find(q=>q.f===f);return Fl&&Fl.bridges||[]},heightAt:(f,x,z)=>{const Fl=FL.find(q=>q.f===f);return Fl&&Fl.hAt?Fl.hAt(x,z):0}};
})();
