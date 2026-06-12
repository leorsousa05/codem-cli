import { parentPort, workerData } from 'worker_threads';
import { IPCMessage, AgentStatus, KimiMessage } from '../common/types.js';
import { MCPManager } from './MCPClient.js';
import { KimiClient } from './KimiClient.js';

if (!parentPort) {
  throw new Error('Worker must be spawned from a parent thread.');
}

const agentId = workerData.agentId;
const apiKey = workerData.apiKey;
const model = workerData.model;

const mcp = new MCPManager();
let kimi: KimiClient | null = null;
let messages: KimiMessage[] = [];

// Gerenciador de suspensão para aprovação do Sandbox
let pendingApprovalResolver: ((value: any) => void) | null = null;

async function init() {
  await mcp.initialize();
  if (apiKey) {
    kimi = new KimiClient(apiKey, model);
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

async function runAgentLoop(prompt: string) {
  if (!kimi) {
    sendOutput('Error: Kimi API Key not configured. Use /provider to set it.');
    sendStatus('ERROR');
    return;
  }

  sendStatus('THINKING');
  messages.push({ role: 'user', content: prompt });

  try {
    const tools = await mcp.getAllTools();
    let keepRunning = true;

    while (keepRunning) {
      let currentResponseText = '';
      let detectedToolCall: any = null;

      await kimi.chatStream(
        messages,
        tools,
        (chunk) => {
          currentResponseText += chunk;
          sendOutput(chunk);
        },
        (toolCall) => {
          detectedToolCall = toolCall;
        }
      );

      if (currentResponseText) {
        messages.push({ role: 'assistant', content: currentResponseText });
      }

      if (detectedToolCall) {
        const tName = detectedToolCall.function.name;
        const tArgs = detectedToolCall.function.arguments;
        
        // Encontra o servidor MCP correspondente à ferramenta
        const mcpTool = tools.find(t => t.name === tName);
        const serverName = mcpTool ? mcpTool.serverName : 'unknown';

        sendOutput(`\n[REQUESTING TOOL EXECUTION]: ${tName} from ${serverName}...\n`);
        
        // Pausa e aguarda aprovação na TUI
        const approvalResult = await requestToolApproval(tName, tArgs, serverName);

        if (approvalResult.approved) {
          sendStatus('EXECUTING_TOOL');
          sendOutput(`\n[EXECUTING TOOL]: ${tName}...\n`);
          try {
            const toolResult = await mcp.callTool(serverName, tName, tArgs);
            sendOutput(`\n[TOOL RESULT SUCCESS]\n`);
            
            // Adiciona a resposta da ferramenta no histórico de mensagens do LLM
            messages.push({
              role: 'assistant',
              content: null,
              tool_calls: [detectedToolCall]
            });
            messages.push({
              role: 'tool',
              tool_call_id: detectedToolCall.id,
              name: tName,
              content: JSON.stringify(toolResult)
            });
            
            sendStatus('THINKING');
          } catch (toolError: any) {
            const errMsg = toolError.message || String(toolError);
            sendOutput(`\n[TOOL ERROR]: ${errMsg}\n`);
            
            messages.push({
              role: 'assistant',
              content: null,
              tool_calls: [detectedToolCall]
            });
            messages.push({
              role: 'tool',
              tool_call_id: detectedToolCall.id,
              name: tName,
              content: JSON.stringify({ error: errMsg })
            });
            
            sendStatus('THINKING');
          }
        } else {
          sendOutput(`\n[TOOL EXECUTION REJECTED BY USER]\n`);
          
          messages.push({
            role: 'assistant',
            content: null,
            tool_calls: [detectedToolCall]
          });
          messages.push({
            role: 'tool',
            tool_call_id: detectedToolCall.id,
            name: tName,
            content: JSON.stringify({ error: 'Rejected by user approval sandbox.' })
          });
          
          sendStatus('THINKING');
        }
      } else {
        keepRunning = false;
      }
    }

    sendStatus('FINISHED');
  } catch (error: any) {
    sendOutput(`\n[CRITICAL ERROR]: ${error.message || String(error)}\n`);
    sendStatus('ERROR');
  }
}

parentPort.on('message', async (message: IPCMessage) => {
  if (message.type === 'AGENT_INPUT') {
    const prompt = message.payload.command;
    // Permite configurar a API Key dinamicamente via comando especial
    if (prompt.startsWith('/provider ')) {
      const parts = prompt.split(' ');
      const key = parts[1];
      const selectedModel = parts[2] || 'moonshot-v1-8k';
      kimi = new KimiClient(key, selectedModel);
      sendOutput('Provider configured successfully.\n');
      sendStatus('IDLE');
      return;
    }
    await runAgentLoop(prompt);
  } else if (message.type === 'AGENT_TOOL_RESPONSE') {
    if (pendingApprovalResolver) {
      pendingApprovalResolver(message.payload);
      pendingApprovalResolver = null;
    }
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
