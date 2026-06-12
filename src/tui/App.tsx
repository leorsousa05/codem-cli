import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import { AgentSession, IPCMessage } from '../common/types.js';
import { AgentRunner } from '../runner/AgentRunner.js';

interface TUIAppProps {
  runner: AgentRunner;
}

export const TUIApp: React.FC<TUIAppProps> = ({ runner }) => {
  const { exit } = useApp();
  const [sessions, setSessions] = useState<AgentSession[]>([
    { id: 'agent-1', name: 'Root Agent', status: 'IDLE', logs: [] },
    { id: 'agent-2', name: 'Sub-Agent Explorer', status: 'IDLE', logs: [] }
  ]);
  const [activeSessionIndex, setActiveSessionIndex] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [activeRequest, setActiveRequest] = useState<{ agentId: string; requestId: string; target: string; type: string } | null>(null);

  const activeSession = sessions[activeSessionIndex];

  useEffect(() => {
    runner.onMessage((msg: IPCMessage) => {
      setSessions(prev => prev.map(s => {
        if (s.id === msg.agentId) {
          // Keep a maximum log buffer limit in memory to prevent TUI screen flicker/lag
          let updatedLogs = [...s.logs];
          let updatedStatus = s.status;

          if (msg.type === 'AGENT_OUTPUT') {
            updatedLogs.push(msg.payload.text);
          } else if (msg.type === 'AGENT_STATUS') {
            updatedStatus = msg.payload.status;
          } else if (msg.type === 'AGENT_TOOL_REQUEST') {
            updatedStatus = 'AWAITING_APPROVAL';
            setActiveRequest({ 
              agentId: msg.agentId, 
              requestId: msg.payload.requestId,
              target: msg.payload.target,
              type: msg.payload.toolType
            });
            updatedLogs.push(`[Security Check]: Requires permission for ${msg.payload.toolType} on '${msg.payload.target}'\n`);
          }

          if (updatedLogs.length > 500) {
            updatedLogs = updatedLogs.slice(-500);
          }

          return { ...s, logs: updatedLogs, status: updatedStatus };
        }
        return s;
      }));
    });
  }, [runner]);

  useInput((input, key) => {
    if (key.escape) {
      exit();
    }
    
    // Switch tabs with Alt + Number / direct numbers
    if (input === '1') {
      setActiveSessionIndex(0);
    } else if (input === '2') {
      setActiveSessionIndex(1);
    }

    if (key.return) {
      if (activeRequest) {
        if (inputVal.toLowerCase() === 'y' || inputVal === '') {
          runner.sendApproval(activeRequest.agentId, activeRequest.requestId, true);
          setActiveRequest(null);
        } else if (inputVal.toLowerCase() === 'n') {
          runner.sendApproval(activeRequest.agentId, activeRequest.requestId, false);
          setActiveRequest(null);
        }
        setInputVal('');
      } else {
        if (inputVal.trim() === 'spawn') {
          runner.spawn(activeSession.id, 'Analyze files in active workspace', 'MANUAL');
        } else if (inputVal.trim() === 'stop') {
          runner.stop(activeSession.id);
        } else if (inputVal.trim() !== '') {
          runner.sendCommand(activeSession.id, inputVal);
        }
        setInputVal('');
      }
    } else {
      if (!key.backspace && !key.delete && input.length === 1 && !['1', '2'].includes(input)) {
        setInputVal(prev => prev + input);
      } else if (key.backspace) {
        setInputVal(prev => prev.slice(0, -1));
      }
    }
  });

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="cyan" padding={1}>
      {/* Top dashboard title and status overview */}
      <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <Text bold color="cyan">CODEM CLI - MULTI-AGENT CONTROL ROOM</Text>
        <Text color="gray">Exit: Esc</Text>
      </Box>

      {/* Tabs bar */}
      <Box flexDirection="row" marginBottom={1}>
        {sessions.map((s, idx) => (
          <Box key={s.id} marginRight={2} paddingX={1} borderStyle="single" borderColor={idx === activeSessionIndex ? 'cyan' : 'gray'}>
            <Text bold={idx === activeSessionIndex} color={idx === activeSessionIndex ? 'cyan' : 'white'}>
              {idx + 1}: {s.name} ({s.status})
            </Text>
          </Box>
        ))}
      </Box>

      {/* Main logs display buffer */}
      <Box flexDirection="column" height={15} borderStyle="round" borderColor="gray" paddingX={1} marginBottom={1}>
        <Text color="gray">--- Log Output for {activeSession.name} ---</Text>
        {activeSession.logs.slice(-12).map((log, idx) => (
          <Text key={idx} color="white">{log.trimEnd()}</Text>
        ))}
      </Box>

      {/* Intercepted Sandbox request modal inside Ink TUI */}
      {activeRequest && activeRequest.agentId === activeSession.id && (
        <Box borderStyle="double" borderColor="red" padding={1} marginBottom={1} flexDirection="column">
          <Text bold color="red">⚠️  SECURITY SANDBOX APPROVAL REQUIRED</Text>
          <Text>Agent wants to perform action: {activeRequest.type}</Text>
          <Text>Target resource: {activeRequest.target}</Text>
          <Text color="yellow">Allow execution? (y/n, default: y): </Text>
        </Box>
      )}

      {/* Shell/Console Prompt input */}
      <Box flexDirection="row">
        <Text color="cyan">[{activeSession.id}] Prompt {'>'} </Text>
        <Text color="white">{inputVal}</Text>
      </Box>
      
      <Box marginTop={1}>
        <Text color="gray">Keybindings: [1/2] Switch Windows | [spawn] Launch Agent | [stop] Terminate Agent</Text>
      </Box>
    </Box>
  );
};
