// src/components/ChatbotWidget.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X } from 'lucide-react'; // Chat and Send icons
import { api } from '@/lib/api';
import { getAuthToken } from '@/lib/auth'; // To get user's JWT
import jwt from 'jsonwebtoken'; // To decode JWT for user ID (for MVP)
import { ChatMessageData, ChatbotRequestPayload, ChatbotResponseData } from '@/types';

// For MVP, simple JWT decode. In production, send token to user service to get user ID.
interface DecodedToken {
  id: string;
  email: string;
  iat: number;
  exp: number;
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (inputMessage.trim() === '') return;

    const userMessage: ChatMessageData = { sender: 'user', text: inputMessage, timestamp: new Date() };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Get user ID and token for personalized queries
    let userId: string | undefined;
    const authToken = getAuthToken();
    if (authToken) {
      try {
        const decoded = jwt.decode(authToken) as DecodedToken;
        userId = decoded.id;
      } catch (e) {
        console.error('Failed to decode JWT:', e);
      }
    }

    try {
      const payload: ChatbotRequestPayload = {
        user_message: inputMessage,
        userId: userId,
        authToken: authToken || undefined, // Pass token if available
      };

      const response: ChatbotResponseData = await api('/chatbot', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const botMessage: ChatMessageData = { sender: 'bot', text: response.response, timestamp: new Date() };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error: any) {
      const errorMessage = { sender: 'bot', text: `Error: ${error.message || 'Could not connect to chatbot.'}`, timestamp: new Date() };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
      console.error('Chatbot API error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 z-50 flex items-center justify-center"
        aria-label="Open Chatbot"
      >
        {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-[calc(6rem+1.5rem)] right-6 w-full max-w-sm bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col transition-all duration-300 z-40 ${
          isOpen ? 'h-96 opacity-100 visible' : 'h-0 opacity-0 invisible'
        }`}
        style={{ transform: isOpen ? 'translateY(0)' : 'translateY(20px)' }}
      >
        <div className="bg-indigo-600 text-white p-4 rounded-t-lg flex justify-between items-center">
          <h2 className="font-semibold text-lg">SwiftMart Chatbot</h2>
          <button onClick={() => setIsOpen(false)} className="text-white hover:text-indigo-100" aria-label="Close Chatbot">
            <X size={20} />
          </button>
        </div>
        <div className="flex-grow p-4 overflow-y-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 italic mt-8">Type a message to start chatting!</div>
          )}
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] p-3 rounded-lg ${
                  msg.sender === 'user'
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="text-sm">{msg.text}</p>
                <span className="text-xs text-gray-500 block mt-1 text-right">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="max-w-[75%] p-3 rounded-lg bg-gray-100 text-gray-800">
                <div className="typing-dots">
                  <span>.</span><span>.</span><span>.</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t border-gray-200 flex items-center">
          <input
            type="text"
            className="flex-grow border border-gray-300 rounded-md p-2 mr-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Type your message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isTyping}
          />
          <button
            onClick={handleSendMessage}
            className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isTyping || inputMessage.trim() === ''}
            aria-label="Send Message"
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      <style jsx>{`
        .typing-dots span {
          animation: blink 1.4s infinite linear;
          animation-fill-mode: both;
        }
        .typing-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }
        .typing-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes blink {
          0% { opacity: 0.2; }
          20% { opacity: 1; }
          100% { opacity: 0.2; }
        }
      `}</style>
    </>
  );
}