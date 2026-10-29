// Tên bot: mỗi bot thường có tên "@TÊN" lơ lửng trên đầu. Tên lấy từ assets/data/botnames.txt (mỗi dòng 1 tên).
// SỐ BOT = SỐ TÊN: mỗi tầng chỉ sinh tối đa đúng bằng số tên trong tệp (mỗi tên dùng 1 lần). Sang tầng khác / chơi lại -> BN.reset() (setupFloor, restart).
// Thêm / bớt dòng trong tệp rồi tải lại trang -> số bot đổi theo. Không đọc được tệp (vd mở bằng file://) -> game chạy như cũ, không tên, không giới hạn.
// Nạp TRƯỚC bot-model.js (spawnBot gọi BN.assign). Chỉnh nhanh ở CFG.
// SỬA LỖI: các module khác kiểm tra bằng window.BN, nhưng "const BN" ở cấp cao nhất KHÔNG nằm trên window -> luôn undefined -> tên không bao giờ hiện. Đã gán window.BN = api bên dưới.
const BN=(function(){
  const CFG={
    file:'assets/data/botnames.txt',
    maxLen:24,      // cắt tên dài hơn số ký tự này
    range:40,       // chỉ hiện tên khi bot cách camera trong khoảng này (m)
    h:.42,          // chiều cao khung tên (m, trong thế giới) - tăng nếu thấy chữ nhỏ
    y:2.27,         // độ cao khung tên so với chân bot (ăng-ten bot cao ~2.13 -> tên nằm sát ngay trên đầu; tăng số này nếu muốn cao hơn)
    shuffle:true    // true = xáo ngẫu nhiên thứ tự tên mỗi lần reset (mỗi tên chỉ dùng 1 lần); false = theo đúng thứ tự trong tệp
  };
  let list=[],order=[],used=0,loaded=false;
  const W=512,H=64,_d=new THREE.Vector3();
  function parse(x){
    const seen=new Set(),out=[];
    for(let s of String(x).replace(/^\uFEFF/,'').split(/\r?\n/)){
      s=s.replace(/[\u0000-\u001F\u007F]/g,'').replace(/^@+/,'').replace(/\s+/g,' ').trim();   // bỏ @ đầu dòng (game tự thêm @)
      if(!s)continue;
      s=Array.from(s).slice(0,CFG.maxLen).join('').trim();
      const k=s.toLowerCase();if(seen.has(k))continue;seen.add(k);out.push(s);
    }
    return out;
  }
  function mix(){
    order=list.map((_,i)=>i);
    if(CFG.shuffle)for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]]}
  }
  function reset(){used=0;if(loaded)mix()}
  function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
  function tagOf(b){
    let T=b.nmT;if(T)return T;
    const c=document.createElement('canvas');c.width=W;c.height=H;
    const tex=new THREE.CanvasTexture(c);
    const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,fog:false}));
    spr.scale.set(CFG.h*W/H,CFG.h,1);spr.position.set(0,CFG.y,0);spr.visible=false;
    b.g.add(spr);                       // KHÔNG vào botMeshes -> không ảnh hưởng bắn trúng / vỡ mảnh
    return b.nmT=T={c,g:c.getContext('2d'),tex,spr,name:null};
  }
  function draw(T,name){
    if(T.name===name)return;T.name=name;
    const g=T.g,txt='@'+name;g.clearRect(0,0,W,H);
    g.font='700 34px "Segoe UI","Noto Sans",Arial,sans-serif';
    let w=g.measureText(txt).width;const k=w>W-44?(W-44)/w:1;w*=k;
    // KHÔNG nền. Chữ nâu sáng ánh kim bóng: viền nâu đậm + dải màu dọc kiểu kim loại (sáng -> "đường chân trời" tối -> phản chiếu sáng)
    g.save();g.translate(W/2,H/2+1);g.scale(k,1);g.textAlign='center';g.textBaseline='middle';
    g.lineJoin='round';g.lineWidth=6;
    g.shadowColor='rgba(0,0,0,.65)';g.shadowBlur=5;g.shadowOffsetY=2;
    g.strokeStyle='rgba(48,26,12,.92)';g.strokeText(txt,0,0);   // viền + bóng đổ giúp chữ rõ trên mọi nền
    g.shadowColor='transparent';g.shadowBlur=0;g.shadowOffsetY=0;
    const gr=g.createLinearGradient(0,-18,0,18);
    gr.addColorStop(0,'#fff3dc');gr.addColorStop(.3,'#e9bd8c');gr.addColorStop(.5,'#c08a58');
    gr.addColorStop(.52,'#8d5830');gr.addColorStop(.78,'#c99762');gr.addColorStop(1,'#f3d3a6');
    g.fillStyle=gr;g.fillText(txt,0,0);
    g.lineWidth=1;g.strokeStyle='rgba(255,236,200,.45)';g.strokeText(txt,0,0);   // viền sáng mảnh: bóng loáng ở mép chữ
    g.restore();
    T.tex.needsUpdate=true;
  }
  // gọi từ spawnBot: gán tên mới cho bot (keep=true: bot tự đặt lại vị trí, giữ nguyên tên cũ)
  function assign(b,keep){
    if(!loaded||!order.length||b.boss||b.arch)return;
    if(keep&&b.nm)return;
    if(used>=order.length){b.nm=null;return}   // hết danh sách: không lặp lại tên cũ, bot này không có tên
    const name=list[order[used]];used++;
    b.nm=name;draw(tagOf(b),name);
  }
  // mỗi khung (main.js): chỉ hiện tên bot còn sống, đang hoạt động, trong tầm nhìn
  function tick(){
    if(!loaded)return;
    const cp=C.position,r2=CFG.range*CFG.range;
    for(const b of bots){
      const T=b.nmT;if(!T)continue;
      let ok=!!b.nm&&b.on&&b.hp>0&&b.g.visible&&!b.boss&&!b.arch;
      if(ok){const dx=b.x-cp.x,dy=b.y-cp.y,dz=b.z-cp.z;ok=dx*dx+dy*dy+dz*dz<r2}
      T.spr.visible=ok;
    }
  }
  const api={CFG,assign,reset,tick,
    active:()=>loaded&&order.length>0,
    total:()=>list.length,
    left:()=>loaded?Math.max(0,order.length-used):Infinity};
  window.BN=api;   // QUAN TRỌNG: để bot-model.js / spawner.js / main.js thấy được qua window.BN
  fetch(CFG.file,{cache:'no-store'}).then(r=>r.ok?r.text():Promise.reject(r.status)).then(x=>{
    const l=parse(x);if(!l.length)return;
    list=l;loaded=true;reset();
    try{if(typeof setupFloor==='function')setupFloor()}catch(e){}   // tên tải xong sau khi game dựng tầng: dựng lại để bot có tên + đúng số lượng
    console.log('[Block Arena] '+l.length+' tên bot từ '+CFG.file);
  }).catch(e=>console.warn('[Block Arena] không đọc được '+CFG.file+' (dùng npm start / máy chủ web, không mở file://) -> bot không có tên'));
  return api;
})();
