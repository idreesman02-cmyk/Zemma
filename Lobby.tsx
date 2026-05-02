import React, { useState } from 'react';
import { Video, Keyboard, ArrowRight, ShieldCheck, Globe } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface LobbyProps {
  onJoin: (roomId: string, name: string, passcode: string) => void;
  initialRoomId?: string;
}

export const Lobby: React.FC<LobbyProps> = ({ onJoin, initialRoomId }) => {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState(initialRoomId || '');
  const [passcode, setPasscode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onJoin(roomId || uuidv4(), name, passcode);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
            <Video className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">MeetLite <span className="text-emerald-500 font-extrabold italic">PRO</span></h1>
        </div>
        <div className="hidden sm:flex items-center gap-8 text-neutral-400 text-sm font-medium">
          <a href="#" className="hover:text-white transition-colors">Solutions</a>
          <a href="#" className="hover:text-white transition-colors">Enterprise</a>
          <a href="#" className="hover:text-white transition-colors">Support</a>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center px-6 lg:px-24 gap-16">
        <div className="flex-1 max-w-xl space-y-8">
          <h2 className="text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
            Premium video <br />
            meetings. <br />
            <span className="text-neutral-500">Now for everyone.</span>
          </h2>
          <p className="text-neutral-400 text-lg lg:text-xl leading-relaxed">
            Scalable, secure, and intuitive video conferencing built for offices, 
            universities, and global teams. Join a meeting in seconds.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                 <input
                   type="text"
                   placeholder="Your Name"
                   required
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                   className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                 />
              </div>
              <div className="relative">
                 <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none">
                    <Keyboard className="w-5 h-5" />
                 </div>
                 <input
                   type="text"
                   placeholder="Enter code or link"
                   value={roomId}
                   onChange={(e) => setRoomId(e.target.value)}
                   className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-12 pr-5 py-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                 />
              </div>
            </div>

            <div className="relative">
               <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none">
                  <ShieldCheck className="w-5 h-5" />
               </div>
               <input
                 type="password"
                 placeholder="Meeting Passcode (Optional for new meetings)"
                 value={passcode}
                 onChange={(e) => setPasscode(e.target.value)}
                 className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-12 pr-5 py-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
               />
               <p className="mt-2 text-[10px] text-neutral-600 uppercase tracking-widest font-bold">
                 Security: Passcodes help prevent unauthorized access
               </p>
            </div>
            
            <button
               type="submit"
               className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 px-8 py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-lg transition-all group scale-100 hover:scale-[1.02] active:scale-[0.98]"
            >
              {roomId ? 'Join Meeting' : 'Start New Meeting'}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="pt-8 border-t border-neutral-800 flex items-center gap-8">
             <div className="flex items-center gap-2 text-neutral-500 text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                End-to-end Signaling
             </div>
             <div className="flex items-center gap-2 text-neutral-500 text-sm">
                <Globe className="w-4 h-4 text-emerald-500" />
                Global Low Latency
             </div>
          </div>
        </div>

        <div className="hidden lg:block flex-1 relative">
           <div className="w-[500px] h-[500px] bg-emerald-600/5 absolute -top-20 -right-20 blur-[100px] rounded-full" />
           <div className="grid grid-cols-2 gap-4 relative">
              <div className="bg-neutral-900 aspect-square rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl skew-y-2">
                 <img src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&auto=format&fit=crop&q=60" className="w-full h-full object-cover grayscale brightness-75" />
              </div>
              <div className="bg-neutral-800 aspect-square rounded-3xl overflow-hidden border border-neutral-700 shadow-2xl -translate-y-12 -skew-y-2">
                 <img src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&auto=format&fit=crop&q=60" className="w-full h-full object-cover grayscale brightness-75" />
              </div>
           </div>
        </div>
      </main>

      <footer className="p-8 text-neutral-500 text-xs text-center border-t border-neutral-900">
        &copy; 2026 MeetLite Pro. Built for classrooms, offices, and public meetings.
      </footer>
    </div>
  );
};
