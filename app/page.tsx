export const dynamic = "force-dynamic"
export const revalidate = 0

import Sidebar from "@/components/Sidebar"
import { createClient } from "@supabase/supabase-js"
import DashboardClient from "./DashboardClient"

export default async function HomePage() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: orgData } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .limit(1)
    .single()

  const activeOrgId = orgData?.id || ""

  let semuaTransaksi: any[] = []
  let semuaProduk: any[] = []
  let obatMenipis: any[] = []
  let antreanHariIni: any[] = []

  if (activeOrgId) {
    const { data: salesData } = await supabaseAdmin
      .from("sales")
      .select("id, invoice_number, total_amount, payment_method, created_at")
      .eq("organization_id", activeOrgId)
      .ilike("status", "selesai")
      .order("created_at", { ascending: false })

    if (salesData) {
      const deduplicated: any[] = []
      for (const s of salesData) {
        const waktuSekarang = new Date(s.created_at).getTime()
        const isDup = deduplicated.some((existing) => {
          const waktuExisting = new Date(existing.created_at).getTime()
          const selisihDetik = Math.abs(waktuSekarang - waktuExisting) / 1000
          return (
            Number(existing.total_amount) === Number(s.total_amount) &&
            existing.payment_method === s.payment_method &&
            selisihDetik <= 60
          )
        })
        if (!isDup) {
          deduplicated.push(s)
        }
      }
      semuaTransaksi = deduplicated
    }

    const { data: medData } = await supabaseAdmin
      .from("medicines")
      .select("*, medicine_batches(quantity)")
      .eq("organization_id", activeOrgId)
      .order("name", { ascending: true })

    if (medData) {
      semuaProduk = medData.map((med: any) => {
        const stok =
          med.medicine_batches?.reduce(
            (sum: number, batch: any) => sum + Number(batch.quantity || 0),
            0
          ) || 0
        return {
          nama: med.name,
          kode: med.code,
          harga: Number(med.sales_price || 0),
          stok
        }
      })

      obatMenipis = semuaProduk
        .filter((med: any) => med.stok < 10)
        .sort((a: any, b: any) => a.stok - b.stok)
        .slice(0, 6)
    }

    const witaDateTime = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Makassar" })
    const witaDate = witaDateTime.split(" ")[0]
    const startOfDayWITA = `${witaDate}T00:00:00+08:00`

    const { data: visitData } = await supabaseAdmin
      .from("patient_visits")
      .select("id, queue_number, status, patients(full_name, patient_number)")
      .eq("organization_id", activeOrgId)
      .ilike("status", "menunggu")
      .gte("visit_date", startOfDayWITA)
      .order("queue_number", { ascending: true })

    if (visitData) antreanHariIni = visitData
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Ringkasan Operasional</h1>
            <p className="text-slate-500 mt-1 font-medium">
              Pantau performa apotek dan pergerakan stok secara real-time.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-bold text-slate-700">Sistem Online</span>
          </div>
        </div>

        <DashboardClient
          semuaTransaksi={semuaTransaksi}
          semuaProduk={semuaProduk}
          antreanHariIni={antreanHariIni}
          obatMenipis={obatMenipis}
        />
      </div>
    </div>
  )
}