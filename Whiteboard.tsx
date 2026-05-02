import React, { useRef, useEffect, useState } from 'react';
import { Download, Trash2, Undo, Pencil, Eraser, Square, Circle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { WhiteboardAction } from '@/types';

interface WhiteboardProps {
  data: any[];
  onAction: (action: WhiteboardAction) => void;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ data, onAction }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#3b82f6');
  const [brushSize, setBrushSize] = useState(3);
  const [mode, setMode] = useState<'pencil' | 'eraser'>('pencil');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and redraw all data
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    data.forEach(item => {
      ctx.beginPath();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = item.mode === 'eraser' ? 'destination-out' : 'source-over';
      
      const points = item.points;
      if (points.length > 0) {
        ctx.moveTo(points[0].x, points[0].y);
        points.forEach((p: any) => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      }
    });
  }, [data]);

  const lastActionRef = useRef<any>(null);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const pos = getPos(e);
    lastActionRef.current = {
      color: mode === 'eraser' ? '#ffffff' : color,
      size: brushSize,
      mode,
      points: [pos]
    };
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !lastActionRef.current) return;
    const pos = getPos(e);
    lastActionRef.current.points.push(pos);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const points = lastActionRef.current.points;
    if (points.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = lastActionRef.current.color;
      ctx.lineWidth = lastActionRef.current.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = lastActionRef.current.mode === 'eraser' ? 'destination-out' : 'source-over';
      ctx.moveTo(points[points.length - 2].x, points[points.length - 2].y);
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing && lastActionRef.current) {
      onAction({ type: 'draw', payload: lastActionRef.current });
    }
    setIsDrawing(false);
    lastActionRef.current = null;
  };

  const getPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    return { x, y };
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900 rounded-2xl overflow-hidden border border-white/10">
      <div className="p-3 bg-neutral-800/50 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setMode('pencil')}
            className={cn("p-2 rounded-lg transition-all", mode === 'pencil' ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-white")}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setMode('eraser')}
            className={cn("p-2 rounded-lg transition-all", mode === 'eraser' ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-white")}
          >
            <Eraser className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <input 
            type="color" 
            value={color} 
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none"
          />
          <select 
            value={brushSize} 
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="bg-neutral-800 text-white text-xs px-2 py-1.5 rounded-lg border border-white/10"
          >
            <option value="1">Small</option>
            <option value="3">Medium</option>
            <option value="8">Large</option>
            <option value="20">Extra Large</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onAction({ type: 'clear' })}
            className="p-2 text-neutral-400 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 relative bg-white overflow-hidden cursor-crosshair">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 w-full h-full"
        />
        <div className="absolute bottom-4 right-4 text-[10px] text-neutral-400 uppercase tracking-widest font-bold bg-white/80 px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
          Shared Canvas
        </div>
      </div>
    </div>
  );
};
