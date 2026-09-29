// Trạng thái người chơi và cờ điều khiển
// ---- Player ----
const P={x:0,y:0,z:16*MAPK,vy:0,r:.35,h:1.7,hp:100,ground:false};
let yaw=0,pitch=0,slideT=0,slideCd=0,sd={x:0,z:0},eye=1.6,cd=0,rel=0,kills=0,cur='pistol',bt=0,scoped=false,bolt=0,boltMax=.15;
let ammos={pistol:12,rifle:30,sniper:5},reserve={...RES0},gren=3,gcd=0;
let throwT=0,thrown=false,prevW='pistol';let holding=false,autoP=false,holdT=0,wt=0,tpow=14;const TH=.35;
let playing=false,dead=false,locked=false,lockedOnce=false,md=false;
const keys={};
