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
        // Inicializa com um Root Agent padrão se não houver registros
        const root: AgentSession = {
          id: '1',
          name: 'Root Agent',
          status: 'IDLE',
          logs: ['Initialized telemetry screen...\n'],
          isSubtask: false
        };
        dbStore.createSession(root).then(() => {
          for (const line of root.logs) {
            dbStore.appendLog(root.id, line);
          }
          setSessions([root]);
        });
      } else {
        setSessions(loaded);
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

  // Teclado e Navegação
  // Provider Config State
  const [providerSetup, setProviderSetup] = useState<'NONE' | 'AWAITING_KEY' | 'AWAITING_MODEL'>('NONE');
  const [tempApiKey, setTempApiKey] = useState<string>('');

  useInput((input, key) => {
    // Tecla ESC para encerrar a aplicação graciosamente
    if (key.escape) {
      runner.shutdownAll().then(() => {
        exit();
        process.exit(0);
      });
      return;
    }

    // Navegação entre subagentes ativos
    if (key.upArrow) {
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : sessions.length - 1));
      return;
    }
    if (key.downArrow || key.tab) {
      setFocusedIndex((prev) => (prev < sessions.length - 1 ? prev + 1 : 0));
      return;
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

    // Teclas de remoção de caractere (Backspace / Delete)
    if (key.backspace || key.delete || input === '\x7f' || input === '\b') {
      setUserInput((prev) => prev.slice(0, -1));
      return;
    }

    // Digitação e envio de prompt ao agente focado
    if (key.return) {
      const trimmed = userInput.trim();
      setUserInput('');

      if (providerSetup === 'AWAITING_KEY') {
        if (trimmed) {
          setTempApiKey(trimmed);
          setProviderSetup('AWAITING_MODEL');
        } else {
          setProviderSetup('NONE');
        }
        return;
      }

      if (providerSetup === 'AWAITING_MODEL') {
        const modelName = trimmed || 'moonshot-v1-8k';
        setActiveModel(modelName);
        runner.setProvider(tempApiKey, modelName);
        
        // Atualiza log do agente focado confirmando a configuração
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
        return;
      }

      if (trimmed) {
        const activeAgent = sessions[focusedIndex];
        if (activeAgent) {
          // Ativa o setup interativo de provider se digitar /provider
          if (trimmed === '/provider') {
            setProviderSetup('AWAITING_KEY');
            return;
          }

          // Atualiza visual local do log
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

          // Spawna subtask dinamicamente para teste
          if (trimmed === '/spawn-subtask') {
            const newSubId = String(sessions.length + 1);
            const subtask: AgentSession = {
              id: newSubId,
              parentId: activeAgent.id,
              name: `subtask-${newSubId}`,
              status: 'IDLE',
              logs: [`Spawned from parent ${activeAgent.name}\n`],
              isSubtask: true
            };
            dbStore.createSession(subtask).then(() => {
              runner.spawn(subtask);
            });
            return;
          }

          // Envia o comando
          runner.sendCommand(activeAgent.id, trimmed);
        }
      }
    } else if (input && !key.ctrl && !key.meta) {
      setUserInput((prev) => prev + input);
    }
  });

  const focusedAgent = sessions[focusedIndex];

  // Helper para formatar logs do chat de código de forma limpa
  const getFormattedLogs = (rawLogs: string[]) => {
    const allLines = rawLogs.join('').split('\n').filter(Boolean);
    return allLines.slice(-10); // Mantém as últimas 10 linhas visíveis
  };

  const getInputHeader = () => {
    if (providerSetup === 'AWAITING_KEY') {
      return '[PROVIDER API KEY (Masked)]';
    }
    if (providerSetup === 'AWAITING_MODEL') {
      return '[PROVIDER MODEL (Default: moonshot-v1-8k)]';
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
          <Text color="cyan" bold>Orion Code</Text>
          <Text color="gray">{cwd.split('/').pop() || 'project'} • <Text color="green">{gitBranch}</Text> (<Text color="yellow">{getGitStatus()}</Text>)</Text>
        </Box>
        <Box justifyContent="space-between">
          <Text color="magenta" bold>{activeModel}</Text>
          <Text color="gray">0% context • {runner['activeWorkers'].size} agents • 4 MCP</Text>
        </Box>
      </Box>

      {/* 2. Chat History - Fluxo contínuo sem molduras gigantes */}
      <Box flexDirection="column" flexGrow={1} minHeight={10} marginBottom={1}>
        {focusedAgent ? (
          <Box flexDirection="column">
            {getFormattedLogs(focusedAgent.logs).map((logLine, lIdx) => (
              <Box key={lIdx}>
                <Text color="white">{logLine}</Text>
              </Box>
            ))}
          </Box>
        ) : (
          <Text color="gray">No active logs</Text>
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

      {/* 4. Linha de Prompt Minimalista */}
      <Box paddingLeft={1} marginBottom={1}>
        <Text color="green" bold>{providerSetup !== 'NONE' ? `${getInputHeader()} ` : ''}{'>'} </Text>
        <Text color="white">
          {providerSetup === 'AWAITING_KEY' ? '*'.repeat(userInput.length) : userInput}
        </Text>
        <Text color="green">_</Text>
      </Box>

      {/* 5. Rodapé com Teclas de Função (LazyGit Style) */}
      <Box borderStyle="single" borderColor="gray" paddingX={1} justifyContent="space-around">
        <Text color="gray"><Text color="cyan" bold>F1</Text> Help</Text>
        <Text color="gray"><Text color="cyan" bold>F2</Text> Models</Text>
        <Text color="gray"><Text color="cyan" bold>F3</Text> Agents ({runner['activeWorkers'].size})</Text>
        <Text color="gray"><Text color="cyan" bold>F4</Text> MCP (4)</Text>
        <Text color="gray"><Text color="cyan" bold>F5</Text> Logs</Text>
      </Box>
    </Box>
  );
};
