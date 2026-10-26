// QUẢN LÝ NẠP / DỠ TẦNG: chỉ tầng đang chơi được dựng (cây, đá, sông, nhà, chòi, tượng...). 3 tầng còn lại KHÔNG tồn tại trong bộ nhớ.
// - Khi vào game: chỉ dựng tầng 1 (nhanh hơn nhiều so với dựng cả 4 tầng).
// - Khi người chơi tới gần thang: tầng kế bên được nạp trước (có chữ "Đang tải tầng N…"), để lúc bước lên / xuống không bị khựng.
// - Tầng bạn đã rời đi bị dỡ (xóa mesh + va chạm + giải phóng GPU) sau KEEP giây, nên đi qua lại gần thang không bị dựng đi dựng lại.
// - Mọi tầng dựng bằng bộ sinh số ngẫu nhiên cố định (seed) nên dựng lại vẫn ra đúng bố cục cũ.
// Phần KHUNG của map (sàn, tường, khối chắn, thang, cổng: world.js + level.js) rất nhẹ nên vẫn giữ sẵn, chỉ ẩn khi ở xa tầng đang chơi.
// Nạp SAU level.js / physics.js, TRƯỚC house.js (xem loader.js): ở cuối file này đánh dấu mốc để biết cái gì do nhà / chòi / tượng / bàn trà tạo ra.
const FM=(function(){
  const KEEP=25;
  const PRE_NEAR=30;             // m: người chơi cách cổng không gian trong khoảng này thì mới nạp sẵn tầng kế                 // giây: tầng không còn cần tới thì dỡ sau chừng này giây (tránh dựng đi dựng lại khi đứng gần thang)
  const rec={},snap={},need={};  // rec: các vật đã thêm vào scene / meshes / boxes theo từng "khóa" (N0..N3, set0) · need: lần cuối mỗi tầng được cần tới
  let now=0,chk=0,ul=0,busy=false,visFl=-1,set0On=false,keepAll=false;   // keepAll: đã nạp sẵn cả 4 tầng lúc khởi động -> KHÔNG dỡ tầng nào nữa
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
      hid.delete(o);
      o.traverse(c=>{const g=c.geometry;if(g&&!keep.includes(g))g.dispose();
        if(c.isInstancedMesh&&c.dispose)c.dispose();   // giải phóng buffer instance (mặt hồ)
        const mt=c.material;if(mt)for(const q of(Array.isArray(mt)?mt:[mt]))if(q.map&&q.map._own)q.map.dispose()});   // texture nhân bản riêng của tầng (không đụng texture dùng chung)
      o.parent=null;o.dispatchEvent({type:'removed'});
    }
    S.children=S.children.filter(o=>!R.sc.has(o));
    compact(meshes,R.m);compact(boxes,R.b);if(window.BXG)BXG.dirty();   // boxes bị sửa tại chỗ -> lưới va chạm (physics.js) phải dựng lại
  }

  // ---- bộ đồ trang trí của tầng 1 (nhà, chòi, tượng, bàn trà): dựng lại bằng chính các hàm build() của chúng ----
  function buildSet0(){cap('set0',()=>{House.rebuild();Pavilion.rebuild();Statues.build();TeaSets.build();Bath.build();StairGrove.build()});set0On=true}
  function dropSet0(){drop('set0');set0On=false;if(window.OccSrc)delete window.OccSrc.house}

  // ---- ẩn các tầng ở XA (cách tầng đang chơi >= 2 tầng): đã nạp nhưng không vẽ -> không tốn GPU. Lưu trạng thái visible gốc để trả lại đúng khi tầng đó lại gần. ----
  const hid=new Map();let cullFl=-1,cullN=-1;
  function cullFar(c){
    const L=loaded();if(c===cullFl&&L.length===cullN)return;cullFl=c;cullN=L.length;
    for(const f of L){
      const far=Math.abs(f-c)>1,keys=['N'+f];if(f===0)keys.push('set0');if(f===1)keys.push('wall');
      for(const k of keys)for(const o of objsOf(k)){
        if(far){if(!hid.has(o)){hid.set(o,o.visible);o.visible=false}}
        else if(hid.has(o)){o.visible=hid.get(o);hid.delete(o)}
      }
    }
  }
  const has=f=>!!(window.Nature&&Nature.has(f));
  function load(f){
    if(f<0||f>=NF||!window.Nature)return;
    need[f]=now;
    if(f===1&&rec.wall===undefined&&window.GreatWall)cap('wall',GreatWall.build);   // Vạn Lý Trường Thành tầng 2 (world/greatwall.js)
    if(f===0&&!set0On&&rec.set0===undefined&&!snap.set0)buildSet0();
    if(!has(f)){Nature.load(f)}
  }
  function unload(f){
    if(f===1&&rec.wall)drop('wall');
    if(has(f))Nature.unload(f);
    if(f===0&&set0On)dropSet0();
  }
  const loaded=()=>window.Nature?Nature.floors.map(q=>q.f):[];

  // ---- chữ báo đang tải ----
  const el=document.createElement('div');
  el.style.cssText='position:fixed;left:50%;top:14%;transform:translateX(-50%);z-index:6;display:none;pointer-events:none;background:rgba(255,255,255,.96);color:#2b2a3a;border:3px solid #7fbfff;border-radius:14px;padding:8px 16px;font:700 16px "Trebuchet MS",Verdana,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.25)';
  document.body.appendChild(el);
  const FT={vi:'⏳ Đang tải tầng {0}…',en:'⏳ Loading floor {0}…',ru:'⏳ Загрузка этажа {0}…',ng:'⏳ Dey load floor {0}…',bn:'⏳ তলা {0} লোড হচ্ছে…',id:'⏳ Memuat lantai {0}…',hi:'⏳ मंज़िल {0} लोड हो रही है…',zh:'⏳ 正在加载第 {0} 层…',fil:'⏳ Nilo-load ang palapag {0}…',uk:'⏳ Завантаження поверху {0}…',ko:'⏳ {0}층 불러오는 중…'};
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
    for(const m of meshes){bb.setFromObject(m);if(bb.isEmpty())continue;struct.push([m,Math.max(0,Math.min(NF-1,flOf(bb.min.y+SLAB+.01)))])}}
  function visStruct(c){if(c===visFl)return;visFl=c;for(const [m,g] of struct)m.visible=Math.abs(g-c)<=1}

  // NẠP SẴN CẢ 4 TẦNG lúc khởi động (loader.js gọi trong màn hình loading): từng tầng một, nhường trình duyệt giữa các tầng để thanh tiến độ chạy. Sau đó không dỡ tầng nào.
  function loadAll(prog){
    keepAll=true;
    return new Promise(res=>{
      let f=1;
      const step=()=>{
        if(f>=NF){res();return}
        try{load(f)}catch(e){console.error('[Block Arena] nạp tầng '+(f+1)+' lỗi',e)}
        f++;if(prog)prog(f/NF);
        setTimeout(step,40);
      };
      setTimeout(step,40);
    });
  }
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
      // cổng không gian đã mở (boss hạ, hoặc phòng hòa bình mở sẵn) -> nạp sẵn tầng kế, NHƯNG chỉ khi người chơi đã lại GẦN cổng (PRE_NEAR mét),
      // để vừa vào game (cổng mở sẵn nhưng còn xa) không bị dựng tầng 2 ngay. Không có Portal.list (phiên bản cũ) thì giữ cách cũ.
      if(c<NF-1&&(bossDone[c]||(window.Portal&&Portal.list&&Portal.list.some(q=>q.f===c&&!q.exit)))){
        const L=window.Portal&&Portal.list;
        if(!L)want(c+1);
        else for(const q of L)if(q.f===c&&!q.exit&&Math.hypot(P.x-q.x,P.z-q.z)<PRE_NEAR){want(c+1);break}
      }
    }
    cullFar(c);
    ul-=dt;
    if(ul<=0){ul=1;if(!keepAll)for(const f of loaded())if(f!==c&&now-(need[f]||0)>KEEP)unload(f)}
  }
  // chơi lại: bỏ hết các tầng khác, chỉ giữ tầng 1
  function reset(){
    if(!keepAll)for(const f of loaded())if(f!==0)unload(f);
    for(const k in need)delete need[k];
    load(0);visFl=-1;visStruct(0);
  }
  const sboxes=boxes.slice();   // va chạm của KHUNG map (tường, khối chắn, thang...): occlusion.js dùng làm vật che khuất
  // apocalypse.js (cảnh tận thế khi chuyển tầng) cần biết vật nào thuộc tầng nào: objsOf('N0'|'set0'|'wall') = các vật đã thêm vào scene · structAll() = [[mesh, tầng], ...] của khung map
  const objsOf=key=>rec[key]?Array.from(rec[key].sc):[];
  const structAll=()=>struct.slice();
  const setKeepAll=v=>{keepAll=!!v};   // true: giữ mọi tầng đã nạp (phòng hòa bình) · false: trở lại nạp / dỡ theo yêu cầu
  const api={mark,close,cap,drop,load,unload,enter,tick,reset,want,loaded,has,loadAll,setKeepAll,structBoxes:sboxes,objsOf,structAll};
  mark('set0');   // từ đây tới đầu nature.js: nhà / chòi / tượng / bàn trà tự dựng khi nạp file
  return api;
})();

// const ở cấp script KHÔNG tự thành thuộc tính của window: các file khác kiểm tra window.FM (level.js, nature.js, occlusion.js, archer.js) nên phải gắn tay
window.FM=FM;
