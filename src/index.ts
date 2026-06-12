import React from 'react';
import { render } from 'ink';
import { AgentRunner } from './runner/AgentRunner.js';
import { DatabaseStore } from './db/sqlite.js';
import { TelemetryHUD } from './tui/index.js';
import { AgentSession } from './common/types.js';

async function main() {
  const dbStore = new DatabaseStore();
  await dbStore.initialize();

  // Inicializa o Runner. A chave da API pode ser configurada na TUI com /provider <key>
  const runner = new AgentRunner();

  // Renderiza a aplicação React Ink
  const app = render(React.createElement(TelemetryHUD, { runner, dbStore }));

  // Spawna o agente inicial padrão
  const rootSession: AgentSession = {
    id: '1',
    name: 'Root Agent',
    status: 'IDLE',
    logs: ['Starting root agent worker thread...\n'],
    isSubtask: false
  };

  runner.spawn(rootSession);

  // Garante fechamento correto em SIGINT
  process.on('SIGINT', async () => {
    await runner.shutdownAll();
    await dbStore.close();
    app.unmount();
    process.exit(0);
  });
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
