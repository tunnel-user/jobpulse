/// <reference types="node" />
import 'dotenv/config'
import { chromium, type Browser, type Page } from 'playwright'
import { ScrapedJob, JobConnector } from './types'
import { connectDB, disconnectDB } from './db'
import { Post } from './models/Post'
import {
    trackNewPost, pruneOldPosts, disconnectRedis,
    setScrapingProgress, clearScrapingProgress,
} from './redis'
import datapizza from './connectors/datapizza'
import reteInformatica from './connectors/reteinformatica'
import {
    log, stripProcessors, applyProcessors,
    remapKeys, isValidJob, logCard
} from './utils'

// CLI args
const args     = process.argv.slice(2)
const LONG     = args.includes('--long')
const maxIdx   = args.indexOf('--max')
const cronIdx  = args.indexOf('--cron')
const MAX      = maxIdx  !== -1 ? parseInt(args[maxIdx  + 1], 10) : Infinity
const CRON_MIN = cronIdx !== -1 ? parseInt(args[cronIdx + 1], 10) : null

if (maxIdx !== -1 && (isNaN(MAX) || MAX <= 0)) {
    console.error('❌ --max requires a positive integer, e.g. --max 10')
    process.exit(1)
}
if (cronIdx !== -1 && (CRON_MIN === null || isNaN(CRON_MIN) || CRON_MIN <= 0)) {
    console.error('❌ --cron requires a positive integer (minutes), e.g. --cron 30')
    process.exit(1)
}

const connectors = [datapizza, reteInformatica]

async function scrapeCard(
    page: Page,
    cardSelector: string,
    index: number,
    expectedCount: number,
    cardSelectors: JobConnector['selector']['card'],
    sourceName: string,
    navigates: boolean
): Promise<Record<string, any>> {
    const cards = await page.$$(cardSelector)
    const card  = cards[index]

    if (!card)
        throw new Error(`Card at index ${index} not found (got ${cards.length}), selector: ${cardSelector}`)

    const listingUrl            = page.url()
    const serializableSelectors = stripProcessors(cardSelectors)

    if (cardSelectors.actionBtn) {
        const btn = await card.$(cardSelectors.actionBtn.query)
        await btn?.click()
    } else {
        await card.click()
    }

    let raw: Record<string, any>

    if (navigates) {
        await page.waitForLoadState('networkidle')

        raw = await page.evaluate(
            ({ cardSelectors, sourceName }) => {
                const job: any = { _from: sourceName }
                for (const [key, value] of Object.entries(cardSelectors)) {
                    if (!value) { job[key] = null; continue }
                    const { query, multiple } = value as { query: string, multiple: boolean }
                    const found = (
                        multiple
                            ? Array.from(document.querySelectorAll(query))
                            : [document.querySelector(query)]
                    ).filter((el): el is Element => el !== null)

                    if (key === 'logo') { job[key] = (found[0] as HTMLImageElement)?.src || null; continue }

                    const lines = found.map(el =>
                        el.textContent?.trim()?.split('\r\n').map(s => s.replaceAll('\n', '').trim()).filter(s => s !== '') || []
                    )
                    if (multiple) { job[key] = lines.flat(); continue }
                    const flat = lines.flat()
                    job[key] = flat.length === 0 ? null : flat.length === 1 ? flat[0] : flat.join('\n')
                }
                return job
            },
            { cardSelectors: serializableSelectors, sourceName }
        )

        raw = applyProcessors(raw, cardSelectors)
        raw = remapKeys(raw)

        await page.goto(listingUrl, { waitUntil: 'networkidle' })
        await page.waitForFunction(
            ({ selector, count }) => document.querySelectorAll(selector).length >= count,
            { selector: cardSelector, count: expectedCount }
        )

    } else {
        const modalSelector = '[role="dialog"]:visible'

        raw = await page.evaluate(
            ({ cardSelectors, sourceName, card }) => {
                const job: any = { _from: sourceName }
                for (const [key, value] of Object.entries(cardSelectors)) {
                    if (!value) { job[key] = null; continue }
                    const { query, multiple } = value as { query: string, multiple: boolean }
                    const found = (
                        multiple
                            ? Array.from(card.querySelectorAll(query))
                            : [card.querySelector(query)]
                    ).filter((el): el is Element => el !== null)

                    if (key === 'logo') { job[key] = (found[0] as HTMLImageElement)?.src || null; continue }

                    const lines = found.map(el =>
                        el.textContent?.trim()?.split('\r\n').map(s => s.replaceAll('\n', '').trim()).filter(s => s !== '') || []
                    )
                    if (multiple) { job[key] = lines.flat(); continue }
                    const flat = lines.flat()
                    job[key] = flat.length === 0 ? null : flat.length === 1 ? flat[0] : flat.join('\n')
                }
                return job
            },
            { cardSelectors: serializableSelectors, sourceName, card }
        )

        raw = applyProcessors(raw, cardSelectors)
        raw = remapKeys(raw)

        await page.locator(modalSelector).first().press('Escape')
        await page.waitForSelector(modalSelector, { state: 'hidden' })
    }

    return raw
}

