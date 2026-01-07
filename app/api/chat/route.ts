import OpenAI from 'openai';
import { NextResponse } from 'next/server';

// Using OpenAI's Responses API with built-in web search tool
// https://platform.openai.com/docs/guides/tools-web-search
// https://platform.openai.com/docs/api-reference/responses

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('OPENAI_API_KEY is not set');
      return NextResponse.json(
        { error: 'API key not configured. Please set OPENAI_API_KEY in .env.local' },
        { status: 500 }
      );
    }

    const { message, conversation_history, conversation_id, user_datetime } = await request.json();
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // Build system message with current date/time information
    let systemMessage = 'You are a helpful assistant with web search capabilities. When you need current information, facts, or data that might be outdated in your training, use web search to find up-to-date information.';
    
    if (user_datetime) {
      systemMessage += `\n\nIMPORTANT: Current date and time information for the user:\n- Local date/time: ${user_datetime.localDateTime}\n- Timezone: ${user_datetime.timezone}\n- ISO timestamp: ${user_datetime.timestamp}\n- Unix timestamp: ${user_datetime.unixTimestamp}\n\nWhen the user asks about "tonight", "today", "tomorrow", etc., use the date/time information above to determine what they mean. For example, if they ask "who's playing in the NBA tonight?", use the local date/time to determine which date "tonight" refers to, then use web search to find "NBA games [specific date]" or "NBA schedule [specific date]". Always provide direct answers using web search results - don't ask the user for clarification when you have the date/time information and can search for the answer.`;
    }

    // Sliding window configuration - keep last 50 messages
    const MAX_HISTORY_MESSAGES = 50;

    // Build input for Responses API
    // Include conversation history in the input
    let inputMessages: any[] = [];
    
    // Add system instruction
    inputMessages.push({
      role: 'system',
      content: systemMessage,
    });

    // Add conversation history if provided
    if (conversation_history && Array.isArray(conversation_history)) {
      const validHistory = conversation_history.filter(
        (msg: any) => msg && msg.content !== null && msg.content !== undefined && typeof msg.content === 'string'
      );
      const recentHistory = validHistory.slice(-MAX_HISTORY_MESSAGES);
      inputMessages.push(...recentHistory);
    }

    // Add the current user message
    inputMessages.push({
      role: 'user',
      content: message,
    });

    // Use Responses API with web search tool
    // https://platform.openai.com/docs/api-reference/responses
    const response = await (openai as any).responses.create({
      model: 'gpt-4o',
      input: inputMessages,
      tools: [
        {
          type: 'web_search',
        },
      ],
      tool_choice: 'auto',
      store: true,
    });

    // Extract the response text
    // The Responses API returns output_text for the final text response
    const responseText = response.output_text || response.output?.[0]?.content || '';
    const response_id = response.id;

    // If response is null or empty, provide a fallback message
    if (!responseText || (typeof responseText === 'string' && responseText.trim() === '')) {
      console.warn('Empty or null response from API, using fallback');
      const fallbackResponse = 'I apologize, but I didn\'t receive a valid response. Please try again.';
      
      const validHistory = (conversation_history || []).filter(
        (msg: any) => msg && msg.content !== null && msg.content !== undefined && typeof msg.content === 'string'
      );
      const recentHistory = validHistory.slice(-MAX_HISTORY_MESSAGES);
      const updatedHistory = [
        ...recentHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: fallbackResponse },
      ];
      const trimmedHistory = updatedHistory.slice(-MAX_HISTORY_MESSAGES);
      
      return NextResponse.json({ 
        response: fallbackResponse,
        response_id,
        conversation_id: conversation_id || response_id,
        conversation_history: trimmedHistory,
      });
    }
    
    // Build updated conversation history for next turn
    const validHistory = (conversation_history || []).filter(
      (msg: any) => msg && msg.content !== null && msg.content !== undefined && typeof msg.content === 'string'
    );
    const recentHistory = validHistory.slice(-MAX_HISTORY_MESSAGES);
    const updatedHistory = [
      ...recentHistory,
      { role: 'user', content: message },
      { role: 'assistant', content: responseText },
    ];
    const trimmedHistory = updatedHistory.slice(-MAX_HISTORY_MESSAGES);

    return NextResponse.json({ 
      response: responseText,
      response_id,
      conversation_id: conversation_id || response_id,
      conversation_history: trimmedHistory,
    });
  } catch (error: any) {
    console.error('Error:', error);
    const errorMessage = error?.message || 'Unknown error occurred';
    return NextResponse.json(
      { error: `Sorry, an error occurred: ${errorMessage}` },
      { status: 500 }
    );
  }
}
