import React, { useState } from 'react';
import { User } from '@/types';
import { Shield, Crown, MicOff, MoreVertical, UserMinus, VideoOff, ArrowUpDown, Star, Users, MessageSquare, BarChart3, Palette, Hand } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  me: User | null;
  participants: User[];
  isLocked: boolean;
  spotlightId: string | null;
  onKick?: (id: string) => void;
  onMuteUser?: (id: string) => void;
  onMuteAll?: () => void;
  onStopVideo?: (id: string) => void;
  onPromote?: (id: string) => void;
  onSpotlight?: (id: string | null) => void;
  isOpen: boolean;
  activeTab: 'participants' | 'chat' | 'polls' | 'whiteboard';
  onTabChange: (tab: 'participants' | 'chat' | 'polls' | 'whiteboard') => void;
}

type SortOption = 'name' | 'role' | 'hand';

export const ParticipantSidebar: React.FC<SidebarProps> = ({ 
  me, 
  participants, 
  isLocked, 
  spotlightId,
  onKick, 
  onMuteUser,
  onMuteAll,
  onStopVideo,
  onPromote,
  onSpotlight,
  isOpen,
  activeTab,
  onTabChange
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredParticipants = participants.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedParticipants = [...filteredParticipants].sort((a, b) => {
    if (sortBy === 'hand') {
      if (a.isHandRaised && !b.isHandRaised) return -1;
      if (!a.isHandRaised && b.isHandRaised) return 1;
    }
    if (sortBy === 'role') {
      if (a.isHost && !b.isHost) return -1;
      if (!a.isHost && b.isHost) return 1;
    }
    return a.name.localeCompare(b.name);
  });

  const TABS = [
    { id: 'participants', icon: Users, label: 'People' },
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'polls', icon: BarChart3, label: 'Polls' },
    { id: 'whiteboard', icon: Palette, label: 'Board' },
  ] as const;

  return (
    <div className="w-80 bg-neutral-900 border-l border-neutral-800 h-full flex flex-col z-40 transition-all">
      {/* Tab Switcher */}
      <div className="flex border-b border-neutral-800 bg-black/20">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex-1 p-4 flex flex-col items-center gap-1.5 transition-all text-[10px] font-black uppercase tracking-tighter",
              activeTab === tab.id ? "text-blue-500 bg-blue-500/5 border-b-2 border-blue-500" : "text-neutral-500 hover:text-white"
            )}
          >
            <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-blue-500" : "text-neutral-500")} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'participants' && (
        <>
          <div className="p-6 border-b border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                Participants
                <span className="bg-neutral-800 px-2 py-0.5 rounded text-sm text-neutral-400">
                  {participants.length + 1}
                </span>
              </h2>
              <div className="flex items-center gap-2">
                {me?.isHost && (
                  <button 
                    onClick={onMuteAll}
                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors group"
                    title="Mute Everyone"
                  >
                    <MicOff className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </button>
                )}
                {isLocked && <Shield className="w-4 h-4 text-orange-500" />}
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input 
                  type="text"
                  placeholder="Find someone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSortBy('name')}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                    sortBy === 'name' 
                      ? "bg-blue-500/10 border-blue-500/50 text-blue-400" 
                      : "bg-neutral-800/50 border-transparent text-neutral-500 hover:text-white"
                  )}
                >
                  Name
                </button>
                <button
                  onClick={() => setSortBy('hand')}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                    sortBy === 'hand'
                      ? "bg-orange-500/10 border-orange-500/50 text-orange-400"
                      : "bg-neutral-800/50 border-transparent text-neutral-500 hover:text-white"
                  )}
                >
                  Raised
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pt-4">
            <div className="space-y-1">
              {/* Me */}
              {me && (
                 <div className="flex items-center justify-between p-3 rounded-xl hover:bg-neutral-800/50 group transition-colors relative overflow-hidden">
                 {me.isHandRaised && <div className="absolute inset-y-0 left-0 w-1 bg-blue-500" />}
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold relative">
                     {me.name.charAt(0).toUpperCase()}
                     {me.isHandRaised && (
                       <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-0.5 border-2 border-neutral-900">
                         <Hand className="w-2.5 h-2.5 text-white" />
                       </div>
                     )}
                   </div>
                   <div>
                      <div className="text-white text-sm font-semibold flex items-center gap-1">
                        {me.name} (Me)
                        {me.isHost && <Crown className="w-3 h-3 text-yellow-500" />}
                      </div>
                      <div className="text-white/40 text-xs mt-0.5">Connected</div>
                   </div>
                 </div>
                 <div className="flex items-center gap-1.5 text-neutral-500">
                    {me.isMuted && <MicOff className="w-3.5 h-3.5 text-red-500" />}
                 </div>
               </div>
              )}

              {/* Others */}
              {sortedParticipants.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-neutral-800/50 group transition-colors relative overflow-hidden">
                  {user.isHandRaised && <div className="absolute inset-y-0 left-0 w-1 bg-blue-500" />}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center text-white font-bold relative">
                      {user.name.charAt(0).toUpperCase()}
                      {user.isHandRaised && (
                        <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-0.5 border-2 border-neutral-900">
                          <Hand className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                       <div className="text-white text-sm font-semibold flex items-center gap-1">
                         {user.name}
                         {user.isHost && <Crown className="w-3 h-3 text-yellow-500" />}
                       </div>
                       <div className="text-white/40 text-xs mt-0.5">Member</div>
                    </div>
                  </div>
                  
                  <div className={cn(
                    "flex items-center gap-1.5 transition-opacity",
                    me?.isHost ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}>
                    {user.isMuted ? (
                      <MicOff className="w-3.5 h-3.5 text-red-500 mr-2" />
                    ) : (
                      me?.isHost && !user.isHost && (
                        <button 
                          onClick={() => onMuteUser?.(user.id)}
                          className="p-1.5 hover:bg-neutral-800 rounded-md text-neutral-400 hover:text-white transition-colors"
                          title="Mute for all"
                        >
                          <MicOff className="w-4 h-4" />
                        </button>
                      )
                    )}

                    {me?.isHost && (
                      <button 
                        onClick={() => onSpotlight?.(user.id)}
                        className={cn(
                          "p-1.5 rounded-md transition-all",
                          spotlightId === user.id ? "bg-yellow-500 text-white" : "hover:bg-neutral-800 text-neutral-400 hover:text-white"
                        )}
                        title={spotlightId === user.id ? "Remove spotlight" : "Spotlight for all"}
                      >
                        <Star className={cn("w-4 h-4", spotlightId === user.id && "fill-white")} />
                      </button>
                    )}

                    {me?.isHost && !user.isHost && (
                      <>
                        <button 
                          onClick={() => onPromote?.(user.id)}
                          className="p-1.5 hover:bg-neutral-800 rounded-md text-neutral-400 hover:text-white transition-colors"
                          title="Make Host"
                        >
                          <Crown className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onStopVideo?.(user.id)}
                          className="p-1.5 hover:bg-neutral-800 rounded-md text-neutral-400 hover:text-white transition-colors"
                          title="Stop video for all"
                        >
                          <VideoOff className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onKick?.(user.id)}
                          className="p-1.5 hover:bg-red-500/20 rounded-md text-neutral-500 hover:text-red-500 transition-colors"
                          title="Kick user"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab !== 'participants' && (
        <div className="flex-1 overflow-hidden p-6">
          {/* Content for Polls/Whiteboard will be rendered in Parent or here if we pass props */}
          <div className="text-center py-12">
             <p className="text-neutral-500 text-sm">Switching to full-view mode...</p>
          </div>
        </div>
      )}

      <div className="p-6 bg-neutral-900 border-t border-neutral-800">
        <div className="bg-neutral-800/50 p-4 rounded-2xl flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
           <p className="text-white/60 text-xs leading-relaxed italic">
             Secure Session • {activeTab}
           </p>
        </div>
      </div>
    </div>
  );
};

