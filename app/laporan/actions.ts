"use server"

import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getLaporanKunjungan(orgId: string, startDate: string, endDate: string) {
  const start = `${startDate}T00:00:00+08:00`
  const end = `${endDate}T23:59:59+08:00`

  const [visitsRes, patientsRes, rmRes, presRes, presItemsRes, medsRes] = await Promise.all([
    supabaseAdmin
      .from("patient_visits")
      .select("*")
      .eq("organization_id", orgId)
      .gte("visit_date", start)
      .lte("visit_date", end)
      .order("visit_date", { ascending: true }),
    supabaseAdmin
      .from("patients")
      .select("*")
      .eq("organization_id", orgId),
    supabaseAdmin
      .from("medical_records")
      .select("*")
      .eq("organization_id", orgId)
      .order("finalized_at", { ascending: true }),
    supabaseAdmin
      .from("prescriptions")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("prescription_items")
      .select("*"),
    supabaseAdmin
      .from("medicines")
      .select("*")
      .eq("organization_id", orgId)
  ])

  if (visitsRes.error) throw new Error(visitsRes.error.message)

  return {
    visits: visitsRes.data || [],
    patients: patientsRes.data || [],
    medicalRecords: rmRes.data || [],
    prescriptions: presRes.data || [],
    prescriptionItems: presItemsRes.data || [],
    medicines: medsRes.data || []
  }
}

export async function getLaporanPenjualan(orgId: string, startDate: string, endDate: string) {
  const start = `${startDate}T00:00:00+08:00`
  const end = `${endDate}T23:59:59+08:00`

  const [salesRes, itemsRes, medsRes, batchesRes, presRes, presItemsRes] = await Promise.all([
    supabaseAdmin
      .from("sales")
      .select("*")
      .eq("organization_id", orgId)
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("sale_items")
      .select("*"),
    supabaseAdmin
      .from("medicines")
      .select("*")
      .eq("organization_id", orgId),
    supabaseAdmin
      .from("medicine_batches")
      .select("*"),
    supabaseAdmin
      .from("prescriptions")
      .select(`
        *,
        patient_visits (
          patients ( full_name, patient_number )
        )
      `)
      .eq("organization_id", orgId)
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("prescription_items")
      .select("*")
  ])

  if (salesRes.error) throw new Error(salesRes.error.message)

  return {
    sales: salesRes.data || [],
    saleItems: itemsRes.data || [],
    medicines: medsRes.data || [],
    batches: batchesRes.data || [],
    prescriptions: presRes.data || [],
    prescriptionItems: presItemsRes.data || []
  }
}