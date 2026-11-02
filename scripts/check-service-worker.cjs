const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {runInNewContext}=require('node:vm');
const path=require('node:path');

function worker(){
 const listeners={},stored=new Map();let online=true,networkCalls=0;
 runInNewContext(readFileSync(path.join(__dirname,'../service-worker.js'),'utf8'),{
  URL,self:{location:{origin:'https://casino.test'},addEventListener:(type,fn)=>listeners[type]=fn},
  caches:{match:async request=>stored.get(request.url),open:async()=>({put:async(request,response)=>stored.set(request.url,response)})},
  fetch:async request=>{networkCalls++;if(!online)throw Error('offline');return new Response(`fresh ${request.url}`)},
 });
 return {stored,get networkCalls(){return networkCalls},setOffline(){online=false},async request(file){
  const request={url:`https://casino.test/${file}`,method:'GET',mode:'cors'},pending=[];let response;
  listeners.fetch({request,respondWith:value=>response=value,waitUntil:value=>pending.push(value)});
  const result=await response;await Promise.all(pending);return result;
 }};
}
for(const file of ['launcher.js?build=current','safe-area.css?build=current','games/monopoly-deal/main.mjs'])test(`${file}: refresh replaces stale code; offline uses the updated cache`,async()=>{
 const w=worker(),url=`https://casino.test/${file}`;
 w.stored.set(url,new Response('stale'));
 assert.equal(await (await w.request(file)).text(),`fresh ${url}`);
 assert.equal(w.networkCalls,1);
 w.setOffline();assert.equal(await (await w.request(file)).text(),`fresh ${url}`);
});
test('artwork still uses the cached response without a network request',async()=>{
 const w=worker();w.stored.set('https://casino.test/cover.jpg',new Response('artwork'));
 assert.equal(await (await w.request('cover.jpg')).text(),'artwork');assert.equal(w.networkCalls,0);
});
