'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'battery-test-'));fs.copyFileSync(path.join(__dirname,'server.js'),path.join(dir,'server.js'));
fs.writeFileSync(path.join(dir,'settings.json'),JSON.stringify({tailscaleIP:'127.0.0.2',viewerToken:'viewer',deviceTokens:{fold7:'fold',xcover6:'cover'}}));
const child=cp.spawn(process.execPath,[path.join(dir,'server.js')]);const base='http://127.0.0.1:8787';
const post=(id,token,body)=>fetch(base+'/v1/battery',{method:'POST',headers:{Authorization:'Bearer '+token,'X-Device-Id':id},body:JSON.stringify(body)});
(async()=>{try{
 for(let i=0;i<50;i++){try{await fetch(base+'/health');break}catch{await new Promise(r=>setTimeout(r,50))}}
 assert.equal((await fetch(base+'/v1/battery')).status,401);
 assert.equal((await post('fold7','cover',{level:78,charging:true})).status,401);
 for(const level of [-1,101,1.5,'80',null])assert.equal((await post('fold7','fold',{level,charging:true})).status,400);
 assert.equal((await post('fold7','fold',{level:0,charging:false})).status,200);
 assert.equal((await post('xcover6','cover',{level:100,charging:true})).status,200);
 const data=await(await fetch(base+'/v1/battery',{headers:{Authorization:'Bearer viewer'}})).json();
 assert.equal(data.batteries.length,2);assert.equal(data.batteries.find(x=>x.device==='fold7').level,0);assert.equal(data.batteries.find(x=>x.device==='xcover6').charging,true);
 assert.ok(data.batteries.every(x=>Number.isInteger(x.updated_at)));
 assert.equal((await fetch(base+'/v1/signal',{method:'POST',headers:{Authorization:'Bearer fold','X-Device-Id':'fold7'},body:JSON.stringify({dbm:-85,network:'5G'})})).status,200);
 const sig=await(await fetch(base+'/v1/signal',{headers:{Authorization:'Bearer viewer'}})).json();assert.equal(sig.signals[0].dbm,-85);
 console.log('PASS: battery authentication, device isolation, validation, 0/100%, timestamps, existing signal API');
 }finally{child.kill();await new Promise(r=>child.once('exit',r));fs.rmSync(dir,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
