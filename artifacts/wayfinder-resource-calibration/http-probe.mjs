// THROWAWAY resource probe; real loopback/disk, not the production Host or a remote acceptance test.
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import {readFileSync, statfsSync, createReadStream, createWriteStream} from 'node:fs';
import {Readable, Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {setTimeout as delay} from 'node:timers/promises';
import path from 'node:path';
import {performance} from 'node:perf_hooks';

const MiB=2**20, GiB=2**30, reserve=8*GiB, rssLimit=256*MiB;
const cases={stream64:{size:64*MiB},stream512:{size:512*MiB,rate:256*MiB},stream2g:{size:2*GiB,rate:256*MiB},stream16g:{size:16*GiB,rate:256*MiB},
  idle500:{size:4*MiB,pause:1000,idle:500},idle10000:{size:4*MiB,pause:1000,idle:10000},slow4:{size:4*MiB,pause:1000,idle:10000,rate:512*1024},
  'cancel-upload':{size:64*MiB,cancelUpload:8*MiB},'cancel-download':{size:16*MiB,cancelDownload:8*MiB},oversize:{size:16*MiB,cap:8*MiB},selfcheck:{size:4*MiB}};
const [scratch,name]=process.argv.slice(2), cfg=cases[name];
assert.ok(cfg && path.basename(scratch||'').startsWith('zotero-budget-prototype-'),'explicit owned scratch root and named case required');
const free=()=>{const s=statfsSync(scratch);return s.bavail*s.bsize;};
assert.ok(free()>2*cfg.size+reserve,'disk preflight reserve');
const own=await fs.mkdtemp(path.join(scratch,`http-${name}-`));
const token=crypto.randomBytes(24).toString('hex');
const marker=path.join(own,'.owner'); await fs.writeFile(marker,token,{flag:'wx'});
const target=path.join(own,'host-target.bin'),part=path.join(own,'host.part'),dest=path.join(own,'agent-target.bin'),destPart=path.join(own,'agent.part');
const sentinel=Buffer.from('PROTOTYPE OLD CONTENT');
await fs.writeFile(target,sentinel); await fs.writeFile(dest,sentinel);
const started=performance.now(), files=[target,part,dest,destPart], sockets=new Set(), handlers=new Set();
const state={uploadRead:0,uploadSent:0,downloadRead:0,downloadSent:0,serverOutcome:null,peakDiskAllocated:0,peakDiskLogical:0,peakRssBytes:0,baselineRssBytes:process.memoryUsage().rss,fatal:null};
let server,monitor,deadline,timing={},outcome='failed',error=null;
const memory=()=>Number(readFileSync('/proc/self/status','utf8').match(/^VmHWM:\s+(\d+)/m)?.[1])*1024;
async function sample(){
  state.peakRssBytes=Math.max(state.peakRssBytes,memory());
  let allocated=0,logical=0;
  for(const f of files){try{const s=await fs.stat(f);allocated+=s.blocks*512;logical+=s.size;}catch(e){if(e.code!=='ENOENT')throw e;}}
  state.peakDiskAllocated=Math.max(state.peakDiskAllocated,allocated); state.peakDiskLogical=Math.max(state.peakDiskLogical,logical);
  assert.ok(state.peakRssBytes<rssLimit,'process VmHWM safety ceiling'); assert.ok(free()>reserve,'disk runtime reserve');
}
function stop(e){if(!state.fatal)state.fatal=e;for(const s of sockets)s.destroy(e);}
async function durableRename(from,to){const f=await fs.open(from,'r+');try{await f.sync();}finally{await f.close();}await fs.rename(from,to);}
async function remove(f){try{await fs.unlink(f);}catch(e){if(e.code!=='ENOENT')throw e;}}
const block=Buffer.alloc(MiB);let seed=0x13579bdf;
for(let i=0;i<block.length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;block[i]=seed&255;}
const digestStart=performance.now(), expectedHash=crypto.createHash('sha256');
for(let n=0;n<cfg.size;n+=block.length)expectedHash.update(block.subarray(0,Math.min(block.length,cfg.size-n)));
const expected=expectedHash.digest('hex');timing.expectedDigestSeconds=(performance.now()-digestStart)/1000;
async function* paced(source,rate,counter){const start=performance.now();let count=0;
  for await(const chunk of source){if(state.fatal)throw state.fatal;count+=chunk.length;state[counter]+=chunk.length;
    if(rate){const wait=count/rate*1000-(performance.now()-start);if(wait>0)await delay(wait);}yield chunk;}}
async function* bytes(request){for(let n=0;n<cfg.size;n+=block.length){
  if(cfg.cancelUpload && n>=cfg.cancelUpload){const e=Object.assign(new Error('planned upload interruption'),{code:'PROBE_ABORT'});request.destroy(e);throw e;}
  if(cfg.pause && n===MiB)await delay(cfg.pause);
  yield block.subarray(0,Math.min(block.length,cfg.size-n));}}
async function handle(req,res){
  try{
    if(req.headers.authorization!==`Bearer ${token}`){res.writeHead(401).end();return;}
    if(req.method==='POST' && req.url==='/upload'){
      if(Number(req.headers['content-length'])>(cfg.cap??cfg.size)){state.serverOutcome='admission_rejection';res.writeHead(413,{'Connection':'close'}).end('{}');return;}
      req.setTimeout(cfg.idle??60000,()=>{state.serverOutcome='idle_timeout';req.destroy(Object.assign(new Error('idle timeout'),{code:'PROBE_IDLE'}));});
      res.writeContinue();const hash=crypto.createHash('sha256');
      const tap=new Transform({transform(chunk,_encoding,done){state.uploadRead+=chunk.length;hash.update(chunk);done(null,chunk);}});
      try{
        await pipeline(req,tap,createWriteStream(part,{flags:'wx',highWaterMark:MiB}));
        assert.equal(state.uploadRead,cfg.size);assert.equal(hash.digest('hex'),expected);
        await durableRename(part,target);state.serverOutcome='committed';await sample();
        res.writeHead(201,{'Content-Type':'application/json'}).end(JSON.stringify({bytes:state.uploadRead,sha256:expected}));
      }catch(e){await remove(part);if(!state.serverOutcome)state.serverOutcome='request_interrupted';throw e;}
    }else if(req.method==='GET' && req.url==='/download'){
      res.writeHead(200,{'Content-Length':cfg.size,'X-Probe-Sha256':expected});
      await pipeline(Readable.from(paced(createReadStream(target,{highWaterMark:MiB}),cfg.rate,'downloadSent')),res);
    }else res.writeHead(404).end();
  }catch(e){if(!res.headersSent && !res.destroyed)res.writeHead(500).end();if(!cfg.cancelUpload&&!cfg.cancelDownload&&name!=='idle500')stop(e);}
}
async function responseBody(res){const chunks=[];let count=0;for await(const c of res){count+=c.length;assert.ok(count<=65536);chunks.push(c);}return JSON.parse(Buffer.concat(chunks).toString()||'{}');}
async function upload(port){
  const done=Promise.withResolvers();let writer=Promise.resolve();
  const req=http.request({host:'127.0.0.1',port,path:'/upload',method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Length':cfg.size,Expect:'100-continue'}},res=>{
    responseBody(res).then(data=>done.resolve({status:res.statusCode,data}),done.reject);});
  req.on('socket',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});req.on('error',done.reject);
  req.on('continue',()=>{writer=pipeline(Readable.from(paced(bytes(req),cfg.rate,'uploadSent')),req);writer.catch(done.reject);});req.flushHeaders();
  try{const result=await done.promise;await writer;return result;}finally{await writer.catch(()=>{});req.destroy();}
}
async function download(port){
  const done=Promise.withResolvers();
  const req=http.get({host:'127.0.0.1',port,path:'/download',headers:{Authorization:`Bearer ${token}`}},res=>done.resolve(res));req.on('error',done.reject);
  req.on('socket',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});
  try{
    const res=await done.promise;assert.equal(res.statusCode,200);const hash=crypto.createHash('sha256');
    const tap=new Transform({transform(chunk,_encoding,cb){state.downloadRead+=chunk.length;hash.update(chunk);
      if(cfg.cancelDownload && state.downloadRead>=cfg.cancelDownload)cb(Object.assign(new Error('planned download interruption'),{code:'PROBE_ABORT'}));else cb(null,chunk);}});
    await pipeline(res,tap,createWriteStream(destPart,{flags:'wx',highWaterMark:MiB}));
    assert.equal(state.downloadRead,cfg.size);assert.equal(hash.digest('hex'),expected);await durableRename(destPart,dest);await sample();
  }finally{req.destroy();await remove(destPart);}
}
try{
  await sample();server=http.createServer();server.requestTimeout=0;
  server.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});
  const dispatch=(req,res)=>{const p=handle(req,res);handlers.add(p);p.then(()=>handlers.delete(p),()=>handlers.delete(p));};
  server.on('request',dispatch);server.on('checkContinue',dispatch);
  const ready=Promise.withResolvers();server.once('error',ready.reject);server.listen(0,'127.0.0.1',ready.resolve);await ready.promise;
  monitor=setInterval(()=>{sample().catch(stop);},100);deadline=setTimeout(()=>stop(new Error('case deadline')),600000);
  const port=server.address().port;const uploadStart=performance.now();let uploadResult,uploadError;
  try{uploadResult=await upload(port);}catch(e){uploadError={code:e.code,message:e.message};}
  await Promise.allSettled([...handlers]);timing.uploadSeconds=(performance.now()-uploadStart)/1000;
  if(name==='oversize'){
    assert.equal(uploadResult?.status,413);assert.equal(state.uploadRead,0);assert.equal(state.uploadSent,0);assert.deepEqual(await fs.readFile(target),sentinel);outcome='admission_rejection';
  }else if(name==='idle500' || cfg.cancelUpload){
    assert.ok(uploadError);assert.equal(state.serverOutcome,name==='idle500'?'idle_timeout':'request_interrupted');assert.deepEqual(await fs.readFile(target),sentinel);
    assert.equal(await fs.stat(part).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;}),false);outcome=name==='idle500'?'idle_rejection':'client_abort';
  }else{
    assert.equal(uploadResult?.status,201,JSON.stringify(uploadError));assert.equal(uploadResult.data.sha256,expected);await sample();
    if(name.startsWith('stream') || name==='selfcheck' || cfg.cancelDownload){
      const start=performance.now();let downloadError;
      try{await download(port);}catch(e){downloadError={code:e.code,message:e.message};}
      await Promise.allSettled([...handlers]);timing.downloadSeconds=(performance.now()-start)/1000;
      if(cfg.cancelDownload){assert.equal(downloadError?.code,'PROBE_ABORT');assert.deepEqual(await fs.readFile(dest),sentinel);outcome='client_abort';}
      else{assert.equal(downloadError,undefined,JSON.stringify(downloadError));assert.equal((await fs.stat(dest)).size,cfg.size);outcome='complete';}
    }else outcome='complete';
  }
  if(state.fatal)throw state.fatal;
}catch(e){error={name:e.name,message:e.message,code:e.code};process.exitCode=1;}
finally{
  clearInterval(monitor);clearTimeout(deadline);for(const socket of sockets)socket.destroy();
  if(server?.listening){const done=Promise.withResolvers();server.close(done.resolve);await done.promise;}
  await Promise.allSettled([...handlers]);await sample().catch(e=>{if(!error){error={message:e.message};process.exitCode=1;}});
  assert.equal(await fs.readFile(marker,'utf8'),token);
  for(const f of files)await remove(f);await fs.unlink(marker);await fs.rmdir(own);
}
console.log(JSON.stringify({evidenceLayer:'throwaway-resource-prototype',case:name,outcome,error,plannedBytes:cfg.size,configuredRateBytesPerSecond:cfg.rate??null,
  idleBudgetMs:cfg.idle??60000,pauseMs:cfg.pause??0,elapsedSeconds:(performance.now()-started)/1000,timing,metrics:state,
  processScope:'combined single Node HTTP server/client process',peakMemorySource:'Linux /proc/self/status VmHWM',rusageMaxRssDiagnosticKiB:process.resourceUsage().maxRSS,
  hash:expected,syntheticPattern:'seeded xorshift repeating 1MiB block, not user content',fsync:'file data fsynced before promotion; directory fsync not measured',
  cleanupComplete:true,limits:'loopback only; candidate implementation uses Expect100Continue; not current Host, remote throughput, queue or new workflow proof'}));
