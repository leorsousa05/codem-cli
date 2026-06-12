# Design Arquitetural Avançado: Codem CLI (com Suporte a MCP)

Este documento estabelece as especificações físicas, o fluxo de comunicação de threads e o design detalhado dos componentes de backend e frontend para o **Codem CLI**.

## 1. Topologia e Arquitetura de Múltiplos Agentes em Subprocessos

Cada agente executor é isolado em um `worker_threads` (ou subprocesso Node se necessário para isolamento total de processos). 

```
                                +-----------------------------+
                                |      Thread Principal       |
                                |         (TUI/Ink)           |
                                +-----------------------------+
                                   /           |           \
                    +-------------+            |            +-------------+
                    |                          |                          |
             IPC (PostMessage)          IPC (PostMessage)          IPC (PostMessage)
                    |                          |                          |
         +--------------------+     +--------------------+     +--------------------+
         |   Agent Worker 1   |     |   Agent Worker 2   |     |   Agent Worker 3   |
         |    (Root Agent)    |     |  (File Explorer)   |     |  (CMD Executor)    |
         +--------------------+     +--------------------+     +--------------------+
            /              \                                          /
       API Call          MCP Server (Process)                    API Call
          /                  \                                      /
   +--------------+      +------------------+                +--------------+
   |   Kimi API   |      | Local MCP Server |                |   Kimi API   |
   +--------------+      +------------------+                +--------------+
```

### 1.1 Ciclo de Vida dos Workers e IPC
1. **Inicialização (`AGENT_SPAWN`):** A Thread Principal cria o worker passando os dados de contexto, chaves de API do Kimi e limites de recursos via `workerData`.
2. **Ciclo de Mensageria:** O Worker executa em loop assíncrono. Mensagens de log (`AGENT_OUTPUT`), pedidos de ferramenta (`AGENT_TOOL_REQUEST`) e status (`AGENT_STATUS`) são emitidas ao processo pai via `parentPort.postMessage`.
3. **Gerenciamento de Fila de Ferramentas:** Quando um agente solicita a execução de uma ferramenta (ex: Ler arquivo, executar comando ou acessar um MCP Server), o Worker entra no estado `AWAITING_APPROVAL` e bloqueia sua execução aguardando uma resposta estruturada (`AGENT_TOOL_RESPONSE`) da Thread Principal.
4. **Finalização (`AGENT_STOP` / Expurgo):** O encerramento pode ocorrer por conclusão da tarefa, solicitação manual do usuário na TUI (comunicação de interrupção imediata via sinalizador atômico de thread ou término do worker via `.terminate()`) ou crash interno.

---

## 2. Protocolo de Comunicação IPC Detalhado (Tipos e Eventos)

Os contratos de dados entre a Thread Principal e os Workers são tipados estritamente:

```typescript
export type AgentStatus =
  | 'IDLE'
  | 'THINKING'
  | 'EXECUTING_TOOL'
  | 'AWAITING_APPROVAL'
  | 'STOPPED'
  | 'FINISHED'
  | 'ERROR';

export interface IPCMessage {
  id: string;          // ID único da mensagem para correlação
  agentId: string;     // ID do agente originador/destinatário
  type: 
    | 'AGENT_SPAWN'          // Pai -> Filho: Inicia execução
    | 'AGENT_OUTPUT'         // Filho -> Pai: Log incremental (stream de tokens ou stderr/stdout)
    | 'AGENT_INPUT'          // Pai -> Filho: Entrada manual de texto pelo usuário
    | 'AGENT_STATUS'         // Filho -> Pai: Transição de estado de ciclo de vida
    | 'AGENT_TOOL_REQUEST'   // Filho -> Pai: Solicitação de aprovação para rodar ferramenta
    | 'AGENT_TOOL_RESPONSE'  // Pai -> Filho: Resultado da aprovação e dados da execução
    | 'AGENT_STOP';          // Pai -> Filho: Solicitação de encerramento imediato
  payload: any;
  timestamp: number;
}
```

---

