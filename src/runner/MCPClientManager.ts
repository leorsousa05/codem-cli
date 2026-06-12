import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface MCPConfig {
  mcpServers: {
    [name: string]: {
      command: string;
      args?: string[];
      env?: Record<string, string>;
    };
  };
}

export class MCPClientManager {
  private clients = new Map<string, Client>();
  private transports = new Map<string, StdioClientTransport>();

  public async initialize(): Promise<void> {
    const configPath = path.join(os.homedir(), '.codem', 'mcp.json');
    if (!fs.existsSync(configPath)) {
      // Create empty config if not present
      const defaultConfig: MCPConfig = { mcpServers: {} };
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      return;
    }

    try {
      const config: MCPConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      for (const [name, server] of Object.entries(config.mcpServers)) {
        const serverEnv: Record<string, string> = {};
        for (const [k, v] of Object.entries(server.env || {})) {
          serverEnv[k] = String(v);
        }

        const transport = new StdioClientTransport({
          command: server.command,
          args: server.args || [],
          env: serverEnv
        });

        const client = new Client(
          { name: 'codem-cli-client', version: '1.0.0' },
          { capabilities: {} }
        );

        await client.connect(transport);
        this.clients.set(name, client);
        this.transports.set(name, transport);
      }
    } catch (err) {
      console.error('Failed to parse or connect to MCP servers:', err);
    }
  }

  public getTools(): any[] {
    // Collect all tools exposed by connected MCP servers to map into LLM schema format
    const mcpTools: any[] = [];
    // Abstract collection mapping will be hooked directly inside completion prompts
    return mcpTools;
  }

  public async disconnect(): Promise<void> {
    for (const [name, client] of this.clients.entries()) {
      try {
        await client.close();
      } catch (e) {}
    }
    this.clients.clear();
    this.transports.clear();
  }
}
