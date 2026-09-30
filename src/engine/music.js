// Nhạc nền: phát lần lượt (hoặc ngẫu nhiên) các file mp3 trong assets/audio/, tự chuyển bài, tự nhỏ đi khi tạm dừng.
// CÁCH THÊM NHẠC: chép file .mp3 vào assets/audio/ rồi ghi tên file vào mảng files bên dưới.
const MUSIC={
  files:[
    'assets/audio/nhac1.mp3',
    'assets/audio/nhac2.mp3',
    'assets/audio/nhac3.mp3'
  ],
  vol:.35,        // âm lượng khi đang chơi (0..1) - để thấp hơn tiếng súng cho dễ nghe hiệu ứng
  pauseVol:.15,   // âm lượng khi ở màn tạm dừng / thua
  shuffle:true    // true = bốc ngẫu nhiên (không lặp bài vừa phát) · false = phát theo thứ tự
};
(function(){
  if(!MUSIC.files.length)return;
  const au=new Audio();au.preload='auto';au.volume=0;
  let idx=-1,on=true,started=false,bad=0;
  try{if(localStorage.getItem('ba_music')==='0')on=false}catch(e){}
  function next(){
    const n=MUSIC.files.length;
    if(MUSIC.shuffle&&n>1){let i;do i=Math.floor(Math.random()*n);while(i===idx);idx=i}else idx=(idx+1)%n;
    au.src=MUSIC.files[idx];
    if(on&&started)au.play().catch(()=>{});
  }
  au.addEventListener('ended',()=>{bad=0;next()});
  au.addEventListener('playing',()=>{bad=0});
  au.addEventListener('error',()=>{if(++bad<MUSIC.files.length)next()});   // file thiếu / hỏng -> bỏ qua bài đó (dừng hẳn nếu hỏng hết)
  // Trình duyệt chỉ cho phát nhạc sau khi người chơi bấm 1 lần -> bắt đầu khi bấm "Bấm để chơi"
  $('ov').addEventListener('click',()=>{
    started=true;
    if(!on)return;
    if(!au.src)next();else au.play().catch(()=>{});
  });
  // nhạc nhỏ dần / to dần mượt khi vào - ra màn tạm dừng
  setInterval(()=>{
    const tg=on?(playing?MUSIC.vol:MUSIC.pauseVol):0;
    au.volume=Math.max(0,Math.min(1,au.volume+(tg-au.volume)*.2));
  },100);
  document.addEventListener('visibilitychange',()=>{   // chuyển tab thì tắt tiếng, quay lại thì phát tiếp
    if(document.hidden)au.pause();else if(on&&started&&au.src)au.play().catch(()=>{});
  });
  // Nút bật/tắt nhạc ngay trên bảng bắt đầu / tạm dừng (nhớ lựa chọn cho lần sau)
  const b=document.createElement('button');b.className='lb';b.style.margin='8px 0 0';
  const paint=()=>b.textContent=(on?'🔊':'🔇')+' Music';
  paint();
  b.addEventListener('click',e=>{
    e.stopPropagation();on=!on;paint();
    try{localStorage.setItem('ba_music',on?'1':'0')}catch(x){}
    if(on&&started){if(!au.src)next();else au.play().catch(()=>{})}else if(!on)au.pause();
  });
  $('go').before(b);
})();
