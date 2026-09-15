import React, { useState, useEffect, useRef } from 'react';
import { ChatThread, ChatMessage } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { FamilyAvatar } from '../ui/FamilyAvatar';
import {
  MessageSquare,
  Send,
  Image as ImageIcon,
  Shield,
  Clock,
  Sparkles
} from 'lucide-react';

export const ChatView: React.FC = () => {
  const { session, members } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchThreads = async () => {
    try {
      setLoading(true);
      const data = await api.getThreads();
      setThreads(data);
      if (data.length > 0 && !selectedThreadId) {
        setSelectedThreadId(data[0].Thread_ID);
      }
    } catch (err) {
      console.error('Failed to load threads:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (threadId: string) => {
    try {
      const data = await api.getMessages(threadId);
      setMessages(data);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, []);

  useEffect(() => {
    if (selectedThreadId) {
      fetchMessages(selectedThreadId);
    }
  }, [selectedThreadId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedThreadId) return;

    setSending(true);
    const text = inputText;
    setInputText('');

    try {
      await api.sendMessage(selectedThreadId, text);
      await fetchMessages(selectedThreadId);
    } catch (err) {
      console.error('Failed to send message:', err);
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  const getMember = (id: string) => members.find(m => m.Member_ID === id);
  const currentThread = threads.find(t => t.Thread_ID === selectedThreadId);

  return (
    <div className="h-[calc(100vh-12rem)] min-h-[500px] flex flex-col md:flex-row gap-4">
      {/* Threads Sidebar */}
      <div className="w-full md:w-72 bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-orange-700" />
            <h3 className="text-sm font-bold text-stone-900">Family Channels</h3>
          </div>
        </div>

        <div className="space-y-1.5 overflow-y-auto flex-1">
          {threads.map(thread => {
            const isParents = thread.Thread_Type === 'PARENTS';
            const isSelected = selectedThreadId === thread.Thread_ID;
            return (
              <button
                key={thread.Thread_ID}
                onClick={() => setSelectedThreadId(thread.Thread_ID)}
                className={`w-full text-left p-3 rounded-xl transition-colors flex items-center justify-between ${
                  isSelected ? 'bg-stone-900 text-white shadow-xs' : 'hover:bg-stone-50 text-stone-700'
                }`}
              >
                <div>
                  <div className="flex items-center space-x-1.5 font-semibold text-xs">
                    <span># {thread.Title}</span>
                    {isParents && (
                      <Shield className={`w-3.5 h-3.5 ${isSelected ? 'text-rose-400' : 'text-rose-600'}`} />
                    )}
                  </div>
                  <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-stone-300' : 'text-stone-400'}`}>
                    {isParents ? 'Private Parent Lounge' : 'Open Family Chat'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages Canvas */}
      <div className="flex-1 bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col overflow-hidden">
        {/* Thread Header */}
        <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center space-x-2">
            <span className="text-base font-bold text-stone-900">#{currentThread?.Title}</span>
            {currentThread?.Thread_Type === 'PARENTS' && (
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                Parents Only
              </span>
            )}
          </div>
          <span className="text-xs text-stone-400">Sheet Tab: Chat_Messages</span>
        </div>

        {/* Message Log */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map(msg => {
            const isSelf = msg.Sender_ID === session?.member.Member_ID;
            const sender = getMember(msg.Sender_ID);

            return (
              <div
                key={msg.Message_ID}
                className={`flex items-start space-x-2.5 ${isSelf ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                <FamilyAvatar
                  member={sender}
                  size="sm"
                  shape="squircle"
                  className="shrink-0"
                />

                <div className={`max-w-[75%] sm:max-w-md ${isSelf ? 'text-right' : ''}`}>
                  <div className="flex items-center space-x-1.5 mb-1">
                    <span className="text-[11px] font-bold text-stone-900">
                      {isSelf ? 'You' : sender?.Display_Name}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {new Date(msg.Created_At).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`p-3 rounded-2xl text-xs leading-relaxed inline-block text-left ${
                      isSelf
                        ? 'bg-orange-700 text-white rounded-tr-xs'
                        : 'bg-stone-100 text-stone-800 rounded-tl-xs'
                    }`}
                  >
                    {msg.Content}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-stone-100 flex items-center space-x-2">
          <input
            type="text"
            placeholder={`Message #${currentThread?.Title || 'family'}...`}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
          />
          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            className="p-2.5 rounded-xl bg-orange-700 hover:bg-orange-800 active:bg-orange-900 disabled:opacity-40 text-white shadow-xs transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
