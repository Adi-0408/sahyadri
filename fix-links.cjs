const fs = require('fs');
let c = fs.readFileSync('src/public-pages/Home/index.tsx', 'utf8');
c = c.replace(/navigate\('\/properties'\)/g, "navigate('/projects')");
c = c.replace(/to="\/properties\?type=rent"/g, 'to="/projects"');
c = c.replace(/to="\/properties\?type=sale"/g, 'to="/projects"');
c = c.replace(/navigate\(`\/properties\?\$\{params\.toString\(\)\}`\)/g, "navigate(`/projects?${params.toString()}`)");
fs.writeFileSync('src/public-pages/Home/index.tsx', c);
console.log('Fixed Home links');
