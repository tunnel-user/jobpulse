'use client'
import { useEffect } from 'react'
import type { Post } from '@/lib/types'
import { ConnectorId, connPalette, timeAgo } from '@/lib/utils'

interface Props {
    post:    Post | null
    onClose: () => void
}

export default function PostModal({ post, onClose }: Props) {
    useEffect(() => {
        if (!post) return
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handler)
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', handler)
            document.body.style.overflow = ''
        }
    }, [post, onClose])

    if (!post) return null

    const cp = connPalette(post.connector_id as ConnectorId)

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4
                       animate-backdrop-in"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" />

            <div
                className="relative z-10 w-full sm:max-w-2xl max-h-[92dvh] flex flex-col
                           bg-panel border border-border sm:rounded-2xl rounded-t-2xl
                           shadow-2xl shadow-black/60 animate-modal-in overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Top bar */}
                <div className="flex items-start justify-between gap-4 p-6 border-b border-border">
                    <div className="flex items-center gap-4">
                        {post.logo ? (
                            <img
                                src={post.logo}
                                alt={post.company}
                                className="w-12 h-12 rounded-xl object-contain bg-[#1a1a28] border border-border shrink-0"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-xl bg-[#1a1a28] border border-border shrink-0
                                            flex items-center justify-center text-muted font-mono text-lg">
                                {post.company.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-dim font-mono text-xs">{post.company}</p>
                                {post.isNew && (
                                    <span className="font-mono text-[9px] uppercase tracking-widest
                                                     px-1.5 py-0.5 rounded bg-acid text-ink font-bold leading-none">
                                        new
                                    </span>
                                )}
                            </div>
                            <h2 className="text-bright font-sans font-bold text-lg leading-tight mt-0.5">
                                {post.jobTitle}
                            </h2>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="shrink-0 w-8 h-8 flex items-center justify-center
                                   rounded-lg border border-border text-muted hover:text-text
                                   hover:border-muted transition-colors font-mono text-sm"
                    >
                        ✕
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1 p-6 flex flex-col gap-5">

                    {/* Meta chips */}
                    <div className="flex flex-wrap gap-2">
                        <span className={`connector-badge`}>{post.connector_id}</span>
                        <span className="connector-badge border-border text-dim" suppressHydrationWarning>
                            🕒 {timeAgo(post.scrapedAt, true)}
                        </span>
                    </div>

                    {/* Job tags */}
                    {post.jobTags && post.jobTags.length > 0 && (
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">
                                Details
                            </p>
                            <div className="flex flex-col gap-1">
                                {post.jobTags.map(tag => (
                                    <span key={tag} className="font-mono text-xs text-dim">
                                        <span className="text-muted mr-1">›</span>{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tech tags */}
                    {post.techTags && post.techTags.length > 0 && (
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">
                                Stack
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {post.techTags.map(tag => (
                                    <span key={tag} className="tag-acid">{tag}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">
                            Description
                        </p>
                        <div className="text-dim text-sm leading-relaxed whitespace-pre-line">
                            {post.desc}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}