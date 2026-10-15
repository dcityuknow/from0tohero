// Người chơi khác (LAN): thân nhân vật voxel, súng cầm tay, bảng tên + thanh máu, hộp va chạm để bắn trúng, tia đạn của họ.
// Thân dùng lại CharPick.make (ui/character.js) nên mỗi người hiện đúng nhân vật họ đã chọn. Súng dựng bằng VB (engine/voxel.js).
// Nạp SAU engine/voxel.js, gameplay/effects.js, TRƯỚC net/net.js. Chỉ net/net.js gọi module này.
//
// Mọi avatar nằm trong 1 nhóm riêng (root) thêm vào scene S. LƯU Ý: world/common/floors.js ghi lại mọi vật được thêm vào S trong lúc dựng
// một tầng rồi GỠ chúng khi dỡ tầng -> NetAvatar.attach() (gọi mỗi khung) tự gắn root lại nếu bị gỡ nhầm.
window.NetAvatar=(function(){
  const root=new THREE.Group();root.name='net-players';
  const set=new Set();                       // mọi avatar đang có
  const PI=Math.PI;

  // ---- súng cầm tay: hộp [tâmX,tâmY,tâmZ, rộng,cao,dài, màu, cỡ khối]; gốc (0,0,0) = chỗ tay nắm báng, nòng chĩa về +z ----
  const DK=0x3a3850,DK2=0x2b2a3a,GR=0x55536e;
  const GUN={
    pistol:[[0,.045,.12,.05,.07,.26,DK,.02],[0,.04,.27,.03,.04,.04,0xff9a3c,.02],[0,-.05,-.01,.05,.13,.07,DK2,.02],[0,-.12,-.01,.055,.02,.075,0x4d9dff,.02]],
    rifle:[[0,.03,.22,.07,.1,.5,DK,.025],[0,.045,.66,.03,.03,.36,DK2,.015],[0,0,.46,.06,.07,.3,GR,.025],[0,-.06,-.01,.05,.12,.06,DK2,.02],[0,-.1,.2,.05,.16,.07,0xf2b84b,.02],[0,0,-.2,.06,.1,.3,DK2,.025],[0,.1,.2,.02,.03,.1,DK2,.015]],
    sniper:[[0,.03,.3,.065,.09,.75,DK,.025],[0,.035,.9,.025,.025,.4,DK2,.015],[0,.115,.25,.05,.05,.3,0x4d9dff,.02],[0,.115,.42,.065,.065,.04,0x7fbfff,.02],[0,-.01,-.22,.065,.1,.36,DK2,.025],[0,-.06,-.01,.05,.12,.06,DK2,.02],[0,-.08,.18,.04,.1,.06,DK,.02]],
    grenade:[[0,0,0,.08,.1,.08,0x4a7a3a,.02],[0,.07,0,.03,.04,.03,0xc9c9d6,.015]]
  };
  const MUZ={pistol:.3,rifle:.85,sniper:1.1,grenade:.1};   // chỗ đầu nòng (z) để mọc tia đạn
  const gp={};
  function gunProto(t){
    if(gp[t])return gp[t];
    const v=new VB();for(const a of GUN[t])v.box(a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7]);
    return gp[t]=v.mesh();
  }

  // ---- hộp va chạm vô hình (đạn của mình chạm vào thì tính là trúng người) ----
  const HM=new THREE.MeshBasicMaterial({visible:false});
  const GB=new THREE.BoxGeometry(.62,1.34,.42),GH=new THREE.BoxGeometry(.46,.46,.46);

  // ---- bảng tên: sprite vẽ bằng canvas (tên + thanh máu), chỉ vẽ lại khi tên / máu / trạng thái đổi ----
  const FONT='700 34px "Segoe UI","Noto Sans","Noto Sans Bengali","Noto Sans Devanagari","Noto Sans SC","Microsoft YaHei","Malgun Gothic",sans-serif';
  function mkTag(){
    const cv=document.createElement('canvas');cv.width=384;cv.height=96;
    const tx=new THREE.CanvasTexture(cv);tx.minFilter=THREE.LinearFilter;tx.generateMipmaps=false;
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tx,transparent:true,depthWrite:false,fog:false}));
    sp.scale.set(1.5,.375,1);sp.position.y=2.12;sp.renderOrder=5;
    return {sp,cv,tx,key:''};
  }
  function drawTag(tag,name,hp,paused){
    const key=name+'|'+Math.round(hp/5)+'|'+(paused?1:0);if(key===tag.key)return;tag.key=key;
    const x=tag.cv.getContext('2d'),w=tag.cv.width,h=tag.cv.height;
    x.clearRect(0,0,w,h);
    x.font=FONT;x.textBaseline='middle';x.textAlign='center';
    const txt=(paused?'⏸ ':'')+name,tw=Math.min(w-16,x.measureText(txt).width+26);
    x.fillStyle='rgba(20,20,34,.62)';
    const rx=(w-tw)/2;x.beginPath();x.roundRect?x.roundRect(rx,6,tw,50,14):x.rect(rx,6,tw,50);x.fill();
    x.fillStyle='#fff';x.save();x.beginPath();x.rect(8,0,w-16,h);x.clip();x.fillText(txt,w/2,32,w-30);x.restore();
    // thanh máu
    const bw=220,bx=(w-bw)/2,by=66;
    x.fillStyle='rgba(20,20,34,.7)';x.fillRect(bx-3,by-3,bw+6,22);
    const f=Math.max(0,Math.min(1,hp/100));
    x.fillStyle=f>.5?'#3dff7a':f>.25?'#ffd23f':'#ff4d5e';x.fillRect(bx,by,bw*f,16);
    tag.tx.needsUpdate=true;
  }

  function fallbackBody(){   // thiếu CharPick: dựng người que bằng voxel
    const g=new THREE.Group(),mk=(x,y,z,w,h,d,c)=>{const v=new VB();v.box(x,y,z,w,h,d,c,.056,true);return v.mesh()};
    g.add(mk(0,1.57,0,.45,.45,.45,0xffd9c7),mk(0,1.0,0,.45,.67,.22,0x7fbfff));
    const q=(x,y)=>{const o=new THREE.Group();o.position.set(x,y,0);g.add(o);return o};
    const aL=q(-.34,1.344),aR=q(.34,1.344),lL=q(-.11,.67),lR=q(.11,.67);
    for(const a of[aL,aR])a.add(mk(0,-.34,0,.22,.67,.22,0x7fbfff));
    for(const l of[lL,lR])l.add(mk(0,-.34,0,.22,.67,.22,0x3a3850));
    return {g,armL:aL,armR:aR,legL:lL,legR:lR};
  }

  // ---- tạo / huỷ ----
  function create(p){
    const g=new THREE.Group();g.rotation.order='YXZ';
    let m=null;try{if(window.CharPick&&CharPick.make)m=CharPick.make(p.ch)}catch(e){console.warn('[NET] CharPick',e)}
    if(!m)m=fallbackBody();
    g.add(m.g);
    const pivot=new THREE.Group();pivot.position.set(.14,1.344,0);m.g.add(pivot);   // gốc xoay súng ở độ cao vai: ngẩng / cúi theo tâm ngắm
    const guns={};
    for(const t in GUN){const gm=gunProto(t).clone();gm.position.set(0,-.1,.5);gm.visible=false;pivot.add(gm);guns[t]=gm}
    const body=new THREE.Mesh(GB,HM),head=new THREE.Mesh(GH,HM);
    body.position.y=.67;head.position.y=1.57;
    body.userData={rp:p,head:false};head.userData={rp:p,head:true};
    g.add(body,head);
    const tag=mkTag();g.add(tag.sp);
    root.add(g);
    const av={p,g,m,pivot,guns,body,head,tag,x:p.x||0,y:p.y||0,z:p.z||0,yw:p.yw||0,pt:0,sp:0,ph:0,rec:0,deadT:0,wasDead:false,cur:'',alive:true,snap:true,sw:0,sl:0};
    g.position.set(av.x,av.y,av.z);set.add(av);return av;
  }
  function remove(av){
    if(!av)return;set.delete(av);root.remove(av.g);
    av.g.traverse(o=>{if(o.geometry&&o.geometry!==GB&&o.geometry!==GH&&!Object.values(gp).some(q=>q.geometry===o.geometry))o.geometry.dispose();
      if(o.material&&o.material.map&&o.material.isSpriteMaterial){o.material.map.dispose();o.material.dispose()}});
  }
  function removeAll(){for(const a of Array.from(set))remove(a)}
  const attach=()=>{if(root.parent!==S)S.add(root)};

  // ---- cập nhật mỗi khung: nội suy vị trí, tư thế đi / bơi / trượt / ngã, súng, bảng tên ----
  const ang=a=>Math.atan2(Math.sin(a),Math.cos(a)),e3=t=>t*t*(3-2*t);
  function update(av,dt){
    const p=av.p,f=p.f|0,dead=(f&1)!==0,swim=(f&2)!==0,slide=(f&4)!==0,paused=(f&8)!==0;
    // vị trí: tới gần mục tiêu theo hàm mũ; lệch quá xa (hồi sinh / đổi tầng) thì nhảy thẳng tới
    const dx=p.x-av.x,dy=p.y-av.y,dz=p.z-av.z,k=1-Math.exp(-dt*16);
    if(av.snap||dx*dx+dy*dy+dz*dz>36){av.x=p.x;av.y=p.y;av.z=p.z;av.yw=p.yw;av.pt=p.pt;av.snap=false}
    else{av.x+=dx*k;av.y+=dy*k;av.z+=dz*k;av.yw+=ang(p.yw-av.yw)*k;av.pt+=(p.pt-av.pt)*k}
    const spd=dt>0?Math.hypot(dx,dz)*k/dt:0;av.sp+=(spd-av.sp)*Math.min(1,dt*8);
    const mv=Math.min(1,av.sp/6);av.ph+=dt*av.sp*1.35;
    // chết -> ngã ngửa ra sau rồi biến mất; hồi sinh -> đứng dậy
    if(dead){av.deadT+=dt;av.wasDead=true}
    else if(av.wasDead){av.wasDead=false;av.deadT=0;av.snap=true}
    const fall=dead?e3(Math.min(1,av.deadT/.55)):0;
    av.alive=!dead;
    av.g.visible=!(dead&&av.deadT>3.5);
    // thân
    av.sw+=((swim?1:0)-av.sw)*Math.min(1,dt*8);av.sl+=((slide?1:0)-av.sl)*Math.min(1,dt*14);
    av.g.position.set(av.x,av.y-(dead?.0:0)+Math.abs(Math.sin(av.ph))*.04*mv*(1-av.sw),av.z);
    av.g.rotation.set(-1.45*fall+1.15*av.sw*(1-fall),av.yw+PI,0);
    av.g.scale.y=1-.38*av.sl;
    // chân / tay
    const m=av.m,a=.9*mv*(1-av.sw),sw=Math.sin(av.ph),t=performance.now()/1000;
    m.legL.rotation.x=sw*a+(av.sw?Math.sin(t*9)*.5*av.sw:0);m.legR.rotation.x=-sw*a-(av.sw?Math.sin(t*9)*.5*av.sw:0);
    const rec=av.rec>0?(av.rec-=dt,av.rec/.12):0,hold=av.cur!=='grenade';
    const aim=-(1.35+av.pt*.9)-rec*.12;
    if(av.sw>.5){   // bơi sải: hai tay quạt luân phiên
      const s=Math.sin(t*5)*1.1;m.armL.rotation.set(-2.6+s,0,0);m.armR.rotation.set(-2.6-s,0,0);av.pivot.visible=false;
    }else{
      av.pivot.visible=!dead;
      m.armR.rotation.set(aim,0,-.08);m.armL.rotation.set(aim+.05,0,.45);
      if(!hold){m.armL.rotation.set(-.2,0,0)}
      av.pivot.rotation.x=-av.pt*.9-rec*.1;av.pivot.position.z=-rec*.08;
    }
    // súng đang cầm
    if(p.w!==av.cur){av.cur=p.w;for(const t in av.guns)av.guns[t].visible=t===av.cur}
    // bảng tên
    const dd=Math.hypot(av.x-P.x,av.z-P.z);
    av.tag.sp.visible=!dead&&dd<60;
    if(av.tag.sp.visible)drawTag(av.tag,p.name||'?',p.h==null?100:p.h,paused);
  }

  // ---- tia đạn của người khác ----
  const TR=[];
  function tracer(a,b){
    let t=TR.find(x=>!x.on);
    if(!t){if(TR.length>=24)return;
      const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:0xffe066}));
      l.frustumCulled=false;root.add(l);t={l,on:false,life:0};TR.push(t)}
    const ps=t.l.geometry.attributes.position;ps.setXYZ(0,a[0],a[1],a[2]);ps.setXYZ(1,b[0],b[1],b[2]);ps.needsUpdate=true;
    t.l.visible=true;t.on=true;t.life=.07;
  }
  function tick(dt){
    for(const t of TR)if(t.on){t.life-=dt;if(t.life<=0){t.on=false;t.l.visible=false}}
    for(const av of set)update(av,dt);
  }
  // tiếng súng 3D tại chỗ người bắn
  function shotSound(pos,w){
    if(Math.hypot(pos.x-P.x,pos.z-P.z)>70)return;
    const sn=w==='sniper',rf=w==='rifle';
    snd(sn?130:rf?220:270,sn?.3:.1,'sawtooth',.02*GV,pos);snd(sn?55:90,sn?.36:.14,'square',.025*GV,pos);
  }
  function shot(av,w,a,b){
    av.rec=.12;
    if(w==='grenade')return;
    // điểm bắt đầu tia = đầu nòng thật của súng đó (để không bị lệch so với báng súng)
    const mz=MUZ[w]||.3,pv=av.pivot;pv.updateWorldMatrix(true,false);
    const o=new THREE.Vector3(0,-.1,.5+mz).applyMatrix4(pv.matrixWorld);
    tracer([o.x,o.y,o.z],b);shotSound({x:o.x,y:o.y,z:o.z},w);
  }
  // các hộp va chạm của người còn sống (combat.js rayTargets thêm vào danh sách mesh có thể trúng đạn)
  function targets(out){for(const av of set)if(av.alive&&av.g.visible)out.push(av.body,av.head)}

  return {root,create,remove,removeAll,attach,tick,shot,tracer,targets,set};
})();