async function persistJob(job: ScrapedJob): Promise<'inserted' | 'duplicate'> {
    try {
        const doc = await Post.create(job)
        await trackNewPost(doc._id.toString())
        return 'inserted'
    } catch (err: any) {
        if (err?.code === 11000) return 'duplicate'
        throw err
    }
}

async function runOnce(runLabel: string): Promise<void> {
    log('success', `Scraping Execution started. ${runLabel}`)

    await pruneOldPosts()

    const browser: Browser = await chromium.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // avoids /dev/shm size issues in Docker
        ],
    })
    const context           = await browser.newContext()
    const page: Page        = await context.newPage()

    try {
        for (const connector of connectors) {
            log('info', `Scraping: ${connector.url}`)
            await page.goto(connector.url, { waitUntil: 'networkidle' })

            if (connector.opts.handleCookies) {
                await connector.opts.handleCookies(page)
                await page.waitForLoadState('networkidle')
            }

            const navigates    = !!connector.opts.goBackAfterScrapeComplete
            let hasNext        = true
            let pageNum        = 1
            let totalScraped   = 0
            let totalDiscarded = 0
            let totalDupes     = 0
            let connectorDone  = false

            // Resolve total pages + first-page card count for progress
            // Both must be read from the pristine first page (after cookies,
            // before any card click), so they live here outside the loop.
            await page.waitForSelector(connector.selector.list)
            const firstPageCards = await page.$$(connector.selector.list)
            const firstPageCardCount = firstPageCards.length

            const totalPages = connector.selector.next.maxPages
                ? await connector.selector.next.maxPages(page)
                : null

            if (totalPages !== null)
                log('info', `Total pages: ${totalPages}`)

            // --max takes unconditional priority as the fixed denominator.
            // Falls back to page-count estimate, or null when both are unknown.
            let totalEstimatedCards: number | null =
                MAX !== Infinity
                    ? MAX
                    : totalPages !== null ? totalPages * firstPageCardCount : null

            // Running count of cards fully processed on previous pages.
            let totalCardsProcessed = 0

            // Set initial progress
            await setScrapingProgress({
                connector_id: connector.name,
                value:   totalEstimatedCards !== null ? 0 : null,
                current: 0,
                max:     totalEstimatedCards,
            })

            while (hasNext && !connectorDone) {
                await page.waitForSelector(connector.selector.list)
                const cardCount = (await page.$$(connector.selector.list)).length
                const remaining = MAX - totalScraped
                const limit     = Math.min(cardCount, remaining)

                // Re-tune estimate at start of every page
                // Only when --max is not set: replace the dummy future-page slot
                // with the real card count for this page.
                // When --max IS set, totalEstimatedCards is already fixed to MAX.
                if (MAX === Infinity && totalPages !== null) {
                    const pagesRemaining      = totalPages - pageNum
                    totalEstimatedCards       = totalCardsProcessed
                                             + cardCount
                                             + pagesRemaining * firstPageCardCount
                }

                log('info', `Page ${pageNum}, scraping ${limit} cards`)

                for (let i = 0; i < limit; i++) {
                    const raw = await scrapeCard(
                        page,
                        connector.selector.list,
                        i,
                        cardCount,
                        connector.selector.card,
                        connector.name,
                        navigates
                    )

                    // Update progress in Redis
                    {
                        const done = totalCardsProcessed + i + 1
                        const pct  = totalEstimatedCards !== null
                            ? Math.min(100, Math.round((done / totalEstimatedCards) * 100))
                            : null
                        await setScrapingProgress({
                            connector_id: connector.name,
                            value:   pct,
                            current: totalScraped,
                            max:     totalEstimatedCards,
                        })
                    }

                    const valid = isValidJob(raw, connector.selector.card)

                    if (valid) {
                        const outcome = await persistJob(raw as ScrapedJob)
                        totalScraped++
                        if (outcome === 'duplicate') totalDupes++
                        const note = outcome === 'duplicate' ? ' (duplicate, skipped) ' : ''
                        log('info', `${ note }Page ${pageNum} - ${i + 1}/${limit} - Tot ${totalScraped} ${raw.jobTitle ?? 'Unknown'} - ${ connector.name }`)
                        if (LONG) logCard(raw)
                    } else {
                        totalDiscarded++
                        log('error', `page ${pageNum} - ${i + 1}/${limit} Discarded (invalid), ${raw.jobTitle ?? 'no title'}`)
                        if (LONG) logCard(raw)
                    }

                    if (totalScraped >= MAX) { connectorDone = true; break }
                }

                // Accumulate the real card count for this page before moving on.
                totalCardsProcessed += cardCount

                log('success', `Page ${pageNum} done, ${totalScraped} valid (${totalDupes} dupes skipped), ${totalDiscarded} discarded.`)

                if (connectorDone) break

                const nextEl = await page.$(connector.selector.next.query)
                hasNext      = await connector.selector.next.validate(nextEl)

                if (hasNext) {
                    await page.click(connector.selector.next.query)
                    await page.waitForLoadState('networkidle')
                    pageNum++
                }
            }

            log('success', `${connector.name} finished, ${totalScraped} valid (${totalDupes} dupes skipped), ${totalDiscarded} discarded.`)
        }

        log('success', 'Run completed.')
    } catch (error) {
        console.error('❌ Errore durante lo scraping:', error)
    } finally {
        await clearScrapingProgress()
        await browser.close()
        log('error', 'Browser closed.')
    }
}
async function main() {
    await connectDB()

    if (MAX !== Infinity) log('info', `⚙️ Max posts per connector: ${MAX}`)
    if (CRON_MIN !== null) console.log('info', `⏱️ Cron mode: every ${CRON_MIN} minute(s)`)

    await runOnce(`first run @ ${new Date().toLocaleTimeString()}`)

    if (CRON_MIN !== null) {
        const intervalMs = CRON_MIN * 60 * 1000
        let runCount = 1
        const tick = async () => {
            runCount++
            await runOnce(`run #${runCount} @ ${new Date().toLocaleTimeString()}`)
            log('info', `Next run in ${CRON_MIN} minute(s)…`)
            setTimeout(tick, intervalMs)
        }
        log('info', `Next run in ${CRON_MIN} minute(s)…`)
        setTimeout(tick, intervalMs)
        process.on('SIGINT',  async () => shutdown())
        process.on('SIGTERM', async () => shutdown())
    } else {
        await shutdown()
    }
}

async function shutdown() {
    log('info', 'Shutting down…')
    await clearScrapingProgress()
    await disconnectRedis()
    await disconnectDB()
    process.exit(0)
}

await main()