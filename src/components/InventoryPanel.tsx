/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Swords, Gift, ShieldAlert, Sparkles, X, Check, Heart, Trophy } from 'lucide-react';
import { InventoryItem, UserProfile } from '../types';

interface InventoryPanelProps {
  user: UserProfile;
  onUseItem: (itemId: string) => void;
  onEquipItem: (itemId: string) => void;
}

export default function InventoryPanel({ user, onUseItem, onEquipItem }: InventoryPanelProps) {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const getRarityColor = (rarity: InventoryItem['rarity']) => {
    switch (rarity) {
      case 'Legendary': return 'border-yellow-500/30 bg-yellow-500/5 text-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.1)]';
      case 'Unique': return 'border-purple-500/30 bg-purple-500/5 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.1)]';
      case 'Rare': return 'border-[#00d9ff]/30 bg-[#00d9ff]/5 text-[#00d9ff] shadow-[0_0_12px_rgba(0,217,255,0.1)]';
      default: return 'border-white/10 bg-white/5 text-gray-400';
    }
  };

  const getItemEmoji = (type: InventoryItem['type']) => {
    switch (type) {
      case 'weapon': return '⚔️';
      case 'potion': return '🧪';
      case 'crystal': return '💎';
      default: return '🏅';
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-black/40 border border-[#00d9ff]/20 rounded-2xl p-5 md:p-6 shadow-[0_0_40px_rgba(0,217,255,0.15)] font-sans relative overflow-hidden" id="sao-inventory-panel">
      {/* Laser Top Indicator */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00d9ff] to-transparent shadow-[0_0_8px_#00d9ff]" />

      <div className="flex items-center justify-between pb-3 border-b border-[#00d9ff]/10 mb-6">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-[#00d9ff] animate-pulse" />
          <span className="text-xs font-mono font-black text-[#00d9ff] tracking-wider uppercase">
            Storage Inventory ({user.inventory.length}/20)
          </span>
        </div>
        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest hidden sm:block">
          Select gear to inspect or equip
        </p>
      </div>

      {user.inventory.length === 0 ? (
        <div className="py-12 text-center">
          <Gift className="w-12 h-12 text-[#00d9ff]/20 mx-auto mb-2" />
          <p className="text-xs font-mono text-[#00d9ff]/40 uppercase tracking-widest">
            Storage vaults empty. Embark on floor quests to discover weaponry!
          </p>
        </div>
      ) : (
        /* Grid list of Inventory Items */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {user.inventory.map((item) => (
            <motion.div
              key={item.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedItem(item)}
              className={`p-3 rounded-2xl border flex flex-col justify-between h-32 cursor-pointer transition-all ${getRarityColor(item.rarity)}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{getItemEmoji(item.type)}</span>
                {item.equipped && (
                  <span className="text-[7px] font-mono font-black bg-[#00ff88] text-slate-950 px-1 py-0.5 rounded uppercase shadow-sm">
                    Equipped
                  </span>
                )}
              </div>

              <div className="mt-2 min-w-0">
                <p className="font-bold text-xs truncate text-gray-100">{item.name}</p>
                <p className="text-[8px] font-mono text-gray-500 uppercase tracking-wider mt-0.5">{item.rarity}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Dynamic Item Inspection Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-black/90 border border-[#00d9ff]/30 rounded-2xl p-5 shadow-[0_0_40px_rgba(0,217,255,0.25)] relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 p-1 rounded-full bg-white/5 hover:bg-white/10 text-[#00d9ff] hover:text-[#00e5ff] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Item Info layout */}
              <div className="text-center space-y-3 mb-6 mt-2">
                <div className="text-5xl animate-bounce">{getItemEmoji(selectedItem.type)}</div>
                <div>
                  <h3 className="text-lg font-black text-gray-100 uppercase tracking-wide">
                    {selectedItem.name}
                  </h3>
                  <span className="text-[9px] font-mono font-bold bg-white/5 border border-[#00d9ff]/20 px-2 py-0.5 rounded-full text-[#00d9ff] uppercase">
                    {selectedItem.rarity} {selectedItem.type}
                  </span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed px-2">
                  {selectedItem.description}
                </p>

                {selectedItem.stats && (
                  <div className="py-2.5 px-4 bg-black/40 border border-[#00d9ff]/10 rounded-xl font-mono text-xs text-[#00d9ff]">
                    Stats: {selectedItem.stats}
                  </div>
                )}
              </div>

              {/* Action Triggers */}
              <div className="space-y-2">
                {selectedItem.type === 'weapon' ? (
                  <button
                    onClick={() => {
                      onEquipItem(selectedItem.id);
                      setSelectedItem(null);
                    }}
                    className="w-full py-2.5 bg-[#00d9ff] hover:bg-[#00e5ff] text-black font-sans font-bold uppercase tracking-widest text-[10px] rounded-lg shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {selectedItem.equipped ? 'Unequip Weapon' : 'Equip Weapon'}
                  </button>
                ) : selectedItem.type === 'potion' ? (
                  <button
                    onClick={() => {
                      onUseItem(selectedItem.id);
                      setSelectedItem(null);
                    }}
                    className="w-full py-2.5 bg-[#00ff88] hover:bg-[#33ffaa] text-black font-sans font-bold uppercase tracking-widest text-[10px] rounded-lg shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Heart className="w-3.5 h-3.5 animate-pulse" />
                    Drink Potion (Restore HP)
                  </button>
                ) : null}

                <button
                  onClick={() => setSelectedItem(null)}
                  className="w-full py-2 border border-white/10 hover:bg-white/5 text-gray-400 rounded-lg text-[10px] font-sans uppercase tracking-widest cursor-pointer"
                >
                  Close Scroll
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
