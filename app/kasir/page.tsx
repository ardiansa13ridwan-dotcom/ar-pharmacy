export const dynamic = "force-dynamic"
export const revalidate = 0

import Sidebar from "@/components/Sidebar"
import { createClient } from "@supabase/supabase-js"
import KasirClient from "./KasirClient"

export default async function KasirPage() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: orgData } = await supabaseAdmin
    .from("organizations")
    .select("*")
    .limit(1)
    .single()

  const activeOrgId = orgData?.id || ""
  let medicines: any[] = []
  let prescriptions: any[] = []

  if (activeOrgId) {
    const { data: medData } = await supabaseAdmin
      .from("medicines")
      .select(`
        id, 
        name, 
        code,
        sales_price,
        sales_unit,
        medicine_batches(quantity)
      `)
      .eq("organization_id", activeOrgId)
      .order("name", { ascending: true })

    if (medData) medicines = medData

    const { data: presData } = await supabaseAdmin
      .from("prescriptions")
      .select(`
        id,
        prescription_number,
        status,
        created_at,
        visit_id,
        patient_visits(
          id,
          queue_number,
          patients(full_name, patient_number)
        )
      `)
      .eq("organization_id", activeOrgId)
      .ilike("status", "menunggu")
      .order("created_at", { ascending: true })

    if (presData && presData.length > 0) {
      const presIds = presData.map((p: any) => p.id)
      const { data: itemsData } = await supabaseAdmin
        .from("prescription_items")
        .select("id, prescription_id, medicine_id, quantity, instructions")
        .in("prescription_id", presIds)

      prescriptions = presData.map((p: any) => ({
        ...p,
        items: (itemsData || []).filter((item: any) => item.prescription_id === p.id)
      }))
    }
  }

  const KasirView: any = KasirClient

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Kasir Point of Sale (POS)</h1>
          <p className="text-slate-500">Pilih obat, proses antrean resep dokter, dan selesaikan transaksi penjualan.</p>
        </div>
        <div className="max-w-6xl mx-auto">
          <KasirView
            orgId={activeOrgId}
            org={orgData}
            medicines={medicines}
            prescriptions={prescriptions}
          />
        </div>
      </div>
    </div>
  )
}