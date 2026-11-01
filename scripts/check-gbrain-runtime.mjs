import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';

// Exercise the dynamic engine using only packages present in the actual chat
// deployment trace. Never resolve dependencies from the full checkout.
const root=process.cwd(),base=path.join(root,'.next/server/app/api/chat');
const trace=JSON.parse(fs.readFileSync(path.join(base,'route.js.nft.json'),'utf8'));
const isolated=fs.mkdtempSync(path.join(os.tmpdir(),'public-gbrain-runtime-'));
try {
  let bytes=0;
  for(const entry of trace.files) {
    const source=path.resolve(base,entry),relative=path.relative(root,source);
    if(!relative.startsWith('node_modules/')&&!['package.json','.content/conversation.json','lib/twin-gbrain-assets-loader.mjs'].includes(relative))continue;
    const target=path.join(isolated,relative);
    fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target,fs.constants.COPYFILE_FICLONE);bytes+=fs.statSync(source).size;
  }
  if(!fs.existsSync(path.join(isolated,'lib/twin-gbrain-assets-loader.mjs')))throw Error('Chat trace omitted the GBrain asset loader');
  const require=createRequire(path.join(root,'node_modules/tsx/package.json'));
  await require('esbuild').build({stdin:{contents:`import {createGbrainRetriever} from './lib/twin-gbrain.mjs';export {createGbrainRetriever};`,resolveDir:root},bundle:true,platform:'node',format:'esm',external:['tsx/esm/api'],outfile:path.join(isolated,'adapter.mjs'),logLevel:'silent'});
  fs.writeFileSync(path.join(isolated,'probe.mjs'),`import fs from 'node:fs';
const originalFetch=globalThis.fetch;
globalThis.fetch=(input,...args)=>{if(/^https?:/.test(String(input?.url||input)))throw Error('GBrain build verification must remain offline');return originalFetch(input,...args);};
const {createGbrainRetriever}=await import('./adapter.mjs');
const brain=createGbrainRetriever();
try{const index=JSON.parse(fs.readFileSync('.content/conversation.json'));const found=await brain.retrieve(index,[{role:'user',content:'对照 Evidence 和 Agent Runtime Harness 的文章'}]);if(!found.length)throw Error('GBrain returned no source evidence');console.log(JSON.stringify({gbrainRuntime:'verified-from-chat-deployment-trace',sources:found.length,node:process.version}));}finally{await brain.close();}
`);
  const output=execFileSync(process.execPath,['probe.mjs'],{cwd:isolated,encoding:'utf8',timeout:60000,env:{...process.env,DEEPSEEK_API_KEY:'',OPENAI_API_KEY:''}});
  console.log(output.trim());console.log(JSON.stringify({chatRuntimeMiB:Math.round(bytes/1048576)}));
} finally {fs.rmSync(isolated,{recursive:true,force:true});}
