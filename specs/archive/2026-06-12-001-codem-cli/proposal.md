# Proposal: IA Code Assistance CLI (Moonshot & MCP)

## Status
- **State:** draft
- **Created:** 2026-06-12
- **Author:** @architect

## Problem Statement
Desenvolvedores de software de alta performance precisam de um assistente de IA local que consiga paralelizar tarefas complexas sem bloquear a experiência de uso no terminal (CLI/TUI). O modelo tradicional de assistentes lineares impede a exploração assíncrona. Além disso, a execução de comandos gerados por IA localmente oferece riscos graves de segurança (ex: exclusão acidental de dados, comandos maliciosos). É necessária uma arquitetura concorrente isolada onde tarefas rodem em Workers secundários em tempo real, enquanto a interface do usuário no terminal gerencia permissões explícitas de sandbox e permite navegação rica entre os agentes.

## Goals
1. **Concorrência Assíncrona e Isolada:** Utilizar o módulo nativo `worker_threads` do Node.js para spawnar dinamicamente subagentes em threads paralelas do sistema operacional.
2. **Interface Stream-Native Imersiva (Cyberpunk Telemetry HUD):** Desenvolver uma interface TUI baseada em React Ink capaz de exibir simultaneamente o status de todos os subagentes ativos em uma árvore topológica e permitir navegação bidirecional por teclado sem interromper os streams de logs.
3. **Sandbox com Interceptação de Ferramentas (Zero-Trust):** Prevenir que workers executem qualquer comando de escrita, leitura ou subprocesso de forma autônoma. Cada chamada precisa suspender o worker e solicitar confirmação humana na TUI.
4. **Persistência Centralizada e Transacional:** Persistir sessões e logs históricos localmente em SQLite, garantindo isolamento de escrita por meio de delegação de I/O exclusiva à thread principal.

## Non-Goals
- Interface visual web ou desktop (Electron, WebSockets locais para navegadores).
- Integrações nativas com outros providers que não o Kimi (Moonshot API) nesta fase inicial.
- Gerenciamento automático de resolução de conflitos em mesclagens Git complexas.

## Constraints
- **Runtime:** Node.js v20+ LTS executando TypeScript compilado com formato ES Modules (ESM) para aproveitar o ecossistema moderno.
- **TUI Framework:** React Ink para renderização flexível baseada em reconciliação de componentes, Chalk para estilização e ANSI styling, Boxen para caixas.
- **Banco de Dados:** SQLite3 persistido sob o caminho absoluto `~/.codem/codem.db`.
- **MCP Core:** Utilização obrigatória do `@modelcontextprotocol/sdk` conectando-se via transports baseados em subprocessos STDIO mapeados em `~/.codem/mcp.json`.
- **Ambiente de Teste:** Jest e ts-jest configurados com suporte a ESM experimental `--experimental-vm-modules` do Node.js.

## Risks & Mitigation Strategies
| Risk | Impact | Mitigation |
|------|--------|------------|
| ESM no Jest com Workers | High | Configurar carregamento de Worker via script JS transpilado ou utilizar ts-node/tsx register na instanciação do Worker em ambiente de teste. |
| Concorrência de escrita no SQLite | High | Proibir terminantemente que Worker Threads abram conexões diretas ou gravem no SQLite. Toda escrita é disparada no Main Process a partir de eventos IPC recebidos. |
| Subprocessos MCP órfãos | High | O Runner registrará hooks de encerramento. Ao finalizar ou deletar um subagente, o processo principal envia um sinal IPC de parada ao Worker, que fecha ordenadamente a stdin do MCP antes do `worker.terminate()`. |
| Perda de eventos em streams rápidos | Med | Implementar um buffer simples na TUI para renderização controlada (throttling) de logs rápidos acumulados. |

## Success Criteria
- [ ] O Main Process inicializa e renderiza o HUD de telemetria mapeando múltiplos agentes em execução paralela.
- [ ] A navegação com setas do teclado alterna o foco do subagente ativo na TUI, atualizando a exibição do histórico de logs.
- [ ] Um comando de ferramenta local (como leitura de arquivo) vindo do Worker dispara o sinal de sandbox e congela o worker até receber resposta.
- [ ] Todos os logs de execução de todos os subagentes são armazenados corretamente nas tabelas SQLite e recuperados na reinicialização.
