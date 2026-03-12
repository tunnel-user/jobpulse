'use client'
import type { Post } from '@/lib/types'
import { ConnectorId, connPalette, timeAgo } from '@/lib/utils'

interface Props {
    post:    Post
    index:   number
    onClick: (post: Post) => void
}

export default function PostCard({ post, index, onClick }: Props) {
    const cp = connPalette(post.connector_id as ConnectorId)

    return (
        <button
            onClick={() => onClick(post)}
            className="group relative w-full h-full text-left bg-panel border border-border rounded-xl p-5
                       flex flex-col gap-3 hover:border-muted hover:bg-[#14141e]
                       transition-all duration-200
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse/50"
            style={{ animationDelay: `${index * 40}ms` }}
        >
            {/* Inner radial glow for new posts */}
            {post.isNew && (
                <div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{
                        background: 'radial-gradient(ellipse 90% 60% at 50% 115%, #b8ff5722 0%, transparent 70%)',
                    }}
                />
            )}

            {/* NEW badge */}
            {post.isNew && (
                <span className="absolute top-3 right-3 font-mono text-[9px] uppercase
                                 tracking-widest px-1.5 py-0.5 rounded
                                 bg-acid text-ink font-bold leading-none z-10">
                    new
                </span>
            )}

            {/* Header */}
            <div className="flex items-start gap-3">
                {post.logo ? (
                    <img
                        src={post.logo}
                        alt={post.company}
                        className="w-10 h-10 rounded-lg object-contain bg-[#1a1a28] border border-border shrink-0"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#1a1a28] border border-border shrink-0
                                    flex items-center justify-center text-muted font-mono text-sm">
                        {post.company.charAt(0).toUpperCase()}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-dim font-mono text-xs truncate">{post.company}</p>
                    <h2 className="text-bright font-sans font-semibold text-sm leading-snug mt-0.5
                                   group-hover:text-acid transition-colors line-clamp-2">
                        {post.jobTitle}
                    </h2>
                </div>
            </div>

            {/* Tech tags */}
            {post.techTags && post.techTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {post.techTags.slice(0, 5).map((tag, i) => (
                        <span key={`${tag}-${i}`} className="tag-acid">{tag}</span>
                    ))}
                    {post.techTags.length > 5 && (
                        <span className="tag">+{post.techTags.length - 5}</span>
                    )}
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-auto pt-1">
                <span
                    style={cp.style}
                    className={`connector-badge`}>
                    {post.connector_id}
                </span>
                <span className="font-mono text-[11px] text-muted" suppressHydrationWarning>
                    {timeAgo(post.scrapedAt, false)}
                </span>
            </div>
        </button>
    )
}