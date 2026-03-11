import 'dotenv/config'
import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { spawn } from 'child_process'
import { connectDB } from './db'
import { Post } from './models/Post'
import {
    getRecentPostIds, pruneOldPosts,
    getRedis, NEW_POSTS_KEY,
    getScrapingProgress,
} from './redis'
import { log } from './utils'

await connectDB()

// Per-connection interval tracking
const connTimers = new Map<string, ReturnType<typeof setInterval>[]>()

async function sendPosts(ws: { send(s: string): void }) {
    await pruneOldPosts()
    const posts  = await Post.find({}).sort({ scrapedAt: -1 }).limit(500).lean()
    const newIds = new Set(await getRecentPostIds())
    const data   = posts.map(p => ({ ...p, isNew: newIds.has(p._id.toString()) }))

    const CHUNK       = 50
    const totalChunks = Math.max(1, Math.ceil(data.length / CHUNK))

    for (let i = 0; i < totalChunks; i++) {
        ws.send(JSON.stringify({
            type:        'posts',
            chunk:       i,
            totalChunks,
            posts:       data.slice(i * CHUNK, (i + 1) * CHUNK),
        }))
    }
    ws.send(JSON.stringify({ type: 'posts_done', total: data.length }))
}

const app = new Elysia()
    .use(cors())

    // WebSocket /status
    // Single channel: sends posts in chunks every 10s, scraping status every 5s.
    .ws('/status', {
        async open(ws) {
            // Immediately push current state
            await sendPosts(ws)
            const status = await getScrapingProgress()
            ws.send(JSON.stringify({ type: 'scraping', data: status }))

            // Scraping status every 5s
            const scrapingTimer = setInterval(async () => {
                try {
                    const s = await getScrapingProgress()
                    ws.send(JSON.stringify({ type: 'scraping', data: s }))
                } catch { /* connection likely closed */ }
            }, 5_000)

            // Posts refresh: every 10s while scraping, every 60s otherwise
            const postsTimer = setInterval(async () => {
                try {
                    const scraping = await getScrapingProgress()
                    if (scraping) await sendPosts(ws)        // active scrape: push frequently
                } catch {}
            }, 10_000)

            const postsFullTimer = setInterval(async () => {
                try { await sendPosts(ws) } catch {}
            }, 60_000)

            connTimers.set(ws.id, [scrapingTimer, postsTimer, postsFullTimer])
        },
        close(ws) {
            const timers = connTimers.get(ws.id) ?? []
            timers.forEach(clearInterval)
            connTimers.delete(ws.id)
        },
    })

    .get('/posts', async ({ query }) => {
        const page  = Math.max(1, parseInt(query.page  as string || '1',  10))
        const limit = Math.min(100, Math.max(1, parseInt(query.limit as string || '20', 10)))
        const skip  = (page - 1) * limit

        const filter: Record<string, any> = {}
        if (query.connector) filter.connector_id = query.connector
        if (query.search) {
            const re = new RegExp(query.search as string, 'i')
            filter.$or = [{ jobTitle: re }, { company: re }, { desc: re }]
        }

        const [posts, total] = await Promise.all([
            Post.find(filter).sort({ scrapedAt: -1 }).skip(skip).limit(limit).lean(),
            Post.countDocuments(filter),
        ])

        await pruneOldPosts()
        const newIds = new Set(await getRecentPostIds())
        const data   = posts.map(p => ({ ...p, isNew: newIds.has(p._id.toString()) }))

        return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } }
    })

    .get('/posts/new', async () => {
        await pruneOldPosts()
        const ids   = await getRecentPostIds()
        const posts = await Post.find({ _id: { $in: ids } }).sort({ scrapedAt: -1 }).lean()
        return { data: posts.map(p => ({ ...p, isNew: true })), meta: { total: posts.length } }
    })

    .get('/posts/:id', async ({ params, set }) => {
        const post = await Post.findById(params.id).lean()
        if (!post) { set.status = 404; return { message: 'Post not found' } }
        await pruneOldPosts()
        const newIds = new Set(await getRecentPostIds())
        return { ...post, isNew: newIds.has(post._id.toString()) }
    })

    .delete('/posts', async () => {
        const { deletedCount } = await Post.deleteMany({})
        const redis = await getRedis()
        await redis.del(NEW_POSTS_KEY)
        return { deleted: deletedCount }
    })

    .post('/start', async ({ set }) => {
        // If already scraping, reject
        const active = await getScrapingProgress()
        if (active) {
            set.status = 409
            return { started: false, error: 'Scraper already running', connector_id: active.connector_id }
        }

        // Spawn the scraper directly
        const child = spawn('bun', ['index.ts'], {
            detached: true,
            stdio:    ['ignore', 'pipe', 'pipe'],
            env:      { ...process.env },
        })

        let errorOutput = ''

        // Capture stderr for error detection
        child.stderr?.on('data', (data) => {
            errorOutput += data.toString()
        })

        // Capture stdout
        child.stdout?.on('data', (data) => {
            console.log(`${data.toString().trim()}`)
        })

        // Check for early errors (within 2 seconds)
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // If we got errors, report failure
        if (errorOutput.includes('Executable doesn\'t exist') || errorOutput.includes('error:')) {
            // Kill the failed process
            try { process.kill(child.pid!, 'SIGTERM') } catch {}
            
            set.status = 500
            return { 
                started: false, 
                error: errorOutput
            }
        }

        child.unref()

        return { started: true, pid: child.pid }
    })

    .get('/connectors', async () => {
        const ids = await Post.distinct('connector_id')
        return { data: ids }
    })

    .listen(3001)

log('success', `API running at http://localhost:${app.server?.port}`)