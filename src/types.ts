/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'potion' | 'crystal' | 'badge';
  rarity: 'Common' | 'Rare' | 'Unique' | 'Legendary';
  stats?: string;
  equipped?: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  expReward: number;
  itemReward?: Omit<InventoryItem, 'id'>;
  completed: boolean;
  claimed: boolean;
}

export interface GuildAnnouncement {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface Guild {
  id: string;
  name: string;
  crest: string; // Tailwind color or icon key
  leaderId: string;
  leaderName: string;
  announcements: GuildAnnouncement[];
  level: number;
  exp: number;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  username: string;
  avatar: string;
  level: number;
  exp: number;
  hp: number;
  maxHp: number;
  guildId: string | null;
  guildRole: 'leader' | 'officer' | 'member' | null;
  status: 'Online' | 'Offline' | 'In Battle' | 'Solo';
  achievements: string[];
  inventory: InventoryItem[];
  quests: Quest[];
  friends: string[]; // list of uids
  createdAt: string;
}

export interface MessageReaction {
  type: 'congrats' | 'critical' | 'miss' | 'poison' | 'paralyze';
  users: { uid: string; username: string }[];
}

export interface Message {
  id: string;
  chatId: string; // Room ID or Direct Message Room ID
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderLevel: number;
  senderHp: number;
  content: string;
  type: 'text' | 'image' | 'file' | 'gif' | 'call_log';
  fileUrl?: string;
  fileName?: string;
  reactions: MessageReaction[];
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
  } | null;
  createdAt: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  isGuild: boolean;
  guildId?: string;
  allowedMembers?: string[]; // user UIDs for private chats/DMs
  createdAt: string;
}

export interface ActiveVoiceCall {
  roomId: string;
  roomName: string;
  participants: {
    uid: string;
    socketId: string;
    username: string;
    avatar: string;
    micMuted: boolean;
    cameraOn: boolean;
  }[];
}
