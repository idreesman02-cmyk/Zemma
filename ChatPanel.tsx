import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, Smile } from 'lucide-react';
import { Message, User } from '@/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ChatPanelProps {
  messages: Message[];
  me: User | null;
  onSendMessage: (text: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, me, onSendMessage, onReact, isOpen, onClose }) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 bg-neutral-900 border-l border-neutral-800 h-full flex flex-col z-40">
      <div className="p-6 border-b border-neutral-800 flex items-center justify-between shadow-sm">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-500" />
          Chat
        </h2>
        <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-40">
             <MessageSquare className="w-12 h-12 mb-4" />
             <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        )}
        
        {messages.map((msg) => {
          const isMe = msg.senderId === me?.id;
          const reactions = msg.reactions || {};
          
          return (
            <div key={msg.id} className={cn("flex flex-col group", isMe ? "items-end" : "items-start")}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-neutral-500 truncate max-w-[100px]">
                  {isMe ? "You" : msg.senderName}
                </span>
                <span className="text-[9px] text-neutral-600">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              
              <div className="relative max-w-[90%]">
                <div className={cn(
                  "px-4 py-2.5 rounded-2xl text-sm break-words leading-relaxed shadow-sm transition-all",
                  isMe ? "bg-emerald-600 text-white rounded-tr-none" : "bg-neutral-800 text-neutral-200 rounded-tl-none"
                )}>
                  {msg.text}
                </div>

                {/* Emoji Picker Trigger */}
                <button 
                  onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                  className={cn(
                    "absolute -top-2 p-1 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white hover:scale-110 transition-all opacity-0 group-hover:opacity-100 z-10 shadow-lg",
                    isMe ? "-left-6" : "-right-6"
                  )}
                >
                  <Smile className="w-3 h-3" />
                </button>

                {/* Emoji Picker Popup */}
                <AnimatePresence>
                  {showEmojiPicker === msg.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 5 }}
                      className={cn(
                        "absolute -top-10 flex items-center gap-1 p-1.5 bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl z-20",
                        isMe ? "right-0" : "left-0"
                      )}
                    >
                      {COMMON_EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => {
                            onReact(msg.id, emoji);
                            setShowEmojiPicker(null);
                          }}
                          className="hover:scale-125 transition-transform p-0.5"
                        >
                          {emoji}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Display Reactions */}
              {Object.keys(reactions).length > 0 && (
                <div className={cn("flex flex-wrap gap-1 mt-1.5", isMe ? "justify-end" : "justify-start")}>
                  {Object.entries(reactions).map(([emoji, userIds]) => {
                    const ids = userIds as string[];
                    const hasReacted = me && ids.includes(me.id);
                    return (
                      <button
                        key={emoji}
                        onClick={() => onReact(msg.id, emoji)}
                        className={cn(
                          "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] transition-all border",
                          hasReacted 
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" 
                            : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600"
                        )}
                      >
                        <span>{emoji}</span>
                        <span className="font-bold">{ids.length}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-neutral-900 border-t border-neutral-800">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-neutral-800 text-white rounded-xl pl-4 pr-12 py-3.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-neutral-600 border border-neutral-700/50"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-emerald-500 hover:text-emerald-400 disabled:text-neutral-600 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
