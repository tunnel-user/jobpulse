'use client'
import { generateSpinner } from "@/lib/utils"
import type { SpinnerProps } from "@/lib/types"

export default function Spinner({ 
    params = {},
    children
}: { 
    params?: Partial<SpinnerProps>,
    children?: React.ReactNode
}) {
    const s = generateSpinner(params)

    return (
        <div className="relative shrink-0" style={{ width: s.size, height: s.size }}>
            <svg 
                viewBox={`0 0 ${s.size} ${s.size}`}
                className="w-full h-full transform -rotate-90"
            >
                {/* Background Track */}
                <circle 
                    cx={s.centerPoint} 
                    cy={s.centerPoint} 
                    r={s.radius} 
                    fill="none" 
                    stroke={s.trackColor} 
                    strokeWidth={s.strokeWidth} 
                />
                
                {/* Animated Arc */}
                {s.isDeterminate ? (
                    <circle 
                        cx={s.centerPoint} 
                        cy={s.centerPoint} 
                        r={s.radius} 
                        fill="none"
                        stroke={s.color} 
                        strokeWidth={s.strokeWidth} 
                        strokeLinecap="round"
                        strokeDasharray={s.circumference} 
                        strokeDashoffset={s.offset}
                        style={{ 
                            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1), stroke 0.55s ease' 
                        }} 
                    />
                ) : (
                    <circle 
                        cx={s.centerPoint} 
                        cy={s.centerPoint} 
                        r={s.radius} 
                        fill="none"
                        stroke={s.color} 
                        strokeWidth={s.strokeWidth} 
                        strokeLinecap="round"
                        strokeDasharray={`${s.circumference * 0.28} ${s.circumference * 0.72}`}
                        style={{ 
                            transformOrigin: `${s.centerPoint}px ${s.centerPoint}px`,
                            animation: 'spin-arc 1.1s cubic-bezier(0.4,0,0.2,1) infinite',
                            transition: 'stroke 0.55s ease' 
                        }} 
                    />
                )}
            </svg>
            {children && (
                <div className="absolute inset-0 flex items-center justify-center">
                    {children}
                </div>
            )}
        </div>
    )
}