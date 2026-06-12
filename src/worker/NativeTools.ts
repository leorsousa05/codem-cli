import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

export interface NativeTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  execute(args: any): Promise<any>;
}

export const NATIVE_TOOLS: NativeTool[] = [
  {
    name: 'read_file',
    description: 'Read the text content of a local file in the workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path from workspace or absolute path to read' }
      },
      required: ['path']
    },
    async execute(args: { path: string }) {
      const targetPath = path.resolve(process.cwd(), args.path);
      if (!fs.existsSync(targetPath)) {
        throw new Error(`File not found: ${args.path}`);
      }
      return {
        content: fs.readFileSync(targetPath, 'utf8')
      };
    }
  },
  {
    name: 'write_file',
    description: 'Create a new file or overwrite an existing file with new content.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path from workspace or absolute path to write' },
        content: { type: 'string', description: 'Content to be written to the file' }
      },
      required: ['path', 'content']
    },
    async execute(args: { path: string; content: string }) {
      const targetPath = path.resolve(process.cwd(), args.path);
      const parentDir = path.dirname(targetPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(targetPath, args.content, 'utf8');
      return {
        success: true,
        message: `File written successfully at ${args.path}`
      };
    }
  },
  {
    name: 'execute_bash',
    description: 'Run a shell command locally in the terminal.',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The exact command string to run' }
      },
      required: ['command']
    },
    async execute(args: { command: string }) {
      return new Promise((resolve) => {
        exec(args.command, { timeout: 10000 }, (error, stdout, stderr) => {
          resolve({
            stdout: stdout || '',
            stderr: stderr || '',
            exitCode: error ? error.code : 0,
            error: error ? error.message : undefined
          });
        });
      });
    }
  }
];
