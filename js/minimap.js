// Bản đồ nhỏ
const mm=$('mm'),mc=mm.getContext('2d'),MS0=mm.width;let MS=1;
function drawMap(){
  const AH=21+5*curFl;MS=MS0/(2*AH);const X=x=>(x+AH)*MS;
  mc.clearRect(0,0,mm.width,mm.height);
  mc.fillStyle='rgba(120,150,210,.55)';
  for(const b of boxes)if(b.y1>curFl*FH+.6&&b.y0<curFl*FH+9)mc.fillRect(X(b.x0),X(b.z0),(b.x1-b.x0)*MS,(b.z1-b.z0)*MS);
  mc.fillStyle='#ff3355';
  for(const b of bots)if(b.hp>0&&b.on){mc.fillStyle=b.boss?'#ffd23f':'#ff3355';mc.beginPath();mc.arc(X(b.x),X(b.z),b.boss?8:4,0,6.3);mc.fill()}
  const px=X(P.x),pz=X(P.z),a=-Math.sin(yaw),c=-Math.cos(yaw);
  mc.beginPath();mc.moveTo(px+a*9,pz+c*9);mc.lineTo(px-a*4-c*5,pz-c*4+a*5);mc.lineTo(px-a*4+c*5,pz-c*4-a*5);mc.closePath();
  mc.fillStyle='#fff';mc.fill();mc.strokeStyle='#2b2a3a';mc.lineWidth=2;mc.stroke();
}
