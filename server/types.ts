import type { ElementHandle, Page } from 'playwright'

export interface Query {
    query:     string
    multiple:  boolean
    processor: Function | null
}

export interface Next {
    query:    string
    validate: (el: ElementHandle<Element> | null) => Promise<boolean>
    maxPages: ((page: Page) => Promise<number>) | null
}

export interface JobConnector {
    name: string
    url:  string
    opts: JobConnectorOpts
    selector: {
        list: string
        next: Next
        card: {
            actionBtn: Query | null
            logo:      Query | null
            jobTitle:  Query
            company:   Query
            jobTags:   Query | null
            techTags:  Query | null
            desc:      Query
        }
    }
}

export interface JobConnectorOpts {
    goBackAfterScrapeComplete: boolean
    handleCookies:             Function | null
}

export type ScrapedJob = {
    connector_id: string
    logo:         string | null
    jobTitle:     string
    company:      string
    jobTags:      string[] | null
    techTags:     string[] | null
    desc:         string
}