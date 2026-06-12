import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { AgentSession, AgentStatus, ToolRequestPayload } from '../common/types.js';
import { AgentRunner } from '../runner/AgentRunner.js';
import { DatabaseStore } from '../db/sqlite.js';
import { execSync } from 'child_process';

interface Props {
  runner: AgentRunner;
  dbStore: DatabaseStore;
}

export const TelemetryHUD: React.FC<Props> = ({ runner, dbStore }) => {
  const { exit } = useApp();
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [userInput, setUserInput] = useState<string>('');
  
  // TUI Overlay Machine
  const [overlayMode, setOverlayMode] = useState<'NONE' | 'HELP' | 'MODELS_SELECT' | 'SESSIONS_SELECT' | 'MCP_STATUS'>('NONE');
  const [selectedModelIndex, setSelectedModelIndex] = useState<number>(0);
  
  // Provider Setup State
  const [providerSetup, setProviderSetup] = useState<'NONE' | 'KEY' | 'MODEL'>('NONE');
  const [tempApiKey, setTempApiKey] = useState<string>('');

  // Dropdown list items
  const slashCommands = [
    { cmd: '/provider', desc: 'Configure Moonshot API key and Model' },
    { cmd: '/new', desc: 'Start a new clean chat session' },
    { cmd: '/session', desc: 'Switch to a previous chat session' },
    { cmd: '/clear', desc: 'Clear history logs of the current session' },
    { cmd: '/exit', desc: 'Shut down and exit application' }
  ];

  const modelsList = [
    'moonshot-v1-8k',
    'moonshot-v1-16k',
    'moonshot-v1-32k'
  ];

  // Dropdown navigation state
  const [selectedSuggestIndex, setSelectedSuggestIndex] = useState<number>(0);

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
  const [activeModel, setActiveModel] = useState<string>('moonshot-v1-8k');

  useEffect(() => {
    // Inicialização
    setCwd(process.cwd());
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: 'pipe' }).toString().trim();
      setGitBranch(branch);
    } catch {
      setGitBranch('non-git');
    }

    const memInterval = setInterval(() => {
      const rss = process.memoryUsage().rss;
      setMemUsage(`${Math.round(rss / 1024 / 1024)} MB`);
    }, 1000);

    // Carrega sessões anteriores do banco
    dbStore.getAllSessions().then(loaded => {
      if (loaded.length === 0) {
        const root: AgentSession = {
          id: '1',
          name: 'Root Agent',
          status: 'IDLE',
          logs: ['Initialized telemetry screen...\n'],
          isSubtask: false
        };
        dbStore.createSession(root).then(() => {
          dbStore.appendLog(root.id, root.logs[0]);
          setSessions([root]);
        });
      } else {
        setSessions(loaded);
        setFocusedIndex(loaded.length - 1);
      }
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

  // Filtro dinâmico para sugestões de comandos slash
  const getSuggestions = () => {
    if (!userInput.startsWith('/')) return [];
    return slashCommands.filter(c => c.cmd.startsWith(userInput));
  };

  const suggestions = getSuggestions();

  // Teclado e Navegação Dinâmica conforme o Modo Ativo
  useInput((input, key) => {
    // Tecla ESC para fechar overlays ou limpar autocomplete
    if (key.escape) {
      setOverlayMode('NONE');
      setProviderSetup('NONE');
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
      setSelectedModelIndex(modelsList.indexOf(activeModel) || 0);
      setOverlayMode((prev) => (prev === 'MODELS_SELECT' ? 'NONE' : 'MODELS_SELECT'));
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

    // MODO 1: Captura de Teclas sob Popover de Seleção de Modelo (F2)
    if (overlayMode === 'MODELS_SELECT') {
      if (key.upArrow) {
        setSelectedModelIndex((prev) => (prev > 0 ? prev - 1 : modelsList.length - 1));
      }
      if (key.downArrow || key.tab) {
        setSelectedModelIndex((prev) => (prev < modelsList.length - 1 ? prev + 1 : 0));
      }
      if (key.return) {
        const modelName = modelsList[selectedModelIndex];
        setActiveModel(modelName);
        runner.setProvider(tempApiKey || 'dummy-key', modelName);
        setOverlayMode('NONE');
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

    // MODO 4: Configuração Assistida de API Key via Prompt (PROVIDER_SETUP)
    if (providerSetup !== 'NONE') {
      if (key.backspace || key.delete || input === '\x7f' || input === '\b') {
        setUserInput((prev) => prev.slice(0, -1));
        return;
      }
      if (key.return) {
        const val = userInput.trim();
        setUserInput('');
        if (providerSetup === 'KEY') {
          if (val) {
            setTempApiKey(val);
            setProviderSetup('MODEL');
          } else {
            setProviderSetup('NONE');
          }
        } else {
          const modelName = val || 'moonshot-v1-8k';
          setActiveModel(modelName);
          runner.setProvider(tempApiKey, modelName);
          
          const activeAgent = sessions[focusedIndex];
          if (activeAgent) {
            setSessions((prev) => {
              const next = [...prev];
              const target = next.find(s => s.id === activeAgent.id);
              if (target) {
                const msg = `\n[SYSTEM]: Provider configured: ${modelName}\n`;
                target.logs.push(msg);
                dbStore.appendLog(target.id, msg);
              }
              return next;
            });
          }
          setProviderSetup('NONE');
          setTempApiKey('');
        }
      } else if (input && !key.ctrl && !key.meta) {
        setUserInput((prev) => prev + input);
      }
      return;
    }

    // NAVEGAÇÃO E AUTOCMPLETE NO DROPDOWN DE SLASHS (/)
    if (suggestions.length > 0) {
      if (key.upArrow) {
        setSelectedSuggestIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        return;
      }
      if (key.downArrow || key.tab) {
        setSelectedSuggestIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        return;
      }
      if (key.return) {
        // Autocompleta o comando no input de prompt do usuário e continua permitindo digitação
        const chosenCmd = suggestions[selectedSuggestIndex].cmd;
        
        // Trata os comandos instantâneos
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
          setProviderSetup('KEY');
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
        // Trata comandos diretos se digitados inteiros
        if (trimmed.startsWith('/')) {
          const firstPart = trimmed.split(' ')[0];
          executeSlashAction(firstPart);
          return;
        }

        const activeAgent = sessions[focusedIndex];
        if (activeAgent) {
          setSessions((prev) => {
            const next = [...prev];
            const target = next.find(s => s.id === activeAgent.id);
            if (target) {
              const echo = `\n[USER]: ${trimmed}\n`;
              target.logs.push(echo);
              dbStore.appendLog(target.id, echo);
            }
            return next;
          });

          // Envia o comando
          runner.sendCommand(activeAgent.id, trimmed);
        }
      }
    } else if (input && !key.ctrl && !key.meta) {
      setUserInput((prev) => prev + input);
      // Sempre que digitar caractere, reseta seleção de autocomplete dropdown
      setSelectedSuggestIndex(0);
    }
  });

  const executeSlashAction = (action: string) => {
    if (action === '/provider') {
      setProviderSetup('KEY');
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
    return allLines.slice(-10);
  };

  const getInputHeader = () => {
    if (providerSetup === 'KEY') {
      return '[API KEY (Masked)]';
    }
    if (providerSetup === 'MODEL') {
      return '[MODEL (Default: moonshot-v1-8k)]';
    }
    return '';
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
      {/* 1. Header Minimalista: Claude Code + LazyGit Style */}
      <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={2} marginBottom={1}>
        <Box justifyContent="space-between">
          <Text color="cyan" bold>Codem CLI</Text>
          <Text color="gray">{cwd.split('/').pop() || 'project'} • <Text color="green">{gitBranch}</Text> (<Text color="yellow">{getGitStatus()}</Text>)</Text>
        </Box>
        <Box justifyContent="space-between">
          <Text color="magenta" bold>{activeModel}</Text>
          <Text color="gray">0% context • {sessions.length} sessions • 4 MCP</Text>
        </Box>
      </Box>

      {/* 2. Overlays Modais de Atalhos (F1-F4) */}
      <Box flexDirection="column" flexGrow={1} minHeight={12} marginBottom={1}>
        {overlayMode === 'HELP' && (
          <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
            <Text color="cyan" bold>💡  Codem CLI Help & Keyboard Shortcuts  💡</Text>
            <Text color="white">F1 - Toggle this Help Menu</Text>
            <Text color="white">F2 - Switch AI Chat Models</Text>
            <Text color="white">F3 - Switch active Database Sessions</Text>
            <Text color="white">F4 - List connected MCP & Native system tools</Text>
            <Text color="white">F5 - Safely shut down and exit</Text>
            <Box marginTop={1}>
              <Text color="yellow">Slash commands autocomplete: Type "/" inside chat</Text>
            </Box>
          </Box>
        )}

        {overlayMode === 'MODELS_SELECT' && (
          <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1}>
            <Text color="magenta" bold>🤖  Select Active AI Model  🤖</Text>
            {modelsList.map((m, mIdx) => {
              const isFocused = mIdx === selectedModelIndex;
              return (
                <Text key={m} color={isFocused ? 'yellow' : 'white'} bold={isFocused}>
                  {isFocused ? ' ▶ ' : '   '}{m} {m === activeModel ? '(active)' : ''}
                </Text>
              );
            })}
          </Box>
        )}

        {overlayMode === 'SESSIONS_SELECT' && (
          <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1}>
            <Text color="magenta" bold>📂  Select Conversation Session  📂</Text>
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

        {overlayMode === 'MCP_STATUS' && (
          <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
            <Text color="cyan" bold>🔌  Connected Tool integrations  🔌</Text>
            <Text color="white">• read_file (native)</Text>
            <Text color="white">• write_file (native)</Text>
            <Text color="white">• execute_bash (native)</Text>
            <Text color="white">• filesystem server tools (mcp.json)</Text>
          </Box>
        )}

        {overlayMode === 'NONE' && (
          <Box flexDirection="column">
            {focusedAgent ? (
              getFormattedLogs(focusedAgent.logs).map((logLine, lIdx) => (
                <Box key={lIdx}>
                  <Text color="white">{logLine}</Text>
                </Box>
              ))
            ) : (
              <Text color="gray">No active logs</Text>
            )}
          </Box>
        )}
      </Box>

      {/* 3. Sandbox Security Modal Compacto */}
      {pendingApproval && (
        <Box borderStyle="single" borderColor="yellow" paddingX={1} marginY={1} flexDirection="column">
          <Text color="yellow" bold>⚠️ [APPROVE TOOL]: {pendingApproval.toolName} ({pendingApproval.serverName})</Text>
          <Text color="gray">Arguments: {JSON.stringify(pendingApproval.args)}</Text>
          <Text color="yellow" bold>Approve tool execution? (y/n): </Text>
        </Box>
      )}

      {/* 4. Autocomplete Dropdown Inline Box */}
      {suggestions.length > 0 && (
        <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1} marginBottom={1}>
          {suggestions.map((sug, sIdx) => {
            const isFocused = sIdx === selectedSuggestIndex;
            return (
              <Text key={sug.cmd} color={isFocused ? 'yellow' : 'white'} bold={isFocused}>
                {isFocused ? ' ▶ ' : '   '}{sug.cmd} - {sug.desc}
              </Text>
            );
          })}
        </Box>
      )}

      {/* 5. Linha de Prompt Minimalista */}
      <Box paddingLeft={1} marginBottom={1}>
        <Text color="green" bold>
          {providerSetup !== 'NONE' ? `${getInputHeader()} ` : ''}
          {overlayMode === 'SESSIONS_SELECT' ? '[SELECT SESSION] ' : ''}
          {overlayMode === 'MODELS_SELECT' ? '[SELECT MODEL] ' : ''}
          {'>'}
        </Text>
        <Text color="white">
          {providerSetup === 'KEY' ? '*'.repeat(userInput.length) : userInput}
        </Text>
        <Text color="green">_</Text>
      </Box>

      {/* 6. Rodapé com Teclas de Função */}
      <Box borderStyle="single" borderColor="gray" paddingX={1} justifyContent="space-around">
        <Text color="gray"><Text color="cyan" bold>F1</Text> Help</Text>
        <Text color="gray"><Text color="cyan" bold>F2</Text> Models</Text>
        <Text color="gray"><Text color="cyan" bold>F3</Text> Sessions ({sessions.length})</Text>
        <Text color="gray"><Text color="cyan" bold>F4</Text> MCP</Text>
        <Text color="gray"><Text color="cyan" bold>F5</Text> Exit</Text>
      </Box>
    </Box>
  );
};
