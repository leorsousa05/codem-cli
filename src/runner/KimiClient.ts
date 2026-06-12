import axios from 'axios';
import { AgentMessage } from '../common/types.js';

export class KimiClient {
  private apiKey: string;
  private baseUrl = 'https://api.moonshot.cn/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  public async chatCompletionStream(
    messages: AgentMessage[],
    tools: any[],
    onToken: (token: string) => void
  ): Promise<any> {
    const formattedMessages = messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    const payload: any = {
      model: 'moonshot-v1-8k',
      messages: formattedMessages,
      stream: true
    };

    if (tools && tools.length > 0) {
      payload.tools = tools;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/chat/completions`, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      });

      return new Promise((resolve, reject) => {
        let fullToolCalls: any = null;
        let responseText = '';

        response.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine || cleanLine === 'data: [DONE]') continue;
            
            if (cleanLine.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(cleanLine.slice(6));
                const choice = parsed.choices[0];
                
                if (choice.delta?.content) {
                  const token = choice.delta.content;
                  responseText += token;
                  onToken(token);
                }

                if (choice.delta?.tool_calls) {
                  if (!fullToolCalls) fullToolCalls = [];
                  const toolCall = choice.delta.tool_calls[0];
                  
                  // Initialize or append delta argument chunks
                  if (toolCall.index !== undefined) {
                    if (!fullToolCalls[toolCall.index]) {
                      fullToolCalls[toolCall.index] = {
                        id: toolCall.id,
                        type: 'function',
                        function: { name: toolCall.function?.name || '', arguments: '' }
                      };
                    }
                    if (toolCall.function?.arguments) {
                      fullToolCalls[toolCall.index].function.arguments += toolCall.function.arguments;
                    }
                  }
                }
              } catch (e) {
                // Ignore parser edge failures of chunked boundaries
              }
            }
          }
        });

        response.data.on('end', () => {
          resolve({
            content: responseText,
            toolCalls: fullToolCalls
          });
        });

        response.data.on('error', (err: any) => reject(err));
      });
    } catch (err: any) {
      throw new Error(`Kimi API Request failed: ${err.message}`);
    }
  }
}
