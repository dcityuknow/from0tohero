// Bộ mô hình TRÁI CÂY bằng voxel (dùng cho bàn trái cây trong chòi + trái cầm trên tay).
// Nạp TRƯỚC pavilion.js (pavilion.js gọi FruitKit.heap để bày trái lên đĩa) và TRƯỚC gameplay/fruit-eat.js.
// API:  FruitKit.draw(v,type,x,y,z,k)  vẽ 1 quả/miếng vào VB v (y = mặt đáy, k = tỉ lệ; k=1 ≈ quả thật)
//       FruitKit.heap(v,type,x,y,z)    vẽ 1 đĩa đầy trái cùng loại
//       FruitKit.TYPES[type] = {heal, n:{vi,en}}   heal = tổng máu hồi khi ăn hết 1 quả
(function(){
'use strict';
const H=(i,j,k)=>{let h=(Math.imul(i+7,73856093)^Math.imul(j+13,19349663)^Math.imul(k+29,83492791))>>>0;h=(h^(h>>>15))>>>0;return (h%997)/997};
const TYPES={   // heal = tổng máu hồi khi ăn hết 1 quả · n = tên hiện khi cầm (11 ngôn ngữ như i18n.js)
  apple:{heal:14,n:{vi:'Táo',en:'Apple',ru:'Яблоко',ng:'Apple',bn:'আপেল',id:'Apel',hi:'सेब',zh:'苹果',fil:'Mansanas',uk:'Яблуко',ko:'사과'}},
  orange:{heal:12,n:{vi:'Cam',en:'Orange',ru:'Апельсин',ng:'Orange',bn:'কমলা',id:'Jeruk',hi:'संतरा',zh:'橙子',fil:'Dalandan',uk:'Апельсин',ko:'오렌지'}},
  watermelon:{heal:18,n:{vi:'Dưa hấu',en:'Watermelon',ru:'Арбуз',ng:'Watermelon',bn:'তরমুজ',id:'Semangka',hi:'तरबूज़',zh:'西瓜',fil:'Pakwan',uk:'Кавун',ko:'수박'}},
  grape:{heal:10,n:{vi:'Nho',en:'Grapes',ru:'Виноград',ng:'Grapes',bn:'আঙুর',id:'Anggur',hi:'अंगूर',zh:'葡萄',fil:'Ubas',uk:'Виноград',ko:'포도'}},
  pineapple:{heal:16,n:{vi:'Dứa',en:'Pineapple',ru:'Ананас',ng:'Pineapple',bn:'আনারস',id:'Nanas',hi:'अनानास',zh:'菠萝',fil:'Pinya',uk:'Ананас',ko:'파인애플'}},
  dragon:{heal:15,n:{vi:'Thanh long',en:'Dragon fruit',ru:'Питахайя',ng:'Dragon fruit',bn:'ড্রাগন ফল',id:'Buah naga',hi:'ड्रैगन फ्रूट',zh:'火龙果',fil:'Dragon fruit',uk:'Пітайя',ko:'용과'}},
  sandwich:{heal:20,n:{vi:'Bánh mì sandwich',en:'Sandwich',ru:'Сэндвич',ng:'Sandwich',bn:'স্যান্ডউইচ',id:'Sandwich',hi:'सैंडविच',zh:'三明治',fil:'Sandwich',uk:'Сендвіч',ko:'샌드위치'}},
  wine:{heal:16,n:{vi:'Ly rượu vang',en:'Glass of wine',ru:'Бокал вина',ng:'Glass of wine',bn:'এক গ্লাস ওয়াইন',id:'Segelas anggur',hi:'वाइन का गिलास',zh:'一杯红酒',fil:'Baso ng alak',uk:'Келих вина',ko:'와인 한 잔'}}
};
// ly rượu vang: thủy tinh TRONG SUỐT (vật liệu riêng) + rượu đỏ (mesh riêng để hạ mực rượu khi uống)
const GLASS_MAT=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.34,side:THREE.DoubleSide,depthWrite:false});
const LIQ_MAT=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.9});
// LY RƯỢU VANG cao chân (k=1 cao ~25cm): đế tròn dẹt, chân mảnh dài, bầu tròn thon dần về miệng (vỏ mỏng, rỗng); rượu tím đỏ lấp phần bầu rộng nhất
const WG={base:.125,h:.065,top:.25,N:10,yb:.19,hb:.075,R0:.055};   // base/h: đáy + chiều cao khối rượu · top: miệng ly
const bowlR=y=>WG.R0*Math.sqrt(Math.max(0,1-((y-WG.yb)/WG.hb)**2));
const GT=[0xe6f2fa,0xf6e4cc,0xdcd2f5,0xe6f2fa];   // ánh phản chiếu nhiều màu nhẹ của thủy tinh
function wineGlass(v,x,y,z,k){const s=.006*k;
  v.cyl(x,y+.003*k,z,.048*k,.006*k,0xdcd2f5,s,'y');                                    // đế
  v.cyl(x,y+.009*k,z,.034*k,.006*k,0xe6f2fa,s,'y');
  v.cyl(x,y+.0645*k,z,.0055*k,.105*k,0xd6c4ee,.0055*k,'y');                            // chân dài mảnh
  let q=0;for(let yy=.118;yy<=WG.top+.0001;yy+=.006,q++){const r=bowlR(yy),ri=r-.0045;   // bầu: chồng các vòng thủy tinh
    if(r<.006)continue;
    if(ri>.004)v.cyl(x,y+yy*k,z,r*k,.006*k,GT[q%4],s,'y',ri*k);else v.cyl(x,y+yy*k,z,r*k,.006*k,GT[q%4],s,'y')}}
