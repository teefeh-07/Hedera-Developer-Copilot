import * as React from 'react';
import { useState } from 'react';

interface AgentHubProps {
  data: any;
  connected: boolean;
  sendMessage: (type: string, payload?: any) => void;
}

const AgentHub: React.FC<AgentHubProps> = ({ data, connected, sendMessage }) => {
  const [activeTab, setActiveTab] = useState<string>('codeGeneration');
  const [prompt, setPrompt] = useState<string>('');
  const [language, setLanguage] = useState<string>('solidity');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [analysisFile, setAnalysisFile] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // Handle code generation
  const handleGenerateCode = async () => {
    if (!prompt) {
      return;
    }

    setIsGenerating(true);
    setGeneratedCode('');

    // Send message to extension
    sendMessage('generateCode', { prompt, language });
  };

  // Handle code analysis
  const handleAnalyzeCode = async () => {
    if (!analysisFile) {
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult('');

    // Send message to extension
    sendMessage('analyzeCode', { filePath: analysisFile });
  };

  // Handle connect to Hedera
  const handleConnect = () => {
    sendMessage('connectHedera');
  };

  // React to data updates from extension
  React.useEffect(() => {
    if (data) {
      if (data.generatedCode) {
        setGeneratedCode(data.generatedCode);
        setIsGenerating(false);
      }

      if (data.analysisResult) {
        setAnalysisResult(data.analysisResult);
        setIsAnalyzing(false);
      }
    }
  }, [data]);

  return (
    <div className="tab-container">
      {/* Connection status */}
      <div className={`connection-status ${connected ? 'connected' : ''}`}>
        <div className={`connection-status-icon ${connected ? 'connected' : 'disconnected'}`}></div>
        {connected ? 'Connected to Hedera' : 'Not connected to Hedera'}
        {!connected && (
          <button 
            style={{ marginLeft: 'auto', width: 'auto', padding: '2px 8px' }}
            onClick={handleConnect}
          >
            Connect
          </button>
        )}
      </div>

      {/* Tab header */}
      <div className="tab-header">
        <button
          className={`tab-button ${activeTab === 'codeGeneration' ? 'active' : ''}`}
          onClick={() => handleTabChange('codeGeneration')}
        >
          Code Generation
        </button>
        <button
          className={`tab-button ${activeTab === 'codeAnalysis' ? 'active' : ''}`}
          onClick={() => handleTabChange('codeAnalysis')}
        >
          Code Analysis
        </button>
        <button
          className={`tab-button ${activeTab === 'agentMarketplace' ? 'active' : ''}`}
          onClick={() => handleTabChange('agentMarketplace')}
        >
          Agent Marketplace
        </button>
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {/* Code Generation Tab */}
        {activeTab === 'codeGeneration' && (
          <div>
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Generate Smart Contract Code</h2>
              </div>
              <div className="form-group">
                <label className="form-label">Language</label>
                <select
                  className="form-control"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="solidity">Solidity</option>
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Prompt</label>
                <textarea
                  className="form-control textarea-control"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the smart contract you want to generate..."
                />
              </div>
              <div className="button-row">
                <button onClick={handleGenerateCode} disabled={isGenerating || !prompt}>
                  {isGenerating ? 'Generating...' : 'Generate Code'}
                </button>
              </div>
            </div>

            {generatedCode && (
              <div className="result-container">
                <div className="result-header">
                  <h3 className="result-title">Generated Code</h3>
                  <button
                    style={{ width: 'auto' }}
                    onClick={() => sendMessage('insertCode', { code: generatedCode })}
                  >
                    Insert into Editor
                  </button>
                </div>
                <pre className="code-block">{generatedCode}</pre>
              </div>
            )}
          </div>
        )}

        {/* Code Analysis Tab */}
        {activeTab === 'codeAnalysis' && (
          <div>
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Analyze Smart Contract</h2>
              </div>
              <div className="form-group">
                <label className="form-label">File Path</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-control"
                    value={analysisFile}
                    onChange={(e) => setAnalysisFile(e.target.value)}
                    placeholder="Enter file path or select a file..."
                  />
                  <button
                    style={{ width: 'auto' }}
                    onClick={() => sendMessage('selectFile')}
                  >
                    Browse
                  </button>
                </div>
              </div>
              <div className="button-row">
                <button onClick={handleAnalyzeCode} disabled={isAnalyzing || !analysisFile}>
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Code'}
                </button>
              </div>
            </div>

            {analysisResult && (
              <div className="result-container">
                <div className="result-header">
                  <h3 className="result-title">Analysis Result</h3>
                </div>
                <div className="result-content">{analysisResult}</div>
              </div>
            )}
          </div>
        )}

        {/* Agent Marketplace Tab */}
        {activeTab === 'agentMarketplace' && (
          <div>
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Available Agents</h2>
              </div>
              
              {!connected ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <p>Connect to Hedera to view available agents</p>
                  <button onClick={handleConnect}>Connect to Hedera</button>
                </div>
              ) : (
                <div>
                  {data?.agents?.length > 0 ? (
                    data.agents.map((agent: any, index: number) => (
                      <div key={index} className="agent-card" onClick={() => sendMessage('useAgent', { agentId: agent.id })}>
                        <div className="agent-icon">
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="agent-info">
                          <div className="agent-name">{agent.name}</div>
                          <div className="agent-capabilities">
                            {agent.capabilities.join(', ')}
                          </div>
                        </div>
                        <div className="agent-fee">{agent.fee}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <p>No agents available</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentHub;
