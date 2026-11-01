import test from 'node:test';
import assert from 'node:assert/strict';
import {assertPublicRuntime} from './check-runtime-boundary.mjs';
test('public runtime rejects native brain dependencies during cross-site sync',()=>{
 assert.throws(()=>assertPublicRuntime({dependencies:{gbrain:'fixture'}}));
 assert.throws(()=>assertPublicRuntime({optionalDependencies:{'@electric-sql/pglite':'fixture'}}));
 assert.doesNotThrow(()=>assertPublicRuntime({dependencies:{openai:'fixture'}}));
});

import {assertNoNativeBrainImports} from './check-runtime-boundary.mjs';
test('public runtime rejects native brain adapters',()=>{assert.throws(()=>assertNoNativeBrainImports("import {x} from './twin-gbrain.mjs'"));assert.throws(()=>assertNoNativeBrainImports("const x=require.resolve('gbrain/pglite-engine')"));assert.doesNotThrow(()=>assertNoNativeBrainImports("import OpenAI from 'openai'"));});
