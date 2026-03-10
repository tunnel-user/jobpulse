import mongoose from 'mongoose'
import { log } from './utils'

const MONGO_URI = process.env.MONGO_URI

if (!MONGO_URI) {
    throw new Error('❌ MONGO_URI is not defined in environment variables.')
}

export async function connectDB(): Promise<void> {
    if (mongoose.connection.readyState >= 1) return // already connected

    await mongoose.connect(MONGO_URI as string)
    log('success', `MongoDB connected at db: ${mongoose.connection.name}`)
}

export async function disconnectDB(): Promise<void> {
    await mongoose.disconnect()
    log('error', 'MongoDB disconnected.')
}