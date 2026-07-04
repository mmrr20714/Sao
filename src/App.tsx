/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { UserProfile, ChatRoom, Message, Guild, ActiveVoiceCall, InventoryItem, Quest } from './types';

// Importing Custom SAO components
import LoginScreen from './components/LoginScreen';
import HUDHeader from './components/HUDHeader';
import SAOMenu from './components/SAOMenu';
import ChatPanel from './components/ChatPanel';
import GuildPanel from './components/GuildPanel';
import InventoryPanel from './components/InventoryPanel';
import QuestPanel from './components/QuestPanel';
import VoiceChamberPanel from './components/VoiceChamberPanel';

// REST API Request Helper
const apiFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('sao_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };
  const response = await fetch(url, { ...options, headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Server connection issue');
  }
  return data;
};

export default function App() {
  // App States
  const [user, setUser] = useState<UserProfile | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<string>('chat');
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string>('town-of-beginnings');
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [allGuilds, setAllGuilds] = useState<Guild[]>([]);
  const [activeGuild, setActiveGuild] = useState<Guild | null>(null);
  const [currentChamber, setCurrentChamber] = useState<ActiveVoiceCall | null>(null);

  // Floating notifications/alerts (Aincrad event feeds)
  const [saoNotification, setSaoNotification] = useState<{ text: string; rarity: string } | null>(null);
  const [levelUpAlert, setLevelUpAlert] = useState<boolean>(false);

  // Connect to Socket Server on link start
  const connectSocket = (username: string, token: string) => {
    const newSocket = io({
      transports: ['websocket', 'polling'],
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log("[Cardinal Socket] Linked Start:", newSocket.id);
      newSocket.emit('join-room', activeRoomId);
    });

    // Listen to real-time chat messages
    newSocket.on('message-received', ({ roomId, message }: { roomId: string; message: Message }) => {
      setMessages(prev => {
        // Prevent duplicates
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    newSocket.on('message-edited', ({ roomId, messageId, content }: { roomId: string; messageId: string; content: string }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content } : m));
    });

    newSocket.on('message-deleted', ({ roomId, messageId }: { roomId: string; messageId: string }) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    });

    newSocket.on('reaction-updated', ({ roomId, messageId, reactions }: { roomId: string; messageId: string; reactions: any[] }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
    });

    // Listen to typing indicators
    newSocket.on('typing-update', ({ roomId, typing }: { roomId: string; typing: string[] }) => {
      setTypingUsers(typing.filter(u => u !== username));
    });

    // Listen to tactical voice chamber shifts
    newSocket.on('chamber-updated', (chamber: ActiveVoiceCall) => {
      setCurrentChamber(chamber);
    });

    // Listen to global server game events
    newSocket.on('sao-world-event', (event: { text: string; rarity: string }) => {
      setSaoNotification(event);
      setTimeout(() => {
        setSaoNotification(null);
      }, 7000);
    });

    // Listen to other players' profile updates
    newSocket.on('player-profile-updated', (updatedProfile: UserProfile) => {
      setUser(currentUser => {
        if (currentUser && updatedProfile.uid === currentUser.uid) {
          return updatedProfile;
        }
        return currentUser;
      });
    });

    // Listen to global guild list updates
    newSocket.on('guilds-updated', ({ guilds }: { guilds: Guild[] }) => {
      setAllGuilds(guilds);
    });

    newSocket.on('guild-updated', (updatedGuild: Guild) => {
      setAllGuilds(prev => prev.map(g => g.id === updatedGuild.id ? updatedGuild : g));
    });

    setSocket(newSocket);
  };

  // Load initial rooms, guilds, and auto-login if token exists
  useEffect(() => {
    const initApp = async () => {
      const token = localStorage.getItem('sao_token');
      if (token) {
        try {
          const { user: userProfile } = await apiFetch('/api/auth/me');
          setUser(userProfile);
          connectSocket(userProfile.username, token);
        } catch (err) {
          console.warn("[Cardinal] Invalid session token, resetting.");
          localStorage.removeItem('sao_token');
        }
      }

      try {
        const roomsList = await apiFetch('/api/rooms');
        setRooms(roomsList);

        const guildsList = await apiFetch('/api/guilds');
        setAllGuilds(guildsList);
      } catch (err) {
        console.error("[Cardinal] Failed to retrieve world nodes:", err);
      }
    };

    initApp();
  }, []);

  // Keep activeGuild in sync with user.guildId and allGuilds
  useEffect(() => {
    if (user && user.guildId) {
      const g = allGuilds.find(guildItem => guildItem.id === user.guildId);
      if (g) {
        setActiveGuild(g);
      }
    } else {
      setActiveGuild(null);
    }
  }, [user, allGuilds]);

  // Load room messages on shift
  useEffect(() => {
    const fetchRoomMessages = async () => {
      if (!user || !activeRoomId) return;
      try {
        const list = await apiFetch(`/api/rooms/${activeRoomId}/messages`);
        setMessages(list);
      } catch (err) {
        console.error("[Cardinal] Failed to retrieve message scrolls:", err);
      }
    };

    fetchRoomMessages();

    if (socket) {
      socket.emit('leave-room', activeRoomId);
      socket.emit('join-room', activeRoomId);
    }
    setTypingUsers([]);
  }, [activeRoomId, user, socket]);

  // Sync user profile with the server (persisted to the local JSON database)
  const syncUserProfile = async (profile: UserProfile) => {
    setUser(profile);
    try {
      const { user: updatedProfile } = await apiFetch('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify(profile)
      });
      setUser(updatedProfile);
    } catch (error) {
      console.warn("NerveGear failed to sync player profile with server.", error);
    }
  };

  // Handlers
  const handleLogin = async (
    username: string, 
    isGuest: boolean, 
    password?: string, 
    isRegister?: boolean, 
    weaponClass?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      let data;
      if (isGuest) {
        data = await apiFetch('/api/auth/guest', {
          method: 'POST',
          body: JSON.stringify({ username })
        });
      } else if (isRegister) {
        data = await apiFetch('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ username, password, weaponClass })
        });
      } else {
        data = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        });
      }

      const { token, user: userProfile } = data;
      localStorage.setItem('sao_token', token);
      setUser(userProfile);

      // Load latest rooms & guilds
      const roomsList = await apiFetch('/api/rooms');
      setRooms(roomsList);
      const guildsList = await apiFetch('/api/guilds');
      setAllGuilds(guildsList);

      connectSocket(userProfile.username, token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Link Start authentication failed.' };
    }
  };

  const handleLogout = () => {
    if (socket) {
      socket.disconnect();
    }
    setUser(null);
    setSocket(null);
    setMessages([]);
    localStorage.removeItem('sao_token');
  };

  // Add points and handle level ups
  const handleAddExp = (amount: number) => {
    if (!user) return;
    let nextExp = user.exp + amount;
    let nextLevel = user.level;
    let nextMaxHp = user.maxHp;

    const expNeeded = user.level * 100;
    if (nextExp >= expNeeded) {
      nextExp -= expNeeded;
      nextLevel += 1;
      nextMaxHp += 20;
      
      // Level Up Glow Alert!
      setLevelUpAlert(true);
      setTimeout(() => {
        setLevelUpAlert(false);
      }, 5000);
    }

    const updated = {
      ...user,
      exp: nextExp,
      level: nextLevel,
      maxHp: nextMaxHp,
      hp: nextLevel > user.level ? nextMaxHp : user.hp
    };
    syncUserProfile(updated);
  };

  // Send Chat message
  const handleSendMessage = async (
    content: string, 
    type: 'text' | 'image' | 'file' = 'text', 
    fileUrl?: string, 
    fileName?: string
  ) => {
    if (!user || !socket) return;

    socket.emit('send-message', {
      roomId: activeRoomId,
      content,
      type,
      fileUrl,
      fileName
    });

    // Progress Quest 1: "Aincrad Pathfinder"
    if (activeRoomId === 'town-of-beginnings') {
      progressQuest('q-1');
    }

    // Award minor interaction experience points
    handleAddExp(5);
  };

  // Edit Chat message
  const handleEditMessage = async (messageId: string, content: string) => {
    if (!socket) return;
    socket.emit('edit-message', { roomId: activeRoomId, messageId, content });
  };

  // Delete Chat message
  const handleDeleteMessage = async (messageId: string) => {
    if (!socket) return;
    socket.emit('delete-message', { roomId: activeRoomId, messageId });
  };

  // Add reaction
  const handleAddReaction = async (
    messageId: string, 
    reactionType: 'congrats' | 'critical' | 'miss' | 'poison' | 'paralyze'
  ) => {
    if (!user || !socket) return;

    socket.emit('add-reaction', { roomId: activeRoomId, messageId, reactionType });

    // Progress Quest 2: "Joint Strike Tactical"
    progressQuest('q-2');
  };

  // Progress Quest function
  const progressQuest = (questId: string) => {
    if (!user) return;
    const updatedQuests = user.quests.map((q) => {
      if (q.id === questId && q.current < q.target) {
        const nextCurrent = q.current + 1;
        return {
          ...q,
          current: nextCurrent,
          completed: nextCurrent >= q.target
        };
      }
      return q;
    });

    syncUserProfile({ ...user, quests: updatedQuests });
  };

  // Claim Quest Reward
  const handleClaimReward = (questId: string) => {
    if (!user) return;
    const quest = user.quests.find(q => q.id === questId);
    if (!quest || quest.claimed) return;

    let updatedInventory = [...user.inventory];
    if (quest.itemReward) {
      const newItem: InventoryItem = {
        id: `loot-${Math.random().toString(36).substring(2, 11)}`,
        ...quest.itemReward
      };
      updatedInventory.push(newItem);
    }

    const updatedQuests = user.quests.map((q) => {
      if (q.id === questId) {
        return { ...q, claimed: true };
      }
      return q;
    });

    syncUserProfile({
      ...user,
      inventory: updatedInventory,
      quests: updatedQuests
    });

    handleAddExp(quest.expReward);
  };

  // Drink healing Potion and replenish HP!
  const handleUseItem = (itemId: string) => {
    if (!user) return;
    const item = user.inventory.find(i => i.id === itemId);
    if (!item || item.type !== 'potion') return;

    // Use potion: Restores 25 HP
    const newHp = Math.min(user.maxHp, user.hp + 25);
    const updatedInventory = user.inventory.filter(i => i.id !== itemId);

    syncUserProfile({
      ...user,
      hp: newHp,
      inventory: updatedInventory
    });

    // Progress Quest 3: "Floor Alchemist" (Drink potion)
    progressQuest('q-3');
  };

  // Equip Weapon
  const handleEquipItem = (itemId: string) => {
    if (!user) return;
    const updatedInventory = user.inventory.map((item) => {
      if (item.type === 'weapon') {
        return {
          ...item,
          equipped: item.id === itemId ? !item.equipped : false // Equip only one weapon at a time
        };
      }
      return item;
    });

    syncUserProfile({
      ...user,
      inventory: updatedInventory
    });
  };

  // Found new Guild Alliance
  const handleCreateGuild = async (name: string, crest: string) => {
    if (!user) return;
    try {
      const res = await apiFetch('/api/guilds', {
        method: 'POST',
        body: JSON.stringify({ name, crest })
      });
      const guildsList = await apiFetch('/api/guilds');
      setAllGuilds(guildsList);
      setUser(res.user);
    } catch (err) {
      console.error("Found guild failed:", err);
    }
  };

  // Join Guild Alliance
  const handleJoinGuild = async (guildId: string) => {
    if (!user) return;
    try {
      const res = await apiFetch(`/api/guilds/${guildId}/join`, {
        method: 'POST'
      });
      const guildsList = await apiFetch('/api/guilds');
      setAllGuilds(guildsList);
      setUser(res.user);
    } catch (err) {
      console.error("Join guild failed:", err);
    }
  };

  // Leave Guild Alliance
  const handleLeaveGuild = async () => {
    if (!user) return;
    try {
      const res = await apiFetch('/api/guilds/leave', {
        method: 'POST'
      });
      const guildsList = await apiFetch('/api/guilds');
      setAllGuilds(guildsList);
      setUser(res.user);
    } catch (err) {
      console.error("Leave guild failed:", err);
    }
  };

  // Post Guild Announcement
  const handlePostAnnouncement = async (content: string) => {
    if (!user || !activeGuild) return;
    try {
      const updatedG = await apiFetch(`/api/guilds/${activeGuild.id}/announcements`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
      setActiveGuild(updatedG);
      setAllGuilds(prev => prev.map(g => g.id === updatedG.id ? updatedG : g));
    } catch (err) {
      console.error("Post announcement failed:", err);
    }
  };

  // Join Tactical Voice Chamber
  const handleJoinVoiceChamber = (chamberId: string) => {
    if (!user || !socket) return;
    socket.emit('join-voice-chamber', {
      chamberId,
      avatar: user.avatar
    });
  };

  // Leave Voice Chamber
  const handleLeaveVoiceChamber = () => {
    if (!user || !socket || !currentChamber) return;
    socket.emit('leave-voice-chamber', {
      chamberId: currentChamber.roomId
    });
    setCurrentChamber(null);
  };

  const handleToggleMic = (muted: boolean) => {
    if (!user || !socket || !currentChamber) return;
    socket.emit('toggle-mic', {
      chamberId: currentChamber.roomId,
      muted
    });
  };

  const handleToggleCamera = (cameraOn: boolean) => {
    if (!user || !socket || !currentChamber) return;
    socket.emit('toggle-camera', {
      chamberId: currentChamber.roomId,
      cameraOn
    });
  };

  const handleCreateRoom = async (name: string, description: string, isPrivate: boolean) => {
    try {
      const newRoom = await apiFetch('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ name, description, isPrivate })
      });
      setRooms(prev => [...prev, newRoom]);
      setActiveRoomId(newRoom.id);
    } catch (err) {
      console.error("Create room failed:", err);
    }
  };

  // Interactive Typing Signals
  const handleTypingStart = () => {
    if (socket) {
      socket.emit('typing-start', { roomId: activeRoomId });
    }
  };

  const handleTypingStop = () => {
    if (socket) {
      socket.emit('typing-stop', { roomId: activeRoomId });
    }
  };

  // Self-heal when player clicks HP bar
  const handleHealVitality = () => {
    if (!user) return;
    const potion = user.inventory.find(i => i.type === 'potion');
    if (potion) {
      handleUseItem(potion.id);
    } else {
      setSaoNotification({
        text: "System Alert: You do not have any bubbling HP potions equipped. Clear daily quests to restock!",
        rarity: "rare"
      });
      setTimeout(() => setSaoNotification(null), 5000);
    }
  };

  return (
    <div className="min-h-screen sophisticated-dark-bg text-[#c0d6df] flex flex-col font-sans relative overflow-x-hidden">
      {/* Hologram Grid Overlay */}
      <div className="absolute inset-0 hologram-grid opacity-[0.03] pointer-events-none" />
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoginScreen onLogin={handleLogin} />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col relative"
          >
            {/* Top HUD Header */}
            <HUDHeader
              user={user}
              activeQuestCount={user.quests.filter(q => !q.claimed).length}
              onOpenMenu={() => setIsMenuOpen(true)}
              onHeal={handleHealVitality}
            />

            {/* Immersive Floating Notification Banner */}
            <AnimatePresence>
              {saoNotification && (
                <motion.div
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 20, opacity: 1 }}
                  exit={{ y: -50, opacity: 0 }}
                  className="fixed left-1/2 -translate-x-1/2 z-50 bg-[#080e19] border border-[#ff9900] px-5 py-3 rounded-2xl flex items-center justify-between gap-4 max-w-lg shadow-[0_0_20px_rgba(255,153,0,0.25)]"
                >
                  <p className="text-xs font-mono font-bold text-[#ff9900]">{saoNotification.text}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Immersive LEVEL UP HUD overlay */}
            <AnimatePresence>
              {levelUpAlert && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
                >
                  <div className="p-8 bg-[#00ff66]/10 border-2 border-[#00ff66] rounded-3xl text-center space-y-2 backdrop-blur-md shadow-[0_0_50px_#00ff66]">
                    <span className="text-4xl">🌟</span>
                    <h2 className="text-4xl font-sans font-black text-[#00ff66] tracking-widest uppercase animate-bounce">
                      LEVEL UP
                    </h2>
                    <p className="text-xs font-mono text-gray-300">Your NerveGear neural synchronization has improved!</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Interactive Holographic Main Drawer System Menu */}
            <SAOMenu
              isOpen={isMenuOpen}
              onClose={() => setIsMenuOpen(false)}
              activePanel={activePanel}
              onChangePanel={setActivePanel}
              user={user}
              onLogout={handleLogout}
            />

            {/* Main Active Panel Viewport with layout transitions */}
            <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePanel}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                >
                  {activePanel === 'chat' && (
                    <ChatPanel
                      user={user}
                      rooms={rooms}
                      activeRoomId={activeRoomId}
                      onChangeRoom={setActiveRoomId}
                      messages={messages}
                      onSendMessage={handleSendMessage}
                      onEditMessage={handleEditMessage}
                      onDeleteMessage={handleDeleteMessage}
                      onAddReaction={handleAddReaction}
                      typingUsers={typingUsers}
                      onTypingStart={handleTypingStart}
                      onTypingStop={handleTypingStop}
                      onCreateRoom={handleCreateRoom}
                    />
                  )}

                  {activePanel === 'profile' && (
                    <div className="max-w-md mx-auto bg-[#080e19] border border-cyan-500/30 rounded-2xl p-6 shadow-2xl relative text-center space-y-6">
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
                      <div className="text-6xl">{user.avatar}</div>
                      <div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-wider">{user.username}</h3>
                        <p className="text-xs font-mono text-cyan-400 mt-1 uppercase">Floor Frontliner • Sync Level {user.level}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-t border-cyan-950/60 pt-6">
                        <div className="p-3 bg-[#04070d] border border-cyan-950 rounded-xl">
                          <p className="text-[10px] font-mono text-gray-500 uppercase">Neural Status</p>
                          <p className="text-sm font-sans font-bold text-[#00ff66] uppercase mt-1">{user.status}</p>
                        </div>
                        <div className="p-3 bg-[#04070d] border border-cyan-950 rounded-xl">
                          <p className="text-[10px] font-mono text-gray-500 uppercase">Achievements</p>
                          <p className="text-sm font-sans font-bold text-[#ff9900] uppercase mt-1">{user.achievements.length} Badges</p>
                        </div>
                      </div>

                      {/* Display Achievements badges */}
                      <div className="space-y-2 text-left">
                        <h4 className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Acquired Achievements</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {user.achievements.map((ach) => (
                            <span key={ach} className="px-2.5 py-1 bg-cyan-950/30 border border-cyan-800/40 rounded-full text-[10px] font-mono text-cyan-300">
                              🏅 {ach}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activePanel === 'guild' && (
                    <GuildPanel
                      user={user}
                      guild={activeGuild}
                      allGuilds={allGuilds}
                      onCreateGuild={handleCreateGuild}
                      onJoinGuild={handleJoinGuild}
                      onLeaveGuild={handleLeaveGuild}
                      onPostAnnouncement={handlePostAnnouncement}
                    />
                  )}

                  {activePanel === 'inventory' && (
                    <InventoryPanel
                      user={user}
                      onUseItem={handleUseItem}
                      onEquipItem={handleEquipItem}
                    />
                  )}

                  {activePanel === 'quests' && (
                    <QuestPanel
                      user={user}
                      onClaimReward={handleClaimReward}
                    />
                  )}

                  {activePanel === 'voice' && (
                    <VoiceChamberPanel
                      user={user}
                      socket={socket}
                      currentChamber={currentChamber}
                      onJoinChamber={handleJoinVoiceChamber}
                      onLeaveChamber={handleLeaveVoiceChamber}
                      onToggleMic={handleToggleMic}
                      onToggleCamera={handleToggleCamera}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
