// ============================================================================
// ẢNH + LIÊN KẾT của từng người trên tranh (portrait-info.js đọc file này khi bấm E trước tranh).
// Khóa = tên in trên bảng tên, viết HOA, bỏ dấu và bỏ "PROF." / "DR." (giống guide-bot.js).
//   photo   : ảnh chân dung thật (hiện trong thẻ tên).  Nên là ảnh dọc/vuông, mặt ở nửa trên, ~400-600 px.
//   gallery : ảnh thật ngoài đời / họp báo (ô ảnh tự chuyển mỗi vài giây). Mỗi phần tử là 'đường_dẫn' hoặc {src:'đường_dẫn',cap:'chú thích ngắn'}. Ảnh ngang ~1000 px là đẹp.
//   x, linkedin, web : liên kết (phải bắt đầu bằng https://). Bỏ trống '' = không hiện dòng đó.
// Đường dẫn ảnh tính từ thư mục có index.html, ví dụ 'assets/team/david-song/portrait.jpg'.
// Chạy bằng file:// (bấm đúp index.html): sau khi bỏ ảnh vào assets/team/, chạy  node tools/embed-team-images.js  để nhúng ảnh (xem file đó).
// Link X / LinkedIn đã điền theo danh sách bạn cung cấp (ngày 2026-10-09). Chỉ điền những gì CHẮC CHẮN đúng và được phép dùng; ô nào để trống thì game hiện "NO PHOTOS ADDED YET" / "NO PERSONAL LINKS ADDED YET".
// ============================================================================
window.PortraitMedia={
  // ví dụ (xóa dấu // để dùng):
  // 'DAVID SONG':{photo:'assets/team/david-song/portrait.jpg',gallery:[{src:'assets/team/david-song/apac-tour-1.jpg',cap:'APAC Tour - Singapore'},'assets/team/david-song/press-2.jpg'],x:'https://x.com/ten_tai_khoan',linkedin:'https://www.linkedin.com/in/ten-tai-khoan/',web:''},
  'MURIEL MEDARD':{photo:'',gallery:[],x:'https://x.com/MurielMedard',linkedin:'https://www.linkedin.com/in/murielmedard',web:'https://www.rle.mit.edu/people/muriel-medard/'},
  'KENT LIN':{photo:'',gallery:[],x:'https://x.com/kentlinyy',linkedin:'https://www.linkedin.com/in/kentyeyanglin/',web:''},
  'KISHORI KONWAR':{photo:'',gallery:[],x:'',linkedin:'https://www.linkedin.com/in/kishorikonwar',web:''},
  'ELI LAIPSON':{photo:'',gallery:[],x:'https://x.com/EliLaipson',linkedin:'https://www.linkedin.com/in/eli-laipson-b141181a',web:''},
  'SAJIDA ZOUARHI':{photo:'',gallery:[],x:'https://x.com/sajidazouarhi',linkedin:'https://www.linkedin.com/in/sajidazouarhi',web:''},
  'DAVID SONG':{photo:'',gallery:[],x:'https://x.com/davidgsong',linkedin:'',web:''},
  'NANCY LYNCH':{photo:'',gallery:[],x:'',linkedin:'',web:'https://en.wikipedia.org/wiki/Nancy_Lynch'},
  'SRIRAM VISWANATH':{photo:'',gallery:[],x:'',linkedin:'',web:'https://ece.gatech.edu/directory/sriram-vishwanath'},
  'SWARNA':{photo:'',gallery:[],x:'https://x.com/SinhaSwarnabha',linkedin:'',web:'https://github.com/swarna1101'},  // danh tính (Swarnabha Sinha) chưa có bài chính thức của @get_optimum tag - bạn đã tự xác nhận
  'ABBAS':{photo:'',gallery:[],x:'https://x.com/abbas_tfu',linkedin:'',web:''},
  'FLASH':{photo:'',gallery:[],x:'',linkedin:'',web:''},  // tài khoản cộng đồng chưa xác nhận là cùng người (https://x.com/cryptooflashh) - chỉ bật khi chắc chắn
  'JEFFREY ELLIOTT':{photo:'',gallery:[],x:'https://x.com/blockchainjeff',linkedin:'',web:''},
  'HAR PREET SINGH':{photo:'',gallery:[],x:'https://x.com/h_p_sing',linkedin:'',web:''},
  'LEWEJ WHITELOW':{photo:'',gallery:[],x:'',linkedin:'',web:'https://lewej.work/'},
  'ALAN SUNNY':{photo:'',gallery:[],x:'https://x.com/alansunn3',linkedin:'',web:''},
  'CHANDLER OTTERBEIN':{photo:'',gallery:[],x:'https://x.com/ChandlerOtterbe',linkedin:'https://www.linkedin.com/in/chandler-otterbein-48330b230/',web:''}
};
