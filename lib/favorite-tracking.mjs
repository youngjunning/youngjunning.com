export const priorityLabels={lead:'线索',evaluate:'待评估',reference:'重点参考'};
export const adoptionLabels={unknown:'未核实',not_selected:'未选用',trial:'试用中',adopted:'已选用',retired:'已停用'};
export function validateTracking(item){
 if(!Object.hasOwn(priorityLabels,item.priority??'lead')||!Object.hasOwn(adoptionLabels,item.adoption??'unknown'))throw new Error('Invalid favorite tracking');
 if(!Array.isArray(item.usages??[]))throw new Error('Invalid usages');
 for(const u of item.usages??[]){
  if(!u||Object.keys(u).some(k=>!['project','projectUrl','stage','purpose','evidence'].includes(k))||!['trial','adopted','retired'].includes(u.stage)||['project','purpose','evidence'].some(k=>typeof u[k]!=='string'||!u[k].trim()))throw new Error('Usage needs project, stage, purpose and evidence');
  const url=new URL(u.projectUrl);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error('Invalid project URL');
 }
 if(['trial','adopted'].includes(item.adoption)&&!(item.usages??[]).some(u=>u.stage===item.adoption))throw new Error('Adoption needs matching usage evidence');
}
export function favoriteGraph(favorites){
 const nodes=[],edges=[],seen=new Set();
 const add=n=>{if(!seen.has(n.id)){nodes.push(n);seen.add(n.id)}};
 for(const f of favorites){
  const id='favorite:'+f.id;add({id,label:f.title,type:'favorite',url:'/favorites#'+f.id});
  for(const tag of f.tags){const target='tag:'+tag;add({id:target,label:tag,type:'tag'});edges.push({source:id,target,type:'tagged',evidence:'收藏标签，不表示使用关系'});}
  for(const u of f.usages??[]){const target='project:'+u.projectUrl;add({id:target,label:u.project,type:'project',url:u.projectUrl});edges.push({source:target,target:id,type:'uses',stage:u.stage,evidence:u.evidence,purpose:u.purpose});}
 }
 return {nodes,edges};
}

