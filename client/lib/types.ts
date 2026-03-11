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

export interface ConnPalette {
    color: string,
    style: React.CSSProperties
}