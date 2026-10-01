// Âm thanh (có âm thanh 3D theo vị trí: truyền pos {x,y,z} làm tham số thứ 5)
const GV=3;   // hệ số âm lượng tiếng súng / đạn / nổ
let AC;
function snd(f,d,t='square',v=.05,pos){try{AC=AC||new AudioContext();if(AC.state==='suspended')AC.resume();
  const o=AC.createOscillator(),g=AC.createGain(),n=AC.currentTime;
  o.type=t;o.frequency.setValueAtTime(f,n);o.frequency.exponentialRampToValueAtTime(40,n+d);
  g.gain.setValueAtTime(pos?v*2.5:v,n);g.gain.exponentialRampToValueAtTime(.001,n+d);o.connect(g);
  if(pos){const p=AC.createPanner();p.panningModel='HRTF';p.distanceModel='inverse';p.refDistance=2;p.rolloffFactor=1.2;p.maxDistance=60;
    if(p.positionX){p.positionX.value=pos.x;p.positionY.value=pos.y;p.positionZ.value=pos.z}else p.setPosition(pos.x,pos.y,pos.z);
    g.connect(p);p.connect(AC.destination)}else g.connect(AC.destination);
  o.start();o.stop(n+d)}catch(e){}}
const _lf=new THREE.Vector3();
function listen(){if(!AC)return;const L=AC.listener;C.getWorldDirection(_lf);
  if(L.positionX){L.positionX.value=C.position.x;L.positionY.value=C.position.y;L.positionZ.value=C.position.z;
    L.forwardX.value=_lf.x;L.forwardY.value=_lf.y;L.forwardZ.value=_lf.z;L.upX.value=0;L.upY.value=1;L.upZ.value=0}
  else{L.setPosition(C.position.x,C.position.y,C.position.z);L.setOrientation(_lf.x,_lf.y,_lf.z,0,1,0)}}
// ---- Tiếng nổ: nhiều lớp (nổ, trầm, nứt) + vang vọng (reverb 3s) + dội lặp, có định hướng 3D ----
let _bm=null,_nb=null;
function boomBus(){
  if(_bm)return _bm;
  const comp=AC.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=8;comp.connect(AC.destination);
  const n=(AC.sampleRate*3)|0,ir=AC.createBuffer(2,n,AC.sampleRate);
  for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,3)}
  const cvl=AC.createConvolver();cvl.buffer=ir;const rg=AC.createGain();rg.gain.value=1.1;cvl.connect(rg);rg.connect(comp);
  const dl=AC.createDelay(1),fb=AC.createGain(),lp=AC.createBiquadFilter();dl.delayTime.value=.23;fb.gain.value=.5;lp.type='lowpass';lp.frequency.value=700;
  dl.connect(lp);lp.connect(fb);fb.connect(dl);lp.connect(comp);
  const send=AC.createGain();send.connect(cvl);send.connect(dl);
  return _bm={comp,send};
}
function boom(pos){try{
  AC=AC||new AudioContext();if(AC.state==='suspended')AC.resume();
  const B=boomBus(),n=AC.currentTime;
  const d=pos?Math.hypot(pos.x-C.position.x,pos.y-C.position.y,pos.z-C.position.z):0;
  const bus=AC.createGain();bus.gain.value=.3+2.2/(1+d/8);      // xa vẫn nghe thấy tiếng ầm, gần thì cực lớn
  let head=bus;
  if(pos){const p=AC.createPanner();p.panningModel='HRTF';p.rolloffFactor=0;
    if(p.positionX){p.positionX.value=pos.x;p.positionY.value=pos.y;p.positionZ.value=pos.z}else p.setPosition(pos.x,pos.y,pos.z);bus.connect(p);head=p}
  head.connect(B.comp);head.connect(B.send);
  if(!_nb){_nb=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);const a=_nb.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1}
  const ns=AC.createBufferSource(),lp=AC.createBiquadFilter(),ng=AC.createGain();ns.buffer=_nb;lp.type='lowpass';
  lp.frequency.setValueAtTime(4000,n);lp.frequency.exponentialRampToValueAtTime(90,n+1.6);
  ng.gain.setValueAtTime(1.3,n);ng.gain.exponentialRampToValueAtTime(.001,n+1.8);ns.connect(lp);lp.connect(ng);ng.connect(bus);ns.start(n);ns.stop(n+1.8);
  const tone=(type,f0,f1,dur,v)=>{const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f0,n);o.frequency.exponentialRampToValueAtTime(f1,n+dur*.85);
    g.gain.setValueAtTime(v,n);g.gain.exponentialRampToValueAtTime(.001,n+dur);o.connect(g);g.connect(bus);o.start(n);o.stop(n+dur)};
  tone('sine',120,26,1.4,1.6);        // tiếng ục trầm
  tone('sawtooth',260,35,.5,.6);      // tiếng nứt
}catch(e){}}

