import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    variant?: 'default' | 'primary' | 'success' | 'warning';
}

export function StatsCard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    variant = 'default'
}: StatsCardProps) {
    const variantStyles = {
        default: 'bg-card',
        primary: 'bg-blue-500/5 border-blue-500/20',
        success: 'bg-green-500/5 border-green-500/20',
        warning: 'bg-orange-500/5 border-orange-500/20',
    };

    const iconVariantStyles = {
        default: 'bg-muted text-muted-foreground',
        primary: 'bg-blue-500/10 text-blue-600',
        success: 'bg-green-500/10 text-green-600',
        warning: 'bg-orange-500/10 text-orange-600',
    };

    return (
        <div className={cn(
            "rounded-xl border p-5 transition-all duration-200 hover:shadow-lg fade-in",
            variantStyles[variant]
        )}>
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold tracking-tight">{value}</p>
                        {trend && (
                            <span className={cn(
                                "text-xs font-medium",
                                trend.isPositive ? "text-green-600" : "text-red-500"
                            )}>
                                {trend.isPositive ? '+' : ''}{trend.value}%
                            </span>
                        )}
                    </div>
                    {subtitle && (
                        <p className="text-xs text-muted-foreground">{subtitle}</p>
                    )}
                </div>
                <div className={cn(
                    "p-2.5 rounded-lg",
                    iconVariantStyles[variant]
                )}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </div>
    );
}
