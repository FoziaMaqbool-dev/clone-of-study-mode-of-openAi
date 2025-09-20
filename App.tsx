
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chat } from '@google/genai';
import { Header } from './components/Header';
import { ChatInput } from './components/ChatInput';
import { ChatMessage } from './components/ChatMessage';
import { ExamplePrompts } from './components/ExamplePrompts';
import { Message, Sender } from './types';
import { initializeChat } from './services/geminiService';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chatInstance = initializeChat();
    if (!chatInstance) {
      setError("Failed to initialize. Please check your API key.");
    }
    setChat(chatInstance);
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!chat) {
      setError("Chat is not initialized. Cannot send message.");
      return;
    }
    
    const userMessage: Message = { id: Date.now().toString(), text, sender: Sender.USER };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    const aiMessageId = (Date.now() + 1).toString();
    const aiMessagePlaceholder: Message = { id: aiMessageId, text: '', sender: Sender.AI };
    setMessages(prev => [...prev, aiMessagePlaceholder]);

    try {
      const stream = await chat.sendMessageStream({ message: text });

      let currentText = '';
      for await (const chunk of stream) {
        currentText += chunk.text;
        setMessages(prev =>
          prev.map(msg =>
            msg.id === aiMessageId ? { ...msg, text: currentText } : msg
          )
        );
      }
    } catch (e) {
      console.error(e);
      const errorMessage = 'Sorry, I encountered an error. Please try again.';
      setError(errorMessage);
       setMessages(prev =>
          prev.map(msg =>
            msg.id === aiMessageId ? { ...msg, text: errorMessage } : msg
          )
        );
    } finally {
      setIsLoading(false);
    }
  }, [chat]);

  const handlePromptClick = (prompt: string) => {
      handleSendMessage(prompt);
  };


  return (
    <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-900 font-sans">
      <Header />
      <main ref={chatContainerRef} className="flex-grow overflow-y-auto">
        <div className="container mx-auto px-4 py-8 flex flex-col h-full">
           {messages.length === 0 && !isLoading ? (
            <ExamplePrompts onPromptClick={handlePromptClick} />
          ) : (
             <div className="flex-grow">
                 {messages.map((msg, index) => (
                    <ChatMessage
                        key={msg.id}
                        message={msg}
                        isStreaming={isLoading && index === messages.length - 1}
                    />
                 ))}
             </div>
          )}
          {error && (
            <div className="mt-4 p-4 text-center text-red-500 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <p>{error}</p>
            </div>
          )}
        </div>
      </main>
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}
