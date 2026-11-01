import test from 'node:test';
import assert from 'node:assert/strict';
import {assertPublicRuntime} from './check-runtime-boundary.mjs';
test('public runtime permits only its approved pinned retrieval dependency',()=>{
 assert.throws(()=>assertPublicRuntime({dependencies:{gbrain:'fixture'}}));
 assert.throws(()=>assertPublicRuntime({optionalDependencies:{'@electric-sql/pglite':'fixture'}}));
 assert.doesNotThrow(()=>assertPublicRuntime({dependencies:{openai:'fixture'}}));
 assert.doesNotThrow(()=>assertPublicRuntime({dependencies:{gbrain:'https://codeload.github.com/garrytan/gbrain/tar.gz/88d3f572950a772d268b22afe0bd53c2a2f090ff'}}));
});

import {assertNoNativeBrainImports} from './check-runtime-boundary.mjs';
test('public runtime rejects native brain adapters',()=>{assert.throws(()=>assertNoNativeBrainImports("import {x} from './twin-gbrain.mjs'"));assert.throws(()=>assertNoNativeBrainImports("const x=require.resolve('gbrain/pglite-engine')"));assert.doesNotThrow(()=>assertNoNativeBrainImports("import OpenAI from 'openai'"));});
test('only the reviewed adapter can resolve the engine; default Brain and direct PGLite imports stay blocked',()=>{
 assert.doesNotThrow(()=>assertNoNativeBrainImports("const x=require.resolve('gbrain/pglite-engine')",'lib/twin-gbrain.mjs'));
 assert.doesNotThrow(()=>assertNoNativeBrainImports("import {x} from './twin-gbrain.mjs'",'lib/twin-retrieval.mjs'));
 assert.throws(()=>assertNoNativeBrainImports("import x from 'gbrain'",'lib/twin-gbrain.mjs'));
 assert.throws(()=>assertNoNativeBrainImports("import x from '@electric-sql/pglite'",'lib/twin-gbrain.mjs'));
});
