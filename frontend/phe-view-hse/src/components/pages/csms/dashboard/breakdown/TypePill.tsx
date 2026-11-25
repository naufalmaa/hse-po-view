import React from 'react';
import { cn } from '@/lib/utils';

interface TypePillProps {
    type: string;
}

export const TypePill: React.FC<TypePillProps> = ({ type }) => {
    const isPB = type?.toUpperCase().includes('PB') || type?.toUpperCase().includes('BERJALAN');
    const label = isPB ? 'PB' : 'PA';
    return (
        <span
            className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded",
                isPB ? "bg-[#EEF2FF] dark:bg-blue-950/40 text-[#3D4CB7] dark:text-blue-300" : "bg-[#F3EAFB] dark:bg-purple-950/40 text-[#6B3FAA] dark:text-purple-300"
            )}
            title={isPB ? 'Penilaian Berjalan' : 'Penilaian Akhir'}
        >
            {label}
        </span>
    );
};

export default TypePill;
