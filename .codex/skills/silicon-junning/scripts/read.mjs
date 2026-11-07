#!/usr/bin/env node
import { existsSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { run as read } from './read-core.mjs';

// Product configuration; the vendored core is byte-identical to personal-records-reader.
const target = { disabledCollections: ['research', 'excerpts', 'okr'], defaultBase: 'https://youngjunning.com', baseEnv: 'JUNNING_BASE_URL', articlePath: '/blog', accessMessage: '需要站点访问权限，请在已登录浏览器中检查' };
export function run(args, options = {}) { return read(args, { ...options, ...target }); }

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  run(process.argv.slice(2)).then(result => process.stdout.write(JSON.stringify(result, null, 2) + '\n')).catch(error => {
    const message = error.name === 'TimeoutError' || error.name === 'AbortError' ? '读取超时，请检查网络与站点地址' : error.message;
    process.stderr.write(JSON.stringify({ error: message }) + '\n');
    process.exitCode = 1;
  });
}
