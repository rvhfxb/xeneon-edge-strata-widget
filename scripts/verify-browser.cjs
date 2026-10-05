'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.argv[2] || path.join(root, 'dist/browser-check'));
const chrome = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA]
  .filter(Boolean).map(p => path.join(p, 'Google/Chrome/Application/chrome.exe')).find(p => fs.existsSync(p));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const fixture = {
  available:true, health:{service:'strata',loaded:true,model:'Strata test model'}, metrics:{
    live:{state:'idle',queued:0},
    engine:{max_context:262144,expert_slots:6671,expert_cache_mib:19933},
    hardware:{gpu_util:40,gpu_mem_used:20*1073741824,gpu_mem_total:32*1073741824,gpu_temp:50,gpu_power:100,gpu_power_limit:575,cpu:10,ram_used:70*1073741824,ram_total:128*1073741824},
    hardware_static:{gpu_name:'Test GPU',cores:16,threads:32,psutil:false},
    history:{tok_s:[0,70,75,0],prefill_tok_s_mean:Array(60).fill(0),gpu_util:[40,null,40]},
    requests:[{time:1801720000,prompt_tokens:10000,reused:9900,prompt_ms:1000,output_tokens:100,decode_tok_s:75,duration_s:3,finish:'stop'}]
  }
};
async function main() {
  assert.ok(chrome, 'Google Chrome is required'); fs.mkdirSync(out, {recursive:true});
  const profile = fs.mkdtempSync(path.join(os.tmpdir(),'strata-edge-check-'));
  const child = spawn(chrome, ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--no-default-browser-check',
    '--remote-debugging-port=0','--remote-debugging-address=127.0.0.1','--force-device-scale-factor=1','--user-data-dir='+profile,'about:blank'],
    {windowsHide:true,stdio:['ignore','ignore','pipe']});
  let socket, session, send; const report = {exceptions:[],checks:[]};
  try {
    const endpoint = await new Promise((resolve,reject) => {
      let log=''; const timer=setTimeout(()=>reject(new Error('Chrome startup timeout')),15000);
      child.on('error',e=>{clearTimeout(timer);reject(e);});
      child.stderr.on('data',d=>{log+=d;const m=log.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/\S+)/);if(m){clearTimeout(timer);resolve(m[1]);}});
    });
    socket=new WebSocket(endpoint); await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
    let next=0; const pending=new Map();
    socket.addEventListener('message',({data})=>{
      const m=JSON.parse(data); if(m.id && pending.has(m.id)){const p=pending.get(m.id);clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}
      if(m.method==='Runtime.exceptionThrown') report.exceptions.push(m.params.exceptionDetails);
    });
    send=(method,params={},sessionId=session)=>new Promise((resolve,reject)=>{
      const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(new Error(method+' timeout'));},15000);
      pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
    });
    const {targetId}=await send('Target.createTarget',{url:'about:blank'},null);
    ({sessionId:session}=await send('Target.attachToTarget',{targetId,flatten:true},null));
    await send('Page.enable'); await send('Runtime.enable');
    const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value;};
    await send('Page.addScriptToEvaluateOnNewDocument',{source:'window.widgetTheme="dark";window.__snapshot='+JSON.stringify(fixture)+';window.__fail=false;window.__stale=false;window.fetch=async()=>{if(window.__fail)throw Error("offline");return {ok:true,json:async()=>({...window.__snapshot,timestamp:Date.now()-(window.__stale?11000:0)})}};'});
    const page = pathToFileURL(path.join(root,'widget/index.html')).href+'?check';
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:360,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url:page}); await delay(700);
    const text=async id=>evaluate(`document.getElementById(${JSON.stringify(id)}).textContent`);
    assert.equal(await text('pill-text'),'Idle');
    assert.equal(await text('mv-prefill'),'100t/s');
    const graph=await evaluate('document.querySelector("#sp-prefill .line").getAttribute("d")');
    assert.ok(graph.split(/[ML]/).filter(Boolean).every(p=>p.endsWith(',30.00')));
    report.checks.push({name:'official idle Prefill numeric/graph behavior',prefill:await text('mv-prefill')});
    await evaluate('document.getElementById("theme-btn").click();window.icueEvents.onDataUpdated()');
    assert.equal(await evaluate('document.documentElement.dataset.theme'),'light');
    await send('Page.reload'); await delay(600);
    assert.equal(await evaluate('document.documentElement.dataset.theme'),'light');
    await evaluate('window.widgetTheme="light";window.icueEvents.onDataUpdated();window.widgetTheme="dark";window.icueEvents.onDataUpdated()');
    assert.equal(await evaluate('document.documentElement.dataset.theme'),'dark');
    report.checks.push({name:'header survives unchanged iCUE callbacks and reload; changed property applies'});
    await evaluate('window.__snapshot.metrics.live={state:"reading",prompt_read:500,prompt_total:1000,prefill_tok_s_mean:1800};window.__snapshot.metrics.history.prefill_tok_s_mean=[0,1500,1800]');await delay(2100);
    assert.equal(await text('pill-text'),'Reading prompt · 50%');assert.equal(await text('mv-prefill'),'1,800t/s');
    report.checks.push({name:'reading speed and progress'});
    await evaluate('window.__snapshot.metrics.live={state:"generating",generated:200,max_tokens:512,tok_s:77,prefill_tok_s_mean:1800};window.__snapshot.metrics.requests[0].finish="error";window.__snapshot.health.model="<img src=x onerror=alert(1)>"');await delay(2100);
    assert.equal(await text('mv-speed'),'77.0t/s');assert.equal(await evaluate('document.getElementById("model").children.length'),0);
    report.checks.push({name:'generation and safe server text'});
    for (const theme of ['dark','light']) for(const [width,height] of [[2560,720],[1280,360],[736,207]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      await evaluate(`window.widgetTheme=${JSON.stringify(theme)};window.icueEvents.onDataUpdated();window.dispatchEvent(new Event('resize'))`); await delay(600);
      const layout=JSON.parse(await evaluate('document.body.dataset.check'));assert.deepEqual(layout.bad,[]);
      report.checks.push({name:`layout ${width}x${height} ${theme}`,layout});
      const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(out,`${width}x${height}-${theme}.png`),Buffer.from(shot.data,'base64'));
    }
    await evaluate('window.__snapshot.metrics.live={state:"idle",queued:0};window.__snapshot.health.loaded=false'); await delay(2100);
    assert.equal(await text('pill-text'),'Model not loaded'); report.checks.push({name:'unloaded state'});
    await evaluate('window.__stale=true'); await delay(2100);
    assert.equal(await text('pill-text'),'Server not reachable'); assert.equal(await text('mv-speed'),'–');report.checks.push({name:'stale data clears speed'});
    await evaluate('window.__stale=false;window.__snapshot.available=false;window.__snapshot.error="auth_required"');await delay(2100);
    assert.equal(await text('pill-text'),'API key needed');report.checks.push({name:'authentication failure'});
    await evaluate('window.__fail=true');await delay(2100);
    assert.equal(await text('pill-text'),'Server not reachable');assert.equal(await text('mv-prefill'),'–');report.checks.push({name:'network failure clears values'});
    assert.deepEqual(report.exceptions,[]);
  } finally {fs.writeFileSync(path.join(out,'behavior.json'),JSON.stringify(report,null,2));socket?.close();child.kill();}
  console.log(`Browser checks passed: ${report.checks.length}; JS exceptions: ${report.exceptions.length}; ${out}`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
