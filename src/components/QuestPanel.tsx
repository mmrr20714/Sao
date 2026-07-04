/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Compass, Trophy, Star, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { Quest, UserProfile } from '../types';

interface QuestPanelProps {
  user: UserProfile;
  onClaimReward: (questId: string) => void;
}

export default function QuestPanel({ user, onClaimReward }: QuestPanelProps) {
  
  const getProgressPercent = (quest: Quest) => {
    return Math.min(100, Math.round((quest.current / quest.target) * 100));
  };

  return (
    <div className="max-w-4xl mx-auto bg-black/40 border border-[#00d9ff]/20 rounded-2xl p-5 md:p-6 shadow-[0_0_40px_rgba(0,217,255,0.15)] font-sans relative overflow-hidden" id="sao-quest-panel">
      {/* Decorative lasers */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00d9ff] to-transparent shadow-[0_0_8px_#00d9ff]" />

      <div className="flex items-center justify-between pb-3 border-b border-[#00d9ff]/10 mb-6">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-[#ff9900] animate-spin-slow" />
          <span className="text-xs font-mono font-black text-[#ff9900] tracking-wider uppercase">
            Aincrad Active Quests Board
          </span>
        </div>
        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest hidden sm:block">
          Fulfill daily objectives to acquire EXPs & Loot
        </p>
      </div>

      {user.quests.length === 0 ? (
        <div className="py-12 text-center">
          <CheckCircle className="w-12 h-12 text-[#00ff88]/30 mx-auto mb-2 animate-bounce" />
          <p className="text-xs font-mono text-[#00ff88]/50 uppercase tracking-widest">
            All floor mandates cleared! Daily Cardinal refresh pending...
          </p>
        </div>
      ) : (
        /* Quest lists */
        <div className="space-y-4">
          {user.quests.map((quest) => {
            const isCompleted = quest.current >= quest.target;
            const progressPct = getProgressPercent(quest);

            return (
              <div
                key={quest.id}
                className={`p-4 rounded-2xl border transition-all ${
                  quest.claimed
                    ? 'border-gray-950/20 bg-gray-950/10 opacity-50'
                    : isCompleted
                    ? 'border-[#00ff88]/30 bg-[#00ff88]/5 shadow-[0_0_15px_rgba(0,255,136,0.05)]'
                    : 'border-white/10 bg-black/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Quest Title & Description */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-bold text-sm ${quest.claimed ? 'line-through text-gray-500' : 'text-gray-100'}`}>
                        {quest.title}
                      </h3>
                      {quest.claimed ? (
                        <span className="text-[8px] font-mono font-bold bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded uppercase">
                          Claimed
                        </span>
                      ) : isCompleted ? (
                        <span className="text-[8px] font-mono font-black bg-[#00ff88] text-slate-950 px-1.5 py-0.5 rounded uppercase animate-pulse">
                          Complete
                        </span>
                      ) : (
                        <span className="text-[8px] font-mono font-bold bg-[#00d9ff]/10 border border-[#00d9ff]/30 text-[#00d9ff] px-1.5 py-0.5 rounded uppercase">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{quest.description}</p>
                  </div>

                  {/* Rewards Box */}
                  <div className="flex items-center gap-4 shrink-0 bg-black/40 border border-[#00d9ff]/10 p-2.5 rounded-xl">
                    <div className="text-center">
                      <p className="text-[8px] font-mono text-[#00d9ff] uppercase">EXP Reward</p>
                      <p className="text-xs font-mono font-bold text-[#00d9ff]">+{quest.expReward}</p>
                    </div>
                    {quest.itemReward && (
                      <div className="text-center border-l border-[#00d9ff]/10 pl-4">
                        <p className="text-[8px] font-mono text-[#ff9900] uppercase">Loot Drop</p>
                        <p className="text-xs font-mono font-bold text-[#ff9900]">{quest.itemReward.name}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Indicators & Action Button */}
                {!quest.claimed && (
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Progress Bar */}
                    <div className="flex-1 flex items-center gap-3">
                      <span className="text-[10px] font-mono text-gray-500">{quest.current}/{quest.target}</span>
                      <div className="flex-1 h-2 bg-black/40 border border-[#00d9ff]/10 rounded-sm overflow-hidden relative p-[1px]">
                        <div
                          className={`h-full rounded-sm ${isCompleted ? 'bg-[#00ff88] shadow-[0_0_6px_#00ff88]' : 'bg-[#ff9900] shadow-[0_0_6px_#ff9900]'}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-gray-400">{progressPct}%</span>
                    </div>

                    {/* Action Trigger */}
                    {isCompleted && (
                      <button
                        onClick={() => onClaimReward(quest.id)}
                        className="px-4 py-2 bg-[#00ff88] hover:bg-[#33ffaa] text-black font-sans font-bold uppercase tracking-widest text-[10px] rounded-lg shadow-[0_0_20px_rgba(0,255,136,0.3)] hover:scale-[1.03] transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Claim Rewards
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
