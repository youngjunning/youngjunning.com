import {assertPublicText} from '../lib/model.mjs';
import fs from 'node:fs';
export function assertPublicRuntime(pkg) {
 for(const name of ['gbrain','@electric-sql/pglite'])if(pkg.dependencies?.[name]||pkg.devDependencies?.[name]||pkg.optionalDependencies?.[name])throw new Error('Public site must not depend on '+name+'; keep its retrieval local');
}
assertPublicRuntime(JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8')));

assertPublicText(fs.readFileSync(new URL('../lib/chat-model.mjs',import.meta.url),'utf8'));

export function assertNoNativeBrainImports(source) {
 if (/(?:from\s*|import\s*\(|require(?:\.resolve)?\s*\()\s*['"][^'"]*(?:gbrain|pglite)/.test(source)) throw new Error('Public runtime cannot import a native brain engine');
}
function scan(directory) {
 for (const file of fs.readdirSync(directory,{withFileTypes:true})) {
  const target=new URL(file.name+(file.isDirectory()?'/':''),directory);
  if(file.isDirectory())scan(target);else if(/\.(?:mjs|ts|tsx)$/.test(file.name))assertNoNativeBrainImports(fs.readFileSync(target,'utf8'));
 }
}
scan(new URL('../lib/',import.meta.url));
scan(new URL('../app/',import.meta.url));
