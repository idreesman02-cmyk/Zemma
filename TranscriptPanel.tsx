import React, { useState, useMemo } from 'react';
import { Search, Quote, Clock, Subtitles, Download } from 'lucide-react';
import { Transcript } from '@/types';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface TranscriptPanelProps {
  transcripts: Transcript[];
  isTranscriptionEnabled: boolean;
  onToggleTranscription: () => void;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  transcripts,
  isTranscriptionEnabled,
  onToggleTranscription
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTranscripts = useMemo(() => {
    if (!searchQuery.trim()) return transcripts;
    return transcripts.filter(t => 
      t.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.senderName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [transcripts, searchQuery]);

  const handleDownload = () => {
    const content = transcripts.map(t => 
      `[${format(t.timestamp, 'HH:mm:ss')}] ${t.senderName}: ${t.text}`
    ).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-transcript-${format(new Date(), 'yyyy-MM-dd-HHmm')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900/50 backdrop-blur-xl">
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center">
              <Subtitles className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-white font-bold">Live Transcript</h2>
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Real-time captions</p>
            </div>
          </div>
          <button
            onClick={onToggleTranscription}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
              isTranscriptionEnabled
                ? "bg-red-500/10 border-red-500/50 text-red-500 hover:bg-red-500/20"
                : "bg-blue-500/10 border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
            )}
          >
            {isTranscriptionEnabled ? 'Stop Transcription' : 'Start Transcription'}
          </button>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500/50 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        <AnimatePresence initial={false}>
          {filteredTranscripts.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50"
            >
              <Quote className="w-12 h-12 text-neutral-700" />
              <p className="text-neutral-500 text-sm italic">No transcription available yet.</p>
            </motion.div>
          ) : (
            filteredTranscripts.map((t, idx) => {
              const isNewSender = idx === 0 || filteredTranscripts[idx - 1].senderId !== t.senderId;
              
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-1"
                >
                  {isNewSender && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                        {t.senderName}
                      </span>
                      <div className="flex items-center gap-1 text-neutral-600">
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px] tabular-nums">
                          {format(t.timestamp, 'HH:mm:ss')}
                        </span>
                      </div>
                    </div>
                  )}
                  <p className="text-neutral-300 text-sm leading-relaxed font-medium pl-0">
                    {t.text}
                  </p>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {transcripts.length > 0 && (
        <div className="p-6 bg-black/20 border-t border-white/5">
          <button
            onClick={handleDownload}
            className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-[1.5rem] text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-all flex items-center justify-center gap-3"
          >
            <Download className="w-4 h-4" />
            Download Transcript
          </button>
        </div>
      )}
    </div>
  );
};
