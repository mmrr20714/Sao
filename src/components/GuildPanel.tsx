/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Users, Bell, Award, Plus, Swords, ChevronRight, X, Sparkles } from 'lucide-react';
import { Guild, UserProfile, GuildAnnouncement } from '../types';

interface GuildPanelProps {
  user: UserProfile;
  guild: Guild | null;
  allGuilds: Guild[];
  onCreateGuild: (name: string, crest: string) => void;
  onJoinGuild: (guildId: string) => void;
  onLeaveGuild: () => void;
  onPostAnnouncement: (content: string) => void;
}

export default function GuildPanel({
  user,
  guild,
  allGuilds,
  onCreateGuild,
  onJoinGuild,
  onLeaveGuild,
  onPostAnnouncement
}: GuildPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [guildName, setGuildName] = useState('');
  const [selectedCrest, setSelectedCrest] = useState('text-cyan-400 border-cyan-400');
  const [announcementText, setAnnouncementText] = useState('');

  const crestOptions = [
    { class: 'text-[#00d9ff] border-[#00d9ff] bg-[#00d9ff]/10', name: 'Knight Cyan' },
    { class: 'text-[#ff3333] border-[#ff3333] bg-red-950/20', name: 'Blood Red' },
    { class: 'text-[#ff9900] border-[#ff9900] bg-orange-950/20', name: 'Fuurinkazan Gold' },
    { class: 'text-purple-400 border-purple-400 bg-purple-950/20', name: 'Laughing Coffin' },
    { class: 'text-[#00ff88] border-[#00ff88] bg-[#00ff88]/5', name: 'Sylph Emerald' },
  ];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guildName.trim()) return;
    onCreateGuild(guildName, selectedCrest);
    setGuildName('');
    setIsCreating(false);
  };

  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;
    onPostAnnouncement(announcementText);
    setAnnouncementText('');
  };

  return (
    <div className="max-w-4xl mx-auto bg-black/40 border border-[#00d9ff]/20 rounded-2xl p-5 md:p-6 shadow-[0_0_40px_rgba(0,217,255,0.15)] font-sans relative overflow-hidden" id="sao-guild-panel">
      {/* Decorative lasers */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00d9ff] to-transparent shadow-[0_0_8px_#00d9ff]" />

      <AnimatePresence mode="wait">
        {guild ? (
          /* ================= ACTIVE GUILD VIEW ================= */
          <motion.div
            key="guild-active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Guild Crest & Info Card */}
            <div className="p-5 bg-black/40 border border-[#00d9ff]/20 rounded-2xl flex flex-col sm:flex-row items-center gap-4 relative">
              <div className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center text-3xl shadow-[0_0_15px_rgba(0,217,255,0.15)] shrink-0 ${guild.crest}`}>
                🛡️
              </div>
              <div className="text-center sm:text-left flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h2 className="text-2xl font-black text-gray-100 uppercase tracking-wide">
                    {guild.name}
                  </h2>
                  <span className="text-[10px] font-mono font-black bg-[#00d9ff] text-slate-950 px-2 py-0.5 rounded-full uppercase self-center sm:self-start">
                    LEVEL {guild.level}
                  </span>
                </div>
                <p className="text-xs text-[#00d9ff]/80 font-mono mt-1">
                  Guild Leader: <span className="text-white font-bold">{guild.leaderName}</span>
                </p>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                  Alliance Formed: {new Date(guild.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={onLeaveGuild}
                className="px-4 py-2 bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 text-red-400 hover:text-red-300 rounded-xl text-xs font-mono font-bold uppercase cursor-pointer"
              >
                Leave Guild
              </button>
            </div>

            {/* Guild Grid Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: Announcements */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-[#00d9ff]/10">
                  <Bell className="w-4 h-4 text-[#ff9900] animate-pulse" />
                  <span className="text-xs font-mono font-black uppercase text-gray-200">
                    Guild announcements
                  </span>
                </div>

                {/* Announcement log */}
                <div className="space-y-3 max-h-[260px] overflow-y-auto">
                  {guild.announcements.length === 0 ? (
                    <p className="text-xs font-mono text-gray-600 italic">No scrolls published recently.</p>
                  ) : (
                    guild.announcements.slice().reverse().map((ann) => (
                      <div key={ann.id} className="p-3 bg-black/40 border border-[#00d9ff]/10 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-[#00d9ff] font-bold">📢 @{ann.authorName}</span>
                          <span className="text-gray-600">{new Date(ann.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-gray-200 leading-relaxed">{ann.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Announcement Input (Leader & Officers only) */}
                {['leader', 'officer'].includes(user.guildRole || '') && (
                  <form onSubmit={handlePostAnnouncement} className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={announcementText}
                      onChange={(e) => setAnnouncementText(e.target.value)}
                      placeholder="Post alliance directive..."
                      className="flex-1 px-3 py-2 bg-black/40 border border-[#00d9ff]/10 rounded-xl text-xs text-[#c0d6df] placeholder-gray-600 focus:outline-none focus:border-[#00d9ff]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#00d9ff] hover:bg-[#00e5ff] text-black font-sans font-bold uppercase text-xs rounded-xl shadow-md transition-all cursor-pointer shrink-0"
                    >
                      Post
                    </button>
                  </form>
                )}
              </div>

              {/* Right Column: Alliance Members Roster */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-[#00d9ff]/10">
                  <Users className="w-4 h-4 text-[#00d9ff]" />
                  <span className="text-xs font-mono font-black uppercase text-gray-200">
                    Alliance Roster
                  </span>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {/* Dynamic simulated alliance roster */}
                  <div className="flex items-center justify-between p-2.5 bg-black/40 border border-[#00d9ff]/10 rounded-xl text-xs font-sans">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🛡️</span>
                      <div>
                        <p className="font-bold">{guild.leaderName}</p>
                        <p className="text-[10px] text-[#ff9900] font-mono">Guild Leader</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#00d9ff] font-bold">LV.45</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-white/5 border border-transparent rounded-xl text-xs font-sans">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⚔️</span>
                      <div>
                        <p className="font-bold">{user.username}</p>
                        <p className="text-[10px] text-[#00d9ff] font-mono capitalize">{user.guildRole || 'member'}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#00d9ff] font-bold">LV.{user.level}</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-white/5 border border-transparent rounded-xl text-xs font-sans opacity-60">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🧙‍♀️</span>
                      <div>
                        <p className="font-bold">Asuna_KoB</p>
                        <p className="text-[10px] text-gray-500 font-mono">Officer</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#00d9ff] font-bold">LV.39</span>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        ) : (
          /* ================= GUILD HUB / DISCOVERY VIEW ================= */
          <motion.div
            key="guild-discovery"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="text-center max-w-md mx-auto mb-6">
              <Shield className="w-12 h-12 text-[#00d9ff] mx-auto mb-2 animate-bounce" />
              <h2 className="text-xl font-bold text-gray-100 uppercase tracking-wide">
                Guild Alliances Hub
              </h2>
              <p className="text-xs text-gray-500 font-sans mt-1">
                Establish or seek an Alliance in the Aincrad Grid to access private guild scrolls, joint combat bonuses, and tactical rooms!
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex justify-center">
              <button
                onClick={() => setIsCreating(true)}
                className="px-6 py-3 bg-[#00d9ff] hover:bg-[#00e5ff] text-black font-sans font-bold uppercase tracking-widest text-xs rounded-xl shadow-[0_0_20px_rgba(0,217,255,0.3)] hover:scale-[1.02] transition-all cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Found New Guild Alliance
              </button>
            </div>

            {/* Guild Directory */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold text-[#00d9ff] uppercase tracking-widest">
                Active Alliances In Region ({allGuilds.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allGuilds.map((g) => (
                  <div
                    key={g.id}
                    className="p-4 bg-black/40 border border-[#00d9ff]/10 hover:border-[#00d9ff]/30 rounded-2xl flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl shrink-0 ${g.crest}`}>
                        🛡️
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-gray-200">{g.name}</h4>
                        <p className="text-[10px] font-mono text-[#00d9ff]">Leader: {g.leaderName}</p>
                        <p className="text-[9px] font-mono text-gray-600">Level {g.level} • {g.announcements.length} announcements</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onJoinGuild(g.id)}
                      className="px-3 py-1.5 bg-[#00d9ff]/10 hover:bg-[#00d9ff]/20 border border-[#00d9ff]/30 text-[#00d9ff] hover:text-[#00e5ff] text-[10px] font-mono font-bold uppercase rounded-lg cursor-pointer"
                    >
                      Join Alliance
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Dialog: Found Guild Alliance Dialog */}
            <AnimatePresence>
              {isCreating && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="w-full max-w-sm bg-black/90 border border-[#00d9ff]/30 rounded-2xl p-5 shadow-[0_0_40px_rgba(0,217,255,0.25)] relative"
                  >
                    <div className="flex items-center justify-between mb-4 border-b border-[#00d9ff]/10 pb-2">
                      <span className="text-xs font-mono font-bold text-[#00d9ff] uppercase tracking-widest flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 animate-spin-slow text-[#ff9900]" />
                        Found New Alliance
                      </span>
                      <button onClick={() => setIsCreating(false)} className="text-gray-500 hover:text-gray-300">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleCreateSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-mono text-[#00d9ff]/80 uppercase tracking-wider mb-1">
                          Alliance Name
                        </label>
                        <input
                          type="text"
                          required
                          value={guildName}
                          onChange={(e) => setGuildName(e.target.value)}
                          placeholder="e.g., Fuurinkazan"
                          className="w-full px-3 py-2 bg-black/40 border border-[#00d9ff]/10 rounded-lg text-xs text-gray-200 focus:outline-none focus:border-[#00d9ff]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-[#00d9ff]/80 uppercase tracking-wider mb-2">
                          Select Alliance Colors
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {crestOptions.map((opt) => (
                            <button
                              key={opt.class}
                              type="button"
                              onClick={() => setSelectedCrest(opt.class)}
                              className={`p-2 rounded-lg border text-[10px] font-mono flex items-center gap-1.5 transition-all ${
                                selectedCrest === opt.class
                                  ? 'border-[#00d9ff] bg-[#00d9ff]/10 text-[#00d9ff] shadow-md'
                                  : 'border-[#00d9ff]/10 bg-black/40 text-gray-500 hover:text-gray-300'
                              }`}
                            >
                              <span className="text-xs">🛡️</span>
                              <span className="truncate">{opt.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-[#00d9ff] hover:bg-[#00e5ff] text-black font-sans font-bold uppercase tracking-widest text-[10px] rounded-lg shadow-md transition-all cursor-pointer"
                      >
                        Form Guild Alliance
                      </button>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
