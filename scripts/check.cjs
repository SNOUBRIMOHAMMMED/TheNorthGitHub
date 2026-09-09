const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
for(const f of ['core.js','app.js','workspace.js','sw.js'])execFileSync(process.execPath,['--check',path.join(root,f)],{stdio:'inherit'});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length,'Duplicate HTML IDs');
for(const [,file] of html.matchAll(/(?:src|href)="([^"#]+)"/g))if(!file.includes('://'))assert.ok(fs.existsSync(path.join(root,file)),`Missing asset ${file}`);
JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
console.log('Syntax, unique IDs, linked assets and manifest checks passed.');
