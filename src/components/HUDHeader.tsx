/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Shield, Trophy, Activity, Swords, Users, HelpCircle, Compass } from 'lucide-react';
import { UserProfile } from '../types';

interface HUDHeaderProps {
  user: UserProfile;
  activeQuestCount: number;
  onOpenMenu: () => void;
  onHeal: () => void;
}

export default function HUDHeader({ user, activeQuestCount, onOpenMenu, onHeal }: HUDHeaderProps) {
  const hpPercentage = Math.round((user.hp / user.maxHp) * 100);
  const expPercentage = Math.round((user.exp / (user.level * 100)) * 100);

  // Determine HP bar color (Green for high, Yellow for medium, Red for low)
  const getHpColor = () => {
    if (hpPercentage > 50) return 'bg-[#00ff66] shadow-[0_0_10px_#00ff66]';
    if (hpPercentage > 20) return 'bg-[#ffcc00] shadow-[0_0_10px_#ffcc00]';
    return 'bg-[#ff3333] shadow-[0_0_10px_#ff3333] animate-pulse';
  };

  return (
    <div className="w-full bg-black/40 border-b border-[#00d9ff]/20 px-6 py-3 sticky top-0 z-40 backdrop-blur-md relative font-sans" id="sao-hud-header">
      {/* Laser horizontal guide line under header */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00d9ff]/30 to-transparent" />

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Left Side: Avatar, Name, Level and HP/EXP Gauges */}
        <div className="flex items-center gap-3">
          {/* Hexagonal Interactive Avatar Frame */}
          <div className="relative group cursor-pointer" onClick={onOpenMenu} id="avatar-hex">
            <div className="w-12 h-12 bg-[#00d9ff]/10 border-2 border-[#00d9ff] rounded-lg flex items-center justify-center relative overflow-hidden group-hover:border-cyan-300 transition-colors shadow-[0_0_25px_rgba(0,217,255,0.2)]">
              <span className="text-xl">{user.avatar}</span>
              {/* Online Indicator */}
              <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-[#00ff88] border border-black rounded-full shadow-[0_0_6px_#00ff88]" />
            </div>
            {/* Level Badge Overlay */}
            <div className="absolute -top-1.5 -right-1.5 bg-[#00d9ff] text-slate-950 text-[9px] font-mono font-black px-1.5 py-0.5 rounded-full border border-slate-950 shadow-md">
              LV.{user.level}
            </div>
          </div>

          {/* Name & HP Progress Bars */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-sm font-sans font-bold text-gray-100 truncate hover:text-[#00d9ff] cursor-pointer" onClick={onOpenMenu}>
                {user.username}
              </h2>
              {user.guildId && (
                <span className="text-[10px] font-mono font-bold text-[#00d9ff] uppercase tracking-widest bg-[#00d9ff]/10 border border-[#00d9ff]/20 px-1.5 py-0.5 rounded">
                  🛡️ Guild Player
                </span>
              )}
            </div>

            {/* HP Bar */}
            <div className="flex items-center gap-2 w-64 md:w-72 lg:w-80">
              <span className="text-[10px] font-mono font-bold text-[#00ff88] w-5">HP</span>
              <div className="flex-1 h-3 bg-black/40 border border-[#00d9ff]/10 rounded-sm overflow-hidden relative p-[1px] cursor-pointer" onClick={onHeal} title="Click to use Potion and Heal!">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${hpPercentage}%` }}
                  transition={{ duration: 0.4 }}
                  className={`h-full rounded-sm ${getHpColor()}`}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono font-black text-white mix-blend-difference">
                  {user.hp} / {user.maxHp}
                </span>
              </div>
            </div>

            {/* EXP Bar */}
            <div className="flex items-center gap-2 w-64 md:w-72 lg:w-80 mt-1">
              <span className="text-[10px] font-mono font-bold text-[#00d9ff] w-5">EXP</span>
              <div className="flex-1 h-2 bg-black/40 border border-[#00d9ff]/10 rounded-sm overflow-hidden relative p-[1px]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${expPercentage}%` }}
                  transition={{ duration: 0.4 }}
                  className="h-full bg-[#00d9ff] shadow-[0_0_5px_#00d9ff]"
                />
                <span className="absolute inset-0 flex items-center justify-center text-[7px] font-mono font-black text-[#c0d6df] mix-blend-difference">
                  {expPercentage}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Navigation Badges, Stats & Interactive Menu Trigger */}
        <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto border-t border-[#00d9ff]/10 pt-2.5 md:pt-0 md:border-t-0">
          
          {/* Quick HUD Metrics */}
          <div className="flex items-center gap-4">
            {/* Active Quests Widget */}
            <div className="flex flex-col items-start font-sans">
              <span className="text-[9px] font-mono uppercase tracking-wider text-gray-500">Active Quests</span>
              <span className="text-xs font-mono font-bold text-[#ff9900] flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 animate-spin-slow" />
                {activeQuestCount} Quests
              </span>
            </div>

            {/* Inventory Status */}
            <div className="flex flex-col items-start font-sans">
              <span className="text-[9px] font-mono uppercase tracking-wider text-gray-500">Equipment</span>
              <span className="text-xs font-mono font-bold text-[#00d9ff] flex items-center gap-1">
                <Swords className="w-3.5 h-3.5" />
                {user.inventory.filter(item => item.equipped).length} Equipped
              </span>
            </div>
          </div>

          {/* Holographic System Menu Button */}
          <button
            onClick={onOpenMenu}
            className="px-4 py-2 bg-[#00d9ff]/10 hover:bg-[#00d9ff]/20 border border-[#00d9ff]/30 hover:border-cyan-300 text-[#00d9ff] hover:text-cyan-300 rounded-lg text-xs font-sans font-black uppercase tracking-widest shadow-[0_0_15px_rgba(0,217,255,0.15)] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            id="btn-hud-menu"
          >
            <Shield className="w-4 h-4 animate-pulse" />
            Menu Panel
          </button>
        </div>

      </div>
    </div>
  );
}
