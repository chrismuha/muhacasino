const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../slot-experience.js'), 'utf8');
const start = source.indexOf('    function roundWinUSD(');
const end = source.indexOf('\n    }', start) + 6;
if (start < 0) throw new Error('Missing shared whole-dollar award policy');
module.exports = vm.runInNewContext(`(${source.slice(start, end)})`);
