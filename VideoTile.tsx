import React, { useEffect, useRef } from 'react';
import { MicOff, Crown, Volume2, Monitor, Star, Hand, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { User } from '@/types';
import { motion, AnimatePresence } from 'motion/react';

interface VideoTileProps {
  user: User;
  stream: MediaStream | null;
  isMe?: boolean;
  isActiveSpeaker?: boolean;
  isSpotlighted?: boolean;
  isNoiseCancellationEnabled?: boolean;
}

export const VideoTile: React.FC<VideoTileProps> = ({ user, stream, isMe, isActiveSpeaker, isSpotlighted, isNoiseCancellationEnabled }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={cn(
      "relative aspect-video bg-neutral-800 rounded-2xl overflow-hidden shadow-2xl transition-all duration-500",
      isActiveSpeaker 
        ? "ring-4 ring-emerald-500/50 scale-[1.02] z-10 shadow-[0_0_30px_rgba(16,185,129,0.3)]" 
        : user.isScreenSharing
          ? "ring-4 ring-blue-500/50 scale-[1.01] z-10 shadow-[0_0_25px_rgba(59,130,246,0.2)]"
          : "ring-1 ring-white/10"
    )}>
      {user.isVideoOff && !user.isScreenSharing ? (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
          <div className="w-24 h-24 rounded-full bg-neutral-800 flex items-center justify-center text-3xl font-bold text-white border-2 border-neutral-700">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          muted={isMe}
          playsInline
          className={cn(
            "w-full h-full object-cover",
            isMe && !user.isScreenSharing && "scale-x-[-1]" // Mirror local video only if not screen sharing
          )}
        />
      )}

      {/* Info Overlay */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
          {user.isHost && <Crown className="w-3.5 h-3.5 text-yellow-500" />}
          <span className="text-white text-xs font-semibold truncate max-w-[120px]">
            {user.name} {isMe && "(You)"}
          </span>
          {user.isMuted && <MicOff className="w-3.5 h-3.5 text-red-400" />}
          {user.isScreenSharing && <Monitor className="w-3.5 h-3.5 text-blue-400" />}
          {isMe && isNoiseCancellationEnabled && <Sparkles className="w-3.5 h-3.5 text-purple-400" />}
        </div>

        <div className="flex flex-col gap-2 items-end">
          <AnimatePresence>
            {user.isHandRaised && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: -10 }}
                className="px-2.5 py-1 bg-blue-600 rounded-md flex items-center gap-1.5 shadow-lg"
              >
                <Hand className="w-3 h-3 text-white fill-white" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Hand Raised</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isSpotlighted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: 10 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  x: 0,
                }}
                exit={{ opacity: 0, scale: 0.8, x: 10 }}
                className="px-2.5 py-1 bg-yellow-500 rounded-md flex items-center gap-1.5 shadow-lg"
              >
                <Star className="w-3 h-3 text-white fill-white" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Spotlighted</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {user.isScreenSharing && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="px-2 py-1 bg-blue-600 rounded-md flex items-center gap-1.5 shadow-lg"
              >
                <Monitor className="w-3 h-3 text-white" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Sharing Screen</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isActiveSpeaker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: 10 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  x: 0,
                  backgroundColor: ['#10b981', '#059669', '#10b981'],
                  boxShadow: [
                    '0 0 0px rgba(16, 185, 129, 0)',
                    '0 0 15px rgba(16, 185, 129, 0.4)',
                    '0 0 0px rgba(16, 185, 129, 0)'
                  ]
                }}
                transition={{
                  layout: { duration: 0.3 },
                  backgroundColor: { repeat: Infinity, duration: 2, ease: "linear" },
                  boxShadow: { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
                }}
                exit={{ opacity: 0, scale: 0.8, x: 10 }}
                className="px-2.5 py-1 bg-emerald-500 rounded-md flex items-center gap-1.5 shadow-lg relative overflow-hidden"
              >
                <div className="flex items-end gap-[2px] h-3">
                  {[1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ 
                        height: ["25%", i % 2 === 0 ? "80%" : "100%", "25%"],
                        opacity: [0.6, 1, 0.6]
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 0.4 + (i * 0.1), 
                        delay: i * 0.05,
                        ease: "easeInOut"
                      }}
                      className="w-[2px] bg-white rounded-full bg-gradient-to-t from-white/50 to-white"
                    />
                  ))}
                </div>
                <span className="text-[10px] font-black text-white uppercase tracking-widest drop-shadow-sm">Speaking</span>
                
                {/* Subtle sheen highlight */}
                <motion.div 
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] pointer-events-none"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Floating Reaction */}
      <AnimatePresence>
        {user.activeReaction && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.5 }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              y: [-20, -100, -120, -150],
              scale: [0.5, 1.5, 1.5, 1],
              x: [0, 20, -20, 0]
            }}
            transition={{ duration: 3, ease: "easeOut" }}
            className="absolute left-1/2 bottom-1/4 text-4xl pointer-events-none select-none z-50 transform -translate-x-1/2"
          >
            {user.activeReaction}
          </motion.div>
        )}
      </AnimatePresence>

      {/* States glow overlay */}
      <AnimatePresence>
        {isActiveSpeaker && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none border-2 border-emerald-500/30 rounded-2xl animate-pulse z-30" 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {user.isScreenSharing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0.4, 0.8, 0.4],
              scale: [1, 1.005, 1],
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 3, 
              ease: "easeInOut" 
            }}
            className="absolute inset-0 pointer-events-none border-4 border-blue-500/40 rounded-2xl z-30 shadow-[inset_0_0_20px_rgba(59,130,246,0.2)]"
          />
        )}
      </AnimatePresence>
    </div>

  );
};
