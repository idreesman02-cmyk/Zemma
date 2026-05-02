import React, { useState } from 'react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { VideoTile } from '@/components/VideoTile';
import { Controls } from '@/components/Controls';
import { ParticipantSidebar } from '@/components/ParticipantSidebar';
import { ChatPanel } from '@/components/ChatPanel';
import { SettingsModal } from '@/components/SettingsModal';
import { ScreenShareControls } from '@/components/ScreenShareControls';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Lock, 
  Wifi, 
  WifiOff, 
  Camera, 
  Mic, 
  Settings2, 
  CheckCircle2, 
  Video, 
  MicOff, 
  CameraOff, 
  UserPlus, 
  X, 
  Check 
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { Poller } from '@/components/Poller';
import { Whiteboard } from '@/components/Whiteboard';

import { TranscriptPanel } from '@/components/TranscriptPanel';

interface MeetingRoomProps {
  roomId: string;
  name: string;
  initialPasscode?: string;
}

export const MeetingRoom: React.FC<MeetingRoomProps> = ({ roomId, name, initialPasscode }) => {
  const [activeTab, setActiveTab] = useState<'participants' | 'chat' | 'polls' | 'whiteboard' | 'captions' | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [passcode, setPasscode] = useState(initialPasscode || '');

  const {
    me,
    participants,
    localStream,
    remoteStreams,
    messages,
    transcripts,
    isTranscriptionEnabled,
    activeSpeakerId,
    isLocked,
    spotlightId,
    mediaError,
    networkStatus,
    availableDevices,
    selectedDevices,
    isJoined,
    isNoiseCancellationEnabled,
    isWaitingInLobby,
    lobbyParticipants,
    hasPasscode,
    join,
    quality,
    backgroundTarget,
    polls,
    whiteboardData,
    setVirtualBackground,
    toggleMic,
    toggleVideo,
    toggleScreenShare,
    switchDevice,
    refreshDevices,
    changeQuality,
    sendMessage,
    reactToMessage,
    muteAll,
    muteUser,
    stopVideoUser,
    promoteHost,
    kickUser,
    toggleSpotlight,
    toggleLock,
    admitUser,
    denyUser,
    toggleTranscription,
    toggleNoiseCancellation,
    sendReaction,
    toggleHandRaise,
    createPoll,
    votePoll,
    sendWhiteboardAction,
    leaveRoom
  } = useWebRTC(roomId, name);

  // Expose sendReaction to window for Controls to access via global
  (window as any).sendMeetingReaction = sendReaction;

  React.useEffect(() => {
    if (!isJoined) return;
    const interval = setInterval(() => {
      setMeetingDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isJoined]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const spotlightUser = spotlightId === me?.id ? me : participants.find(p => p.id === spotlightId);
  const otherParticipants = spotlightId 
    ? [me, ...participants].filter(p => p && p.id !== spotlightId)
    : [];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleTab = (tab: 'participants' | 'chat' | 'polls' | 'whiteboard' | 'captions') => {
    setActiveTab(prev => prev === tab ? null : tab);
  };

  const gridCols = participants.length + 1 <= 1 ? 'grid-cols-1' : 
                   participants.length + 1 <= 2 ? 'grid-cols-1 md:grid-cols-2' :
                   participants.length + 1 <= 4 ? 'grid-cols-2' :
                   participants.length + 1 <= 9 ? 'grid-cols-3' : 'grid-cols-4';

  const handleJoin = () => {
    join(passcode);
  };

  return (
    <div className="h-screen bg-black flex overflow-hidden font-sans select-none">
      <AnimatePresence>
        {!isJoined && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center p-6"
          >
            {isWaitingInLobby ? (
              <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-blue-600/10 rounded-full flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                  <Video className="w-10 h-10 text-blue-500" />
                </div>
                <div className="space-y-3">
                  <h1 className="text-white text-4xl font-black">Almost there...</h1>
                  <p className="text-neutral-500 text-lg max-w-md">The room is locked. We've notified the host that you're waiting in the lobby.</p>
                </div>
                <div className="flex items-center gap-3 bg-neutral-900 border border-white/5 py-3 px-6 rounded-2xl">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Waiting for host to admit you</span>
                </div>
                <button 
                  onClick={() => window.location.href = '/'}
                  className="text-neutral-500 hover:text-white text-sm font-bold uppercase tracking-widest transition-colors"
                >
                  Leave Lobby
                </button>
              </div>
            ) : (
              <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                {/* Left Side: Video Preview */}
                <div className="space-y-6">
                  <div className="aspect-video bg-neutral-900 rounded-[2.5rem] overflow-hidden border border-white/5 relative shadow-2xl group">
                    <VideoTile 
                      user={{ 
                        id: 'me', 
                        name, 
                        isMuted: me?.isMuted || false, 
                        isVideoOff: me?.isVideoOff || false, 
                        isHost: false, 
                        isScreenSharing: false,
                        isHandRaised: false,
                        activeReaction: null
                      }}
                      stream={localStream}
                      isMe
                      isNoiseCancellationEnabled={isNoiseCancellationEnabled}
                    />
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
                      <button 
                          onClick={() => toggleMic()}
                          className={cn(
                            "p-4 rounded-2xl transition-all active:scale-95 shadow-xl",
                            me?.isMuted ? "bg-red-500 hover:bg-red-600" : "bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/5 text-white"
                          )}
                        >
                          {me?.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                        </button>
                        <button 
                          onClick={() => toggleVideo()}
                          className={cn(
                            "p-4 rounded-2xl transition-all active:scale-95 shadow-xl",
                            me?.isVideoOff ? "bg-red-500 hover:bg-red-600" : "bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/5 text-white"
                          )}
                        >
                          {me?.isVideoOff ? <CameraOff className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
                        </button>
                    </div>
                  </div>
                </div>

                {/* Right Side: Join Controls */}
                <div className="space-y-8 text-center lg:text-left">
                  <div className="space-y-2">
                    <h1 className="text-white text-4xl lg:text-5xl font-black tracking-tight">Ready to join?</h1>
                    <p className="text-neutral-500 text-lg">Check your video and audio before you jump in.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="relative group">
                      <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 group-focus-within:text-blue-500 transition-colors" />
                      <input 
                        type="password"
                        placeholder="Meeting Passcode (Optional)"
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        className="w-full py-5 pl-14 pr-6 bg-white/5 border border-white/5 focus:border-blue-500/50 rounded-[2rem] text-white focus:outline-none transition-all placeholder:text-neutral-600"
                      />
                    </div>
                    <button 
                      onClick={handleJoin}
                      className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] text-xl font-bold transition-all shadow-[0_0_40px_rgba(37,99,235,0.3)] transform active:scale-[0.98]"
                    >
                      Join Meeting
                    </button>
                    <button 
                      onClick={() => {
                        refreshDevices();
                        setIsSettingsOpen(true);
                      }}
                      className="w-full py-5 bg-white/5 hover:bg-white/10 border border-white/5 text-white rounded-[2rem] text-lg font-medium transition-all flex items-center justify-center gap-3"
                    >
                      <Settings2 className="w-5 h-5" />
                      Settings
                    </button>
                  </div>

                  <div className="pt-4 flex items-center justify-center lg:justify-start gap-4">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-neutral-800" />
                      ))}
                    </div>
                    <p className="text-neutral-400 text-sm font-medium">
                      {participants.length > 0 ? `${participants.length} others already in the room` : 'You are the first one here'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col relative">
        {/* Top Indicators/Errors */}
        <div className="absolute top-6 left-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-neutral-900/40 backdrop-blur-xl border border-white/5 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-2xl pointer-events-auto">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span className="text-white/90 text-[10px] font-bold tracking-widest uppercase">Live • {roomId}</span>
              <div className="w-px h-3 bg-white/10 mx-1" />
              <span className="text-white/60 text-[10px] font-mono">{formatTime(meetingDuration)}</span>
            </div>
            
            <AnimatePresence>
              {copied && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-xl pointer-events-auto"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Copied to clipboard</span>
                </motion.div>
              )}
              {isLocked && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-orange-500/20 backdrop-blur-xl border border-orange-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-xl pointer-events-auto"
                >
                  <Lock className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-orange-400 text-[10px] font-bold uppercase tracking-wider">Locked</span>
                </motion.div>
              )}
              {me?.isHost && lobbyParticipants.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-blue-600/20 backdrop-blur-xl border border-blue-500/20 px-3 py-1.5 rounded-xl flex items-center gap-3 shadow-xl pointer-events-auto"
                >
                   <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                   <span className="text-blue-400 text-[10px] font-bold uppercase tracking-wider">{lobbyParticipants.length} Waiting in Lobby</span>
                   <div className="flex items-center gap-1">
                      <button 
                        onClick={() => admitUser(lobbyParticipants[0].id)}
                        className="p-1 hover:bg-blue-500/20 rounded-md text-blue-400 transition-colors"
                        title="Admit Next"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => denyUser(lobbyParticipants[0].id)}
                        className="p-1 hover:bg-red-500/20 rounded-md text-red-400 transition-colors"
                        title="Deny Next"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                   </div>
                </motion.div>
              )}
              {spotlightId && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-blue-500/20 backdrop-blur-xl border border-blue-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-xl pointer-events-auto"
                >
                  <Shield className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-blue-400 text-[10px] font-bold uppercase tracking-wider">Spotlight</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {networkStatus !== 'connected' && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  "self-start backdrop-blur-2xl border px-4 py-2.5 rounded-xl flex items-center gap-3 shadow-2xl pointer-events-auto",
                  networkStatus === 'reconnecting' ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                )}
              >
                {networkStatus === 'reconnecting' ? <Wifi className="w-4 h-4 animate-pulse" /> : <WifiOff className="w-4 h-4" />}
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold uppercase tracking-tight">
                    {networkStatus === 'reconnecting' ? 'Connection Unstable' : 'Disconnected'}
                  </span>
                  <span className="text-[10px] opacity-70">
                    {networkStatus === 'reconnecting' ? 'Attempting to reconnect...' : 'Check your internet connection.'}
                  </span>
                </div>
              </motion.div>
            )}

            {mediaError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  "self-start backdrop-blur-2xl border px-4 py-3 rounded-2xl flex items-center justify-between gap-6 shadow-2xl pointer-events-auto max-w-md",
                  mediaError.type === 'error' ? "bg-red-500/10 border-red-500/20 text-red-400" : 
                  mediaError.type === 'warning' ? "bg-orange-500/10 border-orange-500/20 text-orange-400" :
                  "bg-neutral-900 border-white/10 text-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full shrink-0", 
                    mediaError.type === 'error' ? "bg-red-500" : 
                    mediaError.type === 'warning' ? "bg-orange-500" : 
                    "bg-blue-500"
                  )} />
                  <p className="text-xs font-medium leading-relaxed">{mediaError.message}</p>
                </div>
                {mediaError.action && (
                  <button 
                    onClick={mediaError.action.onClick}
                    className={cn(
                      "shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all transform active:scale-95",
                      mediaError.type === 'error' ? "bg-red-500 text-white hover:bg-red-600" : "bg-white/10 text-white hover:bg-white/20"
                    )}
                  >
                    {mediaError.action.label}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Video Grid */}
        <main className="flex-1 p-8 pb-32 overflow-hidden flex items-center justify-center">
          <ScreenShareControls 
             me={me}
             onStopSharing={toggleScreenShare}
             onToggleMic={toggleMic}
             onToggleVideo={toggleVideo}
          />
          {spotlightId && spotlightUser ? (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="w-full h-full flex flex-col lg:flex-row gap-6 max-w-[1600px]"
             >
                {/* Spotlighted User */}
                 <div className="flex-[3] relative min-h-0">
                    <VideoTile 
                      user={spotlightUser}
                      stream={spotlightId === me?.id ? localStream : remoteStreams[spotlightId!]}
                      isMe={spotlightId === me?.id}
                      isActiveSpeaker={activeSpeakerId === (spotlightId === me?.id ? 'me' : spotlightId)}
                      isSpotlighted={true}
                      isNoiseCancellationEnabled={spotlightId === me?.id ? isNoiseCancellationEnabled : false}
                    />
                 </div>
                {/* Side Grid */}
                <div className="flex-1 overflow-y-auto lg:overflow-y-auto pr-2 flex flex-row lg:flex-col gap-4 lg:max-w-xs xl:max-w-md scrollbar-hide">
                  <AnimatePresence>
                    {otherParticipants.map((user) => user && (
                      <motion.div 
                        key={user.id} 
                        layout 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="w-64 lg:w-full shrink-0"
                      >
                        <VideoTile 
                          user={user}
                          stream={user.id === me?.id ? localStream : remoteStreams[user.id]}
                          isMe={user.id === me?.id}
                          isActiveSpeaker={activeSpeakerId === (user.id === me?.id ? 'me' : user.id)}
                          isSpotlighted={spotlightId === user.id}
                          isNoiseCancellationEnabled={user.id === me?.id ? isNoiseCancellationEnabled : false}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
             </motion.div>
          ) : (
            <motion.div 
              layout
              className={`grid ${gridCols} gap-6 max-w-7xl mx-auto h-full content-center w-full`}
            >
              <AnimatePresence mode="popLayout">
                {me && (
                  <motion.div
                    key="me"
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <VideoTile
                      user={me}
                      stream={localStream}
                      isMe
                      isActiveSpeaker={activeSpeakerId === 'me'}
                      isSpotlighted={spotlightId === me.id}
                      isNoiseCancellationEnabled={isNoiseCancellationEnabled}
                    />
                  </motion.div>
                )}
                {participants.map((user) => (
                  <motion.div
                    key={user.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <VideoTile
                      user={user}
                      stream={remoteStreams[user.id]}
                      isActiveSpeaker={activeSpeakerId === user.id}
                      isSpotlighted={spotlightId === user.id}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              {participants.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center p-12 text-center space-y-6">
                      <div className="w-20 h-20 bg-neutral-900 rounded-3xl flex items-center justify-center border border-neutral-800 animate-bounce">
                          <Shield className="w-10 h-10 text-emerald-500" />
                      </div>
                      <div className="space-y-2">
                          <h3 className="text-white text-2xl font-bold tracking-tight">You're the only one here</h3>
                          <p className="text-neutral-500 max-w-sm mx-auto leading-relaxed">
                              Invite your team members to join this meeting using the "Invite Link" below.
                          </p>
                      </div>
                  </div>
              )}
            </motion.div>
          )}
        </main>

        <Controls
          isMuted={me?.isMuted || false}
          isVideoOff={me?.isVideoOff || false}
          isScreenSharing={me?.isScreenSharing || false}
          isHandRaised={me?.isHandRaised || false}
          isHost={me?.isHost || false}
          isLocked={isLocked}
          quality={quality}
          onToggleMic={() => toggleMic()}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={toggleScreenShare}
          onToggleHandRaise={toggleHandRaise}
          onToggleReactions={() => setShowReactions(!showReactions)}
          onChangeQuality={changeQuality}
          onLeave={leaveRoom}
          onCopyLink={handleCopyLink}
          onToggleLock={toggleLock}
          onMuteAll={muteAll}
          participantCount={participants.length + 1}
          toggleSidebar={() => toggleTab('participants')}
          toggleChat={() => toggleTab('chat')}
          toggleCaptions={() => toggleTab('captions')}
          onOpenSettings={() => {
            refreshDevices();
            setIsSettingsOpen(true);
          }}
          showReactions={showReactions}
        />
      </div>

      {/* Side Panels */}
      <AnimatePresence>
        {activeTab === 'polls' && (
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            className="fixed top-0 right-0 w-96 h-[calc(100vh-6rem)] mt-4 mr-4 z-40 bg-neutral-900 border border-white/10 rounded-[2.5rem] shadow-2xl p-6 overflow-hidden flex flex-col"
          >
            <Poller 
              polls={polls}
              meId={me?.id || ''}
              isHost={me?.isHost || false}
              onCreatePoll={createPoll}
              onVote={votePoll}
            />
          </motion.div>
        )}

        {activeTab === 'whiteboard' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-xl p-12 flex flex-col items-center"
          >
            <div className="w-full max-w-6xl h-full flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Collaborative Whiteboard</h2>
                <button 
                  onClick={() => setActiveTab(null)}
                  className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-xl text-white font-bold"
                >
                  Close
                </button>
              </div>
              <div className="flex-1">
                <Whiteboard data={whiteboardData} onAction={sendWhiteboardAction} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        availableDevices={availableDevices}
        selectedDevices={selectedDevices}
        onSwitchDevice={switchDevice}
        onRefreshDevices={refreshDevices}
        localStream={localStream}
        backgroundTarget={backgroundTarget}
        onSetBackground={setVirtualBackground}
        isNoiseCancellationEnabled={isNoiseCancellationEnabled}
        onToggleNoiseCancellation={toggleNoiseCancellation}
      />

      <ParticipantSidebar
        me={me}
        participants={participants}
        isLocked={isLocked}
        isOpen={activeTab === 'participants' || activeTab === 'polls' || activeTab === 'whiteboard'}
        activeTab={activeTab === 'chat' ? 'participants' : (activeTab || 'participants')}
        onTabChange={(tab) => setActiveTab(tab)}
        onKick={kickUser}
        onMuteUser={muteUser}
        onMuteAll={muteAll}
        onStopVideo={stopVideoUser}
        onPromote={promoteHost}
        onSpotlight={toggleSpotlight}
        spotlightId={spotlightId}
      />

      <ChatPanel
        me={me}
        messages={messages}
        onSendMessage={sendMessage}
        onReact={reactToMessage}
        isOpen={activeTab === 'chat'}
        onClose={() => setActiveTab(null)}
      />

      <div className={cn(
        "fixed inset-y-0 right-0 w-80 bg-neutral-900 border-l border-white/5 transition-transform duration-300 transform z-50",
        activeTab === 'captions' ? "translate-x-0" : "translate-x-full"
      )}>
        <TranscriptPanel
          transcripts={transcripts}
          isTranscriptionEnabled={isTranscriptionEnabled}
          onToggleTranscription={toggleTranscription}
        />
        <button 
          onClick={() => setActiveTab(null)}
          className="absolute left-0 top-1/2 -translate-x-full bg-neutral-900 hover:bg-neutral-800 p-4 rounded-l-2xl border-y border-l border-white/5"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
};
