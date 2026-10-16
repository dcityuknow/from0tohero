// Nền các màn chờ (chọn ngôn ngữ / tên / nhân vật · tạo & vào phòng): nền ĐEN + các loại hạt giống trong game, vẽ bằng canvas 2D (hạt vuông kiểu voxel).
//   · tia lửa cam / vàng  - vụ nổ lựu đạn (gameplay/grenade.js): thỉnh thoảng nổ tung một chùm rồi rơi theo trọng lực
//   · than hồng           - tia lửa bay lên, nhỏ dần
//   · bọt nước            - nổi lên lắc lư (world/nature/fx.js: bubble)
//   · bụi be              - bụi lúc lăn / chạm đất (màu 0xd8cdb4 như góc nhìn thứ 3)
//   · lá xanh             - rơi chao nghiêng
//   · máu đỏ              - vài hạt lẫn trong chùm nổ
//   · vệt đạn vàng        - thỉnh thoảng một tia chớp ngang màn hình (tracer)
// Dùng: MenuFX.attach(phầnTửCha) -> thêm 1 canvas làm con đầu tiên (nằm dưới nội dung). Chỉ chạy khi phần tử cha đang hiện; ẩn thì nghỉ, không tốn CPU.
window.MenuFX=(function(){
  const C={ember:['#ff9a3c','#ffe066','#ffb040','#ff7a1f'],blood:['#ff3355','#d32f2f','#ff5a6e'],dust:['#d8cdb4','#c9bfa5','#b8ad94'],leaf:['#6fd6a0','#3dff7a','#4a7a3a','#7fe08a'],bubble:['#bfe6ff','#8fd0ff','#dff3ff']};
  const pick=a=>a[(Math.random()*a.length)|0],rnd=(a,b)=>a+Math.random()*(b-a);
  const inst=[];let raf=0,tmo=0,last=0;

  function spawn(s,kind,anywhere){
    const W=s.w,H=s.h,p={k:kind,x:rnd(0,W),y:rnd(0,H),vx:0,vy:0,g:0,sz:4,life:4,age:0,col:'#fff',ph:rnd(0,6.3)};
    if(kind==='ember'){p.col=pick(C.ember);p.sz=rnd(4,11);p.vx=rnd(-16,16);p.vy=-rnd(22,80);p.life=rnd(3,6.5);if(!anywhere)p.y=H+10}
    else if(kind==='bubble'){p.col=pick(C.bubble);p.sz=rnd(9,20);p.vx=rnd(-6,6);p.vy=-rnd(14,40);p.life=rnd(5,9);if(!anywhere)p.y=H+16}
    else if(kind==='dust'){p.col=pick(C.dust);p.sz=rnd(3,7);p.vx=rnd(6,26);p.vy=rnd(-6,6);p.life=rnd(5,10);if(!anywhere)p.x=-8}
    else if(kind==='leaf'){p.col=pick(C.leaf);p.sz=rnd(6,12);p.vx=rnd(-8,8);p.vy=rnd(16,42);p.life=rnd(6,11);if(!anywhere)p.y=-10}
    if(anywhere)p.age=rnd(0,p.life*.8);
    return p;
  }
  function burst(s){   // chùm nổ: tia lửa văng ra theo mọi hướng rồi rơi xuống (giống explode() của lựu đạn), lẫn vài hạt máu
    const cx=rnd(s.w*.08,s.w*.92),cy=rnd(s.h*.15,s.h*.85),n=22+((Math.random()*14)|0);
    for(let i=0;i<n;i++){
      const a=rnd(0,6.283),sp=rnd(40,230),red=Math.random()<.14;
      s.ps.push({k:red?'blood':'spark',x:cx,y:cy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-60,g:380,sz:rnd(5,12),life:rnd(.7,1.5),age:0,col:red?pick(C.blood):pick(C.ember),ph:0});
    }
  }
  function tracer(s){   // vệt đạn vàng lướt ngang
    const y=rnd(s.h*.1,s.h*.9),dir=Math.random()<.5?1:-1,len=rnd(60,150);
    s.tr.push({x:dir>0?-len:s.w+len,y:y+rnd(-30,30),dy:rnd(-60,60),vx:dir*rnd(1400,2200),len,life:.4,age:0});
  }
  function resize(s){
    const r=s.par.getBoundingClientRect(),w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));
    if(w===s.w&&h===s.h)return;
    s.w=w;s.h=h;const d=Math.min(window.devicePixelRatio||1,1.5);s.d=d;
    s.cv.width=Math.round(w*d);s.cv.height=Math.round(h*d);
    s.cx.setTransform(d,0,0,d,0,0);s.cx.imageSmoothingEnabled=false;
    const want=Math.max(50,Math.min(150,Math.round(w*h/8500)));
    while(s.ps.filter(p=>p.k!=='spark'&&p.k!=='blood').length<want){const k=pick(['ember','ember','ember','bubble','bubble','dust','dust','leaf']);s.ps.push(spawn(s,k,true))}
  }
  function step(s,dt){
    resize(s);
    s.bt-=dt;if(s.bt<=0){s.bt=rnd(1.2,2.8);burst(s)}
    s.tt-=dt;if(s.tt<=0){s.tt=rnd(3,7);tracer(s)}
    const cx=s.cx;cx.clearRect(0,0,s.w,s.h);
    for(let i=s.ps.length-1;i>=0;i--){
      const p=s.ps[i];p.age+=dt;
      if(p.age>=p.life||p.y<-30||p.y>s.h+30||p.x<-30||p.x>s.w+30){
        if(p.k==='spark'||p.k==='blood'){s.ps.splice(i,1);continue}
        {const q=spawn(s,p.k,true);q.age=0;s.ps[i]=q}continue;   // hạt mới hiện ra ở chỗ ngẫu nhiên (mờ dần vào) để hạt rải đều cả màn hình
      }
      p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
      let x=p.x,u=p.age/p.life,a=Math.min(1,u*8)*(1-u*u),sz=p.sz;
      if(p.k==='bubble')x+=Math.sin(p.age*2+p.ph)*8;
      else if(p.k==='leaf')x+=Math.sin(p.age*1.6+p.ph)*14;
      else if(p.k==='ember'){a*=.65+.35*Math.sin(p.age*14+p.ph);sz*=1-u*.6}
      else if(p.k==='spark'||p.k==='blood')sz*=1-u*.7;
      cx.globalAlpha=Math.max(0,a)*(p.k==='dust'?.7:1);
      const px=Math.round(x),py=Math.round(p.y),s0=Math.max(1,Math.round(sz));
      if(p.k==='bubble'){cx.strokeStyle=p.col;cx.lineWidth=2;cx.strokeRect(px,py,s0,s0);cx.fillStyle='#fff';cx.fillRect(px+3,py+3,3,3)}
      else{cx.fillStyle=p.col;cx.fillRect(px,py,s0,s0);if(s0>=4){cx.fillStyle='rgba(255,255,255,.45)';cx.fillRect(px,py,s0-1,2);cx.fillRect(px,py,2,s0-1)}}   // viền sáng trên-trái cho ra khối voxel
    }
    for(let i=s.tr.length-1;i>=0;i--){
      const t=s.tr[i];t.age+=dt;t.x+=t.vx*dt;t.y+=t.dy*dt;
      if(t.age>=t.life){s.tr.splice(i,1);continue}
      const dir=t.vx>0?1:-1;cx.globalAlpha=1-t.age/t.life;cx.fillStyle='#ffe066';cx.fillRect(Math.round(Math.min(t.x,t.x-dir*t.len)),Math.round(t.y),t.len,2);
    }
    cx.globalAlpha=1;
  }
  const shown=s=>s.par.isConnected&&s.par.getClientRects().length>0&&getComputedStyle(s.par).display!=='none';
  function loop(now){
    raf=0;tmo=0;
    const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
    let any=false;
    for(const s of inst)if(shown(s)){any=true;step(s,dt)}
    if(any)raf=requestAnimationFrame(loop);
    else tmo=setTimeout(()=>{raf=requestAnimationFrame(loop)},300);   // không màn nào đang hiện: kiểm tra lại thưa thớt
  }
  function attach(par){
    const cv=document.createElement('canvas');
    cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;background:#000';
    par.insertBefore(cv,par.firstChild);
    const s={par,cv,cx:cv.getContext('2d'),w:0,h:0,d:1,ps:[],tr:[],bt:rnd(.3,1.2),tt:rnd(1.5,3)};
    inst.push(s);
    if(!raf&&!tmo){last=performance.now();raf=requestAnimationFrame(loop)}
    return s;
  }
  return {attach};
})();
