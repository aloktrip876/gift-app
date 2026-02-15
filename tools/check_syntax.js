const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'script.js');
try {
  const code = fs.readFileSync(file, 'utf8');
  new Function(code);
  console.log('OK');
} catch (err) {
  console.error('SYNTAX_ERROR');
  console.error(err && err.stack ? err.stack : err);
  process.exit(2);
}
