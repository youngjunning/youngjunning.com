import fs from 'node:fs';
import path from 'node:path';
import {projectPreparedSuggestions,preparedSuggestionIssues} from '../lib/prepared-suggestions.mjs';
import {retrieveConversationEvidence} from '../lib/twin-knowledge.mjs';
import {retrieveTwinEvidence} from '../lib/twin-retrieval.mjs';
const root=process.cwd(),file=path.join(root,'content/suggestions.json'),snapshot=path.join(root,'.content/conversation.json');
const index=JSON.parse(fs.readFileSync(snapshot,'utf8'));
const artifact=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):undefined;
const suggestions=projectPreparedSuggestions(index,artifact);
if(!suggestions?.length)throw new Error('Prepared suggestions are missing or stale:\n'+preparedSuggestionIssues(index,artifact).join('\n'));
const retrievalIssues=[];
for(const item of suggestions){
 const retrieve=item.kind==='code'?retrieveTwinEvidence:retrieveConversationEvidence;
 const found=retrieve(index,[{role:'user',content:item.question}]);
 for(const ref of item.evidence)if(!found.some(source=>source.id===ref.sourceId&&source.text.replace(/\s/g,'').includes(ref.quote.replace(/\s/g,''))))retrievalIssues.push(`${item.id}: answer retrieval no longer returns ${ref.sourceId}`);
}
if(retrievalIssues.length)throw new Error('Prepared suggestions need a new answer-retrieval review:\n'+retrievalIssues.join('\n'));
index.preparedSuggestions=artifact;
fs.writeFileSync(snapshot+'.pending',JSON.stringify(index));fs.renameSync(snapshot+'.pending',snapshot);
console.log(JSON.stringify({suggestions:'prepared-files-only',count:suggestions.length,modelCalls:0}));
