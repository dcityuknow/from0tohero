// Máy chủ nhỏ cho Block Arena (không cần cài thêm gói, Node 16+):
//  1) phục vụ các file của game (thay cho `python -m http.server`)
//  2) API /api/engravings: lưu tên khắc trên tường để mọi người chơi cùng thấy (dữ liệu: data/engravings.json)
// Chạy: đặt thư mục server/ cạnh index.html rồi `node server/server.js`  ->  http://localhost:8000
// Biến môi trường: PORT (8000) · ADMIN_TOKEN (đặt để xóa được bảng tên xấu: DELETE /api/engravings/<id> kèm header X-Admin-Token)
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..'),DATA=path.join(ROOT,'data','engravings.json');
const PORT=+process.env.PORT||8000,ADMIN=process.env.ADMIN_TOKEN||'';
// phải khớp world.js / level.js (MAPK, FH, SLAB, NF)
const MAPK=1.5,FH=16,SLAB=2.4,NF=4,GAP=.35,MAX_TOTAL=5000,COOLDOWN=8000;
const AF=f=>Math.round((20+5*f)*MAPK),WH=f=>f<NF-1?FH-SLAB:FH-1;

let DB=[];try{DB=JSON.parse(fs.readFileSync(DATA,'utf8'))}catch(e){}
let wt=null;
const persist=()=>{clearTimeout(wt);wt=setTimeout(()=>{try{fs.mkdirSync(path.dirname(DATA),{recursive:true});fs.writeFileSync(DATA+'.tmp',JSON.stringify(DB));fs.renameSync(DATA+'.tmp',DATA)}catch(e){console.error(e)}},500)};
const lastPost={};

function clean(b){
  if(!b||typeof b!=='object')return null;
  const f=b.f|0,s=b.s|0,u=+b.u,v=+b.v,w=+b.w,h=+b.h;
  if(f<0||f>=NF||s<0||s>3||![u,v,w,h].every(Number.isFinite)||w<1||w>10||h<.5||h>2)return null;
  if(Math.abs(u)+w/2>AF(f)||v-h/2<0||v+h/2>WH(f))return null;           // bảng phải nằm trọn trên tường
  const name=Array.from(String(b.name||'').normalize('NFC').replace(/[^\p{L}\p{M}\p{Nd} _.'\-]/gu,'').replace(/\s+/g,' ').trim()).slice(0,20).join('');
  if(!name)return null;
  return {f,s,u:+u.toFixed(2),v:+v.toFixed(2),w:+w.toFixed(2),h:+h.toFixed(2),name};
}
const free=r=>!DB.some(e=>e.f===r.f&&e.s===r.s&&Math.abs(e.u-r.u)<(e.w+r.w)/2+GAP&&Math.abs(e.v-r.v)<(e.h+r.h)/2+GAP);

const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, X-Admin-Token','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS'};
const send=(res,code,obj)=>{res.writeHead(code,{...CORS,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj))};
function body(req,max,cb){let n=0,s='';req.on('data',c=>{n+=c.length;if(n>max){req.destroy();return}s+=c});req.on('end',()=>{try{cb(null,JSON.parse(s))}catch(e){cb(e)}});req.on('error',cb)}

function api(req,res,p){
  if(req.method==='OPTIONS'){res.writeHead(204,CORS);return res.end()}
  if(p==='/api/engravings'){
    if(req.method==='GET')return send(res,200,DB);
    if(req.method==='POST'){
      const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',')[0].trim(),now=Date.now();
      if(now-(lastPost[ip]||0)<COOLDOWN)return send(res,429,{error:'slow down'});
      return body(req,4096,(err,b)=>{
        const r=err?null:clean(b);if(!r)return send(res,400,{error:'invalid'});
        if(DB.length>=MAX_TOTAL)return send(res,507,{error:'full'});
        if(!free(r))return send(res,409,{error:'taken'});
        lastPost[ip]=now;r.id=now.toString(36)+Math.random().toString(36).slice(2,6);r.ts=now;DB.push(r);persist();send(res,201,r);
      });
    }
  }
  const m=p.match(/^\/api\/engravings\/([\w-]+)$/);
  if(m&&req.method==='DELETE'){
    if(!ADMIN||req.headers['x-admin-token']!==ADMIN)return send(res,403,{error:'forbidden'});
    const n=DB.length;DB=DB.filter(e=>e.id!==m[1]);persist();return send(res,200,{deleted:n-DB.length});
  }
  send(res,404,{error:'not found'});
}

const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.txt':'text/plain; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.mp3':'audio/mpeg'};
const BLOCK=/^\/(server|data|\.git|node_modules)(\/|$)/i;
function serve(res,fp,retry){
  fs.readFile(fp,(e,buf)=>{
    if(e){if(!retry&&e.code==='EISDIR')return serve(res,path.join(fp,'index.html'),true);res.writeHead(404);return res.end('Not found')}
    res.writeHead(200,{'Content-Type':MIME[path.extname(fp).toLowerCase()]||'application/octet-stream'});res.end(buf);
  });
}
http.createServer((req,res)=>{
  let p;try{p=decodeURIComponent(new URL(req.url,'http://x').pathname)}catch(e){res.writeHead(400);return res.end()}
  if(p.startsWith('/api/'))return api(req,res,p);
  const fp=path.join(ROOT,p==='/'?'index.html':p);
  if(!fp.startsWith(ROOT)||BLOCK.test(p)){res.writeHead(403);return res.end('Forbidden')}
  serve(res,fp);
}).listen(PORT,()=>console.log('Block Arena: http://localhost:'+PORT+'  ·  khắc tên lưu tại '+DATA));
