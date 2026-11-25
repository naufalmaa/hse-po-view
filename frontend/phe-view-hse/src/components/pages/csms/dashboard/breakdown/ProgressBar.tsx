import React from 'react';

interface ProgressBarProps {
    value: number;
    color?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, color = '#3D6FE8' }) => (
    <div className="w-full h-1.5 bg-[#EEF1F6] dark:bg-muted rounded-full overflow-hidden">
        <div
            className="h-full rounded-full transition-all duration-500 ease-in-out"
            style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }}
        />
    </div>
);

export default ProgressBar;
