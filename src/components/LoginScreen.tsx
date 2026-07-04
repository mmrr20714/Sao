/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Sparkles, User, Key, Swords, Compass, ShieldAlert } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (
    username: string, 
    isGuest: boolean, 
    password?: string, 
    isRegister?: boolean, 
    weaponClass?: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [selectedClass, setSelectedClass] = useState<'One-Handed Sword' | 'Rapier' | 'Dual Blades'>('One-Handed Sword');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    
    setError(null);
    setLoading(true);
    try {
      const res = await onLogin(username, false, password, isRegister, selectedClass);
      if (!res.success && res.error) {
        setError(res.error);
      }
    } catch (err) {
      setError("NerveGear telemetry connection timed out.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestStart = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await onLogin('', true);
      if (!res.success && res.error) {
        setError(res.error);
      }
    } catch (err) {
      setError("NerveGear guest initiation timed out.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen sophisticated-dark-bg text-[#c0d6df] flex flex-col items-center justify-center p-4 overflow-hidden font-sans">
      {/* Animated Hexagonal Background Grids */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg width="100%" height="100%" className="text-[#00d9ff]">
          <defs>
            <pattern id="hex-pattern" width="56" height="97" patternUnits="userSpaceOnUse" patternTransform="scale(1)">
              <path d="M28 0 L56 16 L56 48 L28 64 L0 48 L0 16 Z M28 97 L56 81 L56 49 L28 33 L0 49 L0 81 Z" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hex-pattern)" />
        </svg>
      </div>

      {/* Cybernetic Glowing Circles in background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00d9ff]/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00ff88]/5 rounded-full blur-3xl pointer-events-none animate-pulse" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-black/40 border border-[#00d9ff]/20 rounded-2xl p-6 md:p-8 shadow-[0_0_40px_rgba(0,217,255,0.15)] relative z-10 backdrop-blur-md"
        id="sao-login-card"
      >
        {/* Holographic Border Flare */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00d9ff] to-transparent shadow-[0_0_10px_#00d9ff]" />

        {/* Brand Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ rotate: -10 }}
            animate={{ rotate: 0 }}
            className="inline-block p-3 bg-[#00d9ff]/10 border border-[#00d9ff]/30 rounded-xl mb-3 shadow-[0_0_15px_rgba(0,217,255,0.2)]"
          >
            <Swords className="w-10 h-10 text-[#00d9ff] animate-pulse" />
          </motion.div>
          <h1 className="text-3xl font-sans font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-[#00d9ff]">
            AINCRAD GRID
          </h1>
          <p className="text-xs font-mono text-[#00d9ff]/70 mt-1 uppercase tracking-widest">
            VRMMORPG Communication Network
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#00d9ff]/10 mb-6">
          <button
            onClick={() => setIsRegister(false)}
            className={`flex-1 pb-2 text-sm font-sans font-medium tracking-wide uppercase transition-all duration-300 ${
              !isRegister ? 'text-[#00d9ff] border-b-2 border-[#00d9ff] shadow-[0_4px_10px_-4px_rgba(0,217,255,0.3)]' : 'text-gray-500 hover:text-gray-300'
            }`}
            id="tab-login"
          >
            Link Start
          </button>
          <button
            onClick={() => setIsRegister(true)}
            className={`flex-1 pb-2 text-sm font-sans font-medium tracking-wide uppercase transition-all duration-300 ${
              isRegister ? 'text-[#00d9ff] border-b-2 border-[#00d9ff] shadow-[0_4px_10px_-4px_rgba(0,229,255,0.3)]' : 'text-gray-500 hover:text-gray-300'
            }`}
            id="tab-register"
          >
            Register Profile
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-3 bg-red-950/40 border border-red-500/30 text-red-400 rounded-xl text-xs font-mono flex items-center gap-2"
          >
            <ShieldAlert className="w-4.5 h-4.5 shrink-0 animate-pulse" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-[#00d9ff]/80 uppercase tracking-wider mb-1">
              Player Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00d9ff]/60" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter player moniker..."
                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-[#00d9ff]/20 rounded-lg text-sm text-[#c0d6df] placeholder-gray-600 focus:outline-none focus:border-[#00d9ff] focus:shadow-[0_0_10px_rgba(0,217,255,0.1)] transition-all"
                id="login-username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#00d9ff]/80 uppercase tracking-wider mb-1">
              Access Code
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00d9ff]/60" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-[#00d9ff]/20 rounded-lg text-sm text-[#c0d6df] placeholder-gray-600 focus:outline-none focus:border-[#00d9ff] focus:shadow-[0_0_10px_rgba(0,217,255,0.1)] transition-all"
                id="login-password"
              />
            </div>
          </div>

          {isRegister && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3"
            >
              <label className="block text-xs font-mono text-[#00d9ff]/80 uppercase tracking-wider">
                Combat Weapon Class
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['One-Handed Sword', 'Rapier', 'Dual Blades'] as const).map((wClass) => (
                  <button
                    key={wClass}
                    type="button"
                    onClick={() => setSelectedClass(wClass)}
                    className={`p-2.5 rounded-lg border text-xs font-sans text-center flex flex-col items-center justify-center transition-all ${
                      selectedClass === wClass
                        ? 'border-[#00d9ff] bg-[#00d9ff]/10 text-[#00d9ff] shadow-[0_0_8px_rgba(0,229,255,0.15)]'
                        : 'border-[#00d9ff]/10 bg-black/40 text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <Shield className="w-4 h-4 mb-1 text-[#00d9ff]/70" />
                    <span className="scale-90 font-medium">{wClass}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-[#00d9ff] hover:bg-[#00e5ff] text-black font-sans font-bold uppercase tracking-widest text-sm rounded-lg shadow-[0_0_20px_rgba(0,217,255,0.4)] hover:shadow-[0_0_25px_rgba(0,217,255,0.6)] hover:scale-[1.01] transition-all cursor-pointer duration-300 flex items-center justify-center gap-2"
              id="btn-link-start"
            >
              <Sparkles className="w-4 h-4 animate-spin" />
              Link Start
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-x-0 top-1/2 h-[1px] bg-[#00d9ff]/10" />
          <span className="relative px-3 bg-black/80 rounded text-[10px] font-mono text-[#00d9ff]/40 uppercase tracking-widest">
            or activate guest terminal
          </span>
        </div>

        {/* Guest Mode Trigger */}
        <button
          onClick={handleGuestStart}
          className="w-full py-2.5 border border-[#ff9900]/30 hover:border-[#ff9900]/60 bg-[#ff9900]/5 hover:bg-[#ff9900]/10 text-[#ff9900] font-sans font-bold uppercase tracking-wider text-xs rounded-lg transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
          id="btn-guest-login"
        >
          <Compass className="w-4 h-4 animate-spin-slow" />
          Enter as Guest Player
        </button>

        {/* Decorative Footer info */}
        <div className="text-center mt-6 flex items-center justify-center gap-1.5 font-mono text-[9px] text-[#00d9ff]/30 uppercase tracking-wider">
          <Shield className="w-3 h-3" />
          Secure Node Connection Enabled
        </div>
      </motion.div>
    </div>
  );
}
