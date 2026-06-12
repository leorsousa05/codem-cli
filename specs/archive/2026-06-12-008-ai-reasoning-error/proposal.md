# Proposal: AI Reasoning Display and Error Feedback

## Status
- **State:** draft
- **Created:** 2026-06-12
- **Author:** @architect

## Problem Statement

Currently the user cannot see how the AI arrived at a response, and when the model returns nothing or fails silently the TUI just stays blank. The `ai` SDK already exposes reasoning deltas via `streamText().fullStream` for models that support it, but the worker only consumes the text stream and ignores everything else.

## Goals

1. Consume the model's native reasoning stream from `streamText().fullStream`.
2. Render reasoning as a collapsible block in the TUI, collapsed by default.
3. Show a visible message when the model produces no text and no tool calls.
4. Surface `error` events from the stream as `[CRITICAL ERROR]:` output.
5. Keep the build and tests green.

## Non-Goals

- Force models that don't support reasoning to generate reasoning.
- Add animations or persistent reasoning storage.
- Change the tool-call parser or approval flow.

## Constraints

- Work within the existing `AgentHarness` + TUI architecture.
- No emojis in production output.
- Reasoning block must follow the same collapsed-by-default pattern as tool calls.

## Success Criteria

- [ ] Reasoning appears as a collapsed row when the model provides it.
- [ ] User can expand/collapse the reasoning row with keyboard.
- [ ] Empty model responses show a `No response from model` message.
- [ ] Stream errors are emitted as critical errors.
- [ ] All existing tests pass; new parser tests added.
