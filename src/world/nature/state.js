// ============================================================================
// nature/state.js - Danh sách tầng đã dựng (FL), ẩn/hiện theo khoảng cách, tra cứu nước (lakeAt, isWater, wetAt), lakeGround cho physics.js.
// (Tách ra từ nature.js cũ. Chia sẻ với các file nature/ khác qua NK = window.NatureKit.)
// ============================================================================
(function(){
const NK=window.NatureKit=window.NatureKit||{};
const {CFG,CELL,ck,SLT,WC}=NK;   // từ nature/kit.js
const {lakeH}=NK;   // từ nature/lake.js


// ---- Chạy: tầng 1 dựng ngay, 3 tầng còn lại dựng dần sau khi tải ----
const FL=[];

const act=f=>P.y>FY(f)-6&&P.y<FY(f+1)-3;
   // tầng đang gần người chơi
function vis(){
  for(const Fl of FL){const a=act(Fl.f);
    const VD=CFG.viewDist*(Fl.f===1?1.7:1);
    for(const m of Fl.objs){const b=a&&Math.hypot(m.position.x-P.x,m.position.z-P.z)<VD;m._vb=b;m.visible=b&&!m._oc}   // _oc: bị tường / nhà che khuất (engine/occlusion.js)
    if(Fl.deco)Fl.deco.visible=a;
    for(const m of Fl.terr)m.visible=a;
    for(const m of Fl.detail){const b=a&&Math.hypot(m.userData.cx-P.x,m.userData.cz-P.z)<VD+14;m._vb=b;m.visible=b&&!m._oc}   // cỏ/hoa/đá vụn: chỉ vẽ khối ở gần
    for(const l of Fl.lakes){if(l.mesh)l.mesh.visible=a;if(l.bed)l.bed.visible=a}
    for(const c of Fl.crit)c.g.visible=a;
    if(Fl.fish)for(const q of Fl.fish)q.g.visible=a&&Math.hypot(q.x-P.x,q.z-P.z)<VD;
  }
}

function lakeAt(x,y,z){   // đang lội trong hồ nào (chân thấp hơn mặt nước)
  const ci=Math.floor(x/CELL),cj=Math.floor(z/CELL);
  for(const Fl of FL){const l=Fl.cells.size&&Fl.cells.get(ck(ci,cj));
    if(l&&y<l.y-CFG.level+.15&&y>l.y-l.dmax-.6)return l}
  return null;
}

// physics.js gọi hàm này: độ cao ĐÁY HỒ tại (x,z) nếu đang ở trong hồ, ngược lại null -> người/bot/lựu đạn thật sự lún xuống đáy
lakeGround=function(x,z,y){
  const ci=Math.floor(x/CELL),cj=Math.floor(z/CELL);
  for(const Fl of FL){if(!Fl.cells.size)continue;const l=Fl.cells.get(ck(ci,cj));
    if(l&&y>l.y-l.dmax-1.2&&y<l.y+FHT[l.f]-SLT-.1)return l.y-lakeH(l,x,z)}
  // không phải lòng sông -> mặt đồi (chỉ khi chân đang gần/dưới mặt đồi; đứng trên khối cao thì để physics tự xử lý)
  for(const Fl of FL){if(!Fl.hg)continue;
    if(y>Fl.y-1.2&&y<Fl.y+FHT[Fl.f]-3){const h=Fl.hAt(x,z);return h>.005&&y<Fl.y+h+1?Fl.y+h:null}}
  return null;
};

// có nước (sông) tại (x,z) của tầng f không (m = khoảng đệm ra ngoài bờ, mét). level.js dùng để không sinh bot dưới nước.
function isWater(f,x,z,m){const Fl=FL.find(q=>q.f===f);if(!Fl)return false;
  if(Fl.cells.has(ck(Math.floor(x/CELL),Math.floor(z/CELL))))return true;
  return Fl.lakes.some(l=>l.rho(x,z)<1+(m||0)/l.rz)}

// Có nước SÔNG (không tính băng) tại (x,z) không - trừ mặt cầu (đi trên cầu không phải là lội nước). Bot dùng để né sông / tìm cầu.
function wetAt(f,x,z,m){const Fl=FL.find(q=>q.f===f);if(!Fl)return false;
  if(Fl.wc&&(m||0)<=1.5){const i=Math.floor((x+Fl.wA)/WC),j=Math.floor((z+Fl.wA)/WC);if(i>=0&&j>=0&&i<Fl.wn&&j<Fl.wn&&!Fl.wc[j*Fl.wn+i])return false}   // xa nước (>3m) -> chắc chắn khô, khỏi tính
  const w=Fl.cells.has(ck(Math.floor(x/CELL),Math.floor(z/CELL)))||Fl.lakes.some(l=>!l.ice&&l.rho(x,z)<1+(m||0)/l.rz);
  if(w)for(const B of Fl.bridges){const q=B.along?x:z,ww=B.along?z:x;if(Math.abs(q-B.q)<1.55&&ww>B.wa&&ww<B.wb)return false}
  return w}

Object.assign(NK,{FL,act,lakeAt,vis,isWater,wetAt});
})();
