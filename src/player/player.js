// Người chơi (góc nhìn thứ nhất): cánh tay + bàn tay cầm súng, chi tiết bằng voxel
// arm(x,y,z,rx,ry,left): bàn tay ở gốc, ống tay kéo về phía sau (+z). left=true để lật thành tay trái.
function arm(x,y,z,rx,ry,left=false){
  const g=new THREE.Group(),v=new VB(),CS=window.CharPick&&CharPick.fp&&CharPick.fp();   // CS = nhân vật đã chọn (ui/character.js): tay áo quân phục, màu da, găng
  const SKT=CS?(CS.glove?[CS.glove,CS.glove]:CS.skin):[0xffd9c7,0xffcbb5],SK=chk(SKT[0],SKT[1]),NAIL=CS&&CS.glove?CS.glove:0xfff0e8;
  // ống tay áo: sọc hồng, sọc trắng chạy dọc phía trên
  v.box(0,0,.43,.17,.17,.66,CS?CS.sleeve:(i,j,k,nx,ny)=>(j===ny-1&&(i===(nx>>1)||i===((nx-1)>>1)))?0xffffff:((k>>2)&1?0xff9fbf:0xff7fa8),.03,true);
  v.box(0,0,.1,.19,.19,.06,CS?CS.cuff:0xffffff,.02,true);                       // bo tay áo
  v.box(0,0,.19,.18,.18,.05,CS?CS.band:0x3a3850,.02,true);                      // dây đồng hồ
  v.box(0,.1,.19,.13,.03,.08,0x2b2a3a,.015);v.box(0,.118,.19,.09,.008,.05,0x7fdfff,.01); // mặt đồng hồ
  // bàn tay: lòng bàn tay, 4 ngón bóp lại, ngón cái, găng mu tay
  v.box(0,0,0,.15,.13,.12,SK,.02,true);
  for(let f=0;f<4;f++){
    const y=.045-.03*f;
    v.box(0,y,-.085,.13,.028,.05,SK,.014);
    v.box(0,y,-.113,.09,.02,.006,NAIL,.006);                       // móng tay
  }
  v.box(-.09,.03,-.01,.05,.05,.11,SK,.016);v.box(-.09,.03,-.068,.03,.03,.006,NAIL,.006);
  v.box(0,.068,-.01,.13,.012,.1,CS?(CS.glove||CS.band):0x3a3850,.012);                        // mu bàn tay có găng
  g.add(v.mesh());g.position.set(x,y,z);g.rotation.set(rx,ry,0);if(left)g.scale.x=-1;return g;
}
