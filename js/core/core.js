// Renderer, scene, camera, ánh sáng
const $=id=>document.getElementById(id);
const cv=document.createElement('canvas');document.body.prepend(cv);
const R=new THREE.WebGLRenderer({canvas:cv,antialias:false});
R.setPixelRatio(Math.min(devicePixelRatio,1.5));
const S=new THREE.Scene();S.background=new THREE.Color(0xcfe8ff);S.fog=new THREE.Fog(0xcfe8ff,18,55);
const C=new THREE.PerspectiveCamera(75,1,.05,100);C.rotation.order='YXZ';S.add(C);
S.add(new THREE.HemisphereLight(0xffffff,0xffd6e6,1.05));
const sun=new THREE.DirectionalLight(0xffffff,.5);sun.position.set(5,10,3);S.add(sun);
function resize(){R.setSize(innerWidth,innerHeight,false);C.aspect=innerWidth/innerHeight;C.updateProjectionMatrix()}
addEventListener('resize',resize);resize();
