import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, Trash2, Copy, Download, Sun, Moon, Globe, Save, List, Edit, Eye, Calendar, Clock, Search, Filter } from 'lucide-react';


// the component will fill the height/width of its parent container, edit the CSS to change this
// the options below are the default values

interface TranscriptionUIProps {}

interface SavedTranscription {
  id: string;
  title: string;
  content: string;
  language: string;
  languageName: string;
  timestamp: number;
  duration?: number;
  confidence?: number;
}

interface TranscriptionStats {
  timestamp: number;
  confidence: number;
  wordCount: number;
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

const TranscriptionUI: React.FC<TranscriptionUIProps> = () => {
  // 1. Set default theme to dark mode
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [savedTranscriptions, setSavedTranscriptions] = useState<SavedTranscription[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [isRecording, setIsRecording] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState('');
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);
  
  // Load saved transcriptions from localStorage on component mount
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
  
  // Save transcriptions to localStorage whenever the list changes
  useEffect(() => {
    if (savedTranscriptions.length > 0) {
      localStorage.setItem('transcriptions', JSON.stringify(savedTranscriptions));
    }
  }, [savedTranscriptions]);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>();

  // 3. Editable name state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [selectedTranscription, setSelectedTranscription] = useState<SavedTranscription | null>(null);

  // Helper to get default name
  const getDefaultName = (t: SavedTranscription) => `#${new Date(t.timestamp).toLocaleDateString()} ${new Date(t.timestamp).toLocaleTimeString()}`;

  // Update name in state and localStorage
  const updateTranscriptionName = (id: string, newName: string) => {
    setSavedTranscriptions(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, title: newName } : t);
      localStorage.setItem('transcriptions', JSON.stringify(updated));
      return updated;
    });
  };

  // Modern 3D theme classes
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
    transcript: isDarkMode 
      ? 'bg-slate-700/50 border border-slate-600/50 backdrop-blur-sm' 
      : 'bg-slate-50/80 border border-slate-200/50 backdrop-blur-sm',
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

  useEffect(() => {
    // Check if browser supports speech recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLanguage;

    recognition.onstart = () => {
      setIsListening(true);
      setError('');
    };

    recognition.onresult = (event: any) => {
      let newFinalTranscript = '';
      let newInterimTranscript = '';

      // Helper to process sentences: ensure full stop
      const processSentences = (text: string) => {
        // Split by sentence-ending punctuation
        return text
          .split(/([.!?])\s*/)
          .reduce((acc, part, idx, arr) => {
            if (part.match(/[.!?]/)) {
              // Attach punctuation to previous part
              acc[acc.length - 1] += part;
            } else if (part.trim() !== '') {
              acc.push(part);
            }
            return acc;
          }, [] as string[])
          .map(sentence => {
            let trimmed = sentence.trim();
            if (!trimmed) return '';
            // Ensure sentence ends with a full stop, exclamation, or question mark
            if (!/[.!?]$/.test(trimmed)) {
              trimmed += '.';
            }
            return trimmed + ' ';
          })
          .join('');
      };

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          newFinalTranscript += processSentences(result[0].transcript);
          setConfidence(result[0].confidence);
        } else {
          newInterimTranscript += processSentences(result[0].transcript);
        }
      }

      if (newFinalTranscript) {
        setFinalTranscript(prev => prev + newFinalTranscript);
      }
      
      if (newInterimTranscript) {
        setInterimTranscript(newInterimTranscript);
      }
    };

    recognition.onerror = (event) => {
      setError(`Recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [selectedLanguage]);

  const setupAudioLevel = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      microphoneRef.current = microphone;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateAudioLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
          setAudioLevel(average / 255);
        }
        animationRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
    } catch (err) {
      setError('Microphone access denied');
    }
  };

  // Azure Speech Services configuration
  const AZURE_SPEECH_ENDPOINT = 'https://eastus2.api.cognitive.microsoft.com/sts/v1.0/issueToken';
  const AZURE_SPEECH_KEY = '';
  const AZURE_SPEECH_REGION = 'eastus2';

  // Add state for Azure Speech Services
  const [useAzureSpeech, setUseAzureSpeech] = useState(false);
  const [azureToken, setAzureToken] = useState<string | null>(null);
  const [azureRecognizer, setAzureRecognizer] = useState<any>(null);

  // Get Azure Speech token
  const getAzureToken = async () => {
    try {
      const response = await fetch(`https://${AZURE_SPEECH_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      if (response.ok) {
        const token = await response.text();
        setAzureToken(token);
        return token;
        console.log(token);
      }
    } catch (error) {
      console.error('Failed to get Azure token:', error);
    }
    return null;
  };

  // Initialize Azure Speech Services
  const initializeAzureSpeech = async () => {
    const token = await getAzureToken();
    if (!token) return;

    try {
      // Load Azure Speech SDK dynamically
      console.log('Initializing Azure Speech Services');
      const speechSDK = await import('microsoft-cognitiveservices-speech-sdk');
      const { SpeechConfig, AudioConfig, SpeechRecognizer } = speechSDK;
      
      const speechConfig = SpeechConfig.fromAuthorizationToken(token, AZURE_SPEECH_REGION);
      speechConfig.speechRecognitionLanguage = selectedLanguage;
      speechConfig.enableDictation();
      speechConfig.enableAudioLogging();
      speechConfig.setProperty('SpeechServiceConnection_LogFilename', 'azure_speech.log');
      
      // Enable advanced features
      speechConfig.setProperty('SpeechServiceConnection_EndSilenceTimeoutMs', '1000');
      speechConfig.setProperty('SpeechServiceConnection_InitialSilenceTimeoutMs', '5000');
      speechConfig.setProperty('SpeechServiceConnection_EnableDictation', 'true');
      speechConfig.setProperty('SpeechServiceConnection_EnableAudioLogging', 'true');
      
      const audioConfig = AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new SpeechRecognizer(speechConfig, audioConfig);
      
      recognizer.recognizing = (s: any, e: any) => {
        setInterimTranscript(e.result.text);
        console.log('INTERIM:', e.result);
        
        // Update speech results map with interim results
        const timestamp = Date.now().toString();
        const resultId = e.result.resultId;
        setSpeechResultsMap(prev => {
          const newMap = new Map(prev);
          console.log('newMap:', newMap);
          newMap.set(resultId, e.result.text);
          return newMap;
        });

      };
      
      recognizer.recognized = (s: any, e: any) => {
        if (e.result.reason === 'RecognizedSpeech') {
          setFinalTranscript(prev => prev + ' ' + e.result.text);
          setConfidence(e.result.properties?.getProperty('Confidence') || 0);
          
          // Update speech results map with final results
          const timestamp = Date.now().toString();
          const resultId = e.result.resultId;
          setSpeechResultsMap(prev => {
            const newMap = new Map(prev);
            newMap.set(resultId, e.result.text);
            return newMap;
          });
          console.log('speechResultsMap:', speechResultsMap);

        }
      };
      
      recognizer.canceled = (s: any, e: any) => {
        console.log('Azure Speech canceled:', e.reason);
        if (e.reason === 'Error') {
          setError(`Azure Speech error: ${e.errorDetails}`);
        }
      };
      
      recognizer.sessionStopped = (s: any, e: any) => {
        console.log('Azure Speech session stopped');
        setIsListening(false);
      };
      
      setAzureRecognizer(recognizer);
    } catch (error) {
      console.error('Failed to initialize Azure Speech:', error);
      setError('Failed to initialize Azure Speech Services');
    }
  };

  // Add auto-save functionality
  const [savedSegments, setSavedSegments] = useState<SavedTranscription[]>([]);
  const [autoSaveTimer, setAutoSaveTimer] = useState<number | null>(null);
  const [showSavedSegments, setShowSavedSegments] = useState(true); // Always show by default
  const [lastSavedContent, setLastSavedContent] = useState('');
  const [isSavingSegment, setIsSavingSegment] = useState(false);
  const [speechResultsMap, setSpeechResultsMap] = useState<Map<string, string>>(new Map());

  // Improved auto-save function that continuously saves segments
  // Function to process speech results map and save segments
  const processSpeechResultsAndSave = () => {
    if (speechResultsMap.size === 0) return;
    
    // Convert map to array of [timestamp, text] pairs and sort by timestamp
    console.log("sssss",speechResultsMap)
    const sortedResults = Array.from(speechResultsMap.entries())
      .map(([resultId, text]) => {
        // Extract timestamp from resultId or use current time
        // const timestamp = parseInt(resultId) || Date.now();
        return { resultId, text };
      })
      // .sort((a, b) => a.timestamp - b.timestamp);
    
    // Combine all texts in chronological order
    const combinedText = sortedResults.map(result => result.text).join(' ').trim();
    
    if (combinedText && combinedText.length > 0) {
      // Show saving indicator
      setIsSavingSegment(true);
      
      const segment: SavedTranscription = {
        id: `segment-${Date.now()}`,
        title: getDefaultName({ id: '', title: '', content: combinedText, language: selectedLanguage, languageName: languages.find(l => l.code === selectedLanguage)?.name || '', timestamp: Date.now() }),
        content: combinedText,
        language: selectedLanguage,
        languageName: languages.find(l => l.code === selectedLanguage)?.name || '',
        timestamp: Date.now(),
        duration: recordingStartTime ? Math.round((Date.now() - recordingStartTime) / 1000) : undefined,
        confidence: confidence,
      };
      
      setSavedSegments(prev => [...prev, segment]);
      
      // Clear the speech results map for next segment
      setSpeechResultsMap(new Map());
      
      // Hide saving indicator after a short delay
      setTimeout(() => setIsSavingSegment(false), 1000);
    }
  };

  // Auto-save function that processes speech results map
  const autoSaveTranscription = () => {
    if (!isRecording) return;
    processSpeechResultsAndSave();
  };

  // Start auto-save timer
  const startAutoSave = () => {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer);
    }
    // Reset session tracking
    setLastSavedContent('');
    setSpeechResultsMap(new Map()); // Clear speech results map
    const timer = setInterval(autoSaveTranscription, 2000); // Save every 2 seconds
    setAutoSaveTimer(timer);
  };

  // Stop auto-save timer
  const stopAutoSave = () => {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer);
      setAutoSaveTimer(null);
    }
  };

  // Modified startRecording function
  const startRecording = async () => {
    if (useAzureSpeech) {
      // Use Azure Speech Services
      if (!azureToken) {
        await initializeAzureSpeech();
      }
      
      if (azureRecognizer) {
        try {
          await azureRecognizer.startContinuousRecognitionAsync();
          setIsListening(true);
          setIsRecording(true);
          setRecordingStartTime(Date.now());
          setError('');
          startAutoSave(); // Start auto-save
        } catch (error) {
          console.error('Azure Speech start error:', error);
          setError('Failed to start Azure Speech recognition');
        }
      }
    } else {
      // Use Web Speech API (existing code)
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsRecording(true);
          setRecordingStartTime(Date.now());
          setError('');
          startAutoSave(); // Start auto-save
        } catch (error) {
          setError('Failed to start recording');
        }
      }
    }
  };

  // Modified stopRecording function
  const stopRecording = () => {
    stopAutoSave(); // Stop auto-save timer
    
    // Process any remaining speech results
    processSpeechResultsAndSave();
    
    // Also save any remaining unsaved content from transcript (fallback)
    const remainingContent = (finalTranscript + ' ' + interimTranscript).trim();
    if (remainingContent && remainingContent.length > 0) {
      const finalSegment: SavedTranscription = {
        id: `segment-${Date.now()}`,
        title: getDefaultName({ id: '', title: '', content: remainingContent, language: selectedLanguage, languageName: languages.find(l => l.code === selectedLanguage)?.name || '', timestamp: Date.now() }),
        content: remainingContent,
        language: selectedLanguage,
        languageName: languages.find(l => l.code === selectedLanguage)?.name || '',
        timestamp: Date.now(),
        duration: recordingStartTime ? Math.round((Date.now() - recordingStartTime) / 1000) : undefined,
        confidence: confidence,
      };
      
      setSavedSegments(prev => [...prev, finalSegment]);
    }
    
    if (useAzureSpeech && azureRecognizer) {
      azureRecognizer.stopContinuousRecognitionAsync();
      setIsListening(false);
      setIsRecording(false);
    } else {
      // Web Speech API (existing code)
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    }
    
    // Clear all transcript states
    setFinalTranscript('');
    setInterimTranscript('');
    setConfidence(0);
    setLastSavedContent('');
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const clearTranscript = () => {
    setFinalTranscript('');
    setInterimTranscript('');
    setConfidence(0);
  };

  const copyTranscript = () => {
    navigator.clipboard.writeText(finalTranscript + interimTranscript);
  };

  const downloadTranscript = () => {
    const blob = new Blob([finalTranscript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const selectedLang = languages.find(lang => lang.code === selectedLanguage);

  // Filter transcriptions based on search and language filter
  const filteredTranscriptions = savedTranscriptions.filter(transcription => {
    const matchesSearch = transcription.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transcription.languageName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLanguage = filterLanguage === 'all' || transcription.language === filterLanguage;
    return matchesSearch && matchesLanguage;
  });

  const deleteTranscription = (id: string) => {
    setSavedTranscriptions(prev => prev.filter(t => t.id !== id));
  };

  const clearAllTranscriptions = () => {
    setSavedTranscriptions([]);
    localStorage.removeItem('transcriptions');
  };

  const copyTranscriptionContent = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const downloadTranscriptionFile = (transcription: SavedTranscription) => {
    const blob = new Blob([transcription.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${transcription.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const combineSavedSegments = () => {
    if (savedSegments.length === 0) return;
    
    // Combine all segments into one transcription
    const combinedContent = savedSegments.map(segment => segment.content).join('\n\n');
    const firstSegment = savedSegments[0];
    const lastSegment = savedSegments[savedSegments.length - 1];
    
    const newTranscription: SavedTranscription = {
      id: `combined-${Date.now()}`,
      title: `#${new Date().toLocaleDateString()} Combined Session`,
      content: combinedContent,
      language: firstSegment.language,
      languageName: firstSegment.languageName,
      timestamp: firstSegment.timestamp,
      duration: (lastSegment.timestamp - firstSegment.timestamp) / 1000,
      confidence: savedSegments.reduce((sum, seg) => sum + (seg.confidence || 0), 0) / savedSegments.length
    };
    
    // Add to saved transcriptions
    setSavedTranscriptions(prev => [newTranscription, ...prev]);
    
    // Clear saved segments
    setSavedSegments([]);
    setShowSavedSegments(false);
    
    // Save to localStorage
    const updatedTranscriptions = [newTranscription, ...savedTranscriptions];
    localStorage.setItem('transcriptions', JSON.stringify(updatedTranscriptions));
  };

  const [aiLoading, setAiLoading] = useState(false);
  const [aiEnhanced, setAiEnhanced] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const AZURE_OPENAI_ENDPOINT = '';
  const AZURE_OPENAI_KEY = '';

  const aiPreprompt = `You are an expert note-taker. Given the following raw meeting or idea notes, break them down into clear, concise, actionable bullet points and sections. Make the notes easy to review and understand for a human. Format the output in markdown if possible.`;

  async function handleAIRegenerate(transcription: SavedTranscription) {
    setAiLoading(true);
    setAiError(null);
    setAiEnhanced(null);
    try {
      const response = await fetch(AZURE_OPENAI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': AZURE_OPENAI_KEY,
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: aiPreprompt },
            { role: 'user', content: transcription.content }
          ],
          // max_tokens: 1024,
          // temperature: 0.5,
          // top_p: 1,
          // frequency_penalty: 0,
          // presence_penalty: 0,
        })
      });
      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }
      const data = await response.json();
      const aiText = data.choices?.[0]?.message?.content || 'No response from AI.';
      setAiEnhanced(aiText);
    } catch (err: any) {
      setAiError(err.message || 'AI request failed');
    } finally {
      setAiLoading(false);
    }
  }

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  return (
    <div className={`min-h-screen ${themeClasses.background} flex items-center justify-center p-4 transition-all duration-700 ease-in-out`}>
      <div className={`w-full max-w-5xl ${themeClasses.card} rounded-3xl overflow-hidden transition-all duration-700 ease-in-out transform hover:scale-[1.01] hover:shadow-3xl`}>
        {/* Header */}
        <div className={`${themeClasses.header} p-6 text-white relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 translate-x-full animate-pulse"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-1 animate-fade-in">Voice Notes</h1>
                <p className="text-slate-200 text-sm">Click the microphone to start recording</p>
              </div>
              
              {/* Controls */}
              <div className="flex gap-2">
                {/* Language Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                    className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    <Globe className="w-3 h-3" />
                    <span className="text-lg">{selectedLang?.flag}</span>
                    <span className="hidden sm:inline text-xs">{selectedLang?.name.split(' ')[0]}</span>
                  </button>
                  
                  {showLanguageDropdown && (
                    <div className={`absolute top-full right-0 mt-2 w-56 ${themeClasses.dropdown} border rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto animate-slide-down`}>
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setSelectedLanguage(lang.code);
                            setShowLanguageDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 hover:bg-slate-500 hover:text-white transition-all duration-200 flex items-center gap-2 text-xs ${
                            selectedLanguage === lang.code ? 'bg-slate-500 text-white' : ''
                          }`}
                        >
                          <span className="text-sm">{lang.flag}</span>
                          <span>{lang.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-all duration-300 transform hover:scale-105 hover:rotate-180 shadow-lg"
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                
                {/* Azure Speech Toggle */}
                <button
                  onClick={() => setUseAzureSpeech(!useAzureSpeech)}
                  className={`p-2 backdrop-blur-sm rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg ${
                    useAzureSpeech 
                      ? 'bg-purple-500/20 hover:bg-purple-600/30 text-purple-300' 
                      : 'bg-white/10 hover:bg-white/20 text-slate-300'
                  }`}
                  title={useAzureSpeech ? 'Using Azure Speech (Advanced)' : 'Using Web Speech API (Basic)'}
                >
                  <span className="text-xs font-bold">{useAzureSpeech ? 'AZURE' : 'WEB'}</span>
                </button>
                
                {/* History Toggle */}
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="relative p-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  <List className="w-4 h-4" />
                  {savedTranscriptions.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {savedTranscriptions.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side - Microphone and Transcription */}
            <div className="space-y-6">
              {/* Microphone Section */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative mb-4">
                  {/* 3D Outer pulse rings */}
                  {isRecording && (
                    <>
                      <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20 scale-150 shadow-2xl"></div>
                      <div 
                        className="absolute inset-0 rounded-full border-4 border-red-400 transition-all duration-150 animate-pulse shadow-xl"
                        style={{
                          transform: `scale(${1.2 + audioLevel * 0.8}) rotateX(${audioLevel * 30}deg)`,
                          opacity: audioLevel * 0.7
                        }}
                      ></div>
                      <div 
                        className="absolute inset-0 rounded-full border-2 border-red-300 transition-all duration-200 shadow-lg"
                        style={{
                          transform: `scale(${1.4 + audioLevel * 1.2}) rotateY(${audioLevel * 45}deg)`,
                          opacity: audioLevel * 0.5
                        }}
                      ></div>
                    </>
                  )}
                  
                  {/* 3D Microphone Button */}
                  <button
                    onClick={toggleRecording}
                    disabled={!!error}
                    className={`
                      relative w-24 h-24 rounded-full flex items-center justify-center
                      transition-all duration-500 transform hover:scale-110 active:scale-95
                      ${isRecording 
                        ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-2xl shadow-red-500/50 animate-bounce' 
                        : `${themeClasses.button.primary} shadow-2xl`
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                      before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-r before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300
                      after:absolute after:inset-0 after:rounded-full after:shadow-inner after:shadow-black/20
                    `}
                    style={{
                      transform: `scale(${1 + audioLevel * 0.1}) rotateY(${isRecording ? audioLevel * 360 : 0}deg) perspective(1000px) rotateX(${audioLevel * 15}deg)`,
                      transition: 'transform 0.3s ease-in-out, background-color 0.3s ease-in-out',
                      boxShadow: `0 ${8 + audioLevel * 20}px ${32 + audioLevel * 20}px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.1)`
                    }}
                  >
                    <div className="relative z-10 transform transition-transform duration-300">
                      {isRecording ? (
                        <MicOff className="w-12 h-12 text-white animate-pulse" />
                      ) : (
                        <Mic className="w-12 h-12 text-white" />
                      )}
                    </div>
                  </button>
                </div>

                {/* Status */}
                <div className="text-center">
                  <div className={`text-lg font-semibold mb-1 transition-all duration-300 ${
                    isRecording ? 'text-red-500 animate-pulse' : themeClasses.text.secondary
                  }`}>
                    {isRecording ? 'Recording...' : 'Ready to Record'}
                  </div>
                  {useAzureSpeech && (
                    <div className="text-xs text-purple-400 mb-1">
                      Azure Speech (Advanced)
                    </div>
                  )}
                  {isListening && (
                    <div className="flex items-center justify-center gap-2 text-green-500 animate-fade-in">
                      <Volume2 className="w-4 h-4 animate-bounce" />
                      <span className="text-sm">Listening...</span>
                    </div>
                  )}
                  {confidence > 0 && (
                    <div className={`text-xs ${themeClasses.text.muted} mt-1 animate-fade-in`}>
                      Confidence: {Math.round(confidence * 100)}%
                    </div>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4 text-red-700 dark:text-red-300 animate-shake text-sm">
                  {error}
                </div>
              )}

              {/* Transcript Section */}
              <div className={`${themeClasses.transcript} rounded-2xl p-4 transition-all duration-300 hover:shadow-lg`}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className={`text-lg font-semibold ${themeClasses.text.primary}`}>Live Transcript</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={copyTranscript}
                      disabled={!finalTranscript && !interimTranscript}
                      className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-lg"
                      title="Copy transcript"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={downloadTranscript}
                      disabled={!finalTranscript}
                      className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-lg"
                      title="Download transcript"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      onClick={clearTranscript}
                      disabled={!finalTranscript && !interimTranscript}
                      className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-lg"
                      title="Clear transcript"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                <div className="min-h-[200px] max-h-[400px] overflow-y-auto">
                  {finalTranscript || interimTranscript ? (
                    <p className={`${themeClasses.text.primary} leading-relaxed text-sm whitespace-pre-wrap transition-all duration-300`}>
                      <span className="animate-fade-in">{finalTranscript}</span>
                      <span className={`${themeClasses.text.muted} italic animate-pulse`}>{interimTranscript}</span>
                    </p>
                  ) : (
                    <p className={`${themeClasses.text.muted} text-center py-12 text-sm animate-pulse`}>
                      Your transcription will appear here...
                    </p>
                  )}
                </div>
              </div>

              {/* Saved Segments Section - Always Visible */}
              <div className={`${themeClasses.card} rounded-2xl p-4 transition-all duration-300 hover:shadow-lg ${savedSegments.length === 0 ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h2 className={`text-lg font-semibold ${themeClasses.text.primary}`}>
                      Auto-Saved Segments
                    </h2>
                    <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-full border border-green-300/30">
                      <Save className={`w-3 h-3 text-green-500 ${isSavingSegment ? 'animate-pulse' : ''}`} />
                      <span className="text-xs font-semibold text-green-600">
                        {savedSegments.length} Saved
                        {isSavingSegment && <span className="ml-1 text-blue-500 animate-pulse">• Saving...</span>}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={combineSavedSegments}
                      disabled={savedSegments.length === 0}
                      className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-lg"
                      title="Combine all segments into one note"
                    >
                      <Save className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setShowSavedSegments(!showSavedSegments)}
                      className="p-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-lg"
                      title="Toggle saved segments"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                {savedSegments.length === 0 ? (
                  <div className="text-center py-6">
                    <p className={`${themeClasses.text.muted} text-sm animate-pulse`}>
                      Segments will appear here as you record...
                    </p>
                  </div>
                ) : (
                  <div className={`space-y-3 max-h-[300px] overflow-y-auto transition-all duration-500 ${showSavedSegments ? 'opacity-100' : 'opacity-0 max-h-0'}`}>
                    {savedSegments.map((segment, index) => (
                      <div 
                        key={segment.id} 
                        className={`${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'} rounded-lg p-3 border border-slate-200/50 transition-all duration-300 animate-fade-in hover:shadow-md`}
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">
                              {new Date(segment.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="text-xs text-green-500">
                              {segment.duration}s
                            </span>
                            <span className="text-xs text-blue-500">
                              Segment {index + 1}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => copyTranscriptionContent(segment.content)}
                              className="p-1 text-blue-500 hover:text-blue-600 transition-colors duration-200"
                              title="Copy"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => downloadTranscriptionFile(segment)}
                              className="p-1 text-green-500 hover:text-green-600 transition-colors duration-200"
                              title="Download"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <p className={`${themeClasses.text.primary} text-sm leading-relaxed`}>
                          {segment.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Instructions */}
              {/* <div className={`${isDarkMode ? 'bg-slate-700/30 border-slate-600/50' : 'bg-slate-100/50'} border rounded-xl p-3 text-center transition-all duration-300`}>
                <p className={`${isDarkMode ? 'text-slate-300' : 'text-slate-700'} text-xs`}>
                  <strong>Instructions:</strong> Click the microphone to start recording. 
                  Speak clearly and the text will appear in real-time. Click again to stop recording.
                  Use the language selector to change the recognition language.
                </p>
              </div> */}
            </div>

            {/* Right Side - History */}
            <div className={`${themeClasses.card} rounded-2xl p-6 transition-all duration-500 animate-slide-down shadow-2xl`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <h2 className={`text-xl font-bold ${themeClasses.text.primary} bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}>
                    History
                  </h2>
                  <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full border border-blue-300/30">
                    <List className="w-3 h-3 text-blue-500" />
                    <span className="text-xs font-semibold text-blue-600">{savedTranscriptions.length} Total</span>
                  </div>
                </div>
                <button
                  onClick={clearAllTranscriptions}
                  disabled={savedTranscriptions.length === 0}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-xs shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Clear All
                </button>
              </div>

              {/* Search and Filter */}
              <div className="flex flex-col gap-3 mb-6">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                  <input
                    type="text"
                    placeholder="Search transcriptions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-9 pr-4 py-2 rounded-xl border ${themeClasses.dropdown} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs shadow-lg transition-all duration-200 hover:shadow-xl`}
                  />
                </div>
                <div className="relative group">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400 group-focus-within:text-purple-500 transition-colors duration-200" />
                  <select
                    value={filterLanguage}
                    onChange={(e) => setFilterLanguage(e.target.value)}
                    className={`w-full pl-9 pr-8 py-2 rounded-xl border ${themeClasses.dropdown} focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-xs shadow-lg transition-all duration-200 hover:shadow-xl`}
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

              {/* Transcriptions List */}
              {filteredTranscriptions.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400">
                  {filteredTranscriptions.map((transcription, index) => (
                    <div 
                      key={transcription.id}
                      className={`${themeClasses.card} rounded-xl p-4 transition-all duration-300 hover:shadow-xl animate-fade-in border-l-4 border-gradient-to-b from-blue-500 to-purple-500 hover:border-l-4 hover:border-gradient-to-b hover:from-purple-500 hover:to-pink-500 transform hover:scale-[1.01] cursor-pointer`}
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => setSelectedTranscription(transcription)}
                    >
                      {/* List Item Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm">{languages.find(l => l.code === transcription.language)?.flag}</span>
                            <span className={`text-sm font-semibold ${themeClasses.text.primary}`}>{transcription.languageName}</span>
                            <span className="text-xs text-slate-400">{new Date(transcription.timestamp).toLocaleDateString()}</span>
                            <span className="text-xs text-slate-400">{new Date(transcription.timestamp).toLocaleTimeString()}</span>
                          </div>
                          {/* Editable Name */}
                          {editingId === transcription.id ? (
                            <input
                              className="text-sm font-bold bg-transparent border-b border-blue-400 focus:outline-none focus:border-blue-600 text-blue-300"
                              value={editingName}
                              autoFocus
                              onChange={e => setEditingName(e.target.value)}
                              onBlur={() => {
                                updateTranscriptionName(transcription.id, editingName.trim() || getDefaultName(transcription));
                                setEditingId(null);
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  updateTranscriptionName(transcription.id, editingName.trim() || getDefaultName(transcription));
                                  setEditingId(null);
                                }
                              }}
                            />
                          ) : (
                            <span
                              className="text-sm font-bold text-blue-300 cursor-pointer hover:underline"
                              onClick={e => {
                                e.stopPropagation();
                                setEditingId(transcription.id);
                                setEditingName(transcription.title || getDefaultName(transcription));
                              }}
                            >
                              {transcription.title || getDefaultName(transcription)}
                            </span>
                          )}
                        </div>
                        {/* Action Buttons */}
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => copyTranscriptionContent(transcription.content)}
                            className="p-1.5 text-blue-500 hover:text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/20 dark:hover:to-blue-800/20 rounded-lg transition-all duration-300 hover:scale-110 transform hover:shadow-lg"
                            title="Copy"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => downloadTranscriptionFile(transcription)}
                            className="p-1.5 text-green-500 hover:text-green-600 hover:bg-gradient-to-r hover:from-green-50 hover:to-green-100 dark:hover:from-green-900/20 dark:hover:to-green-800/20 rounded-lg transition-all duration-300 hover:scale-110 transform hover:shadow-lg"
                            title="Download"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteTranscription(transcription.id)}
                            className="p-1.5 text-red-500 hover:text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 dark:hover:from-red-900/20 dark:hover:to-red-800/20 rounded-lg transition-all duration-300 hover:scale-110 transform hover:shadow-lg"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Expandable Content */}
                      <div 
                        id={`content-${transcription.id}`}
                        className={`${isDarkMode ? 'bg-gradient-to-r from-slate-700/40 to-slate-600/40' : 'bg-gradient-to-r from-slate-50 to-blue-50/30'} rounded-lg p-3 border border-slate-200/50 hover:border-blue-300/50 transition-all duration-300 max-h-0 overflow-hidden`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>Duration: {transcription.duration || 'N/A'}s</span>
                            {transcription.confidence && (
                              <span>Confidence: {Math.round(transcription.confidence * 100)}%</span>
                            )}
                          </div>
                          <p className={`${themeClasses.text.primary} text-sm leading-relaxed overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 hover:scrollbar-thumb-slate-400`}>
                            {transcription.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-16 ${themeClasses.text.muted}`}>
                  <div className="relative">
                    <List className="w-12 h-12 mx-auto mb-4 opacity-50 animate-pulse" />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl animate-pulse"></div>
                  </div>
                  <h3 className="text-sm font-bold mb-2 bg-gradient-to-r from-slate-600 to-slate-400 bg-clip-text text-transparent">No Transcriptions Found</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
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
      </div>

      {/* 4. Modal for selected transcription */}
      {selectedTranscription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-8 max-w-lg w-full shadow-2xl relative animate-fade-in">
            <button
              className="absolute top-3 right-3 text-slate-400 hover:text-red-400 text-xl"
              onClick={() => { setSelectedTranscription(null); setAiEnhanced(null); setAiError(null); setAiLoading(false); }}
              title="Close"
            >
              &times;
            </button>
            <div className="mb-4 flex items-center gap-3">
              <span className="text-2xl">{languages.find(l => l.code === selectedTranscription.language)?.flag}</span>
              <span className="text-lg font-semibold">{selectedTranscription.languageName}</span>
              <span className="text-xs text-slate-400">{new Date(selectedTranscription.timestamp).toLocaleDateString()} {new Date(selectedTranscription.timestamp).toLocaleTimeString()}</span>
            </div>
            {/* Editable Name in Modal */}
            {editingId === selectedTranscription.id ? (
              <input
                className="text-lg font-bold bg-transparent border-b border-blue-400 focus:outline-none focus:border-blue-600 text-blue-300 mb-4 w-full"
                value={editingName}
                autoFocus
                onChange={e => setEditingName(e.target.value)}
                onBlur={() => {
                  updateTranscriptionName(selectedTranscription.id, editingName.trim() || getDefaultName(selectedTranscription));
                  setEditingId(null);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    updateTranscriptionName(selectedTranscription.id, editingName.trim() || getDefaultName(selectedTranscription));
                    setEditingId(null);
                  }
                }}
              />
            ) : (
              <span
                className="text-lg font-bold text-blue-300 cursor-pointer hover:underline mb-4 block"
                onClick={() => {
                  setEditingId(selectedTranscription.id);
                  setEditingName(selectedTranscription.title || getDefaultName(selectedTranscription));
                }}
              >
                {selectedTranscription.title || getDefaultName(selectedTranscription)}
              </span>
            )}
            <div className="mb-2 text-xs text-slate-400 flex gap-4">
              <span>Duration: {selectedTranscription.duration || 'N/A'}s</span>
              {selectedTranscription.confidence && (
                <span>Confidence: {Math.round(selectedTranscription.confidence * 100)}%</span>
              )}
            </div>
            <div className="bg-slate-800 rounded-lg p-4 mb-4 max-h-60 overflow-y-auto">
              <p className="whitespace-pre-line text-base leading-relaxed">{selectedTranscription.content}</p>
            </div>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => copyTranscriptionContent(selectedTranscription.content)}
                className="p-2 text-blue-500 hover:text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/20 dark:hover:to-blue-800/20 rounded-lg transition-all duration-300 hover:scale-110 transform hover:shadow-lg"
                title="Copy"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => downloadTranscriptionFile(selectedTranscription)}
                className="p-2 text-green-500 hover:text-green-600 hover:bg-gradient-to-r hover:from-green-50 hover:to-green-100 dark:hover:from-green-900/20 dark:hover:to-green-800/20 rounded-lg transition-all duration-300 hover:scale-110 transform hover:shadow-lg"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => { deleteTranscription(selectedTranscription.id); setSelectedTranscription(null); }}
                className="p-2 text-red-500 hover:text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 dark:hover:from-red-900/20 dark:hover:to-red-800/20 rounded-lg transition-all duration-300 hover:scale-110 transform hover:shadow-lg"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              {/* AI Regenerate Button */}
              <button
                onClick={() => handleAIRegenerate(selectedTranscription)}
                className="p-2 text-purple-500 hover:text-purple-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 dark:hover:from-purple-900/20 dark:hover:to-purple-800/20 rounded-lg transition-all duration-300 hover:scale-110 transform hover:shadow-lg"
                title="AI Regenerate"
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <span>AI Regenerate</span>
                )}
              </button>
            </div>
            {/* AI Enhanced Output */}
            {aiError && <div className="text-red-400 mb-2">{aiError}</div>}
            {aiEnhanced && (
              <div className="bg-slate-800 rounded-lg p-4 mb-4 max-h-60 overflow-y-auto border border-purple-400">
                <div className="mb-2 text-purple-300 font-semibold">AI Enhanced Notes:</div>
                <div className="prose prose-invert whitespace-pre-line text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: aiEnhanced.replace(/\n/g, '<br/>') }} />
                <div className="flex gap-2 mt-3">
                  <button
                    className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                    onClick={() => {
                      // Replace original content
                      updateTranscriptionName(selectedTranscription.id, editingName || selectedTranscription.title || getDefaultName(selectedTranscription));
                      setSavedTranscriptions(prev => prev.map(t => t.id === selectedTranscription.id ? { ...t, content: aiEnhanced } : t));
                      localStorage.setItem('transcriptions', JSON.stringify(savedTranscriptions.map(t => t.id === selectedTranscription.id ? { ...t, content: aiEnhanced } : t)));
                      setAiEnhanced(null);
                    }}
                  >
                    Replace Original
                  </button>
                  <button
                    className="px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-700 transition"
                    onClick={() => setAiEnhanced(null)}
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TranscriptionUI;
