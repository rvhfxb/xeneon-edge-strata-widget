const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = process.argv[2] || require('node:path').join(__dirname, '../widget/index.html');
const html = fs.readFileSync(path, 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1];
assert.ok(head, 'Missing head');
const titles = head.match(/<title>.*?<\/title>/g) || [];
assert.equal(titles.length, 1, 'Exactly one title is required');
assert.ok(head.split(/\r?\n/).some(line => line.trim() === titles[0]), 'Title must occupy its own line');
for (const tag of head.match(/<(?:meta|link)\b[^>]*>/g) || []) {
  assert.ok(tag.endsWith('/>'), 'Head void elements must self-close');
}
const groups = head.match(/id="x-icue-groups">([\s\S]*?)<\/script>/)?.[1];
assert.ok(groups, 'Missing settings groups');
assert.ok(!/[^\x00-\x7f]/.test(groups), 'Use JSON Unicode escapes for iCUE group headings');
const parsed = JSON.parse(groups);
assert.ok(Array.isArray(parsed) && parsed.length > 0, 'Groups array must be a non-empty array');
console.log('Import check PASSED for ' + path + '! Groups length: ' + parsed.length);
