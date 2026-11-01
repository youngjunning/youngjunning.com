import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { articleDraft } from '../lib/article-draft.mjs';
import { defaultTopic } from '../lib/topics.mjs';

export function newArticle(root, args) {
  const [title, ...options] = args;
  let topic = defaultTopic;
  let collection = 'docs';
  for (let i = 0; i < options.length; i += 2) {
    if (options[i] === '--topic' && options[i + 1]) topic = options[i + 1];
    else if (options[i] === '--collection' && options[i + 1]) collection = options[i + 1];
    else throw new Error('参数格式：--topic engineering --collection docs');
  }
  const draft = articleDraft({ title: title || '', topic, collection, id: randomBytes(8).toString('hex'), date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' }) });
  const directory = path.join(root, 'content/posts');
  fs.mkdirSync(directory, { recursive: true });
  const filename = path.join(directory, draft.filename);
  // Exclusive creation protects existing work, including untracked drafts.
  fs.writeFileSync(filename, draft.content, { flag: 'wx' });
  return filename;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (!args.length || args[0] === '--help') {
    console.log('新建草稿：npm run content:new -- "文章标题" [--topic engineering] [--collection docs|ata]');
  } else {
    try {
      const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
      console.log(`已创建：${newArticle(root, args)}\n草稿暂不进入网站；写好后移除 draft: true，再运行 npm run content:check。`);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
