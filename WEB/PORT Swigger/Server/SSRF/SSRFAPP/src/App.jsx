import React, { useState } from 'react';
import { labs } from './data/labs';
import { 
  Terminal, 
  Copy, 
  Check, 
  Settings2,
  Database,
  Crosshair,
  Radar,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PentestToolkit = () => {
  const [appMode, setAppMode] = useState('DATABASE'); // 'DATABASE' | 'ANALYZER'
  const [labHost, setLabHost] = useState('');
  const [collabId, setCollabId] = useState('');
  const [targetIp, setTargetIp] = useState('192.168.0.1');
  
  const [copiedId, setCopiedId] = useState(null);
  const [activeTab, setActiveTab] = useState(labs[0].id);
  
  // Analyzer State
  const [rawRequest, setRawRequest] = useState('');
  const [analysisReport, setAnalysisReport] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getProcessedPayload = (payload) => {
    let text = payload;
    if (labHost) text = text.replace(/\[LAB-DOMAIN\]/g, labHost);
    if (collabId) text = text.replace(/\[COLLABORATOR-ID\]/g, collabId);
    if (targetIp) text = text.replace(/\[IP\]/g, targetIp);
    return text;
  };

  const analyzeRequest = () => {
    if (!rawRequest.trim()) {
      setAnalysisReport(null);
      return;
    }

    let threats = [];
    
    // Check parameters in path and body
    if (rawRequest.includes('stockApi=')) {
      threats.push({
        id: 'detect-stock',
        type: 'Parameter Detection',
        target: 'stockApi',
        severity: 'HIGH',
        description: 'The stockApi parameter is a highly vulnerable SSRF entry point. Direct backend fetching detected.',
        recommendedLabs: [1, 2, 3, 4]
      });
    }

    if (rawRequest.match(/[\?&]path=/i) || rawRequest.includes('nextProduct?')) {
      threats.push({
        id: 'detect-redirect',
        type: 'Open Redirection',
        target: 'path=',
        severity: 'MEDIUM',
        description: 'Path parameters frequently lead to Open Redirection chaining into restricted network SSRF.',
        recommendedLabs: [5]
      });
    }

    // Check headers
    const refererMatch = rawRequest.match(/Referer:\s*(.+)/i);
    if (refererMatch) {
      threats.push({
        id: 'detect-referer',
        type: 'Header Detection',
        target: 'Referer',
        severity: 'HIGH',
        description: 'Analytics systems often parse the Referer header unsafely, leading to Blind OAST SSRF or Shellshock exploitation.',
        recommendedLabs: [6, 7]
      });
    }

    if (threats.length === 0) {
      threats.push({
        id: 'detect-none',
        type: 'Unknown',
        target: 'N/A',
        severity: 'LOW',
        description: 'No classic PortSwigger SSRF signatures (stockApi, path, Referer) detected. Check Host header or other parameters.',
        recommendedLabs: []
      });
    }

    setAnalysisReport(threats);
  };

  const jumpToLab = (labId) => {
    setActiveTab(labId);
    setAppMode('DATABASE');
  };

  const activeLabData = labs.find(l => l.id === activeTab);

  return (
    <div className="flex bg-[#000] text-[#c9d1d9] font-mono selection:bg-[#0ea5e9]/30 h-screen overflow-hidden">
      
      {/* LEFT SIDEBAR - NAVIGATION */}
      <aside className="w-1/4 min-w-[300px] max-w-[350px] bg-[#09090b] border-r border-[#27272a] flex flex-col h-full">
        <div className="p-4 border-b border-[#27272a] flex items-center gap-3 shrink-0">
          <Terminal className="w-5 h-5 text-[#3b82f6]" />
          <h1 className="text-sm font-bold tracking-tight text-white uppercase">PortSwigger SSRF</h1>
        </div>

        {/* Mode Switcher */}
        <div className="flex border-b border-[#27272a] shrink-0">
          <button 
            onClick={() => setAppMode('DATABASE')}
            className={`flex-1 py-3 text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-2 ${appMode === 'DATABASE' ? 'bg-[#3b82f6]/10 text-[#3b82f6] border-b-2 border-[#3b82f6]' : 'text-[#71717a] hover:text-[#a1a1aa]'}`}
          >
            <Database className="w-3 h-3" /> Database
          </button>
          <button 
            onClick={() => setAppMode('ANALYZER')}
            className={`flex-1 py-3 text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-2 ${appMode === 'ANALYZER' ? 'bg-[#10b981]/10 text-[#10b981] border-b-2 border-[#10b981]' : 'text-[#71717a] hover:text-[#a1a1aa]'}`}
          >
            <Radar className="w-3 h-3" /> Analyzer
          </button>
        </div>
        
        {/* Lab List (Only visible in Database mode) */}
        {appMode === 'DATABASE' && (
          <div className="flex-grow overflow-y-auto w-full p-2 space-y-1">
            {labs.map((lab) => (
              <button
                key={lab.id}
                onClick={() => setActiveTab(lab.id)}
                className={`w-full text-left px-3 py-3 text-xs border transition-none flex flex-col gap-1 ${
                  activeTab === lab.id 
                  ? 'bg-[#18181b] border-[#3b82f6] text-white shadow-[inset_2px_0_0_0_#3b82f6]' 
                  : 'bg-transparent border-[#27272a]/0 text-[#a1a1aa] hover:bg-[#27272a]/50 hover:text-[#d4d4d8]'
                }`}
              >
                <div className="flex justify-between w-full opacity-60 text-[10px]">
                  <span>ID: 0{lab.id}</span>
                  <span>{lab.category}</span>
                </div>
                <span className="font-medium truncate block w-full">{lab.title}</span>
              </button>
            ))}
          </div>
        )}

        {appMode === 'ANALYZER' && (
          <div className="p-4 text-xs text-[#a1a1aa] leading-relaxed">
            <h3 className="text-white font-bold mb-2">Smart Scanning Engine</h3>
            <p className="mb-2">Paste raw HTTP requests from Burp Suite proxy into the analyzer.</p>
            <p>The engine will parse method parameters and headers to identify specific PortSwigger SSRF attack vectors instantly.</p>
          </div>
        )}
      </aside>

      {/* RIGHT WORKSPACE - MAIN CONTENT */}
      <main className="flex-1 flex flex-col bg-[#000] h-full overflow-hidden">
        
        {/* GLOBAL VARIABLES BAR */}
        <header className="h-[60px] flex items-center px-6 bg-[#09090b] border-b border-[#27272a] shrink-0 gap-6">
          <div className="flex items-center gap-2 shrink-0">
            <Settings2 className="w-4 h-4 text-[#71717a]" />
            <span className="text-xs text-[#a1a1aa] uppercase mr-2">Config:</span>
          </div>
          
          <div className="flex items-center gap-2 overflow-hidden flex-1 max-w-[300px]">
             <span className="text-xs text-[#52525b] shrink-0">[LAB-DOMAIN]</span>
             <input 
              placeholder="e.g. 0a2f...net"
              className="px-2 py-1 bg-[#18181b] border border-[#27272a] outline-none text-xs w-full text-[#3b82f6] focus:border-[#3b82f6]"
              value={labHost}
              onChange={(e) => setLabHost(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 overflow-hidden flex-1 max-w-[300px]">
             <span className="text-xs text-[#52525b] shrink-0">[COLLAB-ID]</span>
             <input 
              placeholder="id.oastify.com"
              className="px-2 py-1 bg-[#18181b] border border-[#27272a] outline-none text-xs w-full text-[#3b82f6] focus:border-[#3b82f6]"
              value={collabId}
              onChange={(e) => setCollabId(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 overflow-hidden flex-1 max-w-[200px]">
             <span className="text-xs text-[#52525b] shrink-0">[IP]</span>
             <input 
              placeholder="192.168.0.1"
              className="px-2 py-1 bg-[#18181b] border border-[#27272a] outline-none text-xs w-full text-[#3b82f6] focus:border-[#3b82f6]"
              value={targetIp}
              onChange={(e) => setTargetIp(e.target.value)}
            />
          </div>
        </header>

        {/* WORKSPACE CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 relative">
          <AnimatePresence mode="wait">
            
            {/* --- DATABASE VIEW --- */}
            {appMode === 'DATABASE' && activeLabData && (
              <motion.div 
                key={`lab-${activeLabData.id}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="max-w-4xl"
              >
                {/* Lab Header */}
                <div className="mb-8">
                  <div className="inline-flex items-center gap-2 mb-3">
                     <span className={`px-2 py-1 text-[10px] font-bold border ${
                        activeLabData.level === 'EXPERT' ? 'border-[#f87171] text-[#f87171]' : 
                        activeLabData.level === 'PRACTITIONER' ? 'border-[#fb923c] text-[#fb923c]' : 
                        'border-[#3b82f6] text-[#3b82f6]'
                     }`}>
                       {activeLabData.level}
                     </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">{activeLabData.title}</h2>
                  <p className="text-sm text-[#a1a1aa] border-l-2 border-[#27272a] pl-4 italic bg-[#09090b] p-3">
                    Goal: {activeLabData.objective}
                  </p>
                </div>

                {/* Setup & Solution Steps */}
                <div className="mb-8 p-6 bg-[#09090b] border border-[#27272a]">
                   <h3 className="text-sm font-bold text-[#d4d4d8] mb-4 flex items-center gap-2 uppercase">
                      <TargetIcon className="w-4 h-4 text-[#71717a]" /> Attack Execution Path
                   </h3>
                   <div className="space-y-2">
                     {activeLabData.solution.map((step, idx) => (
                        <div key={idx} className="flex gap-4 text-xs text-[#a1a1aa] items-start">
                          <span className="text-[#3b82f6] font-bold mt-0.5">[{idx+1}]</span>
                          <span className="leading-relaxed">{step}</span>
                        </div>
                     ))}
                   </div>
                </div>

                {/* Payloads Engine */}
                <div>
                   <h3 className="text-sm font-bold text-[#d4d4d8] mb-4 flex items-center gap-2 uppercase">
                      <Database className="w-4 h-4 text-[#71717a]" /> Raw Payloads
                   </h3>
                   
                   <div className="space-y-4">
                     {activeLabData.payloads.map((payload, i) => {
                        const processedValue = getProcessedPayload(payload.value);
                        const uniqueId = `${activeLabData.id}-${i}`;
                        return (
                          <div key={i} className="bg-[#09090b] border border-[#27272a] group/block relative">
                            {/* Toolbar */}
                            <div className="flex justify-between items-center px-4 py-2 bg-[#18181b] border-b border-[#27272a]">
                               <span className="text-[10px] text-[#71717a] font-bold uppercase">{payload.label}</span>
                               <button 
                                onClick={() => copyToClipboard(processedValue, uniqueId)}
                                className="text-[#a1a1aa] hover:text-[#3b82f6] transition-colors flex items-center gap-1"
                              >
                                {copiedId === uniqueId ? 
                                  <><Check className="w-3 h-3 text-[#10b981]" /><span className="text-[10px] text-[#10b981]">Copied</span></> : 
                                  <><Copy className="w-3 h-3" /><span className="text-[10px]">Copy</span></>
                                }
                              </button>
                            </div>
                            {/* Code Area */}
                            <div className="p-4 bg-[#050505]">
                              <code className="text-[13px] text-[#e5e5e5] whitespace-pre-wrap break-all leading-loose">
                                {processedValue}
                              </code>
                            </div>
                          </div>
                        )
                     })}
                   </div>
                </div>
              </motion.div>
            )}

            {/* --- ANALYZER VIEW --- */}
            {appMode === 'ANALYZER' && (
              <motion.div 
                key="analyzer"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="max-w-4xl h-full flex flex-col"
              >
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Radar className="w-5 h-5 text-[#10b981]" /> Request Analyzer
                  </h2>
                  <p className="text-xs text-[#a1a1aa]">Paste raw HTTP request below to identify potential SSRF configurations.</p>
                </div>

                <div className="bg-[#09090b] border border-[#27272a] flex flex-col flex-grow min-h-[300px] max-h-[400px]">
                  <textarea 
                    value={rawRequest}
                    onChange={(e) => setRawRequest(e.target.value)}
                    placeholder="POST /product/stock HTTP/1.1&#10;Host: 0a69...&#10;Content-Type: application/x-www-form-urlencoded&#10;&#10;stockApi=http%3A%2F%2Fstock.weliketoshop.net"
                    className="w-full h-full bg-transparent p-4 text-[13px] text-[#a1a1aa] border-none outline-none resize-none font-mono focus:text-white transition-colors"
                    spellCheck="false"
                  ></textarea>
                  <div className="border-t border-[#27272a] p-2 flex justify-end">
                    <button 
                      onClick={analyzeRequest}
                      className="bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] border border-[#10b981]/50 px-4 py-2 text-xs font-bold uppercase transition-colors"
                    >
                      Execute Analysis
                    </button>
                  </div>
                </div>

                {/* Analysis Report */}
                {analysisReport && (
                  <div className="mt-6">
                    <h3 className="text-xs font-bold text-[#d4d4d8] mb-4 uppercase tracking-widest">Threat Intelligence Report</h3>
                    <div className="space-y-4">
                      {analysisReport.map((threat) => (
                        <div key={threat.id} className="bg-[#09090b] border border-[#27272a] p-4 flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            {threat.severity === 'HIGH' ? <AlertTriangle className="w-5 h-5 text-[#f87171]" /> : 
                             threat.severity === 'MEDIUM' ? <AlertTriangle className="w-5 h-5 text-[#fb923c]" /> :
                             <Crosshair className="w-5 h-5 text-[#a1a1aa]" />}
                            
                            <div>
                               <span className="text-[10px] font-bold text-[#71717a] uppercase block">{threat.type}</span>
                               <span className="text-sm text-white font-bold">Target Vector: <span className="text-[#3b82f6]">{threat.target}</span></span>
                            </div>
                          </div>
                          <p className="text-xs text-[#a1a1aa] leading-relaxed">
                            {threat.description}
                          </p>
                          
                          {threat.recommendedLabs.length > 0 && (
                            <div className="pt-3 border-t border-[#27272a] mt-2">
                              <span className="text-[10px] text-[#71717a] mb-2 block uppercase">Recommended Lab Solutions</span>
                              <div className="flex flex-wrap gap-2">
                                {threat.recommendedLabs.map(labId => {
                                  const matchingLab = labs.find(l => l.id === labId);
                                  return (
                                    <button 
                                      key={labId}
                                      onClick={() => jumpToLab(labId)}
                                      className="flex items-center gap-1 bg-[#18181b] hover:bg-[#3b82f6]/20 border border-[#27272a] hover:border-[#3b82f6] text-xs text-[#d4d4d8] hover:text-[#3b82f6] px-3 py-1.5 transition-colors group"
                                    >
                                      <span>Lab 0{labId} - {matchingLab.category}</span>
                                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

// SVG Icon Helpers
const TargetIcon = ({className}) => <Crosshair className={className} />;

export default PentestToolkit;
