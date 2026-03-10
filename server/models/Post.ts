import mongoose, { Schema, Document, Model } from 'mongoose'

// TypeScript interface
export interface IPost {
    connector_id: string   // which connector scraped this
    logo:         string | null
    jobTitle:     string
    company:      string
    jobTags:      string[] | null
    techTags:     string[] | null
    desc:         string
    scrapedAt:    Date
}

// Document type (IPost + Mongoose Document helpers)
export interface IPostDocument extends IPost, Document {}

// Schema
const PostSchema = new Schema<IPostDocument>(
    {
        connector_id: { type: String,   required: true, index: true },
        logo:         { type: String,   default: null },
        jobTitle:     { type: String,   required: true },
        company:      { type: String,   required: true },
        jobTags:      { type: [String], default: null },
        techTags:     { type: [String], default: null },
        desc:         { type: String,   required: true },
        scrapedAt:    { type: Date,     default: () => new Date() },
    },
    {
        collection: 'posts',
        timestamps: false,   // we handle scrapedAt ourselves
    }
)

// Compound unique index: avoid duplicate posts from the same connector
PostSchema.index({ connector_id: 1, jobTitle: 1, company: 1 }, { unique: true })

// Model
export const Post: Model<IPostDocument> =
    mongoose.models.Post ?? mongoose.model<IPostDocument>('Post', PostSchema)