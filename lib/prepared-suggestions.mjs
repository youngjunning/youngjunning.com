import {createHash} from 'node:crypto';
// Bump when generation, review or answer retrieval changes: source identity
// alone cannot preserve a previous answerability check across new algorithms.
export const SUGGESTION_POLICY='codex-prepared-suggestions-1';
export const suggestionContentKey=index=>createHash('sha256').update(JSON.stringify([index.entries,index.relationships||[],index.wiki||null])).digest('hex');
export function projectPreparedSuggestions(index,artifact){
 if(artifact?.version!==1||artifact.policy!==SUGGESTION_POLICY||artifact.key!==suggestionContentKey(index)||!Array.isArray(artifact.suggestions))return null;
 const sources=new Map(index.entries.map(source=>[source.id,source]));
 if(artifact.suggestions.some(item=>typeof item.id!=='string'||typeof item.question!=='string'||item.question.length<20||item.question.length>90||!Array.isArray(item.evidence)||!item.evidence.length||item.evidence.some(ref=>typeof ref.quote!=='string'||ref.quote.length<20||ref.quote.length>300||!sources.get(ref.sourceId)?.text.replace(/\s/g,'').includes(ref.quote.replace(/\s/g,'')))))return null;
 return artifact.suggestions.map(({id,question,kind,topic,angle,evidence})=>({id,question,kind,topic,angle,evidence}));
}
