// OCCLUSION CULLING (chạy trên CPU): ẩn những vật thể / quái bị tường, khối chắn, nhà... che khuất HOÀN TOÀN khỏi mắt người chơi,
// để GPU không phải vẽ (đỉnh + điểm ảnh) những thứ không nhìn thấy. (three.js r128 không có truy vấn che khuất của GPU, nên dùng tia kiểm tra trên các khối của map.)
// Cách làm: với mỗi vật (cây, đá, cụm cỏ, bot...) lấy hình cầu bao + 15 điểm mẫu; bắn tia từ mắt tới từng điểm, thử cắt các khối che (tường, khối chắn, thang, tường nhà).
//   Chỉ khi TẤT CẢ điểm mẫu đều bị chặn mới ẩn (an toàn: nghi ngờ thì vẫn vẽ). Vật gần hơn minDist không bao giờ bị ẩn.
// Làm theo từng lát nhỏ mỗi khung (budget ms) nên gần như không tốn CPU. Kết hợp với: frustum culling của three.js (ngoài tầm nhìn), viewDist (nature.js), ẩn cả tầng khác (floors.js).
// Tắt thử để so sánh: thêm ?occ=0 vào địa chỉ trang, hoặc gõ OC.set(false) trong Console. Xem số liệu: OC.log().
// Nạp SAU nature.js / bot-model.js, TRƯỚC main.js. main.js gọi OC.tick(dt) mỗi khung sau khi đặt camera.
const OC=(function(){
  const cfg={
    on:new URLSearchParams(location.search).get('occ')!=='0',
    minDist:7,       // vật gần hơn mức này (m) không bao giờ bị ẩn
    budget:1.6,      // tối đa bao nhiêu ms mỗi khung dành cho việc kiểm tra
    listEvery:.5,    // giây giữa 2 lần lập lại danh sách vật cần kiểm tra
    occEvery:1       // giây giữa 2 lần lập lại danh sách khối che
  };
  const stats={cand:0,hidden:0,occluders:0,msFrame:0};
  const Y=new THREE.Vector3(0,1,0),tmp=new THREE.Vector3();
  // 15 điểm mẫu quanh tâm hình cầu bao (đơn vị = bán kính)
  const SM=[[0,0,0],[.9,0,0],[-.9,0,0],[0,.9,0],[0,-.9,0],[0,0,.9],[0,0,-.9]];
  for(const a of[.55,-.55])for(const b of[.55,-.55])for(const c of[.55,-.55])SM.push([a,b,c]);
  let occ=[],occFl=-1,ot=0,list=[],lt=0,li=0;

  // khối che = va chạm của khung map (tường ngoài, khối chắn, thang, rào) + tường nhà; bỏ sàn dày (tấm sàn có lỗ / hồ) và cổng trong suốt
  function buildOcc(){
    occFl=curFl;const y0=FY(curFl),live=new Set(boxes),skip=new Set(),out=[];
    for(const g of gates)if(g&&g.e)skip.add(g.e);
    for(const b of FM.structBoxes){
      if(!live.has(b)||skip.has(b)||Math.abs((b.y1-b.y0)-SLAB)<.02||b.hole)continue;
      if(b.y1<y0-.5||b.y0>y0+FHT[curFl])continue;
      out.push([b.x0,b.x1,b.y0,b.y1,b.z0,b.z1]);
    }
    if(curFl===0&&window.OccSrc)for(const k in OccSrc)for(const b of OccSrc[k])out.push([b.x0,b.x1,b.y0,b.y1,b.z0,b.z1]);
    occ=out;stats.occluders=out.length;
  }
  // đoạn thẳng (ox,oy,oz)->(tx,ty,tz) có bị khối che nào cắt không (điểm đầu nằm TRONG khối thì bỏ qua khối đó)
  function blocked(ox,oy,oz,tx,ty,tz){
    const dx=tx-ox,dy=ty-oy,dz=tz-oz;
    for(let i=0;i<occ.length;i++){
      const b=occ[i];let t0=0,t1=1,a,c,s;
      if(dx!==0){a=(b[0]-ox)/dx;c=(b[1]-ox)/dx;if(a>c){s=a;a=c;c=s}if(a>t0)t0=a;if(c<t1)t1=c;if(t0>t1)continue}else if(ox<b[0]||ox>b[1])continue;
      if(dy!==0){a=(b[2]-oy)/dy;c=(b[3]-oy)/dy;if(a>c){s=a;a=c;c=s}if(a>t0)t0=a;if(c<t1)t1=c;if(t0>t1)continue}else if(oy<b[2]||oy>b[3])continue;
      if(dz!==0){a=(b[4]-oz)/dz;c=(b[5]-oz)/dz;if(a>c){s=a;a=c;c=s}if(a>t0)t0=a;if(c<t1)t1=c;if(t0>t1)continue}else if(oz<b[4]||oz>b[5])continue;
      if(t0>1e-4)return true;
    }
    return false;
  }
  // hình cầu (cx,cy,cz,r) có bị che hoàn toàn không
  function hidden(cx,cy,cz,r){
    const ex=C.position.x,ey=C.position.y,ez=C.position.z,dx=cx-ex,dy=cy-ey,dz=cz-ez;
    if(dx*dx+dy*dy+dz*dz<cfg.minDist*cfg.minDist)return false;
    const fy=FY(curFl)+.05;
    for(let i=0;i<SM.length;i++){const o=SM[i];let sy=cy+o[1]*r;if(sy<fy)sy=fy;
      if(!blocked(ex,ey,ez,cx+o[0]*r,sy,cz+o[2]*r))return false}   // thấy được 1 điểm là đủ để vẽ (kiểm tra tâm trước nên đa số thoát ngay)
    return true;
  }
  function sphere(m){   // hình cầu bao (thế giới) của mesh tĩnh: chỉ xoay quanh Y + tỉ lệ đều (đúng với vật trong nature.js), tính 1 lần
    let s=m._os;
    if(!s){const g=m.geometry;if(!g.boundingSphere)g.computeBoundingSphere();const bs=g.boundingSphere,k=m.scale.x;
      tmp.copy(bs.center).multiplyScalar(k).applyAxisAngle(Y,m.rotation.y).add(m.position);s=m._os=[tmp.x,tmp.y,tmp.z,bs.radius*k]}
    return s;
  }
  function rebuildList(){
    list.length=0;const N=window.Nature;
    if(N)for(const Fl of N.floors){if(Fl.f!==curFl)continue;for(const m of Fl.objs)list.push(m);for(const m of Fl.detail)list.push(m)}
    for(const b of bots)if(!b.ally)list.push(b);
    let h=0;for(const o of list)if(o._oc)h++;
    stats.cand=list.length;stats.hidden=h;
  }
  function test(o){
    if(o.isMesh){   // vật thiên nhiên: chỉ xét khi nature.js đang cho phép hiện (_vb)
      if(!o._vb)return;
      const s=sphere(o),h=hidden(s[0],s[1],s[2],s[3]);
      if(h!==!!o._oc){o._oc=h;o.visible=!h}
    }else{          // quái: chỉ xét quái đang sống
      if(!(o.on&&o.hp>0)){o._oc=false;return}
      const r=Math.max(.7,o.h*.5),h=hidden(o.x,o.y+o.h*.5,o.z,r);
      o._oc=h;o.g.visible=!h;
    }
  }
  function tick(dt){
    if(!cfg.on||!playing||!window.FM)return;
    const t0=performance.now();
    if(curFl!==occFl||(ot-=dt)<=0){ot=cfg.occEvery;buildOcc()}
    if((lt-=dt)<=0){lt=cfg.listEvery;rebuildList()}
    const n=list.length;if(!n)return;
    let k=0;
    while(k<n&&performance.now()-t0<cfg.budget){test(list[li%n]);li++;k++}
    li%=n;stats.msFrame=performance.now()-t0;
  }
  // bật / tắt: tắt thì trả mọi vật về trạng thái hiện bình thường
  function set(on){
    cfg.on=!!on;
    if(!cfg.on){for(const o of list){if(o.isMesh){o._oc=false;o.visible=!!o._vb}else if(o.on&&o.hp>0){o._oc=false;o.g.visible=true}}stats.hidden=0}
  }
  const log=()=>{rebuildList();console.log('[Block Arena] occlusion: '+(cfg.on?'BẬT':'TẮT')+' · khối che '+stats.occluders+' · vật cần xét '+stats.cand+' · đang bị ẩn '+stats.hidden+' · '+stats.msFrame.toFixed(2)+' ms/khung');return stats};
  return {tick,set,log,stats,cfg};
})();
