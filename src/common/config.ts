import fs from 'fs';
import path from 'path';
import os from 'os';

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
}

export interface AppConfig {
  activeProvider: 'openai' | 'anthropic' | 'gemini' | 'kimi';
  providers: {
    openai?: ProviderConfig;
    anthropic?: ProviderConfig;
    gemini?: ProviderConfig;
    kimi?: ProviderConfig;
  };
}

const DEFAULT_CONFIG: AppConfig = {
  activeProvider: 'kimi',
  providers: {
    kimi: {
      baseUrl: 'https://api.moonshot.cn/v1',
      defaultModel: 'moonshot-v1-8k',
    },
    openai: {
      baseUrl: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4o',
    },
    anthropic: {
      baseUrl: 'https://api.anthropic.com/v1',
      defaultModel: 'claude-3-5-sonnet-20240620',
    },
    gemini: {
      defaultModel: 'gemini-1.5-pro',
    },
  },
};

export class ConfigManager {
  private configPath: string;

  constructor() {
    const home = os.homedir();
    this.configPath = path.join(home, '.codem', 'config.json');
  }

  public async init(): Promise<AppConfig> {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    if (!fs.existsSync(this.configPath)) {
      await this.save(DEFAULT_CONFIG);
      return DEFAULT_CONFIG;
    }
    return this.load();
  }

  public async load(): Promise<AppConfig> {
    try {
      if (!fs.existsSync(this.configPath)) {
        return DEFAULT_CONFIG;
      }
      const data = await fs.promises.readFile(this.configPath, 'utf-8');
      const parsed = JSON.parse(data);
      // Garantir compatibilidade / propriedades padrão
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        providers: {
          ...DEFAULT_CONFIG.providers,
          ...(parsed.providers || {}),
        },
      };
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  public async save(config: AppConfig): Promise<void> {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    await fs.promises.writeFile(this.configPath, JSON.stringify(config, null, 2), {
      encoding: 'utf-8',
      mode: 0o600, // Apenas leitura/escrita do proprietário
    });
  }
}
