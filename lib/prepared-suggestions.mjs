import {createHash} from 'node:crypto';
import {retrieveConversationEvidence} from './twin-knowledge.mjs';
// Bump when generation, review or answer retrieval changes.
export const SUGGESTION_POLICY='codex-prepared-suggestions-2';
export function suggestionContentKey(index,suggestions){
 const sources=new Map(index.entries.map(source=>[source.id,source]));
 const reviewed=[...new Set(suggestions.flatMap(item=>item.evidence.map(ref=>ref.sourceId)))].sort().map(id=>{
  const source=sources.get(id);
  return [id,source?.url,source?.sha256];
 });
 return createHash('sha256').update(JSON.stringify([SUGGESTION_POLICY,reviewed])).digest('hex');
}
export function projectPreparedSuggestions(index,artifact){
 if(artifact?.version!==1||artifact.policy!==SUGGESTION_POLICY||!Array.isArray(artifact.suggestions)||!artifact.suggestions.length)return null;
 if(artifact.suggestions.some(item=>typeof item.id!=='string'||typeof item.question!=='string'||item.question.length<20||item.question.length>90||!Array.isArray(item.evidence)||!item.evidence.length||item.evidence.some(ref=>typeof ref.sourceId!=='string')))return null;
 if(artifact.key!==suggestionContentKey(index,artifact.suggestions))return null;
 const sources=new Map(index.entries.map(source=>[source.id,source]));
 if(artifact.suggestions.some(item=>{
  const retrieved=new Set(retrieveConversationEvidence(index,[{role:'user',content:item.question}]).map(source=>source.id));
  return item.evidence.some(ref=>typeof ref.quote!=='string'||ref.quote.length<20||ref.quote.length>300||!sources.get(ref.sourceId)?.text.replace(/\s/g,'').includes(ref.quote.replace(/\s/g,''))||!retrieved.has(ref.sourceId));
 }))return null;
 return artifact.suggestions.map(({id,question,kind,topic,angle,evidence})=>({id,question,kind,topic,angle,evidence}));
}
