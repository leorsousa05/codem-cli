import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SkillMeta {
  name: string;
  description: string;
  path: string;
}

function parseFrontmatter(content: string, fallbackName: string): Pick<SkillMeta, 'name' | 'description'> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { name: fallbackName, description: '' };

  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const sep = line.indexOf(': ');
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 2).trim();
    result[key] = value;
  }

  return {
    name: result['name'] || fallbackName,
    description: result['description'] || '',
  };
}

export function loadSkills(): SkillMeta[] {
  const skillsDir = path.join(os.homedir(), '.agents', 'skills');

  if (!fs.existsSync(skillsDir)) return [];

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  const skills: SkillMeta[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;

    let content: string;
    try {
      content = fs.readFileSync(skillFile, 'utf-8');
    } catch {
      continue;
    }

    const meta = parseFrontmatter(content, entry.name);
    skills.push({ ...meta, path: skillFile });
  }

  return skills;
}

export function readSkillContent(skillPath: string): string {
  try {
    return fs.readFileSync(skillPath, 'utf-8');
  } catch {
    return '';
  }
}
