
import React from 'react';
import { cn } from '../lib/utils';

interface ProgressClockProps {
    segments: number;
    clockCount: number;
    filled: number;
    size?: number;
    color?: string;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
}

const SingleClock: React.FC<{ segments: number; filled: number; size: number; color: string }> = ({ segments, filled, size, color }) => {
    const center = size / 2;
    const radius = size * 0.42;
    
    const sectors = Array.from({ length: segments }).map((_, i) => {
        const startAngle = (i * 360) / segments - 90;
        const endAngle = ((i + 1) * 360) / segments - 90;
        
        const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180);
        const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180);
        const x2 = center + radius * Math.cos((endAngle * Math.PI) / 180);
        const y2 = center + radius * Math.sin((endAngle * Math.PI) / 180);
        
        const largeArcFlag = 0;
        const isFilled = i < filled;
        
        const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
        
        return (
            <path
                key={i}
                d={d}
                fill={isFilled ? color : 'transparent'}
                stroke={color}
                strokeWidth={1}
                className="transition-all duration-500 pointer-events-none"
                style={{ opacity: isFilled ? 0.9 : 0.05 }}
            />
        );
    });

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="filter drop-shadow-sm">
            <circle
                cx={center}
                cy={center}
                r={radius}
                fill="rgba(0,0,0,0.4)"
                stroke={color}
                strokeWidth={1.5}
                className="opacity-10"
            />
            {sectors}
            <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                className="opacity-30"
            />
            <circle
                cx={center}
                cy={center}
                r={1.5}
                fill={color}
                className="opacity-40"
            />
        </svg>
    );
};

export const ProgressClock: React.FC<ProgressClockProps> = ({ 
    segments, 
    clockCount,
    filled, 
    size = 40, 
    color = '#C9AD6A',
    className,
    onClick
}) => {
    return (
        <div 
            className={cn(
                "flex flex-wrap gap-1.5 items-center justify-center p-2 rounded-xl bg-black/20 border border-white/5 transition-all hover:bg-black/40 hover:border-white/10 group cursor-pointer active:scale-[0.97]", 
                className
            )}
            onClick={onClick}
        >
            {Array.from({ length: clockCount }).map((_, i) => {
                const filledInThisClock = Math.max(0, Math.min(segments, filled - (i * segments)));
                return (
                    <div key={i} className="relative">
                        <SingleClock 
                            segments={segments} 
                            filled={filledInThisClock} 
                            size={size} 
                            color={color} 
                        />
                        {/* Optional completion indicator */}
                        {filledInThisClock === segments && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-[120%] h-[120%] border border-dnd-gold/20 rounded-full animate-pulse-slow" />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
