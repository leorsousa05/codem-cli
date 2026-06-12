import { parentPort, workerData } from 'worker_threads';
import { IPCMessage, AgentStatus } from '../common/types.js';
import { MCPManager } from './MCPClient.js';
import { AgentHarness } from './harness/AgentHarness.js';
import { ProviderRegistry } from './providers/ProviderRegistry.js';
import { ConfigManager } from '../common/config.js';
import * as os from 'os';
import * as path from 'path';

if (!parentPort) {
  throw new Error('Worker must be spawned from a parent thread.');
}

const agentId = workerData.agentId;

const mcp = new MCPManager();
const configManager = new ConfigManager();
let harness: AgentHarness | null = null;

function buildSystemPrompt(providerType: string, modelName: string, nativeToolNames: string[]): string {
  const cwd = process.cwd();
  const projectName = path.basename(cwd);
  const platform = `${os.type()} ${os.release()} (${os.arch()})`;
  const now = new Date().toISOString();

  return [
    `You are Codem, an expert AI coding assistant running inside the Codem CLI terminal application.`,
    ``,
    `## Runtime Context`,
    `- **Session ID**: ${agentId}`,
    `- **Date/Time**: ${now}`,
    `- **Operating System**: ${platform}`,
    `- **Working Directory**: ${cwd}`,
    `- **Project**: ${projectName}`,
    `- **Active Provider**: ${providerType}`,
    `- **Active Model**: ${modelName}`,
    ``,
    `## Your Identity`,
    `You are a senior full-stack engineer and architect with deep knowledge of TypeScript, Node.js, React, and system design.`,
    `You are pair-programming with the user directly in their terminal. Be concise, precise, and technical.`,
    `Always refer to the working directory above as your project root when reading or writing files.`,
    ``,
    `## Available Tools`,
    `You have access to the following native tools to interact with the filesystem and shell:`,
    ...nativeToolNames.map(n => `- ${n}`),
    ``,
    `Additional MCP (Model Context Protocol) tools may also be available depending on the project's mcp.json configuration.`,
    ``,
    `## Behavioral Rules`,
    `- Always confirm your understanding of the task before making large changes.`,
    `- Prefer surgical, minimal edits over rewrites.`,
    `- When in doubt about a file path, use the read_file or execute_bash tool to verify first.`,
    `- Never expose raw API keys or secrets in your responses.`,
    `- If you cannot complete a task safely, explain why clearly.`,
  ].join('\n');
}

// Gerenciador de suspensão para aprovação do Sandbox
let pendingApprovalResolver: ((value: any) => void) | null = null;

async function init() {
  await mcp.initialize();
  
  // Carrega configuração ativa
  const config = await configManager.load();
  const activeProviderType = config.activeProvider || 'kimi';
  const providerConf = config.providers[activeProviderType];
  
  if (providerConf && providerConf.apiKey) {
    const { NATIVE_TOOLS } = await import('./NativeTools.js');
    const nativeToolNames = NATIVE_TOOLS.map((t: any) => t.name);
    const modelName = providerConf.defaultModel || '';
    const systemPrompt = buildSystemPrompt(activeProviderType, modelName, nativeToolNames);

    const providerInstance = ProviderRegistry.getProvider(activeProviderType, providerConf);
    harness = new AgentHarness(
      agentId,
      providerInstance,
      modelName,
      mcp,
      parentPort!,
      requestToolApproval,
      systemPrompt
    );
  }

  sendStatus('IDLE');
}

function sendStatus(status: AgentStatus) {
  parentPort!.postMessage({
    type: 'AGENT_STATUS',
    agentId,
    payload: { status }
  } as IPCMessage);
}

function sendOutput(text: string) {
  parentPort!.postMessage({
    type: 'AGENT_OUTPUT',
    agentId,
    payload: { text }
  } as IPCMessage);
}

async function requestToolApproval(toolName: string, args: any, serverName: string): Promise<any> {
  sendStatus('AWAITING_APPROVAL');
  
  parentPort!.postMessage({
    type: 'AGENT_TOOL_REQUEST',
    agentId,
    payload: { toolName, arguments: args, serverName }
  } as IPCMessage);

  return new Promise((resolve) => {
    pendingApprovalResolver = resolve;
  });
}

parentPort.on('message', async (message: IPCMessage) => {
  if (message.type === 'AGENT_INPUT') {
    const prompt = message.payload.command;
    
    // Atualiza dinamicamente se a TUI salvar novas configurações
    if (prompt === '/reload-config') {
      const config = await configManager.load();
      const activeProviderType = config.activeProvider;
      const providerConf = config.providers[activeProviderType];
      
      if (providerConf && providerConf.apiKey) {
        const { NATIVE_TOOLS } = await import('./NativeTools.js');
        const nativeToolNames = NATIVE_TOOLS.map((t: any) => t.name);
        const modelName = providerConf.defaultModel || '';
        const systemPrompt = buildSystemPrompt(activeProviderType, modelName, nativeToolNames);

        const providerInstance = ProviderRegistry.getProvider(activeProviderType, providerConf);
        harness = new AgentHarness(
          agentId,
          providerInstance,
          modelName,
          mcp,
          parentPort!,
          requestToolApproval,
          systemPrompt
        );
        sendOutput(`Config reloaded. Active Provider: ${activeProviderType}, Model: ${modelName}\n`);
      } else {
        sendOutput('Error: Active provider configuration not found or API key is missing.\n');
      }
      sendStatus('IDLE');
      return;
    }

    if (!harness) {
      sendOutput('Error: AI Provider not configured. Press F2 or use /provider to setup API Keys.\n');
      sendStatus('ERROR');
      return;
    }

    await harness.runLoop(prompt);
  } else if (message.type === 'AGENT_TOOL_RESPONSE') {
    if (pendingApprovalResolver) {
      pendingApprovalResolver(message.payload);
      pendingApprovalResolver = null;
    }
  } else if (message.type === 'AGENT_SKILL_INJECT') {
    if (!harness) {
      sendOutput('Error: AI Provider not configured. Use /provider to setup API Keys.\n');
      return;
    }
    const { skillName, content } = message.payload;
    harness.injectSkill(skillName, content);
    sendOutput(`\n⚡ Skill '${skillName}' injected. Ready.\n`);
    sendStatus('IDLE');
  } else if (message.type === 'AGENT_STOP') {
    await mcp.close();
    sendStatus('STOPPED');
    process.exit(0);
  }
});

init().catch(err => {
  sendOutput(`Init Failed: ${err.message || String(err)}`);
  sendStatus('ERROR');
});
