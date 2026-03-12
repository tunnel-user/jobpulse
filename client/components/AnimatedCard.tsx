import type { AnimatedPost, Post } from "@/lib/types"
import { useState, useLayoutEffect } from "react"
import PostCard from "./PostCard"

export default function AnimatedCard({ ap, index, onClick }: {
    ap:      AnimatedPost
    index:   number
    onClick: (p: Post) => void
}) {
    const [visible, setVisible] = useState(false)

    useLayoutEffect(() => {
        const id = requestAnimationFrame(() => setVisible(true))
        return () => cancelAnimationFrame(id)
    }, [])

    const style: React.CSSProperties = ap.exiting
        ? { opacity: 0, transform: 'scale(0.93) translateY(8px)',
            transition: 'opacity 0.28s ease, transform 0.28s cubic-bezier(0.4,0,1,1)' }
        : { opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: `opacity 0.4s ease ${index * 35}ms, transform 0.4s ease ${index * 35}ms` }

    return (
        <div className="h-full" style={style}>
            <PostCard post={ap.post} index={index} onClick={onClick} />
        </div>
    )
}