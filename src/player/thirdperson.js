// Góc nhìn thứ 3: bấm phím C (hoặc nút "C" trên điện thoại) để đổi qua lại góc thứ nhất <-> thứ 3.
// Camera lùi ra sau lưng + lệch vai phải một chút (kiểu bắn súng góc thứ 3), tự rút ngắn khi sau lưng có tường / vật cản (không xuyên tường).
// Thân nhân vật là mô hình đã chọn ở màn chọn nhân vật (ui/character.js: CharPick.make).
//   · Súng ĐANG CẦM nằm trong hai bàn tay: tay phải nắm báng, tay trái đỡ phần trước (tay tự vươn / co theo vị trí súng, gập lên xuống theo tâm ngắm).
//   · Súng KHÔNG cầm được đeo trên người: súng trường vắt chéo sau lưng, súng ngắm chéo ngược lại (thành chữ X), súng ngắn trong bao ở hông phải, lựu đạn ở hông trái.
//   · Lựu đạn: bấm 4 -> tay phải móc vào túi hông trái lấy lựu đạn rồi đưa lên ngực · giữ chuột -> tay trái giật chốt, rồi NGƯỜI NGẢ RA SAU, tay phải vươn ra sau (thả chuột mới ném)
//     · thả chuột -> tay vung từ sau ra trước, người chồm theo, lựu đạn rời tay đúng lúc game phóng nó đi (grenade.js: throwT / holding / holdT).
// Chạy: thân nhấp nhô theo nhịp bước (lên xuống 2 lần mỗi chu kỳ chân), hơi chúi tới, vai xoay ngược chiều chân, người nghiêng nhẹ sang bên chân trụ. Xuống nước (P.sw, xem world/nature/swim.js): đang di chuyển / lặn -> tư thế BƠI (người nằm sấp ngang mặt nước, hai tay quạt luân phiên kiểu bơi sải, chân đập, thân xoay theo nhịp tay, lặn thì chúi đầu xuống, trồi lên thì ngẩng đầu, nổi bọt khi chìm đầu, súng đeo ra sau lưng); đứng yên trên nước -> đứng thẳng đạp nước, nhấp nhô theo sóng.
// Đổi súng (phím 1-3 / nút ⇄): tay phải vươn RA SAU lưng (hoặc xuống bao ở hông) nắm súng ở dây đeo, kéo súng vòng qua vai ra phía trước theo tay; súng cũ được cất về dây đeo trước. Nạp đạn (R): nghiêng súng, tay trái rút băng cũ (rơi xuống đất), móc băng mới ở túi đạn bên hông trái, nhét vào, kéo khóa nòng / thanh trượt rồi trả tay về ốp tay. Chỉnh thời gian ở SWT.
// Lấy / ăn / uống trái cây ở bàn chòi (gameplay/fruit-eat.js): thân nhân vật tự diễn — tay phải VƯƠN ra chụp quả (người chồm tới), rút về cầm; rượu: bàn tay trái đưa chai lên rót vào ly, mực rượu dâng; ĂN: đưa lên miệng, mỗi miếng cắn đầu chúi tới + vụn bắn ra, trái nhỏ dần; UỐNG: ngả người ra sau, nghiêng ly. Súng tạm cất lên dây đeo.
// Tự quay về góc thứ nhất khi: ngắm sniper (cần nhìn qua kính) · bị hạ (đã có hoạt ảnh ngã riêng) · sau lưng sát tường nên camera không còn chỗ lùi (tránh camera nằm trong đầu nhân vật).
// Đạn vẫn bắn theo tia từ camera qua tâm ngắm (đúng chỗ tâm ngắm chỉ), như game góc thứ 3 thông thường.
// Chỉnh nhanh: CFG (camera) và GUN / SLING (hình súng, chỗ đeo) bên dưới. Nạp SAU viewmodel.js và effects.js (groundY), TRƯỚC main.js (main.js gọi TP.apply mỗi khung).
const TP=(function(){
  const CFG={dist:3.2,    // m: camera cách đầu nhân vật (xa nhất)
             side:1.2,    // m: lệch sang vai phải (0 = ngay sau lưng) -> nhân vật nằm lệch sang TRÁI màn hình, không che tâm ngắm
             up:.35,      // m: nâng camera lên cao hơn đầu một chút
             head:1.55,   // m: độ cao đầu so với chân (điểm camera quay quanh)
             pad:.18,     // m: bán kính "quả cầu" camera khi dò va chạm
             ease:6,      // tốc độ camera dang ra lại sau khi bị vật cản ép gần
             bodyPad:.3,  // m: cộng thêm vào bán kính va chạm với bot khi thân nhân vật hiện ra
             fpIn:1.0,    // m: chỗ lùi còn ít hơn mức này (sát tường) -> về góc nhìn thứ nhất
             fpOut:1.5};  // m: có lại chỗ lùi hơn mức này -> trở lại góc thứ 3 (chênh với fpIn để không chớp qua lại)
  const TXT={vi:['Góc nhìn thứ nhất','Góc nhìn thứ 3'],en:['First person','Third person'],ru:['Вид от первого лица','Вид от третьего лица'],ng:['First person','Third person'],
    bn:['প্রথম ব্যক্তির দৃষ্টিকোণ','তৃতীয় ব্যক্তির দৃষ্টিকোণ'],id:['Orang pertama','Orang ketiga'],hi:['प्रथम-पुरुष दृश्य','तृतीय-पुरुष दृश्य'],zh:['第一人称','第三人称'],
    fil:['Unang tao','Ikatlong tao'],uk:['Від першої особи','Від третьої особи'],ko:['1인칭','3인칭']};
  // ---- hình súng: hộp [tâmX,tâmY,tâmZ, rộng,cao,dài, màu, cỡ khối]; GỐC (0,0,0) = chỗ tay phải nắm báng, nòng chĩa về +z ----
  const DK=0x3a3850,DK2=0x2b2a3a,GR=0x55536e;
  const GUN={
    pistol:{fg:[0,-.07,.02],parts:[[0,.045,.12,.05,.07,.26,DK,.02],[0,.04,.27,.03,.04,.04,0xff9a3c,.02],[0,-.05,-.01,.05,.13,.07,DK2,.02],[0,-.12,-.01,.055,.02,.075,0x4d9dff,.02]]},
    rifle:{fg:[0,-.04,.3],parts:[[0,.03,.22,.07,.1,.5,DK,.025],[0,.045,.66,.03,.03,.36,DK2,.015],[0,.0,.46,.06,.07,.3,GR,.025],[0,-.06,-.01,.05,.12,.06,DK2,.02],[0,-.1,.2,.05,.16,.07,0xf2b84b,.02],[0,.0,-.2,.06,.1,.3,DK2,.025],[0,.1,.2,.02,.03,.1,DK2,.015]]},
    sniper:{fg:[0,-.04,.4],parts:[[0,.03,.3,.065,.09,.75,DK,.025],[0,.035,.9,.025,.025,.4,DK2,.015],[0,.115,.25,.05,.05,.3,0x4d9dff,.02],[0,.115,.42,.065,.065,.04,0x7fbfff,.02],[0,-.01,-.22,.065,.1,.36,DK2,.025],[0,-.06,-.01,.05,.12,.06,DK2,.02],[0,-.08,.18,.04,.1,.06,DK,.02]]},
    grenade:{fg:null,parts:[[0,0,0,.08,.1,.08,0x4a7a3a,.02],[0,.065,0,.03,.03,.03,0xc9c9c9,.015],[.03,.07,0,.05,.012,.012,0xc9c9c9,.01]]}
  };
  // ---- chỗ đeo (toạ độ theo thân nhân vật, đơn vị m; chân ở y=0, lưng ở -z) ----
  const SLING={
    rifle:{p:[0,1.0,-.36],dir:[.55,.85,0],s:.85,mid:-.25},     // vắt chéo sau lưng: vai trái -> hông phải
    sniper:{p:[0,1.0,-.4],dir:[-.55,.85,0],s:.85,mid:-.3},     // chéo ngược lại, hai súng thành chữ X
    pistol:{p:[.275,.74,.02],dir:[0,-1,.05],s:1,mid:-.04},     // bao súng hông phải, báng chúc lên
    grenade:{p:[-.27,.8,.09],dir:[0,0,1],s:1,mid:0}            // móc ở hông trái
  };
  let on=false,model=null,key='',held=null,slung=null,holster=null,shown=false,ph=0,dist=CFG.dist,sq=1,lx=0,lz=0,lastSpd=0,near=false;
  // ---- lựu đạn: các mốc của bàn tay phải / trái (toạ độ thân nhân vật, m) ----
  const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
  const GP={rest:V3(.3,.85,.08),lrest:V3(-.3,.9,.12),hip:V3(-.18,.84,.22),chest:V3(.2,1.12,.42),back:V3(.33,1.52,-.5),fwd:V3(.26,1.38,.62),low:V3(.12,.88,.55),
            pin:V3(.13,1.2,.43),pull:V3(-.14,1.14,.28),lwind:V3(-.22,1.28,.52)};
  const DRAW=.6;   // giây: móc túi lấy lựu đạn
  const e3=x=>x*x*(3-2*x),cl=(u,a,b)=>Math.min(1,Math.max(0,(u-a)/(b-a))),mix=(o,a,b,t)=>o.copy(a).lerp(b,t);
  let prevCur='',prevThrow=0,drawT=9,leanS=0;
  const rp=V3(.3,.85,.08),lp=V3(-.3,.9,.12),_rt=V3(0,0,0),_lt=V3(0,0,0),_hv=V3(0,0,0),_hw=V3(0,0,0),_Y=V3(0,1,0),_E=new THREE.Euler();
  // băng đạn: idx = phần tử trong GUN[t].parts được tách ra thành mesh riêng (chỉ ở súng CẦM, để rút / nhét được) · c = tâm băng (toạ độ súng) · boxes = các khối tạo băng
  const MAGD={
    pistol:{idx:3,c:[0,-.075,-.01],boxes:[[0,.005,0,.04,.09,.055,0x2b2a3a],[0,-.045,0,.055,.02,.075,0x4d9dff]],drop:0x4d9dff},
    rifle:{idx:4,c:[0,-.1,.2],boxes:[[0,0,0,.05,.16,.07,0xf2b84b]],drop:0xf2b84b},
    sniper:{idx:6,c:[0,-.08,.18],boxes:[[0,0,0,.04,.1,.06,0x3a3850]],drop:0xf2b84b}
  };
  const gunMesh=(t,nomag)=>{const v=new VB();GUN[t].parts.forEach((p,i)=>{if(nomag&&MAGD[t]&&MAGD[t].idx===i)return;v.box(p[0],p[1],p[2],p[3],p[4],p[5],p[6],p[7],true)});return v.mesh()};
  const magMesh=t=>{const d=MAGD[t],v=new VB();for(const b of d.boxes)v.box(b[0],b[1],b[2],b[3],b[4],b[5],b[6],.02,true);const m=v.mesh();m.position.set(...d.c);return m};
  function ensure(){
    const k=(window.PROFILE&&PROFILE.char)||(window.CharPick&&CharPick.current())||'vn';
    if(model&&key===k)return true;
    if(!window.CharPick||!CharPick.make)return false;
    if(model){S.remove(model.g);model.g.traverse(o=>{if(o.geometry)o.geometry.dispose()});model=null}
    model=CharPick.make(k);key=k;
    // súng cầm trong tay: 1 nhóm, mỗi loại 1 mesh (chỉ hiện loại đang cầm)
    held=new THREE.Group();model.g.add(held);held.m={};held.mg={};
    for(const t in GUN){const m=gunMesh(t,!!MAGD[t]);m.visible=false;held.add(m);held.m[t]=m;
      if(MAGD[t]){const mg=magMesh(t);mg.visible=false;held.add(mg);held.mg[t]=mg}}   // súng cầm: thân + băng đạn tách riêng
    // súng đeo trên người: mỗi loại 1 nhóm đặt đúng chỗ, hiện khi KHÔNG đang cầm loại đó
    slung={};
    for(const t in SLING){
      const c=SLING[t],g=new THREE.Group(),m=gunMesh(t);m.position.z=c.mid;g.add(m);
      g.position.set(...c.p);g.scale.setScalar(c.s);
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...c.dir).normalize());
      model.g.add(g);slung[t]=g;
      SQ[t]=g.quaternion.clone();SGR[t]=V3(0,0,c.mid*c.s).applyQuaternion(g.quaternion).add(g.position);   // chỗ nắm báng súng khi còn trên dây đeo / bao + hướng nằm của nó
    }
    // bao súng ngắn (luôn hiện, rỗng khi đang cầm súng ngắn) + dây đeo súng chéo ngực
    {const v=new VB();v.box(.275,.7,.02,.085,.17,.115,0x1d1d22,.025,true);model.g.add(v.mesh());
      const s=new VB();s.box(0,0,0,.5,.045,.02,0x1d1d22,.02,true);const sm=s.mesh();sm.position.set(0,1.0,-.2);sm.rotation.z=.9;model.g.add(sm);}   // tâm hộp ở gốc rồi mới đặt vị trí: xoay quanh chính giữa dây (bản cũ xoay quanh chân nên dây văng ra sàn thành 'cái que')
    model.g.rotation.order='YXZ';   // xoay hướng (yaw) trước, nghiêng người (lean) sau
    model.g.visible=false;S.add(model.g);return true;
  }
  const msg=()=>{if(typeof showMsg==='function')showMsg((TXT[L]||TXT.en)[on?1:0]+' · C')};
  function toggle(){on=!on;msg()}
  // góc thứ 3 đang thực sự hiển thị? (đã bật, còn sống, không đang ngắm sniper)
  const active=()=>on&&!dead&&!(scoped&&cur==='sniper');
  const _f=new THREE.Vector3(),_r=new THREE.Vector3(),_h=new THREE.Vector3(),_t=new THREE.Vector3(),_a=new THREE.Vector3(),_b=new THREE.Vector3(),
        DOWN=new THREE.Vector3(0,-1,0),AX=new THREE.Vector3(1,0,0),_q=new THREE.Quaternion(),_e=new THREE.Euler();
  const SH={r:new THREE.Vector3(.336,1.344,0),l:new THREE.Vector3(-.336,1.344,0)},REACH=.588;   // vai (tâm xoay tay) · khoảng từ vai tới giữa bàn tay (tay dài 12 điểm ảnh)
  // đưa bàn tay (giữa 3 điểm ảnh dưới cùng của tay) tới đúng điểm target (toạ độ thân): xoay tay hướng về target, kéo dài / co nhẹ cho vừa
  function reach(arm,sh,target){
    _a.copy(target).sub(sh);const len=_a.length()||1e-3;_a.divideScalar(len);
    arm.quaternion.setFromUnitVectors(DOWN,_a);arm.scale.y=Math.max(.8,Math.min(1.35,len/REACH));
  }
  const relax=(arm,x,z)=>{arm.quaternion.setFromEuler(_e.set(x,0,z));arm.scale.y=1};

  // ---------- LẤY / ĂN / UỐNG trái cây (FruitEat.tp() từ gameplay/fruit-eat.js; toạ độ thân nhân vật: +x = phía tay phải của mô hình, +z = phía trước) ----------
  const FKIT=window.FruitKit;
  const HF=V3(.2,1.05,.42),HW=V3(.2,1.08,.44),FMU=V3(.02,1.38,.29),WMU=V3(.02,1.28,.36),MOUTH=V3(0,1.4,.27);   // tay cầm trái · tay cầm ly · tay khi ăn · tay khi uống · miệng
  const FRC={apple:0xd32f2f,orange:0xff9a1a,watermelon:0xe53b4a,grape:0x6a2c91,pineapple:0xe9b824,dragon:0xe0237c,sandwich:0xd9a35a};   // màu vụn bắn ra khi cắn
  const fp={type:null,root:null,grp:null,mesh:null,bt:null,sm:null,kk:1},FR=V3(0,0,0),FL=V3(0,0,0),FT=V3(0,0,0),FD=V3(0,0,0);
  let lastBn=0;const crumbs=[],CGEO=new THREE.BoxGeometry(.03,.03,.03),CMAT={};
  const reachK=u=>u<.5?e3(u/.5):u<.62?1:1-e3((u-.62)/.38);   // 0 -> 1 vươn ra · giữ lúc chụp · 1 -> 0 rút về (giống tay góc thứ nhất)
  function fruitProps(type){   // dựng trái / ly + chai + tia rượu gắn vào thân nhân vật (dựng lại khi đổi loại hoặc đổi nhân vật)
    if(fp.type===type&&fp.root&&fp.root.parent===model.g)return;
    if(fp.root){if(fp.root.parent)fp.root.parent.remove(fp.root);fp.root.traverse(o=>{if(o.geometry)o.geometry.dispose()})}
    const wn=type==='wine',kk=wn?1:1.15,root=new THREE.Group(),grp=new THREE.Group(),mesh=FKIT.make(type,kk,0,0,wn);
    mesh.position.y=wn?-.1:-.075*kk;grp.add(mesh);root.add(grp);   // bàn tay giữ chân ly / ôm quả ở giữa
    let bt=null,sm=null;
    if(wn){mesh.userData.setLevel(0);bt=FKIT.bottle(.55);bt.visible=false;root.add(bt);
      sm=new THREE.Mesh(new THREE.BoxGeometry(.012,1,.012),new THREE.MeshBasicMaterial({color:0x8a1236}));sm.visible=false;root.add(sm)}
    root.traverse(o=>o.frustumCulled=false);model.g.add(root);
    Object.assign(fp,{type,root,grp,mesh,bt,sm,kk});
  }
  // độ nghiêng thân (lean>0 chồm tới, <0 ngả ra sau): chồm khi vươn tay · chúi theo mỗi miếng cắn · ngả ra sau khi nốc rượu
  function frLean(f){const v=f.v;
    if(f.phase==='reach')return .3*reachK(v.u);
    if(f.phase==='pour')return .1*v.pa;
    if(f.eating)return f.type==='wine'?.04*v.lift-.2*v.sip*v.lift:.05*v.lift+.1*v.chew;
    return 0}
  function spawnCrumbs(type){   // vụn bắn ra từ miệng mỗi miếng cắn (rượu thì không)
    if(type==='wine')return;
    model.g.updateMatrixWorld(true);const o=model.g.localToWorld(MOUTH.clone()),col=FRC[type]||0xd32f2f,mat=CMAT[col]||(CMAT[col]=new THREE.MeshBasicMaterial({color:col}));
    for(let i=0;i<7;i++){const m=new THREE.Mesh(CGEO,mat);m.position.copy(o);m.scale.setScalar(.5+Math.random()*.8);S.add(m);
      crumbs.push({m,vx:(Math.random()-.5)*1.4,vy:.8+Math.random()*1.2,vz:(Math.random()-.5)*1.4,t:.55+Math.random()*.3})}
  }
  function tickCrumbs(dt){for(let i=crumbs.length-1;i>=0;i--){const c=crumbs[i];c.t-=dt;if(c.t<=0){S.remove(c.m);crumbs.splice(i,1);continue}
    c.vy-=9*dt;c.m.position.x+=c.vx*dt;c.m.position.y+=c.vy*dt;c.m.position.z+=c.vz*dt;c.m.rotation.x+=dt*8}}
  // đặt tay + trái / ly + chai theo từng giai đoạn (gọi SAU khi thân nhân vật đã đặt vị trí / xoay)
  function frPose(f,dt,sw){
    const v=f.v,wn=f.type==='wine',hold=wn?HW:HF;
    fruitProps(f.type);model.g.updateMatrixWorld(true);
    if(f.bn!==lastBn){if(f.bn>lastBn)spawnCrumbs(f.type);lastBn=f.bn}
    let tilt=0,wob=0,useL=false;
    FR.copy(hold);
    if(f.phase==='reach'){   // tay phải vươn tới đúng quả trên bàn (tối đa ~0.78m, người chồm thêm), siết lại lúc chụp rồi rút về cầm
      const u=v.u;FT.copy(f.tgt);model.g.worldToLocal(FT);FT.y-=.03;
      FD.copy(FT).sub(SH.r);const len=FD.length();if(len>.78)FT.copy(SH.r).addScaledVector(FD,.78/len);
      if(u<.5)mix(FR,GP.rest,FT,e3(u/.5));else if(u<.62)FR.copy(FT);else mix(FR,FT,hold,e3((u-.62)/.38));
      FR.y-=.03*Math.max(0,1-Math.abs((u-.56)/.06));   // chụp: bàn tay nhún xuống một chút
      relax(model.armL,-.3*reachK(u)+sw*.8,.08);        // tay kia vung ra sau giữ thăng bằng
    }else if(f.phase==='pour'){   // tay trái nhấc chai từ hông lên, nghiêng miệng chai trên miệng ly, rượu chảy thành tia, mực rượu dâng
      const a=v.pa,r=1-a,th=-a*1.83,K=fp.kk,W=FKIT.WG,mouthY=FR.y-.1+(W.top*K)+.05;
      FT.set(FR.x,mouthY,FR.z);
      fp.bt.visible=a>.02;fp.bt.position.set(FT.x-.5*r,FT.y-.55*r,FT.z-.1*r);fp.bt.rotation.z=th;
      mix(FL,GP.lrest,_a.set(fp.bt.position.x+Math.sin(th)*.3,fp.bt.position.y-Math.cos(th)*.3,fp.bt.position.z),Math.min(1,a*5));useL=true;   // bàn tay trái nắm thân chai
      const topY=FR.y-.1+(W.base+W.h*v.pw)*K,len=Math.max(.01,mouthY-topY);
      fp.sm.visible=v.pon;fp.sm.scale.y=len;fp.sm.position.set(FR.x,mouthY-len/2,FR.z);
      relax(model.armL,0,0);if(!useL)relax(model.armL,sw*.8,.05);
    }else{
      relax(model.armL,sw*.8,.05);
      if(f.eating){   // đưa lên miệng; mỗi miếng cắn: tay chúi tới + trái rung (+ đầu chúi qua lean, vụn bắn ra); rượu: nghiêng ly, ngả người
        FR.lerpVectors(hold,wn?WMU:FMU,v.lift);FR.z+=.035*v.chew;FR.y-=.02*v.chew;
        if(wn)tilt=-(.3+.85*v.sip)*v.lift;else wob=.12*v.chew;
      }
    }
    if(wn){fp.bt&&(fp.bt.visible=f.phase==='pour'&&fp.bt.visible);fp.sm&&(fp.sm.visible=f.phase==='pour'&&fp.sm.visible);fp.mesh.userData.setLevel(f.lv)}
    fp.root.visible=true;fp.grp.visible=f.taken;fp.grp.position.copy(FR);fp.grp.rotation.set(tilt,0,wob);fp.grp.scale.setScalar(f.fs);
    reach(model.armR,SH.r,FR);
    if(useL)reach(model.armL,SH.l,FL);
  }

  // ---------- ĐỔI SÚNG + NẠP ĐẠN ----------
  const SWT={stow:.2,reach:.1,draw:.3};   // giây: cất súng cũ về dây đeo · tay đưa sang chỗ súng mới · rút súng mới ra trước ngực (không có súng cũ thì bỏ bước đầu)
  const SGR={},SQ={};                       // chỗ nắm báng + hướng của từng khẩu khi đang đeo (ensure() điền)
  const RP=V3(0,0,0),READYQ=new THREE.Quaternion(),CB=V3(.38,1.5,-.3),CPS=V3(.34,1.0,.3),POUCHM=V3(-.3,.86,.14),HO=V3(-.04,-.02,0);   // sẵn sàng bắn · điểm tay vòng qua vai (súng sau lưng) · (súng ngắn ở hông) · túi băng đạn hông trái · tay nắm băng lệch khỏi tâm băng
  const SGP={pistol:[-.06,.05,.1],rifle:[-.05,.07,.12],sniper:[-.05,.06,.15]},SLD={pistol:.07,rifle:.08,sniper:.1};   // chỗ tay trái kéo thanh trượt / khóa nòng (toạ độ súng) · quãng kéo
  const K=[0,1,2,3,4,5,6,7,8,9].map(()=>V3(0,0,0));
  const RMi=new THREE.Matrix4();
  let swOld=null,swNew=null,swT=0,swOn=false,swS1=0,swLen=0,swPrev=null,handPrev=null,swPh=0,swU=0;   // handPrev: khẩu súng thật sự nằm trong tay ở khung trước (null = tay không / đang cầm trái cây, lựu đạn)
  function trackSwap(dt,fr,gr){
    if(swPrev===null)swPrev=cur;
    if(cur!==swPrev){swPrev=cur;
      if(cur!=='grenade'&&!fr){swOld=handPrev;swNew=cur;swT=0;swOn=true;swS1=swOld?SWT.stow:0;swLen=swS1+SWT.reach+SWT.draw}else swOn=false}
    if(fr||gr)swOn=false;
    if(swOn){swT+=dt;
      if(swT>=swLen)swOn=false;
      else if(swT<swS1){swPh=0;swU=swT/swS1}else if(swT<swS1+SWT.reach){swPh=1;swU=(swT-swS1)/SWT.reach}else{swPh=2;swU=(swT-swS1-SWT.reach)/SWT.draw}}
  }
  const swBlock=()=>shown&&swOn&&swT<swS1+SWT.reach+SWT.draw*.55;   // súng chưa lên tay thì chưa bắn / nạp được
  function gunLean(){   // ngả người ra sau khi vươn tay lấy súng · hơi gù xuống khi nạp đạn
    if(swOn)return -.14*(swPh===0?e3(swU):swPh===1?1:1-e3(swU));
    if(rel>0&&cur!=='grenade'){const u=Math.min(1,1-rel/W[cur].rl);return .07*e3(cl(u,0,.12))*(1-e3(cl(u,.74,.86)))}
    return 0}
  // đặt khẩu súng `type` ở vị trí w (0 = trên dây đeo / bao, 1 = sẵn sàng bắn): quỹ đạo cong vòng qua vai, súng xoay dần từ hướng đeo sang hướng bắn
  function swingGun(type,w){
    const G=SGR[type],c=type==='pistol'?CPS:CB,a=(1-w)*(1-w),b=2*(1-w)*w,d=w*w,sc=SLING[type].s;
    held.position.set(G.x*a+c.x*b+RP.x*d,G.y*a+c.y*b+RP.y*d,G.z*a+c.z*b+RP.z*d);
    held.quaternion.copy(SQ[type]).slerp(READYQ,w);held.scale.setScalar(sc+(1-sc)*w);
  }
  function gunPose(g,pt,dt,sw){
    RP.set(.07,-.1,.58).applyAxisAngle(AX,-pt);RP.y+=1.344;READYQ.setFromEuler(_E.set(-pt,0,0));
    let handType=cur,magOn=true;const L=K[5];
    if(swOn){
      let kL=0;
      if(swPh===0){handType=swOld;swingGun(swOld,1-e3(swU));kL=1-e3(cl(swU,0,.45))}          // cất súng cũ: tay đưa súng về chỗ đeo
      else if(swPh===1){handType=null;held.position.lerpVectors(swOld?SGR[swOld]:GP.rest,SGR[swNew],e3(swU))}   // tay (không) vươn ra sau tới chỗ súng mới
      else{handType=swNew;swingGun(swNew,e3(swU));kL=e3(cl(swU,.5,1))}                        // nắm báng, kéo súng từ sau lưng ra trước theo tay
      held.updateMatrix();L.copy(GP.lrest);
      if(handType&&kL>0){const gg=GUN[handType];L.lerp(K[0].set(gg.fg[0],gg.fg[1],gg.fg[2]).applyMatrix4(held.matrix),kL)}
      if(handType&&held.mg[handType])held.mg[handType].position.set(...MAGD[handType].c);
    }else{
      let tl=0,u=-1;
      if(rel>0&&cur!=='grenade'){u=Math.min(1,1-rel/W[cur].rl);tl=e3(cl(u,0,.12))*(1-e3(cl(u,.74,.86)))}
      held.position.copy(RP);held.position.x-=.06*tl;held.position.y-=.08*tl;
      held.rotation.set(-pt-.3*tl,0,-.5*tl);held.updateMatrix();   // nghiêng súng cho tay trái với tới băng đạn
      const fgL=K[0].set(g.fg[0],g.fg[1],g.fg[2]),mg=held.mg[cur],md=MAGD[cur];
      if(u<0||!mg){L.copy(fgL).applyMatrix4(held.matrix);if(mg)mg.position.set(...md.c)}
      else{   // nạp đạn (mốc giống hoạt ảnh góc thứ nhất): tay nắm băng · rút băng cũ rồi vứt · móc băng mới ở túi hông trái · đưa lên nhét vào · kéo khóa nòng · về ốp tay
        const mb=K[1].set(...md.c),dn=K[2].copy(mb),mp=K[3],hv=K[4],po=K[6].copy(POUCHM),t1=K[7],sg=K[8].set(...SGP[cur]),sl=SLD[cur];
        dn.y-=.24;RMi.copy(held.matrix).invert();po.applyMatrix4(RMi);
        if(u<.12){mp.copy(mb);hv.lerpVectors(fgL,t1.copy(mb).add(HO),e3(u/.12))}
        else if(u<.30){mp.lerpVectors(mb,dn,e3(cl(u,.12,.30)));hv.copy(mp).add(HO)}
        else if(u<.44){hv.lerpVectors(t1.copy(dn).add(HO),po,e3(cl(u,.30,.44)));mp.copy(po)}
        else if(u<.48){hv.copy(po);mp.copy(po)}
        else if(u<.60){mp.lerpVectors(po,dn,e3(cl(u,.48,.60)));hv.copy(mp).add(HO)}
        else if(u<.72){mp.lerpVectors(dn,mb,e3(cl(u,.60,.72)));hv.copy(mp).add(HO)}
        else if(u<.82){mp.copy(mb);hv.lerpVectors(t1.copy(mb).add(HO),sg,e3(cl(u,.72,.82)))}
        else if(u<.95){mp.copy(mb);hv.copy(sg);hv.z-=sl*e3(cl(u,.82,.9))*(1-e3(cl(u,.92,.95)))}
        else{mp.copy(mb);hv.lerpVectors(sg,fgL,e3(cl(u,.95,1)))}
        mg.position.copy(mp);magOn=u<.30||u>=.44;   // băng cũ đã vứt (.30) -> tay rỗng đi lấy; có băng mới từ .44
        L.copy(hv).applyMatrix4(held.matrix);
      }
    }
    for(const t in held.m)held.m[t].visible=t===handType;
    for(const t in held.mg)held.mg[t].visible=t===handType&&magOn;
    for(const t in slung)if(t!=='grenade')slung[t].visible=t!==handType;   // súng đang cầm thì không còn đeo trên người
    handPrev=handType;
    reach(model.armR,SH.r,held.position);reach(model.armL,SH.l,L);
  }
  function tpDrop(){   // băng đạn cũ rơi xuống đất ngay chỗ bàn tay (thay cho bản góc thứ nhất rơi ở chỗ camera)
    const md=MAGD[cur];if(!md||typeof spawnPart!=='function'||typeof UG==='undefined'||typeof M!=='function')return;
    const mg=held&&held.mg[cur],p=new THREE.Vector3();(mg&&mg.visible?mg:held).getWorldPosition(p);
    const m=new THREE.Mesh(UG,M(md.drop));m.scale.set(.09,.15,.1);m.position.copy(p);spawnPart(m,Math.random()*.6-.3,-.5,Math.random()*.6-.3,1.6,true)}
  if(typeof dropMag==='function'){const o=dropMag;window.dropMag=function(){if(shown&&model){tpDrop();return}return o.apply(this,arguments)}}
  const SWMSG={vi:'Đang bơi - không thể bắn · dừng lại để bắn',en:'Swimming - cannot shoot · stop moving to shoot'};let swMsgT=0;
  const swimBlock=()=>{if(!swimming)return false;const n=performance.now();if(n-swMsgT>1500){swMsgT=n;if(typeof showMsg==='function')showMsg(SWMSG[L]||SWMSG.en)}return true};   // bơi (đang di chuyển / chìm đầu) -> không bắn · đứng yên trên nước vẫn bắn bình thường
  if(typeof shoot==='function'){const o=shoot;window.shoot=function(){if(swBlock()||swimBlock()||slideT>0)return;   // đang lộn nhào: hai tay bận -> không bắn
    return o.apply(this,arguments)}}
  if(typeof startHold==='function'){const o=startHold;window.startHold=function(){if(swimming)return;return o.apply(this,arguments)}}   // lựu đạn cũng không giật chốt khi đang bơi
  if(typeof reload==='function'){const o=reload;window.reload=function(){if(shown&&swOn||swimming)return;return o.apply(this,arguments)}}

  // ---------- CHẠY NHẤP NHÔ + BƠI ----------
  let swimK=0,swimming=false,stk=0,bobK=0,tBob=0,bubT=0,fwdV=0,swimBack=false,backK=0,slK=0,dustT=0;   // slK: 0..1 mức chuyển sang tư thế XOẠC (Shift) · dustT: nhịp bụi bắn ra khi trượt
     // fwdV: vận tốc dọc theo hướng nhìn (âm = đang lùi) · swimBack: đang bơi ngửa (lùi) · backK: 0..1 mức chuyển sang bơi ngửa   // swimK: 0..1 mức chuyển sang tư thế bơi · stk: pha nhịp tay bơi · bobK: 0..1 mức nhấp nhô khi chạy trên cạn (tắt khi trượt / trên không / dưới nước)
  const _sq=new THREE.Quaternion(),_sq2=new THREE.Quaternion(),BGRIP=V3(.2,1.08,.34),BGQ=new THREE.Quaternion().setFromUnitVectors(V3(0,0,1),V3(0,-1,0)),_se=new THREE.Euler(),_bp=V3(0,0,0),MOUTHB=V3(0,1.45,.25);
  function swimLean(){const v=P.swv||0,l=1.3+(v<0?Math.min(.45,-v/2.8*.45):-Math.min(.5,v/3.6*.5));return backK>.5?-l:l}   // tới: nằm sấp · lùi: nằm NGỬA (dấu âm = ngả ra sau), lặn thì đầu chúi xuống, trồi thì ngẩng   // nằm sấp ~75°; lặn (swv<0) chúi đầu xuống, trồi lên (swv>0) ngẩng đầu
  function swimArms(){   // bơi sải (tới): 2 tay quạt luân phiên, súng đeo sau lưng · bơi ngửa (lùi): tay trái quạt ngược ra sau đầu, tay phải giữ súng trên ngực chĩa về phía trước
    const w=Math.min(1,swimK*1.5);
    if(backK>.5){
      _sq.setFromEuler(_se.set(-stk,0,-.2));model.armL.quaternion.slerp(_sq,w);model.armL.scale.y+=(1-model.armL.scale.y)*w;   // tay trái: hông -> giơ lên trời -> qua đầu -> thọc xuống nước
      _sq2.copy(model.armR.quaternion);reach(model.armR,SH.r,BGRIP);model.armR.quaternion.slerp(_sq2,1-w);   // tay phải: nắm báng súng đặt trên ngực
      for(const t in slung)if(t!=='grenade')slung[t].visible=t!==cur;
      for(const t in held.mg)held.mg[t].visible=false;
      for(const t in held.m){const sh=t===cur&&t!=='grenade'&&swimK>.5;held.m[t].visible=sh}
      if(cur!=='grenade'){held.position.copy(BGRIP);held.quaternion.copy(BGQ);held.scale.setScalar(1)}   // nòng song song thân, hướng về phía chân (= phía trước)
      if(fp.root)fp.root.visible=false;
      return}
    for(const[arm,o,z]of[[model.armR,0,.2],[model.armL,Math.PI,-.2]]){
      _sq.setFromEuler(_se.set(stk+o,0,z));arm.quaternion.slerp(_sq,w);arm.scale.y+=(1-arm.scale.y)*w}
    if(swimK>.5){   // tay bận bơi: súng / trái cây cất ra sau lưng (đeo)
      for(const t in held.m)held.m[t].visible=false;for(const t in held.mg)held.mg[t].visible=false;
      for(const t in slung)if(t!=='grenade')slung[t].visible=true;
      if(fp.root)fp.root.visible=false}
  }
  // ---- LỘN NHÀO (Shift): chồm người về phía trước (hai tay vươn ra) -> chúi đầu, co người thành một khối tròn, LỘN MỘT VÒNG về phía trước -> bật dậy ----
  // ru: 0..1 tiến độ cú lộn (slideT 0.7 -> 0) · tuck: 0..1 mức co người (duỗi lúc lao ra / lúc đứng dậy, co lúc đang lăn)
  const DMAT=new THREE.MeshBasicMaterial({color:0xd8cdb4,transparent:true,opacity:.75});
  const rollRu=()=>slideT>0?1-slideT/.7:1,rollTuck=ru=>e3(cl(ru,.08,.3))*(1-e3(cl(ru,.85,1)));
  function rollPose(){
    const w=Math.min(1,slK*1.6),ru=rollRu(),tk=rollTuck(ru),ax=-1.3-1.5*(1-tk);   // tay: vươn thẳng lên trước lúc lao ra -> ôm gối lúc lăn
    _sq.setFromEuler(_se.set(ax,0,-.12));model.armL.quaternion.slerp(_sq,w);model.armL.scale.y+=(1-model.armL.scale.y)*w;
    _sq.setFromEuler(_se.set(ax,0,.12));model.armR.quaternion.slerp(_sq,w);model.armR.scale.y+=(1-model.armR.scale.y)*w;
    for(const t in held.m)held.m[t].visible=false;for(const t in held.mg)held.mg[t].visible=false;   // hai tay bận: súng đeo ra sau lưng
    for(const t in slung)if(t!=='grenade')slung[t].visible=true;
    if(fp.root)fp.root.visible=false;
  }
  function rollLift(){   // lăn trên đất: đặt thân sao cho điểm thấp nhất (đầu / lưng / chân) luôn vừa chạm đất
    model.g.updateMatrixWorld(true);
    const a=model.legL.rotation.x,fy=.75-.75*Math.cos(a),fz=-.75*Math.sin(a);let mn=1e9;
    for(const[x,y,z]of[[0,1.7,.1],[0,.75,-.25],[0,1.3,-.25],[.14,fy,fz],[-.14,fy,fz]]){_bp.set(x,y,z).applyMatrix4(model.g.matrixWorld);if(_bp.y<mn)mn=_bp.y}
    model.g.position.y+=(P.y+.04-mn)*Math.min(1,slK*1.6);   // cả hạ xuống lẫn nâng lên: điểm thấp nhất của thân luôn sát mặt đất -> lăn trên đất chứ không lộn giữa không trung
  }
  function slideDust(dt){   // bụi bắn lên dọc đường trượt
    dustT-=dt;if(dustT>0)return;dustT=.035;
    for(let i=0;i<2;i++){const m=new THREE.Mesh(CGEO,DMAT);m.position.set(P.x-sd.x*(.1+Math.random()*.5)+(Math.random()-.5)*.4,P.y+.06,P.z-sd.z*(.1+Math.random()*.5)+(Math.random()-.5)*.4);m.scale.setScalar(.9+Math.random()*1.4);S.add(m);
      crumbs.push({m,vx:-sd.x*1.2+(Math.random()-.5)*1.1,vy:.5+Math.random()*.7,vz:-sd.z*1.2+(Math.random()-.5)*1.1,t:.3+Math.random()*.25})}
  }
  function swimFx(dt){   // chìm đầu: thỉnh thoảng nổi bọt khí ở miệng
    if(!P.under||!window.NatureKit||!NatureKit.bubble)return;
    bubT-=dt;if(bubT>0)return;bubT=.3+Math.random()*.3;
    model.g.updateMatrixWorld(true);model.g.localToWorld(_bp.copy(MOUTHB));NatureKit.bubble(_bp.x,_bp.y,_bp.z)}
  // Trạng thái bơi: chạy MỌI khung (cả góc thứ nhất lẫn góc thứ 3) để chặn bắn + diễn hoạt ảnh bơi ở góc nhìn thứ nhất.
  // swimming = đang xuống nước sâu VÀ đang di chuyển / chìm đầu. Đứng yên nổi trên nước thì swimming=false -> vẫn bắn được.
  function swimState(dt){
    const vf=dt>0?((P.x-lx)*-Math.sin(yaw)+(P.z-lz)*-Math.cos(yaw))/dt:0;fwdV+=((Math.abs(vf)>40?0:vf)-fwdV)*Math.min(1,dt*12);   // >0 đi tới, <0 đang lùi (phím S)
    const spd=dt>0?Math.hypot(P.x-lx,P.z-lz)/dt:0;lx=P.x;lz=P.z;lastSpd+=((spd>40?0:spd)-lastSpd)*Math.min(1,dt*12);
    tBob+=dt;
    const spw=!!P.sw&&!dead;
    if(!spw)swimming=false;else if(!swimming){if(lastSpd>.5||P.under)swimming=true}else if(lastSpd<.2&&!P.under)swimming=false;
    if(!spw)swimBack=false;else if(fwdV<-.5)swimBack=true;else if(fwdV>.5)swimBack=false;   // có độ trễ để không nhấp nháy khi đi ngang (A/D)
    backK+=((swimBack?1:0)-backK)*Math.min(1,dt*6);
    swimK+=((swimming?1:0)-swimK)*Math.min(1,dt*6);
    if(swimK>.02)stk+=dt*(4.2+Math.min(lastSpd,6)*.6);
    bobK+=(((P.ground&&!spw&&slideT<=0)?1:0)-bobK)*Math.min(1,dt*10);
    if(swimming&&scoped)scoped=false;   // đang bơi: bỏ ngắm sniper
  }
  // ---- GÓC NHÌN THỨ NHẤT khi bơi: súng hạ xuống, hai tay hiện ra quạt nước (bơi sải) / tay trái quạt ngược + tay phải giữ súng (bơi ngửa) ----
  const ZAX=V3(0,0,1),_hp=V3(0,0,0),_sp=V3(0,0,0),_dq=new THREE.Quaternion(),_zq=new THREE.Quaternion();
  function placeArm(a,x,y,z,sx,roll){   // đặt bàn tay ở (x,y,z) (toạ độ camera), ống tay kéo về vai: xoay + kéo dài cho khớp
    _hp.set(x,y,z);_sp.set(sx*.3,-.5,.35).sub(_hp);const d=_sp.length()||1e-3;_sp.divideScalar(d);
    _dq.setFromUnitVectors(ZAX,_sp);_zq.setFromAxisAngle(ZAX,roll);a.quaternion.copy(_dq).multiply(_zq);
    a.position.copy(_hp);a.scale.set(sx<0?-1:1,1,Math.max(.85,Math.min(1.4,d/.62)));a.visible=true}
  function fpSwim(dt,tpShown){
    if(!vm||!vm.userData)return;
    const ud=vm.userData,G=ud.G;
    if(!ud.swA){const R=arm(0,0,0,0,0),L=arm(0,0,0,0,0,true);R.visible=L.visible=false;vm.add(R,L);R.traverse(o=>o.layers.set(1));L.traverse(o=>o.layers.set(1));ud.swA={R,L}}   // dựng lười (vm dựng lại mỗi lần đổi súng)
    const A=ud.swA;
    if(tpShown||swimK<.02||dead){A.R.visible=A.L.visible=false;G.visible=true;return}
    const w=swimK,low=-.8*(1-w),back=backK>.5;
    ud.la.visible=false;
    if(back){   // BƠI NGỬA: súng hạ thấp nằm trên ngực (tay phải giữ), tay trái vung từ hông -> qua đầu -> thọc xuống nước
      G.visible=true;G.position.y-=.22*w;G.position.z+=.1*w;G.rotation.x-=.45*w;A.R.visible=false;
      const f=stk;
      placeArm(A.L,-.5+.1*Math.cos(f),-.2-.55*Math.cos(f)+low,-.45-.25*Math.sin(f),-1,-.3*Math.sin(f));
    }else{      // BƠI SẢI: súng đeo sau lưng (trượt khuất xuống dưới), hai tay quạt luân phiên: vươn ra trước -> kéo xuống nước ra sau -> nhấc lên vòng về trước
      G.position.y-=1.2*w;G.visible=w<.9;
      for(const[a,sx,o]of[[A.R,1,0],[A.L,-1,Math.PI]]){
        const f=stk+o,sn=Math.sin(f);
        placeArm(a,sx*(.2+.12*sn),-.3-.2*sn+low,-.58-.2*Math.cos(f),sx,sx*.4*sn)}
    }
    C.rotation.z+=Math.sin(stk)*.03*w*(back?-1:1);C.position.y+=Math.sin(stk*2)*.025*w;   // thân lắc theo nhịp tay, đầu bồng bềnh
  }
  function apply(dt){swimState(dt);const r=applyTP(dt);fpSwim(dt,r);return r}

  // Gọi 1 lần mỗi khung SAU khi main.js đặt C.position / C.rotation theo góc thứ nhất. Nếu bật góc 3: lùi camera + đặt thân nhân vật.
  function applyTP(dt){
    tickCrumbs(dt);
    const a=active();
    if(!a){if(model&&shown){model.g.visible=false;shown=false}if(window.FruitEat&&FruitEat.bites)lastBn=FruitEat.bites();swPrev=cur;swOn=false;handPrev=cur==='grenade'?null:cur;return false}
    if(!ensure())return false;
    // camera: điểm quay = đầu nhân vật; lùi theo hướng nhìn, dò va chạm từng bước
    const cp=Math.cos(pitch),f=_f.set(-Math.sin(yaw)*cp,Math.sin(pitch),-Math.cos(yaw)*cp),r=_r.set(Math.cos(yaw),0,-Math.sin(yaw));
    const head=_h.set(P.x,P.y+CFG.head*(slideT>0?.55:1-.28*swimK),P.z);
    const want=_t.copy(head).addScaledVector(f,-CFG.dist).addScaledVector(r,CFG.side);want.y+=CFG.up;
    let frac=1;const N=18;
    for(let i=1;i<=N;i++){const u=i/N,x=head.x+(want.x-head.x)*u,y=head.y+(want.y-head.y)*u,z=head.z+(want.z-head.z)*u;
      if(hitAny({x,y:y-CFG.pad,z,r:CFG.pad,h:CFG.pad*2})){frac=Math.max(0,(i-1)/N);break}}
    const allow=CFG.dist*frac;
    // sát tường: camera không còn chỗ lùi -> dùng góc thứ nhất (không để camera chui vào đầu / thân nhân vật)
    if(allow<CFG.fpIn)near=true;else if(allow>CFG.fpOut)near=false;
    if(near){dist=allow;if(shown){model.g.visible=false;shown=false}swPrev=cur;swOn=false;handPrev=cur==='grenade'?null:cur;return false}
    shown=true;
    dist=allow<dist?allow:dist+(allow-dist)*Math.min(1,dt*CFG.ease);
    const k=CFG.dist>0?dist/CFG.dist:0;
    let cx=head.x+(want.x-head.x)*k,cy=head.y+(want.y-head.y)*k,cz=head.z+(want.z-head.z)*k;
    if(typeof groundY==='function')cy=Math.max(cy,groundY(cx,cy,cz)+.25);   // không chui xuống đất khi nhìn xuống
    C.position.set(cx,cy,cz);
    // trạng thái lựu đạn: vừa chuyển sang lựu đạn / vừa ném xong mà còn quả -> làm lại thao tác móc túi
    if(cur!=='grenade')drawT=9;else if(prevCur!=='grenade'||(prevThrow>0&&throwT<=0))drawT=0;else drawT+=dt;
    prevCur=cur;prevThrow=throwT;
    const fr=(window.FruitEat&&FruitEat.tp&&FruitEat.tp())||null,gr=cur==='grenade'&&!fr,inHand=gr&&!(throwT>0&&thrown)&&(drawT>=DRAW*.45||holding||autoP||throwT>0);
    // thân nhân vật: nghiêng người (lean>0 chồm tới, <0 ngả ra sau) quanh hông
    trackSwap(dt,fr,gr);
    let lean=0,useL=false;
    const R=_rt,Lf=_lt;
    if(gr){
      if(throwT>0){                                   // VUNG TAY: từ sau ra trước, người chồm theo
        const u=1-throwT/TH;
        if(u<.7)mix(R,GP.back,GP.fwd,e3(cl(u,0,.7)));else mix(R,GP.fwd,GP.low,e3(cl(u,.7,1)));
        lean=-.42+(.3+.42)*e3(cl(u,0,.65));if(u>.8)lean=.3*(1-e3(cl(u,.8,1)));
        mix(Lf,GP.lwind,GP.lrest,e3(cl(u,0,1)));useL=true;
      }else if(holding||autoP){
        const u=Math.min(1,holdT/PIN_T),wu=e3(cl(holdT,PIN_T*.7,PIN_T*1.2));   // wu: mức ngả ra sau, tăng dần khi chốt đã rút và vẫn giữ chuột
        mix(R,GP.chest,GP.back,wu);
        if(u<.45)mix(Lf,GP.lrest,GP.pin,e3(cl(u,0,.45)));                       // tay trái với tới chốt
        else if(u<.7)mix(Lf,GP.pin,GP.pull,e3(cl(u,.45,.7)));                   // giật chốt ra
        else mix(Lf,GP.pull,GP.lwind,e3(cl(u,.7,1)));                            // dang ra giữ thăng bằng
        useL=true;lean=-.42*wu+.08*Math.sin(Math.min(1,u/.5)*Math.PI);
      }else if(drawT<DRAW){                           // MÓC TÚI: tay phải vươn sang hông trái, thò vào túi, rút lựu đạn lên ngực
        const u=drawT/DRAW;
        if(u<.45)mix(R,GP.rest,GP.hip,e3(cl(u,0,.45)));else mix(R,GP.hip,GP.chest,e3(cl(u,.45,1)));
        lean=.2*Math.sin(Math.min(1,u/.55)*Math.PI);
      }else R.copy(GP.chest);
    }
    if(fr)lean=frLean(fr);else if(!gr)lean=gunLean();
    lean+=.08*Math.min(1,lastSpd/6)*bobK;   // chạy: người hơi chúi tới
    slK+=(((slideT>0&&!P.sw)?1:0)-slK)*Math.min(1,dt*18);
    const rolling=slideT>0&&!P.sw;
    if(rolling){const ru=rollRu();lean=2*Math.PI*e3(cl(ru,.08,.92))+.45*Math.sin(Math.PI*cl(ru,0,.2))}   // lộn nhào: chồm tới một chút rồi quay trọn 360° về phía trước quanh hông
    if(P.sw)lean=swimming?swimLean():0;       // bơi: nằm sấp · đứng nước: thẳng người
    if(slideT<=0&&leanS>4)leanS-=2*Math.PI;   // lộn xong (đã quay tròn 360°) -> về lại góc 0 mà không quay ngược
    if(rolling)leanS=lean;else leanS+=(lean-leanS)*Math.min(1,dt*(gr?16:10));
    const bk=bobK*Math.min(1,lastSpd/6),roll=swimK*Math.sin(stk)*.2+Math.sin(ph)*.035*bk,twist=-Math.sin(ph)*.06*bk;   // chạy: nghiêng nhẹ sang chân trụ + vai xoay ngược chân · bơi: thân lắc theo nhịp tay
    const hd0=yaw+Math.PI;let dh=Math.atan2(sd.x,sd.z)-hd0;dh-=Math.round(dh/(2*Math.PI))*2*Math.PI;const hdg=hd0+dh*slK;   // lộn nhào: thân quay theo HƯỚNG LĂN (hướng đang chạy, không phải hướng nhìn)
    model.g.visible=true;model.g.rotation.set(leanS,hdg+twist,roll);
    _hv.set(0,.75,0);_hw.copy(_hv).applyEuler(_E.set(leanS,0,0));_hv.sub(_hw).applyAxisAngle(_Y,hdg);   // giữ nguyên chỗ hông khi nghiêng (chân không trượt)
    model.g.position.set(P.x+_hv.x,P.y+_hv.y,P.z+_hv.z);
    model.g.position.y+=(Math.abs(Math.cos(ph))-.5)*.07*bk                       // chạy: thân nhấp nhô (cao nhất lúc hai chân khép, thấp nhất lúc dang rộng)
      +(P.sw?(swimming?Math.sin(stk*2)*.02*swimK:Math.sin(tBob*2.1)*.035):0);    // nước: bồng bềnh theo nhịp bơi / theo sóng khi đứng nước
    sq+=((1-.22*rollTuck(rollRu())*slK)-sq)*Math.min(1,dt*20);   // co người thành khối tròn khi lănmodel.g.scale.y=sq;
    const mv=Math.min(1,lastSpd/6);ph+=dt*lastSpd*1.45;
    const sw=Math.sin(ph)*.95*mv*(P.ground||P.sw?1:.25);
    model.legL.rotation.x=sw;model.legR.rotation.x=-sw;
    if(slK>.02){   // lộn nhào: hai chân gập lên trước ngực (co) lúc lăn, duỗi lúc lao ra / chạm đất
      const w=Math.min(1,slK*1.6),tg=-1.55*rollTuck(rollRu());model.legL.rotation.x+=(tg-model.legL.rotation.x)*w;model.legR.rotation.x+=(tg-model.legR.rotation.x)*w}
    if(P.sw){const kk=swimming?Math.sin(stk*3)*.5:Math.sin(tBob*5)*.55;model.legL.rotation.x=kk;model.legR.rotation.x=-kk}   // bơi: đập chân · đứng nước: đạp nước
    // súng đang cầm + hai bàn tay (toạ độ trong hệ thân nhân vật)
    const pt=Math.max(-.6,Math.min(.9,pitch))*.9,g=GUN[cur]||GUN.pistol;
    for(const t in held.m)held.m[t].visible=!fr&&t===cur&&(t!=='grenade'||inHand);
    for(const t in held.mg)held.mg[t].visible=false;
    for(const t in slung)slung[t].visible=t==='grenade'?gren-(inHand?1:0)>0:(fr?true:t!==cur);   // lựu đạn: còn quả nào chưa cầm thì móc vẫn còn
    if(!fr&&fp.root)fp.root.visible=false;
    held.scale.setScalar(1);handPrev=null;   // gunPose() đặt lại handPrev nếu đang cầm súng
    if(fr){frPose(fr,dt,sw);rp.copy(GP.rest)}
    else if(gr){
      const k=Math.min(1,dt*22);rp.lerp(R,k);if(useL)lp.lerp(Lf,k);
      held.position.copy(rp);held.rotation.set(0,0,0);
      reach(model.armR,SH.r,rp);
      if(useL)reach(model.armL,SH.l,lp);else relax(model.armL,sw*.8,.05);
    }else{
      rp.copy(GP.rest);   // lần sau lấy lựu đạn tay bắt đầu từ bên hông
      gunPose(g,pt,dt,sw);   // cầm súng sẵn sàng / nạp đạn / đổi súng (báng súng cách ngực ~0.55m, xoay theo tâm ngắm quanh đường vai)
    }
    if(swimK>.02)swimArms();
    if(slK>.02){rollPose();rollLift()}
    if(slideT>0&&!P.sw){const ru=rollRu();if(ru<.12||ru>.6)slideDust(dt)}   // bụi lúc bật đi và lúc tiếp đất
    swimFx(dt);
    tracer.visible=false;flash.visible=false;   // vệt đạn / chớp nòng vẽ từ nòng súng của góc nhìn thứ nhất (đã ẩn) nên ở góc thứ 3 sẽ lơ lửng lệch khỏi nhân vật -> không vẽ
    if(vm)vm.visible=false;   // ẩn tay + súng góc nhìn thứ nhất
    return true;
  }
  addEventListener('keydown',e=>{if(e.code==='KeyC'&&playing&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey)toggle()});
  return {toggle,apply,active,cfg:CFG,setDraw(u){drawT=u*DRAW},get near(){return near},get swimming(){return swimming},get model(){return model},get shown(){return shown},get extra(){return shown?CFG.bodyPad:0},   // extra: bán kính đẩy thêm (m) khi thân nhân vật hiện ra (thân + tay rộng hơn vòng va chạm P.r) -> main.js / guide-bot.js cộng vào để không đi xuyên bot / nhân viên chòi
    get on(){return on},set on(v){on=!!v}};
})();
window.TP=TP;   // main.js / mobile.js gọi qua window.TP (const ở phạm vi script không tự thành thuộc tính window)
