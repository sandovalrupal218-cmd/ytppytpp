import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRoom,join,mutate,view} from './engine.mjs';

const root=path.resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
const rooms=new Map();
const TTL=86400000;
const MAX_ROOMS=1000;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.woff2':'font/woff2'};
const json=(res,value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value))};
function getRoom(code){const row=rooms.get(code);if(row&&Date.now()-row.updated<=TTL)return row;if(row)rooms.delete(code);return null}
function cleanup(){for(const [key,row] of rooms)if(Date.now()-row.updated>TTL)rooms.delete(key)}
setInterval(cleanup,60000).unref();
async function body(req){const chunks=[];let n=0;for await(const chunk of req){n+=chunk.length;if(n>4096)throw new Error('请求过大');chunks.push(chunk)}return JSON.parse(Buffer.concat(chunks).toString('utf8'))}
export function createApp(){return http.createServer(async(req,res)=>{try{
const u=new URL(req.url,'http://localhost');
if(u.pathname==='/healthz')return json(res,{ok:true});
if(u.pathname==='/api/game'){
const token=String(req.headers['x-seat']||'');
if(!/^[a-zA-Z0-9-]{30,80}$/.test(token))return json(res,{error:'座位凭证无效'},400);
if(req.method==='GET'){const code=(u.searchParams.get('room')||'').toUpperCase(),row=getRoom(code);if(!row)return json(res,{error:'房间不存在、已过期或服务器已重启'},404);return json(res,view(row.state,token))}
if(req.method!=='POST')return json(res,{error:'不支持的请求方法'},405);
const origin=req.headers.origin;if(origin&&new URL(origin).host!==req.headers.host)return json(res,{error:'请求来源无效'},403);
const b=await body(req);if(!b||typeof b!=='object'||Array.isArray(b))throw Error('请求格式无效');const name=String(b.name||'').trim().slice(0,16);
if(b.kind==='create'){if(!name)throw Error('请输入昵称');cleanup();if(rooms.size>=MAX_ROOMS)throw Error('当前房间较多，请稍后重试');let code;do{code=crypto.randomUUID().replace(/-/g,'').slice(0,6).toUpperCase()}while(rooms.has(code));const s=createRoom(code,name,token);rooms.set(code,{state:s,updated:Date.now()});return json(res,view(s,token))}
const code=String(b.room||'').toUpperCase(),row=getRoom(code);if(!row)return json(res,{error:'房间不存在、已过期或服务器已重启'},404);
// All state transitions are synchronous after body parsing. One process owns each
// room, so concurrent requests cannot apply against the same revision twice.
const s=structuredClone(row.state);
if(b.kind==='join'){if(!name)throw Error('请输入昵称');if(!s.players.some(p=>p.token===token))join(s,name,token)}else{if(b.revision!==s.revision)return json(res,{error:'牌局已有变化，请查看最新状态后操作'},409);mutate(s,token,b)}
s.revision++;rooms.set(code,{state:s,updated:Date.now()});return json(res,view(s,token));
}
if(!['GET','HEAD'].includes(req.method))return json(res,{error:'不支持的请求方法'},405);
let pathname;try{pathname=decodeURIComponent(u.pathname)}catch{return json(res,{error:'路径无效'},400)}
const filename=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
if(!filename.startsWith(root+path.sep)&&filename!==path.join(root,'index.html'))return json(res,{error:'路径无效'},403);
let data;try{if(!(await stat(filename)).isFile())throw Error();data=await readFile(filename)}catch{return json(res,{error:'页面不存在'},404)}
const ext=path.extname(filename);res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'SAMEORIGIN'});res.end(req.method==='HEAD'?undefined:data);
}catch(e){json(res,{error:e instanceof SyntaxError?'请求格式无效':e.message||'请求失败'},400)}})}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const server=createApp();server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Coup server ready on port '+(process.env.PORT||3000)));const stop=()=>server.close(()=>process.exit(0));process.on('SIGTERM',stop);process.on('SIGINT',stop)}
