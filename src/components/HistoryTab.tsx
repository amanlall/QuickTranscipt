import React, { useState, useEffect } from 'react';
import { Copy, Download, Trash2, Zap, Search, Filter, Calendar, Clock, Globe, ArrowLeft, FileText } from 'lucide-react';

interface SavedTranscription {
  id: string;
  title: string;
  content: string;
  language: string;
  languageName: string;
  timestamp: number;
  duration?: number;
  confidence?: number;
  aiEnhanced?: string;
}

interface Language {
  code: string;
  name: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
  { code: 'hi-IN', name: 'हिन्दी (Hindi)', flag: '🇮🇳' },
  { code: 'es-ES', name: 'Español (Spanish)', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'Français (French)', flag: '🇫🇷' },
  { code: 'de-DE', name: 'Deutsch (German)', flag: '🇩🇪' },
  { code: 'ja-JP', name: '日本語 (Japanese)', flag: '🇯🇵' },
  { code: 'ko-KR', name: '한국어 (Korean)', flag: '🇰🇷' },
  { code: 'zh-CN', name: '中文 (Chinese)', flag: '🇨🇳' },
  { code: 'ar-SA', name: 'العربية (Arabic)', flag: '🇸🇦' },
  { code: 'pt-BR', name: 'Português (Portuguese)', flag: '🇧🇷' },
  { code: 'ru-RU', name: 'Русский (Russian)', flag: '🇷🇺' },
  { code: 'it-IT', name: 'Italiano (Italian)', flag: '🇮🇹' },
  { code: 'nl-NL', name: 'Nederlands (Dutch)', flag: '🇳🇱' },
  { code: 'sv-SE', name: 'Svenska (Swedish)', flag: '🇸🇪' },
];

interface HistoryTabProps {
  isDarkMode: boolean;
  onClose: () => void;
}

