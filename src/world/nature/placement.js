// ============================================================================
// nature/placement.js - Vùng cấm đặt vật thể (chỗ người chơi xuất hiện, chân/đầu thang, cổng, nhà, chòi, tượng...).
// (Tách ra từ nature.js cũ. Chia sẻ với các file nature/ khác qua NK = window.NatureKit.)
// ============================================================================
(function(){
const NK=window.NatureKit=window.NatureKit||{};


// ---- Vùng cấm đặt vật thể: chỗ người chơi xuất hiện, chân/đầu thang, cổng ----
const circleRect=(x,z,r,k)=>{const dx=Math.max(k.x0-x,0,x-k.x1),dz=Math.max(k.z0-z,0,z-k.z1);return dx*dx+dz*dz<r*r};

function keepOuts(f){
  const k=[];
  if(f===0)k.push({x0:-3.5*MAPK,x1:3.5*MAPK,z0:12.5*MAPK,z1:19.5*MAPK});
  if(f===0)k.push({x0:-9.2,x1:9.2,z0:10.5,z1:22});   // nhà rubik (world/house.js) + cây cảnh quanh nhà: không mọc cây / đá / sông đè lên
  if(f===0&&window.PavilionKeep)k.push(window.PavilionKeep);   // chòi Nhật (world/pavilion.js): không mọc cây / đá, không đào sông, không đặt đầu cầu đè lên chòi
  if(f===0&&window.TeaKeeps)k.push(...window.TeaKeeps);   // 2 bộ bàn trà (world/teaset.js): cây / đá / sông / đầu cầu né ra
  if(f===0&&window.StairGroveKeep)k.push(window.StairGroveKeep);   // rừng cây cao che tường thang lên tầng 2 (world/stairgrove.js): cây / đá / sông / đầu cầu né ra
  if(f===0&&window.BathKeeps)k.push(...window.BathKeeps);   // 2 hồ tắm đá (world/bath.js): cây / đá / sông / đầu cầu né ra
  if(f<NF-1){const A=AS(f),cx=(f%2?1:-1)*(A-2);k.push({x0:cx-3.2,x1:cx+3.2,z0:A-STLf(f)-5,z1:A-.5})}
  if(f>0){const Af=AS(f-1),s=(f-1)%2,a=s?Af-4:-Af,b=s?Af:-Af+4;k.push({x0:a-2,x1:b+2,z0:Af-STLf(f-1)-6,z1:Af-2})}
  return k;
}

Object.assign(NK,{keepOuts,circleRect});
})();
