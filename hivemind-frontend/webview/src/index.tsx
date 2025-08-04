import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './App';
import './index.css';

// Get the VS Code API
declare global {
  interface Window {
    acquireVsCodeApi: () => any;
  }
}

// Acquire VS Code API
const vscode = window.acquireVsCodeApi();

// Render the app
ReactDOM.render(
  <React.StrictMode>
    <App vscode={vscode} />
  </React.StrictMode>,
  document.getElementById('root')
);
