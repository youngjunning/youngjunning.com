import type { NextConfig } from 'next';
import { gbrainRuntimeFiles } from './scripts/gbrain-runtime-files.mjs';
const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['gbrain','tsx'],
  outputFileTracingIncludes: { '/*': ['./.content/**/*', './content/**/*', './config/code-project-scope.json'], '/api/chat': gbrainRuntimeFiles(process.cwd()) },
  outputFileTracingExcludes: { '/api/chat': ['**/node_modules/gbrain/{docs,test,tests,evals,benchmarks,.github}/**'] },
};
export default config;
