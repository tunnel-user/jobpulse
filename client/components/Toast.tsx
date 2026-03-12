import type { ToastData } from "@/lib/types"
import { useState, useRef, useLayoutEffect } from "react"

const TOAST_MAX_CHARS  = 120
const TOAST_AUTO_MS    = 4_500

export default function Toast({ data, onDone }: { data: ToastData, onDone: () => void }) {
    const [phase, setPhase] = useState<'enter' | 'idle' | 'expanded' | 'exit'>('enter')
    const exitTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
    const doneTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isSuccess  = data.kind === 'success'

    // Schedule auto-exit
    function scheduleExit() {
        exitTimer.current = setTimeout(() => {
            setPhase('exit')
            doneTimer.current = setTimeout(onDone, 500)
        }, TOAST_AUTO_MS)
    }

    useLayoutEffect(() => {
        // idle after one frame so transition fires
        const raf = requestAnimationFrame(() => {
            setPhase('idle')
            scheduleExit()
        })
        return () => {
            cancelAnimationFrame(raf)
            if (exitTimer.current)  clearTimeout(exitTimer.current)
            if (doneTimer.current)  clearTimeout(doneTimer.current)
        }
    }, [])

    function handleClick() {
        if (phase === 'exit') return
        // Cancel auto-exit, expand permanently
        if (exitTimer.current)  clearTimeout(exitTimer.current)
        if (doneTimer.current)  clearTimeout(doneTimer.current)
        setPhase('expanded')
    }

    const msg = data.message.length > TOAST_MAX_CHARS
        ? data.message.slice(0, TOAST_MAX_CHARS - 1) + '…'
        : data.message

    const accent = isSuccess
        ? { border: 'rgba(184,255,87,0.25)', glow: 'rgba(184,255,87,0.08)', text: '#b8ff57' }
        : { border: 'rgba(255,80,80,0.28)',  glow: 'rgba(255,60,60,0.08)',  text: '#ff7070' }

    const isEnter    = phase === 'enter'
    const isExit     = phase === 'exit'
    const isExpanded = phase === 'expanded'

    return (
        <div
            className="fixed left-1/2 -translate-1/2 z-9999"
            style={{
                bottom:     isEnter || isExit ? '-100px' : '28px',
                transition: 'bottom 0.45s cubic-bezier(0.16,1,0.3,1)',
                width:      'min(420px, calc(100vw - 32px))',
            }}
        >
            <div
                onClick={handleClick}
                className="flex flex-col gap-2 py-3 px-4
                rounded-2xl backdrop-blur-xl saturate-[1.4] select-none overflow-hidden"
                style={{
                    border:         `1px solid ${accent.border}`,
                    background:     `color-mix(in srgb, ${accent.glow} 60%, rgba(17,17,24,0.82))`,
                    boxShadow:      `0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset`,
                    cursor:         isExpanded ? 'default' : 'pointer',
                    transition:     'max-height 0.38s cubic-bezier(0.16,1,0.3,1)',
                }}
            >
                <div className="flex items-start gap-[.6rem]">
                    <span className="text-base leading-none shrink-0 mt-px">
                        {isSuccess ? '🔥' : '❌'}
                    </span>
                    <span className="font-mono text-[.8rem] font-medium
                     leading-[1.45] flex-1 min-w-0" style={{
                        display:      '-webkit-box',
                        WebkitLineClamp: isExpanded ? 'unset' : '2',
                        WebkitBoxOrient: 'vertical',
                        overflow:     isExpanded ? 'visible' : 'hidden',
                        transition:   'all 0.35s ease',
                    } as React.CSSProperties}>
                        {msg}
                    </span>
                    {!isExpanded && (
                        <span className="font-mono text-[.6rem] shrink-0
                         mt-0.75 tracking-[.03em]" style={{
                            color:      'rgba(255,255,255,0.22)',
                        }}>
                            tap to expand
                        </span>
                    )}
                    {/* Close button */}
                    <button
                        className="shrink-0 size-4.5 flex items-center justify-center
                         rounded-sm cursor-pointer font-mono text-[9px] leading-none mt-px"
                        onClick={e => { e.stopPropagation(), setPhase('exit'), setTimeout(onDone, 500) }}
                        style={{
                            border:          '1px solid rgba(255,255,255,0.12)',
                            background:      'rgba(255,255,255,0.06)',
                            color:           'rgba(255,255,255,0.35)',
                            transition:      'color 0.15s, background 0.15s, border-color 0.15s',
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.75)';
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.25)';
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)';
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)';
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Expanded sub-line */}
                {isExpanded && (
                    <p className="font-mono text-[.65rem] leading-[1.4] m-0 pt-1" style={{
                        borderTop:  '1px solid rgba(255,255,255,0.07)',
                    }}>
                        {isSuccess
                            ? 'The scraper is successfully running.'
                            : 'Something went wrong on the server.'}
                    </p>
                )}

                {/* Progress bar */}
                {(phase === 'idle') && (
                    <div className="h-0.5 rounded-[1px] overflow-hidden" style={{
                        background:   'rgba(255,255,255,0.07)',
                    }}>
                        <div className="h-full rounded-[1px] opacity-50" style={{
                            background: accent.text,
                            animation:  `toast-drain ${TOAST_AUTO_MS}ms linear forwards`,
                        }} />
                    </div>
                )}
            </div>
        </div>
    )
}