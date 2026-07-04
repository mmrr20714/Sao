/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Local JSON-file database.
 *
 * The original project talked to Firestore directly from the server using the
 * client SDK, but never authenticated with Firebase Auth. Firestore's
 * security rules therefore rejected every read/write, which is why login,
 * registration, rooms, guilds, and messages all failed in practice.
 *
 * This module replaces that entire stack with a tiny embedded database that
 * persists to a JSON file on disk. It exposes the same shape of operations
 * the server needs (credential lookups, user profiles, rooms, guilds, and
 * per-room messages) without requiring any external service or credentials.
 *
 * It is intentionally simple: everything lives in memory and is flushed to
 * disk synchronously after every mutation. That's more than fine for a
 * low-traffic chat app like this one.
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface Credential {
  uid: string;
  username: string; // lowercase
  passwordHash: string;
}

interface DBShape {
  credentials: Record<string, Credential>; // keyed by uid
  users: Record<string, any>; // keyed by uid
  rooms: Record<string, any>; // keyed by roomId
  guilds: Record<string, any>; // keyed by guildId
  messages: Record<string, Record<string, any>>; // roomId -> messageId -> message
}

function emptyState(): DBShape {
  return { credentials: {}, users: {}, rooms: {}, guilds: {}, messages: {} };
}

let state: DBShape = emptyState();

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function load() {
  ensureDataDir();
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      state = { ...emptyState(), ...parsed };
    } catch (err) {
      console.error('[LocalDB] Failed to parse data/db.json, starting fresh:', err);
      state = emptyState();
    }
  } else {
    persist();
  }
}

function persist() {
  ensureDataDir();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('[LocalDB] Failed to write data/db.json:', err);
  }
}

load();

export const localDb = {
  // ---------------- Credentials ----------------
  findCredentialByUsername(username: string): Credential | null {
    const lower = username.toLowerCase();
    return Object.values(state.credentials).find(c => c.username === lower) || null;
  },

  createCredential(uid: string, username: string, passwordHash: string) {
    state.credentials[uid] = { uid, username: username.toLowerCase(), passwordHash };
    persist();
  },

  // ---------------- Users ----------------
  getUser(uid: string): any | null {
    return state.users[uid] || null;
  },

  setUser(uid: string, profile: any) {
    state.users[uid] = profile;
    persist();
    return profile;
  },

  // ---------------- Rooms ----------------
  getRooms(): any[] {
    return Object.values(state.rooms);
  },

  getRoom(id: string): any | null {
    return state.rooms[id] || null;
  },

  createRoom(room: any) {
    state.rooms[room.id] = room;
    persist();
    return room;
  },

  // ---------------- Guilds ----------------
  getGuilds(): any[] {
    return Object.values(state.guilds);
  },

  getGuild(id: string): any | null {
    return state.guilds[id] || null;
  },

  setGuild(id: string, guild: any) {
    state.guilds[id] = guild;
    persist();
    return guild;
  },

  // ---------------- Messages ----------------
  getMessages(roomId: string, max = 100): any[] {
    const roomMessages = state.messages[roomId] || {};
    return Object.values(roomMessages)
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-max);
  },

  getMessage(roomId: string, messageId: string): any | null {
    return state.messages[roomId]?.[messageId] || null;
  },

  addMessage(roomId: string, message: any) {
    if (!state.messages[roomId]) state.messages[roomId] = {};
    state.messages[roomId][message.id] = message;
    persist();
    return message;
  },

  updateMessage(roomId: string, messageId: string, patch: any) {
    if (!state.messages[roomId]?.[messageId]) return null;
    state.messages[roomId][messageId] = { ...state.messages[roomId][messageId], ...patch };
    persist();
    return state.messages[roomId][messageId];
  },

  deleteMessage(roomId: string, messageId: string) {
    if (!state.messages[roomId]?.[messageId]) return false;
    delete state.messages[roomId][messageId];
    persist();
    return true;
  },

  // ---------------- Seeding helper ----------------
  isEmpty(collectionName: 'rooms' | 'guilds'): boolean {
    return Object.keys(state[collectionName]).length === 0;
  },
};
