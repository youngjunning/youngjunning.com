import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  outputFileTracingIncludes: { '/*': ['./.content/**/*', './content/**/*', './config/code-project-scope.json'] },
};
export default config;
