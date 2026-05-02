import React, { useState } from 'react';
import { MonitorOff, ChevronDown, ChevronUp, Mic, MicOff, Video, VideoOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { User } from '@/types';

interface ScreenShareControlsProps {
  me: User | null;
  onStopSharing: () => void;
  onToggleMic: () => void;
  onToggleVideo: () => void;
}

export const ScreenShareControls: React.FC<ScreenShareControlsProps> = ({
  me,
  onStopSharing,
  onToggleMic,
  onToggleVideo
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  if (!me?.isScreenSharing || !isVisible) return null;

  return (
    <motion.div
      initial={{ y: -100, opacity: 0, x: '-50%' }}
      animate={{ y: 0, opacity: 1, x: '-50%' }}
      exit={{ y: -100, opacity: 0, x: '-50%' }}
      className="fixed top-6 left-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none"
    >
      <div className="flex flex-col items-center pointer-events-auto">
        <AnimatePresence mode="wait">
          {!isMinimized ? (
            <motion.div
              key="expanded"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-neutral-900/90 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(59,130,246,0.2)] flex items-center gap-2"
            >
              <div className="flex items-center gap-3 px-4 py-2 border-r border-white/10">
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-blue-400 animate-ping opacity-75" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">Live</span>
                  <span className="text-xs font-bold text-white/90">You are sharing your screen</span>
                </div>
              </div>

              <div className="flex items-center gap-1 p-1">
                <button
                  onClick={onToggleMic}
                  className={cn(
                    "p-2 rounded-xl transition-all hover:scale-105 active:scale-95",
                    me.isMuted ? "bg-red-500/20 text-red-400" : "bg-white/5 text-white/50 hover:text-white"
                  )}
                >
                  {me.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                  onClick={onToggleVideo}
                  className={cn(
                    "p-2 rounded-xl transition-all hover:scale-105 active:scale-95",
                    me.isVideoOff ? "bg-red-500/20 text-red-400" : "bg-white/5 text-white/50 hover:text-white"
                  )}
                >
                  {me.isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                </button>
              </div>

              <motion.button
                onClick={onStopSharing}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                animate={{ 
                  boxShadow: ["0 0 0px rgba(59,130,246,0)", "0 0 15px rgba(59,130,246,0.5)", "0 0 0px rgba(59,130,246,0)"]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 2, 
                  ease: "easeInOut" 
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 group"
              >
                <MonitorOff className="w-4 h-4 transition-transform group-hover:scale-110" />
                Stop Sharing
              </motion.button>

              <div className="flex items-center gap-1 px-1">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsVisible(false)}
                  className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-red-500/20 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="minimized"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={() => setIsMinimized(false)}
              className="bg-neutral-900 border border-blue-500/50 rounded-full px-4 py-2 shadow-2xl flex items-center gap-3 group hover:border-blue-400 transition-all"
            >
               <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-blue-400 animate-ping opacity-75" />
                </div>
              <span className="text-[10px] font-black text-white/50 group-hover:text-white uppercase tracking-widest">Sharing Screen</span>
              <ChevronDown className="w-3 h-3 text-white/30 group-hover:text-white" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
