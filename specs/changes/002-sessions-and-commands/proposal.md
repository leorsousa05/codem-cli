# Proposal: Interactive Sessions Management and Slash Commands Menu

## Status
- **State:** draft
- **Created:** 2026-06-12
- **Author:** @architect

## Problem Statement
Atualmente, o Orion Code CLI inicia sempre sob uma sessão padrão estática (`id: '1'`). Isso impede que desenvolvedores mantenham contextos separados de projetos, revisitem o histórico de chat de dias anteriores ou alternem entre diferentes branches e objetivos sem perder os logs. A persistência em SQLite existe, mas carece de uma interface interativa de recuperação de dados.
Além disso, a configuração do provedor de inteligência artificial (`/provider`) e a execução de atalhos exigem digitação de strings longas com parâmetros complexos inline, gerando uma péssima experiência ao usuário e alta probabilidade de erros de digitação (typos). É necessária uma interface dinâmica inspirada no Claude Code, LazyGit e Ghostty, que capture comandos de forma assistida a partir de um menu de Slash Commands e gerencie as sessões de conversação no banco de dados.

## Goals
1. **Gerenciamento Dinâmico de Múltiplas Sessões:** Permitir a criação de novas sessões isoladas (`/new`) e a listagem de sessões passadas (`/session`) do banco de dados local SQLite3, exibindo seus metadados de contexto.
2. **Menu de Comandos Assistidos (Slash Menu):** Capturar a digitação do caractere `/` no terminal para abrir um menu suspenso ou popup interativo na TUI, permitindo ao usuário navegar com setas e selecionar comandos (como configurar API Key do provider, iniciar novas conversas, gerenciar sessões, limpar logs ou sair).
3. **Rolagem e Persistência do Chat Histórico:** Garantir que ao trocar de sessão, a TUI carregue instantaneamente todas as mensagens associadas àquela sessão do SQLite3 e as formate corretamente no chat de conversação com visual limpo.

## Non-Goals
- Não suportar criptografia das chaves de API locais nesta versão (as chaves do provider continuam salvas em runtime e associadas dinamicamente).
- Não gerenciar sincronização de sessões em nuvem (as sessões são estritamente locais no banco `~/.codem/codem.db`).

## Constraints
- **Runtime:** Node.js LTS, TypeScript (ESM/NodeNext target).
- **Interface:** React Ink para renderização baseada em flexbox e estados reativos de terminal.
- **Banco de Dados:** SQLite3 persistindo no caminho absoluto `~/.codem/codem.db`.
- **Modos de Visualização:** Chaveamento síncrono e exclusivo de foco de teclado na TUI sem atrasos de renderização (UI main loop sob React Ink).

## Risks & Mitigation Strategies
| Risk | Impact | Mitigation |
|------|--------|------------|
| Concorrência de teclas no Ink | Med | A máquina de estados da TUI deve redefinir o comportamento de captura do hook `useInput` para cada modo ativo, evitando que a digitação no chat seja disparada enquanto o usuário navega na lista de sessões. |
| Inconsistência de histórico ao carregar | High | Ao inicializar uma sessão antiga, limpar o cache local de logs da TUI e ler de forma ordenada a tabela `logs` do SQLite para reconstruir exatamente o array de strings em memória. |
| Perda de Foco em Modos Suspensos | Med | Garantir que ao sair de qualquer menu secundário (ex: pressionando `Esc`), a TUI retorne de forma limpa ao estado `'CHAT'` com foco no prompt de digitação do usuário. |

## Success Criteria
- [ ] O usuário digita `/` e a TUI renderiza instantaneamente o menu popup com as opções `/provider`, `/new`, `/session`, `/clear`, `/exit`.
- [ ] O usuário navega com setas no menu de slash commands, seleciona `/new` com Enter e a conversa atual é limpa e uma nova sessão é inserida no SQLite.
- [ ] O usuário seleciona `/session` e vê uma lista de sessões históricas, navega por elas e ao dar Enter em uma sessão antiga, o chat carrega perfeitamente os logs anteriores.
- [ ] Atalhos F1 a F5 no rodapé continuam operantes ou informam seu status de forma correta.
