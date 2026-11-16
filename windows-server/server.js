// Private local + Tailscale-only receiver, Node.js 22+; no npm packages.
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const settings=JSON.parse(fs.readFileSync(path.join(__dirname,'settings.json'),'utf8').replace(/^\uFEFF/,''));
const signals={};const batteries={};let whatsapp=null;const PORT=8787;
function equal(a,b){const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&crypto.timingSafeEqual(x,y)}
function reply(res,code,obj){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(obj))}
const handler=(req,res)=>{
 if(whatsapp && Date.now()-whatsapp.updated_at>=60000)whatsapp=null;
 const url=new URL(req.url,'http://local');
 if(req.method==='GET'&&url.pathname==='/health')return reply(res,200,{ok:true});
 if(url.pathname==='/v1/whatsapp'){
  const auth=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  if(req.method==='GET'){
   if(!equal(auth,settings.viewerToken))return reply(res,401,{error:'unauthorized'});
   const fresh=whatsapp && Date.now()-whatsapp.updated_at<60000;
   return reply(res,200,{server_time:Date.now(),whatsapp:fresh?whatsapp:null});
  }
  if(req.method!=='POST')return reply(res,405,{error:'method_not_allowed'});
  if(req.headers['x-device-id']!=='xcover6'||!equal(auth,settings.deviceTokens.xcover6))return reply(res,401,{error:'unauthorized'});
  let raw='';req.on('data',c=>{raw+=c;if(raw.length>8192)req.destroy()});
  req.on('end',()=>{
   let b;try{b=JSON.parse(raw)}catch{return reply(res,400,{error:'invalid_json'})}
   const str=(v,max)=>typeof v==='string'&&v.length<=max;
   if(!b||!Number.isInteger(b.count)||b.count<0||b.count>9999||!Number.isInteger(b.chats)||b.chats<0||b.chats>9999||!str(b.sender,120)||!str(b.text,500)||!str(b.caller,120)||typeof b.enabled!=='boolean')return reply(res,400,{error:'invalid_snapshot'});
   whatsapp={count:b.count,chats:b.chats,sender:b.sender,text:b.text,caller:b.caller,enabled:b.enabled,updated_at:Date.now()};
   reply(res,200,{ok:true});
  });return;
 }
 if(url.pathname==='/v1/battery'){
  const auth=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  if(req.method==='GET'){
   if(!equal(auth,settings.viewerToken))return reply(res,401,{error:'unauthorized'});
   return reply(res,200,{server_time:Date.now(),batteries:Object.values(batteries)});
  }
  const dev=req.headers['x-device-id'];
  if(req.method!=='POST')return reply(res,405,{error:'method_not_allowed'});
  if(!['fold7','xcover6'].includes(dev)||!equal(auth,settings.deviceTokens[dev]))return reply(res,401,{error:'unauthorized'});
  let raw='';let oversized=false;req.on('data',c=>{raw+=c;if(raw.length>2048){oversized=true;req.destroy()}});
  req.on('end',()=>{
   if(oversized)return;let body;try{body=JSON.parse(raw)}catch{return reply(res,400,{error:'invalid_json'})}
   if(!Number.isInteger(body.level)||body.level<0||body.level>100||typeof body.charging!=='boolean')return reply(res,400,{error:'invalid_battery'});
   batteries[dev]={device:dev,level:body.level,charging:body.charging,updated_at:Date.now()};
   reply(res,200,{ok:true});
  });return;
 }
 if(url.pathname!=='/v1/signal')return reply(res,404,{error:'not_found'});
 const auth=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(req.method==='GET'){
  if(!equal(auth,settings.viewerToken))return reply(res,401,{error:'unauthorized'});
  return reply(res,200,{server_time:Date.now(),signals:Object.values(signals)});
 }
 if(req.method!=='POST')return reply(res,405,{error:'method_not_allowed'});
 const dev=req.headers['x-device-id'];
 if(!['fold7','xcover6'].includes(dev)||!equal(auth,settings.deviceTokens[dev]))return reply(res,401,{error:'unauthorized'});
 let raw='';req.on('data',chunk=>{raw+=chunk;if(raw.length>2048)req.destroy()});
 req.on('end',()=>{
  let body;try{body=JSON.parse(raw)}catch{return reply(res,400,{error:'invalid_json'})}
  const {dbm,network}=body;
  if(!Number.isInteger(dbm)||dbm < -160||dbm > -20||!['2G','3G','4G','5G','UNKNOWN'].includes(network))return reply(res,400,{error:'invalid_measurement'});
  signals[dev]={device:dev,dbm,network,updated_at:Date.now()};
  return reply(res,200,{ok:true});
 });
};
for(const address of ['127.0.0.1',settings.tailscaleIP]){
 const s=http.createServer(handler);s.listen(PORT,address,()=>console.log(`Signal Monitor: http://${address}:${PORT}`));s.on('error',e=>{console.error(`${address}: ${e.message}`);process.exitCode=1});
}
console.log('Only use over Tailscale, never forward port 8787 on your router.');
