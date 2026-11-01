import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const base=fileURLToPath(new URL('.',import.meta.url));
const result=await Bun.build({entrypoints:[base+'main.tsx'],target:'browser',minify:true,define:{'process.env.NODE_ENV':JSON.stringify('production')}});
if(!result.success)throw new Error(result.logs.join('\n'));
const js=await result.outputs[0].text(),css=readFileSync(base+'style.css','utf8'),notice=readFileSync(base+'NOTICE.md','utf8');
const html='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>俊宁 · Magic UI 主页 Demo</title><style>'+css+'</style></head><body><div id="root"></div><noscript>此交互 Demo 需要启用 JavaScript。</noscript><script>'+js.replaceAll('</script','<\\/script')+'</script><!--\n'+notice+'\n--></body></html>';
const dest=process.argv[2]||'/tmp/junning-magic-preview/index.html';mkdirSync(dest.slice(0,dest.lastIndexOf('/')),{recursive:true});writeFileSync(dest,html);console.log(JSON.stringify({file:dest,bytes:Buffer.byteLength(html),components:['BlurFade','MagicCard','BorderBeam','BentoGrid'],bundled:true}));
