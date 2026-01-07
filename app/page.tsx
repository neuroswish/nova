'use client';

import { useState } from 'react';

export default function Home() {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string, content: string}>>([]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const messageText = input.trim();
    const userMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

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
          message: messageText,
          conversation_id: conversationId,
          conversation_history: conversationHistory,
          user_datetime: userDateTime,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      
      // Update conversation state with the new response
      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id);
      }
      
      // Update conversation history for next turn
      // Filter out any messages with null/undefined content
      if (data.conversation_history && Array.isArray(data.conversation_history)) {
        const validHistory = data.conversation_history.filter(
          (msg: any) => msg && msg.content !== null && msg.content !== undefined && typeof msg.content === 'string'
        );
        setConversationHistory(validHistory);
      }
      
      // Add assistant message - always add it, even if empty, so user knows something happened
      if (data.response !== undefined && data.response !== null) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response || 'No response received' }]);
      } else {
        console.error('No response field in API response:', data);
        setMessages(prev => [...prev, { role: 'assistant', content: 'Error: No response received from the server.' }]);
      }
    } catch (error: any) {
      console.error('Error:', error);
      const errorMessage = error?.message || 'Failed to get response';
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errorMessage}` }]);
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setConversationHistory([]);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <h2 className="text-2xl font-bold mb-2">Start a conversation</h2>
              <p className="text-sm">Your conversation state will be maintained automatically</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2 rounded-lg ${
                msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 px-4 py-2 rounded-lg flex items-center gap-2 min-h-[40px]">
                <div className="flex gap-1.5 items-center">
                  <div 
                    className="w-2 h-2 bg-gray-600 rounded-full" 
                    style={{ 
                      animation: 'pulse 1.4s ease-in-out infinite',
                      animationDelay: '0ms'
                    }}
                  ></div>
                  <div 
                    className="w-2 h-2 bg-gray-600 rounded-full" 
                    style={{ 
                      animation: 'pulse 1.4s ease-in-out infinite',
                      animationDelay: '200ms'
                    }}
                  ></div>
                  <div 
                    className="w-2 h-2 bg-gray-600 rounded-full" 
                    style={{ 
                      animation: 'pulse 1.4s ease-in-out infinite',
                      animationDelay: '400ms'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4 border-t">
        <div className="max-w-3xl mx-auto flex gap-2 items-center">
          {conversationId && (
            <button
              onClick={startNewConversation}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-lg"
              title="Start a new conversation"
            >
              New Chat
            </button>
          )}
          <form onSubmit={sendMessage} className="flex-1 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
