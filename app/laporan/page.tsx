export const dynamic = "force-dynamic"
export const revalidate = 0

import Sidebar from "@/components/Sidebar"
import LaporanClient from "./LaporanClient"
import { createClient } from "@supabase/supabase-js"

export default async function LaporanPage() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: orgData } = await supabaseAdmin
    .from("organizations")
    .select("*")
    .limit(1)
    .single()

  const activeOrgId = orgData?.id || ""

  return (
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-[#1e293b] border-b border-slate-700 px-8 py-6 shadow-xl">
          <h1 className="text-2xl font-bold text-blue-400 tracking-tight">Laporan Data</h1>
          <p className="text-slate-400 text-sm mt-1">
            Unduh data kunjungan pasien dan transaksi apotek dalam format Excel atau PDF
          </p>
        </header>
        
        <main className="flex-1 overflow-auto p-8">
          <LaporanClient orgId={activeOrgId} org={orgData} />
        </main>
      </div>
    </div>
  )
}