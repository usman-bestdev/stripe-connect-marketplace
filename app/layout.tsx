import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/context/cart-context'
import { Nav } from '@/components/nav'
import { Toaster } from '@/components/ui/sonner'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'Stripe Connect Marketplace',
  description: 'Multi-party marketplace powered by Stripe Connect Express',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-zinc-50 font-sans">
        <CartProvider>
          <Nav />
          <main className="flex-1">{children}</main>
          <Toaster position="bottom-right" />
        </CartProvider>
      </body>
    </html>
  )
}