const HistoryTab: React.FC<HistoryTabProps> = ({ isDarkMode, onClose }) => {
  const [savedTranscriptions, setSavedTranscriptions] = useState<SavedTranscription[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [loadingAI, setLoadingAI] = useState<string | null>(null);
  const [pendingReplacements, setPendingReplacements] = useState<{[key: string]: string}>({});
  const [typingText, setTypingText] = useState<{[key: string]: string}>({});
  const [isTyping, setIsTyping] = useState<{[key: string]: boolean}>({});

  // Theme classes
  const themeClasses = {
    background: isDarkMode 
      ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
      : 'bg-gradient-to-br from-slate-50 via-white to-slate-100',
    card: isDarkMode 
      ? 'bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 shadow-2xl shadow-slate-900/50' 
      : 'bg-white/90 backdrop-blur-xl border border-slate-200/50 shadow-2xl shadow-slate-900/10',
    header: isDarkMode 
      ? 'bg-gradient-to-r from-slate-800 to-slate-700' 
      : 'bg-gradient-to-r from-slate-700 to-slate-600',
    text: {
      primary: isDarkMode ? 'text-slate-100' : 'text-slate-800',
      secondary: isDarkMode ? 'text-slate-300' : 'text-slate-600',
      muted: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    },
    button: {
      primary: isDarkMode 
        ? 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 shadow-lg shadow-slate-900/30' 
        : 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 shadow-lg shadow-slate-900/20',
      secondary: isDarkMode 
        ? 'bg-slate-700 hover:bg-slate-600 shadow-md shadow-slate-900/30' 
        : 'bg-slate-200 hover:bg-slate-300 shadow-md shadow-slate-900/10',
    },
    dropdown: isDarkMode 
      ? 'bg-slate-800/95 backdrop-blur-xl border-slate-600/50 text-slate-100' 
      : 'bg-white/95 backdrop-blur-xl border-slate-200/50 text-slate-800',
  };

  // Load saved transcriptions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('transcriptions');
    if (saved) {
      try {
        setSavedTranscriptions(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading saved transcriptions:', error);
      }
    }
  }, []);

  // Save transcriptions to localStorage
  const saveToLocalStorage = (transcriptions: SavedTranscription[]) => {
    localStorage.setItem('transcriptions', JSON.stringify(transcriptions));
  };

  // AI Enhancement Function
  const generateAIEnhancement = async (transcription: SavedTranscription) => {
    setLoadingAI(transcription.id);
    setIsTyping(prev => ({ ...prev, [transcription.id]: true }));
    setTypingText(prev => ({ ...prev, [transcription.id]: '' }));
    
    try {
      // AI Enhancement Generation
      const aiEnhanced = generateSmartEnhancement(transcription.content);
      
      // Simulate typing effect
      await typeText(transcription.id, aiEnhanced);
      
    } catch (error) {
      console.error('AI Enhancement generation failed:', error);
      setIsTyping(prev => ({ ...prev, [transcription.id]: false }));
    } finally {
      setLoadingAI(null);
    }
  };

  // Typing effect function
  const typeText = async (transcriptionId: string, text: string) => {
    const words = text.split(' ');
    let currentText = '';
    
    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i];
      setTypingText(prev => ({ ...prev, [transcriptionId]: currentText }));
      
      // Variable delay for more natural typing
      const delay = Math.random() * 100 + 50; // 50-150ms
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Finish typing and store the complete enhanced version
    setIsTyping(prev => ({ ...prev, [transcriptionId]: false }));
    setPendingReplacements(prev => ({
      ...prev,
      [transcriptionId]: text
    }));
  };

  // Replace original with AI enhanced version
  const replaceWithAIVersion = (transcriptionId: string) => {
    const enhancedContent = pendingReplacements[transcriptionId];
    if (!enhancedContent) return;

    const updatedTranscriptions = savedTranscriptions.map(t => 
      t.id === transcriptionId 
        ? { ...t, content: enhancedContent, aiEnhanced: enhancedContent }
        : t
    );
    
    setSavedTranscriptions(updatedTranscriptions);
    saveToLocalStorage(updatedTranscriptions);
    
    // Remove from pending replacements
    setPendingReplacements(prev => {
      const updated = { ...prev };
      delete updated[transcriptionId];
      return updated;
    });
  };

  // Discard AI enhanced version
  const discardAIVersion = (transcriptionId: string) => {
    setPendingReplacements(prev => {
      const updated = { ...prev };
      delete updated[transcriptionId];
      return updated;
    });
    setTypingText(prev => {
      const updated = { ...prev };
      delete updated[transcriptionId];
      return updated;
    });
    setIsTyping(prev => {
      const updated = { ...prev };
      delete updated[transcriptionId];
      return updated;
    });
  };

  // Smart AI Enhancement Generator
  const generateSmartEnhancement = (content: string): string => {
    const words = content.split(' ');
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Analyze content type
    const contentType = analyzeContentType(content);
    const keyPoints = extractKeyPoints(content);
    const structure = improveStructure(content);
    const clarity = enhanceClarity(content);
    
    const enhanced = `${structure}

## Key Insights & Analysis

${keyPoints}

## Enhanced Understanding

${clarity}

## Context & Implications

${generateContextualInsights(content)}

## Action Items & Next Steps

${generateActionItems(content)}

---
*Enhanced by AI • Original preserved • ${new Date().toLocaleString()}*`;

    return enhanced;
  };

  // Helper functions for AI enhancement
  const analyzeContentType = (content: string): string => {
    if (content.toLowerCase().includes('meeting')) return 'Meeting Notes';
    if (content.includes('?')) return 'Q&A Session';
    if (content.toLowerCase().includes('idea')) return 'Brainstorming Session';
    if (content.includes('1.') || content.includes('-')) return 'Structured Notes';
    return 'General Notes';
  };

  const extractKeyPoints = (content: string): string => {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const keyPoints = sentences.slice(0, 3).map((sentence, index) => 
      `• **Point ${index + 1}:** ${sentence.trim()}`
    );
    return keyPoints.join('\n');
  };

  const improveStructure = (content: string): string => {
    const words = content.split(' ');
    const improvedContent = content
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s*([a-z])/g, '$1 $2')
      .trim();
    
    return `# Enhanced Transcription\n\n${improvedContent}`;
  };

  const enhanceClarity = (content: string): string => {
    return `This transcription captures important information that can be organized and expanded upon. The main themes revolve around the key concepts mentioned, with potential for further development and actionable insights.`;
  };

  const generateContextualInsights = (content: string): string => {
    return `The content suggests a focus on information sharing and knowledge capture. This type of documentation is valuable for reference, decision-making, and future planning activities.`;
  };

  const generateActionItems = (content: string): string => {
    return `• Review and organize the main points discussed
• Follow up on any questions or unclear areas  
• Share relevant insights with stakeholders
• Consider next steps based on the information captured`;
  };

  // Filter transcriptions
  const filteredTranscriptions = savedTranscriptions.filter(transcription => {
    const matchesSearch = transcription.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transcription.languageName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLanguage = filterLanguage === 'all' || transcription.language === filterLanguage;
    return matchesSearch && matchesLanguage;
  });

  // Action handlers
  const deleteTranscription = (id: string) => {
    const updatedTranscriptions = savedTranscriptions.filter(t => t.id !== id);
    setSavedTranscriptions(updatedTranscriptions);
    saveToLocalStorage(updatedTranscriptions);
    
    // Also remove from pending replacements if exists
    setPendingReplacements(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const clearAllTranscriptions = () => {
    setSavedTranscriptions([]);
    localStorage.removeItem('transcriptions');
    setPendingReplacements({});
  };

  const copyContent = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const downloadFile = (transcription: SavedTranscription) => {
    const content = transcription.content;
    const filename = `transcript-${transcription.id}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`min-h-screen ${themeClasses.background} p-4 transition-all duration-700 ease-in-out`}>
      <div className={`max-w-7xl mx-auto ${themeClasses.card} rounded-3xl overflow-hidden transition-all duration-700 ease-in-out shadow-2xl`}>
        {/* Header */}
        <div className={`${themeClasses.header} p-6 text-white relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 translate-x-full animate-pulse"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-transparent to-blue-500/20 animate-pulse"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-4">
                <button
                  onClick={onClose}
                  className="p-2 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h1 className="text-lg font-bold mb-1 bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">Transcription History</h1>
                  <p className="text-slate-200 text-xs">Manage and enhance your saved transcriptions with AI</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <FileText className="w-3 h-3" />
                  <span className="text-xs font-medium">{savedTranscriptions.length} Total</span>
                </div>
                <button
                  onClick={clearAllTranscriptions}
                  disabled={savedTranscriptions.length === 0}
                  className="px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-xs shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="p-6 border-b border-slate-200/20 bg-gradient-to-r from-transparent via-slate-50/30 to-transparent">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-200" />
              <input
                type="text"
                placeholder="Search transcriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-4 py-3 rounded-xl border ${themeClasses.dropdown} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs shadow-lg transition-all duration-200 hover:shadow-xl`}
              />
            </div>
            <div className="relative group">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400 group-focus-within:text-purple-500 transition-colors duration-200" />
              <select
                value={filterLanguage}
                onChange={(e) => setFilterLanguage(e.target.value)}
                className={`pl-9 pr-8 py-3 rounded-xl border ${themeClasses.dropdown} focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-xs shadow-lg min-w-[180px] transition-all duration-200 hover:shadow-xl`}
              >
                <option value="all">All Languages</option>
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Transcriptions */}
        <div className="p-6 h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400">
          {filteredTranscriptions.length > 0 ? (
            <div className="space-y-3">
              {filteredTranscriptions.map((transcription, index) => (
                <div 
                  key={transcription.id}
                  className={`${themeClasses.card} rounded-2xl p-4 transition-all duration-500 hover:shadow-2xl animate-fade-in border-l-4 border-gradient-to-b from-blue-500 to-purple-500 hover:border-l-4 hover:border-gradient-to-b hover:from-purple-500 hover:to-pink-500 transform hover:scale-[1.02] hover:-translate-y-1`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Transcription Header */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="text-sm animate-pulse">{languages.find(l => l.code === transcription.language)?.flag}</span>
                        <span className={`text-xs font-semibold ${themeClasses.text.primary} bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}>
                          {transcription.languageName}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 transition-colors duration-200">
                          <Calendar className="w-3 h-3" />
                          {new Date(transcription.timestamp).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-400 hover:text-purple-500 transition-colors duration-200">
                          <Clock className="w-3 h-3" />
                          {new Date(transcription.timestamp).toLocaleTimeString()}
                        </div>
                        {transcription.duration && (
                          <span className="text-xs text-slate-400 hover:text-green-500 transition-colors duration-200">
                            {transcription.duration}s
                          </span>
                        )}
                        {transcription.confidence && (
                          <span className="text-xs text-green-500 font-semibold animate-pulse">
                            {Math.round(transcription.confidence * 100)}% confidence
                          </span>
                        )}
                      </div>
                      <h3 className={`text-sm font-bold ${themeClasses.text.primary} mb-2 bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent`}>
                        {transcription.title}
                      </h3>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => copyContent(transcription.content)}
                        className="p-2 text-blue-500 hover:text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/20 dark:hover:to-blue-800/20 rounded-xl transition-all duration-300 hover:scale-110 transform hover:shadow-lg"
                        title="Copy"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => downloadFile(transcription)}
                        className="p-2 text-green-500 hover:text-green-600 hover:bg-gradient-to-r hover:from-green-50 hover:to-green-100 dark:hover:from-green-900/20 dark:hover:to-green-800/20 rounded-xl transition-all duration-300 hover:scale-110 transform hover:shadow-lg"
                        title="Download"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => generateAIEnhancement(transcription)}
                        disabled={loadingAI === transcription.id}
                        className="p-2 text-purple-500 hover:text-purple-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 dark:hover:from-purple-900/20 dark:hover:to-purple-800/20 rounded-xl transition-all duration-300 hover:scale-110 transform hover:shadow-lg disabled:opacity-50"
                        title="AI Regenerate"
                      >
                        {loadingAI === transcription.id ? (
                          <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Zap className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteTranscription(transcription.id)}
                        className="p-2 text-red-500 hover:text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 dark:hover:from-red-900/20 dark:hover:to-red-800/20 rounded-xl transition-all duration-300 hover:scale-110 transform hover:shadow-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Original Content */}
                  <div className={`${isDarkMode ? 'bg-gradient-to-r from-slate-700/40 to-slate-600/40' : 'bg-gradient-to-r from-slate-50 to-blue-50/30'} rounded-xl p-4 mb-3 border border-slate-200/50 hover:border-blue-300/50 transition-all duration-300`}>
                    <h4 className={`text-xs font-bold ${themeClasses.text.secondary} mb-2 uppercase tracking-wide bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}>
                      Original Transcription
                    </h4>
                    <p className={`${themeClasses.text.primary} text-xs leading-relaxed max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 hover:scrollbar-thumb-slate-400`}>
                      {transcription.content}
                    </p>
                  </div>

                  {/* AI Enhanced Version Preview */}
                  {(isTyping[transcription.id] || pendingReplacements[transcription.id]) && (
                    <div className={`${isDarkMode ? 'bg-gradient-to-r from-purple-900/30 to-pink-900/20' : 'bg-gradient-to-r from-purple-50 to-pink-50/50'} rounded-xl p-4 mb-3 border border-purple-300/50 hover:border-purple-400/50 transition-all duration-300 shadow-lg`}>
                      {/* Floating particles for AI effect */}
                      <div className="ai-typing-container relative">
                        <div className="ai-particle"></div>
                        <div className="ai-particle"></div>
                        <div className="ai-particle"></div>
                        <div className="ai-particle"></div>
                        <div className="ai-particle"></div>
                        {isTyping[transcription.id] && <div className="ai-typing-wave"></div>}
                      </div>
                      
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold ai-generation-header uppercase tracking-wide flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                          <Zap className="w-3 h-3 animate-pulse" />
                          {isTyping[transcription.id] ? 'AI Generating...' : 'AI Enhanced Version'}
                        </h4>
                        {!isTyping[transcription.id] && pendingReplacements[transcription.id] && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => replaceWithAIVersion(transcription.id)}
                              className="px-3 py-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 text-xs shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                              Replace
                            </button>
                            <button
                              onClick={() => discardAIVersion(transcription.id)}
                              className="px-3 py-1 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-lg hover:from-slate-600 hover:to-slate-700 transition-all duration-200 text-xs shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                              Discard
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="ai-typing-container relative text-xs leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-300 hover:scrollbar-thumb-purple-400">
                        {isTyping[transcription.id] ? (
                          <div className="ai-typing-text">
                            {typingText[transcription.id]}
                            <span className="ai-typing-cursor">|</span>
                          </div>
                        ) : (
                          <div className="text-purple-700 dark:text-purple-300">
                            {pendingReplacements[transcription.id]}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={`text-center py-16 ${themeClasses.text.muted}`}>
              <div className="relative">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50 animate-pulse" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl animate-pulse"></div>
              </div>
              <h3 className="text-lg font-bold mb-3 bg-gradient-to-r from-slate-600 to-slate-400 bg-clip-text text-transparent">No Transcriptions Found</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {searchTerm || filterLanguage !== 'all' 
                  ? 'No transcriptions match your search criteria' 
                  : 'Start recording to create your first transcription!'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryTab;