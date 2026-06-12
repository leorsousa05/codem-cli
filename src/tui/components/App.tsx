import React, { useState, useEffect } from 'react';
import { Box, useApp } from 'ink';
import { execSync } from 'child_process';
import { AgentSession, TUIOverlayMode } from '../../common/types.js';
import { AgentRunner } from '../../runner/AgentRunner.js';
import { DatabaseStore } from '../../db/sqlite.js';
import { ConfigManager, AppConfig, ProviderConfig } from '../../common/config.js';
import { loadSkills, readSkillContent, SkillMeta } from '../../common/skills.js';
import { useKeyboard } from '../hooks/useKeyboard.js';
import { Header } from './Header.js';
import { LogViewer, MAX_LINES as LOG_MAX_LINES } from './LogViewer.js';
import { formatLogs, isToolCallBlock } from '../utils/logFormatter.js';
import { InputLine } from './InputLine.js';
import { StatusBar } from './StatusBar.js';
import { SlashSuggestions } from './SlashSuggestions.js';
import { SandboxModal } from './SandboxModal.js';
import { HelpModal } from './modals/HelpModal.js';
import { ProviderModal, ProviderKey, ProviderStep } from './modals/ProviderModal.js';
import { SessionModal } from './modals/SessionModal.js';
import { ModelModal } from './modals/ModelModal.js';
import { MCPStatusModal } from './modals/MCPStatusModal.js';
import { useTheme } from '../theme/useTheme.js';

const SUGGEST_WINDOW = 6;

interface Props {
  runner: AgentRunner;
  dbStore: DatabaseStore;
}

const slashCommands = [
  { cmd: '/provider', desc: 'Configure LLM Providers, API keys and custom Base URL' },
  { cmd: '/model', desc: 'Change the default model for active provider' },
  { cmd: '/session', desc: 'Switch to a previous chat session' },
  { cmd: '/skill', desc: 'Activate a skill from ~/.agents/skills' },
  { cmd: '/help', desc: 'Show help and keyboard shortcuts' },
  { cmd: '/tools', desc: 'List connected MCP and native tools' },
  { cmd: '/new', desc: 'Start a new clean chat session' },
  { cmd: '/clear', desc: 'Clear history logs of the current session' },
  { cmd: '/exit', desc: 'Shut down and exit application' },
];

const providerList: ProviderKey[] = ['kimi', 'openai', 'anthropic', 'gemini'];

const getModelsList = (prov: ProviderKey): string[] => {
  switch (prov) {
    case 'kimi':
      return ['moonshot-v1-8k', 'moonshot-v1-16k', 'moonshot-v1-32k'];
    case 'openai':
      return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'];
    case 'anthropic':
      return ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'];
    case 'gemini':
      return ['gemini-1.5-pro', 'gemini-1.5-flash'];
  }
};

