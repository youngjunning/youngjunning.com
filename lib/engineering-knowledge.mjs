import { projectEngineering as project } from './engineering-model.mjs';
import { matchLeadProject, repositoryIdentity } from './code-platform.mjs';
import { assertPublicText } from './model.mjs';
export { engineeringDigest, personalInferenceFromEngineering } from './engineering-model.mjs';
export function projectEngineering(store, scope, records, documents) {
  assertPublicText(JSON.stringify(store));
  assertPublicText(JSON.stringify(scope));
  return project(store, scope, records, documents, { visibility: 'public', matchLeadProject, repositoryIdentity, allowedRepository: url => url.origin === 'https://github.com' });
}
