import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createApp} from '../server/index.mjs';

test('independent server supports assets, isolated seats, races and rejected requests',async()=>{
 const server=createApp();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{
 const tokens=Array.from({length:3},()=>randomUUID());
 const post=async(i,b)=>{const r=await fetch(base+'/api/game',{method:'POST',headers:{'Content-Type':'application/json','X-Seat':tokens[i]},body:JSON.stringify(b)});return [r.status,await r.json()]};
 const get=async(i,code)=>{const r=await fetch(base+'/api/game?room='+code,{headers:{'X-Seat':tokens[i]}});return [r.status,await r.json()]};
 assert.equal((await fetch(base+'/healthz')).status,200);
 const index=await fetch(base+'/');assert.equal(index.status,200);const html=await index.text();const asset=html.match(/src="([^"]+\.js)"/)[1];assert.equal((await fetch(base+asset)).status,200);assert.equal((await fetch(base+'/favicon.svg')).status,200);
 let [status,s]=await post(0,{kind:'create',name:'甲'});assert.equal(status,200);const room=s.code;
 for(let i=1;i<3;i++){[status,s]=await post(i,{kind:'join',room,name:String(i)});assert.equal(status,200)}
 [status,s]=await post(0,{kind:'start',room,revision:s.revision});assert.equal(status,200);assert.equal(s.players[0].coins,2);assert(s.players[1].cards.every(c=>c.role===null));assert(!('deck' in s));assert(!('token' in s.players[0]));
 const wrong=await fetch(base+'/api/game?room='+room,{headers:{'X-Seat':randomUUID()}});assert.equal(wrong.status,400);
 assert.equal((await post(1,{kind:'action',action:'income',room,revision:s.revision}))[0],400);
 [status,s]=await post(0,{kind:'action',action:'tax',room,revision:s.revision});assert.equal(status,200);
 const results=await Promise.all([1,2].map(i=>post(i,{kind:'pass',room,revision:s.revision})));assert.deepEqual(results.map(r=>r[0]).sort(),[200,409]);
 [status,s]=await get(0,room);assert.equal(status,200);const remaining=[1,2].find(i=>!s.phase.passed.includes(s.players[i].id));[status,s]=await post(remaining,{kind:'pass',room,revision:s.revision});assert.equal(status,200);assert.equal(s.phase.type,'turn');assert.equal(s.players[0].coins,5);
 const forged=await fetch(base+'/api/game',{method:'POST',headers:{Origin:'https://other.test','X-Seat':tokens[0]},body:'{}'});assert.equal(forged.status,403);
 const huge=await fetch(base+'/api/game',{method:'POST',headers:{'X-Seat':tokens[0]},body:'x'.repeat(5000)});assert.equal(huge.status,400);
 assert.equal((await get(0,'000000'))[0],404);
 }finally{await new Promise(r=>server.close(r))}
});
