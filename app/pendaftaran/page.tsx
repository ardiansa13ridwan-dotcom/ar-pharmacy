export const dynamic = "force-dynamic"

import Sidebar from "@/components/Sidebar"
import { createClient } from "@supabase/supabase-js"
import PendaftaranClient from "./PendaftaranClient"

export default async function PendaftaranPage() {
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
  
  let patients: any[] = []
  let activeVisits: any[] = []

  if (activeOrgId) {
    const { data: patientData } = await supabaseAdmin
      .from("patients")
      .select("*")
      .eq("organization_id", activeOrgId)
      .order("created_at", { ascending: false })
    
    if (patientData) patients = patientData

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { data: visitData } = await supabaseAdmin
      .from("patient_visits")
      .select("id, queue_number, status, visit_date, patients(full_name, patient_number)")
      .eq("organization_id", activeOrgId)
      .gte("visit_date", todayStart.toISOString())
      .order("queue_number", { ascending: true })

    if (visitData) activeVisits = visitData
  }

  return (
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Pendaftaran Pasien</h1>
          <p className="text-slate-500 mt-1 font-medium">Daftarkan identitas baru dan kelola antrean kunjungan hari ini.</p>
        </div>

        <PendaftaranClient orgId={activeOrgId} patients={patients} activeVisits={activeVisits} />
      </div>
    </div>
  )
}