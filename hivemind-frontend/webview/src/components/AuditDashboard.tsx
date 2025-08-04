import * as React from 'react';
import { useState, useEffect } from 'react';

interface AuditDashboardProps {
  data: any;
  sendMessage: (type: string, payload?: any) => void;
}

const AuditDashboard: React.FC<AuditDashboardProps> = ({ data, sendMessage }) => {
  const [activeTab, setActiveTab] = useState<string>('vulnerabilities');
  const [selectedVulnerability, setSelectedVulnerability] = useState<any>(null);
  const [isGeneratingFix, setIsGeneratingFix] = useState<boolean>(false);
  const [generatedFix, setGeneratedFix] = useState<string>('');

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // Handle vulnerability selection
  const handleSelectVulnerability = (vulnerability: any) => {
    setSelectedVulnerability(vulnerability);
    setGeneratedFix('');
  };

  // Handle generate fix
  const handleGenerateFix = async () => {
    if (!selectedVulnerability) {
      return;
    }

    setIsGeneratingFix(true);
    setGeneratedFix('');

    // Send message to extension
    sendMessage('generateFix', { vulnerability: selectedVulnerability });
  };

  // Handle apply fix
  const handleApplyFix = () => {
    if (!generatedFix || !selectedVulnerability) {
      return;
    }

    // Send message to extension
    sendMessage('applyFix', { 
      vulnerability: selectedVulnerability,
      fix: generatedFix
    });
  };

  // React to data updates from extension
  useEffect(() => {
    if (data) {
      if (data.generatedFix) {
        setGeneratedFix(data.generatedFix);
        setIsGeneratingFix(false);
      }
    }
  }, [data]);

  // Get severity class
  const getSeverityClass = (severity: string): string => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return '';
    }
  };

  // Get severity badge class
  const getSeverityBadgeClass = (severity: string): string => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'badge-danger';
      case 'high':
        return 'badge-danger';
      case 'medium':
        return 'badge-warning';
      case 'low':
        return 'badge-success';
      default:
        return 'badge-info';
    }
  };

  return (
    <div className="tab-container">
      {/* Tab header */}
      <div className="tab-header">
        <button
          className={`tab-button ${activeTab === 'vulnerabilities' ? 'active' : ''}`}
          onClick={() => handleTabChange('vulnerabilities')}
        >
          Vulnerabilities
        </button>
        <button
          className={`tab-button ${activeTab === 'aiAnalysis' ? 'active' : ''}`}
          onClick={() => handleTabChange('aiAnalysis')}
        >
          AI Analysis
        </button>
        <button
          className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => handleTabChange('summary')}
        >
          Summary
        </button>
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {/* Vulnerabilities Tab */}
        {activeTab === 'vulnerabilities' && (
          <div style={{ display: 'flex', height: '100%' }}>
            {/* Vulnerabilities list */}
            <div style={{ width: '40%', overflowY: 'auto', paddingRight: '16px' }}>
              <h2>Detected Issues</h2>
              
              {data?.vulnerabilities?.length > 0 ? (
                data.vulnerabilities.map((vuln: any, index: number) => (
                  <div 
                    key={index} 
                    className={`vulnerability-item ${getSeverityClass(vuln.severity)}`}
                    onClick={() => handleSelectVulnerability(vuln)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="vulnerability-header">
                      <div className="vulnerability-title">{vuln.title}</div>
                      <div className={`badge ${getSeverityBadgeClass(vuln.severity)}`}>
                        {vuln.severity}
                      </div>
                    </div>
                    <div className="vulnerability-location">{vuln.location}</div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <p>No vulnerabilities found</p>
                </div>
              )}
            </div>

            {/* Vulnerability details */}
            <div style={{ width: '60%', borderLeft: '1px solid var(--vscode-panel-border)', paddingLeft: '16px' }}>
              {selectedVulnerability ? (
                <div>
                  <h2>{selectedVulnerability.title}</h2>
                  
                  <div className="card">
                    <div className="form-group">
                      <label className="form-label">Severity</label>
                      <div className={`badge ${getSeverityBadgeClass(selectedVulnerability.severity)}`}>
                        {selectedVulnerability.severity}
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <div>{selectedVulnerability.description}</div>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Location</label>
                      <div className="vulnerability-location">{selectedVulnerability.location}</div>
                    </div>
                    
                    <div className="button-row">
                      <button 
                        onClick={() => sendMessage('showVulnerability', { vulnerability: selectedVulnerability })}
                      >
                        Show in Editor
                      </button>
                      <button 
                        onClick={handleGenerateFix} 
                        disabled={isGeneratingFix}
                      >
                        {isGeneratingFix ? 'Generating...' : 'Generate Fix'}
                      </button>
                    </div>
                  </div>

                  {generatedFix && (
                    <div className="result-container">
                      <div className="result-header">
                        <h3 className="result-title">Generated Fix</h3>
                        <button
                          style={{ width: 'auto' }}
                          onClick={handleApplyFix}
                        >
                          Apply Fix
                        </button>
                      </div>
                      <pre className="code-block">{generatedFix}</pre>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <p>Select a vulnerability to view details</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Analysis Tab */}
        {activeTab === 'aiAnalysis' && (
          <div>
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">AI Analysis</h2>
              </div>
              
              {data?.aiAnalysis ? (
                <div className="result-content">{data.aiAnalysis}</div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <p>No AI analysis available</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div>
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Audit Summary</h2>
              </div>
              
              {data?.summary ? (
                <div>
                  <div className="form-group">
                    <label className="form-label">Contract</label>
                    <div>{data.contractName || 'Unknown'}</div>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Audit Date</label>
                    <div>{new Date(data.timestamp || Date.now()).toLocaleString()}</div>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Issues Found</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div className="badge badge-danger">
                        {data.summary.critical || 0} Critical
                      </div>
                      <div className="badge badge-danger">
                        {data.summary.high || 0} High
                      </div>
                      <div className="badge badge-warning">
                        {data.summary.medium || 0} Medium
                      </div>
                      <div className="badge badge-success">
                        {data.summary.low || 0} Low
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Summary</label>
                    <div>{data.summary.text}</div>
                  </div>
                  
                  <div className="button-row">
                    <button onClick={() => sendMessage('exportReport')}>
                      Export Report
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <p>No summary available</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditDashboard;
