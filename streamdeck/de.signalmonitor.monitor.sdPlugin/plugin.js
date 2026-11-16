// Raw Stream Deck WebSocket protocol. Node 24 / Stream Deck 7.1+.
const fs = require('node:fs');
const path = require('node:path');
const argv = process.argv;
const arg = name => argv[argv.indexOf(name)+1];
const port=arg('-port'), uuid=arg('-pluginUUID'), regEvent=arg('-registerEvent');
const cfgPath=path.join(__dirname,'config.json');
const config=JSON.parse(fs.readFileSync(cfgPath,'utf8').replace(/^\uFEFF/,''));
const socket=new WebSocket(`ws://127.0.0.1:${port}`);
const contexts=new Map();
const clean = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const svg = (name,entry,now) => {
 const fresh=entry && (now-entry.updated_at)<45000 && entry.updated_at<=now+10000;
 const dbm=fresh?entry.dbm:null;
 const shade=dbm===null?'#89919f':dbm>=-90?'#34cc77':dbm>=-105?'#f4b544':'#f06a65';
 const state=fresh?`${entry.network}  ${dbm} dBm`:'OFFLINE';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144"><rect width="144" height="144" rx="15" fill="#151b25"/><text x="72" y="28" fill="white" font-family="Arial" font-size="17" text-anchor="middle">${clean(name)}</text><g fill="${shade}"><rect x="31" y="82" width="13" height="15" rx="2"/><rect x="50" y="68" width="13" height="29" rx="2"/><rect x="69" y="53" width="13" height="44" rx="2"/><rect x="88" y="38" width="13" height="59" rx="2"/></g><text x="72" y="122" fill="${shade}" font-family="Arial" font-size="17" font-weight="bold" text-anchor="middle">${clean(state)}</text></svg>`;
};
function send(obj) { if(socket.readyState===WebSocket.OPEN) socket.send(JSON.stringify(obj)); }
let signals={}, serverTime=0, wa=null, waState='OFFLINE', polling=false;
const lines=(text,width=16,max=3)=>{
 const words=String(text||'').replace(/[\r\n\t]+/g,' ').match(/.{1,16}/gu)||[];
 return words.slice(0,max).map((x,i)=>clean(x)+(i===max-1&&words.length>max?'…':''));
};
function waSvg(which){
 let title=which==='wacall'?'ANRUFMELDUNG':which==='watext'?'NACHRICHT':'BENACHRICHT.';
 let content=[waState],color='#89919f';
 if(waState==='OK'){
  color='#25d366';
  if(which==='wacall')content=wa.caller?lines(wa.caller):['Kein Anruf'];
  if(which==='watext')content=wa.sender||wa.text?[...lines(wa.sender,16,1),...lines(wa.text,16,3)]:['Keine Nachricht'];
  if(which==='wacount')content=[String(wa.count),`${wa.chats} Meldungen`];
 }
 const text=content.map((t,i)=>`<text x="72" y="${58+i*20}" text-anchor="middle" font-family="Arial" font-size="${which==='wacount'&&i===0?28:14}" fill="white">${t}</text>`).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144"><rect width="144" height="144" rx="14" fill="#101b17"/><rect x="3" y="3" width="138" height="138" rx="12" fill="none" stroke="${color}" stroke-width="3"/><text x="72" y="25" text-anchor="middle" font-family="Arial" font-size="13" fill="${color}">${title}</text>${text}<text x="72" y="132" text-anchor="middle" font-family="Arial" font-size="11" fill="${color}">XCOVER6 PRO</text></svg>`;
}

async function update() {
 if(polling)return;polling=true;
 try {
  const res=await fetch(config.localUrl.replace(/\/$/,'')+'/v1/signal',{headers:{'Authorization':'Bearer '+config.viewerToken},signal:AbortSignal.timeout(6000)});
  if(!res.ok) throw new Error('HTTP '+res.status);
  const data=await res.json(); signals=Object.fromEntries(data.signals.map(s=>[s.device,s]));serverTime=data.server_time;
 } catch(e) { signals={};serverTime=Date.now(); }
 try{
  const res=await fetch(config.localUrl.replace(/\/$/,'')+'/v1/whatsapp',{headers:{Authorization:'Bearer '+config.viewerToken},signal:AbortSignal.timeout(3000)});
  if(!res.ok){wa=null;waState=res.status===404?'SERVER-UPDATE':'SERVER-FEHLER'}
  else{const d=await res.json();wa=d.whatsapp;waState=!wa?'HANDY OFFLINE':!wa.enabled?'FREIGABE FEHLT':'OK'}
 }catch{wa=null;waState='PC OFFLINE'}
 for (const [context,which] of contexts) {
  if(which.startsWith('wa')){
   send({event:'setTitle',context,payload:{title:'',target:0}});
   send({event:'setImage',context,payload:{image:'data:image/svg+xml;base64,'+Buffer.from(waSvg(which)).toString('base64'),target:0}});continue;
  }
  const dev=which==='fold7'?'fold7':'xcover6';
  const title=dev==='fold7'?'FOLD7':'XCOVER';
  send({event:'setImage',context,payload:{image:'data:image/svg+xml;charset=utf8,'+encodeURIComponent(svg(title,signals[dev],serverTime||Date.now())),target:0}});
 }
 polling=false;
}
socket.addEventListener('open',()=>{
 send({event:regEvent,uuid}); update(); setInterval(update,3000);
});
socket.addEventListener('message',event=>{
 let e;try{e=JSON.parse(event.data)}catch{return}
 if(e.event==='willAppear') {
  const suffix=e.action?.split('.').pop();
  contexts.set(e.context,suffix); update();
 } else if(e.event==='willDisappear') contexts.delete(e.context);
});
