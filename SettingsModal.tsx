import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Mic, Settings2, RefreshCw, AlertCircle, Loader2, Check, Sparkles, Image as ImageIcon, Upload, Ban } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { BackgroundTarget } from '@/lib/backgroundProcessor';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableDevices: { audio: MediaDeviceInfo[]; video: MediaDeviceInfo[] };
  selectedDevices: { audioId: string; videoId: string };
  onSwitchDevice: (kind: 'audio' | 'video', deviceId: string) => Promise<void> | void;
  onRefreshDevices: () => void;
  localStream: MediaStream | null;
  backgroundTarget: BackgroundTarget;
  onSetBackground: (target: BackgroundTarget) => void;
  isNoiseCancellationEnabled: boolean;
  onToggleNoiseCancellation: () => void;
}

const PRESET_BACKGROUNDS = [
  { id: 'none', label: 'None', icon: Ban },
  { id: 'blur', label: 'Blur', icon: Sparkles },
  { id: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1000', label: 'Office' },
  { id: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=1000', label: 'Nature' },
  { id: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=1000', label: 'Studio' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  availableDevices,
  selectedDevices,
  onSwitchDevice,
  onRefreshDevices,
  localStream,
  backgroundTarget,
  onSetBackground,
  isNoiseCancellationEnabled,
  onToggleNoiseCancellation
}) => {
  const [activeTab, setActiveTab] = useState<'devices' | 'background'>('devices');
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccessId(null);
      setSwitchingId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000); // Auto-clear after 8s
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (!isOpen || !localStream || activeTab !== 'devices') return;

    let audioContext: AudioContext;
    let analyzer: AnalyserNode;
    let source: MediaStreamAudioSourceNode;
    let animationFrame: number;

    const setupAudio = () => {
      try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyzer = audioContext.createAnalyser();
        source = audioContext.createMediaStreamSource(localStream);
        source.connect(analyzer);
        analyzer.fftSize = 256;

        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateLevel = () => {
          analyzer.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          setAudioLevel(average);
          animationFrame = requestAnimationFrame(updateLevel);
        };

        updateLevel();
      } catch (err) {
        console.error("Failed to setup audio visualization:", err);
      }
    };

    setupAudio();

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (audioContext) audioContext.close();
    };
  }, [isOpen, localStream]);

  const handleSwitch = async (kind: 'audio' | 'video', deviceId: string) => {
    if (switchingId || selectedDevices[kind === 'audio' ? 'audioId' : 'videoId'] === deviceId) return;
    
    setSwitchingId(deviceId);
    setError(null);
    setSuccessId(null);
    
    try {
      await onSwitchDevice(kind, deviceId);
      setSuccessId(deviceId);
      setTimeout(() => setSuccessId(null), 3000);
    } catch (err: any) {
      console.error("Device switch error:", err);
      let message = "Failed to access device. It might be in use by another application.";
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = "Permission denied. Please check your browser's site settings for camera/mic access.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = "The selected device was not found. Please ensure it's plugged in.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        message = "The device is currently occupied by another program (like another browser tab or Zoom).";
      } else if (err.name === 'OverconstrainedError') {
        message = "The device doesn't support the requested quality settings.";
      } else if (err.message && typeof err.message === 'string') {
        message = err.message;
      }
      
      setError({ id: deviceId, message });
    } finally {
      setSwitchingId(null);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      await onRefreshDevices();
    } catch (err) {
      setError({ id: 'refresh', message: "Failed to update device list. Please try again." });
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        onSetBackground(url);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="pt-6 px-6 border-b border-white/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
                    <Settings2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold tracking-tight">Meeting Settings</h3>
                    <p className="text-neutral-500 text-xs">Configure your media and background</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-white/5 rounded-xl text-neutral-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('devices')}
                  className={cn(
                    "pb-3 text-sm font-bold transition-all relative",
                    activeTab === 'devices' ? "text-white" : "text-neutral-500 hover:text-neutral-300"
                  )}
                >
                  Devices
                  {activeTab === 'devices' && (
                    <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('background')}
                  className={cn(
                    "pb-3 text-sm font-bold transition-all relative",
                    activeTab === 'background' ? "text-white" : "text-neutral-500 hover:text-neutral-300"
                  )}
                >
                  Background
                  {activeTab === 'background' && (
                    <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-8 overflow-y-auto max-h-[65vh] scrollbar-hide">
              <AnimatePresence>
                {error && (error.id === 'refresh' || !availableDevices.video.find(d => d.deviceId === error.id) && !availableDevices.audio.find(d => d.deviceId === error.id)) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-400">Settings Error</p>
                      <p className="text-xs text-red-500/80 leading-relaxed">{error.message}</p>
                    </div>
                    <button 
                      onClick={() => setError(null)}
                      className="ml-auto text-neutral-500 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {activeTab === 'devices' ? (
                <>
                  {/* Camera Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-neutral-300 font-medium text-sm">
                        <Camera className="w-4 h-4 text-emerald-400" />
                        <span>Camera</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {availableDevices.video.length > 0 ? (
                        availableDevices.video.map((device) => {
                          const isSelected = selectedDevices.videoId === device.deviceId;
                          const isSwitching = switchingId === device.deviceId;
                          const isSuccess = successId === device.deviceId;
                          const hasError = error?.id === device.deviceId;

                          return (
                            <div key={device.deviceId} className="space-y-1">
                              <button
                                disabled={!!switchingId}
                                onClick={() => handleSwitch('video', device.deviceId)}
                                className={cn(
                                  "w-full p-3.5 rounded-2xl border text-left transition-all group flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed",
                                  isSelected
                                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                                    : isSuccess
                                      ? "bg-blue-500/10 border-blue-500/50 text-blue-400"
                                      : hasError
                                        ? "bg-red-500/10 border-red-500/50 text-red-400"
                                        : "bg-white/5 border-transparent text-neutral-400 hover:bg-white/10 hover:text-white"
                                )}
                              >
                                <div className="flex items-center gap-3 truncate pr-4">
                                  {isSwitching ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
                                  ) : isSelected ? (
                                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                  ) : isSuccess ? (
                                    <Check className="w-4 h-4 text-blue-400 shrink-0" />
                                  ) : hasError ? (
                                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                                  ) : null}
                                  <span className="text-sm font-medium truncate">{device.label || `Camera ${device.deviceId.slice(0, 5)}`}</span>
                                </div>
                                {isSelected && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                                )}
                              </button>
                              {hasError && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="px-4 py-2 bg-red-500/5 border border-red-500/10 rounded-xl"
                                >
                                  <p className="text-[10px] text-red-400 font-medium leading-relaxed">
                                    {error.message}
                                  </p>
                                  <button 
                                    onClick={() => handleSwitch('video', device.deviceId)}
                                    className="mt-1 text-[9px] text-white font-bold underline decoration-white/20 hover:decoration-white transition-all uppercase tracking-tighter"
                                  >
                                    Try again
                                  </button>
                                </motion.div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
                          No camera devices found.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Microphone Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-neutral-300 font-medium text-sm">
                        <Mic className="w-4 h-4 text-blue-400" />
                        <span>Microphone</span>
                      </div>
                      
                      {/* Volume Meter */}
                      <div className="flex items-center gap-1 h-2 w-24 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          animate={{ width: `${Math.min(100, (audioLevel / 128) * 100)}%` }}
                          transition={{ type: "spring", bounce: 0, duration: 0.1 }}
                          className={cn(
                            "h-full transition-colors",
                            audioLevel > 100 ? "bg-red-500" : "bg-blue-400"
                          )}
                        />
                      </div>
                    </div>

                    {/* AI Noise Cancellation Toggle */}
                    <button
                      onClick={onToggleNoiseCancellation}
                      className={cn(
                        "w-full p-4 rounded-2xl border transition-all flex items-center justify-between group",
                        isNoiseCancellationEnabled 
                          ? "bg-purple-500/10 border-purple-500/50 text-purple-400" 
                          : "bg-white/5 border-transparent text-neutral-400 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-xl transition-colors",
                          isNoiseCancellationEnabled ? "bg-purple-500/20" : "bg-white/5"
                        )}>
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold">AI Noise Suppression</p>
                          <p className="text-[10px] text-neutral-500 group-hover:text-neutral-400 transition-colors">Advanced voice focus & background removal</p>
                        </div>
                      </div>
                      <div className={cn(
                        "w-10 h-6 rounded-full relative transition-colors",
                        isNoiseCancellationEnabled ? "bg-purple-500" : "bg-neutral-800"
                      )}>
                        <motion.div 
                          animate={{ x: isNoiseCancellationEnabled ? 18 : 2 }}
                          className="absolute top-1 left-0 w-4 h-4 rounded-full bg-white shadow-sm"
                        />
                      </div>
                    </button>

                    <div className="space-y-2">
                      {availableDevices.audio.length > 0 ? (
                        availableDevices.audio.map((device) => {
                          const isSelected = selectedDevices.audioId === device.deviceId;
                          const isSwitching = switchingId === device.deviceId;
                          const isSuccess = successId === device.deviceId;
                          const hasError = error?.id === device.deviceId;

                          return (
                            <div key={device.deviceId} className="space-y-1">
                              <button
                                disabled={!!switchingId}
                                onClick={() => handleSwitch('audio', device.deviceId)}
                                className={cn(
                                  "w-full p-3.5 rounded-2xl border text-left transition-all group flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed",
                                  isSelected
                                    ? "bg-blue-500/10 border-blue-500/50 text-blue-400"
                                    : isSuccess
                                      ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                                      : hasError
                                        ? "bg-red-500/10 border-red-500/50 text-red-400"
                                        : "bg-white/5 border-transparent text-neutral-400 hover:bg-white/10 hover:text-white"
                                )}
                              >
                                <div className="flex items-center gap-3 truncate pr-4">
                                  {isSwitching ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
                                  ) : isSelected ? (
                                    <Check className="w-4 h-4 text-blue-400 shrink-0" />
                                  ) : isSuccess ? (
                                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                  ) : hasError ? (
                                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                                  ) : null}
                                  <span className="text-sm font-medium truncate">{device.label || `Microphone ${device.deviceId.slice(0, 5)}`}</span>
                                </div>
                                {isSelected && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
                                )}
                              </button>
                              {hasError && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="px-4 py-2 bg-red-500/5 border border-red-500/10 rounded-xl"
                                >
                                  <p className="text-[10px] text-red-400 font-medium leading-relaxed">
                                    {error.message}
                                  </p>
                                  <button 
                                    onClick={() => handleSwitch('audio', device.deviceId)}
                                    className="mt-1 text-[9px] text-white font-bold underline decoration-white/20 hover:decoration-white transition-all uppercase tracking-tighter"
                                  >
                                    Try again
                                  </button>
                                </motion.div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
                          No microphone devices found.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-neutral-300 font-medium text-sm">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Virtual Background</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {PRESET_BACKGROUNDS.map((bg) => {
                      const isSelected = backgroundTarget === bg.id;
                      const Icon = bg.icon;

                      return (
                        <button
                          key={bg.id}
                          onClick={() => onSetBackground(bg.id as BackgroundTarget)}
                          className={cn(
                            "group relative aspect-video rounded-2xl overflow-hidden border-2 transition-all",
                            isSelected ? "border-blue-500" : "border-transparent hover:border-white/20"
                          )}
                        >
                          {Icon ? (
                             <div className="absolute inset-0 bg-neutral-800 flex flex-col items-center justify-center gap-2">
                               <Icon className={cn("w-6 h-6", isSelected ? "text-blue-400" : "text-neutral-500")} />
                               <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{bg.label}</span>
                             </div>
                          ) : (
                            <img src={bg.id} alt={bg.label} className="w-full h-full object-cover" />
                          )}
                          
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                          
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                             <span className="text-[10px] font-bold text-white uppercase tracking-widest">{bg.label}</span>
                          </div>
                        </button>
                      );
                    })}

                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-video rounded-2xl border-2 border-dashed border-white/10 hover:border-white/30 transition-all flex flex-col items-center justify-center gap-2 bg-white/5"
                    >
                      <Upload className="w-6 h-6 text-neutral-500" />
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Upload Custom</span>
                    </button>
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-white/5 border-t border-white/5 flex items-center justify-between">
              {activeTab === 'devices' ? (
                <button 
                  onClick={handleRefresh}
                  className="flex items-center gap-2 text-neutral-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors"
                  disabled={isRefreshing}
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
                  Refresh Devices
                </button>
              ) : (
                <div className="flex items-center gap-2 text-neutral-500 text-[10px] font-medium uppercase tracking-wider">
                  <ImageIcon className="w-3 h-3" />
                  Select to apply instantly
                </div>
              )}
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-white text-black rounded-xl text-sm font-bold tracking-tight hover:bg-neutral-200 transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

