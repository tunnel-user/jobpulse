import { createClient } from 'redis'
import { log } from './utils'

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'

export const NEW_POSTS_KEY = 'new_posts'
export const SCRAPING_KEY = 'scraping-perc'
const TTL_MS = 24 * 60 * 60 * 1000

export interface ScrapingProgress {
    connector_id: string
    value:        number | null   // 0-100, or null when total is unknown
    current:      number          // posts processed so far this run
    max:          number | null   // known cap (--max or page-count estimate), null = all
}

let client: ReturnType<typeof createClient> | null = null

export async function getRedis() {
    if (client?.isOpen) return client
    client = createClient({ url: REDIS_URL })
    client.on('error', err => log('error', 'Error while creating redis client:' + err))
    await client.connect()
    log('success', 'Redis ready.')
    return client
}

export async function disconnectRedis() {
    if (client?.isOpen) {
        await client.disconnect()
        log('error', 'Redis disconnected.')
    }
}

// New post tracking (sorted set)
export async function trackNewPost(id: string): Promise<void> {
    const redis = await getRedis()
    await redis.zAdd(NEW_POSTS_KEY, { score: Date.now(), value: id })
}

export async function pruneOldPosts(): Promise<number> {
    const redis   = await getRedis()
    const cutoff  = Date.now() - TTL_MS
    const removed = await redis.zRemRangeByScore(NEW_POSTS_KEY, '-inf', cutoff)
    if (removed > 0) log('info', `🔴 Redis: pruned ${removed} post IDs older than 24h`)
    return removed
}

export async function getRecentPostIds(): Promise<string[]> {
    const redis  = await getRedis()
    const cutoff = Date.now() - TTL_MS
    return redis.zRangeByScore(NEW_POSTS_KEY, cutoff, '+inf')
}

// Scraping progress
export async function setScrapingProgress(progress: ScrapingProgress): Promise<void> {
    const redis = await getRedis()
    await redis.set(SCRAPING_KEY, JSON.stringify(progress))
}

export async function getScrapingProgress(): Promise<ScrapingProgress | null> {
    const redis = await getRedis()
    const raw   = await redis.get(SCRAPING_KEY)
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return null }
}

export async function clearScrapingProgress(): Promise<void> {
    const redis = await getRedis()
    await redis.del(SCRAPING_KEY)
}