
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { NotificationProvider } from './components/context/NotificationContext.jsx';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');
const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </React.StrictMode>
);