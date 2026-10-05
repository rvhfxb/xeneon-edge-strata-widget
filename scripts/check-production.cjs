'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const source = fs.readFileSync(path.resolve(__dirname,'../widget/app.js'),'utf8');
assert.ok(!source.includes('dataset.check') && !source.includes('?check') && !source.includes('location.search'), 'Development layout checks must not ship');
console.log('Production widget contains no query-enabled layout diagnostics');
