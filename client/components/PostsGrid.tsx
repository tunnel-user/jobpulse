'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type {
    Post, ScrapingProgress, AnimatedPost,
    BadgeItem, Props, ToastKind, ToastData
} from '@/lib/types'
import { API, WS_URL } from '@/lib/utils'

import PostModal from './PostModal'
import Spinner from './Spinner'
import Badge from './Badge'
import Toast from './Toast'
import AnimatedCard from './AnimatedCard'

export default function PostsGrid({ initialPosts, connectors }: Props) {
    const [posts,     setPosts]     = useState<Post[]>(initialPosts)
    const [animPosts, setAnimPosts] = useState<AnimatedPost[]>(
        initialPosts.map(p => ({ post: p, exiting: false }))
    )
    const [badges,    setBadges]    = useState<BadgeItem[]>([])
    const [selected,  setSelected]  = useState<Post | null>(null)
    const [connector, setConnector] = useState('')
    const [search,    setSearch]    = useState('')
    const [onlyNew,   setOnlyNew]   = useState(false)
    const [deleting,  setDeleting]  = useState(false)
    const [confirm,   setConfirm]   = useState(false)
    const [launching, setLaunching] = useState(false)
    const [toast,     setToast]     = useState<ToastData | null>(null)
    const toastIdRef   = useRef(0)
    const hadActiveRef = useRef(false) // flips true once scraping starts, reset per launch


    return (
        <>

            {/* Hero */}
            <div className="w-full h-50 mb-10 flex items-center justify-between gap-6">
                <div>
                    <h1 className="font-sans font-extrabold text-4xl sm:text-5xl text-bright leading-none tracking-tight">
                        A useless website<br />
                        <span className="text-pulse">about job posts</span>
                    </h1>
                    <p className="mt-4 text-dim text-sm max-w-md">
                        Aggregated from the best Italian job boards, refreshed automatically.
                    </p>
                </div>

                <div className='flex flex-col justify-between self-stretch'>
                    <div className=''>
                        {/* Badge column */}
                        {badges.length > 0 && (
                            <div className='flex flex-col gap-2 items-end pt-1'>
                                {badges.map(b => (
                                    <Badge key={b.id} item={b} onRemove={() => removeBadge(b.id)} />
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleLaunch}
                        disabled={busy}
                        className={`inline-flex items-center gap-4 px-6 py-3 rounded-lg
                                    font-mono text-sm font-medium transition-all duration-300
                                    ${!busy && 'hover:!bg-acid/20'}
                                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acid/50`}
                        style={{
                            background: busy ? 'rgba(255,255,255,0.05)' : 'rgba(184,255,87,0.12)',
                            border:     `1px solid ${busy ? 'rgba(255,255,255,0.1)' : 'rgba(184,255,87,0.35)'}`,
                            color:      busy ? 'rgba(255,255,255,0.55)' : '#b8ff57',
                            cursor:     busy ? 'default' : 'pointer',
                        }}
                    >
                        {busy ? (
                            <Spinner
                                params={{
                                    color: 'rgba(255,255,255,0.5)',
                                    radius: 8,
                                    size: 25
                                }}
                            />
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 13 13" fill="currentColor">
                                <path d="M3 2.5l8 4-8 4V2.5z" />
                            </svg>
                        )}
                        {busy ? 'Running…' : 'Fire'}
                    </button>
                </div>
            </div>
        </>
    )
}