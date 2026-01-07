'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

interface QuestionCard {
  id: string;
  question: string;
  response: string | null;
  loading: boolean;
  createdAt: Date;
  conversationHistory: Array<{role: string, content: string}>;
}

export default function Home() {
  const [cards, setCards] = useState<QuestionCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<QuestionCard | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when creating new question
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const createQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    const questionText = newQuestion.trim();
    const cardId = Date.now().toString();
    
    // Create new card with loading state
    const newCard: QuestionCard = {
      id: cardId,
      question: questionText,
      response: null,
      loading: true,
      createdAt: new Date(),
      conversationHistory: [],
    };

    setCards(prev => [newCard, ...prev]);
    setNewQuestion('');
    setIsCreating(false);

    // Get user's current date/time and timezone
    const now = new Date();
    const userDateTime = {
      timestamp: now.toISOString(),
      localDateTime: now.toLocaleString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        timeZoneName: 'short'
      }),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      unixTimestamp: Math.floor(now.getTime() / 1000),
    };

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: questionText,
          conversation_history: [],
          user_datetime: userDateTime,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      // Update card with response
      setCards(prev => prev.map(card => 
        card.id === cardId 
          ? { 
              ...card, 
              response: data.response || 'No response received',
              loading: false,
              conversationHistory: data.conversation_history || [],
            }
          : card
      ));

      // Also update selected card if it's open
      setSelectedCard(prev => 
        prev?.id === cardId 
          ? { 
              ...prev, 
              response: data.response || 'No response received',
              loading: false,
              conversationHistory: data.conversation_history || [],
            }
          : prev
      );

    } catch (error: any) {
      console.error('Error:', error);
      const errorMessage = error?.message || 'Failed to get response';
      
      setCards(prev => prev.map(card => 
        card.id === cardId 
          ? { ...card, response: `Error: ${errorMessage}`, loading: false }
          : card
      ));

      setSelectedCard(prev => 
        prev?.id === cardId 
          ? { ...prev, response: `Error: ${errorMessage}`, loading: false }
          : prev
      );
    }
  };

  const openCard = (card: QuestionCard) => {
    setSelectedCard(card);
  };

  const closeModal = () => {
    setSelectedCard(null);
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-white tracking-tight">Nova</h1>
        </div>
      </header>

      {/* Feed */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {cards.length === 0 && !isCreating && (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Ask anything</h2>
            <p className="text-gray-500 mb-8">Tap the button below to ask your first question</p>
          </div>
        )}

        {/* Cards */}
        <div className="space-y-4">
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => openCard(card)}
              className="w-full text-left group"
            >
              <div className="bg-[#141414] border border-white/5 rounded-2xl p-5 transition-all duration-200 hover:bg-[#1a1a1a] hover:border-white/10 hover:shadow-lg hover:shadow-black/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-lg leading-snug mb-2 line-clamp-2">
                      {card.question}
                    </p>
                    {card.loading ? (
                      <div className="flex items-center gap-2 text-gray-500">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-sm">Thinking...</span>
                      </div>
                    ) : card.response ? (
                      <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">
                        {card.response.replace(/[#*`]/g, '').substring(0, 150)}...
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-xs text-gray-600">{formatTimeAgo(card.createdAt)}</span>
                    <svg className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* New Question Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsCreating(false)}
          />
          <div className="relative w-full sm:max-w-lg mx-auto bg-[#141414] rounded-t-3xl sm:rounded-2xl border border-white/10 shadow-2xl animate-slide-up">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">New Question</h2>
              <form onSubmit={createQuestion}>
                <input
                  ref={inputRef}
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="What do you want to know?"
                  className="w-full px-4 py-4 bg-[#0a0a0a] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent text-lg"
                />
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 px-4 py-3 text-gray-400 hover:text-white border border-white/10 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newQuestion.trim()}
                    className="flex-1 px-4 py-3 bg-white text-black font-medium rounded-xl hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Ask
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Question Detail Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 bg-[#0a0a0a]">
          <div className="h-full flex flex-col">
            {/* Modal Header */}
            <header className="shrink-0 border-b border-white/5 bg-[#0a0a0a]">
              <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
                <button
                  onClick={closeModal}
                  className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm text-gray-500">{formatTimeAgo(selectedCard.createdAt)}</span>
              </div>
            </header>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {/* Question */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-[#2a2a2a] border border-white/10 px-5 py-3 rounded-2xl rounded-tr-md">
                    <p className="text-white text-lg">{selectedCard.question}</p>
                  </div>
                </div>

                {/* Response */}
                <div className="flex justify-start">
                  {selectedCard.loading ? (
                    <div className="bg-[#141414] px-5 py-4 rounded-2xl rounded-tl-md border border-white/5">
                      <div className="flex gap-1.5 items-center">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  ) : selectedCard.response ? (
                    <div className="max-w-[90%] prose prose-invert prose-sm">
                      <ReactMarkdown
                        components={{
                          h1: ({children}) => <h1 className="text-2xl font-bold text-white mt-4 mb-2">{children}</h1>,
                          h2: ({children}) => <h2 className="text-xl font-bold text-white mt-4 mb-2">{children}</h2>,
                          h3: ({children}) => <h3 className="text-lg font-semibold text-white mt-3 mb-2">{children}</h3>,
                          p: ({children}) => <p className="text-gray-200 mb-3 leading-relaxed">{children}</p>,
                          ul: ({children}) => <ul className="space-y-2 my-3">{children}</ul>,
                          ol: ({children}) => <ol className="space-y-2 my-3 list-decimal list-inside">{children}</ol>,
                          li: ({children}) => (
                            <li className="text-gray-200 flex items-start gap-2">
                              <span className="text-gray-500 mt-1">•</span>
                              <span className="flex-1">{children}</span>
                            </li>
                          ),
                          strong: ({children}) => <strong className="font-bold text-white">{children}</strong>,
                          em: ({children}) => <em className="italic text-gray-300">{children}</em>,
                          a: ({href, children}) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                              {children}
                            </a>
                          ),
                          code: ({children}) => (
                            <code className="bg-[#1a1a1a] px-2 py-1 rounded text-sm text-gray-200">{children}</code>
                          ),
                          pre: ({children}) => (
                            <pre className="bg-[#1a1a1a] p-4 rounded-xl overflow-x-auto my-3 border border-white/5">{children}</pre>
                          ),
                          blockquote: ({children}) => (
                            <blockquote className="border-l-4 border-gray-600 pl-4 italic text-gray-400 my-3">{children}</blockquote>
                          ),
                        }}
                      >
                        {selectedCard.response}
                      </ReactMarkdown>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAB - New Question Button */}
      {!isCreating && !selectedCard && (
        <button
          onClick={() => setIsCreating(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-[#1a1a1a] border border-white/10 rounded-full shadow-lg shadow-black/50 flex items-center justify-center hover:bg-[#252525] hover:border-white/20 active:scale-95 transition-all duration-200"
        >
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      <style jsx global>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
