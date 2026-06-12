#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import dotenv from 'dotenv';
import { AgentRunner } from './runner/AgentRunner.js';
import { StorageService } from './storage/StorageService.js';
import { TUIApp } from './tui/App.js';

dotenv.config();

async function main() {
  const storage = new StorageService();
  await storage.initialize();
  
  const runner = new AgentRunner();

  const { waitUntilExit } = render(React.createElement(TUIApp, { runner }));
  
  await waitUntilExit();
  await storage.close();
}

main().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
