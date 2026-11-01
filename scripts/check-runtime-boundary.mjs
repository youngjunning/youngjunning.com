import {assertPublicText} from '../lib/model.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const approvedGbrain='https://codeload.github.com/garrytan/gbrain/tar.gz/88d3f572950a772d268b22afe0bd53c2a2f090ff';
export function assertPublicRuntime(pkg) {
 for(const group of ['dependencies','devDependencies','optionalDependencies']) {
  if(pkg[group]?.['@electric-sql/pglite'])throw Error('PGLite must remain inside the approved GBrain runtime');
  if(pkg[group]?.gbrain&&(group!=='dependencies'||pkg[group].gbrain!==approvedGbrain))throw Error('Public retrieval requires the approved pinned GBrain revision');
 }
}
if(typeof Promise.withResolvers!=='function')throw Error('GBrain requires Node 22; select the configured Node runtime before building');
assertPublicRuntime(JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8')));

assertPublicText(fs.readFileSync(new URL('../lib/chat-model.mjs',import.meta.url),'utf8'));

export function assertNoNativeBrainImports(source,file='') {
 for(const match of source.matchAll(/(?:from\s*|import\s*\(|require(?:\.resolve)?\s*\()\s*['"]([^'"]+)['"]/g)) {
  const specifier=match[1];if(!/gbrain|pglite/.test(specifier))continue;
  const allowed=file==='lib/twin-gbrain.mjs'&&specifier==='gbrain/pglite-engine'||file==='lib/twin-retrieval.mjs'&&specifier==='./twin-gbrain.mjs';
  if(!allowed)throw Error('GBrain imports must use the approved public retrieval boundary');
 }
}
function scan(directory) {
 for (const file of fs.readdirSync(directory,{withFileTypes:true})) {
  const target=new URL(file.name+(file.isDirectory()?'/':''),directory);
  if(file.isDirectory())scan(target);else if(/\.(?:mjs|ts|tsx)$/.test(file.name))assertNoNativeBrainImports(fs.readFileSync(target,'utf8'),path.relative(fileURLToPath(new URL('../',import.meta.url)),fileURLToPath(target)).split(path.sep).join('/'));
 }
}
scan(new URL('../lib/',import.meta.url));
scan(new URL('../app/',import.meta.url));
