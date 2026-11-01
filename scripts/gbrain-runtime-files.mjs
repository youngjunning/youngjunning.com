import fs from 'node:fs';
import path from 'node:path';

// tsImport resolves upstream source at runtime, beyond Next's static trace.
// Follow only this project's installed production dependency graph.
export function gbrainRuntimeFiles(root) {
  const packages=new Set();
  function locate(name,parent) {
    for(let directory=parent;;directory=path.dirname(directory)) {
      const target=path.join(directory,'node_modules',name);
      if(fs.existsSync(path.join(target,'package.json')))return target;
      if(directory===path.dirname(directory))return null;
    }
  }
  function visit(name,parent,optional=false) {
    const directory=locate(name,parent);
    if(!directory){if(optional)return;throw Error('Missing GBrain runtime dependency: '+name);}
    if(packages.has(directory))return;
    if(!directory.startsWith(path.join(root,'node_modules')+path.sep))throw Error('GBrain dependency escaped project node_modules');
    packages.add(directory);
    const manifest=JSON.parse(fs.readFileSync(path.join(directory,'package.json'),'utf8'));
    const optionalNames=new Set(Object.keys(manifest.optionalDependencies||{}));
    for(const dependency of Object.keys(manifest.dependencies||{}))visit(dependency,directory,optionalNames.has(dependency));
    for(const dependency of optionalNames)visit(dependency,directory,true);
    for(const dependency of Object.keys(manifest.peerDependencies||{}))visit(dependency,directory,Boolean(manifest.peerDependenciesMeta?.[dependency]?.optional));
  }
  visit('gbrain',root);visit('tsx',root);
  return ['./package.json','./.content/conversation.json','./lib/twin-gbrain-assets-loader.mjs',...Array.from(packages,directory=>'./'+path.relative(root,directory).split(path.sep).join('/')+'/**/*')];
}
