/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import { localDb } from './db.ts';

const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'sao-cardinal-system-secret-key-999';

// Seed Initial Floor Rooms and Guilds if missing
const defaultRooms = [
  { id: 'town-of-beginnings', name: 'Floor 1: Town of Beginnings', description: 'Public plaza for starter players.', isPrivate: false, isGuild: false, createdAt: new Date().toISOString() },
  { id: 'algade', name: 'Floor 50: Algade', description: 'Trading street and tactical raid hub.', isPrivate: false, isGuild: false, createdAt: new Date().toISOString() },
  { id: 'boss-raid', name: 'Floor 74: Boss Raid Room', description: 'Command room to fight The Gleam Eyes field boss.', isPrivate: false, isGuild: false, createdAt: new Date().toISOString() }
];

const defaultGuilds = [
  { id: 'kob', name: 'Knights of the Blood Oath', crest: 'text-[#ff3333] border-[#ff3333] bg-red-950/20', leaderId: 'g-lead-1', leaderName: 'Heathcliff', announcements: [], level: 5, exp: 400, createdAt: new Date().toISOString() },
  { id: 'fuurinkazan', name: 'Fuurinkazan Alliance', crest: 'text-[#ff9900] border-[#ff9900] bg-orange-950/20', leaderId: 'g-lead-2', leaderName: 'Klein', announcements: [], level: 3, exp: 120, createdAt: new Date().toISOString() }
];

function seedDatabase() {
  if (localDb.isEmpty('rooms')) {
    console.log('[Cardinal Server] Seeding initial floor rooms...');
    for (const r of defaultRooms) {
      localDb.createRoom(r);
    }
  }

  if (localDb.isEmpty('guilds')) {
    console.log('[Cardinal Server] Seeding initial guild alliances...');
    for (const g of defaultGuilds) {
      localDb.setGuild(g.id, g);
    }
  }
}

