import type { Metadata } from 'next'
import { Syne, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const syne = Syne({
    subsets: ['latin'],
    variable: '--font-syne',
    weight: ['400', '500', '600', '700', '800'],
})

const jetbrains = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-jetbrains',
    weight: ['400', '500'],
})

export const metadata: Metadata = {
    title: 'jobpulse',
    description: 'Live-scraped Italian job boards.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="it" className={`${syne.variable} ${jetbrains.variable}`}>
            <body className="bg-ink text-text antialiased">{children}</body>
        </html>
    )
}