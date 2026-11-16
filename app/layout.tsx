import './globals.css'

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
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}