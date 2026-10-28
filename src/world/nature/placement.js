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
  const dz=15.5*(F1K-1);   // nhà dời ra xa tâm +15.5*(F1K-1) m theo z (house.js: HZ=15.5*F1K) -> các vùng cấm của nhà dời theo
  if(f===0)k.push({x0:-3.5*MAPK,x1:3.5*MAPK,z0:12.5*MAPK+dz,z1:19.5*MAPK+dz});
  if(f===0)k.push({x0:-9.2,x1:9.2,z0:9.2+dz,z1:22+dz});   // nhà rubik (world/house.js) + cây cảnh quanh nhà: không mọc cây / đá / sông đè lên (z0=9.2: nhà đã quay mặt về sông nên hiên + bậc thang mới lấn ra phía -z)
  if(f===0&&window.PavilionKeep)k.push(window.PavilionKeep);   // chòi Nhật (world/pavilion.js): không mọc cây / đá, không đào sông, không đặt đầu cầu đè lên chòi
  if(f===0&&window.TeaKeeps)k.push(...window.TeaKeeps);   // 2 bộ bàn trà (world/teaset.js): cây / đá / sông / đầu cầu né ra
  if(f===0&&window.StairGroveKeep)k.push(window.StairGroveKeep);   // rừng cây cao che tường thang lên tầng 2 (world/stairgrove.js): cây / đá / sông / đầu cầu né ra
  if(f===0&&window.BathKeeps)k.push(...window.BathKeeps);   // 2 hồ tắm đá (world/bath.js): cây / đá / sông / đầu cầu né ra
  if(f===0&&window.Statues2Keeps)k.push(...window.Statues2Keeps);   // 2 tượng khổng lồ mới (world/statues2.js): cây / đá / sông / đầu cầu né ra
  // Tầng 2 (f=1): KHÔNG còn vùng cấm của cầu thang (đã bỏ, lên tầng bằng cổng không gian). Suối của tầng 2 do greatwall.js vẽ cố định và đi xuyên qua 2 vùng này -> ô nước bị bỏ, hiện thành mảng xanh vuông cắt ngang mặt nước.
  if(f<NF-1&&f!==1){const A=AS(f),cx=(f%2?1:-1)*(A-2);k.push({x0:cx-3.2,x1:cx+3.2,z0:A-STLf(f)-5,z1:A-.5})}
  if(f>0&&f!==1){const Af=AS(f-1),s=(f-1)%2,a=s?Af-4:-Af,b=s?Af:-Af+4;k.push({x0:a-2,x1:b+2,z0:Af-STLf(f-1)-6,z1:Af-2})}
  return k;
}

Object.assign(NK,{keepOuts,circleRect});
})();
