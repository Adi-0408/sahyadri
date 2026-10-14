const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      content = content
        .replace(/bg-\[#0b1326\]/g, 'bg-slate-50')
        .replace(/text-slate-100/g, 'text-slate-900')
        .replace(/text-white/g, 'text-slate-900')
        .replace(/text-slate-400/g, 'text-slate-600')
        .replace(/text-slate-300/g, 'text-slate-600')
        .replace(/bg-slate-950\/40/g, 'bg-white')
        .replace(/bg-slate-950\/20/g, 'bg-white')
        .replace(/bg-slate-900\/40/g, 'bg-slate-50')
        .replace(/border-white\/10/g, 'border-slate-200')
        .replace(/border-white\/5/g, 'border-slate-200')
        .replace(/border-white\/15/g, 'border-slate-200')
        .replace(/glass-pane/g, '')
        .replace(/text-glow/g, '')
        .replace(/bg-slate-950\/65/g, 'bg-white')
        .replace(/bg-slate-950\/60/g, 'bg-white')
        .replace(/glass=\{true\}/g, '');
        
      fs.writeFileSync(fullPath, content);
      console.log(`Updated ${fullPath}`);
    }
  }
}

processDir(path.join(__dirname, 'src/admin'));
