import React from 'react';
import { AgentRunner } from '../runner/AgentRunner.js';
import { DatabaseStore } from '../db/sqlite.js';
import { ThemeProvider } from './theme/ThemeProvider.js';
import { App } from './components/App.js';

export interface TelemetryHUDProps {
  runner: AgentRunner;
  dbStore: DatabaseStore;
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({ runner, dbStore }) => {
  return (
    <ThemeProvider>
      <App runner={runner} dbStore={dbStore} />
    </ThemeProvider>
  );
};
