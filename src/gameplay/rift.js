// ============================================================================
// LỖ HỔNG KHÔNG GIAN (Rift): thỉnh thoảng xuất hiện trước mặt người chơi; bước vào là
// sang tham quan Optimum World (game 1) trong 1 iframe toàn màn hình. Bấm "Quay lại" để về.
// Đặt file này ở: src/gameplay/rift.js  (khai báo trong src/loader.js, sau 'gameplay/fall.js')
// Cần (nạp trước): THREE, S, C, P, yaw, playing, dead (core.js, state.js, main.js)
// Dùng tên Rift (không đụng world/common/portal.js - cổng thang máy của game).
// ============================================================================
(function(){
  const RIFT={
    chance:.05,        // 5% mỗi lần tung xúc xắc
    every:30000,       // ms giữa 2 lần tung (30 giây)
    life:25000,        // ms lỗ hổng tồn tại nếu người chơi không bước vào
    cooldown:60000,    // ms nghỉ sau khi đi tham quan về
    enterR:1.3,        // bán kính (m) để bước vào
    // Game 1 (Optimum World) đã deploy trên GitHub Pages. ?visit=1 = chế độ tham quan (js/visit-mode.js bên game 1)
    url:'https://dcityuknow.github.io/optimum-world/?visit=1'
  };

  const T=(vi,en)=>(typeof L!=='undefined'&&L==='vi')?vi:en;
  const msg=s=>{try{if(typeof showMsg==='function')showMsg(s)}catch(e){}};
  const charKey=()=>{try{return (window.PROFILE&&PROFILE.char)||(window.CharPick&&CharPick.current&&CharPick.current())||'vn'}catch(e){return 'vn'}};   // cùng cách chọn như player/thirdperson.js
  const busy=()=>!!(window.Apoc&&Apoc.active)||!!(window.NET&&NET.on);   // đang cảnh tận thế / đang chơi LAN thì không mở

  let obj=null,dieAt=0,coolUntil=0,gy=0,ov=null;
  const R_={inside:false};
  window.Rift=R_;

  function build(){
    const g=new THREE.Group();
    const mk=(geo,col,op,add)=>new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:col,transparent:op<1,opacity:op,fog:false,side:THREE.DoubleSide,depthWrite:false,blending:add?THREE.AdditiveBlending:THREE.NormalBlending}));
    g.add(mk(new THREE.CircleGeometry(1.05,32),0x07001a,.92,false));           // lõi tối
    const glow=mk(new THREE.CircleGeometry(1.05,32),0x7c4dff,.35,true);glow.position.z=.01;glow.name='glow';g.add(glow);
    [[1.2,0x7c4dff,1.6],[.95,0x00e5ff,-2.2],[.7,0xffffff,3]].forEach(([r,c,sp])=>{
      const ring=mk(new THREE.TorusGeometry(r,.07,8,36),c,1,false);ring.userData.spin=sp;g.add(ring);
    });
    const cubes=new THREE.Group();cubes.name='cubes';   // các khối voxel bay vòng quanh cho hợp phong cách game
    for(let i=0;i<14;i++){
      const m=mk(new THREE.BoxGeometry(.14,.14,.14),i%2?0x00e5ff:0xb388ff,1,false);
      m.userData.a=i/14*Math.PI*2;m.userData.r=1.35+(i%3)*.12;cubes.add(m);
    }
    g.add(cubes);
    return g;
  }

  function groundAt(x,z){
    let v=P.y;
    try{if(typeof groundY==='function'){const r=groundY(x,z,P.y+1);if(typeof r==='number'&&isFinite(r))v=r}}catch(e){}
    return v;
  }

  R_.spawn=function(){
    if(obj||R_.inside)return false;
    const tries=[[7,0],[9,.5],[9,-.5],[6,0],[11,0]];   // [khoảng cách, lệch góc]
    for(const [d,da] of tries){
      const a=yaw+da,x=P.x-Math.sin(a)*d,z=P.z-Math.cos(a)*d,y=groundAt(x,z);
      if(Math.abs(y-P.y)>3)continue;                     // tránh vách / hố sâu
      gy=y;obj=build();obj.position.set(x,y+1.3,z);S.add(obj);
      dieAt=performance.now()+RIFT.life;
      msg(T('Một lỗ hổng không gian vừa xuất hiện!','A space rift has appeared!'));
      return true;
    }
    return false;
  };

  function remove(){if(obj){S.remove(obj);obj=null}}

  function enter(){
    remove();R_.inside=true;
    for(const k in keys)keys[k]=false;                    // nhả hết phím, tránh kẹt phím khi quay lại
    try{md=false;holding=false;autoP=false;scoped=false}catch(e){}
    if(document.exitPointerLock)document.exitPointerLock();
    ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;z-index:99999;background:#000';
    const fr=document.createElement('iframe');
    fr.src=RIFT.url+'&char='+encodeURIComponent(charKey());fr.allow='autoplay; fullscreen';   // gắn nhân vật đang chọn vào link sang game 1
    fr.style.cssText='width:100%;height:100%;border:0;display:block';
    fr.onload=()=>{try{fr.focus()}catch(e){}};
    const bt=document.createElement('button');
    bt.textContent='⮌ '+T('Quay lại Block Arena','Back to Block Arena');
    bt.style.cssText='position:absolute;top:calc(12px + env(safe-area-inset-top,0px));right:12px;padding:10px 16px;border:0;border-radius:10px;background:#7c4dff;color:#fff;font:600 16px system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,.5)';
    bt.onclick=leave;
    ov.append(fr,bt);document.body.appendChild(ov);
  }

  function leave(){
    if(ov){ov.remove();ov=null}                           // gỡ iframe -> game 1 tắt hẳn (cả âm thanh)
    R_.inside=false;coolUntil=performance.now()+RIFT.cooldown;
    try{cv.requestPointerLock()}catch(e){}                // bấm nút là cử chỉ người dùng nên khoá chuột lại được
  }
  R_.leave=leave;

  // tung xúc xắc
  setInterval(()=>{
    if(obj||R_.inside||!playing||dead||busy()||performance.now()<coolUntil)return;
    if(Math.random()<RIFT.chance)R_.spawn();
  },RIFT.every);

  // hoạt ảnh + kiểm tra bước vào (vòng lặp riêng, không phải sửa main.js)
  let t0=performance.now();
  (function loop(now){
    requestAnimationFrame(loop);
    const dt=Math.min(.05,(now-t0)/1000);t0=now;
    if(!obj)return;
    if(dead||busy()||now>dieAt){remove();return}
    obj.lookAt(C.position.x,obj.position.y,C.position.z);
    for(const c of obj.children){
      if(c.userData.spin)c.rotation.z+=c.userData.spin*dt;
      if(c.name==='glow')c.material.opacity=.3+.15*Math.sin(now/220);
      if(c.name==='cubes')for(const m of c.children){m.userData.a+=dt*1.8;m.position.set(Math.cos(m.userData.a)*m.userData.r,Math.sin(m.userData.a)*m.userData.r,0);m.rotation.x+=dt*3;m.rotation.y+=dt*2}
    }
    obj.scale.setScalar(Math.min(1,(now-(dieAt-RIFT.life))/600)||.01);   // phình ra khi xuất hiện
    if(playing&&Math.hypot(P.x-obj.position.x,P.z-obj.position.z)<RIFT.enterR&&P.y>gy-.6&&P.y<gy+2.6)enter();
  })(performance.now());
})();
