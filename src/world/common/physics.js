// Va chạm và di chuyển
// ---- Physics ----
function lakeGround(x,z,y){return null}   // nature.js ghi đè: độ cao ĐÁY HỒ tại (x,z) nếu đang ở trong hồ, không thì null
const nohole=(b,e)=>!(b.hole&&b.hole(e.x,e.z));   // tấm sàn có hồ: bỏ qua va chạm khi tâm vật thể nằm trong ô hồ (để lún xuống được)
const ovl=(e,b)=>e.y+e.h>b.y0&&e.y<b.y1&&e.x+e.r>b.x0&&e.x-e.r<b.x1&&e.z+e.r>b.z0&&e.z-e.r<b.z1&&nohole(b,e);

// ---- LƯỚI KHÔNG GIAN cho `boxes` (world.js): mỗi ô 4x4m chứa các khối chạm vào nó. Trước đây mọi truy vấn (hit / hitAny / step / groundY) quét TOÀN BỘ danh sách khối;
// giờ chỉ xét vài khối quanh vật thể -> nhanh hơn nhiều lần khi map có hàng trăm khối (cây, tường thành, nhà...). Kết quả va chạm giữ nguyên (khối được xét theo đúng thứ tự mảng).
// Lưới tự dựng lại khi danh sách `boxes` đổi (push / splice được bắt ở đây; nơi nào sửa mảng theo cách khác thì gọi BXG.dirty()). Khối rất lớn (sàn) để riêng trong BXG.big.
const BXG={cs:4,map:new Map(),big:[],ver:0,built:-1,n:-1,stamp:0,
  dirty(){this.ver++}};
for(const k of['push','splice','unshift','pop','shift'])(m=>{const o=boxes[m];boxes[m]=function(){BXG.ver++;return o.apply(this,arguments)}})(k);
const bxKey=(i,j)=>(i+512)*1024+(j+512);
function bxBuild(){
  const mp=BXG.map,cs=BXG.cs,big=BXG.big;mp.clear();big.length=0;
  for(let n=0;n<boxes.length;n++){
    const b=boxes[n];b._i=n;
    const i0=Math.floor(b.x0/cs),i1=Math.floor(b.x1/cs),j0=Math.floor(b.z0/cs),j1=Math.floor(b.z1/cs);
    if((i1-i0+1)*(j1-j0+1)>256){big.push(b);continue}
    for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const k=bxKey(i,j);let a=mp.get(k);if(!a)mp.set(k,a=[]);a.push(b)}
  }
  BXG.built=BXG.ver;BXG.n=boxes.length;
}
const bxFresh=()=>{if(BXG.built!==BXG.ver||BXG.n!==boxes.length)bxBuild()};
// gom các khối nằm trong hình chữ nhật (x0..x1, z0..z1) vào mảng out (không trùng, đúng thứ tự mảng boxes)
function bxGather(x0,x1,z0,z1,out){
  bxFresh();out.length=0;const cs=BXG.cs,mp=BXG.map,st=++BXG.stamp;
  const i0=Math.floor(x0/cs),i1=Math.floor(x1/cs),j0=Math.floor(z0/cs),j1=Math.floor(z1/cs);
  for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const a=mp.get(bxKey(i,j));if(a)for(let k=0;k<a.length;k++){const b=a[k];if(b._q!==st){b._q=st;out.push(b)}}}
  const big=BXG.big;for(let k=0;k<big.length;k++){const b=big[k];if(b._q!==st){b._q=st;out.push(b)}}
  if(out.length>1)out.sort((p,q)=>p._i-q._i);
  return out;
}
const _bc=[];
function hit(e){
  bxGather(e.x-e.r,e.x+e.r,e.z-e.r,e.z+e.r,_bc);
  const r=[];for(let k=0;k<_bc.length;k++)if(ovl(e,_bc[k]))r.push(_bc[k]);return r;
}
function hitAny(e){
  bxFresh();
  const cs=BXG.cs,mp=BXG.map,i0=Math.floor((e.x-e.r)/cs),i1=Math.floor((e.x+e.r)/cs),j0=Math.floor((e.z-e.r)/cs),j1=Math.floor((e.z+e.r)/cs);
  for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const a=mp.get(bxKey(i,j));if(a)for(let k=0;k<a.length;k++)if(ovl(e,a[k]))return true}
  const big=BXG.big;for(let k=0;k<big.length;k++)if(ovl(e,big[k]))return true;
  return false;
}
function stp(e,b){if((e.ground||b.hole)&&b.y1>e.y&&b.y1-e.y<=.55){e.y=b.y1;return true}return false}   // tự bước lên bậc thang thấp / bờ hồ
// Một bước di chuyển nhỏ. Kiểm tra lại va chạm với TỪNG khối (không dùng danh sách cũ) và chỉ xử lý trục thực sự có di chuyển,
// để không bị đẩy sang phía bên kia khối khi dx/dz = 0. L = danh sách khối cần xét (mặc định: tất cả)
function step(e,dx,dy,dz,L){
  L=L||boxes;const wg=e.ground;
  if(dx){e.x+=dx;for(let k=0;k<L.length;k++){const b=L[k];if(!ovl(e,b))continue;if(stp(e,b))continue;e.x=dx>0?b.x0-e.r-.001:b.x1+e.r+.001}}
  if(dz){e.z+=dz;for(let k=0;k<L.length;k++){const b=L[k];if(!ovl(e,b))continue;if(stp(e,b))continue;e.z=dz>0?b.z0-e.r-.001:b.z1+e.r+.001}}
  e.y+=dy;e.ground=false;
  for(let k=0;k<L.length;k++){const b=L[k];if(!ovl(e,b))continue;if(dy<0){e.y=b.y1;e.ground=true}else e.y=b.y0-e.h-.001;e.vy=0}
  // mặt đất: sàn y=0, hoặc đáy hồ (thấp hơn sàn) nếu đang ở trong hồ; đang đi xuống dốc đáy hồ thì bám sát đáy
  const lg=lakeGround(e.x,e.z,e.y),gy=lg===null?0:lg;
  if(e.y<=gy||(lg!==null&&wg&&e.vy<=0&&e.y-gy<.4)){e.y=gy;e.ground=true;if(e.vy<0)e.vy=0}
}
// Chia nhỏ bước (tối đa 6 bước, mỗi bước <= .25m) để vật chuyển động nhanh (lựu đạn, rơi tự do) không xuyên qua tường mỏng.
// Các khối quanh vật thể được gom MỘT lần cho cả lượt di chuyển (vùng quét + lề), thay vì quét toàn bộ danh sách ở mỗi bước.
const _mc=[];
function move(e,dx,dy,dz){
  const n=Math.min(6,Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy),Math.abs(dz))/.25)));
  const rx=e.r+Math.abs(dx)+.05,rz=e.r+Math.abs(dz)+.05;
  bxGather(e.x-rx,e.x+rx,e.z-rz,e.z+rz,_mc);
  for(let i=0;i<n;i++)step(e,dx/n,dy/n,dz/n,_mc);
}
