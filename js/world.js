// Bản đồ: sàn, tường, khối chắn
// ---- Map ----
const boxes=[],meshes=[];
function box(x,y,z,w,h,d,col){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color:col}));
  m.position.set(x,y+h/2,z);S.add(m);meshes.push(m);
  boxes.push({x0:x-w/2,x1:x+w/2,y0:y,y1:y+h,z0:z-d/2,z1:z+d/2});
}
const floor=new THREE.Mesh(new THREE.PlaneGeometry(42,42),new THREE.MeshLambertMaterial({color:0x8a8c96}));
floor.rotation.x=-Math.PI/2;S.add(floor);meshes.push(floor);
const grid=new THREE.GridHelper(42,21,0x6b6d78,0x6b6d78);grid.position.y=.02;S.add(grid);
const PK=0xff9fbf,BL=0x9ccfff,MT=0xbff0d4,YL=0xffe8a3;
box(0,0,-20.5,43,9,1,PK);box(0,0,20.5,43,9,1,PK);box(-20.5,0,0,1,9,43,BL);box(20.5,0,0,1,9,43,BL);
box(-8,0,-6,2,3.5,2,BL);box(8,0,-6,2,3.5,2,BL);box(-8,0,6,2,3.5,2,PK);box(8,0,6,2,3.5,2,PK);
box(0,0,0,6,1,6,MT);box(0,1,0,3,1,3,YL);
box(-15,0,-14,6,1.2,3,MT);box(15,0,14,6,1.2,3,MT);box(0,0,-13,10,2,1,PK);box(0,0,13,10,2,1,BL);
