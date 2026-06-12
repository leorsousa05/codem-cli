# Proposal: Interactive TUI Actions (F1-F5), Autocomplete Dropdown and Native Tools Sandbox

## Status
- **State:** draft
- **Created:** 2026-06-12
- **Author:** @architect

## Problem Statement
O Codem CLI possui representações visuais na TUI para atalhos de teclado (F1-F5) e servidores MCP, mas nenhuma dessas funções está implementada no código, frustrando a experiência do usuário. O menu de slash commands interrompe a digitação do usuário e exige navegação exclusiva. Adicionalmente, se o usuário não possuir servidores MCP configurados externamente no arquivo `~/.codem/mcp.json`, o assistente de IA se torna inútil pois não consegue interagir com nenhum arquivo local.

## Goals
1. **Atalhos F1 a F5 Funcionais:** Associar teclas físicas de função (F1-F5) a popovers modais reais (Help, Model select, Session select, MCP status, Close).
2. **Dropdown de Autocomplete Inline:** Renderizar sugestões de Slash Commands de forma dinâmica acima da linha de entrada do terminal, permitindo a digitação contínua, seleção com Tab ou setas, e preenchimento automático.
3. **Ferramentas Nativas Internas:** Prover implementações integradas para `read_file`, `write_file`, e `execute_bash` diretamente dentro do Codem CLI, simulando um servidor MCP integrado permanente para que o assistente funcione 100% de imediato.

## Constraints
- Foco em manter o terminal limpo e sem poluição.
- Preservar o sandbox síncrono de segurança para qualquer ferramenta (incluindo as ferramentas nativas).