## 3. Especificação do Sandbox e Execução de Ferramentas

O sandbox de segurança atua interceptando qualquer solicitação do LLM antes que ela atinja o sistema de arquivos ou o terminal local do sistema operacional.

### 3.1 Interceptador de Comandos e Arquivos (Security Hooks)
Quando o agente necessita ler um arquivo, escrever um arquivo ou executar um comando shell, ele envia a mensagem `AGENT_TOOL_REQUEST` descrevendo a ação desejada:

```typescript
export interface ToolRequestPayload {
  requestId: string;
  toolType: 'FILE_READ' | 'FILE_WRITE' | 'SHELL_EXECUTE' | 'MCP_CALL';
  target: string;       // Caminho do arquivo ou comando shell
  params: any;          // Parâmetros extras
}
```

A TUI intercepta este payload e analisa a política de segurança configurada para o agente:
1. **Modo Manual:** Renderiza um painel em destaque contendo o comando/modificação exata e aguarda a confirmação física (`Y` ou `N`) do desenvolvedor no terminal.
2. **Modo Auto-Pilot:** Executa automaticamente e retorna o resultado ao Worker via `AGENT_TOOL_RESPONSE` apenas se a ação estiver presente em uma lista de ferramentas seguras e configurada de antemão pelo usuário.

---

## 4. Integração da Kimi API com Streaming e Chamadas de Ferramentas

A comunicação com a API do Kimi (Moonshot AI) utiliza a biblioteca oficial ou o cliente HTTP encapsulado no worker.

- **Streaming:** O agente realiza chamadas de completions passando `stream: true`. Cada chunk de texto retornado pela API do Kimi é enviado imediatamente para o processo principal com o tipo de mensagem `AGENT_OUTPUT`, permitindo renderização imediata de digitação reativa na tela da TUI.
- **Detecção de Tool Calling:** Quando o Kimi retorna um bloco `tool_calls` contendo instruções de execução de ferramentas locais, o parser no worker interrompe o fluxo de geração, empacota os dados da ferramenta e despacha a requisição de aprovação `AGENT_TOOL_REQUEST` ao processo principal.

---

## 5. Suporte Completo ao Model Context Protocol (MCP)

O **Codem CLI** expõe um cliente MCP embarcado capaz de se conectar a servidores MCP locais configurados via arquivo de configuração JSON (ex: `~/.codem/mcp.json`).

1. **Descoberta de Ferramentas:** Durante o spawn, o Worker lê o arquivo de configuração e estabelece conexão (via stdio ou SSE) com os servidores MCP listados. Ele solicita a lista de ferramentas disponíveis ao servidor MCP.
2. **Inclusão na System Prompt:** As ferramentas descobertas no servidor MCP são formatadas e passadas na definição de funções (functions schema) da chamada de API do Kimi.
3. **Roteamento de Execução:** Quando o Kimi solicita o uso de uma ferramenta ligada a um servidor MCP, o Worker:
   - Intercepta e despacha a solicitação de autorização ao processo principal (`AGENT_TOOL_REQUEST` com tipo `MCP_CALL`).
   - Após a aprovação do usuário na TUI, o Worker envia o comando de execução correspondente ao servidor MCP, recupera a resposta e devolve-a ao LLM.

---

## 6. Arquitetura de UI e Estado do Dashboard (Ink)

Para evitar cintilação da TUI e garantir responsividade e rolagem rápida dos logs simultâneos de múltiplos agentes:

1. **Store de Visualização de Agente:** A TUI mantém em memória um buffer contendo as últimas 500 linhas de logs de cada agente ativo.
2. **Chaveamento de Janela (Active Tab):** Quando o usuário alterna entre os agentes (`Alt + [1-9]`), apenas o buffer correspondente ao agente selecionado é passado para renderização no componente principal da Ink, reduzindo o uso de CPU.
3. **Console Unificado:** Um canal de monitoramento global exibe notificações menores no topo da tela do terminal indicando atividades secundárias de agentes em background (ex: `[Agente 3] Executando comando...`).
