import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../../services/audioEngine';

interface VisualizerProps {
  isPlaying: boolean;
  type?: 'bars' | 'wave' | 'minimal';
  barCount?: number;
  className?: string;
  color?: string;
  height?: number;
}

export const Visualizer: React.FC<VisualizerProps> = ({
  isPlaying,
  type = 'bars',
  barCount = 12,
  className = '',
  color = '#1DB954',
  height = 24,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const freqData = audioEngine.getFrequencyData();

      if (type === 'bars') {
        const gap = 3;
        const totalGap = gap * (barCount - 1);
        const barWidth = Math.max(2, (canvas.width - totalGap) / barCount);

        for (let i = 0; i < barCount; i++) {
          let barHeight = 4;
          if (isPlaying) {
            const dataVal = freqData[i % freqData.length] || 0;
            const factor = Math.sin(phase + i * 0.4) * 0.3 + 0.7;
            barHeight = Math.max(4, ((dataVal / 255) * canvas.height * factor));
          } else {
            barHeight = 4;
          }

          const x = i * (barWidth + gap);
          const y = (canvas.height - barHeight) / 2;

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [2]);
          ctx.fill();
        }
      } else if (type === 'wave') {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        const sliceWidth = canvas.width / barCount;
        let x = 0;

        for (let i = 0; i < barCount; i++) {
          const factor = isPlaying ? Math.sin(phase + i * 0.5) * 8 : 0;
          const y = canvas.height / 2 + factor;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();
      }

      phase += 0.08;
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying, type, barCount, color]);

  return (
    <canvas
      ref={canvasRef}
      width={barCount * 8}
      height={height}
      className={`block ${className}`}
    />
  );
};
