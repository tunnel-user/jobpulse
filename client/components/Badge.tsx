import { useState, useLayoutEffect, useEffect } from 'react'
import type { BadgeItem } from '@/lib/types'
import Spinner from './Spinner'
import { connPalette, ConnectorId } from '@/lib/utils'

export default function Badge({ item, onRemove }: { item: BadgeItem, onRemove: () => void }) {
    const [visible, setVisible] = useState(false)
    const completing = item.phase === 'completing'
    const exiting    = item.phase === 'exiting'

    useLayoutEffect(() => {
        const id = requestAnimationFrame(() => setVisible(true))
        return () => cancelAnimationFrame(id)
    }, [])

    useEffect(() => {
        if (!exiting) return
        const id = setTimeout(onRemove, 520)
        return () => clearTimeout(id)
    }, [exiting, onRemove])

    // Badge styling logic
    const arcColor = completing ? '#4ade80' : 'rgba(255,255,255,0.85)'
    const fg       = completing ? '#86efac' : 'rgba(255,255,255,0.9)'
    const sub      = completing ? 'rgba(74,222,128,0.55)' : 'rgba(255,255,255,0.38)'
    const bg       = completing ? 'rgba(74,222,128,0.10)' : 'rgba(255,255,255,0.04)'
    const bd       = completing ? 'rgba(74,222,128,0.32)' : 'rgba(255,255,255,0.10)'
    const cp       = connPalette(item.connector_id as ConnectorId)

    // Spinner state logic
    const current = item.status.current ?? 0
    const max     = item.status.max
    const isDeterminate = item.status.value !== null || completing
    const pct     = completing ? 100 : (item.status.value ?? 0)

    const wrapStyle: React.CSSProperties = {
        maxHeight:  exiting ? '0px' : '72px',
        opacity:    (!visible || exiting) ? 0 : 1,
        transform:  exiting
            ? 'translateY(-52px) scale(0.93)'
            : visible ? 'translateX(0)' : 'translateX(36px)',
        marginBottom: exiting ? '-8px' : '0',
        transition: exiting
            ? 'opacity 0.42s ease, transform 0.42s cubic-bezier(0.4,0,1,1), max-height 0.38s cubic-bezier(0.4,0,1,1) 0.06s, margin-bottom 0.38s ease 0.06s'
            : 'opacity 0.32s cubic-bezier(0.16,1,0.3,1), transform 0.32s cubic-bezier(0.16,1,0.3,1)',
    }

    return (
        <div className='overflow-hidden' style={wrapStyle}>
            <div className='flex items-center gap-2.5 py-2 px-3 rounded-xl
             border backdrop-blur-sm whitespace-nowrap bg-clip-padding transform-gpu' 
             style={{
                borderColor: bd, background: bg,
                transition: 'background 0.55s ease, border-color 0.55s ease',
            }}>
                
                <Spinner params={{
                    size: 40,
                    radius: 13,
                    strokeWidth: 2,
                    isDeterminate: isDeterminate,
                    progress: pct,
                    color: arcColor,
                    trackColor: 'rgba(255,255,255,0.08)'
                }}>
                    <span className='font-mono font-medium text-[9px] leading-none tabular-nums' style={{
                        color: completing ? '#4ade80' : 'rgba(255,255,255,0.8)',
                        transition: 'color 0.55s ease',
                    }}>
                        {completing ? '✓' : current}
                    </span>
                </Spinner>

                {/* Text Data */}
                <div className='flex flex-col gap-1'>
                    <span className='text-xs font-mono font-medium leading-none' style={{
                        color: fg, transition: 'color 0.55s ease',
                    }}>
                        {completing ? 'Downloaded from ' : 'Downloading from '}
                        <span style={{ color: completing ? '#4ade80' : cp.color, transition: 'color 0.55s ease' }}>
                            {item.connector_id}
                        </span>
                    </span>
                    <span className='font-mono text-[.5625rem] leading-none tabular-nums' style={{
                        color: sub, transition: 'color 0.55s ease',
                    }}>
                        {max ? `${current} / ${max} posts` : `${current} posts`}
                    </span>
                </div>

            </div>
        </div>
    )
}