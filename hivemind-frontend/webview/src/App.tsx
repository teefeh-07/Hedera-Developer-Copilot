import * as React from 'react';
import { useState, useEffect } from 'react';
import './App.css';
import AgentHub from './components/AgentHub';
import AuditDashboard from './components/AuditDashboard';

interface AppProps {
  vscode: any;
}

const App: React.FC<AppProps> = ({ vscode }) => {
  const [view, setView] = useState<string>('loading');
  const [data, setData] = useState<any>(null);
  const [connected, setConnected] = useState<boolean>(false);

  useEffect(() => {
    // Listen for messages from the extension
    const messageListener = (event: MessageEvent) => {
      const message = event.data;
      
      switch (message.type) {
        case 'init':
          setView(message.view);
          setData(message.data);
          setConnected(message.connected || false);
          break;
          
        case 'update':
          setData(message.data);
          break;
          
        case 'connectionStatus':
          setConnected(message.connected);
          break;
          
        default:
          console.log('Unknown message type:', message.type);
      }
    };
    
    window.addEventListener('message', messageListener);
    
    // Send ready message to extension
    vscode.postMessage({ type: 'ready' });
    
    return () => {
      window.removeEventListener('message', messageListener);
    };
  }, [vscode]);

  // Send message to extension
  const sendMessage = (type: string, payload?: any) => {
    vscode.postMessage({ type, ...payload });
  };

  // Render appropriate view
  const renderView = () => {
    switch (view) {
      case 'agentHub':
        return <AgentHub data={data} connected={connected} sendMessage={sendMessage} />;
        
      case 'auditDashboard':
        return <AuditDashboard data={data} sendMessage={sendMessage} />;
        
      case 'loading':
      default:
        return (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading HiveMind Copilot...</p>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      {renderView()}
    </div>
  );
};

export default App;
