/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, Smile, Image, Paperclip, Search, Trash2, Edit3, CornerUpLeft, 
  MessageSquare, UserPlus, ShieldAlert, Swords, Heart, Plus, Users, SearchIcon, X
} from 'lucide-react';
import { ChatRoom, Message, UserProfile, MessageReaction } from '../types';

interface ChatPanelProps {
  user: UserProfile;
  rooms: ChatRoom[];
  activeRoomId: string;
  onChangeRoom: (roomId: string) => void;
  messages: Message[];
  onSendMessage: (content: string, type?: 'text' | 'image' | 'file', fileUrl?: string, fileName?: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onAddReaction: (messageId: string, reactionType: 'congrats' | 'critical' | 'miss' | 'poison' | 'paralyze') => void;
  typingUsers: string[];
  onTypingStart: () => void;
  onTypingStop: () => void;
  onCreateRoom: (name: string, description: string, isPrivate: boolean) => void;
}

export default function ChatPanel({
  user,
  rooms,
  activeRoomId,
  onChangeRoom,
  messages,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onAddReaction,
  typingUsers,
  onTypingStart,
  onTypingStop,
  onCreateRoom
}: ChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyingMessage, setReplyingMessage] = useState<Message | null>(null);
  const [isNewRoomOpen, setIsNewRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomPrivate, setNewRoomPrivate] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom when messages load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing indicator trigger
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    onTypingStart();

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTypingStop();
    }, 2000);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (editingMessage) {
      onEditMessage(editingMessage.id, inputText);
      setEditingMessage(null);
    } else {
      onSendMessage(inputText, 'text');
    }

    setInputText('');
    onTypingStop();
    setReplyingMessage(null);
  };

  const handleCreateRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    onCreateRoom(newRoomName, newRoomDesc, newRoomPrivate);
    setNewRoomName('');
    setNewRoomDesc('');
    setNewRoomPrivate(false);
    setIsNewRoomOpen(false);
  };

  const handleImageSend = () => {
    const urls = [
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=600&auto=format&fit=crop',
    ];
    const randomUrl = urls[Math.floor(Math.random() * urls.length)];
    onSendMessage('Holographic screenshot loaded', 'image', randomUrl, 'screenshot.png');
  };

  const handleGiftPotion = (message: Message) => {
    onSendMessage(`Gave a *Healing Potion* to @${message.senderName}!`, 'text');
  };

  // Filter messages based on search query
  const filteredMessages = messages.filter(msg => 
    msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.senderName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeRoom = rooms.find(r => r.id === activeRoomId) || rooms[0];

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] sophisticated-dark-bg text-[#c0d6df] border border-[#00d9ff]/20 rounded-2xl overflow-hidden font-sans shadow-2xl relative" id="sao-chat-panel">
      
      {/* 1. Sidebar: Floors/Channels selection */}
      <div className="w-full lg:w-72 bg-black/20 border-b lg:border-b-0 lg:border-r border-[#00d9ff]/10 flex flex-col justify-between p-4 shrink-0">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#00d9ff]/10">
            <span className="text-xs font-mono font-black text-[#00d9ff] tracking-wider uppercase flex items-center gap-1.5">
              <Users className="w-4 h-4 animate-pulse" />
              Floor Navigation
            </span>
            <button
              onClick={() => setIsNewRoomOpen(true)}
              className="p-1 rounded bg-[#00d9ff]/10 hover:bg-[#00d9ff]/20 border border-[#00d9ff]/30 text-[#00d9ff] hover:text-cyan-300 transition-colors cursor-pointer"
              title="Form a party / New Floor Room"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Rooms List */}
          <div className="space-y-1.5 max-h-[220px] lg:max-h-[350px] overflow-y-auto">
            {rooms.map((room) => {
              const isActive = room.id === activeRoomId;
              return (
                <button
                  key={room.id}
                  onClick={() => onChangeRoom(room.id)}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs font-sans transition-all cursor-pointer flex items-center justify-between ${
                    isActive
                      ? 'border-[#00d9ff]/30 bg-[#00d9ff]/10 text-white shadow-[0_0_12px_rgba(0,217,255,0.15)]'
                      : 'border-transparent bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">🛡️</span>
                    <div className="truncate">
                      <p className="font-bold">{room.name}</p>
                      <p className="text-[10px] text-gray-500 truncate">{room.description}</p>
                    </div>
                  </div>
                  {room.isPrivate && (
                    <span className="text-[8px] font-mono font-bold bg-[#ff9900]/10 border border-[#ff9900]/30 px-1 text-[#ff9900] uppercase rounded">
                      Solo
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Game Environment Stats widget inside sidebar */}
        <div className="mt-4 p-3 bg-[#00d9ff]/5 border border-[#00d9ff]/20 rounded-xl hidden lg:block">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#00d9ff] uppercase tracking-widest mb-1.5">
            <Swords className="w-3.5 h-3.5 animate-spin-slow text-[#ff9900]" />
            Aincrad Atmosphere
          </div>
          <div className="space-y-1 font-mono text-[9px] text-gray-500">
            <p>Active Raid: Floor 74 (Glade)</p>
            <p>Survival Rate: 94.2%</p>
            <p>Monsters Defeated: 12,481</p>
          </div>
        </div>
      </div>

      {/* 2. Main Chat Area */}
      <div className="flex-1 flex flex-col justify-between bg-black/5 relative overflow-hidden">
        {/* Holographic grid background overlay inside main chat viewport */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none hologram-grid" />
        
        {/* Chat Area Header with Search */}
        <div className="px-4 py-3 bg-black/20 border-b border-[#00d9ff]/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative z-10">
          <div>
            <h3 className="text-sm font-sans font-black text-gray-100 flex items-center gap-1.5">
              <span>🏰</span>
              {activeRoom?.name}
            </h3>
            <p className="text-[10px] font-mono text-[#00d9ff]/80">{activeRoom?.description}</p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#00d9ff]/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search scroll history..."
              className="w-full pl-8 pr-3 py-1.5 bg-black/40 border border-[#00d9ff]/20 rounded-lg text-xs text-[#c0d6df] placeholder-gray-600 focus:outline-none focus:border-[#00d9ff]"
            />
          </div>
        </div>

        {/* Messages Scrolling Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10" id="chat-messages-viewport">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              <MessageSquare className="w-12 h-12 text-[#00d9ff]/30 mb-2 animate-bounce" />
              <p className="text-xs font-mono text-[#00d9ff]/40 uppercase tracking-widest">
                No active scrolls recorded on this Floor.
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isMe = msg.senderId === user.uid;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-start gap-3 group/msg ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  {/* Sender Avatar & LV */}
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-lg bg-[#00d9ff]/10 border border-[#00d9ff]/30 flex items-center justify-center text-lg relative overflow-hidden">
                      {msg.senderAvatar}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-[#00d9ff] text-slate-950 font-mono font-black text-[7px] px-1 rounded border border-slate-950 shadow">
                      {msg.senderLevel}
                    </div>
                  </div>

                  {/* Message Bubble Column */}
                  <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-sans font-bold text-gray-300">
                        {msg.senderName}
                      </span>
                      {/* Health bar indicator */}
                      <div className="w-12 h-1.5 bg-black/40 border border-white/10 rounded-sm overflow-hidden flex">
                        <div className="h-full bg-gradient-to-r from-[#00ff88] to-[#228844]" style={{ width: `${msg.senderHp}%` }} />
                      </div>
                      <span className="text-[8px] font-mono text-gray-600">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Replied Message Anchor */}
                    {msg.replyTo && (
                      <div className="mb-1 p-2 bg-[#00d9ff]/5 border-l-2 border-[#00d9ff]/50 rounded text-[10px] text-[#00d9ff] font-sans">
                        <span className="font-bold">@{msg.replyTo.senderName}:</span> {msg.replyTo.content}
                      </div>
                    )}

                    {/* Content Container */}
                    <div
                      className={`p-3 rounded-2xl text-xs relative ${
                        isMe
                          ? 'bg-[#00d9ff]/10 border border-[#00d9ff]/30 text-[#00d9ff] rounded-tr-none shadow-[0_0_15px_rgba(0,217,255,0.05)]'
                          : 'bg-white/5 border border-white/10 text-white/80 rounded-tl-none'
                      }`}
                    >
                      {msg.type === 'image' && msg.fileUrl ? (
                        <div className="space-y-2">
                          <img
                            src={msg.fileUrl}
                            alt="Holographic snapshot"
                            className="max-h-48 rounded-lg border border-[#00d9ff]/30 shadow-md object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <p className="font-mono text-[9px] text-[#00d9ff]">{msg.content}</p>
                        </div>
                      ) : (
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      )}

                      {/* Tooltip Quick Actions */}
                      <div className="absolute top-1/2 -translate-y-1/2 hidden group-hover/msg:flex items-center gap-1 bg-black/95 border border-[#00d9ff]/30 px-1.5 py-1 rounded-lg shadow-lg z-20" style={isMe ? { right: '105%' } : { left: '105%' }}>
                        <button
                          onClick={() => setReplyingMessage(msg)}
                          className="p-1 hover:bg-[#00d9ff]/10 text-[#00d9ff] rounded cursor-pointer animate-pulse"
                          title="Reply"
                        >
                          <CornerUpLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleGiftPotion(msg)}
                          className="p-1 hover:bg-[#00d9ff]/10 text-[#00ff88] rounded cursor-pointer"
                          title="Gift Potion"
                        >
                          <Heart className="w-3.5 h-3.5 animate-bounce" />
                        </button>
                        {isMe && (
                          <>
                            <button
                              onClick={() => {
                                setEditingMessage(msg);
                                setInputText(msg.content);
                              }}
                              className="p-1 hover:bg-white/10 text-blue-400 rounded cursor-pointer"
                              title="Edit scroll"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteMessage(msg.id)}
                              className="p-1 hover:bg-red-500/10 text-red-400 rounded cursor-pointer"
                              title="Delete scroll"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Reactions Display */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {msg.reactions.map((react, i) => (
                          <div
                              key={i}
                              onClick={() => onAddReaction(msg.id, react.type)}
                              className="px-1.5 py-0.5 bg-[#00d9ff]/10 border border-[#00d9ff]/20 rounded-full text-[9px] font-mono text-[#00d9ff] flex items-center gap-1 cursor-pointer hover:border-[#00d9ff]"
                              title={`Reactions: ${react.users.map(u => u.username).join(', ')}`}
                          >
                            <span>
                              {react.type === 'congrats' && '🎉 Congratz'}
                              {react.type === 'critical' && '⚔️ Critical'}
                              {react.type === 'miss' && '❌ Miss'}
                              {react.type === 'poison' && '☣️ Poisoned'}
                              {react.type === 'paralyze' && '⚡ Paralyzed'}
                            </span>
                            <span className="font-bold text-[8px]">{react.users.length}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quick Reaction Tray (Hover Trigger) */}
                    <div className="opacity-0 group-hover/msg:opacity-100 flex items-center gap-1 mt-1 transition-opacity">
                      {(['congrats', 'critical', 'miss', 'poison', 'paralyze'] as const).map((rType) => (
                        <button
                          key={rType}
                          onClick={() => onAddReaction(msg.id, rType)}
                          className="px-1 py-0.5 bg-black/40 hover:bg-white/10 border border-[#00d9ff]/10 text-[#00d9ff]/70 hover:text-[#00d9ff] transition-colors cursor-pointer rounded"
                        >
                          {rType === 'congrats' && '🎉'}
                          {rType === 'critical' && '⚔️'}
                          {rType === 'miss' && '❌'}
                          {rType === 'poison' && '☣️'}
                          {rType === 'paralyze' && '⚡'}
                        </button>
                      ))}
                    </div>

                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Preview Header */}
        {replyingMessage && (
          <div className="px-4 py-2 bg-black/40 border-t border-[#00d9ff]/10 flex items-center justify-between relative z-10">
            <p className="text-[10px] text-[#00d9ff] font-sans">
              Replying to <span className="font-bold">@{replyingMessage.senderName}</span>: <span className="text-gray-400">{replyingMessage.content}</span>
            </p>
            <button
              onClick={() => setReplyingMessage(null)}
              className="p-1 hover:bg-white/10 text-[#00d9ff] rounded cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Live Typing indicators */}
        {typingUsers.length > 0 && (
          <div className="px-4 py-1.5 text-[9px] font-mono text-[#00d9ff]/80 bg-[#00d9ff]/5 flex items-center gap-1.5 relative z-10">
            <span className="w-1.5 h-1.5 bg-[#00d9ff] rounded-full animate-bounce" />
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} recording a new scroll...
          </div>
        )}

        {/* Input Bar Panel */}
        <form onSubmit={handleSend} className="p-3 bg-black/40 border-t border-[#00d9ff]/10 flex items-center gap-2 relative z-10">
          
          <button
            type="button"
            onClick={handleImageSend}
            className="p-2.5 bg-white/5 hover:bg-[#00d9ff]/10 border border-[#00d9ff]/20 text-[#00d9ff] hover:text-[#00e5ff] rounded-xl transition-colors cursor-pointer"
            title="Attach screenshot"
          >
            <Image className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={editingMessage ? "Modifying previous entry..." : "Compose a new message..."}
            className="flex-1 px-4 py-2.5 bg-black/40 border border-[#00d9ff]/20 rounded-xl text-xs text-[#c0d6df] placeholder-gray-600 focus:outline-none focus:border-[#00d9ff]"
            id="chat-input-text"
          />

          <button
            type="submit"
            className="p-2.5 bg-[#00d9ff] hover:bg-[#00e5ff] text-black rounded-xl transition-all shadow-[0_0_20px_rgba(0,217,255,0.3)] cursor-pointer hover:scale-[1.03] active:scale-95"
            id="btn-chat-send"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>

      {/* 3. Dialog: New Party Room creation overlay */}
      <AnimatePresence>
        {isNewRoomOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-black/90 border border-[#00d9ff]/30 rounded-2xl p-5 shadow-[0_0_40px_rgba(0,217,255,0.25)] relative font-sans"
            >
              <div className="flex items-center justify-between mb-4 border-b border-[#00d9ff]/10 pb-2">
                <span className="text-xs font-mono font-bold text-[#00d9ff] uppercase tracking-widest">
                  Form Party Chamber
                </span>
                <button onClick={() => setIsNewRoomOpen(false)} className="text-gray-500 hover:text-gray-300">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateRoomSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-[#00d9ff]/80 uppercase tracking-wider mb-1">
                    Chamber Floor Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Floor 47: Floria Town"
                    className="w-full px-3 py-2 bg-black/40 border border-[#00d9ff]/10 rounded-lg text-xs text-gray-200 focus:outline-none focus:border-[#00d9ff]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#00d9ff]/80 uppercase tracking-wider mb-1">
                    Chamber Description
                  </label>
                  <textarea
                    value={newRoomDesc}
                    onChange={(e) => setNewRoomDesc(e.target.value)}
                    placeholder="Brief objective details..."
                    className="w-full px-3 py-2 bg-black/40 border border-[#00d9ff]/10 rounded-lg text-xs text-gray-200 focus:outline-none focus:border-[#00d9ff] h-16 resize-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is-private"
                    checked={newRoomPrivate}
                    onChange={(e) => setNewRoomPrivate(e.target.checked)}
                    className="rounded border-[#00d9ff]/20 bg-black/40 text-[#00d9ff] focus:ring-0 focus:ring-offset-0"
                  />
                  <label htmlFor="is-private" className="text-[10px] font-mono text-[#00d9ff]/80 uppercase tracking-wider cursor-pointer">
                    Private Party Chamber
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-[#00d9ff] hover:bg-[#00e5ff] text-black font-sans font-bold uppercase tracking-widest text-[10px] rounded-lg shadow-md transition-all cursor-pointer"
                >
                  Initiate Link Start
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