// ---- Tiếng súng ngắm: nổ giòn + ục trầm + vang vọng (dùng chung reverb/dội của tiếng bom), có định hướng 3D nếu truyền pos ----
const SNIPER_VOL=.85;   // âm lượng tiếng súng ngắm (1 = như cũ, nhỏ hơn = êm hơn)
function sniperShot(pos){try{
  AC=AC||new AudioContext();if(AC.state==='suspended')AC.resume();
  const B=boomBus(),n=AC.currentTime;
  const d=pos?Math.hypot(pos.x-C.position.x,pos.y-C.position.y,pos.z-C.position.z):0;
  const bus=AC.createGain();bus.gain.value=(.3+1.7/(1+d/10))*SNIPER_VOL;
  let head=bus;
  if(pos){const p=AC.createPanner();p.panningModel='HRTF';p.rolloffFactor=0;
    if(p.positionX){p.positionX.value=pos.x;p.positionY.value=pos.y;p.positionZ.value=pos.z}else p.setPosition(pos.x,pos.y,pos.z);bus.connect(p);head=p}
  const sg=AC.createGain();sg.gain.value=.8;      // lượng vang/dội
  head.connect(B.comp);head.connect(sg);sg.connect(B.send);
  if(!_nb){_nb=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);const a=_nb.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1}
  const ns=AC.createBufferSource(),hp=AC.createBiquadFilter(),lp=AC.createBiquadFilter(),ng=AC.createGain();
  ns.buffer=_nb;hp.type='highpass';hp.frequency.value=500;lp.type='lowpass';
  lp.frequency.setValueAtTime(7000,n);lp.frequency.exponentialRampToValueAtTime(250,n+.7);
  ng.gain.setValueAtTime(1.4,n);ng.gain.exponentialRampToValueAtTime(.001,n+.8);
  ns.connect(hp);hp.connect(lp);lp.connect(ng);ng.connect(bus);ns.start(n);ns.stop(n+.8);
  const tone=(type,f0,f1,dur,v)=>{const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f0,n);o.frequency.exponentialRampToValueAtTime(f1,n+dur*.85);
    g.gain.setValueAtTime(v,n);g.gain.exponentialRampToValueAtTime(.001,n+dur);o.connect(g);g.connect(bus);o.start(n);o.stop(n+dur)};
  tone('sine',150,30,.9,1.5);         // cú giật trầm
  tone('sawtooth',900,70,.14,.7);     // tiếng nứt đầu nòng
  tone('square',320,50,.35,.3);
}catch(e){}}

// ---- Bước chân / bì bõm / ngã xuống (tiếng to, rõ; dùng noise + tiếng ục trầm) ----
let _sn=null;
function noiseSrc(){AC=AC||new AudioContext();if(AC.state==='suspended')AC.resume();
  if(!_sn){_sn=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);const a=_sn.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1}
  const s=AC.createBufferSource();s.buffer=_sn;return s}
