import { parentPort, workerData } from 'worker_threads';
import { IPCMessage, AgentStatus, ToolRequestPayload } from '../common/types.js';

const agentId = workerData.agentId;
const initialPrompt = workerData.initialPrompt;
const sandboxMode = workerData.sandboxMode || 'MANUAL';

function sendToParent(type: IPCMessage['type'], payload: any) {
  if (parentPort) {
    parentPort.postMessage({
      id: Math.random().toString(36).substring(7),
      agentId,
      type,
      payload,
      timestamp: Date.now(),
    } as IPCMessage);
  }
}

sendToParent('AGENT_STATUS', { status: 'THINKING' as AgentStatus });
sendToParent('AGENT_OUTPUT', { text: `[Agent ${agentId}] Started in ${sandboxMode} sandbox mode.\n` });
sendToParent('AGENT_OUTPUT', { text: `[Agent ${agentId}] Prompt received: "${initialPrompt}"\n` });

let step = 1;
const interval = setInterval(() => {
  if (step === 1) {
    sendToParent('AGENT_OUTPUT', { text: `[Agent ${agentId}] Analyzing file structures...\n` });
    step++;
  } else if (step === 2) {
    sendToParent('AGENT_STATUS', { status: 'AWAITING_APPROVAL' as AgentStatus });
    
    const requestPayload: ToolRequestPayload = {
      requestId: 'req-tool-01',
      toolType: 'FILE_READ',
      target: 'package.json',
      params: {}
    };

    sendToParent('AGENT_TOOL_REQUEST', requestPayload);
    step++;
  } else {
    clearInterval(interval);
  }
}, 1500);

if (parentPort) {
  parentPort.on('message', (message: IPCMessage) => {
    if (message.type === 'AGENT_TOOL_RESPONSE') {
      const { approved, response } = message.payload;
      sendToParent('AGENT_OUTPUT', { text: `[Agent ${agentId}] Tool response received (Approved: ${approved}): ${response}\n` });
      
      if (approved) {
        sendToParent('AGENT_STATUS', { status: 'FINISHED' as AgentStatus });
        sendToParent('AGENT_OUTPUT', { text: `[Agent ${agentId}] Finished task successfully.\n` });
      } else {
        sendToParent('AGENT_STATUS', { status: 'STOPPED' as AgentStatus });
        sendToParent('AGENT_OUTPUT', { text: `[Agent ${agentId}] Aborted due to user denial.\n` });
      }
    } else if (message.type === 'AGENT_STOP') {
      sendToParent('AGENT_OUTPUT', { text: `[Agent ${agentId}] Immediate termination triggered.\n` });
      sendToParent('AGENT_STATUS', { status: 'STOPPED' as AgentStatus });
      clearInterval(interval);
      process.exit(0);
    }
  });
}
