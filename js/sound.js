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
function sniperShot(pos){try{
  AC=AC||new AudioContext();if(AC.state==='suspended')AC.resume();
  const B=boomBus(),n=AC.currentTime;
  const d=pos?Math.hypot(pos.x-C.position.x,pos.y-C.position.y,pos.z-C.position.z):0;
  const bus=AC.createGain();bus.gain.value=.3+1.7/(1+d/10);
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
