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

    // true whenever there's an active (non-completing) scrape badge
    const isScraping = badges.some(b => b.phase === 'active')

    const postsBuffer     = useRef<Post[]>([])
    const prevConnId      = useRef<string | null>(null)
    const completingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Auto-reset, launching when scraping fully ends
    useEffect(() => {
        if (isScraping) hadActiveRef.current = true
        // Reset once we've seen active scraping and nothing is still running/completing
        if (
            launching &&
            hadActiveRef.current &&
            !badges.some(b => b.phase === 'active' || b.phase === 'completing')
        ) {
            hadActiveRef.current = false
            setLaunching(false)
        }
    }, [badges, isScraping, launching])

    // animPosts sync
    useEffect(() => {
        const newIds  = new Set(posts.map(p => p._id))
        const prevIds = new Set(animPosts.filter(a => !a.exiting).map(a => a.post._id))

        const hasRemoved = animPosts.some(a => !a.exiting && !newIds.has(a.post._id))
        if (hasRemoved) {
            setAnimPosts(ap => ap.map(a =>
                !a.exiting && !newIds.has(a.post._id) ? { ...a, exiting: true } : a
            ))
            setTimeout(() => setAnimPosts(ap => ap.filter(a => !a.exiting)), 320)
        }

        const added = posts.filter(p => !prevIds.has(p._id))
        if (added.length > 0) {
            setAnimPosts(ap => [
                ...ap.filter(a => !a.exiting),
                ...added.map(p => ({ post: p, exiting: false })),
            ])
        }

        setAnimPosts(ap => ap.map(a => {
            const fresh = posts.find(p => p._id === a.post._id)
            return fresh ? { ...a, post: fresh } : a
        }))
    }, [posts])

    // WebSocket
    useEffect(() => {
        let ws: WebSocket
        let reconnect: ReturnType<typeof setTimeout>
        let alive = true

        function connect() {
            ws = new WebSocket(`${WS_URL}/status`)
            ws.onmessage = (e) => {
                try {
                    const msg = JSON.parse(e.data)
                    if (msg.type === 'scraping') handleScrapingUpdate(msg.data ?? null)
                    else if (msg.type === 'posts') {
                        if (msg.chunk === 0) postsBuffer.current = []
                        postsBuffer.current.push(...msg.posts)
                    } else if (msg.type === 'posts_done') {
                        setPosts([...postsBuffer.current])
                        postsBuffer.current = []
                    }
                } catch {}
            }
            ws.onclose = () => { if (alive) reconnect = setTimeout(connect, 3_000) }
            ws.onerror = () => ws.close()
        }

        connect()
        return () => { alive = false; clearTimeout(reconnect); ws?.close() }
    }, [])

    // Badge state machine
    function handleScrapingUpdate(data: ScrapingProgress | null) {
        const newId = data?.connector_id ?? null
        const oldId = prevConnId.current

        if (newId === oldId) {
            if (newId && data)
                setBadges(bs => bs.map(b =>
                    b.phase === 'active' && b.connector_id === newId ? { ...b, status: data } : b
                ))
            return
        }
        prevConnId.current = newId

        if (oldId) {
            setBadges(bs => bs.map(b =>
                b.phase === 'active' && b.connector_id === oldId ? { ...b, phase: 'completing' } : b
            ))
            if (completingTimer.current) clearTimeout(completingTimer.current)
            completingTimer.current = setTimeout(() => {
                setBadges(bs => bs.map(b =>
                    b.phase === 'completing' ? { ...b, phase: 'exiting' } : b
                ))
            }, 5_000)
        }

        if (newId && data) {
            setBadges(bs => [...bs, {
                id: `${newId}-${Date.now()}`,
                connector_id: newId,
                status: data,
                phase: 'active',
            }])
        }
    }

    const removeBadge = useCallback((id: string) => {
        setBadges(bs => bs.filter(b => b.id !== id))
    }, [])

    function spawnToast(kind: ToastKind, message: string) {
        setToast({ kind, message, id: ++toastIdRef.current })
    }

    // Launch scraper
    async function handleLaunch() {
        if (isScraping || launching) return

        // Immediately show running state
        hadActiveRef.current = false
        setLaunching(true)

        try {
            const res = await fetch(`${API}/start`, { method: 'POST', cache: 'no-store' })

            if (res.ok) {
                // Success
                spawnToast('success', 'May your fire begins')
            } else {
                // Error
                let errMsg = `Server error ${res.status}`
                try {
                    const json = await res.json()
                    errMsg = json?.error
                } catch {}
                spawnToast('error', errMsg)
                setLaunching(false)
            }
        } catch (e) {
            spawnToast('error', e instanceof Error ? e.message : 'Network error, could not reach server')
            setLaunching(false)
        }
    }

    // Delete all
    async function handleDeleteAll() {
        if (!confirm) { setConfirm(true); return }
        setDeleting(true)
        setConfirm(false)
        try {
            const res = await fetch(`${API}/posts`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Delete failed')
            setPosts([])
            setSelected(null)
            setOnlyNew(false)
        } catch (e) { console.error(e) }
        finally { setDeleting(false) }
    }

    // Derivated
    const busy = isScraping || launching

    const livePosts = animPosts.filter(a => !a.exiting).map(a => a.post)
    const newCount  = livePosts.filter(p => p.isNew).length

    const filteredIds = new Set(
        livePosts.filter(p => {
            const matchConn   = !connector || p.connector_id === connector
            const matchNew    = !onlyNew   || p.isNew
            const matchSearch = !search    || [p.jobTitle, p.company, p.desc]
                .join(' ').toLowerCase().includes(search.toLowerCase())
            return matchConn && matchNew && matchSearch
        }).map(p => p._id)
    )

    const visibleAnimPosts = animPosts.filter(a => a.exiting || filteredIds.has(a.post._id))

    return (
        <>
            {/* Keyframe for toast drain bar injected once */}
            <style>{`
                @keyframes toast-drain {
                    from { width: 100% }
                    to   { width: 0%   }
                }
            `}</style>

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

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                    type="text"
                    placeholder="Search jobs, companies, skills…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 bg-panel border border-border rounded-xl px-4 py-2.5
                               font-mono text-sm text-text placeholder:text-muted
                               focus:outline-none focus:border-pulse/60 transition-colors"
                />
                <select
                    key={connectors.length}
                    value={connector}
                    onChange={e => setConnector(e.target.value)}
                    className="bg-panel border border-border rounded-xl px-4 py-2.5
                               font-mono text-sm text-dim
                               focus:outline-none focus:border-pulse/60 transition-colors cursor-pointer"
                >
                    <option value="">All</option>
                    {connectors.map(c => <option className='capitalize' key={c} value={c}>{c}</option>)}
                </select>
                <button
                    onClick={handleDeleteAll}
                    onBlur={() => setConfirm(false)}
                    disabled={deleting || posts.length === 0}
                    className={`px-4 py-2.5 rounded-xl border font-mono text-xs transition-all duration-150
                                disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap
                                ${confirm
                                    ? 'bg-red-500/20 border-red-500/60 text-red-400 animate-pulse'
                                    : 'bg-panel border-border text-dim hover:border-red-500/40 hover:text-red-400'}`}
                >
                    {deleting
                        ? <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" className='fill-red-500 size-4 spin-arc'>
                            <path d="M160-80v-80h80v-120q0-61 28.5-114.5T348-480q-51-32-79.5-85.5T240-680v-120h-80v-80h640v80h-80v120q0 61-28.5 114.5T612-480q51 32 79.5 85.5T720-280v120h80v80H160Z"/>
                          </svg>
                        : confirm
                            ? 'Confirm?'
                            : <svg className='fill-red-500 size-5' xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
                                <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm80-160h80v-360h-80v360Zm160 0h80v-360h-80v360Z"/>
                              </svg>
                    }
                </button>
            </div>

            {newCount > 0 && (
                <button
                    onClick={() => setOnlyNew(v => !v)}
                    className={`mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border
                                font-mono text-xs transition-all duration-150
                                ${onlyNew
                                    ? 'bg-acid text-ink border-acid font-bold'
                                    : 'bg-acid/5 text-acid border-acid/30 hover:bg-acid/10'}`}
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {newCount} new in last 24h
                    {onlyNew && <span className="ml-1 opacity-60">· click to clear</span>}
                </button>
            )}

            <p className="font-mono text-xs text-muted mb-5">
                {filteredIds.size} {filteredIds.size === 1 ? 'result' : 'results'}
                {(search || connector || onlyNew) && ' (filtered)'}
            </p>

            {/* Grid */}
            {filteredIds.size === 0 && visibleAnimPosts.filter(a => !a.exiting).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-muted">
                    <span className="text-5xl mb-4">⌀</span>
                    <p className="font-mono text-sm">
                        {posts.length === 0 && isScraping
                            ? 'Downloading posts…'
                            : posts.length === 0
                            ? 'No posts in database. Run the scraper to populate.'
                            : 'No jobs match your filters.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                    {visibleAnimPosts.map((ap, i) => (
                        <AnimatedCard key={ap.post._id} ap={ap} index={i} onClick={setSelected} />
                    ))}
                </div>
            )}

            <PostModal post={selected} onClose={() => setSelected(null)} />

            {toast && (
                <Toast
                    key={toast.id}
                    data={toast}
                    onDone={() => setToast(null)}
                />
            )}
        </>
    )
}