import { useState, useRef, useEffect } from 'react';
import { useApi } from '../hooks/useApi.ts';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import Markdown from 'react-markdown';

export default function Assistant() {
  const api = useApi();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user'|'assistant', text: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant', 
        text: 'Hello! I am your AI financial assistant. I can analyze your spending, suggest budget optimizations, or answer questions about your transactions. What would you like to know today?'
      }]);
    }
  }, [messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { prompt: userMessage });
      setMessages(prev => [...prev, { role: 'assistant', text: res.data.response }]);
    } catch (error) {
      console.error('AI chat failed');
      setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I encountered an error analyzing your data. Please try again later.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] max-w-4xl mx-auto text-[#0f172a]">
      <div className="mb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#003366] text-white flex items-center justify-center shadow-xs">
          <Sparkles size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#002b49]">SmartSpend AI Assistant</h1>
          <p className="text-slate-500 text-xs font-medium">Powered by Gemini AI • Your financial advisor</p>
        </div>
      </div>

      <div className="flex-1 bg-white border border-[#e1e8ed] rounded-3xl flex flex-col overflow-hidden shadow-xs relative">
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 relative z-10 bg-[#f4f8fb]">
          {messages.map((msg, i) => (
            <div key={i} className={clsx(
              "flex gap-3 max-w-[85%]",
              msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
            )}>
              <div className={clsx(
                "w-8 h-8 shrink-0 rounded-full flex items-center justify-center mt-1 shadow-xs font-bold text-xs",
                msg.role === 'user' 
                  ? "bg-[#e0f2fe] text-[#005b8e] border border-[#b9e6fe]" 
                  : "bg-[#003366] text-white"
              )}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={clsx(
                "px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-xs",
                msg.role === 'user' 
                  ? "bg-[#005b8e] text-white rounded-tr-xs" 
                  : "bg-white border border-[#e1e8ed] text-[#0f172a] rounded-tl-xs markdown-body"
              )}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-slate prose-sm max-w-none">
                    <Markdown>{msg.text}</Markdown>
                  </div>
                ) : (
                  msg.text
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 max-w-[85%] mr-auto">
              <div className="w-8 h-8 shrink-0 rounded-full bg-[#003366] text-white flex items-center justify-center mt-1 shadow-xs">
                <Bot size={16} />
              </div>
              <div className="px-5 py-4 rounded-2xl bg-white border border-[#e1e8ed] rounded-tl-xs flex items-center gap-2 text-slate-500 shadow-xs">
                <Loader2 size={16} className="animate-spin text-[#005b8e]" />
                <span className="text-sm font-medium">SmartSpend AI is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Pills */}
        <div className="px-4 py-2 bg-white border-t border-[#e1e8ed] flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button 
            type="button" 
            onClick={() => setInput("How much did I spend on food last month?")}
            className="text-xs px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-[#e0f2fe] text-slate-700 hover:text-[#005b8e] font-medium border border-slate-200 transition-colors whitespace-nowrap"
          >
            Food spending summary
          </button>
          <button 
            type="button" 
            onClick={() => setInput("Suggest ways to increase my savings goals")}
            className="text-xs px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-[#e0f2fe] text-slate-700 hover:text-[#005b8e] font-medium border border-slate-200 transition-colors whitespace-nowrap"
          >
            Savings tips
          </button>
          <button 
            type="button" 
            onClick={() => setInput("Show my recurring subscriptions")}
            className="text-xs px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-[#e0f2fe] text-slate-700 hover:text-[#005b8e] font-medium border border-slate-200 transition-colors whitespace-nowrap"
          >
            Subscription summary
          </button>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-[#e1e8ed] relative z-10">
          <form onSubmit={handleSend} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your spending, budget, or get advice..."
              disabled={loading}
              className="w-full bg-[#f8fafc] border border-[#e1e8ed] text-[#0f172a] placeholder-slate-400 rounded-2xl pl-5 pr-14 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#005b8e]/20 focus:border-[#005b8e] shadow-xs text-sm"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#005b8e] text-white rounded-xl hover:bg-[#004f7c] disabled:opacity-50 transition-colors shadow-xs"
            >
              <Send size={18} />
            </button>
          </form>
          <div className="text-center mt-2">
             <span className="text-[11px] text-slate-400">AI can make mistakes. Verify important financial data.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
