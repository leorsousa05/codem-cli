import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'fs';
import path from 'path';

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: any;
  serverName: string;
}

export class MCPManager {
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, StdioClientTransport> = new Map();
  private mcpConfigPath: string;

  constructor() {
    const home = process.env.HOME || process.env.USERPROFILE || '.';
    this.mcpConfigPath = path.join(home, '.codem', 'mcp.json');
  }

  public async initialize(): Promise<void> {
    if (!fs.existsSync(this.mcpConfigPath)) {
      return;
    }

    try {
      const config = JSON.parse(fs.readFileSync(this.mcpConfigPath, 'utf8'));
      const servers = config.mcpServers || {};

      for (const [name, serverConfig] of Object.entries(servers)) {
        const sc = serverConfig as { command: string; args?: string[]; env?: Record<string, string> };
        const transport = new StdioClientTransport({
          command: sc.command,
          args: sc.args || [],
          env: {
            ...process.env,
            ...(sc.env || {})
          } as Record<string, string>
        });

        const client = new Client(
          { name: 'codem-cli-client', version: '1.0.0' },
          { capabilities: {} }
        );

        await client.connect(transport);
        this.clients.set(name, client);
        this.transports.set(name, transport);
      }
    } catch (error) {
      // Falhas individuais não quebram o bootstrap, mas impedem uso de ferramentas daquele client
      console.error('Failed to load MCP config:', error);
    }
  }

  public async getAllTools(): Promise<MCPTool[]> {
    const allTools: MCPTool[] = [];
    for (const [serverName, client] of this.clients.entries()) {
      try {
        const response = await client.listTools();
        if (response && response.tools) {
          for (const tool of response.tools) {
            allTools.push({
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema,
              serverName
            });
          }
        }
      } catch (e) {
        console.error(`Failed to list tools for MCP server ${serverName}:`, e);
      }
    }
    return allTools;
  }

  public async callTool(serverName: string, name: string, args: Record<string, any>): Promise<any> {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`MCP Server ${serverName} not found.`);
    }
    return await client.callTool({
      name,
      arguments: args
    });
  }

  public async close(): Promise<void> {
    for (const client of this.clients.values()) {
      try {
        await client.close();
      } catch {}
    }
    this.clients.clear();
    this.transports.clear();
  }
}
