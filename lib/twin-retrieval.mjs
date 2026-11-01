import {createGbrainRetriever} from './twin-gbrain.mjs';
export {historicalCutoff,knowledgeFingerprint} from './twin-gbrain.mjs';
const brain=createGbrainRetriever();
export const retrieveTwinEvidence=(index,messages,options)=>brain.retrieve(index,messages,options);