function wineLiquid(v,y,k,i){const yy=WG.base+(i+.5)*WG.h/WG.N,r=bowlR(yy)-.0055;   // 1 lát rượu mỏng ở độ cao yy
  v.cyl(0,0,0,Math.max(.006,r)*k,WG.h/WG.N*k,(a,b,l)=>((a+b+l)&1)?0x7d1d45:0x6e1840,.0065*k,'y')}
const DRAW={
  wine(v,x,y,z,k){wineGlass(v,x,y,z,k)},   // bản đặc (dự phòng); bản trong suốt dùng FruitKit.make
  apple(v,x,y,z,k){const s=.02*k,r=.075*k;
    v.ell(x,y+.07*k,z,r,.068*k,r,(i,j,l)=>H(i,j,l)<.07?0xe8532f:(((i+j+l)&1)?0xd32f2f:0xbf2222),s);
    v.box(x,y+.145*k,z,.012*k,.03*k,.012*k,0x6b4a2a,.012*k);
    v.box(x+.022*k,y+.152*k,z,.04*k,.008*k,.02*k,0x3fa34d,.008*k)},
  orange(v,x,y,z,k){const s=.02*k,r=.07*k;
    v.ell(x,y+r,z,r,r*.95,r,(i,j,l)=>H(i,j,l)<.08?0xffb84a:(((i+j+l)&1)?0xff9a1a:0xf28506),s);
    v.box(x,y+r*1.9,z,.02*k,.01*k,.02*k,0x4a8f2a,.01*k)},
  watermelon(v,x,y,z,k){   // lát dưa hình bán nguyệt: vỏ xanh, viền trắng, ruột đỏ, hạt đen
    const r=.13*k,s=.02*k,n=Math.max(1,Math.round(2*r/s)),cs=2*r/n;
    v.cyl(x,y+r,z,r,.05*k,(a,b,l)=>{
      const u=(a+.5-n/2)*cs,w=(b+.5-n/2)*cs;if(w>=0)return -1;   // chỉ giữ nửa dưới của đĩa -> cạnh phẳng ở trên, vỏ cong ở dưới
      const d=Math.hypot(u,w)/r;
      return d>.9?0x2f8f3a:d>.82?0xf0f7e3:(H(a,b,l)<.05?0x1d1d1d:(d>.7?0xff5a66:0xe53b4a))},s,'z')},
  grape(v,x,y,z,k){const s=.012*k,r=.03*k,C=i=>H(i,3,7)<.12?0xb58ad6:(i&1?0x6a2c91:0x7b3aa6);let q=0;
    const g=(gx,gy,gz)=>{q++;v.ell(x+gx*k,y+gy*k,z+gz*k,r,r,r,(i,j,l)=>C(i+j+l+q),s)};
    g(0,.03,0);for(let a=0;a<6;a++)g(Math.cos(a*Math.PI/3)*.056,.03,Math.sin(a*Math.PI/3)*.056);
    for(let a=0;a<3;a++)g(Math.cos(a*2.094+.5)*.03,.075,Math.sin(a*2.094+.5)*.03);
    g(0,.115,0);v.box(x,y+.16*k,z,.012*k,.04*k,.012*k,0x4f7a2e,.012*k)},
  pineapple(v,x,y,z,k){const s=.02*k;
    v.ell(x,y+.095*k,z,.06*k,.095*k,.06*k,(i,j,l)=>((i+j+l)%4<2)?0xe9b824:0xc88f12,s);
    for(let a=0;a<8;a++){const an=a*Math.PI/4;for(let t=0;t<3;t++)
      v.box(x+Math.cos(an)*(.01+t*.014)*k,y+(.2+t*.03)*k,z+Math.sin(an)*(.01+t*.014)*k,.016*k,.034*k,.016*k,t&1?0x2f8f3a:0x3fa34d,.016*k)}
    v.box(x,y+.24*k,z,.018*k,.07*k,.018*k,0x3fa34d,.018*k)},
  dragon(v,x,y,z,k){const s=.02*k;
    v.ell(x,y+.065*k,z,.075*k,.06*k,.055*k,(i,j,l)=>H(i,j,l)<.15?0x62c24a:(((i+l)&1)?0xe0237c:0xc9186a),s);
    v.box(x+.075*k,y+.07*k,z,.02*k,.02*k,.02*k,0x62c24a,.02*k);v.box(x-.075*k,y+.07*k,z,.02*k,.02*k,.02*k,0x62c24a,.02*k)},
  sandwich(v,x,y,z,k){   // bánh mì sandwich: 2 lát bánh (viền vỏ nâu) kẹp xà lách, cà chua, phô mai, giăm bông; cắm tăm
    const w=.17*k,d=.13*k,s=.012*k;
    const bread=(cy,h,top)=>v.box(x,cy,z,w,h,d,(i,j,l,nx,ny)=>{const e=(i===0||i===nx-1)?1:0;return top?(e?0xb87333:0xd9a35a):(e?0xc58a45:0xefd09a)},s);
    bread(y+.016*k,.032*k,false);                                        // lát dưới
    v.box(x,y+.037*k,z,w-.01*k,.012*k,d-.01*k,0xf08a8f,s);               // giăm bông
    v.box(x,y+.048*k,z,w-.004*k,.01*k,d-.004*k,0xffd54a,s);              // phô mai
    v.box(x,y+.059*k,z,w+.012*k,.012*k,d+.012*k,(i,j,l)=>((i+l)&1)?0x3fa34d:0x58b85f,s);   // xà lách (nhô ra ngoài)
    v.box(x-.04*k,y+.07*k,z,.05*k,.012*k,d-.02*k,0xe53b3b,s);            // cà chua
    v.box(x+.04*k,y+.07*k,z,.05*k,.012*k,d-.02*k,0xd32f2f,s);
    bread(y+.092*k,.032*k,true);                                          // lát trên
    v.box(x,y+.14*k,z,.006*k,.07*k,.006*k,0xd9b26f,.006*k);               // tăm
    v.box(x,y+.18*k,z,.02*k,.012*k,.02*k,0xe53b3b,.012*k)}
};
// vị trí các quả trên 1 đĩa (x,z lệch so với tâm đĩa) + tỉ lệ
const HEAP={
  apple:[[-.09,.06,1],[.09,.06,1],[0,-.08,1]],
  orange:[[-.09,.06,.95],[.09,.06,.95],[0,-.08,.95]],
  watermelon:[[0,-.1,.85],[0,0,.85],[0,.1,.85]],
  grape:[[-.1,0,.9],[.1,.05,.9]],
  pineapple:[[-.1,0,.8],[.1,.04,.8]],
  dragon:[[-.1,.05,.85],[.1,.05,.85],[0,-.09,.85]],
  sandwich:[[-.1,.09,1],[.1,.09,1],[0,-.09,1]],
  wine:[[0,0,1]]
};
window.FruitKit={
  TYPES,ORDER:Object.keys(TYPES),
  WG,
  // dựng 1 quả / 1 ly thành Object3D (mesh) tại (x,0,z). Ly rượu: Group {kính trong suốt + rượu}, group.userData.wine = mesh rượu (đáy ở y=WG.base*k; scale.y = mực rượu)
  make(type,k=1,x=0,z=0,liq=false){
    if(type!=='wine'){const v=new VB();this.draw(v,type,x,0,z,k);return v.mesh()}
    const g=new THREE.Group(),gv=new VB();wineGlass(gv,x,0,z,k);const gm=gv.mesh();gm.material=GLASS_MAT;gm.renderOrder=2;g.add(gm);
    const sl=[];   // rượu = WG.N lát mỏng xếp chồng; setLevel(f) bật các lát từ đáy lên theo mực rượu f (0..1) -> mực dâng / hạ đúng hình bầu ly
    if(liq)for(let i=0;i<WG.N;i++){const lv=new VB();wineLiquid(lv,0,k,i);const lm=lv.mesh();lm.material=LIQ_MAT;lm.visible=false;lm.position.set(x,(WG.base+(i+.5)*WG.h/WG.N)*k,z);g.add(lm);sl.push(lm)}
    g.userData.setLevel=f=>{const n=f<=.01?0:Math.max(1,Math.ceil(f*WG.N-1e-6));sl.forEach((m,i)=>{m.visible=i<n})};
    return g},
  // chai rượu cầm rót: GIỐNG chai đen trên bàn (thân đen bóng, nắp thiếc đỏ). Miệng chai ở gốc (0,0,0), thân kéo xuống phía -y
  bottle(k=1){const v=new VB(),BK=0x15191c,o=-.366,c=(y,r,h,col,s)=>v.cyl(0,(y+o)*k,0,r*k,h*k,col,s*k,'y');
    c(-.1875,.08,.375,BK,.01);c(.03,.055,.06,BK,.01);c(.16,.03,.2,BK,.008);c(.31,.034,.1,0xc01c2c,.008);c(.355,.036,.012,0x8c1220,.006);
    v.box(.04*k,(-.19+o)*k,.069*k,.012*k,.34*k,.012*k,0x56626d,.012*k);v.box(.06*k,(-.19+o)*k,.053*k,.01*k,.34*k,.01*k,0x3b454e,.01*k);
    return v.mesh()},
  draw(v,type,x,y,z,k=1){(DRAW[type]||DRAW.apple)(v,x,y,z,k)},
  layout(type){return HEAP[type]||HEAP.apple},   // các quả trên 1 đĩa: [[dx,dz,k],...] (pavilion.js dựng mỗi quả thành 1 mesh riêng để lấy đi / hiện lại được)
  heap(v,type,x,y,z){for(const[dx,dz,k]of HEAP[type]||HEAP.apple)this.draw(v,type,x+dx,y,z+dz,k)},
  name(type,lang){const n=(TYPES[type]||TYPES.apple).n;return n[lang]||n.en}
};
})();
