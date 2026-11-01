import {assertPublicText} from '../lib/model.mjs';
import fs from 'node:fs';

export function assertPublicRuntime(pkg){
 for(const group of ['dependencies','devDependencies','optionalDependencies']){
  if(pkg[group]?.gbrain||pkg[group]?.['@electric-sql/pglite'])throw Error('Public retrieval must use local source files only');
 }
}
export function assertNoBrainImports(source){
 for(const match of source.matchAll(/(?:from\s*|import\s*\(|require(?:\.resolve)?\s*\()\s*['"]([^'"]+)['"]/g)){
  if(/gbrain|pglite/i.test(match[1]))throw Error('Native brain imports are not permitted');
 }
}
assertPublicRuntime(JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8')));
assertPublicText(fs.readFileSync(new URL('../lib/chat-model.mjs',import.meta.url),'utf8'));
for(const directory of ['lib','app']){
 const walk=url=>{for(const file of fs.readdirSync(url,{withFileTypes:true})){const target=new URL(file.name+(file.isDirectory()?'/':''),url);if(file.isDirectory())walk(target);else if(/\.(?:mjs|ts|tsx)$/.test(file.name))assertNoBrainImports(fs.readFileSync(target,'utf8'));}};
 walk(new URL('../'+directory+'/',import.meta.url));
}
