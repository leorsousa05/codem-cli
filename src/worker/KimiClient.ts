import axios from 'axios';

export interface KimiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

export class KimiClient {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://api.moonshot.cn/v1/chat/completions';

  constructor(apiKey: string, model = 'moonshot-v1-8k') {
    this.apiKey = apiKey;
    this.model = model;
  }

  public async chatStream(
    messages: KimiMessage[],
    tools: any[],
    onChunk: (text: string) => void,
    onToolCall: (toolCall: any) => void
  ): Promise<void> {
    const requestData: any = {
      model: this.model,
      messages,
      stream: true
    };

    if (tools && tools.length > 0) {
      requestData.tools = tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description || '',
          parameters: t.inputSchema
        }
      }));
    }

    const response = await axios({
      method: 'post',
      url: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      data: requestData,
      responseType: 'stream'
    });

    return new Promise((resolve, reject) => {
      let buffer = '';
      const activeToolCalls: any[] = [];

      response.data.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleaned = line.trim();
          if (!cleaned) continue;
          if (cleaned === 'data: [DONE]') {
            continue;
          }
          if (cleaned.startsWith('data: ')) {
            try {
              const data = JSON.parse(cleaned.substring(6));
              const choice = data.choices?.[0];
              if (choice) {
                if (choice.delta?.content) {
                  onChunk(choice.delta.content);
                }
                if (choice.delta?.tool_calls) {
                  for (const tc of choice.delta.tool_calls) {
                    const idx = tc.index ?? 0;
                    if (!activeToolCalls[idx]) {
                      activeToolCalls[idx] = {
                        id: tc.id,
                        type: 'function',
                        function: { name: '', arguments: '' }
                      };
                    }
                    if (tc.id) {
                      activeToolCalls[idx].id = tc.id;
                    }
                    if (tc.function?.name) {
                      activeToolCalls[idx].function.name += tc.function.name;
                    }
                    if (tc.function?.arguments) {
                      activeToolCalls[idx].function.arguments += tc.function.arguments;
                    }
                  }
                }
              }
            } catch (err) {
              // ignora parses quebrados de chunks parciais
            }
          }
        }
      });

      response.data.on('end', () => {
        // Envia todas as ferramentas coletadas
        for (const tc of activeToolCalls) {
          if (tc && tc.function.name) {
            try {
              tc.function.arguments = JSON.parse(tc.function.arguments || '{}');
            } catch {
              tc.function.arguments = {};
            }
            onToolCall(tc);
          }
        }
        resolve();
      });

      response.data.on('error', (err: any) => {
        reject(err);
      });
    });
  }
}
