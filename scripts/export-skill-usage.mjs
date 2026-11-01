import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { projectSkillUsage } from '../lib/skill-usage.mjs';

const { values } = parseArgs({ options: { input: { type: 'string' }, previous: { type: 'string' } } });
if (!values.input) throw new Error('--input must name a successful external audience-filtered scan');
const input = path.resolve(values.input);
const source = JSON.parse(fs.readFileSync(input, 'utf8'));
if (source.audience !== 'external') throw new Error('Only an external audience-filtered scan can be exported here');
const allowed = new Set(JSON.parse(fs.readFileSync(new URL('../content/skills.json', import.meta.url), 'utf8')).skills.map(skill => skill.name));
if (source.skills.some(skill => !allowed.has(skill.name))) throw new Error('Skill names must belong to the reviewed public catalog');
const previousFile = values.previous ?? fileURLToPath(new URL('../content/skill-usage.json', import.meta.url));
const previous = fs.existsSync(previousFile) ? JSON.parse(fs.readFileSync(previousFile, 'utf8')) : null;
console.log(JSON.stringify(projectSkillUsage(source, previous, fs.statSync(input).mtime.toISOString()), null, 2));
