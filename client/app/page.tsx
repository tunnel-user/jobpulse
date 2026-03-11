import { fetchPosts, fetchConnectors } from '@/lib/api'

export const dynamic   = 'force-dynamic'
export const revalidate = 0

export default async function Home() {
    const [{ data: posts, meta }, connectors] = await Promise.all([
        fetchPosts({ limit: 100 }),
        fetchConnectors(),
    ])

    return (
        <main className="min-h-screen">
            {/* Header */}
            <header className="border-b border-border sticky top-0 z-40 bg-ink/90 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className='size-2 rounded-full bg-pulse animate-pulse'></div>
                        <span className="font-mono text-xl font-medium text-pulse tracking-[3px]">
                            jobpulse
                        </span>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            </div>
        </main>
    )
}