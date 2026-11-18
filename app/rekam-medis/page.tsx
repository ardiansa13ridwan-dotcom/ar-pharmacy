export const dynamic = "force-dynamic"
export const revalidate = 0

import Sidebar from "@/components/Sidebar"
import { createClient } from "@supabase/supabase-js"
import RekamMedisClient from "./RekamMedisClient"

export default async function RekamMedisPage() {
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
  
  let antreanList: any[] = []
  let obatList: any[] = []

  if (activeOrgId) {
    const witaDateTime = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Makassar" })
    const witaDate = witaDateTime.split(" ")[0]
    const startOfDayWITA = `${witaDate}T00:00:00+08:00`

    const { data: antreanData } = await supabaseAdmin
      .from("patient_visits")
      .select("id, patient_id, queue_number, status, doctor_id, patients(full_name, patient_number)")
      .eq("organization_id", activeOrgId)
      .ilike("status", "menunggu")
      .gte("visit_date", startOfDayWITA)
      .order("queue_number", { ascending: true })

    if (antreanData) antreanList = antreanData

    const { data: medData } = await supabaseAdmin
      .from("medicines")
      .select("id, name, code, medicine_batches(quantity)")
      .eq("organization_id", activeOrgId)
      .order("name", { ascending: true })

    if (medData) obatList = medData
  }

  return (
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-[#1e293b] border-b border-slate-700 px-8 py-6 shadow-xl">
          <h1 className="text-2xl font-bold text-blue-400 tracking-tight">Rekam Medis</h1>
          <p className="text-slate-400 text-sm mt-1">Kelola pemeriksaan pasien, riwayat berobat, dan penulisan resep</p>
        </header>
        
        <main className="flex-1 overflow-auto p-8">
          <RekamMedisClient antrean={antreanList} obat={obatList} orgId={activeOrgId} />
        </main>
      </div>
  )
}