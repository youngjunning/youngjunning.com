import { fileURLToPath } from 'node:url';

let packageRoot;
export function initialize(data) { packageRoot = data.packageRoot; }

// GBrain publishes Bun's `with { type: 'file' }` asset imports. Node needs
// their filesystem paths, not the WASM/template bytes as JavaScript modules.
// Keep the compatibility rule inside the pinned GBrain package only.
export async function load(url, context, nextLoad) {
  const attributes = context.importAttributes ?? context.importAssertions;
  if (url.startsWith(packageRoot) && attributes?.type === 'file') {
    return { format: 'module', source: `export default ${JSON.stringify(fileURLToPath(url))};`, shortCircuit: true };
  }
  return nextLoad(url, context);
}
