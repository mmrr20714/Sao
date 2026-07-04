/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, MessageSquare, Shield, Swords, Compass, Trophy, LogOut, X, Volume2 } from 'lucide-react';
import { UserProfile } from '../types';

interface SAOMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activePanel: string;
  onChangePanel: (panel: string) => void;
  user: UserProfile;
  onLogout: () => void;
}

export default function SAOMenu({ isOpen, onClose, activePanel, onChangePanel, user, onLogout }: SAOMenuProps) {
  
  const menuItems = [
    { id: 'profile', label: 'User Profile', icon: User, color: 'text-cyan-400' },
    { id: 'chat', label: 'Chat Floor', icon: MessageSquare, color: 'text-blue-400' },
    { id: 'guild', label: 'Guild Alliance', icon: Shield, color: 'text-indigo-400' },
    { id: 'inventory', label: 'Inventory', icon: Swords, color: 'text-amber-500' },
    { id: 'quests', label: 'Quest Board', icon: Compass, color: 'text-orange-400' },
    { id: 'voice', label: 'Voice Chambers', icon: Volume2, color: 'text-green-400' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Translucent overlay background */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm cursor-pointer"
          />

          {/* Holographic Interactive System Menu Panel */}
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            className="fixed left-4 top-20 bottom-4 w-72 bg-black/90 border border-[#00d9ff]/20 rounded-2xl p-5 shadow-[0_0_40px_rgba(0,217,255,0.25)] z-50 flex flex-col justify-between font-sans overflow-hidden"
            id="sao-hologram-menu"
          >
            {/* Top Border Glow Flare */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00d9ff] to-transparent shadow-[0_0_8px_#00d9ff]" />

            {/* Menu Header */}
            <div>
              <div className="flex items-center justify-between mb-6 border-b border-[#00d9ff]/10 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#00d9ff] animate-pulse" />
                  <span className="text-xs font-mono font-black text-[#00d9ff] tracking-widest uppercase">
                    SAO System Menu
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full bg-[#00d9ff]/10 hover:bg-[#00d9ff]/20 text-[#00d9ff] hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Minimal Player Stats Summary */}
              <div className="p-3 bg-[#00d9ff]/5 border border-[#00d9ff]/20 rounded-xl mb-5">
                <div className="flex items-center gap-2">
                  <div className="text-2xl">{user.avatar}</div>
                  <div>
                    <h3 className="text-xs font-sans font-bold text-gray-100">{user.username}</h3>
                    <p className="text-[10px] font-mono text-[#00d9ff]">Level {user.level} {user.status}</p>
                  </div>
                </div>
              </div>

              {/* Hexagonal Menu Grid List */}
              <div className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePanel === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onChangePanel(item.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-sans font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        isActive
                          ? 'border-[#00d9ff] bg-[#00d9ff]/10 text-[#00d9ff] shadow-[0_0_15px_rgba(0,217,255,0.15)]'
                          : 'border-[#00d9ff]/10 bg-black/40 text-gray-400 hover:text-gray-100 hover:border-[#00d9ff]/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-[#00d9ff] animate-bounce' : 'text-gray-400'} ${isActive ? '' : ''}`} />
                        <span>{item.label}</span>
                      </div>
                      <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#00d9ff] shadow-[0_0_6px_#00d9ff]' : 'bg-transparent'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Logout Panel Footer */}
            <div className="border-t border-[#00d9ff]/10 pt-4">
              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-full py-2.5 bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 hover:border-red-500/50 text-red-400 hover:text-red-300 rounded-xl text-xs font-sans font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
              >
                <LogOut className="w-3.5 h-3.5" />
                Disconnect NerveGear
              </button>
              <p className="text-center text-[8px] font-mono text-cyan-600/30 uppercase mt-3 tracking-widest">
                System: Cardinal Engine v1.0.3
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
