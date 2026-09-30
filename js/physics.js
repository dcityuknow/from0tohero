// Va chạm và di chuyển
// ---- Physics ----
function lakeGround(x,z,y){return null}   // nature.js ghi đè: độ cao ĐÁY HỒ tại (x,z) nếu đang ở trong hồ, không thì null
const nohole=(b,e)=>!(b.hole&&b.hole(e.x,e.z));   // tấm sàn có hồ: bỏ qua va chạm khi tâm vật thể nằm trong ô hồ (để lún xuống được)
function hit(e){return boxes.filter(b=>e.y+e.h>b.y0&&e.y<b.y1&&e.x+e.r>b.x0&&e.x-e.r<b.x1&&e.z+e.r>b.z0&&e.z-e.r<b.z1&&nohole(b,e))}
function hitAny(e){for(const b of boxes)if(e.y+e.h>b.y0&&e.y<b.y1&&e.x+e.r>b.x0&&e.x-e.r<b.x1&&e.z+e.r>b.z0&&e.z-e.r<b.z1&&nohole(b,e))return true;return false}
function stp(e,b){if((e.ground||b.hole)&&b.y1>e.y&&b.y1-e.y<=.55){e.y=b.y1;return true}return false}   // tự bước lên bậc thang thấp / bờ hồ
function move(e,dx,dy,dz){
  const wg=e.ground;
  e.x+=dx;for(const b of hit(e)){if(stp(e,b))continue;e.x=dx>0?b.x0-e.r-.001:b.x1+e.r+.001}
  e.z+=dz;for(const b of hit(e)){if(stp(e,b))continue;e.z=dz>0?b.z0-e.r-.001:b.z1+e.r+.001}
  e.y+=dy;e.ground=false;
  for(const b of hit(e)){if(dy<0){e.y=b.y1;e.ground=true}else e.y=b.y0-e.h-.001;e.vy=0}
  // mặt đất: sàn y=0, hoặc đáy hồ (thấp hơn sàn) nếu đang ở trong hồ; đang đi xuống dốc đáy hồ thì bám sát đáy
  const lg=lakeGround(e.x,e.z,e.y),gy=lg===null?0:lg;
  if(e.y<=gy||(lg!==null&&wg&&e.vy<=0&&e.y-gy<.4)){e.y=gy;e.ground=true;if(e.vy<0)e.vy=0}
}
