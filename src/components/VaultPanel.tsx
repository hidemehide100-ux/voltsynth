import React from 'react';
import { History, Download, Trash2, Play, CircleStop, X, Disc } from 'lucide-react';
import type { Recording } from '../lib/history';
import { deleteRecording, clearRecordings } from '../lib/history';

interface VaultPanelProps {
  recordings: Recording[];
  onClose: () => void;
  onRefresh: () => void;
  activePlaybackId: string | null;
  onPlay: (id: string, blob: Blob) => void;
  onStop: () => void;
  fireMessage: (msg: string, face: string, val: number) => void;
}

export function VaultPanel({ 
  recordings, onClose, onRefresh, 
  activePlaybackId, onPlay, onStop, fireMessage 
}: VaultPanelProps) {

  const handleDownload = (rec: Recording) => {
    const url = URL.createObjectURL(rec.blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${rec.name}.webm`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
    fireMessage("DOWNLOADED", "(^‿^)", 1500);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteRecording(id);
    fireMessage("CLIP PURGED", "(-_-)", 1500);
    if (activePlaybackId === id) onStop();
    onRefresh();
  };

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to clear all recordings from the Vault?")) {
      await clearRecordings();
      fireMessage("VAULT CLEARED", "(O_Q)", 2000);
      onStop();
      onRefresh();
    }
  };

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString();

  return (
    <div className="absolute inset-x-8 top-12 bottom-12 z-50 bg-[#121212] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.08)] border border-[#2a2a2a] flex flex-col overflow-hidden backdrop-blur-3xl bg-opacity-95">
      <div className="w-full h-12 bg-gradient-to-b from-[#222] to-[#111] border-b border-black flex justify-between px-6 items-center flex-shrink-0">
          <span className="text-blue-400 text-[11px] tracking-[0.4em] font-black flex items-center gap-3 font-mono">
            <History size={14} className="text-blue-400" /> SOUND VAULT
          </span>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
        {recordings.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-600 gap-4">
             <Disc size={48} className="opacity-20" />
             <span className="text-[11px] tracking-[0.3em] font-mono">VAULT IS EMPTY</span>
          </div>
        ) : (
          recordings.map((rec) => {
            const isPlaying = activePlaybackId === rec.id;

            return (
              <div key={rec.id} className="flex items-center justify-between bg-[#1a1a1a] border border-[#2a2a2a] p-3 rounded-lg hover:border-[#3a3a3a] transition-colors shadow-sm group">
                 <div className="flex items-center gap-4">
                    <button 
                      onClick={() => isPlaying ? onStop() : onPlay(rec.id, rec.blob)}
                      className={`h-10 w-10 flex items-center justify-center rounded-full border transition-colors ${isPlaying ? 'bg-emerald-900/50 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-[#222] border-[#333] text-neutral-400 hover:text-white hover:border-neutral-500'}`}
                    >
                      {isPlaying ? <CircleStop size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-1" />}
                    </button>
                    <div className="flex flex-col">
                       <span className="font-mono text-sm font-bold text-neutral-200">{rec.name}</span>
                       <span className="font-mono text-[10px] tracking-wider text-neutral-500">{formatTime(rec.timestamp)} • {(rec.blob.size / 1024).toFixed(1)} KB</span>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleDownload(rec)} className="p-2 text-neutral-400 hover:text-blue-400 transition-colors" title="Download WebM">
                       <Download size={16} />
                    </button>
                    <button onClick={(e) => handleDelete(rec.id, e)} className="p-2 text-neutral-400 hover:text-red-500 transition-colors" title="Delete">
                       <Trash2 size={16} />
                    </button>
                 </div>
              </div>
            );
          })
        )}
      </div>

      {recordings.length > 0 && (
         <div className="w-full p-4 border-t border-[#222] bg-[#0a0a0a] flex justify-end">
            <button onClick={handleClearAll} className="px-4 py-2 border border-red-900 text-red-500 text-[10px] tracking-widest font-mono font-bold rounded hover:bg-red-900/30 transition-colors">
              PURGE ALL
            </button>
         </div>
      )}
    </div>
  );
}
