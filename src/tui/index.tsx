import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { AgentSession, AgentStatus } from '../common/types.js';
import { AgentRunner } from '../runner/AgentRunner.js';
import { DatabaseStore } from '../db/sqlite.js';
import { ConfigManager, AppConfig, ProviderConfig } from '../common/config.js';
import { loadSkills, readSkillContent, SkillMeta } from '../common/skills.js';
import { execSync } from 'child_process';

const SUGGEST_WINDOW = 6;

interface Props {
  runner: AgentRunner;
  dbStore: DatabaseStore;
}

export const TelemetryHUD: React.FC<Props> = ({ runner, dbStore }) => {
  const { exit } = useApp();
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [userInput, setUserInput] = useState<string>('');
  
  // Config & Config Manager
  const [configManager] = useState(() => new ConfigManager());
  const [config, setConfig] = useState<AppConfig | null>(null);

  // TUI Overlay Machine
  const [overlayMode, setOverlayMode] = useState<'NONE' | 'HELP' | 'MODELS_SELECT' | 'SESSIONS_SELECT' | 'MCP_STATUS' | 'PROVIDER_MODAL'>('NONE');
  const [selectedModelIndex, setSelectedModelIndex] = useState<number>(0);
  
  // Setup Providers overlay state
  const [selectedProvIndex, setSelectedProvIndex] = useState<number>(0);
  const [providerStep, setProviderStep] = useState<'SELECT_PROVIDER' | 'ENTER_API_KEY' | 'ENTER_BASE_URL' | 'ENTER_MODEL'>('SELECT_PROVIDER');
  const [tempProv, setTempProv] = useState<'openai' | 'anthropic' | 'gemini' | 'kimi'>('kimi');
  const [tempApiKey, setTempApiKey] = useState<string>('');
  const [tempBaseUrl, setTempBaseUrl] = useState<string>('');

  const slashCommands = [
    { cmd: '/provider', desc: 'Configure LLM Providers, API keys and custom Base URL' },
    { cmd: '/new', desc: 'Start a new clean chat session' },
    { cmd: '/model', desc: 'Change the default model for active provider' },
    { cmd: '/skill', desc: 'Activate a skill from ~/.agents/skills' },
    { cmd: '/session', desc: 'Switch to a previous chat session' },
    { cmd: '/clear', desc: 'Clear history logs of the current session' },
    { cmd: '/exit', desc: 'Shut down and exit application' },
  ];

  const providerList: ('openai' | 'anthropic' | 'gemini' | 'kimi')[] = ['kimi', 'openai', 'anthropic', 'gemini'];
  
  const getModelsList = (prov: 'openai' | 'anthropic' | 'gemini' | 'kimi') => {
    switch (prov) {
      case 'kimi': return ['moonshot-v1-8k', 'moonshot-v1-16k', 'moonshot-v1-32k'];
      case 'openai': return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'];
      case 'anthropic': return ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'];
      case 'gemini': return ['gemini-1.5-pro', 'gemini-1.5-flash'];
    }
  };

  const [activeModel, setActiveModel] = useState<string>('moonshot-v1-8k');

  // Skills
  const [skills, setSkills] = useState<SkillMeta[]>([]);

  // Dropdown navigation state
  const [selectedSuggestIndex, setSelectedSuggestIndex] = useState<number>(0);
  const [suggestScrollOffset, setSuggestScrollOffset] = useState<number>(0);

  // Sandbox State
  const [pendingApproval, setPendingApproval] = useState<{
    agentId: string;
    toolName: string;
    args: any;
    serverName: string;
  } | null>(null);

  // Statusline info
  const [gitBranch, setGitBranch] = useState<string>('none');
  const [cwd, setCwd] = useState<string>('');
  const [memUsage, setMemUsage] = useState<string>('0 MB');

  useEffect(() => {
    // Inicialização
    setCwd(process.cwd());
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: 'pipe' }).toString().trim();
      setGitBranch(branch);
    } catch {
      setGitBranch('non-git');
    }

    // Load skills from global ~/.agents/skills
    setSkills(loadSkills());

    const memInterval = setInterval(() => {
      const rss = process.memoryUsage().rss;
      setMemUsage(`${Math.round(rss / 1024 / 1024)} MB`);
    }, 1000);

    // Carrega Config
    configManager.init().then(loadedConfig => {
      setConfig(loadedConfig);
      const activeP = loadedConfig.activeProvider;
      const provConf = loadedConfig.providers[activeP];
      if (provConf) {
        setActiveModel(provConf.defaultModel || 'moonshot-v1-8k');
      }
    });

    // Carrega sessões anteriores e abre uma nova sessão a cada inicialização do programa
    dbStore.getAllSessions().then(loaded => {
      const newId = String(Date.now());
      const newSession: AgentSession = {
        id: newId,
        name: `Chat Session ${loaded.length + 1}`,
        status: 'IDLE',
        logs: [`Initialized telemetry screen...\n`],
        isSubtask: false
      };
      
      dbStore.createSession(newSession).then(() => {
        dbStore.appendLog(newSession.id, newSession.logs[0]);
        const allSessions = [...loaded, newSession];
        setSessions(allSessions);
        setFocusedIndex(allSessions.length - 1);
        
        // Spawna a sessão recém-criada
        runner.spawn(newSession);
      });
    });

    // Registra listener no runner
    runner.onMessage((msg) => {
      setSessions((prev) => {
        const next = [...prev];
        let session = next.find(s => s.id === msg.agentId);

        if (!session && msg.type === 'AGENT_SPAWN') {
          session = msg.payload.session;
          next.push(session!);
        }

        if (session) {
          if (msg.type === 'AGENT_STATUS') {
            session.status = msg.payload.status;
            dbStore.updateSessionStatus(session.id, session.status);
          } else if (msg.type === 'AGENT_OUTPUT') {
            const lines = msg.payload.text;
            session.logs.push(lines);
            dbStore.appendLog(session.id, lines);
          } else if (msg.type === 'AGENT_TOOL_REQUEST') {
            session.status = 'AWAITING_APPROVAL';
            dbStore.updateSessionStatus(session.id, 'AWAITING_APPROVAL');
            setPendingApproval({
              agentId: msg.agentId,
              toolName: msg.payload.toolName,
              args: msg.payload.arguments,
              serverName: msg.payload.serverName
            });
          }
        }
        return next;
      });
    });

    return () => {
      clearInterval(memInterval);
    };
  }, [runner, dbStore]);

  // Filtro dinâmico para sugestões de comandos slash (inclui skills)
  const getSuggestions = () => {
    if (!userInput.startsWith('/')) return [];
    const base = slashCommands.filter(c => c.cmd.startsWith(userInput));
    const skillSuggestions: { cmd: string; desc: string }[] = userInput.startsWith('/skill')
      ? skills
          .filter(s => `/skill ${s.name}`.startsWith(userInput))
          .map(s => ({ cmd: `/skill ${s.name}`, desc: s.description }))
      : [];
    return [...base, ...skillSuggestions];
  };

  const suggestions = getSuggestions();
  const visibleSuggestions = suggestions.slice(suggestScrollOffset, suggestScrollOffset + SUGGEST_WINDOW);

  // Teclado e Navegação Dinâmica conforme o Modo Ativo
  useInput((input, key) => {
    // Tecla ESC para fechar overlays ou limpar autocomplete
    if (key.escape) {
      setOverlayMode('NONE');
      setProviderStep('SELECT_PROVIDER');
      setUserInput('');
      return;
    }

    // ATALHOS GLOBAIS DE FUNÇÃO F1 A F5
    const isF1 = input === '\u001bOP' || input === '\u001b[11~' || input === '\u001b[[A';
    const isF2 = input === '\u001bOQ' || input === '\u001b[12~' || input === '\u001b[[B';
    const isF3 = input === '\u001bOR' || input === '\u001b[13~' || input === '\u001b[[C';
    const isF4 = input === '\u001bOS' || input === '\u001b[14~' || input === '\u001b[[D';
    const isF5 = input === '\u001b[15~' || input === '\u001b[[E';

    if (isF1) {
      setOverlayMode((prev) => (prev === 'HELP' ? 'NONE' : 'HELP'));
      return;
    }
    if (isF2) {
      setOverlayMode((prev) => (prev === 'PROVIDER_MODAL' ? 'NONE' : 'PROVIDER_MODAL'));
      setProviderStep('SELECT_PROVIDER');
      return;
    }
    if (isF3) {
      setOverlayMode((prev) => (prev === 'SESSIONS_SELECT' ? 'NONE' : 'SESSIONS_SELECT'));
      return;
    }
    if (isF4) {
      setOverlayMode((prev) => (prev === 'MCP_STATUS' ? 'NONE' : 'MCP_STATUS'));
      return;
    }
    if (isF5) {
      runner.shutdownAll().then(() => {
        exit();
        process.exit(0);
      });
      return;
    }

    // MODO 1: Captura de Teclas sob o Popover Configurar Provedor (F2 / /provider)
    if (overlayMode === 'PROVIDER_MODAL') {
      if (providerStep === 'SELECT_PROVIDER') {
        if (key.upArrow) {
          setSelectedProvIndex((prev) => (prev > 0 ? prev - 1 : providerList.length - 1));
        }
        if (key.downArrow || key.tab) {
          setSelectedProvIndex((prev) => (prev < providerList.length - 1 ? prev + 1 : 0));
        }
        if (key.return) {
          const selected = providerList[selectedProvIndex];
          setTempProv(selected);
          setProviderStep('ENTER_API_KEY');
        }
        return;
      }

      if (providerStep === 'ENTER_API_KEY') {
        if (key.backspace || key.delete || input === '\x7f' || input === '\b') {
          setUserInput((prev) => prev.slice(0, -1));
          return;
        }
        if (key.return) {
          setTempApiKey(userInput.trim());
          setUserInput('');
          if (tempProv === 'kimi' || tempProv === 'openai') {
            setProviderStep('ENTER_BASE_URL');
          } else {
            setProviderStep('ENTER_MODEL');
          }
        } else if (input && !key.ctrl && !key.meta) {
          setUserInput((prev) => prev + input);
        }
        return;
      }

      if (providerStep === 'ENTER_BASE_URL') {
        if (key.backspace || key.delete || input === '\x7f' || input === '\b') {
          setUserInput((prev) => prev.slice(0, -1));
          return;
        }
        if (key.return) {
          setTempBaseUrl(userInput.trim());
          setUserInput('');
          setProviderStep('ENTER_MODEL');
        } else if (input && !key.ctrl && !key.meta) {
          setUserInput((prev) => prev + input);
        }
        return;
      }

      if (providerStep === 'ENTER_MODEL') {
        const models = getFormattedModelsForSetup();
        if (key.upArrow) {
          setSelectedModelIndex((prev) => (prev > 0 ? prev - 1 : models.length - 1));
        }
        if (key.downArrow || key.tab) {
          setSelectedModelIndex((prev) => (prev < models.length - 1 ? prev + 1 : 0));
        }
        if (key.return) {
          const selectedModel = models[selectedModelIndex];
          
          if (config) {
            const updatedProviders = { ...config.providers };
            const currentProvConf: ProviderConfig = {
              apiKey: tempApiKey || updatedProviders[tempProv]?.apiKey || '',
              defaultModel: selectedModel,
            };
            if (tempBaseUrl) {
              currentProvConf.baseUrl = tempBaseUrl;
            } else if (tempProv === 'kimi') {
              currentProvConf.baseUrl = 'https://api.moonshot.cn/v1';
            } else if (tempProv === 'openai') {
              currentProvConf.baseUrl = 'https://api.openai.com/v1';
            }

            updatedProviders[tempProv] = currentProvConf;

            const updatedConfig: AppConfig = {
              activeProvider: tempProv,
              providers: updatedProviders,
            };

            configManager.save(updatedConfig).then(() => {
              setConfig(updatedConfig);
              setActiveModel(selectedModel);
              
              // Notifica o runner para recarregar as configurações através de comando especial
              const activeAgent = sessions[focusedIndex];
              if (activeAgent) {
                runner.sendCommand(activeAgent.id, '/reload-config');
              }
              
              setOverlayMode('NONE');
              setProviderStep('SELECT_PROVIDER');
              setUserInput('');
            });
          }
        }
        return;
      }
      return;
    }

    // MODO 2: Captura de Teclas sob Popover de Sessões (F3)
    if (overlayMode === 'SESSIONS_SELECT') {
      if (key.upArrow) {
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : sessions.length - 1));
      }
      if (key.downArrow || key.tab) {
        setFocusedIndex((prev) => (prev < sessions.length - 1 ? prev + 1 : 0));
      }
      if (key.return) {
        setOverlayMode('NONE');
      }
      return;
    }

    // MODO 3: Captura de Teclas sob o Menu de Ajuda ou MCP (F1 / F4)
    if (overlayMode === 'HELP' || overlayMode === 'MCP_STATUS') {
      if (key.return) {
        setOverlayMode('NONE');
      }
      return;
    }

    // MODO 4: Seletor de modelos (/model)
    if (overlayMode === 'MODELS_SELECT') {
      const models = getModelsList(tempProv);
      if (key.upArrow) {
        setSelectedModelIndex((prev) => (prev > 0 ? prev - 1 : models.length - 1));
      }
      if (key.downArrow || key.tab) {
        setSelectedModelIndex((prev) => (prev < models.length - 1 ? prev + 1 : 0));
      }
      if (key.return) {
        const chosen = models[selectedModelIndex];
        if (config) {
          const updatedProviders = { ...config.providers };
          const activeP = config.activeProvider;
          updatedProviders[activeP] = { ...updatedProviders[activeP], defaultModel: chosen };
          const updatedConfig: AppConfig = { ...config, providers: updatedProviders };
          configManager.save(updatedConfig).then(() => {
            setConfig(updatedConfig);
            setActiveModel(chosen);
            const activeAgent = sessions[focusedIndex];
            if (activeAgent) {
              runner.sendCommand(activeAgent.id, '/reload-config');
              setSessions((prev) => {
                const next = [...prev];
                const target = next.find(s => s.id === activeAgent.id);
                if (target) {
                  const msg = `System: Model changed to ${chosen}\n`;
                  target.logs.push(msg);
                  dbStore.appendLog(target.id, msg);
                }
                return next;
              });
            }
            setOverlayMode('NONE');
          });
        }
      }
      return;
    }

    // NAVEGAÇÃO E AUTOCMPLETE NO DROPDOWN DE SLASHS (/)
    if (suggestions.length > 0) {
      if (key.upArrow) {
        setSelectedSuggestIndex((prev) => {
          const next = prev > 0 ? prev - 1 : suggestions.length - 1;
          setSuggestScrollOffset((off) => next < off ? next : off);
          return next;
        });
        return;
      }
      if (key.downArrow || key.tab) {
        setSelectedSuggestIndex((prev) => {
          const next = prev < suggestions.length - 1 ? prev + 1 : 0;
          setSuggestScrollOffset((off) => {
            if (next === 0) return 0;
            return next >= off + SUGGEST_WINDOW ? off + 1 : off;
          });
          return next;
        });
        return;
      }
      if (key.return) {
        const chosenCmd = suggestions[selectedSuggestIndex].cmd;

        if (chosenCmd === '/new') {
          executeSlashAction('/new');
          setUserInput('');
        } else if (chosenCmd === '/exit') {
          executeSlashAction('/exit');
        } else if (chosenCmd === '/clear') {
          executeSlashAction('/clear');
          setUserInput('');
        } else if (chosenCmd === '/session') {
          setOverlayMode('SESSIONS_SELECT');
          setUserInput('');
        } else if (chosenCmd === '/provider') {
          setOverlayMode('PROVIDER_MODAL');
          setProviderStep('SELECT_PROVIDER');
          setUserInput('');
        } else if (chosenCmd.startsWith('/skill ')) {
          executeSlashAction(chosenCmd);
          setUserInput('');
        } else {
          setUserInput(chosenCmd + ' ');
        }
        return;
      }
    }

    // Caixa de aprovação síncrona
    if (pendingApproval) {
      if (input.toLowerCase() === 'y' || input.toLowerCase() === 's') {
        runner.sendApproval(pendingApproval.agentId, { approved: true });
        setPendingApproval(null);
      } else if (input.toLowerCase() === 'n') {
        runner.sendApproval(pendingApproval.agentId, { approved: false });
        setPendingApproval(null);
      }
      return;
    }

    // Adiciona e remove caracteres do input normal
    if (key.backspace || key.delete || input === '\x7f' || input === '\b') {
      setUserInput((prev) => prev.slice(0, -1));
      return;
    }

    if (key.return) {
      const trimmed = userInput.trim();
      setUserInput('');

      if (trimmed) {
        if (trimmed.startsWith('/')) {
          executeSlashAction(trimmed);
          return;
        }

        const activeAgent = sessions[focusedIndex];
        if (activeAgent) {
          setSessions((prev) => {
            const next = [...prev];
            const target = next.find(s => s.id === activeAgent.id);
            if (target) {
              const echo = `\n❯ ${trimmed}\n`;
              target.logs.push(echo);
              dbStore.appendLog(target.id, echo);
            }
            return next;
          });

          runner.sendCommand(activeAgent.id, trimmed);
        }
      }
    } else if (input && !key.ctrl && !key.meta) {
      setUserInput((prev) => prev + input);
      setSelectedSuggestIndex(0);
      setSuggestScrollOffset(0);
    }
  });

  const getFormattedModelsForSetup = () => {
    return getModelsList(tempProv);
  };

  const executeSlashAction = (rawInput: string) => {
    const parts = rawInput.trim().split(' ');
    const action = parts[0];
    const args = parts.slice(1).join(' ').trim();

    if (action === '/provider') {
      setOverlayMode('PROVIDER_MODAL');
      setProviderStep('SELECT_PROVIDER');
    } else if (action === '/new') {
      const newId = String(Date.now());
      const newSession: AgentSession = {
        id: newId,
        name: `Chat Session ${sessions.length + 1}`,
        status: 'IDLE',
        logs: [`New session created at ${new Date().toLocaleTimeString()}\n`],
        isSubtask: false
      };
      dbStore.createSession(newSession).then(() => {
        dbStore.appendLog(newSession.id, newSession.logs[0]);
        setSessions((prev) => [...prev, newSession]);
        setFocusedIndex(sessions.length);
        runner.spawn(newSession);
      });
    } else if (action === '/model') {
      const activeAgent = sessions[focusedIndex];
      if (!args) {
        // Open the models picker modal instead of printing
        setSelectedModelIndex(0);
        setTempProv(config?.activeProvider as typeof tempProv || tempProv);
        setOverlayMode('MODELS_SELECT');
        return;
      }

      if (config && activeAgent) {
        const updatedProviders = { ...config.providers };
        const activeP = config.activeProvider;
        const currentP = updatedProviders[activeP] || {};
        updatedProviders[activeP] = {
          ...currentP,
          defaultModel: args,
        };

        const updatedConfig: AppConfig = {
          ...config,
          providers: updatedProviders,
        };

        configManager.save(updatedConfig).then(() => {
          setConfig(updatedConfig);
          setActiveModel(args);
          
          setSessions((prev) => {
            const next = [...prev];
            const target = next.find(s => s.id === activeAgent.id);
            if (target) {
              const msg = `System: Model changed to ${args}\n`;
              target.logs.push(msg);
              dbStore.appendLog(target.id, msg);
            }
            return next;
          });

          // Envia IPC reload para o worker ativo
          runner.sendCommand(activeAgent.id, '/reload-config');
        });
      }
    } else if (action === '/session') {
      setOverlayMode('SESSIONS_SELECT');
    } else if (action === '/clear') {
      const activeAgent = sessions[focusedIndex];
      if (activeAgent) {
        setSessions((prev) => {
          const next = [...prev];
          const target = next.find(s => s.id === activeAgent.id);
          if (target) {
            target.logs = ['History cleared by user.\n'];
            dbStore.deleteSession(activeAgent.id).then(() => {
              dbStore.createSession(activeAgent).then(() => {
                dbStore.appendLog(activeAgent.id, target.logs[0]);
              });
            });
          }
          return next;
        });
      }
    } else if (action === '/skill') {
      const activeAgent = sessions[focusedIndex];
      if (!activeAgent) return;

      if (!args) {
        const names = skills.length > 0 ? skills.map(s => s.name).join(', ') : 'none';
        setSessions((prev) => {
          const next = [...prev];
          const target = next.find(s => s.id === activeAgent.id);
          if (target) {
            const msg = `System: No skill specified. Available: ${names}\n`;
            target.logs.push(msg);
            dbStore.appendLog(target.id, msg);
          }
          return next;
        });
        return;
      }

      const skill = skills.find(s => s.name === args);
      if (!skill) {
        setSessions((prev) => {
          const next = [...prev];
          const target = next.find(s => s.id === activeAgent.id);
          if (target) {
            const msg = `System: Skill '${args}' not found.\n`;
            target.logs.push(msg);
            dbStore.appendLog(target.id, msg);
          }
          return next;
        });
        return;
      }

      const content = readSkillContent(skill.path);
      runner.sendSkill(activeAgent.id, skill.name, content);
      setSessions((prev) => {
        const next = [...prev];
        const target = next.find(s => s.id === activeAgent.id);
        if (target) {
          const msg = `System: Skill '${skill.name}' activated.\n`;
          target.logs.push(msg);
          dbStore.appendLog(target.id, msg);
        }
        return next;
      });
    } else if (action === '/exit') {
      runner.shutdownAll().then(() => {
        exit();
        process.exit(0);
      });
    }
  };

  const focusedAgent = sessions[focusedIndex];

  const getFormattedLogs = (rawLogs: string[]) => {
    if (!rawLogs) return [];
    const allLines = rawLogs.join('').split('\n').filter(Boolean);
    return allLines.slice(-25);
  };

  const getGitStatus = () => {
    try {
      const status = execSync('git status --short', { stdio: 'pipe' }).toString().trim();
      return status ? 'modified' : 'clean';
    } catch {
      return 'none';
    }
  };

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      {/* 1. Header Minimalista */}
      <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={2} marginBottom={1}>
        <Box justifyContent="space-between">
          <Text color="cyan" bold>Codem CLI</Text>
          <Text color="gray">{cwd.split('/').pop() || 'project'} • <Text color="green">{gitBranch}</Text> (<Text color="yellow">{getGitStatus()}</Text>)</Text>
        </Box>
        <Box justifyContent="space-between">
          <Text color="magenta" bold>{activeModel} ({config?.activeProvider || 'kimi'})</Text>
          <Text color="gray">0% context • {sessions.length} sessions • 4 MCP</Text>
        </Box>
      </Box>

      {/* 2. Overlays Modais de Atalhos (F1-F4) */}
      <Box flexDirection="column" flexGrow={1} minHeight={12} marginBottom={1}>
        {overlayMode === 'HELP' && (
          <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
            <Text color="cyan" bold>💡  Codem CLI Help & Keyboard Shortcuts  💡</Text>
            <Text color="white">F1 - Toggle this Help Menu</Text>
            <Text color="white">F2 - Configure LLM Providers (API Key, Model, Custom Base URL)</Text>
            <Text color="white">F3 - Switch active Database Sessions</Text>
            <Text color="white">F4 - List connected MCP & Native system tools</Text>
            <Text color="white">F5 - Safely shut down and exit</Text>
            <Box marginTop={1}>
              <Text color="yellow">Slash commands autocomplete: Type "/" inside chat</Text>
            </Box>
          </Box>
        )}

        {overlayMode === 'PROVIDER_MODAL' && (
          <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1}>
            <Text color="magenta" bold>Configure AI Provider / Harness</Text>
            
            {providerStep === 'SELECT_PROVIDER' && (
              <Box flexDirection="column" marginTop={1}>
                <Text color="white">Select the active provider:</Text>
                {providerList.map((prov, pIdx) => {
                  const isFocused = pIdx === selectedProvIndex;
                  return (
                    <Text key={prov} color={isFocused ? 'yellow' : 'white'} bold={isFocused}>
                      {isFocused ? ' ▶ ' : '   '}{prov.toUpperCase()} {config?.activeProvider === prov ? '(active)' : ''}
                    </Text>
                  );
                })}
              </Box>
            )}

            {providerStep === 'ENTER_API_KEY' && (
              <Box flexDirection="column" marginTop={1}>
                <Text color="white">Type API Key for {tempProv.toUpperCase()}:</Text>
                <Box borderStyle="single" borderColor="cyan" paddingX={1} marginY={1}>
                  <Text color="yellow">{'*'.repeat(userInput.length)}</Text>
                </Box>
                <Text color="gray" italic>Press Enter to confirm API key</Text>
              </Box>
            )}

            {providerStep === 'ENTER_BASE_URL' && (
              <Box flexDirection="column" marginTop={1}>
                <Text color="white">Type Custom Base URL (Optional):</Text>
                <Text color="gray" italic>Press ENTER to skip and use default API endpoint</Text>
                <Box borderStyle="single" borderColor="cyan" paddingX={1} marginY={1}>
                  <Text color="yellow">{userInput || ' '}</Text>
                </Box>
              </Box>
            )}

            {providerStep === 'ENTER_MODEL' && (
              <Box flexDirection="column" marginTop={1}>
                <Text color="white">Select the default Model for {tempProv.toUpperCase()}:</Text>
                {getFormattedModelsForSetup().map((modelName, mIdx) => {
                  const isFocused = mIdx === selectedModelIndex;
                  return (
                    <Text key={modelName} color={isFocused ? 'yellow' : 'white'} bold={isFocused}>
                      {isFocused ? ' ▶ ' : '   '}{modelName}
                    </Text>
                  );
                })}
              </Box>
            )}
          </Box>
        )}

        {overlayMode === 'SESSIONS_SELECT' && (
          <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1}>
            <Text color="magenta" bold>Select Conversation Session</Text>
            {sessions.map((sess, sIdx) => {
              const isFocused = sIdx === focusedIndex;
              return (
                <Text key={sess.id} color={isFocused ? 'yellow' : 'white'} bold={isFocused}>
                  {isFocused ? ' ▶ ' : '   '}[{sess.id.slice(-6)}] {sess.name} ({sess.status})
                </Text>
              );
            })}
            <Box marginTop={1}>
              <Text color="gray" italic>Press ESC to cancel and return to chat</Text>
            </Box>
          </Box>
        )}

        {overlayMode === 'MODELS_SELECT' && (
          <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
            <Text color="cyan" bold>🤖  Select Model  —  {(config?.activeProvider || tempProv).toUpperCase()}</Text>
            <Box marginTop={1} flexDirection="column">
              {getModelsList(tempProv).map((modelName, mIdx) => {
                const isFocused = mIdx === selectedModelIndex;
                const isActive = modelName === activeModel;
                return (
                  <Text key={modelName} color={isFocused ? 'yellow' : isActive ? 'green' : 'white'} bold={isFocused}>
                    {isFocused ? ' ▶ ' : '   '}{modelName}{isActive ? '  ✓' : ''}
                  </Text>
                );
              })}
            </Box>
            <Box marginTop={1}>
              <Text color="gray" italic>↑↓ navigate  •  Enter to select  •  ESC to cancel</Text>
            </Box>
          </Box>
        )}

        {overlayMode === 'MCP_STATUS' && (
          <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
            <Text color="cyan" bold>Connected Tool integrations</Text>
            <Text color="white">• read_file (native)</Text>
            <Text color="white">• write_file (native)</Text>
            <Text color="white">• execute_bash (native)</Text>
            <Text color="white">• filesystem server tools (mcp.json)</Text>
          </Box>
        )}

        {(overlayMode === 'NONE' || overlayMode === 'MODELS_SELECT') && (
          <Box flexDirection="column">
            {focusedAgent ? (
              getFormattedLogs(focusedAgent.logs).map((logLine, lIdx) => {
                let color = "white";
                let text = logLine;
                let bold = false;

                if (logLine.startsWith("[USER]:")) {
                  color = "cyan";
                  text = `❯ ${logLine.substring(7).trim()}`;
                  bold = true;
                } else if (
                  logLine.startsWith("[CRITICAL ERROR]:") || 
                  logLine.startsWith("[TOOL ERROR]:") ||
                  logLine.startsWith("🚨 Critical error:") ||
                  logLine.startsWith("❌ Tool error:")
                ) {
                  color = "red";
                  bold = true;
                } else if (
                  logLine.startsWith("[REQUESTING TOOL EXECUTION]:") || 
                  logLine.startsWith("[EXECUTING TOOL]:") || 
                  logLine.startsWith("[TOOL RESULT SUCCESS]") ||
                  logLine.startsWith("⚙️ Requesting execution:") ||
                  logLine.startsWith("⚙️ Running") ||
                  logLine.startsWith("✅ Tool executed") ||
                  logLine.startsWith("⚠️ Tool execution")
                ) {
                  color = "yellow";
                } else if (logLine.startsWith("System:")) {
                  color = "magenta";
                  bold = true;
                }

                return (
                  <Box key={lIdx}>
                    <Text color={color} bold={bold}>{text}</Text>
                  </Box>
                );
              })
            ) : (
              <Text color="gray">No active logs</Text>
            )}
          </Box>
        )}
      </Box>

      {/* 3. Sandbox Security Modal Compacto */}
      {pendingApproval && (
        <Box borderStyle="single" borderColor="yellow" paddingX={1} marginY={1} flexDirection="column">
          <Text color="yellow" bold>[APPROVE TOOL]: {pendingApproval.toolName} ({pendingApproval.serverName})</Text>
          <Text color="gray">Arguments: {JSON.stringify(pendingApproval.args)}</Text>
          <Text color="yellow" bold>Approve tool execution? (y/n): </Text>
        </Box>
      )}

      {/* 4. Autocomplete Dropdown com scroll virtual */}
      {suggestions.length > 0 && (
        <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1} marginBottom={1}>
          {suggestScrollOffset > 0 && (
            <Text color="gray">  ▲ {suggestScrollOffset} more</Text>
          )}
          {visibleSuggestions.map((sug, sIdx) => {
            const absoluteIdx = suggestScrollOffset + sIdx;
            const isFocused = absoluteIdx === selectedSuggestIndex;
            return (
              <Text key={sug.cmd} color={isFocused ? 'yellow' : 'white'} bold={isFocused}>
                {isFocused ? ' ▶ ' : '   '}{sug.cmd} - {sug.desc}
              </Text>
            );
          })}
          {suggestScrollOffset + SUGGEST_WINDOW < suggestions.length && (
            <Text color="gray">  ▼ {suggestions.length - suggestScrollOffset - SUGGEST_WINDOW} more</Text>
          )}
        </Box>
      )}

      {/* 4.5 Indicador de Status com Emojis */}
      {focusedAgent && focusedAgent.status !== 'IDLE' && focusedAgent.status !== 'FINISHED' && (
        <Box paddingLeft={1} marginBottom={1}>
          {focusedAgent.status === 'THINKING' && (
            <Text color="yellow" bold>🧠 Thinking...</Text>
          )}
          {focusedAgent.status === 'EXECUTING_TOOL' && (
            <Text color="cyan" bold>⚙️ Executing tool...</Text>
          )}
          {focusedAgent.status === 'AWAITING_APPROVAL' && (
            <Text color="red" bold>⚠️ Awaiting sandbox approval...</Text>
          )}
        </Box>
      )}

      {/* 5. Linha de Prompt Minimalista */}
      <Box paddingLeft={1} marginBottom={1}>
        <Text color="green" bold>
          {overlayMode === 'SESSIONS_SELECT' ? '[SELECT SESSION] ' : ''}
          {'>'}
        </Text>
        <Text color="white">
          {overlayMode === 'PROVIDER_MODAL' && (providerStep === 'ENTER_API_KEY' || providerStep === 'ENTER_BASE_URL') ? '' : userInput}
        </Text>
        <Text color="green">_</Text>
      </Box>


    </Box>
  );
};