function tone2(type,f0,f1,dur,v,t0){const n=AC.currentTime+(t0||0),o=AC.createOscillator(),g=AC.createGain();
  o.type=type;o.frequency.setValueAtTime(f0,n);o.frequency.exponentialRampToValueAtTime(f1,n+dur);
  g.gain.setValueAtTime(v,n);g.gain.exponentialRampToValueAtTime(.001,n+dur);o.connect(g);g.connect(AC.destination);o.start(n);o.stop(n+dur+.02)}
function noiseBurst(kind,f0,f1,dur,v,q,t0){const n=AC.currentTime+(t0||0),s=noiseSrc(),fl=AC.createBiquadFilter(),g=AC.createGain();
  fl.type=kind;fl.Q.value=q||1;fl.frequency.setValueAtTime(f0,n);fl.frequency.exponentialRampToValueAtTime(f1,n+dur);
  g.gain.setValueAtTime(v,n);g.gain.exponentialRampToValueAtTime(.001,n+dur);s.connect(fl);fl.connect(g);g.connect(AC.destination);s.start(n,Math.random()*1.5);s.stop(n+dur+.02)}
let _stepAlt=0;
function stepSnd(){try{AC=AC||new AudioContext();_stepAlt^=1;const r=.85+Math.random()*.3;
  noiseBurst('lowpass',(1300+_stepAlt*300)*r,140,.13,1.7/6);     // tiếng "cộp" của gót giày
  tone2('sine',(_stepAlt?120:100)*r,42,.11,1.3/6);               // tiếng ục trầm của bước chân
}catch(e){}}
function wadeSnd(){try{AC=AC||new AudioContext();const r=.88+Math.random()*.24;   // một bước lội nước: "bì - bõm" (bọt nhỏ rồi bọt lớn trầm, âm đi lên như bong bóng nước)
  tone2('sine',210*r,480*r,.07,.3,0);                       // "bì": bọt nhỏ
  tone2('sine',110*r,280*r,.17,.7,.09);                     // "bõm": bọt lớn, trầm
  tone2('sine',330*r,720*r,.06,.12,.21);                    // giọt nước li ti rơi lại
  noiseBurst('lowpass',800,160,.24,.3,.5,.02);              // nước xào xạc, mềm, không chói
}catch(e){}}
function splashSnd(big){try{AC=AC||new AudioContext();if(AC.state==='suspended')AC.resume();   // chạm nước: "tũm" trầm, mềm (không còn tiếng rít chói)
  const r=.94+Math.random()*.12,k=big?1:.55;
  tone2('sine',300*r,85*r,.2,.5*k,0);                        // "tũm": âm trầm rơi nhanh
  tone2('sine',170*r,380*r,.13,.2*k,.05);                    // bọt khí nhỏ nổi lên "bủm"
  noiseBurst('lowpass',650,140,big?.28:.18,.3*k,.4,0);       // nước xao nhẹ, đã lọc mềm
  if(big)tone2('sine',240*r,520*r,.09,.09,.16);              // giọt nước rơi lại rất khẽ
}catch(e){}}
function thudSnd(){try{AC=AC||new AudioContext();   // ngã xuống đất
  noiseBurst('lowpass',900,60,.35,2.2);
  tone2('sine',95,28,.6,2);
}catch(e){}}

