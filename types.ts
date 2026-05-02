export type VideoQuality = '360p' | '720p' | '1080p';

export interface User {
  id: string;
  name: string;
  isHost: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isHandRaised?: boolean;
  activeReaction?: string | null;
}

export interface Poll {
  id: string;
  question: string;
  options: { id: string; text: string; votes: string[] }[];
  isOpen: boolean;
  creatorId: string;
}

export interface WhiteboardAction {
  type: 'draw' | 'clear' | 'undo';
  payload?: any;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  reactions?: { [emoji: string]: string[] }; // emoji -> userIds[]
}

export interface Transcript {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface RoomState {
  roomId: string;
  participants: User[];
  isLocked: boolean;
  spotlightId: string | null;
}

export interface SignalingEvent {
  from: string;
  to: string;
  signal: any;
}
