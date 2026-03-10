import type { ElementHandle } from 'playwright'
import { JobConnector } from "../types"

const datapizza: JobConnector = {
    name: 'datapizza',
    url: 'https://jobs.datapizza.tech',
    selector: {
        list: '.grid.w-full.gap-4 > div',
        next: {
            query: 'ul[data-slot="pagination-content"] > :last-child',
            validate: async (el: ElementHandle<Element> | null): Promise<boolean> => {
                if (!el) return false
                return await el.evaluate((node: Element) => {
                    const isNext = node.textContent?.toLowerCase().includes('next')
                    const isNotDisabled = !node.classList.contains('pointer-events-none')
                    return !!isNext && isNotDisabled
                })
            },
            maxPages: null  // datapizza pagination doesn't expose a total page count
        },
        card: {
            logo: { query: 'img[data-slot="avatar-image"]', multiple: false, processor: null },
            jobTitle: { query: 'h1', multiple: false, processor: null },
            company: { query: 'a.text-muted-foreground.font-normal', multiple: false, processor: null },
            jobTags: { query: '.flex.flex-col.gap-2 > :nth-child(1) > span', multiple: true, processor: null },
            techTags: { query: '.flex.flex-col.gap-2 > :nth-child(2) > span', multiple: true, processor: null },
            desc: { query: 'p.wrap-break-words', multiple: false, processor: null },
            actionBtn: null
        }
    },
    opts: {
        goBackAfterScrapeComplete: false,
        handleCookies: null
    }
}

export default datapizza