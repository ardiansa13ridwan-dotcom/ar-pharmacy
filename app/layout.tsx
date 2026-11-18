import "./globals.css"
import Sidebar from "@/components/Sidebar"

export const metadata = {
  title: 'AR Pharmacy',
  description: 'Sistem Manajemen Terpadu'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body suppressHydrationWarning className="flex min-h-screen bg-slate-50 overflow-hidden">
        <Sidebar />
        <main className="flex-1 h-screen overflow-y-auto w-full">
          {children}
        </main>
      </body>
    </html>
  )
}