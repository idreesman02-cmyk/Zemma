import React, { useState } from 'react';
import { Plus, Check, BarChart3, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Poll } from '@/types';

interface PollerProps {
  polls: Poll[];
  meId: string;
  isHost: boolean;
  onCreatePoll: (question: string, options: string[]) => void;
  onVote: (pollId: string, optionId: string) => void;
}

export const Poller: React.FC<PollerProps> = ({ polls, meId, isHost, onCreatePoll, onVote }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const handleCreate = () => {
    if (question.trim() && options.every(opt => opt.trim())) {
      onCreatePoll(question, options);
      setQuestion('');
      setOptions(['', '']);
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold tracking-tight">Polls</h3>
        {isHost && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            New Poll
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="p-4 bg-neutral-800 rounded-2xl border border-blue-500/30 space-y-4"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Question</label>
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask something..."
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-500 uppercase">Options</label>
                {options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[idx] = e.target.value;
                        setOptions(newOpts);
                      }}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 bg-neutral-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                    />
                    {options.length > 2 && (
                      <button 
                        onClick={() => setOptions(options.filter((_, i) => i !== idx))}
                        className="p-2 text-neutral-500 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {options.length < 5 && (
                  <button
                    onClick={() => setOptions([...options, ''])}
                    className="text-xs text-blue-400 font-bold hover:text-blue-300 transition-colors"
                  >
                    + Add Option
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  className="flex-1 bg-blue-600 py-2.5 rounded-xl text-xs font-bold text-white hover:bg-blue-500 transition-all"
                >
                  Create Poll
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  className="flex-1 bg-white/5 py-2.5 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {polls.length === 0 && !isCreating && (
          <div className="h-full flex flex-col items-center justify-center text-neutral-500 gap-3 py-12 text-center">
            <BarChart3 className="w-12 h-12 text-neutral-800" />
            <p className="text-sm">No polls yet. {isHost ? "Create one to get feedback!" : "Wait for the host to start a poll."}</p>
          </div>
        )}

        {polls.map((poll) => {
          const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
          const hasVoted = poll.options.some(opt => opt.votes.includes(meId));

          return (
            <motion.div
              key={poll.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-5 bg-neutral-800/50 border border-white/5 rounded-2xl space-y-4"
            >
              <div>
                <h4 className="text-white font-bold leading-tight">{poll.question}</h4>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">
                  {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                </p>
              </div>

              <div className="space-y-2">
                {poll.options.map((opt) => {
                  const voteCount = opt.votes.length;
                  const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                  const isUserVote = opt.votes.includes(meId);

                  return (
                    <button
                      key={opt.id}
                      disabled={hasVoted}
                      onClick={() => onVote(poll.id, opt.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl relative overflow-hidden transition-all border",
                        hasVoted ? "cursor-default" : "cursor-pointer hover:border-blue-500/50",
                        isUserVote ? "border-blue-500/50 bg-blue-500/10" : "border-white/5 bg-neutral-900/50"
                      )}
                    >
                      {hasVoted && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          className={cn(
                            "absolute inset-y-0 left-0 opacity-20",
                            isUserVote ? "bg-blue-500" : "bg-neutral-500"
                          )}
                        />
                      )}
                      
                      <div className="relative flex items-center justify-between text-sm">
                        <span className={cn("font-medium", isUserVote ? "text-blue-400" : "text-white/80")}>
                          {opt.text}
                          {isUserVote && <Check className="w-3.5 h-3.5 inline ml-2" />}
                        </span>
                        {hasVoted && (
                          <span className="text-xs font-bold text-neutral-400">
                            {percentage.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
