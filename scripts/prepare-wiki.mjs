import fs from 'node:fs';
import path from 'node:path';
import { planWiki, projectWiki, WIKI_VERSION, WIKI_POLICY } from '../lib/twin-wiki.mjs';

const root=process.cwd(), file=path.join(root,'content/wiki.json'), snapshot=path.join(root,'.content/conversation.json');
const index=JSON.parse(fs.readFileSync(snapshot,'utf8'));
const artifact=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):undefined;
if(artifact&&(artifact.version!==WIKI_VERSION||artifact.policy!==WIKI_POLICY||!Array.isArray(artifact.pages)))throw new Error('Wiki format is invalid; ask Codex to prepare content/wiki.json before building');
const wiki=projectWiki(index,artifact);
const planned=planWiki(index,artifact?.modelKey||'codex-prepared-v1');
if(process.argv.includes('--plan')){
 const directory=path.join(root,'.cache/wiki-preparation');fs.mkdirSync(directory,{recursive:true});
 fs.writeFileSync(path.join(directory,'plan.json'),JSON.stringify({policy:WIKI_POLICY,modelKey:artifact?.modelKey||'codex-prepared-v1',pages:planned},null,2)+'\n');
 console.log(JSON.stringify({wiki:'codex-plan',pages:planned.length,modelCalls:0}));
}else{
 const originals=new Set((index.engineeringPages||[]).map(page=>page.id));
 const prepared=wiki.pages.filter(page=>!originals.has(page.id));
 const next={...index,wiki};fs.writeFileSync(snapshot+'.pending',JSON.stringify(next));fs.renameSync(snapshot+'.pending',snapshot);
 console.log(JSON.stringify({wiki:'prepared-files-only',preparedPages:prepared.length,plannedPages:planned.length,missingOrStalePages:planned.length-prepared.length,originalSourceFallback:true,modelCalls:0}));
}
