// Bản đồ: sàn, tường, khối chắn
// MAPK = hệ số phóng to bản đồ (1 = kích thước gốc, 1.5 = rộng gấp 1.5 lần mỗi chiều). CHỈ CẦN SỬA SỐ NÀY để đổi cỡ cả 4 tầng.
const MAPK=1.5;
// FH = chiều cao mỗi tầng (m). Tăng lên thì trần cao hơn; thang ở level.js tự chia lại số bậc; sương + mây nhỏ dưới trần ở sky.js tự theo (mỗi bậc cao .5m).
const FH=16;
// ---- Map ----
const boxes=[],meshes=[];
function box(x,y,z,w,h,d,col){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color:col}));
  m.position.set(x,y+h/2,z);S.add(m);meshes.push(m);
  boxes.push({x0:x-w/2,x1:x+w/2,y0:y,y1:y+h,z0:z-d/2,z1:z+d/2});
}
const HALF0=Math.round(20*MAPK);   // nửa cạnh trong của tầng 1 (gốc = 20)
const floor=new THREE.Mesh(new THREE.PlaneGeometry(2*HALF0+2,2*HALF0+2),new THREE.MeshLambertMaterial({color:0x8a8c96}));
floor.rotation.x=-Math.PI/2;S.add(floor);meshes.push(floor);
const grid=new THREE.GridHelper(2*HALF0+2,HALF0+1,0x6b6d78,0x6b6d78);grid.position.y=.02;S.add(grid);
const PK=0xff9fbf,BL=0x9ccfff,MT=0xbff0d4,YL=0xffe8a3;
box(0,0,-(HALF0+.5),2*HALF0+3,FH-1,1,PK);box(0,0,HALF0+.5,2*HALF0+3,FH-1,1,PK);box(-(HALF0+.5),0,0,1,FH-1,2*HALF0+3,BL);box(HALF0+.5,0,0,1,FH-1,2*HALF0+3,BL);
// khối chắn: bố cục gốc, nhân MAPK theo chiều ngang (vị trí + kích thước), giữ nguyên chiều cao
const bk=(x,y,z,w,h,d,c)=>box(x*MAPK,y,z*MAPK,w*MAPK,h,d*MAPK,c);
bk(-8,0,-6,2,3.5,2,BL);bk(8,0,-6,2,3.5,2,BL);// (2 khối hồng bk(±8,0,6,2,3.5,2,PK) đã đổi thành 2 bệ tượng đá: xem world/statues.js)

bk(0,0,0,6,1,6,MT);bk(0,1,0,3,1,3,YL);
bk(-15,0,-14,6,1.2,3,MT);bk(15,0,14,6,1.2,3,MT);// (tường hồng dài bk(0,0,-13,10,2,1,PK) đã đổi thành chòi kiểu Nhật: xem world/pavilion.js)
   // (khối dài xanh bk(0,0,13,10,2,1,BL) đã đổi thành nhà rubik: xem world/house.js)
