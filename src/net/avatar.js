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
  // ---- chỗ đeo súng không cầm (giống góc thứ 3 của mình, player/thirdperson.js): toạ độ theo thân nhân vật, lưng ở -z ----
  const SLING={
    rifle:{p:[0,1.0,-.36],dir:[.55,.85,0],s:.85,mid:-.25},     // vắt chéo sau lưng: vai trái -> hông phải
    sniper:{p:[0,1.0,-.4],dir:[-.55,.85,0],s:.85,mid:-.3},     // chéo ngược lại, hai súng thành chữ X
    pistol:{p:[.275,.74,.02],dir:[0,-1,.05],s:1,mid:-.04},     // bao súng hông phải
    grenade:{p:[-.27,.8,.09],dir:[0,0,1],s:1,mid:0}            // móc ở hông trái
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
    // súng đeo trên người (hiện khi KHÔNG đang cầm loại đó) + bao súng ngắn + dây đeo chéo ngực
    const sling={};
    for(const t in SLING){
      const c=SLING[t],sg=gunProto(t).clone();sg.position.z=c.mid;
      const gr=new THREE.Group();gr.add(sg);gr.position.set(...c.p);gr.scale.setScalar(c.s);
      gr.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...c.dir).normalize());
      m.g.add(gr);sling[t]=gr;
    }
    {const v=new VB();v.box(.275,.7,.02,.085,.17,.115,0x1d1d22,.025,true);m.g.add(v.mesh());
      const st=new VB();st.box(0,0,0,.5,.045,.02,0x1d1d22,.02,true);const sm=st.mesh();sm.position.set(0,1.0,-.2);sm.rotation.z=.9;m.g.add(sm)}
    const body=new THREE.Mesh(GB,HM),head=new THREE.Mesh(GH,HM);
    body.position.y=.67;head.position.y=1.57;
    body.userData={rp:p,head:false};head.userData={rp:p,head:true};
    g.add(body,head);
    const tag=mkTag();g.add(tag.sp);
    root.add(g);
    const av={p,g,m,pivot,guns,sling,body,head,tag,x:p.x||0,y:p.y||0,z:p.z||0,yw:p.yw||0,pt:0,sp:0,ph:0,rec:0,deadT:0,wasDead:false,cur:'',alive:true,snap:true,sw:0,sl:0,rl:0,rlOn:false,thr:0,thrOn:false,pin:0,fwdV:0,swimming:false,swimBack:false,backK:0,stk:0,tb:Math.random()*6,slT:0,leanS:0};
    g.position.set(av.x,av.y,av.z);set.add(av);return av;
  }
  function remove(av){
    if(!av)return;set.delete(av);root.remove(av.g);
    av.g.traverse(o=>{if(o.geometry&&o.geometry!==GB&&o.geometry!==GH&&!Object.values(gp).some(q=>q.geometry===o.geometry))o.geometry.dispose();
      if(o.material&&o.material.map&&o.material.isSpriteMaterial){o.material.map.dispose();o.material.dispose()}});
  }
  function removeAll(){for(const a of Array.from(set))remove(a);clearGren()}
  const attach=()=>{if(root.parent!==S)S.add(root)};

  // ---- cập nhật mỗi khung: nội suy vị trí, tư thế đi / bơi / trượt / ngã, súng, bảng tên ----
  const ang=a=>Math.atan2(Math.sin(a),Math.cos(a)),e3=t=>t*t*(3-2*t),cl01=(u,a,b)=>Math.min(1,Math.max(0,(u-a)/(b-a)));
  // ---- bơi / lộn nhào: cùng công thức với góc thứ 3 của mình (player/thirdperson.js) để người khác thấy đúng tư thế ----
  const V3=(x,y,z)=>new THREE.Vector3(x,y,z),_hv=V3(0,0,0),_hw=V3(0,0,0),_Y=V3(0,1,0),_E=new THREE.Euler(),_se=new THREE.Euler(),_bp=V3(0,0,0),
        _sq=new THREE.Quaternion(),_sq2=new THREE.Quaternion(),_ra=V3(0,0,0),DOWN=V3(0,-1,0),
        SHR=V3(.336,1.344,0),REACH=.588,BGRIP=V3(.2,1.08,.34);
  const swimLean=(av,v)=>{const l=1.3+(v<0?Math.min(.45,-v/2.8*.45):-Math.min(.5,v/3.6*.5));return av.backK>.5?-l:l};   // tới: nằm sấp · lùi: nằm ngửa · lặn: chúi đầu · trồi: ngẩng
  function reachArm(arm,sh,target){_ra.copy(target).sub(sh);const len=_ra.length()||1e-3;_ra.divideScalar(len);arm.quaternion.setFromUnitVectors(DOWN,_ra);arm.scale.y=Math.max(.8,Math.min(1.35,len/REACH))}
  function update(av,dt){
    const p=av.p,f=p.f|0,dead=(f&1)!==0,swim=(f&2)!==0,slide=(f&4)!==0,paused=(f&8)!==0,reload=(f&16)!==0,pinned=(f&32)!==0,throwing=(f&64)!==0,under=(f&128)!==0;
    // vị trí: tới gần mục tiêu theo hàm mũ; lệch quá xa (hồi sinh / đổi tầng) thì nhảy thẳng tới
    const ox=av.x,oz=av.z,dx=p.x-av.x,dy=p.y-av.y,dz=p.z-av.z,k=1-Math.exp(-dt*16);
    if(av.snap||dx*dx+dy*dy+dz*dz>36){av.x=p.x;av.y=p.y;av.z=p.z;av.yw=p.yw;av.pt=p.pt;av.snap=false}
    else{av.x+=dx*k;av.y+=dy*k;av.z+=dz*k;av.yw+=ang(p.yw-av.yw)*k;av.pt+=(p.pt-av.pt)*k}
    const spd=dt>0?Math.hypot(dx,dz)*k/dt:0;av.sp+=(spd-av.sp)*Math.min(1,dt*8);
    const vf=dt>0?((av.x-ox)*-Math.sin(av.yw)+(av.z-oz)*-Math.cos(av.yw))/dt:0;av.fwdV+=((Math.abs(vf)>40?0:vf)-av.fwdV)*Math.min(1,dt*12);   // >0 đi tới, <0 đang lùi
    const mv=Math.min(1,av.sp/6);av.ph+=dt*av.sp*1.35;
    // chết -> ngã ngửa ra sau rồi biến mất; hồi sinh -> đứng dậy
    if(dead){av.deadT+=dt;av.wasDead=true}
    else if(av.wasDead){av.wasDead=false;av.deadT=0;av.snap=true}
    const fall=dead?e3(Math.min(1,av.deadT/.55)):0;
    av.alive=!dead;
    av.g.visible=!(dead&&av.deadT>3.5);
    // ---- trạng thái bơi / lộn ----
    const spw=swim&&!dead,rolling=slide&&!swim&&!dead,sa=p.sa||0,swv=p.sv||0;
    if(!spw)av.swimming=false;else if(!av.swimming){if(av.sp>.5||under)av.swimming=true}else if(av.sp<.2&&!under)av.swimming=false;   // đứng yên trên nước -> đứng thẳng đạp nước
    if(!spw)av.swimBack=false;else if(av.fwdV<-.5)av.swimBack=true;else if(av.fwdV>.5)av.swimBack=false;   // có độ trễ để không nhấp nháy khi đi ngang
    av.backK+=((av.swimBack?1:0)-av.backK)*Math.min(1,dt*6);
    av.sw+=((av.swimming?1:0)-av.sw)*Math.min(1,dt*6);
    if(av.sw>.02)av.stk+=dt*(4.2+Math.min(av.sp,6)*.6);
    av.tb+=dt;
    av.sl+=((rolling?1:0)-av.sl)*Math.min(1,dt*18);
    if(rolling)av.slT+=dt;else av.slT=0;
    const rru=rolling?Math.min(1,av.slT/.7):1,tuck=e3(cl01(rru,.08,.3))*(1-e3(cl01(rru,.85,1)));   // tiến độ cú lộn 0.7s · mức co người
    let lean=0;
    if(rolling)lean=2*PI*e3(cl01(rru,.08,.92))+.45*Math.sin(PI*cl01(rru,0,.2));   // chồm tới rồi quay trọn 360° về phía trước
    else if(spw)lean=av.swimming?swimLean(av,swv):0;
    if(!rolling&&av.leanS>4)av.leanS-=2*PI;   // lộn xong -> về góc 0 mà không quay ngược
    if(rolling)av.leanS=lean;else av.leanS+=(lean-av.leanS)*Math.min(1,dt*10);
    const hd0=av.yw+PI;let dh=sa-hd0;dh-=Math.round(dh/(2*PI))*2*PI;const hdg=hd0+dh*av.sl;   // lăn: thân quay theo HƯỚNG LĂN chứ không phải hướng nhìn
    const roll=av.sw*Math.sin(av.stk)*.2;
    // thân (giữ chỗ hông khi nghiêng để chân không trượt)
    if(dead){av.g.position.set(av.x,av.y,av.z);av.g.rotation.set(-1.45*fall,av.yw+PI,0)}
    else{
      _hv.set(0,.75,0);_hw.copy(_hv).applyEuler(_E.set(av.leanS,0,0));_hv.sub(_hw).applyAxisAngle(_Y,hdg);
      const bob=Math.abs(Math.sin(av.ph))*.04*mv*(1-av.sw)*(1-av.sl)+(spw?(av.swimming?Math.sin(av.stk*2)*.02*av.sw:Math.sin(av.tb*2.1)*.035):0);
      av.g.position.set(av.x+_hv.x,av.y+_hv.y+bob,av.z+_hv.z);
      av.g.rotation.set(av.leanS,hdg,roll);
    }
    av.g.scale.y=1;
    // chân
    const m=av.m,sw=Math.sin(av.ph),t=performance.now()/1000;
    m.legL.rotation.x=sw*.9*mv;m.legR.rotation.x=-sw*.9*mv;
    if(av.sl>.02){const w=Math.min(1,av.sl*1.6),tg=-1.55*tuck;m.legL.rotation.x+=(tg-m.legL.rotation.x)*w;m.legR.rotation.x+=(tg-m.legR.rotation.x)*w}   // lộn: gập chân lên ngực
    if(spw){const kk=av.swimming?Math.sin(av.stk*3)*.5:Math.sin(av.tb*5)*.55;m.legL.rotation.x=kk;m.legR.rotation.x=-kk}   // bơi: đập chân · đứng nước: đạp nước
    const rec=av.rec>0?(av.rec-=dt,av.rec/.12):0,hold=av.cur!=='grenade';
    // nạp đạn: u chạy 0->1 trong lúc cờ nạp đạn bật (thời gian nạp thật tuỳ súng, người nạp báo bật / tắt)
    if(reload&&!dead){if(!av.rlOn){av.rlOn=true;av.rl=0}av.rl=Math.min(1,av.rl+dt/(av.cur==='sniper'?2.2:av.cur==='rifle'?1.8:1.3))}else{av.rlOn=false;av.rl=0}
    const ru=av.rlOn?av.rl:0,rk=ru<.15?e3(ru/.15):ru>.85?e3((1-ru)/.15):1;   // 0 -> 1 vào tư thế nạp, giữ, rồi trả về
    // lựu đạn: giật chốt (người lùi, tay phải vươn ra sau) -> vung tay ném
    av.pin+=((pinned?1:0)-av.pin)*Math.min(1,dt*10);
    if(throwing&&!dead){if(!av.thrOn){av.thrOn=true;av.thr=0}av.thr=Math.min(1,av.thr+dt/.35)}else{av.thrOn=false;av.thr=0}
    const aim=-(1.35+av.pt*.9)-rec*.12,busy=av.sw>.5||av.sl>.5;
    // tay + súng cầm: tư thế thường (đứng / chạy / nạp / ném)
    av.pivot.visible=!dead;
    m.armL.scale.y=m.armR.scale.y=1;
    m.armR.rotation.set(aim,0,-.08);m.armL.rotation.set(aim+.05,0,.45);
    av.pivot.position.set(.14,1.344,-rec*.08);av.pivot.rotation.set(-av.pt*.9-rec*.1,0,0);
    if(!busy&&!hold){   // cầm lựu đạn: tay trái giật chốt, tay phải vươn ra sau rồi vung ra trước khi ném
      const wind=av.pin*(1-(av.thrOn?e3(Math.min(1,av.thr/.4)):0)),swing=av.thrOn?Math.sin(Math.min(1,av.thr)*PI):0;
      m.armL.rotation.set(-.9-.5*av.pin,0,.3);
      m.armR.rotation.set(-1.1+wind*2.3-swing*2.4,0,-.1);
      av.pivot.rotation.x=.2;av.g.rotation.x+=wind*.18-swing*.3;
    }else if(!busy&&ru>0){   // nạp: nghiêng súng, tay trái rút băng ở hông rồi nhét lại
      const dip=Math.sin(ru*PI*2*1.5);   // 1.5 nhịp: rút ra - nhét vào
      m.armL.rotation.set(aim+(.9+.35*dip)*rk,0,.45-.55*rk);
      av.pivot.rotation.x=-av.pt*.9+.5*rk;av.pivot.rotation.z=-.45*rk;
    }
    // BƠI: tay quạt nước, súng đeo ra sau lưng · bơi ngửa (lùi): tay trái quạt ngược ra sau đầu, tay phải giữ súng trên ngực
    let carry=false;
    if(av.sw>.02&&spw){
      const w=Math.min(1,av.sw*1.5);
      if(av.backK>.5){
        _sq.setFromEuler(_se.set(-av.stk,0,-.2));m.armL.quaternion.slerp(_sq,w);m.armL.scale.y+=(1-m.armL.scale.y)*w;
        _sq2.copy(m.armR.quaternion);reachArm(m.armR,SHR,BGRIP);m.armR.quaternion.slerp(_sq2,1-w);
        if(av.cur!=='grenade'&&av.sw>.5){carry=true;av.pivot.position.set(.2,1.58,.44);av.pivot.rotation.set(PI/2,0,0)}   // nòng song song thân, hướng về phía chân (= phía trước)
      }else{
        for(const[arm,o,z]of[[m.armR,0,.2],[m.armL,PI,-.2]]){_sq.setFromEuler(_se.set(av.stk+o,0,z));arm.quaternion.slerp(_sq,w);arm.scale.y+=(1-arm.scale.y)*w}
      }
    }
    if(av.sw>.5&&!carry)av.pivot.visible=false;
    // LỘN NHÀO (Shift): hai tay vươn ra trước lúc lao, ôm gối lúc lăn; súng đeo ra sau lưng
    if(av.sl>.02){
      const w=Math.min(1,av.sl*1.6),ax=-1.3-1.5*(1-tuck);
      _sq.setFromEuler(_se.set(ax,0,-.12));m.armL.quaternion.slerp(_sq,w);m.armL.scale.y+=(1-m.armL.scale.y)*w;
      _sq.setFromEuler(_se.set(ax,0,.12));m.armR.quaternion.slerp(_sq,w);m.armR.scale.y+=(1-m.armR.scale.y)*w;
      if(av.sl>.5)av.pivot.visible=false;
      // đặt thân sao cho điểm thấp nhất (đầu / lưng / chân) luôn vừa chạm đất -> lăn trên đất chứ không lộn giữa không trung
      av.g.updateMatrixWorld(true);
      const la=m.legL.rotation.x,fy=.75-.75*Math.cos(la),fz=-.75*Math.sin(la);let mn=1e9;
      for(const[x,y,z]of[[0,1.7,.1],[0,.75,-.25],[0,1.3,-.25],[.14,fy,fz],[-.14,fy,fz]]){_bp.set(x,y,z).applyMatrix4(av.g.matrixWorld);if(_bp.y<mn)mn=_bp.y}
      av.g.position.y+=(av.y+.04-mn)*w;
    }
    // súng đang cầm / súng đeo
    if(p.w!==av.cur){av.cur=p.w;for(const t in av.guns)av.guns[t].visible=t===av.cur}
    const stow=(av.sw>.5&&av.backK<=.5)||av.sl>.5;   // tay bận (bơi sải / lộn): súng đeo hết ra sau lưng
    for(const t in av.sling)av.sling[t].visible=(stow&&t!=='grenade'?true:t!==av.cur)&&!(dead&&av.deadT>3);
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
    tickGren(dt);
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
  // ---- lựu đạn của người khác: chỉ để NHÌN (bay theo vật lý game, nổ sau ~2 giây); sát thương nổ chưa đồng bộ ----
  const GRN=[];
  function grenade(pos,vel){
    if(typeof grenadeModel!=='function'||typeof move!=='function')return;
    const m=grenadeModel();S.add(m);
    GRN.push({x:pos[0],y:pos[1],z:pos[2],vx:vel[0],vy:vel[1],vz:vel[2],r:.12,h:.24,ground:false,t:2,m});
  }
  function tickGren(dt){
    for(let i=GRN.length-1;i>=0;i--){
      const g=GRN[i];g.t-=dt;g.vy-=22*dt;
      const pv=g.vy,ex=g.x+g.vx*dt,ez=g.z+g.vz*dt;
      move(g,g.vx*dt,g.vy*dt,g.vz*dt);
      if(Math.abs(g.x-ex)>.001)g.vx*=-.4;
      if(Math.abs(g.z-ez)>.001)g.vz*=-.4;
      if(g.ground){g.vy=pv<-2?-pv*.4:0;const f=Math.pow(.1,dt);g.vx*=f;g.vz*=f}
      g.m.position.set(g.x,g.y+.12,g.z);g.m.rotation.x+=dt*6;g.m.rotation.z+=dt*4;
      if(g.t<=0){S.remove(g.m);GRN.splice(i,1);boomFx(g)}
    }
    for(let i=BL.length-1;i>=0;i--){
      const b=BL[i];b.t-=dt;const u=1-b.t/.3;
      if(b.t<=0){S.remove(b.m);b.m.material.dispose();BL.splice(i,1);continue}
      b.m.scale.setScalar(.3+u*b.R*.8);b.m.material.opacity=.75*(1-u);
    }
  }
  const BL=[],BLG2=new THREE.SphereGeometry(1,10,8);
  function boomFx(g){   // giống explode() trong grenade.js nhưng chỉ phần hình + tiếng
    const c=new THREE.Vector3(g.x,g.y+.2,g.z);
    if(typeof boom==='function')boom(c);
    if(typeof quake==='function')quake(c);
    if(window.Nature&&Nature.explosionSplash)Nature.explosionSplash(g.x,g.y,g.z);
    const bl=new THREE.Mesh(BLG2,new THREE.MeshBasicMaterial({color:0xffb040,transparent:true,opacity:.75}));
    bl.position.copy(c);S.add(bl);BL.push({m:bl,t:.3,R:10});
    if(typeof fxPools==='function'&&typeof fxS!=='undefined'){fxPools();
      for(let i=0;i<72;i++){const sz=.08+Math.random()*.12;
        fxS.add(c.x,c.y,c.z,(Math.random()-.5)*24,Math.random()*16,(Math.random()-.5)*24,.6+Math.random()*.6,true,undefined,sz,sz,sz,i%2?0xff9a3c:0xffe066,null)}}
  }
  function clearGren(){for(const g of GRN)S.remove(g.m);GRN.length=0;for(const b of BL){S.remove(b.m);b.m.material.dispose()}BL.length=0}
  // đẩy người chơi (e = đối tượng có x,y,z,r) ra khỏi người chơi khác đang đứng cùng chỗ: trả về {x,z} cần dịch, hoặc null
  function pushOut(e,rad){
    let ox=0,oz=0;
    for(const av of set){
      if(!av.alive||!av.g.visible)continue;
      if(Math.abs(e.y-av.y)>=1.6)continue;
      const dx=e.x-av.x,dz=e.z-av.z,d=Math.hypot(dx,dz),need=rad+.35;
      if(d<need){const o=need-d+.01,ux=d>1e-3?dx/d:1,uz=d>1e-3?dz/d:0;ox+=ux*o;oz+=uz*o}
    }
    return ox||oz?{x:ox,z:oz}:null;
  }
  // các hộp va chạm của người còn sống (combat.js rayTargets thêm vào danh sách mesh có thể trúng đạn)
  function targets(out){for(const av of set)if(av.alive&&av.g.visible)out.push(av.body,av.head)}

  return {root,create,remove,removeAll,attach,tick,shot,tracer,targets,set,grenade,pushOut};
})();
