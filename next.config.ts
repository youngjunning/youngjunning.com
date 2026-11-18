import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  experimental: { agentUpgrade: 'security' },
  outputFileTracingIncludes: { '/*': ['./.content/**/*', './content/**/*', './config/code-project-scope.json'] },
};
export default config;
