import test from 'node:test';
import assert from 'node:assert/strict';
import {assertPublicRuntime,assertNoBrainImports} from './check-runtime-boundary.mjs';
test('public runtime rejects database search dependencies',()=>{
 assert.throws(()=>assertPublicRuntime({dependencies:{gbrain:'fixture'}}));
 assert.throws(()=>assertPublicRuntime({optionalDependencies:{'@electric-sql/pglite':'fixture'}}));
 assert.doesNotThrow(()=>assertPublicRuntime({dependencies:{openai:'fixture'}}));
});
test('public source rejects native brain imports',()=>{
 assert.throws(()=>assertNoBrainImports("import {x} from './twin-gbrain.mjs'"));
 assert.throws(()=>assertNoBrainImports("const x=require.resolve('gbrain/pglite-engine')"));
 assert.doesNotThrow(()=>assertNoBrainImports("import {retrieveTwinEvidence} from './twin-retrieval.mjs'"));
});
