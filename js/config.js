// Cấu hình súng, đạn ban đầu / tối đa, lượng mỗi hộp đạn
const W={pistol:{n:'Súng ngắn',mag:12,rate:.26,dmg:34,hd:100,auto:false,rl:1.6,sp:0},rifle:{n:'Súng dài',mag:30,rate:.09,dmg:20,hd:60,auto:true,rl:2.3,sp:.012},sniper:{n:'Súng ngắm',mag:5,rate:1.2,dmg:100,hd:100,auto:false,rl:3.2,sp:.05},grenade:{n:'Lựu đạn',mag:0,rate:.8,dmg:0,hd:0,auto:false,rl:0,sp:0}};
// Rơi đồ khi hạ bot: DROP_CHANCE = tỉ lệ có rơi (0.4 = 40%), còn lại chia đều cho DROP_TYPES
const DROP_CHANCE=.4,DROP_TYPES=['pistol','rifle','sniper','gren','gold'];
// Màu hào quang của từng loại hộp
const GLOW={pistol:0x4d9dff,rifle:0xff9a3c,sniper:0x4dff9a,gren:0x5fd66f,gold:0xffd23f};
const RES0={pistol:36,rifle:90,sniper:10},RMAX={pistol:72,rifle:180,sniper:15},BOX={pistol:24,rifle:60,sniper:5},GMAX=9;
