import {createHash} from 'node:crypto';
import {containsCredential} from './source-credentials.mjs';
export const codeBrainDigest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function projectCodeBrainModel(artifact,scope,existing=[],{visibility,matchLeadProject,repositoryIdentity,CODE_ORIGIN}){
 if(artifact?.version!==1||artifact.visibility!==visibility||artifact.digest!==codeBrainDigest(artifact.files))throw new Error('Invalid Code Brain artifact');
 const entries=[],relationships=[];
 for(const file of artifact.files){
  try{matchLeadProject(scope,file.repositoryUrl);}catch{continue;}
  const repo=new URL(file.repositoryUrl);
  if(repo.origin!==CODE_ORIGIN||repo.username||repo.password||!/^[a-f0-9]{40}$/.test(file.commit)||!/^[a-f0-9]{64}$/.test(file.sha256)||!file.path||file.path.split('/').some(p=>!p||p==='.'||p==='..')||file.chunks.some(chunk=>containsCredential(chunk.text)))throw new Error('Unsafe Code Brain source');
  const namespace=codeBrainDigest(repositoryIdentity(file.repositoryUrl)).slice(0,16);
  const url=`${file.repositoryUrl}/blob/${file.commit}/${file.path.split('/').map(encodeURIComponent).join('/')}`;
  for(const [i,chunk] of file.chunks.entries()){
   if(!Number.isInteger(chunk.start_line)||chunk.start_line<1||chunk.end_line!==chunk.start_line+chunk.text.split('\n').length-1||typeof chunk.text!=='string'||!chunk.text.trim())throw new Error('Invalid Code Brain source geometry');
   const symbol=chunk.symbol_name_qualified||chunk.symbol_name;
   const qualified=symbol?`${namespace}::${symbol}`:null;
   const id=`code-brain-${codeBrainDigest([url,i,chunk.text]).slice(0,24)}`;
   entries.push({id,kind:'code',title:`${repositoryIdentity(file.repositoryUrl).slice(1)} · ${file.path} · ${symbol||'代码片段'}`,text:chunk.text,excerpt:chunk.text,url,rawUrl:url.replace('/blob/','/raw/'),date:null,sha256:file.sha256,commit:file.commit,lineStart:chunk.start_line,lineEnd:chunk.end_line,searchTitle:`${repositoryIdentity(file.repositoryUrl).slice(1)} ${file.path} ${symbol||''}`,tags:[],relatedIds:[],reviewedEngineering:true,personalJudgment:false,engineeringKind:'source-observation',codeMeta:{repository:repositoryIdentity(file.repositoryUrl).slice(1),language:chunk.language,completeSymbol:chunk.complete_symbol===true,symbolName:chunk.symbol_name,symbolType:chunk.symbol_type,qualified,edges:file.edges.filter(edge=>edge.from_chunk_id===i+1).map(edge=>({target:`${namespace}::${edge.to_symbol_qualified}`,type:edge.edge_type}))}});
  }
  for(const source of existing.filter(source=>source.url.startsWith(file.repositoryUrl+'/blob/'+file.commit+'/')))relationships.push({from:url,to:source.url,type:'engineering-repository-navigation'});
 }
 return {entries,relationships};
}
