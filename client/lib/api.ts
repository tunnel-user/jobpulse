import type { PostsResponse } from './types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export async function fetchPosts(params?: {
    page?:      number
    limit?:     number
    connector?: string
    search?:    string
}): Promise<PostsResponse> {
    const url = new URL('/posts', API)
    if (params?.page)      url.searchParams.set('page',      String(params.page))
    if (params?.limit)     url.searchParams.set('limit',     String(params.limit))
    if (params?.connector) url.searchParams.set('connector', params.connector)
    if (params?.search)    url.searchParams.set('search',    params.search)

    try {
        const res = await fetch(url.toString(), { cache: 'no-store' })
        if (!res.ok) throw new Error(`API responded ${res.status}`)
        return res.json()
    } catch {
        return { data: [], meta: { total: 0, page: 1, limit: 20, pages: 0 } }
    }
}

export async function fetchConnectors(): Promise<string[]> {
    try {
        const res = await fetch(`${API}/connectors`, { cache: 'no-store' })
        if (!res.ok) return []
        const json = await res.json()
        return json.data ?? []
    } catch {
        return []
    }
}