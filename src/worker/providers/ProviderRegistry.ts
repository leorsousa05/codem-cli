import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { LanguageModel } from 'ai';
import { ProviderConfig } from '../../common/config.js';

export interface LLMProviderInstance {
  getModel(modelName?: string): LanguageModel;
}

export class ProviderRegistry {
  public static getProvider(
    providerType: 'openai' | 'anthropic' | 'gemini' | 'kimi',
    config: ProviderConfig
  ): LLMProviderInstance {
    const apiKey = config.apiKey || '';
    
    switch (providerType) {
      case 'openai': {
        const client = createOpenAI({
          apiKey,
          baseURL: config.baseUrl || 'https://api.openai.com/v1',
        });
        return {
          getModel: (modelName) => client(modelName || config.defaultModel || 'gpt-4o'),
        };
      }
      case 'anthropic': {
        const client = createAnthropic({
          apiKey,
          baseURL: config.baseUrl || 'https://api.anthropic.com/v1',
        });
        return {
          getModel: (modelName) => client(modelName || config.defaultModel || 'claude-3-5-sonnet-20240620'),
        };
      }
      case 'gemini': {
        // O SDK do Google utiliza o export principal 'google' que atua como fábrica de modelos
        return {
          getModel: (modelName) => google(modelName || config.defaultModel || 'gemini-1.5-pro'),
        };
      }
      case 'kimi': {
        // Kimi/Moonshot é compatível com OpenAI
        const client = createOpenAI({
          apiKey,
          baseURL: config.baseUrl || 'https://api.moonshot.cn/v1',
        });
        return {
          getModel: (modelName) => client(modelName || config.defaultModel || 'moonshot-v1-8k'),
        };
      }
      default:
        throw new Error(`Unsupported provider type: ${providerType}`);
    }
  }
}
