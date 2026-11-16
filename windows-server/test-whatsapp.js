'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'battery-test-'));fs.copyFileSync(path.join(__dirname,'server.js'),path.join(dir,'server.js'));
fs.writeFileSync(path.join(dir,'settings.json'),JSON.stringify({tailscaleIP:'127.0.0.2',viewerToken:'viewer',deviceTokens:{fold7:'fold',xcover6:'cover'}}));
const child=cp.spawn(process.execPath,[path.join(dir,'server.js')]);const base='http://127.0.0.1:8787';
const post=(id,token,body)=>fetch(base+'/v1/battery',{method:'POST',headers:{Authorization:'Bearer '+token,'X-Device-Id':id},body:JSON.stringify(body)});
(async()=>{try{
 for(let i=0;i<50;i++){try{await fetch(base+'/health');break}catch{await new Promise(r=>setTimeout(r,50))}}
 const body={enabled:true,count:3,chats:2,sender:'Test <name>',text:'Hallo & willkommen',caller:''};
 const send=(id,token,b)=>fetch(base+'/v1/whatsapp',{method:'POST',headers:{Authorization:'Bearer '+token,'X-Device-Id':id},body:JSON.stringify(b)});
 const get=()=>fetch(base+'/v1/whatsapp',{headers:{Authorization:'Bearer viewer'}});
 assert.equal((await fetch(base+'/v1/whatsapp')).status,401);
 assert.equal((await send('fold7','fold',body)).status,401);
 assert.equal((await send('xcover6','wrong',body)).status,401);
 for(const bad of [{count:-1},{count:1.2},{text:'a'.repeat(501)},{enabled:'true'},{sender:null}])assert.equal((await send('xcover6','cover',{...body,...bad})).status,400);
 assert.equal((await send('xcover6','cover',body)).status,200);
 let data=await(await get()).json();assert.equal(data.whatsapp.count,3);assert.equal(data.whatsapp.sender,body.sender);assert.ok(data.whatsapp.updated_at);
 assert.equal((await send('xcover6','cover',{...body,enabled:false,count:0,chats:0,text:'',sender:''})).status,200);
 data=await(await get()).json();assert.equal(data.whatsapp.enabled,false);assert.equal(data.whatsapp.text,'');
 console.log('PASS: WhatsApp auth, XCover isolation, field validation, snapshots and opt-out');
 }finally{child.kill();await new Promise(r=>child.once('exit',r));fs.rmSync(dir,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
