// Va chạm và di chuyển
// ---- Physics ----
function hit(e){return boxes.filter(b=>e.y+e.h>b.y0&&e.y<b.y1&&e.x+e.r>b.x0&&e.x-e.r<b.x1&&e.z+e.r>b.z0&&e.z-e.r<b.z1)}
function hitAny(e){for(const b of boxes)if(e.y+e.h>b.y0&&e.y<b.y1&&e.x+e.r>b.x0&&e.x-e.r<b.x1&&e.z+e.r>b.z0&&e.z-e.r<b.z1)return true;return false}
function stp(e,b){if(e.ground&&b.y1>e.y&&b.y1-e.y<=.55){e.y=b.y1;return true}return false}   // tự bước lên bậc thang thấp
function move(e,dx,dy,dz){
  e.x+=dx;for(const b of hit(e)){if(stp(e,b))continue;e.x=dx>0?b.x0-e.r-.001:b.x1+e.r+.001}
  e.z+=dz;for(const b of hit(e)){if(stp(e,b))continue;e.z=dz>0?b.z0-e.r-.001:b.z1+e.r+.001}
  e.y+=dy;e.ground=false;
  for(const b of hit(e)){if(dy<0){e.y=b.y1;e.ground=true}else e.y=b.y0-e.h-.001;e.vy=0}
  if(e.y<=0){e.y=0;e.ground=true;if(e.vy<0)e.vy=0}
}
