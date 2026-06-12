# Design: Interactive TUI Actions (F1-F5), Autocomplete Dropdown and Native Tools Sandbox

## Directory Structure

```
/home/arch/codes/codem-cli/
├── src/
│   ├── common/
│   │   └── types.ts               # MODIFICADO: Contratos de TUIOverlayMode e NativeTool schemas
│   ├── worker/
│   │   ├── agent.worker.ts        # MODIFICADO: Integração de ferramentas nativas no prompt do LLM
│   │   └── NativeTools.ts         # ADICIONADO: Lógica de read, write e bash
│   └── tui/
│       └── index.tsx              # MODIFICADO: OverlayManager (F1-F5) e Dropdown Inline no "/"
```

---

## Architectural & Design Patterns

### 1. Facade Pattern
- **Aplicado em:** `NativeTools.ts` e `MCPClient.ts`. O Worker unifica a obtenção de ferramentas a partir de servidores MCP stdio externos e ferramentas nativas locais em uma única lista homogênea exposta ao LLM.
- **Justificativa:** Simplifica a integração de IA do Kimi, que consome ferramentas sem se preocupar de onde vieram ou se rodam nativamente.

### 2. Overlay Manager Pattern
- **Aplicado em:** `src/tui/index.tsx`. Define estados exclusivos de overlays sobrepostos na interface reativa do Ink:
```typescript
export type TUIOverlayMode = 'NONE' | 'HELP' | 'MODELS_SELECT' | 'SESSIONS_SELECT' | 'MCP_STATUS';
```

---

## Formal Contracts (`src/common/types.ts`)

```typescript
export type TUIOverlayMode = 'NONE' | 'HELP' | 'MODELS_SELECT' | 'SESSIONS_SELECT' | 'MCP_STATUS';

export interface NativeToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  execute(args: any): Promise<any>;
}
```

### Schemas das Ferramentas Nativas (`src/worker/NativeTools.ts`)

```typescript
export const NATIVE_TOOLS: NativeToolDefinition[] = [
  {
    name: 'read_file',
    description: 'Read the text content of a local file in the workspace directory.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path or relative path to workspace' }
      },
      required: ['path']
    },
    async execute(args: { path: string }) { ... }
  },
  {
    name: 'write_file',
    description: 'Create or overwrite a local file with new code/text content.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to write' },
        content: { type: 'string', description: 'Content to be written' }
      },
      required: ['path', 'content']
    },
    async execute(args: { path: string, content: string }) { ... }
  },
  {
    name: 'execute_bash',
    description: 'Run a shell command locally in the workspace terminal.',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command line to execute' }
      },
      required: ['command']
    },
    async execute(args: { command: string }) { ... }
  }
];
```

---

## Data Flow & State Management

### Dropdown Inline Autocomplete Flow
1. O usuário está digitando e inclui `/` no texto (ex: `userInput = "/p"`).
2. A TUI detecta que o texto começa com `/` e ativa a exibição do dropdown logo acima do prompt:
```
  Suggestions:
  ▶ /provider  (Configure API key)
    /new       (Start new chat)
```
3. O usuário pressiona `Tab` ou setas `Up`/`Down` para alternar entre as sugestões.
4. Ao pressionar `Enter` com uma sugestão destacada, a TUI substitui a porção de comando correspondente (ex: preenche `/provider `) e deixa o cursor ativo para que o usuário possa digitar os parâmetros sem sair da linha ou travar a TUI.

### F1-F5 Overlays State Flow
1. Pressionar `F1` chaveia `overlayMode = 'HELP'`, renderizando uma caixa de ajuda. Pressionar `Esc` ou `F1` fecha o modal.
2. Pressionar `F2` chaveia `overlayMode = 'MODELS_SELECT'`, exibindo a lista de modelos selecionáveis com as setas do teclado.
3. Pressionar `F3` chaveia `overlayMode = 'SESSIONS_SELECT'`, exibindo a lista de sessões do SQLite.
4. Pressionar `F4` chaveia `overlayMode = 'MCP_STATUS'`, listando os clientes conectados.
5. Pressionar `F5` limpa os workers e chama `process.exit(0)`.
