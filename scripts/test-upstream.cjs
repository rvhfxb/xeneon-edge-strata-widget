'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const pin = JSON.parse(fs.readFileSync(path.join(root,'upstream-assets.json'),'utf8'));
const canonical = text => text.replace(/\r\n/g,'\n');
const hash = text => crypto.createHash('sha256').update(canonical(text)).digest('hex');
async function main() {
  for (const asset of pin.assets) {
    const local = fs.readFileSync(path.join(root,asset.localPath),'utf8');
    assert.equal(hash(local), asset.localSha256, asset.localPath+' differs from the pinned Strata CSS');
    if (process.argv.includes('--upstream')) {
      const url = `https://raw.githubusercontent.com/${pin.repository}/${pin.commit}/${asset.upstreamPath}`;
      const response = await fetch(url,{signal:AbortSignal.timeout(15000)});
      assert.ok(response.ok, 'Cannot read pinned upstream asset: '+response.status);
      const upstream = await response.text();
      assert.equal(hash(upstream),asset.upstreamSha256,'Upstream hash mismatch');
      const expected = asset.fontUrlsAdjusted ? upstream.replaceAll('../fonts/','resources/fonts/') : upstream;
      assert.equal(canonical(local),canonical(expected),'Unexpected CSS changes beyond local font URLs');
    }
  }
  console.log('Pinned Strata '+pin.version+' CSS verified'+(process.argv.includes('--upstream')?' against the upstream commit':' locally'));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
