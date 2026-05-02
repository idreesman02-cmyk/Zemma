import React from 'react';
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, Copy, Shield, ShieldOff, Users, MessageSquare, Settings2, Hand, Smile, Subtitles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VideoQuality } from '@/types';

interface ControlsProps {
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isHost: boolean;
  isLocked: boolean;
  quality: VideoQuality;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleHandRaise: () => void;
  onToggleReactions: () => void;
  onChangeQuality: (q: VideoQuality) => void;
  onLeave: () => void;
  onCopyLink: () => void;
  onToggleLock?: () => void;
  onMuteAll?: () => void;
  participantCount: number;
  toggleSidebar: () => void;
  toggleChat: () => void;
  toggleCaptions: () => void;
  onOpenSettings: () => void;
  showReactions: boolean;
}

const REACTIONS = ['❤️', '👏', '🔥', '😂', '😮', '😢', '👍', '🎉'];

export const Controls: React.FC<ControlsProps> = ({
  isMuted,
  isVideoOff,
  isScreenSharing,
  isHandRaised,
  isHost,
  isLocked,
  quality,
  onToggleMic,
  onToggleVideo,
  onToggleScreenShare,
  onToggleHandRaise,
  onToggleReactions,
  onChangeQuality,
  onLeave,
  onCopyLink,
  onToggleLock,
  onMuteAll,
  participantCount,
  toggleSidebar,
  toggleChat,
  toggleCaptions,
  onOpenSettings,
  showReactions
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between px-6 z-50">
      <div className="flex items-center gap-4 text-white/70 text-sm font-medium">
        <button 
          onClick={onCopyLink}
          className="flex items-center gap-2 hover:bg-neutral-800 px-3 py-2 rounded-lg transition-colors border border-white/5"
        >
          <Copy className="w-4 h-4" />
          <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider">Invite Link</span>
        </button>

        {isHost && (
          <div className="flex items-center gap-2 bg-black/20 p-1 rounded-xl border border-white/5">
            <button 
              onClick={onToggleLock}
              className={cn(
                "p-2 rounded-lg transition-all flex items-center gap-2",
                isLocked ? "bg-orange-500/20 text-orange-400" : "hover:bg-white/5 text-neutral-500"
              )}
              title={isLocked ? "Unlock Room" : "Lock Room"}
            >
              {isLocked ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
            </button>
            <button 
              onClick={onMuteAll}
              className="p-2 rounded-lg hover:bg-red-500/10 text-neutral-500 hover:text-red-500 transition-all flex items-center gap-2"
              title="Mute Everyone"
            >
              <MicOff className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center bg-neutral-800 rounded-xl px-2 gap-2 border border-white/5">
          <Settings2 className="w-3.5 h-3.5 text-neutral-500" />
          <select 
            value={quality}
            onChange={(e) => onChangeQuality(e.target.value as VideoQuality)}
            className="bg-transparent border-none rounded-lg text-xs py-2 focus:ring-0 outline-none cursor-pointer text-white/90 font-bold pr-2"
          >
            <option value="360p" className="bg-neutral-900">360p</option>
            <option value="720p" className="bg-neutral-900">720p</option>
            <option value="1080p" className="bg-neutral-900">1080p</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        {/* Reactions floating bar */}
        {showReactions && (
          <div className="absolute bottom-28 bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-1 shadow-2xl flex items-center gap-1">
            {REACTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => {
                  onToggleReactions();
                  // We'll call sendReaction from the parent
                  (window as any).sendMeetingReaction?.(emoji);
                }}
                className="p-2 hover:bg-white/10 rounded-xl text-xl hover:scale-125 transition-all"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMic}
            className={cn(
              "p-3.5 rounded-2xl transition-all duration-200",
              isMuted ? "bg-red-500 hover:bg-red-600" : "bg-neutral-800 hover:bg-neutral-700"
            )}
          >
            {isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
          </button>

          <button
            onClick={onToggleVideo}
            className={cn(
              "p-3.5 rounded-2xl transition-all duration-200",
              isVideoOff ? "bg-red-500 hover:bg-red-600" : "bg-neutral-800 hover:bg-neutral-700"
            )}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5 text-white" /> : <Video className="w-5 h-5 text-white" />}
          </button>

          <button
            onClick={onToggleHandRaise}
            className={cn(
              "p-3.5 rounded-2xl transition-all duration-200 shadow-lg",
              isHandRaised ? "bg-blue-600 text-white" : "bg-neutral-800 hover:bg-neutral-700 text-neutral-400"
            )}
            title="Raise Hand"
          >
            <Hand className={cn("w-5 h-5", isHandRaised && "fill-white")} />
          </button>

          <button
            onClick={onToggleReactions}
            className={cn(
              "p-3.5 rounded-2xl transition-all duration-200 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 font-bold",
              showReactions && "text-white bg-neutral-700"
            )}
            title="Reactions"
          >
            <Smile className="w-5 h-5" />
          </button>

          <button
            onClick={onToggleScreenShare}
            className={cn(
              "p-3.5 rounded-2xl transition-all duration-200",
              isScreenSharing ? "bg-emerald-500" : "bg-neutral-800 hover:bg-neutral-700"
            )}
            title="Share Screen"
          >
            <MonitorUp className="w-5 h-5 text-white" />
          </button>

          <button
            onClick={onLeave}
            className="ml-4 p-3.5 rounded-2xl bg-red-600 hover:bg-red-700 px-8 font-black uppercase tracking-widest text-[10px] text-white flex items-center gap-2 transition-all shadow-lg shadow-red-500/20"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="hidden sm:inline">Leave Room</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={onOpenSettings}
          className="p-3.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white transition-all duration-200"
          title="Settings"
        >
          <Settings2 className="w-5 h-5" />
        </button>
        <button 
          onClick={toggleChat}
          className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 px-4 py-3 rounded-2xl text-white transition-colors border border-white/5"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="hidden lg:inline text-xs font-bold uppercase tracking-wider">Chat</span>
        </button>
        <button 
          onClick={toggleCaptions}
          className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 px-4 py-3 rounded-2xl text-white transition-colors border border-white/5"
          title="Transcription"
        >
          <Subtitles className="w-4 h-4" />
          <span className="hidden lg:inline text-xs font-bold uppercase tracking-wider">Captions</span>
        </button>
        <button 
          onClick={toggleSidebar}
          className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 px-4 py-3 rounded-2xl text-white transition-colors border border-white/5"
        >
          <Users className="w-4 h-4" />
          <span className="text-xs font-bold">{participantCount}</span>
        </button>
      </div>
    </div>
  );
};

