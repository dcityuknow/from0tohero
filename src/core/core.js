// Renderer, scene, camera, ánh sáng
const $=id=>document.getElementById(id);
const cv=document.createElement('canvas');document.body.prepend(cv);
const R=new THREE.WebGLRenderer({canvas:cv,antialias:false});
R.setPixelRatio(Math.min(devicePixelRatio,1.5));
R.autoClear=false;   // main.js tự xóa: vẽ thế giới (layer 0) rồi xóa depth và vẽ súng/tay (layer 1) đè lên trên
const S=new THREE.Scene();S.background=new THREE.Color(0xcfe8ff);S.fog=new THREE.Fog(0xcfe8ff,18,55);
const C=new THREE.PerspectiveCamera(75,1,.05,100);C.rotation.order='YXZ';S.add(C);
const hemi=new THREE.HemisphereLight(0xffffff,0xffd6e6,1.05);hemi.layers.enable(1);S.add(hemi);   // đèn bật cả layer 1 để súng cầm tay vẫn được chiếu sáng
const sun=new THREE.DirectionalLight(0xffffff,.5);sun.position.set(5,10,3);sun.layers.enable(1);S.add(sun);
function resize(){R.setSize(innerWidth,innerHeight,false);C.aspect=innerWidth/innerHeight;C.updateProjectionMatrix()}
addEventListener('resize',resize);resize();