seedDatabase();

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  app.use(express.json());

  // REST API: Authentication Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'NerveGear Authorization Token required.' });
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        return res.status(403).json({ error: 'NerveGear Authorization Signature invalid.' });
      }
      req.user = user;
      next();
    });
  };

  // REST API: Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', system: 'Cardinal v2.0.0', timestamp: new Date().toISOString() });
  });

  // REST API: Auth Register
  app.post('/api/auth/register', async (req, res) => {
    const { username, password, weaponClass } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Moniker and Access Code are required.' });
    }

    try {
      const existing = localDb.findCredentialByUsername(username);
      if (existing) {
        return res.status(400).json({ error: 'Moniker is already claimed by another active player.' });
      }

      const uid = 'player-' + crypto.randomUUID();
      const passwordHash = bcrypt.hashSync(password, 10);

      localDb.createCredential(uid, username, passwordHash);

      const defaultProfile = {
        uid,
        username,
        avatar: '⚔️',
        level: 1,
        exp: 0,
        hp: 100,
        maxHp: 100,
        guildId: null,
        guildRole: null,
        status: 'Online',
        achievements: ['Grid Link Started'],
        inventory: [
          { id: 'inv-1', name: `${weaponClass || 'One-Handed Sword'}`, description: 'A starter steel sword given to brave Aincrad players.', type: 'weapon', rarity: 'Common', stats: 'ATK +5', equipped: true },
          { id: 'inv-2', name: 'Vitality Elixir', description: 'A crystal flask containing bubbling green fluid. Restores 25 HP.', type: 'potion', rarity: 'Common' },
        ],
        quests: [
          { id: 'q-1', title: 'Frontline Training', description: 'Record 5 scrolls (messages) in any public Floor.', target: 5, current: 0, expReward: 100, itemReward: { name: 'Beginner Potion', description: 'Restores 30 HP.', type: 'potion', rarity: 'Common' }, completed: false, claimed: false },
          { id: 'q-2', title: 'Joint Strike Tactical', description: 'Coordinate tactical combat efforts (Message reaction).', target: 1, current: 0, expReward: 80, completed: false, claimed: false },
          { id: 'q-3', title: 'Floor Alchemist', description: 'Drink a bubbling vitality potion to heal HP.', target: 1, current: 0, expReward: 50, completed: false, claimed: false }
        ],
        friends: [],
        createdAt: new Date().toISOString()
      };

      localDb.setUser(uid, defaultProfile);

      const token = jwt.sign({ uid, username }, JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({ token, user: defaultProfile });
    } catch (err: any) {
      console.error('Register failed:', err);
      res.status(500).json({ error: 'NerveGear internal link start failure.' });
    }
  });

  // REST API: Auth Login
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Moniker and Access Code are required.' });
    }

    try {
      const cred = localDb.findCredentialByUsername(username);
      if (!cred) {
        return res.status(401).json({ error: 'Invalid Player Moniker or Access Code.' });
      }

      const isMatch = bcrypt.compareSync(password, cred.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid Player Moniker or Access Code.' });
      }

      const userProfile = localDb.getUser(cred.uid);
      if (!userProfile) {
        return res.status(404).json({ error: 'Player profile is missing from Cardinal Node.' });
      }

      const token = jwt.sign({ uid: cred.uid, username: userProfile.username }, JWT_SECRET, { expiresIn: '7d' });

      res.json({ token, user: userProfile });
    } catch (err: any) {
      console.error('Login failed:', err);
      res.status(500).json({ error: 'NerveGear internal authentication failure.' });
    }
  });

  // REST API: Guest Auth
  app.post('/api/auth/guest', async (req, res) => {
    const { username } = req.body;
    const finalMoniker = (username && username.trim()) || 'Guest_' + Math.floor(Math.random() * 900 + 100);

    try {
      const uid = 'guest-' + crypto.randomUUID();
      const guestProfile = {
        uid,
        username: finalMoniker,
        avatar: '👤',
        level: 1,
        exp: 0,
        hp: 100,
        maxHp: 100,
        guildId: null,
        guildRole: null,
        status: 'Online',
        achievements: ['Guest Terminal Link'],
        inventory: [
          { id: 'inv-1', name: 'Starter Longsword', description: 'A heavy, plain iron sword given to all beginners in the Town of Beginnings.', type: 'weapon', rarity: 'Common', stats: 'ATK +5', equipped: true },
          { id: 'inv-2', name: 'Vitality Elixir', description: 'A crystal flask containing bubbling green fluid. Restores 25 HP.', type: 'potion', rarity: 'Common' },
        ],
        quests: [
          { id: 'q-1', title: 'Frontline Training', description: 'Record 5 scrolls (messages) in any public Floor.', target: 5, current: 0, expReward: 100, itemReward: { name: 'Beginner Potion', description: 'Restores 30 HP.', type: 'potion', rarity: 'Common' }, completed: false, claimed: false },
          { id: 'q-2', title: 'Joint Strike Tactical', description: 'Coordinate tactical combat efforts (Message reaction).', target: 1, current: 0, expReward: 80, completed: false, claimed: false },
          { id: 'q-3', title: 'Floor Alchemist', description: 'Drink a bubbling vitality potion to heal HP.', target: 1, current: 0, expReward: 50, completed: false, claimed: false }
        ],
        friends: [],
        createdAt: new Date().toISOString()
      };

      localDb.setUser(uid, guestProfile);

      const token = jwt.sign({ uid, username: finalMoniker, isGuest: true }, JWT_SECRET, { expiresIn: '1d' });
      res.json({ token, user: guestProfile });
    } catch (err: any) {
      console.error('Guest access failed:', err);
      res.status(500).json({ error: 'NerveGear internal guest initiation failure.' });
    }
  });

  // REST API: Load Profile
  app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
    try {
      const userProfile = localDb.getUser(req.user.uid);
      if (!userProfile) {
        return res.status(404).json({ error: 'Player profile not found.' });
      }
      res.json({ user: userProfile });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to sync player profile.' });
    }
  });

  // REST API: Update Profile
  app.put('/api/users/profile', authenticateToken, async (req: any, res) => {
    try {
      const existing = localDb.getUser(req.user.uid);
      if (!existing) {
        return res.status(404).json({ error: 'Player profile not found.' });
      }

      const updated = {
        ...existing,
        ...req.body,
        uid: req.user.uid, // security sanity
        username: existing.username // do not allow moniker changes
      };

      localDb.setUser(req.user.uid, updated);

      // Notify other active sockets of updates (HP/Level/Status changes!)
      io.emit('player-profile-updated', updated);

      res.json({ user: updated });
    } catch (err: any) {
      console.error('Profile update failed:', err);
      res.status(500).json({ error: 'Failed to update player profile.' });
    }
  });

  // REST API: Load Rooms
  app.get('/api/rooms', async (req, res) => {
    try {
      res.json(localDb.getRooms());
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve Floor navigation nodes.' });
    }
  });

  // REST API: Create Room
  app.post('/api/rooms', authenticateToken, async (req: any, res) => {
    const { name, description, isPrivate } = req.body;
    if (!name) return res.status(400).json({ error: 'Room floor name required.' });

    try {
      const id = 'room-' + crypto.randomUUID();
      const newRoom = {
        id,
        name,
        description: description || '',
        isPrivate: !!isPrivate,
        isGuild: false,
        createdAt: new Date().toISOString()
      };

      localDb.createRoom(newRoom);
      io.emit('room-created', newRoom);
      res.status(201).json(newRoom);
    } catch (err) {
      res.status(500).json({ error: 'Failed to forge Floor navigation node.' });
    }
  });

  // REST API: Load Messages
  app.get('/api/rooms/:roomId/messages', async (req, res) => {
    const { roomId } = req.params;
    try {
      res.json(localDb.getMessages(roomId, 100));
    } catch (err) {
      console.error('Fetch messages failed:', err);
      res.status(500).json({ error: 'Failed to retrieve message logs.' });
    }
  });

  // REST API: Load Guilds
  app.get('/api/guilds', async (req, res) => {
    try {
      res.json(localDb.getGuilds());
    } catch (err) {
      res.status(500).json({ error: 'Failed to load guilds roster.' });
    }
  });

  // REST API: Create Guild
  app.post('/api/guilds', authenticateToken, async (req: any, res) => {
    const { name, crest } = req.body;
    if (!name) return res.status(400).json({ error: 'Alliance name required.' });

    try {
      const guildId = 'guild-' + crypto.randomUUID();
      const newGuild = {
        id: guildId,
        name,
        crest: crest || 'text-cyan-400 border-cyan-400',
        leaderId: req.user.uid,
        leaderName: req.user.username,
        announcements: [
          {
            id: 'ann-' + crypto.randomUUID(),
            authorName: req.user.username,
            content: `Alliance ${name} formed! Join frontline efforts.`,
            createdAt: new Date().toISOString()
          }
        ],
        level: 1,
        exp: 0,
        createdAt: new Date().toISOString()
      };

      localDb.setGuild(guildId, newGuild);

      const existingUser = localDb.getUser(req.user.uid);
      if (existingUser) {
        const updatedUser = {
          ...existingUser,
          guildId,
          guildRole: 'leader'
        };
        localDb.setUser(req.user.uid, updatedUser);
        io.emit('player-profile-updated', updatedUser);
        io.emit('guilds-updated', { guilds: localDb.getGuilds() });
        return res.status(201).json({ guild: newGuild, user: updatedUser });
      }

      res.status(201).json({ guild: newGuild });
    } catch (err) {
      console.error('Create guild failed:', err);
      res.status(500).json({ error: 'Failed to establish guild alliance.' });
    }
  });

  // REST API: Join Guild
  app.post('/api/guilds/:guildId/join', authenticateToken, async (req: any, res) => {
    const { guildId } = req.params;
    try {
      const guild = localDb.getGuild(guildId);
      if (!guild) {
        return res.status(404).json({ error: 'Guild alliance not found.' });
      }

      const existingUser = localDb.getUser(req.user.uid);
      if (!existingUser) {
        return res.status(404).json({ error: 'User profile not found.' });
      }

      const updatedUser = {
        ...existingUser,
        guildId,
        guildRole: 'member'
      };

      localDb.setUser(req.user.uid, updatedUser);
      io.emit('player-profile-updated', updatedUser);

      res.json({ guild, user: updatedUser });
    } catch (err) {
      res.status(500).json({ error: 'Failed to join guild alliance.' });
    }
  });

  // REST API: Leave Guild
  app.post('/api/guilds/leave', authenticateToken, async (req: any, res) => {
    try {
      const existingUser = localDb.getUser(req.user.uid);
      if (!existingUser) {
        return res.status(404).json({ error: 'User profile not found.' });
      }

      const updatedUser = {
        ...existingUser,
        guildId: null,
        guildRole: null
      };

      localDb.setUser(req.user.uid, updatedUser);
      io.emit('player-profile-updated', updatedUser);

      res.json({ user: updatedUser });
    } catch (err) {
      res.status(500).json({ error: 'Failed to leave guild alliance.' });
    }
  });

  // REST API: Post Announcement
  app.post('/api/guilds/:guildId/announcements', authenticateToken, async (req: any, res) => {
    const { guildId } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Announcement content required.' });

    try {
      const guild = localDb.getGuild(guildId);
      if (!guild) {
        return res.status(404).json({ error: 'Guild alliance not found.' });
      }

      const newAnn = {
        id: 'ann-' + crypto.randomUUID(),
        authorName: req.user.username,
        content,
        createdAt: new Date().toISOString()
      };

      const updatedGuild = {
        ...guild,
        announcements: [...(guild.announcements || []), newAnn]
      };

      localDb.setGuild(guildId, updatedGuild);
      io.emit('guild-updated', updatedGuild);

      res.json(updatedGuild);
    } catch (err) {
      res.status(500).json({ error: 'Failed to post alliance directive.' });
    }
  });

  // Keep track of active voice call chambers. Participants are tracked by
  // socket id (not just uid) so signaling can target an exact connection
  // and the same user cannot get "stuck" duplicated in a chamber.
  interface VoiceParticipant {
    uid: string;
    socketId: string;
    username: string;
    avatar: string;
    micMuted: boolean;
    cameraOn: boolean;
  }

  const voiceChambers: Record<string, {
    roomId: string;
    roomName: string;
    participants: VoiceParticipant[];
  }> = {
    'floor-1': { roomId: 'floor-1', roomName: 'Floor 1: Town of Beginnings', participants: [] },
    'floor-50': { roomId: 'floor-50', roomName: 'Floor 50: Algade Plaza', participants: [] },
    'floor-75': { roomId: 'floor-75', roomName: 'Floor 75: Collinia Command', participants: [] },
  };

  const typingUsers: Record<string, string[]> = {};

  // Secure Socket.IO Handshake JWT Verification
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: NerveGear Access Token required'));
    }
    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        return next(new Error('Authentication error: Handshake verification failed'));
      }
      socket.data.user = decoded; // holds uid and username
      next();
    });
  });

  // Helper: remove a socket from every voice chamber it might be in, notify others.
  const removeFromAllChambers = (socketId: string) => {
    Object.keys(voiceChambers).forEach((chamberId) => {
      const chamber = voiceChambers[chamberId];
      const prevLength = chamber.participants.length;
      chamber.participants = chamber.participants.filter(p => p.socketId !== socketId);
      if (chamber.participants.length !== prevLength) {
        io.to(`voice-${chamberId}`).emit('chamber-updated', chamber);
      }
    });
  };

  // Real-time communication via Socket.io
  io.on('connection', (socket) => {
    const player = socket.data.user;
    console.log(`[Cardinal Server] Player ${player.username} has linked start: ${socket.id}`);

    // Join a chat room
    socket.on('join-room', (roomId: string) => {
      socket.join(roomId);
      console.log(`[Cardinal] Player ${player.username} joined room: ${roomId}`);
    });

    // Leave a chat room
    socket.on('leave-room', (roomId: string) => {
      socket.leave(roomId);
      console.log(`[Cardinal] Player ${player.username} left room: ${roomId}`);
    });

    // Real-Time Chat messages
    socket.on('send-message', async ({ roomId, content, type, fileUrl, fileName }: any) => {
      try {
        if (!content || !String(content).trim()) return;

        const sender = localDb.getUser(player.uid) || { level: 1, hp: 100, maxHp: 100, avatar: '⚔️' };

        const messageId = 'msg-' + crypto.randomUUID();
        const newMessage = {
          id: messageId,
          chatId: roomId,
          senderId: player.uid,
          senderName: player.username,
          senderAvatar: sender.avatar,
          senderLevel: sender.level,
          senderHp: Math.round((sender.hp / sender.maxHp) * 100),
          content,
          type: type || 'text',
          fileUrl: fileUrl || null,
          fileName: fileName || null,
          reactions: [],
          createdAt: new Date().toISOString()
        };

        localDb.addMessage(roomId, newMessage);

        // Broadcast to everyone in the room
        io.to(roomId).emit('message-received', { roomId, message: newMessage });
      } catch (err) {
        console.error('Save message failed:', err);
      }
    });

    // Edit message
    socket.on('edit-message', async ({ roomId, messageId, content }: any) => {
      try {
        const msg = localDb.getMessage(roomId, messageId);
        if (msg && msg.senderId === player.uid) {
          localDb.updateMessage(roomId, messageId, { content });
          io.to(roomId).emit('message-edited', { roomId, messageId, content });
        }
      } catch (err) {
        console.error('Edit message failed:', err);
      }
    });

    // Delete message
    socket.on('delete-message', async ({ roomId, messageId }: any) => {
      try {
        const msg = localDb.getMessage(roomId, messageId);
        if (msg && msg.senderId === player.uid) {
          localDb.deleteMessage(roomId, messageId);
          io.to(roomId).emit('message-deleted', { roomId, messageId });
        }
      } catch (err) {
        console.error('Delete message failed:', err);
      }
    });

    // Add reaction
    socket.on('add-reaction', async ({ roomId, messageId, reactionType }: any) => {
      try {
        const msg = localDb.getMessage(roomId, messageId);
        if (msg) {
          let updatedReactions = [...(msg.reactions || [])];
          const reactIndex = updatedReactions.findIndex((r: any) => r.type === reactionType);

          if (reactIndex > -1) {
            const userIndex = updatedReactions[reactIndex].users.findIndex((u: any) => u.uid === player.uid);
            if (userIndex > -1) {
              // Remove
              updatedReactions[reactIndex].users.splice(userIndex, 1);
              if (updatedReactions[reactIndex].users.length === 0) {
                updatedReactions.splice(reactIndex, 1);
              }
            } else {
              // Add
              updatedReactions[reactIndex].users.push({ uid: player.uid, username: player.username });
            }
          } else {
            // New reaction type
            updatedReactions.push({
              type: reactionType,
              users: [{ uid: player.uid, username: player.username }]
            });
          }

          localDb.updateMessage(roomId, messageId, { reactions: updatedReactions });
          io.to(roomId).emit('reaction-updated', { roomId, messageId, reactions: updatedReactions });
        }
      } catch (err) {
        console.error('Add reaction failed:', err);
      }
    });

    // Typing indicators
    socket.on('typing-start', ({ roomId }: { roomId: string }) => {
      if (!typingUsers[roomId]) {
        typingUsers[roomId] = [];
      }
      if (!typingUsers[roomId].includes(player.username)) {
        typingUsers[roomId].push(player.username);
      }
      socket.to(roomId).emit('typing-update', { roomId, typing: typingUsers[roomId] });
    });

    socket.on('typing-stop', ({ roomId }: { roomId: string }) => {
      if (typingUsers[roomId]) {
        typingUsers[roomId] = typingUsers[roomId].filter(u => u !== player.username);
        socket.to(roomId).emit('typing-update', { roomId, typing: typingUsers[roomId] });
      }
    });

    // ============== Voice & Video Chamber (real WebRTC signaling) ==============
    socket.on('join-voice-chamber', ({ chamberId, avatar }: { chamberId: string; avatar: string }) => {
      socket.join(`voice-${chamberId}`);

      const chamber = voiceChambers[chamberId] || { roomId: chamberId, roomName: `Floor Chamber ${chamberId}`, participants: [] };

      // Remove any stale entry for this exact socket (re-join safety)
      chamber.participants = chamber.participants.filter(p => p.socketId !== socket.id);

      chamber.participants.push({
        uid: player.uid,
        socketId: socket.id,
        username: player.username,
        avatar: avatar || '👤',
        micMuted: false,
        cameraOn: false,
      });
      voiceChambers[chamberId] = chamber;

      console.log(`[Voice] Player ${player.username} joined voice chamber: ${chamberId}`);
      io.to(`voice-${chamberId}`).emit('chamber-updated', chamber);
    });

    socket.on('leave-voice-chamber', ({ chamberId }: { chamberId: string }) => {
      socket.leave(`voice-${chamberId}`);

      if (voiceChambers[chamberId]) {
        voiceChambers[chamberId].participants = voiceChambers[chamberId].participants.filter(p => p.socketId !== socket.id);
        console.log(`[Voice] Player ${player.username} left voice chamber: ${chamberId}`);
        io.to(`voice-${chamberId}`).emit('chamber-updated', voiceChambers[chamberId]);
      }
    });

    socket.on('toggle-mic', ({ chamberId, muted }: { chamberId: string; muted: boolean }) => {
      if (voiceChambers[chamberId]) {
        const participant = voiceChambers[chamberId].participants.find(p => p.socketId === socket.id);
        if (participant) {
          participant.micMuted = muted;
          io.to(`voice-${chamberId}`).emit('chamber-updated', voiceChambers[chamberId]);
        }
      }
    });

    socket.on('toggle-camera', ({ chamberId, cameraOn }: { chamberId: string; cameraOn: boolean }) => {
      if (voiceChambers[chamberId]) {
        const participant = voiceChambers[chamberId].participants.find(p => p.socketId === socket.id);
        if (participant) {
          participant.cameraOn = cameraOn;
          io.to(`voice-${chamberId}`).emit('chamber-updated', voiceChambers[chamberId]);
        }
      }
    });

    // WebRTC signaling relay — targeted to a specific socket id (peer),
    // so offers/answers/ICE candidates reach exactly the right connection
    // in the mesh, not every participant in the chamber.
    socket.on('webrtc-signal', ({ to, signal }: { to: string; signal: any }) => {
      if (!to) return;
      io.to(to).emit('webrtc-signal-relay', { signal, from: socket.id });
    });

    socket.on('disconnect', () => {
      console.log(`[Cardinal Server] A player disconnected: ${socket.id} (${player.username})`);
      removeFromAllChambers(socket.id);
    });
  });

  // Simulated game-world events generator
  const serverEvents = [
    { text: 'System Announcement: The Floor 74 Boss Room [The Gleam Eyes] has been unlocked by frontline scouts!', rarity: 'legendary' },
    { text: 'Guild Announcement: Knights of the Blood Oath recruiting veteran frontliners (Level 40+). Contact Asuna.', rarity: 'rare' },
    { text: 'Area Announcement: Nightfall is approaching on Floor 47 [Floria]. Rare flower spawns are increasing.', rarity: 'common' },
    { text: "System Announcement: A rare merchant [Agil's Shop] has restocked unique Teleport Crystals!", rarity: 'rare' },
    { text: "System Announcement: The Solo Player 'Kirito' has defeated the Floor 10 field boss without taking any damage!", rarity: 'unique' },
    { text: 'System Announcement: Daily Quests have been refreshed by the Cardinal system. Claim rewards now!', rarity: 'legendary' },
  ];

  setInterval(() => {
    const randomEvent = serverEvents[Math.floor(Math.random() * serverEvents.length)];
    io.emit('sao-world-event', randomEvent);
  }, 45000); // Send a fun immersion event every 45 seconds

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`===================================================`);
    console.log(`🛡️  SAO CARDINAL SYSTEM SERVER ONLINE  🛡️`);
    console.log(`🌐 PORT: ${PORT} | HOST: 0.0.0.0`);
    console.log(`💾 DATA STORE: local JSON file (data/db.json)`);
    console.log(`===================================================`);
  });
}

startServer().catch((err) => {
  console.error('Failed to boot Cardinal server:', err);
});
