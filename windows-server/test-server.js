const assert=require('node:assert/strict');const fs=require('node:fs');const cp=require('node:child_process');const path=require('node:path');
const p=path.join(__dirname,'settings.json');let own=false;
if(!fs.existsSync(p)){fs.writeFileSync(p,JSON.stringify({tailscaleIP:'127.0.0.2',viewerToken:'view-secret',deviceTokens:{fold7:'fold-secret',xcover6:'xcover-secret'}}));own=true}
const s=JSON.parse(fs.readFileSync(p));const child=cp.spawn(process.execPath,[path.join(__dirname,'server.js')],{stdio:'ignore'});
const base='http://127.0.0.1:8787';const sleep=t=>new Promise(r=>setTimeout(r,t));
(async()=>{try{
 await sleep(350);
 let r=await fetch(base+'/v1/signal');assert.equal(r.status,401);
 r=await fetch(base+'/v1/signal',{headers:{Authorization:'Bearer '+s.viewerToken}});assert.equal(r.status,200);
 r=await fetch(base+'/v1/signal',{method:'POST',headers:{Authorization:'Bearer '+s.deviceTokens.fold7,'X-Device-Id':'fold7','Content-Type':'application/json'},body:JSON.stringify({dbm:-83,network:'5G'})});assert.equal(r.status,200);
 r=await fetch(base+'/v1/signal',{headers:{Authorization:'Bearer '+s.viewerToken}});let j=await r.json();assert.equal(j.signals.find(x=>x.device==='fold7').dbm,-83);
 console.log('Server: authorization, upload and read OK');
}finally{child.kill();if(own)fs.unlinkSync(p)}})().catch(e=>{console.error(e);process.exitCode=1});
