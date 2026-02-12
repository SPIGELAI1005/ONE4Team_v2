const fs = require('fs');
const path = require('path');

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (p.endsWith('.tsx')) {
      const c = fs.readFileSync(p, 'utf8');
      if (c.includes('MobileBottomNav')) {
        const n = (c.match(/<MobileBottomNav/g) || []).length;
        if (n > 1) console.log('DUPLICATE', p, n);
      }
    }
  }
}

walk(path.join(__dirname, '..', 'src', 'pages'));
