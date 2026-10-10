// Góc nhìn thứ 3: bấm phím C (hoặc nút "C" trên điện thoại) để đổi qua lại góc thứ nhất <-> thứ 3.
// Camera lùi ra sau lưng + lệch vai phải một chút (kiểu bắn súng góc thứ 3), tự rút ngắn khi sau lưng có tường / vật cản (không xuyên tường).
// Thân nhân vật là mô hình đã chọn ở màn chọn nhân vật (ui/character.js: CharPick.make).
//   · Súng ĐANG CẦM nằm trong hai bàn tay: tay phải nắm báng, tay trái đỡ phần trước (tay tự vươn / co theo vị trí súng, gập lên xuống theo tâm ngắm).
//   · Súng KHÔNG cầm được đeo trên người: súng trường vắt chéo sau lưng, súng ngắm chéo ngược lại (thành chữ X), súng ngắn trong bao ở hông phải, lựu đạn ở hông trái.
//   · Lựu đạn: bấm 4 -> tay phải móc vào túi hông trái lấy lựu đạn rồi đưa lên ngực · giữ chuột -> tay trái giật chốt, rồi NGƯỜI NGẢ RA SAU, tay phải vươn ra sau (thả chuột mới ném)
//     · thả chuột -> tay vung từ sau ra trước, người chồm theo, lựu đạn rời tay đúng lúc game phóng nó đi (grenade.js: throwT / holding / holdT).
// Lấy / ăn / uống trái cây ở bàn chòi (gameplay/fruit-eat.js): thân nhân vật tự diễn — tay phải VƯƠN ra chụp quả (người chồm tới), rút về cầm; rượu: bàn tay trái đưa chai lên rót vào ly, mực rượu dâng; ĂN: đưa lên miệng, mỗi miếng cắn đầu chúi tới + vụn bắn ra, trái nhỏ dần; UỐNG: ngả người ra sau, nghiêng ly. Súng tạm cất lên dây đeo.
// Tự quay về góc thứ nhất khi: ngắm sniper (cần nhìn qua kính) · bị hạ (đã có hoạt ảnh ngã riêng) · sau lưng sát tường nên camera không còn chỗ lùi (tránh camera nằm trong đầu nhân vật).
// Đạn vẫn bắn theo tia từ camera qua tâm ngắm (đúng chỗ tâm ngắm chỉ), như game góc thứ 3 thông thường.
// Chỉnh nhanh: CFG (camera) và GUN / SLING (hình súng, chỗ đeo) bên dưới. Nạp SAU viewmodel.js và effects.js (groundY), TRƯỚC main.js (main.js gọi TP.apply mỗi khung).
const TP=(function(){
  const CFG={dist:3.4,    // m: camera cách đầu nhân vật (xa nhất)
             side:.6,     // m: lệch sang vai phải (0 = ngay sau lưng)
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
  const gunMesh=t=>{const v=new VB();for(const p of GUN[t].parts)v.box(p[0],p[1],p[2],p[3],p[4],p[5],p[6],p[7],true);return v.mesh()};
  function ensure(){
    const k=(window.PROFILE&&PROFILE.char)||(window.CharPick&&CharPick.current())||'vn';
    if(model&&key===k)return true;
    if(!window.CharPick||!CharPick.make)return false;
    if(model){S.remove(model.g);model.g.traverse(o=>{if(o.geometry)o.geometry.dispose()});model=null}
    model=CharPick.make(k);key=k;
    // súng cầm trong tay: 1 nhóm, mỗi loại 1 mesh (chỉ hiện loại đang cầm)
    held=new THREE.Group();model.g.add(held);held.m={};
    for(const t in GUN){const m=gunMesh(t);m.visible=false;held.add(m);held.m[t]=m}
    // súng đeo trên người: mỗi loại 1 nhóm đặt đúng chỗ, hiện khi KHÔNG đang cầm loại đó
    slung={};
    for(const t in SLING){
      const c=SLING[t],g=new THREE.Group(),m=gunMesh(t);m.position.z=c.mid;g.add(m);
      g.position.set(...c.p);g.scale.setScalar(c.s);
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...c.dir).normalize());
      model.g.add(g);slung[t]=g;
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
  // Gọi 1 lần mỗi khung SAU khi main.js đặt C.position / C.rotation theo góc thứ nhất. Nếu bật góc 3: lùi camera + đặt thân nhân vật.
  function apply(dt){
    tickCrumbs(dt);
    const a=active();
    if(!a){if(model&&shown){model.g.visible=false;shown=false}if(window.FruitEat&&FruitEat.bites)lastBn=FruitEat.bites();return false}
    if(!ensure())return false;
    // vận tốc thực tế (m/s) từ vị trí -> nhịp chân
    const spd=dt>0?Math.hypot(P.x-lx,P.z-lz)/dt:0;lx=P.x;lz=P.z;lastSpd+=((spd>40?0:spd)-lastSpd)*Math.min(1,dt*12);
    // camera: điểm quay = đầu nhân vật; lùi theo hướng nhìn, dò va chạm từng bước
    const cp=Math.cos(pitch),f=_f.set(-Math.sin(yaw)*cp,Math.sin(pitch),-Math.cos(yaw)*cp),r=_r.set(Math.cos(yaw),0,-Math.sin(yaw));
    const head=_h.set(P.x,P.y+CFG.head*(slideT>0?.65:1),P.z);
    const want=_t.copy(head).addScaledVector(f,-CFG.dist).addScaledVector(r,CFG.side);want.y+=CFG.up;
    let frac=1;const N=18;
    for(let i=1;i<=N;i++){const u=i/N,x=head.x+(want.x-head.x)*u,y=head.y+(want.y-head.y)*u,z=head.z+(want.z-head.z)*u;
      if(hitAny({x,y:y-CFG.pad,z,r:CFG.pad,h:CFG.pad*2})){frac=Math.max(0,(i-1)/N);break}}
    const allow=CFG.dist*frac;
    // sát tường: camera không còn chỗ lùi -> dùng góc thứ nhất (không để camera chui vào đầu / thân nhân vật)
    if(allow<CFG.fpIn)near=true;else if(allow>CFG.fpOut)near=false;
    if(near){dist=allow;if(shown){model.g.visible=false;shown=false}return false}
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
    if(fr)lean=frLean(fr);
    leanS+=(lean-leanS)*Math.min(1,dt*(gr?16:10));
    model.g.visible=true;model.g.rotation.set(leanS,yaw+Math.PI,0);
    _hv.set(0,.75,0);_hw.copy(_hv).applyEuler(_E.set(leanS,0,0));_hv.sub(_hw).applyAxisAngle(_Y,yaw+Math.PI);   // giữ nguyên chỗ hông khi nghiêng (chân không trượt)
    model.g.position.set(P.x+_hv.x,P.y+_hv.y,P.z+_hv.z);
    sq+=((slideT>0?.68:1)-sq)*Math.min(1,dt*14);model.g.scale.y=sq;
    const mv=Math.min(1,lastSpd/6);ph+=dt*lastSpd*1.45;
    const sw=Math.sin(ph)*.95*mv*(P.ground||P.sw?1:.25);
    model.legL.rotation.x=sw;model.legR.rotation.x=-sw;
    // súng đang cầm + hai bàn tay (toạ độ trong hệ thân nhân vật)
    const pt=Math.max(-.6,Math.min(.9,pitch))*.9,g=GUN[cur]||GUN.pistol;
    for(const t in held.m)held.m[t].visible=!fr&&t===cur&&(t!=='grenade'||inHand);
    for(const t in slung)slung[t].visible=t==='grenade'?gren-(inHand?1:0)>0:(fr?true:t!==cur);   // lựu đạn: còn quả nào chưa cầm thì móc vẫn còn
    if(!fr&&fp.root)fp.root.visible=false;
    if(fr){frPose(fr,dt,sw);rp.copy(GP.rest)}
    else if(gr){
      const k=Math.min(1,dt*22);rp.lerp(R,k);if(useL)lp.lerp(Lf,k);
      held.position.copy(rp);held.rotation.set(0,0,0);
      reach(model.armR,SH.r,rp);
      if(useL)reach(model.armL,SH.l,lp);else relax(model.armL,sw*.8,.05);
    }else{
      rp.copy(GP.rest);   // lần sau lấy lựu đạn tay bắt đầu từ bên hông
      // báng súng cách ngực ~0.55m, hơi lệch phải; xoay theo tâm ngắm quanh đường vai
      held.position.set(.07,-.1,.58).applyAxisAngle(AX,-pt);held.position.add(_a.set(0,1.344,0));
      held.rotation.set(-pt,0,0);
      reach(model.armR,SH.r,held.position);
      _b.set(g.fg[0],g.fg[1],g.fg[2]).applyAxisAngle(AX,-pt).add(held.position);   // điểm tay trái đỡ (dưới nòng / ốp tay)
      reach(model.armL,SH.l,_b);
    }
    tracer.visible=false;flash.visible=false;   // vệt đạn / chớp nòng vẽ từ nòng súng của góc nhìn thứ nhất (đã ẩn) nên ở góc thứ 3 sẽ lơ lửng lệch khỏi nhân vật -> không vẽ
    if(vm)vm.visible=false;   // ẩn tay + súng góc nhìn thứ nhất
    return true;
  }
  addEventListener('keydown',e=>{if(e.code==='KeyC'&&playing&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey)toggle()});
  return {toggle,apply,active,cfg:CFG,setDraw(u){drawT=u*DRAW},get near(){return near},get model(){return model},get shown(){return shown},get extra(){return shown?CFG.bodyPad:0},   // extra: bán kính đẩy thêm (m) khi thân nhân vật hiện ra (thân + tay rộng hơn vòng va chạm P.r) -> main.js / guide-bot.js cộng vào để không đi xuyên bot / nhân viên chòi
    get on(){return on},set on(v){on=!!v}};
})();
window.TP=TP;   // main.js / mobile.js gọi qua window.TP (const ở phạm vi script không tự thành thuộc tính window)
