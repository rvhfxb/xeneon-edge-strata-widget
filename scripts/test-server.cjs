'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const {createServer,createProvider,validateUpstream,readConfig} = require('./server.cjs');
test('bridge accepts only read-only localhost requests and approved widget origins',async () => {
  const server = createServer({read:async () => ({available:true,timestamp:Date.now()})});
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  async function request(url, headers = {}, method = 'GET') { return new Promise((resolve,reject) => { const req = http.request({hostname:'127.0.0.1',port:server.address().port,path:url,method,headers:{Host:'127.0.0.1:5199',...headers}},res => { let body=''; res.on('data',d => body+=d); res.on('end',() => resolve({status:res.statusCode,headers:res.headers,body})); }); req.on('error',reject); req.end(); }); }
  try {
    const file = await request('/api/snapshot',{Origin:'file://'}); assert.equal(file.status,200); assert.equal(file.headers['access-control-allow-origin'],'file://');
    assert.equal((await request('/api/snapshot',{Host:'evil.test'})).status,403);
    assert.equal((await request('/api/snapshot',{Origin:'https://evil.test'})).status,403);
    assert.equal((await request('/api/snapshot',{},'POST')).status,405);
    assert.equal((await request('/api/unload')).status,404);
    assert.equal((await request('/%2e%2e%2fREADME.md')).status,403);
    assert.equal((await request('/')).status,200);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test('configuration accepts local origins and rejects credentials, remote hosts and API paths', () => {
  assert.equal(validateUpstream('http://localhost:8080/'), 'http://127.0.0.1:8080');
  assert.equal(validateUpstream('http://[::1]:8080'), 'http://[::1]:8080');
  assert.throws(() => validateUpstream('bad URL'), /strataUrl must be a local HTTP server origin/);
  for (const url of ['https://127.0.0.1:8086', 'http://example.com', 'http://127.0.0.1:8086/v1', 'http://user:pass@127.0.0.1:8086', 'http://127.0.0.1:8086/?key=secret']) {
    assert.throws(() => validateUpstream(url));
  }
});
test('missing config/key and null key use the default; malformed configuration is actionable', t => {
  const fs=require('node:fs'), os=require('node:os'), path=require('node:path');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'strata-edge-config-')), file=path.join(dir,'config.json');
  t.after(()=>{fs.unlinkSync(file);fs.rmdirSync(dir);});
  assert.equal(readConfig(file),'http://127.0.0.1:8086');
  for (const config of [{},{strataUrl:null}]) {
    fs.writeFileSync(file,JSON.stringify(config)); assert.equal(readConfig(file),'http://127.0.0.1:8086');
  }
  for (const config of [null,[],'text']) {
    fs.writeFileSync(file,JSON.stringify(config)); assert.throws(()=>readConfig(file),/must contain a JSON object/);
  }
  fs.writeFileSync(file,JSON.stringify({strataUrl:'bad URL'}));assert.throws(()=>readConfig(file),/strataUrl must be/);
});
test('custom local upstream remains GET-only and reports authorization failures', async () => {
  const calls = [];
  const provider = createProvider(async (url, options) => {
    calls.push({url, method:options.method, redirect:options.redirect});
    return {status:401, ok:false};
  }, 'http://127.0.0.1:18080');
  assert.equal((await provider.read()).error, 'auth_required');
  assert.deepEqual(calls, ['/health','/metrics'].map(endpoint => ({url:'http://127.0.0.1:18080'+endpoint, method:'GET', redirect:'error'})));
});
test('partial upstream failure clears values and never carries previous metrics',async () => {
  const upstream = [];
  const ok = createProvider(async url => { upstream.push(url); return {ok:true,json:async () => url.endsWith('/health') ? {service:'strata',loaded:true} : {engine:{},live:{},hardware:{gpu_util:0}}}; });
  const snapshot = await ok.read(); assert.equal(snapshot.available,true); assert.equal(snapshot.metrics.hardware.gpu_util,0);
  assert.deepEqual(upstream.sort(),['http://127.0.0.1:8086/health','http://127.0.0.1:8086/metrics']);
  const partial = createProvider(async url => { if (url.endsWith('/metrics')) throw new Error('unreachable'); return {ok:true,json:async () => ({service:'strata',loaded:true})}; });
  assert.deepEqual(Object.keys(await partial.read()).sort(),['available','error','timestamp']);
  const other = createProvider(async () => ({ok:true,json:async () => ({service:'other',engine:{},live:{}})}));
  assert.equal((await other.read()).error,'invalid_strata_response');
});
