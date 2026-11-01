import {projectCodeBrainModel} from './code-brain-model.mjs';
import {matchLeadProject,repositoryIdentity,CODE_ORIGIN,validateLeadScope} from './code-platform.mjs';
export {codeBrainDigest} from './code-brain-model.mjs';
import {assertContentAudience} from './audience-policy.mjs';
export function projectCodeBrain(artifact,scope,existing=[]){
  validateLeadScope(scope);
  assertContentAudience(JSON.stringify(artifact),'public');
  return projectCodeBrainModel(artifact,scope,existing,{visibility:'public',matchLeadProject,repositoryIdentity,CODE_ORIGIN});
}