export const App: React.FC<Props> = ({ runner, dbStore }) => {
  const { exit } = useApp();
  const { theme } = useTheme();

  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [userInput, setUserInput] = useState<string>('');

  const [configManager] = useState(() => new ConfigManager());
  const [config, setConfig] = useState<AppConfig | null>(null);

  const [overlayMode, setOverlayMode] = useState<TUIOverlayMode>('NONE');
  const [selectedModelIndex, setSelectedModelIndex] = useState<number>(0);

  const [selectedProvIndex, setSelectedProvIndex] = useState<number>(0);
  const [providerStep, setProviderStep] = useState<ProviderStep>('SELECT_PROVIDER');
  const [tempProv, setTempProv] = useState<ProviderKey>('kimi');
  const [tempApiKey, setTempApiKey] = useState<string>('');
  const [tempBaseUrl, setTempBaseUrl] = useState<string>('');

  const [activeModel, setActiveModel] = useState<string>('moonshot-v1-8k');

  const [skills, setSkills] = useState<SkillMeta[]>([]);

  const [selectedSuggestIndex, setSelectedSuggestIndex] = useState<number>(0);
  const [suggestScrollOffset, setSuggestScrollOffset] = useState<number>(0);

  const [pendingApproval, setPendingApproval] = useState<{
    agentId: string;
    toolName: string;
    args: any;
    serverName: string;
  } | null>(null);

  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);

  const [gitBranch, setGitBranch] = useState<string>('none');
  const [cwd, setCwd] = useState<string>('');
  const [memUsage, setMemUsage] = useState<string>('0 MB');

  useEffect(() => {
    setCwd(process.cwd());
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: 'pipe' }).toString().trim();
      setGitBranch(branch);
    } catch {
      setGitBranch('non-git');
    }

    setSkills(loadSkills());

    const memInterval = setInterval(() => {
      const rss = process.memoryUsage().rss;
      setMemUsage(`${Math.round(rss / 1024 / 1024)} MB`);
    }, 1000);

    configManager.init().then((loadedConfig) => {
      setConfig(loadedConfig);
      const activeP = loadedConfig.activeProvider;
      const provConf = loadedConfig.providers[activeP];
      if (provConf) {
        setActiveModel(provConf.defaultModel || 'moonshot-v1-8k');
      }
    });

    dbStore.getAllSessions().then((loaded) => {
      const newId = String(Date.now());
      const newSession: AgentSession = {
        id: newId,
        name: `Chat Session ${loaded.length + 1}`,
        status: 'IDLE',
        logs: [`Initialized telemetry screen...\n`],
        isSubtask: false,
      };

      dbStore.createSession(newSession).then(() => {
        dbStore.appendLog(newSession.id, newSession.logs[0]);
        const allSessions = [...loaded, newSession];
        setSessions(allSessions);
        setFocusedIndex(allSessions.length - 1);
        runner.spawn(newSession);
      });
    });

    runner.onMessage((msg) => {
      setSessions((prev) => {
        const next = [...prev];
        let session = next.find((s) => s.id === msg.agentId);

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
              serverName: msg.payload.serverName,
            });
          }
        }
        return next;
      });
    });

    return () => {
      clearInterval(memInterval);
    };
  }, [runner, dbStore, configManager]);

  const getSuggestions = () => {
    if (!userInput.startsWith('/')) return [];
    const base = slashCommands.filter((c) => c.cmd.startsWith(userInput));
    const skillSuggestions: Array<{ cmd: string; desc: string }> = userInput.startsWith('/skill')
      ? skills
          .filter((s) => `/skill ${s.name}`.startsWith(userInput))
          .map((s) => ({ cmd: `/skill ${s.name}`, desc: s.description }))
      : [];
    return [...base, ...skillSuggestions];
  };

  const suggestions = getSuggestions();

  const getGitStatus = () => {
    try {
      const status = execSync('git status --short', { stdio: 'pipe' }).toString().trim();
      return status ? 'modified' : 'clean';
    } catch {
      return 'none';
    }
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
        isSubtask: false,
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
        setSelectedModelIndex(0);
        setTempProv((config?.activeProvider || 'kimi') as ProviderKey);
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
            const target = next.find((s) => s.id === activeAgent.id);
            if (target) {
              const msg = `System: Model changed to ${args}\n`;
              target.logs.push(msg);
              dbStore.appendLog(target.id, msg);
            }
            return next;
          });

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
          const target = next.find((s) => s.id === activeAgent.id);
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
        const names = skills.length > 0 ? skills.map((s) => s.name).join(', ') : 'none';
        setSessions((prev) => {
          const next = [...prev];
          const target = next.find((s) => s.id === activeAgent.id);
          if (target) {
            const msg = `System: No skill specified. Available: ${names}\n`;
            target.logs.push(msg);
            dbStore.appendLog(target.id, msg);
          }
          return next;
        });
        return;
      }

      const skill = skills.find((s) => s.name === args);
      if (!skill) {
        setSessions((prev) => {
          const next = [...prev];
          const target = next.find((s) => s.id === activeAgent.id);
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
        const target = next.find((s) => s.id === activeAgent.id);
        if (target) {
          const msg = `System: Skill '${skill.name}' activated.\n`;
          target.logs.push(msg);
          dbStore.appendLog(target.id, msg);
        }
        return next;
      });
    } else if (action === '/help') {
      setOverlayMode('HELP');
    } else if (action === '/tools') {
      setOverlayMode('MCP_STATUS');
    } else if (action === '/exit') {
      runner.shutdownAll().then(() => {
        exit();
        process.exit(0);
      });
    }
  };

  useKeyboard(({ input, key }) => {
    if (key.escape) {
      setOverlayMode('NONE');
      setProviderStep('SELECT_PROVIDER');
      setUserInput('');
      return;
    }

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
        const models = getModelsList(tempProv);
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

    if (overlayMode === 'HELP' || overlayMode === 'MCP_STATUS') {
      if (key.return) {
        setOverlayMode('NONE');
      }
      return;
    }

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
                const target = next.find((s) => s.id === activeAgent.id);
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

    const canNavigateLogs =
      overlayMode === 'NONE' &&
      suggestions.length === 0 &&
      !pendingApproval &&
      userInput === '';

    if (canNavigateLogs) {
      const entries = formatLogs(focusedAgent?.logs || [], LOG_MAX_LINES);
      const blocks = entries.filter(isToolCallBlock);
      const focusedBlockIndex = blocks.findIndex((b) => b.id === focusedBlockId);

      if (key.upArrow) {
        const nextIndex = focusedBlockIndex > 0 ? focusedBlockIndex - 1 : blocks.length - 1;
        setFocusedBlockId(blocks[nextIndex]?.id || null);
        return;
      }
      if (key.downArrow) {
        const nextIndex = focusedBlockIndex < blocks.length - 1 ? focusedBlockIndex + 1 : 0;
        setFocusedBlockId(blocks[nextIndex]?.id || null);
        return;
      }
      if (key.return || input === ' ') {
        if (focusedBlockId) {
          setExpandedBlocks((prev) => {
            const next = new Set(prev);
            if (next.has(focusedBlockId)) {
              next.delete(focusedBlockId);
            } else {
              next.add(focusedBlockId);
            }
            return next;
          });
        }
        return;
      }
    }

    if (suggestions.length > 0) {
      if (key.upArrow) {
        setSelectedSuggestIndex((prev) => {
          const next = prev > 0 ? prev - 1 : suggestions.length - 1;
          setSuggestScrollOffset((off) => (next < off ? next : off));
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
            const target = next.find((s) => s.id === activeAgent.id);
            if (target) {
              const echo = `\n[USER]: ${trimmed}\n`;
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

  const focusedAgent = sessions[focusedIndex];

  useEffect(() => {
    const entries = formatLogs(focusedAgent?.logs || [], LOG_MAX_LINES);
    const blocks = entries.filter(isToolCallBlock);
    if (blocks.length > 0) {
      const lastBlock = blocks[blocks.length - 1];
      setFocusedBlockId((prev) => prev ?? lastBlock.id);
    } else {
      setFocusedBlockId(null);
    }
  }, [focusedAgent?.logs]);

  const renderOverlay = () => {
    if (overlayMode === 'NONE') return null;

    const overlay = (() => {
      switch (overlayMode) {
        case 'HELP':
          return <HelpModal />;
        case 'PROVIDER_MODAL':
          return (
            <ProviderModal
              config={config}
              step={providerStep}
              selectedProvIndex={selectedProvIndex}
              selectedModelIndex={selectedModelIndex}
              tempProv={tempProv}
              userInput={userInput}
              models={getModelsList(tempProv)}
              providerList={providerList}
            />
          );
        case 'SESSIONS_SELECT':
          return <SessionModal sessions={sessions} focusedIndex={focusedIndex} />;
        case 'MODELS_SELECT':
          return (
            <ModelModal
              models={getModelsList(tempProv)}
              selectedIndex={selectedModelIndex}
              activeModel={activeModel}
              provider={tempProv}
            />
          );
        case 'MCP_STATUS':
          return <MCPStatusModal />;
        default:
          return null;
      }
    })();

    if (!overlay) return null;

    return (
      <Box
        position="absolute"
        width="100%"
        height="100%"
        alignItems="center"
        justifyContent="center"
      >
        <Box borderStyle="single" borderColor={theme.border} paddingX={2} paddingY={1}>
          {overlay}
        </Box>
      </Box>
    );
  };

  return (
    <Box flexDirection="column" height="100%">
      <Header
        cwd={cwd}
        gitBranch={gitBranch}
        gitStatus={getGitStatus()}
        activeModel={activeModel}
        activeProvider={config?.activeProvider || 'kimi'}
        sessionCount={sessions.length}
        contextUsage="0% ctx"
      />

      <Box flexDirection="column" flexGrow={1}>
        <LogViewer
          logs={focusedAgent?.logs || []}
          expandedBlocks={expandedBlocks}
          focusedBlockId={focusedBlockId}
        />

        {pendingApproval && (
          <SandboxModal
            toolName={pendingApproval.toolName}
            serverName={pendingApproval.serverName}
            args={pendingApproval.args}
          />
        )}

        {suggestions.length > 0 && (
          <SlashSuggestions
            suggestions={suggestions}
            selectedIndex={selectedSuggestIndex}
            scrollOffset={suggestScrollOffset}
            windowSize={SUGGEST_WINDOW}
          />
        )}

        <InputLine
          value={userInput}
          mode={overlayMode === 'PROVIDER_MODAL' && providerStep === 'ENTER_API_KEY' ? 'hidden' : 'chat'}
        />
      </Box>

      <StatusBar
        memoryUsage={memUsage}
        overlayMode={overlayMode}
        suggestions={suggestions}
        pendingApproval={!!pendingApproval}
      />

      {renderOverlay()}
    </Box>
  );
};
