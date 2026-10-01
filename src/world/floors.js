// QUẢN LÝ NẠP / DỠ TẦNG: chỉ tầng đang chơi được dựng (cây, đá, sông, nhà, chòi, tượng...). 3 tầng còn lại KHÔNG tồn tại trong bộ nhớ.
// - Khi vào game: chỉ dựng tầng 1 (nhanh hơn nhiều so với dựng cả 4 tầng).
// - Khi người chơi tới gần thang: tầng kế bên được nạp trước (có chữ "Đang tải tầng N…"), để lúc bước lên / xuống không bị khựng.
// - Tầng bạn đã rời đi bị dỡ (xóa mesh + va chạm + giải phóng GPU) sau KEEP giây, nên đi qua lại gần thang không bị dựng đi dựng lại.
// - Mọi tầng dựng bằng bộ sinh số ngẫu nhiên cố định (seed) nên dựng lại vẫn ra đúng bố cục cũ.
// Phần KHUNG của map (sàn, tường, khối chắn, thang, cổng: world.js + level.js) rất nhẹ nên vẫn giữ sẵn, chỉ ẩn khi ở xa tầng đang chơi.
// Nạp SAU level.js / physics.js, TRƯỚC house.js (xem loader.js): ở cuối file này đánh dấu mốc để biết cái gì do nhà / chòi / tượng / bàn trà tạo ra.
const FM=(function(){
  const KEEP=25;                 // giây: tầng không còn cần tới thì dỡ sau chừng này giây (tránh dựng đi dựng lại khi đứng gần thang)
  const rec={},snap={},need={};  // rec: các vật đã thêm vào scene / meshes / boxes theo từng "khóa" (N0..N3, set0) · need: lần cuối mỗi tầng được cần tới
  let now=0,chk=0,ul=0,busy=false,visFl=-1,set0On=false;
  const UGs=()=>[typeof UG!=='undefined'?UG:null,typeof BG!=='undefined'?BG:null,typeof ROCKG!=='undefined'?ROCKG:null];

  // ---- ghi lại những gì một đoạn dựng đã thêm vào (so sánh trước / sau, không phụ thuộc chỉ số mảng) ----
  const take=()=>({sc:new Set(S.children),m:new Set(meshes),b:new Set(boxes)});
  function diffInto(key,s0){
    const R=rec[key]||(rec[key]={sc:new Set(),m:new Set(),b:new Set()});
    for(const o of S.children)if(!s0.sc.has(o))R.sc.add(o);
    for(const o of meshes)if(!s0.m.has(o))R.m.add(o);
    for(const o of boxes)if(!s0.b.has(o))R.b.add(o);
  }
  function cap(key,fn){const s0=take(),r=fn();diffInto(key,s0);return r}
  const mark=key=>{snap[key]=take()};
  const close=key=>{if(snap[key]){diffInto(key,snap[key]);delete snap[key];if(key==='set0')set0On=true}};
  const compact=(arr,set)=>{let j=0;for(let i=0;i<arr.length;i++)if(!set.has(arr[i]))arr[j++]=arr[i];arr.length=j};
  function drop(key){
    const R=rec[key];if(!R)return;delete rec[key];
    const keep=UGs();
    for(const o of R.sc){
      o.traverse(c=>{const g=c.geometry;if(g&&!keep.includes(g))g.dispose()});
      o.parent=null;o.dispatchEvent({type:'removed'});
    }
    S.children=S.children.filter(o=>!R.sc.has(o));
    compact(meshes,R.m);compact(boxes,R.b);
  }

  // ---- bộ đồ trang trí của tầng 1 (nhà, chòi, tượng, bàn trà): dựng lại bằng chính các hàm build() của chúng ----
  function buildSet0(){cap('set0',()=>{House.rebuild();Pavilion.rebuild();Statues.build();TeaSets.build();Bath.build()});set0On=true}
  function dropSet0(){drop('set0');set0On=false;if(window.OccSrc)delete window.OccSrc.house}

  const has=f=>!!(window.Nature&&Nature.has(f));
  function load(f){
    if(f<0||f>=NF||!window.Nature)return;
    need[f]=now;
    if(f===0&&!set0On&&rec.set0===undefined&&!snap.set0)buildSet0();
    if(!has(f)){Nature.load(f)}
  }
  function unload(f){
    if(has(f))Nature.unload(f);
    if(f===0&&set0On)dropSet0();
  }
  const loaded=()=>window.Nature?Nature.floors.map(q=>q.f):[];

  // ---- chữ báo đang tải ----
  const el=document.createElement('div');
  el.style.cssText='position:fixed;left:50%;top:14%;transform:translateX(-50%);z-index:6;display:none;pointer-events:none;background:rgba(255,255,255,.96);color:#2b2a3a;border:3px solid #7fbfff;border-radius:14px;padding:8px 16px;font:700 16px "Trebuchet MS",Verdana,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.25)';
  document.body.appendChild(el);
  const FT={vi:'⏳ Đang tải tầng {0}…',en:'⏳ Loading floor {0}…'};
  const ftxt=f=>((typeof L!=='undefined'&&FT[L])||FT.en).replace('{0}',f+1);

  // nạp trước tầng f (không chặn khung hình hiện tại: vẽ chữ trước, dựng sau)
  function preload(f){
    if(busy||has(f)||f<0||f>=NF)return;
    busy=true;el.textContent=ftxt(f);el.style.display='block';
    requestAnimationFrame(()=>setTimeout(()=>{try{load(f)}finally{busy=false;el.style.display='none'}},30));
  }
  // người chơi sắp cần tầng f
  function want(f){need[f]=now;if(!has(f))preload(f)}

  // ---- KHUNG map (world.js + level.js): ẩn các tầng ở xa tầng đang chơi ----
  const struct=[];
  {const bb=new THREE.Box3();
    for(const m of meshes){bb.setFromObject(m);if(bb.isEmpty())continue;struct.push([m,Math.max(0,Math.min(NF-1,Math.floor((bb.min.y+SLAB+.01)/FH)))])}}
  function visStruct(c){if(c===visFl)return;visFl=c;for(const [m,g] of struct)m.visible=Math.abs(g-c)<=1}

  // người chơi vừa chuyển sang tầng nf (floor-manager.js gọi): bảo đảm tầng đó đã có (nếu chưa thì dựng ngay)
  function enter(nf){
    if(busy){/* đang nạp nền: dựng ngay luôn cho chắc */}
    load(nf);need[nf]=now;visStruct(nf);
  }
  // mỗi khung (floor-manager.js gọi khi đang chơi): nạp trước tầng kế bên khi gần thang, dỡ tầng cũ khi hết cần
  function tick(dt){
    now+=dt;const c=curFl;need[c]=now;visStruct(c);
    chk-=dt;
    if(chk<=0){chk=.25;
      if(c<NF-1&&bossDone[c]&&P.y>c*FH-1&&P.y<(c+1)*FH){   // thang LÊN (thang tầng c ở cx = ±(AF-2), chạy từ z = AF-4 lùi 18m; chỉ lên được khi đã hạ boss)
        const A=AF(c),cx=(c%2?1:-1)*(A-2),zs=A-4;
        if(Math.abs(P.x-cx)<9&&P.z>zs-22&&P.z<zs+14)want(c+1)}
      if(c>0&&P.y>c*FH-1){   // lỗ thang XUỐNG ở sàn tầng này (là đỉnh thang của tầng c-1)
        const f=c-1,A=AF(f),cx=(f%2?1:-1)*(A-2),zs=A-4;
        if(Math.abs(P.x-cx)<9&&P.z>zs-30&&P.z<zs-6)want(f)}
    }
    ul-=dt;
    if(ul<=0){ul=1;for(const f of loaded())if(f!==c&&now-(need[f]||0)>KEEP)unload(f)}
  }
  // chơi lại: bỏ hết các tầng khác, chỉ giữ tầng 1
  function reset(){
    for(const f of loaded())if(f!==0)unload(f);
    for(const k in need)delete need[k];
    load(0);visFl=-1;visStruct(0);
  }
  const sboxes=boxes.slice();   // va chạm của KHUNG map (tường, khối chắn, thang...): occlusion.js dùng làm vật che khuất
  const api={mark,close,cap,drop,load,unload,enter,tick,reset,want,loaded,has,structBoxes:sboxes};
  mark('set0');   // từ đây tới đầu nature.js: nhà / chòi / tượng / bàn trà tự dựng khi nạp file
  return api;
})();
