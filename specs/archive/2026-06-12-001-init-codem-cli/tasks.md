# Plano de Implementação Incremental e Detalhado

Abaixo está o checklist exaustivo de tarefas divididas em fases estruturadas para o desenvolvimento completo do **Codem CLI**.

- [x] **Fase 1: Infraestrutura de Execução e Configurações Iniciais**
  - [x] Criar estrutura base de pastas: `src/common`, `src/storage`, `src/runner`, `src/tui`.
  - [x] Configurar `package.json` com ESM (`"type": "module"`), TS-Node e scripts de compilação/execução.
  - [x] Configurar compilador TypeScript (`tsconfig.json`) apontando `dist/` com suporte a NodeNext.
  - [x] Desenvolver classe `StorageService` implementando persistência física em SQLite dentro de `~/.codem/` para tabelas: `sessions`, `messages`, `configs`.
  - [x] Escrever testes de integração para o SQLite cobrindo concorrência de escritas e busca de histórico ordenado.

- [x] **Fase 2: Arquitetura IPC e Ciclo de Vida dos Workers**
  - [x] Definir arquivo de contratos e tipos TypeScript (`src/common/types.ts`) com as interfaces `IPCMessage`, `AgentMessage` e enumerações de estados do agente.
  - [x] Implementar classe `AgentRunner` responsável por gerenciar concorrência de processos/threads do Node (`worker_threads`).
  - [x] Desenvolver roteador/ouvinte de IPC de eventos centralizado no processo pai.
  - [x] Criar script executável do worker (`src/runner/agentWorker.ts`) com tratamento correto de escuta de mensagens do pai e loop assíncrono.
  - [x] Implementar mecanismos de interrupção forçada (`AGENT_STOP` e `.terminate()`) prevenindo vazamentos de memória e threads zumbis.
  - [x] Escrever testes unitários e de integração validando envio de mensagens assíncronas em paralelo através das Threads.

- [x] **Fase 3: Sandbox de Segurança, Permissões e MCP (Model Context Protocol)**
  - [x] Implementar interceptador de ferramentas (`Security Hooks`) para solicitações do tipo execução de terminal, leitura e escrita de arquivos locais.
  - [x] Desenvolver leitor de políticas de segurança configurável (Manual vs Auto-Pilot) definindo listas de comandos permitidos de forma transparente.
  - [x] Implementar cliente de conexão MCP (via Stdio e SSE) nos workers lendo arquivo `~/.codem/mcp.json`.
  - [x] Integrar mapeamento automático de ferramentas expostas por servidores MCP adicionando-os na system prompt do agente.
  - [ ] Escrever testes unitários para o parser de comandos seguros e sandbox de escrita de arquivo.

- [x] **Fase 4: Integração de LLM (Kimi API Client)**
  - [x] Criar módulo de integração com Kimi API (compatível com OpenAI SDK formato rest/streaming) utilizando a chave de API em variáveis de ambiente.
  - [x] Implementar gerador de streams mapeando os tokens de resposta em tempo real para a Thread Principal por meio da mensagem `AGENT_OUTPUT`.
  - [x] Implementar parser de chamadas de ferramentas locais a partir do retorno da API de IA no worker.
  - [ ] Escrever mocks de testes para chamadas e timeouts com a API de LLM.

- [ ] **Fase 5: Interface de Terminal Reativa (React Ink TUI)**
  - [ ] Implementar layout de painel industrial/utilitário usando Ink, chalk, e boxen.
  - [ ] Criar barra de navegação/abas permitindo chavear entre janelas de agentes concorrentes através das teclas de atalho (Alt + [1-9] ou teclas numéricas).
  - [ ] Implementar buffer em memória na TUI limitando histórico visível para evitar travamentos ou flickering do terminal na rolagem.
  - [ ] Desenvolver modal/popup de alerta e tomada de decisão para aprovação física de comandos em tempo de execução.
  - [ ] Integrar campos de input dinâmicos que enviam dados para o worker selecionado no momento.
  - [ ] Escrever testes de acessibilidade TUI simulando digitações e transição rápida de abas por evento de teclado.
