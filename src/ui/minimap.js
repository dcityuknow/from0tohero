// Bản đồ nhỏ
const mm=$('mm'),mc=mm.getContext('2d'),MS0=mm.width;let MS=1;
// Lớp nước (sông) vẽ 1 lần / tầng vào canvas phụ rồi dán lại mỗi khung hình cho nhẹ
const wmc=[];
function waterLayer(Fl){
  const c=document.createElement('canvas');c.width=mm.width;c.height=mm.height;const x=c.getContext('2d'),AH=AF(Fl.f)+1,ms=MS0/(2*AH);
  x.fillStyle='rgba(70,170,255,.6)';
  for(const l of Fl.lakes)for(const [ci,cj] of (l.cl||[]))x.fillRect((ci*.5+AH)*ms,(cj*.5+AH)*ms,.5*ms+.7,.5*ms+.7);
  return c;
}
function drawMap(){
  const AH=AF(curFl)+1;MS=MS0/(2*AH);const X=x=>(x+AH)*MS;
  mc.clearRect(0,0,mm.width,mm.height);
  {const Fl=window.Nature&&Nature.floors&&Nature.floors.find(q=>q.f===curFl);
   if(Fl&&Fl.cells.size){if(!wmc[curFl])wmc[curFl]=waterLayer(Fl);mc.drawImage(wmc[curFl],0,0)}}
  mc.fillStyle='rgba(120,150,210,.55)';
  for(const b of boxes)if(b.y1>curFl*FH+.6&&b.y0<curFl*FH+5)mc.fillRect(X(b.x0),X(b.z0),(b.x1-b.x0)*MS,(b.z1-b.z0)*MS);
  mc.fillStyle='#ff3355';
  for(const b of bots)if(b.hp>0&&b.on&&(!b.ally||Math.abs(b.y-curFl*FH)<FH)){mc.fillStyle=b.ally?'#3fdc7a':b.boss?'#ffd23f':'#ff3355';mc.beginPath();mc.arc(X(b.x),X(b.z),b.ally?7:b.boss?8:4,0,6.3);mc.fill()}
  const px=X(P.x),pz=X(P.z),a=-Math.sin(yaw),c=-Math.cos(yaw);
  mc.beginPath();mc.moveTo(px+a*9,pz+c*9);mc.lineTo(px-a*4-c*5,pz-c*4+a*5);mc.lineTo(px-a*4+c*5,pz-c*4-a*5);mc.closePath();
  mc.fillStyle='#fff';mc.fill();mc.strokeStyle='#2b2a3a';mc.lineWidth=2;mc.stroke();
}
