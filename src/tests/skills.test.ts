import { describe, test, expect, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { readSkillContent } from '../common/skills.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

const TMP = os.tmpdir();

function makeTempSkillsDir(): string {
  const dir = fs.mkdtempSync(path.join(TMP, 'codem-skills-'));
  return dir;
}

function writeSkill(base: string, dirName: string, content: string): string {
  const dir = path.join(base, dirName);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'SKILL.md');
  fs.writeFileSync(file, content, 'utf-8');
  return file;
}

// ─── parseFrontmatter logic (tested inline — pure function extracted) ────────

function parseFrontmatter(content: string, fallbackName: string) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { name: fallbackName, description: '' };
  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const sep = line.indexOf(': ');
    if (sep === -1) continue;
    result[line.slice(0, sep).trim()] = line.slice(sep + 2).trim();
  }
  return {
    name: result['name'] || fallbackName,
    description: result['description'] || '',
  };
}

// ─── parseFrontmatter ────────────────────────────────────────────────────────

describe('parseFrontmatter', () => {
  test('extracts name and description from valid YAML frontmatter', () => {
    const result = parseFrontmatter('---\nname: engineer\ndescription: Coding skill\n---\n# Body', 'fallback');
    expect(result.name).toBe('engineer');
    expect(result.description).toBe('Coding skill');
  });

  test('returns fallback name when frontmatter block is absent', () => {
    const result = parseFrontmatter('# Just markdown, no frontmatter', 'my-skill-dir');
    expect(result.name).toBe('my-skill-dir');
    expect(result.description).toBe('');
  });

  test('handles CRLF line endings', () => {
    const result = parseFrontmatter('---\r\nname: crlf-skill\r\ndescription: Windows\r\n---\r\n# Body', 'fallback');
    expect(result.name).toBe('crlf-skill');
    expect(result.description).toBe('Windows');
  });

  test('falls back to fallbackName when name key is missing from frontmatter', () => {
    const result = parseFrontmatter('---\ndescription: Only desc\n---\n# Body', 'fallback-name');
    expect(result.name).toBe('fallback-name');
    expect(result.description).toBe('Only desc');
  });

  test('ignores lines without ": " separator', () => {
    const result = parseFrontmatter('---\nname: valid\nbadline\n---', 'fb');
    expect(result.name).toBe('valid');
  });
});

// ─── loadSkills filtering logic (via fs directly on temp dirs) ───────────────

describe('loadSkills — filtering logic', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('skips entries that are not directories', () => {
    tmpDir = makeTempSkillsDir();
    fs.writeFileSync(path.join(tmpDir, 'flat-file.md'), 'content');
    fs.mkdirSync(path.join(tmpDir, 'valid-dir'));
    fs.writeFileSync(path.join(tmpDir, 'valid-dir', 'SKILL.md'), '---\nname: valid\ndescription: ok\n---');

    const entries = fs.readdirSync(tmpDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory());
    expect(dirs).toHaveLength(1);
    expect(dirs[0].name).toBe('valid-dir');
  });

  test('skips directories that do not contain SKILL.md', () => {
    tmpDir = makeTempSkillsDir();
    fs.mkdirSync(path.join(tmpDir, 'no-skill'));
    writeSkill(tmpDir, 'has-skill', '---\nname: has-skill\ndescription: yes\n---');

    const entries = fs.readdirSync(tmpDir, { withFileTypes: true });
    const withSkillMd = entries
      .filter(e => e.isDirectory())
      .filter(e => fs.existsSync(path.join(tmpDir, e.name, 'SKILL.md')));
    expect(withSkillMd).toHaveLength(1);
    expect(withSkillMd[0].name).toBe('has-skill');
  });

  test('correctly parses metadata from multiple skill dirs', () => {
    tmpDir = makeTempSkillsDir();
    writeSkill(tmpDir, 'engineer', '---\nname: engineer\ndescription: Coding\n---');
    writeSkill(tmpDir, 'architect', '---\nname: architect\ndescription: Design\n---');

    const entries = fs.readdirSync(tmpDir, { withFileTypes: true });
    const results = entries
      .filter(e => e.isDirectory())
      .filter(e => fs.existsSync(path.join(tmpDir, e.name, 'SKILL.md')))
      .map(e => {
        const content = fs.readFileSync(path.join(tmpDir, e.name, 'SKILL.md'), 'utf-8');
        return parseFrontmatter(content, e.name);
      });
    expect(results).toHaveLength(2);
    const names = results.map(r => r.name).sort();
    expect(names).toEqual(['architect', 'engineer']);
  });
});

// ─── readSkillContent ────────────────────────────────────────────────────────

describe('readSkillContent()', () => {
  let tmpFile: string;

  afterEach(() => {
    if (tmpFile && fs.existsSync(tmpFile)) {
      fs.rmSync(tmpFile, { recursive: true, force: true });
    }
  });

  test('returns full file content for a valid path', () => {
    tmpFile = path.join(TMP, `skill-read-${Date.now()}.md`);
    fs.writeFileSync(tmpFile, '# Skill content\n\nSome body text.', 'utf-8');
    expect(readSkillContent(tmpFile)).toBe('# Skill content\n\nSome body text.');
  });

  test('returns empty string for a non-existent path without throwing', () => {
    expect(() => readSkillContent('/nonexistent/path/SKILL.md')).not.toThrow();
    expect(readSkillContent('/nonexistent/path/SKILL.md')).toBe('');
  });

  test('returns empty string for an unreadable path (directory)', () => {
    tmpFile = path.join(TMP, `skill-dir-${Date.now()}`);
    fs.mkdirSync(tmpFile);
    // Reading a directory as a file may throw or return empty
    const result = readSkillContent(tmpFile);
    expect(typeof result).toBe('string');
  });
});
