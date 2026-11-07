import {createHash} from 'node:crypto';
// Bump when generation, review or answer retrieval changes. Unrelated content
// must not invalidate questions whose reviewed sources are unchanged.
export const SUGGESTION_POLICY='codex-prepared-suggestions-2';
export const suggestionContentKey=(index,suggestions)=>{
 const sources=new Map(index.entries.map(source=>[source.id,source]));
 const ids=[...new Set(suggestions.flatMap(item=>(item.evidence||[]).map(ref=>ref.sourceId)))].sort();
 const revisions=ids.map(id=>{
  const source=sources.get(id);
  return source?[id,source.sha256,source.kind,source.title,source.url,source.text]:[id,null];
 });
 return createHash('sha256').update(JSON.stringify(revisions)).digest('hex');
};
export function preparedSuggestionIssues(index,artifact){
 if(!artifact)return ['content/suggestions.json is missing'];
 if(artifact.version!==1||artifact.policy!==SUGGESTION_POLICY||!Array.isArray(artifact.suggestions))return ['content/suggestions.json has an outdated format or review policy'];
 if(!artifact.suggestions.length)return ['content/suggestions.json has no reviewed questions'];
 const sources=new Map(index.entries.map(source=>[source.id,source]));
 const issues=[];
 for(const item of artifact.suggestions){
  if(typeof item.id!=='string'||typeof item.question!=='string'||item.question.length<20||item.question.length>90||!Array.isArray(item.evidence)||!item.evidence.length){issues.push(`Invalid question: ${item?.id||'(missing id)'}`);continue;}
  for(const ref of item.evidence){
   const source=sources.get(ref.sourceId);
   if(!source)issues.push(`${item.id}: source ${ref.sourceId} is missing`);
   else if(typeof ref.quote!=='string'||ref.quote.length<20||ref.quote.length>300||!source.text.replace(/\s/g,'').includes(ref.quote.replace(/\s/g,'')))issues.push(`${item.id}: quote no longer matches ${ref.sourceId}`);
  }
 }
 if(artifact.key!==suggestionContentKey(index,artifact.suggestions))issues.push('Reviewed source fingerprint changed; update content/suggestions.json after checking the cited sources');
 return issues;
}
export function projectPreparedSuggestions(index,artifact){
 if(preparedSuggestionIssues(index,artifact).length)return null;
 return artifact.suggestions.map(({id,question,kind,topic,angle,evidence})=>({id,question,kind,topic,angle,evidence}));
}
