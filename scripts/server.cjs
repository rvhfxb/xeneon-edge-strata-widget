'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const PORT = 5199;
const DEFAULT_UPSTREAM = 'http://127.0.0.1:8086';
function validateUpstream(value) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['127.0.0.1','localhost','[::1]'].includes(url.hostname) ||
      url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('strataUrl must be a local HTTP server origin, e.g. http://127.0.0.1:8086');
  }
  return url.origin;
}
function readConfig() {
  const configPath = path.resolve(__dirname, '../helper.config.json');
  if (!fs.existsSync(configPath)) return DEFAULT_UPSTREAM;
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, ''));
  return validateUpstream(config.strataUrl);
}
const root = path.resolve(__dirname, '../widget');
const origins = new Set(['null', 'file://', 'http://127.0.0.1:5199', 'http://localhost:5199']);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.json':'application/json'};
function json(res, status, value) { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(value)); }
function createProvider(fetcher = fetch, upstream = DEFAULT_UPSTREAM) {
  upstream = validateUpstream(upstream);
  let snapshot = {available:false,timestamp:null,error:'connecting'}, pending = null, attemptAt = 0;
  async function refresh() {
    const results = await Promise.allSettled(['/health','/metrics'].map(async endpoint => {
      const response = await fetcher(upstream + endpoint, {method:'GET', redirect:'error', signal:AbortSignal.timeout(4000)});
      if (response.status === 401) throw new Error('auth_required');
      if (!response.ok) throw new Error('upstream_unavailable');
      const value = await response.json(); return value;
    }));
    if (results.some(r => r.status === 'rejected')) { snapshot = {available:false,timestamp:Date.now(),error:results.some(r => r.reason?.message === 'auth_required') ? 'auth_required' : 'upstream_unavailable'}; return snapshot; }
    const [health,metrics] = results.map(r => r.value);
    if (health?.service !== 'strata' || !metrics || typeof metrics !== 'object' || !metrics.engine || !metrics.live) { snapshot = {available:false,timestamp:Date.now(),error:'invalid_strata_response'}; return snapshot; }
    snapshot = {available:true,timestamp:Date.now(),health,metrics}; return snapshot;
  }
  return {async read() { if (pending) return pending; if (Date.now() - attemptAt < 1500) return snapshot; attemptAt = Date.now(); pending = refresh(); try { return await pending; } finally { pending = null; } }};
}
function createServer(provider = createProvider()) {
  const server = http.createServer(async (req,res) => {
    res.setHeader('X-Content-Type-Options','nosniff');
    if (!['127.0.0.1:5199','localhost:5199'].includes(req.headers.host)) return json(res,403,{error:'host_not_allowed'});
    let url; try { url = new URL(req.url,'http://127.0.0.1:5199'); } catch (_) { return json(res,400,{error:'invalid_url'}); }
    const origin = req.headers.origin;
    if (origin && !origins.has(origin)) return json(res,403,{error:'origin_not_allowed'});
    if (url.pathname.startsWith('/api/')) {
      res.setHeader('Access-Control-Allow-Origin',origin || 'null'); res.setHeader('Vary','Origin'); res.setHeader('Access-Control-Allow-Private-Network','true'); res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');
      if (url.pathname !== '/api/snapshot') return json(res,404,{error:'not_found'});
      if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
      if (req.method !== 'GET') return json(res,405,{error:'method_not_allowed'});
      try { return json(res,200,await provider.read()); } catch (_) { return json(res,503,{available:false,error:'helper_unavailable'}); }
    }
    if (!['GET','HEAD'].includes(req.method)) return json(res,405,{error:'method_not_allowed'});
    let file; try { file = path.resolve(root,'.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)); } catch (_) { return json(res,400,{error:'invalid_path'}); }
    if (!file.startsWith(root + path.sep)) return json(res,403,{error:'path_not_allowed'});
    fs.readFile(file,(error,data) => { if (error) return json(res,404,{error:'not_found'}); res.writeHead(200,{'Content-Type':types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache'}); res.end(req.method === 'HEAD' ? undefined : data); });
  });
  server.requestTimeout = 5000; server.headersTimeout = 5000;
  return server;
}
if (require.main === module) {
  try {
    const upstream = readConfig();
    const server = createServer(createProvider(fetch, upstream));
    server.on('error',e => { console.error(e.code === 'EADDRINUSE' ? 'Port 5199 is already in use. Stop the other helper or reuse its /api/snapshot.' : e.message); process.exitCode = 1; });
    server.listen(PORT,'127.0.0.1',() => console.log('Strata Edge: http://127.0.0.1:' + PORT + ' -> ' + upstream));
    for (const signal of ['SIGINT','SIGTERM']) process.on(signal,() => server.close());
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
module.exports = {createProvider,createServer,validateUpstream,readConfig};
