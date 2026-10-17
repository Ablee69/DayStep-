import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@daystep/design-tokens/tokens.css';
import './styles.css';
import { App } from './App';
import { AuthGate } from './AuthGate';

createRoot(document.getElementById('root')!).render(
  <StrictMode><AuthGate>{({ identity, signOut }) => <App identity={identity} onSignOut={signOut} />}</AuthGate></StrictMode>,
);
