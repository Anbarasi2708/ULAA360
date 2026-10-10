const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'public', 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'));

const audit = {};

files.forEach(file => {
  const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
  const lines = content.split('\n');
  if (lines.length > 0) {
    audit[file] = {
      totalRows: lines.length - 1,
      columns: lines[0].trim().split(',')
    };
  }
});

console.log(JSON.stringify(audit, null, 2));
