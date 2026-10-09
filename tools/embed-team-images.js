// Nhúng ảnh trong assets/team/ vào src/data/team-images.js (dạng data:) để game chạy được khi mở bằng file://.
// Cách dùng (ở thư mục có index.html):   node tools/embed-team-images.js
// Chạy lại mỗi khi thêm / đổi ảnh. Ảnh nên nhỏ (<= ~250 KB mỗi tấm, cạnh dài <= ~1000 px) để game tải nhanh.
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..'),DIR=path.join(ROOT,'assets','team'),OUT=path.join(ROOT,'src','data','team-images.js');
const MIME={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif'};
function walk(d,o=[]){if(!fs.existsSync(d))return o;for(const f of fs.readdirSync(d)){const p=path.join(d,f),s=fs.statSync(p);if(s.isDirectory())walk(p,o);else if(MIME[path.extname(f).toLowerCase()])o.push(p)}return o}
const files=walk(DIR).sort();let total=0,body='';
for(const f of files){
  const rel=path.relative(ROOT,f).split(path.sep).join('/'),buf=fs.readFileSync(f);total+=buf.length;
  if(buf.length>400*1024)console.warn('! Ảnh lớn ('+Math.round(buf.length/1024)+' KB), nên thu nhỏ: '+rel);
  body+=JSON.stringify(rel)+':'+JSON.stringify('data:'+MIME[path.extname(f).toLowerCase()]+';base64,'+buf.toString('base64'))+',\n';
}
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,'// TỰ SINH bởi tools/embed-team-images.js - đừng sửa tay.\nwindow.PortraitImages={\n'+body+'};\n');
console.log('Đã nhúng '+files.length+' ảnh ('+(total/1048576).toFixed(2)+' MB gốc) vào '+path.relative(ROOT,OUT));
if(total>20*1048576)console.warn('! Tổng ảnh > 20 MB: game sẽ tải chậm, hãy thu nhỏ ảnh.');
