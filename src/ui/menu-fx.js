// Nền các màn chờ (chọn ngôn ngữ / tên / nhân vật · tạo & vào phòng): nền ĐEN + các đám mây của game trôi chậm.
// Đám mây vẽ đúng như world/common/sky.js: 4 dạng "hạt" nối bằng metaball (smooth-union các giọt tròn) —
//   1 hạt tròn · 2 hạt nối (hình đậu phộng) · 3 hạt (tam giác bo tròn) · 4 hạt (hình thoi bo tròn),
// trắng mờ nhiều lớp lồng nhau (giữa đặc, mép loãng dần, đáy hơi xanh nhạt), đứng thẳng nghiêng nhẹ, trôi ngang.
// CLOUD_SHAPES / CLOUD_LAYERS bên dưới là bản sao của sky.js: sửa hình mây ở sky.js thì sửa cả ở đây cho khớp.
// Dùng: MenuFX.attach(phầnTửCha) -> thêm 1 canvas làm con đầu tiên (nằm dưới nội dung). Chỉ chạy khi phần tử cha đang hiện; ẩn thì nghỉ, không tốn CPU.
window.MenuFX=(function(){
  const CLOUD_SHAPES=[
    {K:.7, w:1,  b:[[0,0,1]]},
    {K:1.32,w:.6, b:[[-1.14,0,1],[1.14,0,1]]},
    {K:.82,w:.45,b:[[-.66,1.1,1],[-.66,-1.1,1],[1.2,0,1],[0,0,1.13]]},
    {K:.58,w:.4, b:[[0,1.41,.8],[0,-1.41,.8],[-1.95,0,1],[1.95,0,1],[0,0,1.79]]}
  ];
  const CLOUD_LAYERS=[[1,.50],[.8,.45],[.6,.40]];   // [tỉ lệ cỡ, độ đặc]: 3 lớp lồng nhau chồng lên thành mây trắng mờ
  const U=46;                                        // px mỗi đơn vị bán kính giọt khi dựng sprite
  const rnd=(a,b)=>a+Math.random()*(b-a),ss=(a,b,x)=>{x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x)};
  const inst=[];let raf=0,tmo=0,last=0,sprites=null;

  // sprite 1 đám mây: giữ công thức của sky.js (cloudGeometry + hazeMaterial) nhưng tính trên mặt phẳng 2D
  function makeSprite(sh){
    const B=sh.b,K=sh.K,w=sh.w;
    let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
    for(const b of B){x0=Math.min(x0,b[0]-b[2]);x1=Math.max(x1,b[0]+b[2]);y0=Math.min(y0,b[1]-b[2]);y1=Math.max(y1,b[1]+b[2])}
    const cx=(x0+x1)/2,cy=(y0+y1)/2,pad=.2,W=Math.ceil((x1-x0+2*pad)*U),H=Math.ceil((y1-y0+2*pad)*U);
    const sdf=(x,y)=>{let d=1e9;for(const b of B){const q=Math.hypot(x-b[0],y-b[1])-b[2],k=Math.max(K-Math.abs(d-q),0)/K;d=Math.min(d,q)-k*k*K/4}return d};
    const cv=document.createElement('canvas');cv.width=W;cv.height=H;
    const cx2=cv.getContext('2d'),id=cx2.createImageData(W,H),dat=id.data,e=.02;
    for(let py=0;py<H;py++)for(let px=0;px<W;px++){
      const x=cx+(px-W/2+.5)/U,y=cy+(py-H/2+.5)/U,d=sdf(x,y);
      if(d>=0)continue;
      const t=Math.min(1,-d/w),c=Math.sqrt(1-(1-t)*(1-t));                       // c: độ hướng về người nhìn (mép 0 -> giữa 1), mặt bo tròn bán kính w
      const gx=sdf(x+e,y)-sdf(x-e,y),gy=sdf(x,y+e)-sdf(x,y-e),gl=Math.hypot(gx,gy)||1;
      const ny=-(gy/gl)*Math.sqrt(Math.max(0,1-c*c));                            // thành phần hướng lên của pháp tuyến (màn hình y xuống)
      const k=ss(-.7,.2,ny),o=(py*W+px)*4;                                       // đáy mây hơi xanh nhạt, còn lại trắng
      dat[o]=(.90+.10*k)*255;dat[o+1]=(.94+.06*k)*255;dat[o+2]=(.99+.01*k)*255;
      dat[o+3]=255*ss(0,.8,c);                                                   // mép trong suốt, giữa đặc dần
    }
    cx2.putImageData(id,0,0);
    // gộp 3 lớp lồng nhau (nhỏ dần, mờ dần) quanh tâm hình
    const out=document.createElement('canvas');out.width=W;out.height=H;const oc=out.getContext('2d');
    const ox=(cx-(cx))*U+W/2,oy=H/2;
    for(const[s,a]of CLOUD_LAYERS){oc.globalAlpha=a;oc.drawImage(cv,ox-W/2*s,oy-H/2*s,W*s,H*s)}
    oc.globalAlpha=1;
    return {cv:out,w:W,h:H};
  }
  const getSprites=()=>sprites||(sprites=CLOUD_SHAPES.map(makeSprite));

  function spawn(s,anywhere){
    const sp=getSprites(),i=(Math.random()*sp.length)|0,k=Math.min(s.w,s.h*1.8)/1000;
    const f=rnd(.5,1.35)*k,wd=sp[i].w*f;                                         // f lớn = đám mây to / ở gần: trôi nhanh hơn, đặc hơn (thị sai)
    return {i,f,x:anywhere?rnd(-wd/2,s.w+wd/2):-wd,y:rnd(-.05*s.h,1.05*s.h),rot:(Math.random()-.5)*.8,v:(8+24*f/k/1.35)*k*1.1,a:rnd(.75,1)*(.75+.25*f/k/1.35),ph:rnd(0,6.3),bob:rnd(2,6)};
  }
  function resize(s){
    const r=s.par.getBoundingClientRect(),w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));
    if(w===s.w&&h===s.h)return;
    s.w=w;s.h=h;const d=Math.min(window.devicePixelRatio||1,1.5);
    s.cv.width=Math.round(w*d);s.cv.height=Math.round(h*d);
    s.cx.setTransform(d,0,0,d,0,0);s.cx.imageSmoothingEnabled=true;s.cx.imageSmoothingQuality='high';
    const want=Math.max(8,Math.min(24,Math.round(w*h/52000)));
    s.ps.length=0;for(let i=0;i<want;i++)s.ps.push(spawn(s,true));
  }
  function step(s,dt){
    resize(s);
    const cx=s.cx;cx.clearRect(0,0,s.w,s.h);
    s.ps.sort((a,b)=>a.f-b.f);   // nhỏ / xa vẽ trước, to / gần vẽ sau
    for(let i=0;i<s.ps.length;i++){
      const p=s.ps[i],sp=sprites[p.i],wd=sp.w*p.f;
      p.x+=p.v*dt;p.ph+=dt*.5;
      if(p.x-wd/2>s.w){s.ps[i]=spawn(s,false);continue}
      cx.save();cx.globalAlpha=p.a;
      cx.translate(p.x,p.y+Math.sin(p.ph)*p.bob);cx.rotate(p.rot+Math.sin(p.ph*.7)*.03);
      cx.drawImage(sp.cv,-wd/2,-sp.h*p.f/2,wd,sp.h*p.f);
      cx.restore();
    }
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
    const s={par,cv,cx:cv.getContext('2d'),w:0,h:0,ps:[]};
    inst.push(s);
    if(!raf&&!tmo){last=performance.now();raf=requestAnimationFrame(loop)}
    return s;
  }
  return {attach};
})();
