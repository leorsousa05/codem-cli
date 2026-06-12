import { streamText, jsonSchema } from 'ai';
import { LLMProviderInstance } from '../providers/ProviderRegistry.js';
import { NATIVE_TOOLS } from '../NativeTools.js';
import { MCPManager } from '../MCPClient.js';
import { IPCMessage, AgentStatus } from '../../common/types.js';
import { MessagePort } from 'worker_threads';

// Mensagens internas simplificadas para evitar incompatibilidades de tipo entre versões da biblioteca
export interface SimpleHarnessMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string | any[];
}

export class AgentHarness {
  private messages: SimpleHarnessMessage[] = [];

  constructor(
    private agentId: string,
    private provider: LLMProviderInstance,
    private modelName: string,
    private mcp: MCPManager,
    private parentPort: MessagePort,
    private requestApprovalFn: (toolName: string, args: any, serverName: string) => Promise<{ approved: boolean }>,
    private systemPrompt: string = ''
  ) {}

  private sendStatus(status: AgentStatus) {
    this.parentPort.postMessage({
      type: 'AGENT_STATUS',
      agentId: this.agentId,
      payload: { status }
    } as IPCMessage);
  }

  private sendOutput(text: string) {
    this.parentPort.postMessage({
      type: 'AGENT_OUTPUT',
      agentId: this.agentId,
      payload: { text }
    } as IPCMessage);
  }

  public injectSkill(skillName: string, content: string): void {
    this.messages.push({
      role: 'user',
      content: `[SKILL: ${skillName}]\n\nThe following are your operational instructions for this session. Follow them precisely.\n\n${content}`,
    });
  }

  public async runLoop(prompt: string) {
    this.sendStatus('THINKING');
    this.messages.push({ role: 'user', content: prompt });

    try {
      const mcpTools = await this.mcp.getAllTools();
      const toolsRegistry = [
        ...NATIVE_TOOLS.map(t => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
          serverName: 'native'
        })),
        ...mcpTools
      ];

      // Mapeia os schemas das ferramentas no formato esperado pelo SDK (usando inputSchema e jsonSchema)
      const formattedTools: Record<string, any> = {};
      for (const t of toolsRegistry) {
        formattedTools[t.name] = {
          description: t.description,
          inputSchema: jsonSchema({
            type: 'object',
            properties: t.inputSchema.properties,
            required: t.inputSchema.required || [],
          })
        };
      }

      let keepRunning = true;
      while (keepRunning) {
        const activeModel = this.provider.getModel(this.modelName);

        // Adapta o histórico para a chamada generateText
        const sdkMessages: any[] = this.messages.map(m => ({
          role: m.role,
          content: m.content
        }));

        const response = await streamText({
          model: activeModel,
          system: this.systemPrompt || undefined,
          messages: sdkMessages,
          tools: formattedTools,
        });

        for await (const textPart of response.textStream) {
          this.sendOutput(textPart);
        }

        const resolvedText = await response.text;
        const resolvedToolCalls = await response.toolCalls;

        // Monta a resposta da assistant contendo texto e tool calls se houverem
        const assistantContent: any[] = [];
        if (resolvedText) {
          assistantContent.push({ type: 'text', text: resolvedText });
        }

        if (resolvedToolCalls && resolvedToolCalls.length > 0) {
          for (const call of resolvedToolCalls) {
            const castedCall = call as any;
            assistantContent.push({
              type: 'tool-call',
              toolCallId: castedCall.toolCallId,
              toolName: castedCall.toolName,
              args: castedCall.args || castedCall.input
            });
          }
        }

        if (assistantContent.length > 0) {
          this.messages.push({ role: 'assistant', content: assistantContent });
        }

        if (resolvedToolCalls && resolvedToolCalls.length > 0) {
          const call: any = resolvedToolCalls[0];
          const tName = call.toolName;
          const tArgs = call.args || call.input;

          const toolMeta = toolsRegistry.find(t => t.name === tName);
          const serverName = toolMeta ? toolMeta.serverName : 'unknown';

          this.sendOutput(`\n⚙️ Requesting execution: ${tName} from ${serverName}...\n`);

          const approval = await this.requestApprovalFn(tName, tArgs, serverName);

          if (approval.approved) {
            this.sendStatus('EXECUTING_TOOL');
            this.sendOutput(`\n⚙️ Running ${tName}...\n`);
            try {
              let toolResult;
              if (serverName === 'native') {
                const nativeTool = NATIVE_TOOLS.find(t => t.name === tName);
                if (!nativeTool) throw new Error(`Native tool ${tName} not found.`);
                toolResult = await nativeTool.execute(tArgs);
              } else {
                toolResult = await this.mcp.callTool(serverName, tName, tArgs);
              }

              this.sendOutput(`\n✅ Tool executed successfully.\n`);

              this.messages.push({
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolCallId: call.toolCallId,
                    toolName: tName,
                    output: {
                      type: 'json',
                      value: toolResult,
                    },
                  },
                ],
              });

              this.sendStatus('THINKING');
            } catch (toolError: any) {
              const errMsg = toolError.message || String(toolError);
              this.sendOutput(`\n❌ Tool error: ${errMsg}\n`);

              this.messages.push({
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolCallId: call.toolCallId,
                    toolName: tName,
                    output: {
                      type: 'error-json',
                      value: { error: errMsg },
                    },
                  },
                ],
              });

              this.sendStatus('THINKING');
            }
          } else {
            this.sendOutput(`\n⚠️ Tool execution rejected by user.\n`);

            this.messages.push({
              role: 'tool',
              content: [
                {
                  type: 'tool-result',
                  toolCallId: call.toolCallId,
                  toolName: tName,
                  output: {
                    type: 'execution-denied',
                    reason: 'Rejected by user approval sandbox.',
                  },
                },
              ],
            });

            this.sendStatus('THINKING');
          }
        } else {
          keepRunning = false;
        }
      }

      this.sendStatus('FINISHED');
    } catch (error: any) {
      this.sendOutput(`\n🚨 Critical error: ${error.message || String(error)}\n`);
      this.sendStatus('ERROR');
    }
  }
}