// Bước chân của quái: to bằng 1/2 bước chân người chơi, âm sắc khác (tiếng "tạch" khô, cao hơn; boss thì nặng, trầm), có định hướng 3D
function botStepSnd(pos,boss){try{AC=AC||new AudioContext();if(AC.state==='suspended')AC.resume();
  const n=AC.currentTime,r=.9+Math.random()*.2,out=AC.createGain();out.gain.value=1;
  if(pos){const p=AC.createPanner();p.panningModel='HRTF';p.distanceModel='inverse';p.refDistance=2;p.rolloffFactor=1.2;p.maxDistance=60;
    if(p.positionX){p.positionX.value=pos.x;p.positionY.value=pos.y;p.positionZ.value=pos.z}else p.setPosition(pos.x,pos.y,pos.z);
    out.connect(p);p.connect(AC.destination)}else out.connect(AC.destination);
  const s=noiseSrc(),fl=AC.createBiquadFilter(),g=AC.createGain(),vn=1.7/12,vt=1.3/12;
  if(boss){fl.type='lowpass';fl.frequency.setValueAtTime(600*r,n);fl.frequency.exponentialRampToValueAtTime(90,n+.16)}
  else{fl.type='bandpass';fl.Q.value=1.4;fl.frequency.setValueAtTime(2600*r,n);fl.frequency.exponentialRampToValueAtTime(1000,n+.07)}
  const dn=boss?.16:.07;g.gain.setValueAtTime(vn,n);g.gain.exponentialRampToValueAtTime(.001,n+dn);
  s.connect(fl);fl.connect(g);g.connect(out);s.start(n,Math.random()*1.5);s.stop(n+dn+.02);
  const o=AC.createOscillator(),og=AC.createGain(),dt=boss?.18:.08;
  o.type=boss?'sine':'triangle';o.frequency.setValueAtTime((boss?75:260)*r,n);o.frequency.exponentialRampToValueAtTime(boss?32:130,n+dt);
  og.gain.setValueAtTime(vt,n);og.gain.exponentialRampToValueAtTime(.001,n+dt);o.connect(og);og.connect(out);o.start(n);o.stop(n+dt+.02);
}catch(e){}}

// ---- Tiếng súng ngắn / súng dài (AK) của người chơi: to, dày (tiếng nổ + cú giật trầm), qua bộ nén để không vỡ tiếng ----
// Chỉnh to/nhỏ: GUN_VOL (1 = mặc định, 1.5 = to hơn nữa)
const GUN_VOL=1;let _gb=null;
function gunBus(){if(_gb)return _gb;
  const c=AC.createDynamicsCompressor();c.threshold.value=-10;c.ratio.value=8;c.attack.value=.001;c.release.value=.12;
  const g=AC.createGain();g.gain.value=GUN_VOL;g.connect(c);c.connect(AC.destination);return _gb=g}
function gunShot(type){try{
  AC=AC||new AudioContext();if(AC.state==='suspended')AC.resume();
  const n=AC.currentTime,out=gunBus(),rf=type==='rifle',r=.95+Math.random()*.1;
  const s=noiseSrc(),fl=AC.createBiquadFilter(),ng=AC.createGain(),nd=rf?.09:.12;   // tiếng "đoàng" giòn
  fl.type='bandpass';fl.Q.value=.8;fl.frequency.setValueAtTime((rf?2000:2500)*r,n);fl.frequency.exponentialRampToValueAtTime(500,n+nd);
  ng.gain.setValueAtTime(rf?.9:1,n);ng.gain.exponentialRampToValueAtTime(.001,n+nd);s.connect(fl);fl.connect(ng);ng.connect(out);s.start(n,Math.random()*1.5);s.stop(n+nd+.02);
  const tone=(ty,f0,f1,d,v)=>{const o=AC.createOscillator(),g=AC.createGain();o.type=ty;o.frequency.setValueAtTime(f0,n);o.frequency.exponentialRampToValueAtTime(f1,n+d);
    g.gain.setValueAtTime(v,n);g.gain.exponentialRampToValueAtTime(.001,n+d);o.connect(g);g.connect(out);o.start(n);o.stop(n+d+.02)};
  tone('square',(rf?420:520)*r,80,rf?.1:.11,.32);   // tiếng nổ chính
  tone('sine',(rf?130:160)*r,45,.14,.9);            // cú giật trầm
}catch(e){}}
