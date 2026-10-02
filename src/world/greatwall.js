// VẠN LÝ TRƯỜNG THÀNH Ở TẦNG 2: một bức tường gạch chạy vòng quanh map (sát tường bao), có:
//  - mặt đi lát đá, lan can ngoài có lỗ châu mai, lan can trong thấp, đoạn tường lên xuống bậc như đi theo triền núi
//  - 3 tháp canh góc + 4 tháp canh giữa (vào được bên trong, cửa vòm, cửa sổ, mái ngói đá phiến nhiều tầng)
//  - 2 cầu thang gạch bên hông tường (ở 2 góc chéo nhau, cách tháp góc ~6m) để leo từ mặt đất lên mặt tường
//  - đoạn góc ĐÔNG-NAM để trống vì đó là chỗ thang lên tầng 3 + cổng khóa
// Nạp SAU bath.js, TRƯỚC nature.js (xem loader.js). KHÔNG tự dựng khi nạp file: floors.js (FM) gọi GreatWall.build() khi tầng 2 được nạp
// và tự dỡ khi tầng 2 bị dỡ. Chỉnh nhanh ở các hằng số ngay bên dưới.
(function(){
const FLOOR=1;      // chỉ số tầng (1 = tầng 2)
const WW=6;         // bề rộng thân tường (m)
const TW=8;         // cạnh tháp canh (m)
const TH=3.6;       // chiều cao thân tháp phía trên sàn tháp
const HC=7;         // độ cao mặt đi ở tháp + đoạn tường cao (m, tính từ sàn tầng)
const HB=6;         // độ cao đoạn tường thấp
const HR=6.5;       // bậc nối giữa 2 độ cao (mỗi bậc <= .5m để đi bộ lên được)
const TILE=2;       // 1 ô họa tiết = 2m

// ---------- HỌA TIẾT (vẽ bằng canvas 64px, lặp theo tọa độ thế giới nên các khối ghép liền mạch) ----------
const rng=s=>()=>(s=(s*1664525+1013904223)>>>0)/4294967296;
const DRAW={
  brick:(x,n)=>{const r=rng(7),P=['#8d877b','#9a9486','#807b70','#a39d8d','#8a8478'],C=[];
    for(let j=0;j<4;j++)C.push([P[(r()*5)|0],P[(r()*5)|0]]);
    x.fillStyle='#5f5a51';x.fillRect(0,0,n,n);
    for(let j=0;j<4;j++)for(let i=-1;i<3;i++){x.fillStyle=C[j][((i%2)+2)%2];x.fillRect(i*32+(j&1)*16+1,j*16+1,30,14)}},
  pave:(x,n)=>{const r=rng(3),P=['#9d9a92','#8f8c85','#a7a49b','#96938b'];
    x.fillStyle='#6a675f';x.fillRect(0,0,n,n);
    for(let j=0;j<4;j++)for(let i=0;i<4;i++){x.fillStyle=P[(r()*4)|0];x.fillRect(i*16+1,j*16+1,14,14)}},
  roof:(x,n)=>{x.fillStyle='#26262e';x.fillRect(0,0,n,n);
    for(let j=0;j<8;j++){for(let i=0;i<8;i++){x.fillStyle=(i+j)&1?'#30303a':'#22222a';x.fillRect(i*8,j*8,7,7)}x.fillStyle='#14141a';x.fillRect(0,j*8+7,n,1)}},
  wood:(x,n)=>{x.fillStyle='#6b2d1c';x.fillRect(0,0,n,n);x.fillStyle='#55231a';for(let i=0;i<8;i++)x.fillRect(i*8+3,0,1,n)},
  dark:(x,n)=>{x.fillStyle='#15151c';x.fillRect(0,0,n,n)},
  trim:(x,n)=>{const r=rng(5);x.fillStyle='#b7b2a4';x.fillRect(0,0,n,n);
    for(let i=0;i<24;i++){x.fillStyle=r()<.5?'#a9a496':'#c4bfb1';x.fillRect((r()*60)|0,(r()*60)|0,4,4)}}
};
const KIND=Object.keys(DRAW);
let MAT=null;
function mats(){
  if(MAT)return MAT;MAT={};
  for(const k of KIND){
    const c=document.createElement('canvas');c.width=c.height=64;DRAW[k](c.getContext('2d'),64);
    const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.NearestFilter;t.anisotropy=4;
    MAT[k]=new THREE.MeshLambertMaterial({map:t,emissive:0x1a1a1a});
  }
  return MAT;
}

// ---------- GOM MẶT: mỗi loại họa tiết = 1 mesh duy nhất (rất ít draw call) ----------
let Q=null;
const newQ=()=>{Q={};for(const k of KIND)Q[k]={p:[],n:[],u:[],i:[],k:0}};
// sk = họa tiết mặt bên, tk = họa tiết mặt trên, bot = có vẽ mặt dưới không (chỉ cần cho trần mái)
function addBox(sk,tk,x0,x1,y0,y1,z0,z1,bot){
  const f=(kind,a,b,c,d,n,uv)=>{
    const q=Q[kind],base=q.k;
    for(const p of[a,b,c,d]){q.p.push(p[0],p[1],p[2]);q.n.push(n[0],n[1],n[2]);const t=uv(p);q.u.push(t[0]/TILE,t[1]/TILE)}
    q.i.push(base,base+1,base+2,base,base+2,base+3);q.k+=4;
  };
  const ux=p=>[p[2],p[1]],uz=p=>[p[0],p[1]],uy=p=>[p[0],p[2]];
  f(sk,[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[1,0,0],ux);
  f(sk,[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[-1,0,0],ux);
  f(tk,[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],[0,1,0],uy);
  if(bot)f(sk,[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[0,-1,0],uy);
  f(sk,[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[0,0,1],uz);
  f(sk,[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[0,0,-1],uz);
}

// ---------- DỰNG ----------
function build(){
  const A=AF(FLOOR),Y0=FH*FLOOR;
  newQ();
  // 4 cạnh: (u = dọc theo cạnh 0..2A, v = từ mép ngoài vào trong 0..) -> (x,z). 0 = Bắc, 1 = Đông, 2 = Nam, 3 = Tây
  const FR=[(u,v)=>[u-A,v-A],(u,v)=>[A-v,u-A],(u,v)=>[A-u,A-v],(u,v)=>[v-A,A-u]];
  const rect=(f,u0,u1,v0,v1)=>{const a=FR[f](u0,v0),b=FR[f](u1,v1);
    return [Math.min(a[0],b[0]),Math.max(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[1],b[1])]};
  const col=(f,u0,u1,v0,v1,y0,y1)=>{const [x0,x1,z0,z1]=rect(f,u0,u1,v0,v1);boxes.push({x0,x1,y0:Y0+y0,y1:Y0+y1,z0,z1})};
  const put=(f,sk,tk,u0,u1,v0,v1,y0,y1,solid,bot)=>{
    const [x0,x1,z0,z1]=rect(f,u0,u1,v0,v1);
    addBox(sk,tk,x0,x1,Y0+y0,Y0+y1,z0,z1,bot);
    if(solid)boxes.push({x0,x1,y0:Y0+y0,y1:Y0+y1,z0,z1});
  };

  // --- tháp canh: thân gạch + sàn lát đá, cửa vòm hướng ra tường, cửa sổ, mái ngói 4 tầng thu nhỏ ---
  // dU0 / dU1: có cửa ở mặt u0 / u0+TW · dV1: có cửa ở mặt trong (v=TW) · wU0: có cửa sổ ở mặt u0
  const D0=1.8,D1=4.2;
  const tower=(f,u0,dU0,dU1,dV1,wU0)=>{
    const Ht=HC,top=Ht+TH,dh=Ht+2.4;
    put(f,'brick','pave',u0,u0+TW,0,TW,0,Ht,true);
    for(const [ua,door] of[[u0,dU0],[u0+TW-1,dU1]]){
      if(door){
        put(f,'brick','brick',ua,ua+1,0,D0,Ht,top,true);put(f,'brick','brick',ua,ua+1,D1,TW,Ht,top,true);put(f,'brick','brick',ua,ua+1,D0,D1,dh,top,true);
        put(f,'wood','wood',ua-.06,ua+1.06,D0-.18,D0,Ht,dh,false);put(f,'wood','wood',ua-.06,ua+1.06,D1,D1+.18,Ht,dh,false);put(f,'wood','wood',ua-.06,ua+1.06,D0-.18,D1+.18,dh-.2,dh,false);
      }else put(f,'brick','brick',ua,ua+1,0,TW,Ht,top,true);
    }
    put(f,'brick','brick',u0+1,u0+TW-1,0,1,Ht,top,true);
    if(dV1){
      put(f,'brick','brick',u0+1,u0+D0,TW-1,TW,Ht,top,true);put(f,'brick','brick',u0+D1,u0+TW-1,TW-1,TW,Ht,top,true);put(f,'brick','brick',u0+D0,u0+D1,TW-1,TW,dh,top,true);
      put(f,'wood','wood',u0+D0-.18,u0+D0,TW-1.06,TW+.06,Ht,dh,false);put(f,'wood','wood',u0+D1,u0+D1+.18,TW-1.06,TW+.06,Ht,dh,false);put(f,'wood','wood',u0+D0-.18,u0+D1+.18,TW-1.06,TW+.06,dh-.2,dh,false);
    }else put(f,'brick','brick',u0+1,u0+TW-1,TW-1,TW,Ht,top,true);
    // trần (chỉ va chạm) + mái: 4 lớp thu nhỏ dần, viền đá dưới mái, đỉnh nóc
    col(f,u0,u0+TW,0,TW,top,top+.35);
    put(f,'trim','trim',u0-.15,u0+TW+.15,-.15,TW+.15,top-.2,top,false);
    for(let n=0;n<4;n++){const o=-1+1.1*n;put(f,'roof','roof',u0+o,u0+TW-o,o,TW-o,top+.35*n,top+.35*(n+1),false,n===0)}
    put(f,'trim','trim',u0+TW/2-.4,u0+TW/2+.4,TW/2-.4,TW/2+.4,top+1.4,top+1.8,false);
    // cửa sổ: ô tối + mái cong nhỏ + bệ đá
    const y0=Ht+1.1;
    const winU=(uf,s,c)=>{put(f,'dark','dark',uf,uf+s*.08,c-.5,c+.5,y0,y0+1.5,false);put(f,'dark','dark',uf,uf+s*.08,c-.3,c+.3,y0+1.5,y0+1.8,false);put(f,'trim','trim',uf,uf+s*.14,c-.65,c+.65,y0-.12,y0,false)};
    const winV=(c)=>{put(f,'dark','dark',c-.5,c+.5,TW,TW+.08,y0,y0+1.5,false);put(f,'dark','dark',c-.3,c+.3,TW,TW+.08,y0+1.5,y0+1.8,false);put(f,'trim','trim',c-.65,c+.65,TW,TW+.14,y0-.12,y0,false)};
    winU(u0+TW,1,6.1);if(wU0)winU(u0,-1,6.1);
    if(dV1)winV(u0+5.6);else{winV(u0+2.4);winV(u0+5.6)}
  };

  // --- lan can ngoài: thân + lỗ châu mai (răng cưa) ---
  const rail=(f,a,b,h)=>{
    put(f,'brick','brick',a,b,0,.7,h,h+1,false);
    const n=Math.max(1,Math.floor((b-a)/1.4)),w=(b-a)/n,g=w*.18;
    for(let i=0;i<n;i++)put(f,'brick','trim',a+i*w+g,a+(i+1)*w-g,0,.7,h+1,h+1.55,false);
  };
  // --- 1 đoạn tường dài 26m: cao(7) 8m · bậc · thấp(6) 8m · bậc · cao(7) 8m. only = chỉ dựng đoạn cao đầu tiên. gap = khoảng hở lan can trong (chỗ bước từ thang lên) ---
  const section=(f,uS,only,gap,bs)=>{
    if(bs===undefined)bs=uS+9;   // bs = nơi bắt đầu đoạn thấp 8m (mặc định ở giữa đoạn)
    const sg=[[uS,bs-1,HC],[bs-1,bs,HR],[bs,bs+8,HB],[bs+8,bs+9,HR],[bs+9,uS+26,HC]].slice(0,only?1:5);
    for(const [a,b,h] of sg){
      put(f,'brick','pave',a,b,0,WW,0,h,true);
      rail(f,a,b,h);
      const parts=[];
      if(gap&&gap[1]>a&&gap[0]<b){if(gap[0]>a)parts.push([a,gap[0]]);if(gap[1]<b)parts.push([gap[1],b])}else parts.push([a,b]);
      for(const [p,q] of parts)put(f,'brick','trim',p,q,WW-.5,WW,h,h+.6,h!==HR);
    }
    let lo=1e9,hi=0;for(const s of sg){lo=Math.min(lo,s[2]);hi=Math.max(hi,s[2])}
    col(f,sg[0][0],sg[sg.length-1][1],0,.7,lo,hi+1);   // lan can ngoài: 1 khối va chạm cho cả đoạn
  };
  // --- thang gạch bên hông tường: 12 bậc cao .5m, rộng 2m, đỉnh thang đúng bằng mặt đoạn thấp (6m). dir<0: thang đi xuống về phía u nhỏ ---
  const stair=(f,Bs,Be,dir)=>{
    const st=.75;
    for(let i=0;i<12;i++){const a=dir<0?Bs+st-st*(i+1):Be-st+st*i;put(f,'brick','pave',a,a+st,WW,WW+2,0,HB-.5*i,true)}
  };
  const endcap=(f,a,b)=>put(f,'brick','trim',a,b,0,WW,HC,HC+1,true);

  // 2 thang duy nhất, ở 2 góc chéo nhau: cạnh Bắc (góc Đông-Bắc) và cạnh Nam (góc Tây-Nam). Thang cách tháp góc ~6m (không sát góc).
  // Đoạn thấp 8m [45.75..53.75] của đoạn tường thứ 2; thang đi xuống về phía góc, 12 bậc, hết ở u≈62 (tháp góc bắt đầu ở u=68)
  const STAIR_SIDES=[0,2],SB=45.75;
  for(let f=0;f<4;f++){
    if(f!==2)tower(f,0,false,true,true,false);                // tháp góc (bỏ góc Đông-Nam: chỗ thang lên tầng 3)
    tower(f,34,true,true,false,true);                         // tháp giữa
    const st=STAIR_SIDES.includes(f);
    section(f,8,false,null);
    section(f,42,f===1,st?[SB+5.5,SB+8]:null,st?SB:undefined);   // cạnh Đông chỉ dựng tới z≈12, chừa chỗ thang
    if(st)stair(f,SB,SB+8,1);
    if(f===1)endcap(f,49.3,50);
    if(f===2)endcap(f,8,8.7);
  }

  // xuất mesh
  const M=mats();
  for(const k of KIND){
    const q=Q[k];if(!q.k)continue;
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(q.p,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(q.n,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(q.u,2));
    g.setIndex(q.i);
    const m=new THREE.Mesh(g,M[k]);S.add(m);meshes.push(m);   // meshes: đạn để lại vết trên gạch
  }
  Q=null;
}

// nature.js đọc WallKeeps trong keepOuts() (chỉ áp dụng cho tầng FLOOR): cây / đá / sông / đầu cầu né dải tường
const A0=AF(FLOOR),B=9;
window.WallKeeps={floor:FLOOR,rects:[
  {x0:-A0,x1:A0,z0:-A0,z1:-A0+B},
  {x0:-A0,x1:31,z0:A0-B,z1:A0},
  {x0:-A0,x1:-A0+B,z0:-A0,z1:A0},
  {x0:A0-B,x1:A0,z0:-A0,z1:14}
]};
window.GreatWall={build,floor:FLOOR};
})();
