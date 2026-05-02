import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mic, Wifi, CheckCircle2, AlertCircle, Loader2, Play, Video as VideoIcon, Volume2, Speaker } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestState {
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
}

interface PreJoinTestProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const PreJoinTest: React.FC<PreJoinTestProps> = ({ onComplete, onCancel }) => {
  const [tests, setTests] = useState<{
    video: TestState;
    audio: TestState;
    network: TestState;
    speakers: TestState;
  }>({
    video: { status: 'idle', message: '' },
    audio: { status: 'idle', message: '' },
    network: { status: 'idle', message: '' },
    speakers: { status: 'idle', message: 'Ready to test' }
  });
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playTestSound = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start();
      oscillator.stop(ctx.currentTime + 1);

      setTests(prev => ({
        ...prev,
        speakers: { status: 'success', message: 'Test sound played' }
      }));
    } catch (err) {
      setTests(prev => ({
        ...prev,
        speakers: { status: 'error', message: 'Audio playback failed' }
      }));
    }
  };

  const runDiagnostics = async () => {
    // 1. Video & Audio Check
    setTests(prev => ({ 
      ...prev, 
      video: { status: 'loading', message: 'Checking camera...' },
      audio: { status: 'loading', message: 'Checking microphone...' }
    }));

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;

      setTests(prev => ({ 
        ...prev, 
        video: { status: 'success', message: 'Camera detected and functional' },
        audio: { status: 'success', message: 'Microphone detected and functional' }
      }));
    } catch (err: any) {
      setTests(prev => ({ 
        ...prev, 
        video: { status: 'error', message: 'Camera access denied or not found' },
        audio: { status: 'error', message: 'Microphone access denied or not found' }
      }));
    }

    // 2. Network Check (Simulated Ping/Handshake)
    setTests(prev => ({ ...prev, network: { status: 'loading', message: 'Testing connectivity...' } }));
    
    try {
      const start = Date.now();
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/health', true);
      
      const pingPromise = new Promise((resolve, reject) => {
        xhr.onload = () => resolve(xhr.status);
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send();
      });

      await pingPromise;
      const latency = Date.now() - start;
      
      setTests(prev => ({ 
        ...prev, 
        network: { 
          status: 'success', 
          message: `Connected. Latency: ${latency}ms (${latency < 100 ? 'Excellent' : 'Good'})` 
        } 
      }));
    } catch (err) {
      setTests(prev => ({ 
        ...prev, 
        network: { status: 'error', message: 'Failed to reach signaling server. Check your internet.' } 
      }));
    }
  };

  useEffect(() => {
    runDiagnostics();
    return () => {
      stream?.getTracks().forEach(t => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const allPassed = (Object.values(tests) as TestState[]).every(t => t.status === 'success');
  const anyLoading = (Object.values(tests) as TestState[]).some(t => t.status === 'loading');

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
      <div className="bg-neutral-900 border border-neutral-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
        {/* Preview Side */}
        <div className="w-full md:w-1/2 bg-neutral-950 aspect-video md:aspect-auto flex items-center justify-center relative">
          {stream ? (
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="text-neutral-700 flex flex-col items-center">
               <Camera className="w-12 h-12 mb-4" />
               <p className="text-sm">Video Feed Unavailable</p>
            </div>
          )}
          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-lg text-white text-[10px] font-bold uppercase tracking-wider">
            Diagnostic View
          </div>
        </div>

        {/* Info Side */}
        <div className="w-full md:w-1/2 p-8 flex flex-col">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Ready to join?</h2>
            <p className="text-neutral-500 text-sm">We're checking your hardware and connection for the best experience.</p>
          </div>

          <div className="space-y-6 flex-1 overflow-y-auto pr-2 scrollbar-hide">
             <TestItem icon={VideoIcon} title="Video Output" {...tests.video} />
             <TestItem icon={Mic} title="Audio Input" {...tests.audio} />
             <TestItem 
               icon={Speaker} 
               title="Audio Output" 
               {...tests.speakers} 
               action={
                 <button 
                  onClick={(e) => { e.stopPropagation(); playTestSound(); }}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[10px] font-bold text-white uppercase rounded-md border border-white/10 transition-colors"
                 >
                   Test
                 </button>
               }
             />
             <TestItem icon={Wifi} title="Network Stability" {...tests.network} />
          </div>

          <div className="mt-8 flex gap-3">
             <button 
               onClick={onCancel}
               className="flex-1 px-6 py-3 rounded-xl bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white transition-all font-semibold"
             >
               Back
             </button>
             <button 
               disabled={!allPassed || anyLoading}
               onClick={onComplete}
               className="flex-[2] px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white font-bold flex items-center justify-center gap-2"
             >
               Join Meeting
               <Play className="w-4 h-4 fill-current" />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TestItem = ({ icon: Icon, title, status, message, action }: any) => (
  <div className="flex items-start gap-4">
    <div className={cn(
      "p-2.5 rounded-xl border",
      status === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
      status === 'error' ? "bg-red-500/10 border-red-500/20 text-red-500" :
      "bg-neutral-800 border-neutral-700 text-neutral-500"
    )}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-white text-sm font-semibold">{title}</h4>
        <div className="flex items-center gap-2">
          {action}
          {status === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-600" />}
          {status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
          {status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
        </div>
      </div>
      <p className="text-neutral-500 text-xs truncate">{message || 'Waiting to start...'}</p>
    </div>
  </div>
);
