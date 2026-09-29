// Tòa nhà 4 tầng: mỗi tầng 1 map riêng, càng lên cao càng rộng (nửa cạnh trong: 20/25/30/35).
// Thang tầng chẵn ở TÂY, tầng lẻ ở ĐÔNG. Cổng khóa ở chân thang, mở khi hạ boss của tầng đó.
const NF=4,FH=10,AF=f=>20+5*f;
const need=f=>50*(f+1);                 // boss xuất hiện sau khi hạ 50 / 100 / 150 / 200 bot (cấp số cộng), mỗi tầng đếm lại từ 0
let curFl=0;const fk=[0,0,0,0],bossDone=[false,false,false,false],gates=[];let bossAlive=false;
const FC=[[PK,BL,MT,YL],[0xc9a7ff,0xffb3a7,0xa8e6cf,0xfff2a3],[0xffd166,0x8ecae6,0xf4a3c4,0xb8f2c8],[0x9aa5ff,0xff9fa8,0xb5ead7,0xffdac1]];
function slabHole(y,S,x0,x1,z0,z1,c){
  const B=(xa,xb,za,zb)=>{if(xb-xa>.01&&zb-za>.01)box((xa+xb)/2,y,(za+zb)/2,xb-xa,1,zb-za,c)};
  B(-S,S,-S,z0);B(-S,S,z1,S);B(-S,x0,z0,z1);B(x1,S,z0,z1);
}
const LAY=[null,
 (y,a,b,c,d)=>{   // tầng 2: khối trung tâm, 4 cột, 2 tường dài, 2 bục thấp
  box(0,y,0,8,1,8,c);box(0,y+1,0,4,1,4,d);
  for(const sx of[-1,1])for(const sz of[-1,1])box(sx*10,y,sz*10,2,3.5,2,b);
  box(0,y,-15,14,2,1,a);box(0,y,15,14,2,1,a);box(-12,y,0,3,1.2,10,c);box(12,y,0,3,1.2,10,c)},
 (y,a,b,c,d)=>{   // tầng 3: chia 4 phòng có cửa, tháp giữa
  box(0,y,-18,1,3.5,10,b);box(0,y,18,1,3.5,10,b);box(-14,y,0,10,3.5,1,a);box(14,y,0,10,3.5,1,a);
  box(0,y,0,5,2,5,c);box(0,y+2,0,2.5,1.5,2.5,d);
  for(const sx of[-1,1])for(const sz of[-1,1])box(sx*10,y,sz*10,3,1.1,3,d)},
 (y,a,b,c,d)=>{   // tầng 4: đấu trường vòng cột, đồi bậc thang ở giữa
  box(0,y,0,12,1,12,c);box(0,y+1,0,7,1,7,d);box(0,y+2,0,3,1,3,a);
  for(const [x,z] of[[16,16],[-16,16],[16,-16],[-16,-16],[0,-20],[0,20],[-20,0],[20,0]])box(x,y,z,2,4,2,b);
  for(const sx of[-1,1])for(const sz of[-1,1])box(sx*9,y,sz*24,10,2,1,a)}];
for(let f=1;f<NF;f++){
  const y=f*FH,[a,b,c,d]=FC[f],A=AF(f),Af=AF(f-1),s=(f-1)%2;
  slabHole(y-1,A+1,s?Af-4:-Af,s?Af:-Af+4,Af-22,Af-4,c);            // sàn khoét lỗ cho thang từ tầng dưới
  box(0,y,-(A+.5),2*A+3,9,1,a);box(0,y,A+.5,2*A+3,9,1,a);box(-(A+.5),y,0,1,9,2*A+3,b);box(A+.5,y,0,1,9,2*A+3,b);
  LAY[f](y,a,b,c,d);
}
{const A=AF(NF-1)+1;box(0,NF*FH-1,0,2*A,1,2*A,0xdcdce6)}           // trần tầng cao nhất
for(let f=0;f<NF-1;f++){
  const y=f*FH,A=AF(f),s=f%2,sg=s?1:-1,cx=sg*(A-2),zs=A-4,col=FC[f];
  for(let i=0;i<20;i++)box(cx,y,zs-.9*i-.45,4,.5*(i+1),.9,i%2?col[3]:col[2]);   // 20 bậc x 0.5m = 10m
  box(sg*(A-4.15),y,zs-9,.3,12.2,18,col[1]);                                      // tường trong + rào lỗ ở tầng trên
  box(sg*(A+.15),y+FH,zs-9,.3,2.2,18,col[1]);box(cx,y+FH,zs+.1,4,2.2,.2,col[1]);   // rào ngoài + rào phía nam
  box(cx,y,zs+.45,4,4.2,.3,0xff3355);
  const g={open:false,e:boxes[boxes.length-1],m:meshes[meshes.length-1]};
  g.m.material.transparent=true;g.m.material.opacity=.6;g.m.material.emissive=new THREE.Color(0x881122);gates[f]=g;
}
function openGate(f){const g=gates[f];if(!g||g.open)return;g.open=true;boxes.splice(boxes.indexOf(g.e),1);meshes.splice(meshes.indexOf(g.m),1);S.remove(g.m)}
// điểm spawn cho từng tầng: lấy mẫu lưới ở vùng giữa, bỏ điểm chạm vật cản
const _sp=[];
function fSpawns(f){if(_sp[f])return _sp[f];const A=AF(f),R=f?A-11:14,c=[];
  for(let x=-R;x<=R;x+=3)for(let z=-(A-3);z<=A-3;z+=3)if(!hit({x,y:f*FH+.02,z,r:.7,h:1.7}).length)c.push([x,z]);
  const k=Math.max(1,Math.floor(c.length/14));return _sp[f]=c.filter((_,i)=>i%k===0)}
function resetLevel(){
  for(const g of gates)if(g.open){g.open=false;boxes.push(g.e);meshes.push(g.m);S.add(g.m)}
  bul.forEach(p=>S.remove(p.m));bul.length=0;fk.fill(0);bossDone.fill(false);bossAlive=false;curFl=0;setupFloor();
}
