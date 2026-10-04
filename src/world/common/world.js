// Bản đồ: sàn, tường, khối chắn
// MAPK = hệ số phóng to bản đồ (1 = kích thước gốc, 1.5 = rộng gấp 1.5 lần mỗi chiều). CHỈ CẦN SỬA SỐ NÀY để đổi cỡ cả 4 tầng.
const MAPK=1.5;
// FH = chiều cao mỗi tầng (m) (đã tăng gấp đôi: 16 -> 32). Tăng lên thì trần cao hơn; chiều dài thang STL ở level.js tự dài theo (bậc luôn cao .5m); thang ở level.js tự chia lại số bậc; sương + mây nhỏ dưới trần ở sky.js tự theo (mỗi bậc cao .5m).
const FH=32;   // chiều cao MẶC ĐỊNH của một tầng (tầng 2-4). Chiều cao từng tầng riêng: xem FHT bên dưới
// FHT = chiều cao từng tầng (m). Tầng 1 thấp hơn (22.4 = 70% của 32), các tầng 2-4 giữ 32. Sửa số ở đây là xong: mọi file dùng FY(f) / FHT[f] / flOf(y)
const FHT=[22.4,32,32,32];
const FYS=[0];for(let i=0;i<FHT.length;i++)FYS.push(FYS[i]+FHT[i]);
const FY=f=>FYS[f<0?0:f>FHT.length?FHT.length:f];            // độ cao sàn của tầng f (FY(NF) = đỉnh tòa nhà)
const flOf=y=>{for(let f=FHT.length-1;f>0;f--)if(y>=FYS[f])return f;return 0};   // độ cao y đang thuộc tầng nào
// SLAB = độ dày sàn các tầng 2-4 (m). Khai báo ở đây (không phải level.js) để tường bao tầng 1 ngay bên dưới biết mà hạ thấp: tường không được cao quá đáy sàn tầng trên, nếu không sẽ thò vào lòng sông của tầng trên.
const SLAB=2.4;
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
const WH0=FHT[0]-SLAB;   // tường bao tầng 1 cao tới đúng đáy sàn tầng 2
box(0,0,-(HALF0+.5),2*HALF0+3,WH0,1,PK);box(0,0,HALF0+.5,2*HALF0+3,WH0,1,PK);box(-(HALF0+.5),0,0,1,WH0,2*HALF0+3,BL);box(HALF0+.5,0,0,1,WH0,2*HALF0+3,BL);
// khối chắn: bố cục gốc, nhân MAPK theo chiều ngang (vị trí + kích thước), giữ nguyên chiều cao
const bk=(x,y,z,w,h,d,c)=>box(x*MAPK,y,z*MAPK,w*MAPK,h,d*MAPK,c);
// (2 khối xanh bk(±8,0,-6,2,3.5,2,BL) đã đổi thành 2 bộ bàn trà kiểu Nhật: xem world/teaset.js)
// (2 khối hồng bk(±8,0,6,2,3.5,2,PK) đã đổi thành 2 bệ tượng đá: xem world/statues.js)

bk(0,0,0,6,1,6,MT);bk(0,1,0,3,1,3,YL);
// (2 khối mint góc bk(-15,0,-14,6,1.2,3,MT) và bk(15,0,14,...) đã đổi thành 2 hồ tắm đá có thác nước: xem world/bath.js)
// (tường hồng dài bk(0,0,-13,10,2,1,PK) đã đổi thành chòi kiểu Nhật: xem world/pavilion.js)
   // (khối dài xanh bk(0,0,13,10,2,1,BL) đã đổi thành nhà rubik: xem world/house.js)
