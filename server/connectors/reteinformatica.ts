import type { ElementHandle, Page } from 'playwright'
import { JobConnector } from "../types"

const reteInformatica: JobConnector = {
    name: 'reteInformatica',
    url: 'https://reteinformaticalavoro.it/offerte-di-lavoro',
    selector: {
        list: '.row > .col-sm-6',
        next: {
            query: 'a[aria-label="pagination.next"]',
            validate: async (el: ElementHandle<Element> | null): Promise<boolean> => {
                if (!el) return false
                return true
            },
            maxPages: async (el: Page | null): Promise<number> => {
                if (!el) return 1
                return await el.evaluate(() => {
                    const items = document.querySelectorAll('.pagination > *')
                    if (items.length < 2) return 1
                    const lastPageEl = items[items.length - 2]
                    return parseInt(lastPageEl.textContent?.trim() || '1', 10) || 1
                })
            }
        },
        card: {
            logo: { query: 'img.logo-company', multiple: false, processor: null },
            jobTitle: { query: 'h1.jobinfo-title', multiple: false, processor: null },
            company: { query: '.text-black-underline.font-size-venti b', multiple: false, processor: null },
            jobTags: {
                query: '.col-sm-12.offer-top > div',
                multiple: true,
                processor: (tags: string[]) =>
                    tags.map(tag => {
                        const match = tag.match(/^(.+?):\s*(.*)$/)
                        if (!match) return
                        const [key, value] = [match[1].trim(), match[2].trim()]
                        return `${key}: ${value}`
                    })
            },
            techTags: { query: '.row .col-lg-12 > div:not(:last-child)', multiple: true, processor: null },
            desc: { query: '.page--content-block', multiple: false, processor: null },
            actionBtn: { query: '.btn-job-ads-list', multiple: false, processor: null }
        }
    },
    opts: {
        goBackAfterScrapeComplete: true,
        handleCookies: async (page: Page) => {
            await page.click('button.CybotCookiebotBannerCloseButton')
        }
    }
}

export default reteInformatica