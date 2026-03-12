export interface Post {
    _id:          string
    connector_id: string
    logo:         string | null
    jobTitle:     string
    company:      string
    jobTags:      string[] | null
    techTags:     string[] | null
    desc:         string
    scrapedAt:    string
    isNew:        boolean
}

export interface PostsResponse {
    data: Post[]
    meta: {
        total:  number
        page:   number
        limit:  number
        pages:  number
    }
}

export type BadgePhase = 'active' | 'completing' | 'exiting'

export interface BadgeItem {
    id:           string
    connector_id: string
    status:       ScrapingProgress
    phase:        BadgePhase
}

export interface AnimatedPost {
    post:    Post
    exiting: boolean
}

export interface Props {
    initialPosts: Post[]
    connectors:   string[]
}

export type ToastKind = 'success' | 'error'
export interface ToastData { kind: ToastKind, message: string, id: number }

export interface ScrapingProgress {
    connector_id: string
    value:        number | null
    current:      number | null
    max:          number | null
}

export interface SpinnerProps {
    radius: number
    strokeWidth: number
    size: number
    centerPoint: number
    circumference: number
    color: string
    trackColor: string
    isDeterminate: boolean
    progress: number
    offset: number
}

export interface ConnPalette {
    color: string,
    style: React.CSSProperties
}