import React, { useState, useEffect, useRef } from 'react';
import { useApp } from './AppContext';
import { MessageSquare, X, Send, Bot, User as UserIcon, RotateCcw } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isWelcome?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "How do I report an issue?",
  "How does AI categorization work?",
  "What is community verification?",
  "How do I earn XP and badges?",
  "What happens after I report?",
  "How long does resolution take?"
];

export const CivicBot: React.FC = () => {
  const { user, token } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(true); // Default to true to show "AI" badge initially
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with welcome message when component mounts
  useEffect(() => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: `Hi! I am CivicBot 👋 I am your AI assistant for CivicPulse. 

I can help you with things like:
- How to report a civic issue
- Understanding issue categories and severity
- How the verification system works  
- How to earn XP and badges
- What happens after you report an issue
- How long issues take to get resolved

Ask me anything!`,
        timestamp: timeStr,
        isWelcome: true
      }
    ]);
  }, []);

  // Scroll to bottom whenever messages or typing state changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isTyping) return;

    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: userTime
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Package conversation history to keep context for Gemini
      // Exclude welcome message to prevent confusion, and map roles properly
      const history = messages
        .filter(m => !m.isWelcome)
        .map(m => ({
          role: m.role,
          text: m.text
        }));

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: textToSend,
          history: history
        })
      });

      if (!response.ok) {
        throw new Error('Server returned an error');
      }

      const data = await response.json();
      
      const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        text: data.response || "Sorry, I am having trouble connecting right now. Please try again in a moment! 🔄",
        timestamp: botTime
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error('[CivicBot Client] Chat error:', error);
      const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: "Sorry, I am having trouble connecting right now. Please try again in a moment! 🔄",
        timestamp: botTime
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const resetChat = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: `Hi! I am CivicBot 👋 I am your AI assistant for CivicPulse. 

I can help you with things like:
- How to report a civic issue
- Understanding issue categories and severity
- How the verification system works  
- How to earn XP and badges
- What happens after you report an issue
- How long issues take to get resolved

Ask me anything!`,
        timestamp: timeStr,
        isWelcome: true
      }
    ]);
    setInputValue('');
    setIsTyping(false);
  };

  const toggleChat = () => {
    if (isOpen) {
      resetChat();
    } else {
      setHasNewMessage(false);
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9990] font-sans" id="civicbot-floating-container">
      {/* FLOATING BUTTON (Minimal black and blue with AI robot logo) */}
      <button
        onClick={toggleChat}
        className="w-14 h-14 rounded-full bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-blue-500 text-blue-400 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.45)] hover:shadow-[0_0_25px_rgba(37,99,235,0.65)] hover:text-white transition-all duration-300 transform hover:scale-110 active:scale-95 focus:outline-none relative group cursor-pointer"
        id="civicbot-trigger"
        aria-label="Open CivicBot AI Assistant"
      >
        {/* Pulse Outer Wave */}
        <span className="absolute inset-0 rounded-full bg-blue-500 opacity-30 animate-ping pointer-events-none group-hover:opacity-50 duration-1000" />
        
        {/* Little AI Robot Logo */}
        <Bot className="w-7 h-7 text-blue-400 group-hover:text-blue-300 transition-colors animate-pulse" />

        {/* Red AI Notification Badge */}
        {hasNewMessage && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow-md animate-bounce tracking-tight">
            AI
          </span>
        )}
      </button>

      {/* CHAT PANEL */}
      {isOpen && (
        <div
          className="fixed md:absolute z-[9998] inset-0 md:inset-auto md:bottom-20 md:right-0 w-full h-full md:w-[340px] md:h-[480px] bg-white md:rounded-2xl md:shadow-2xl flex flex-col overflow-hidden border border-slate-100 animate-scale-up"
          id="civicbot-panel"
        >
          {/* Header (Minimal black and blue) */}
          <div className="bg-slate-950 border-b border-blue-500/30 px-4 py-3.5 flex items-center justify-between text-white shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-blue-500/50 flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                <Bot className="w-4 h-4 text-blue-400 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight text-white flex items-center gap-1.5">
                  CivicBot
                  <span className="text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1 py-0.5 rounded uppercase tracking-wider font-extrabold leading-none">
                    AI
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Always here to help</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetChat}
                className="p-1.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors focus:outline-none cursor-pointer"
                title="Refresh Conversation"
                aria-label="Refresh conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  resetChat();
                }}
                className="p-1.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors focus:outline-none cursor-pointer"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((msg) => {
              const isBot = msg.role === 'assistant';
              return (
                <div key={msg.id} className="space-y-2">
                  <div className={`flex items-start gap-2.5 ${isBot ? 'justify-start' : 'justify-end'}`}>
                    {/* Bot Avatar */}
                    {isBot && (
                      <div className="w-7 h-7 rounded-full bg-slate-900 border border-blue-500/30 flex items-center justify-center shadow-[0_0_8px_rgba(59,130,246,0.2)] shrink-0">
                        <Bot className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                    )}

                    {/* Bubble Content */}
                    <div className="flex flex-col max-w-[80%]">
                      <div
                        className={`px-3.5 py-2.5 text-xs shadow-sm whitespace-pre-line leading-relaxed ${
                          isBot
                            ? 'bg-white text-slate-800 rounded-2xl rounded-tl-none border border-slate-100'
                            : 'bg-blue-600 text-white rounded-2xl rounded-tr-none'
                        }`}
                      >
                        {msg.text}
                      </div>
                      
                      {/* Timestamp */}
                      <span className={`text-[9px] text-slate-400 mt-1 px-1 ${!isBot ? 'text-right' : ''}`}>
                        {msg.timestamp}
                      </span>
                    </div>

                    {/* User Avatar */}
                    {!isBot && (
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-extrabold shadow-sm shrink-0 border border-blue-200">
                        {user ? getInitials(user.name) : 'ME'}
                      </div>
                    )}
                  </div>

                  {/* Suggested Question Chips below welcome message only */}
                  {msg.isWelcome && messages.length === 1 && (
                    <div className="pl-9 pr-2 py-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Suggested Questions</span>
                      <div className="flex flex-wrap gap-1.5">
                        {SUGGESTED_QUESTIONS.map((question, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSend(question)}
                            className="text-[11px] font-medium bg-white text-blue-600 border border-blue-100 hover:border-blue-300 hover:bg-blue-50/50 px-2.5 py-1.5 rounded-lg text-left shadow-sm transition-all duration-150 cursor-pointer"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-start gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-full bg-slate-900 border border-blue-500/30 flex items-center justify-center shadow-[0_0_8px_rgba(59,130,246,0.2)] shrink-0">
                  <Bot className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="flex flex-col">
                  <div className="bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-tl-none px-4 py-3.5 shadow-sm">
                    <div className="flex gap-1.5 items-center py-0.5">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputValue);
            }}
            className="p-3 bg-white border-t border-slate-100 flex gap-2 items-center"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask CivicBot something..."
              disabled={isTyping}
              className="flex-1 text-xs border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl px-3 py-2.5 outline-none transition-all disabled:bg-slate-50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 text-white disabled:text-slate-400 rounded-xl transition-all shadow-sm focus:outline-none cursor-pointer"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
