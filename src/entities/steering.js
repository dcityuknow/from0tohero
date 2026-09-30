// Di chuyển của quái: né vật cản (steering) + nhảy qua khối thấp
const free=(b,ax,az,len,dy=.3,h=1.2)=>!hitAny({x:b.x+ax*len,y:b.y+dy,z:b.z+az*len,r:b.r,h});
function steer(b,tx,tz,sp,dt){
  const a0=Math.atan2(tx-b.x,tz-b.z),s=b.side||1,len=b.r+.5,so=b.sw?1.4:0;let a=null;   // so: đang bơi -> dò vật cản cao hơn mặt nước, bờ/sàn không chặn đường
  if(b.ground&&!free(b,Math.sin(a0),Math.cos(a0),len,.6)&&free(b,Math.sin(a0),Math.cos(a0),len,1.5,.3)){b.vy=8;b.ground=false}
  for(const o of[0,.6*s,-.6*s,1.2*s,-1.2*s,1.9*s,-1.9*s]){
    const A=a0+o;if(free(b,Math.sin(A),Math.cos(A),len,.6+so)){a=A;if(o)b.side=Math.sign(o);break}}
  if(a===null)a=a0+Math.PI*s;
  move(b,Math.sin(a)*sp*dt,b.vy*dt,Math.cos(a)*sp*dt);
}
