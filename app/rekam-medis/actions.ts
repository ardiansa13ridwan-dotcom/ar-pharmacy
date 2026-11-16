"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function batalkanAntreanKunjungan(visitId: string) {
  if (!visitId) throw new Error("ID Kunjungan tidak valid")

  const { error } = await supabaseAdmin
    .from("patient_visits")
    .update({ status: "Dibatalkan" })
    .eq("id", visitId)

  if (error) {
    throw new Error("Gagal membatalkan antrean: " + error.message)
  }

  revalidatePath("/rekam-medis")
  revalidatePath("/pendaftaran")
  revalidatePath("/laporan")
  return { success: true }
}

export async function ambilRiwayatPasien(orgId: string, patientId: string, currentVisitId: string) {
  if (!orgId || !patientId) return []

  let targetPatientIds = [patientId]

  const { data: currentPatient } = await supabaseAdmin
    .from("patients")
    .select("*")
    .eq("id", patientId)
    .single()

  if (currentPatient?.full_name) {
    const tglLahirTarget = currentPatient.date_of_birth || currentPatient.birth_date || null

    let query = supabaseAdmin
      .from("patients")
      .select("id, date_of_birth, birth_date")
      .eq("organization_id", orgId)
      .ilike("full_name", currentPatient.full_name.trim())

    const { data: sameNamePatients } = await query

    if (sameNamePatients && sameNamePatients.length > 0) {
      targetPatientIds = sameNamePatients
        .filter((p: any) => {
          const tglP = p.date_of_birth || p.birth_date || null
          if (tglLahirTarget && tglP) {
            return tglP === tglLahirTarget
          }
          return p.id === patientId
        })
        .map((p: any) => p.id)
    }
  }

  const { data: visits } = await supabaseAdmin
    .from("patient_visits")
    .select("id, patient_id, visit_date, status")
    .eq("organization_id", orgId)
    .in("patient_id", targetPatientIds)
    .neq("id", currentVisitId)
    .order("visit_date", { ascending: false })
    .limit(10)

  if (!visits || visits.length === 0) return []

  const visitIds = visits.map(v => v.id)

  const [rmRes, presRes, medsRes] = await Promise.all([
    supabaseAdmin
      .from("medical_records")
      .select("visit_id, chief_complaint, physical_examination, diagnosis, action_plan, finalized_at")
      .in("visit_id", visitIds),
    supabaseAdmin
      .from("prescriptions")
      .select("id, visit_id, prescription_number")
      .in("visit_id", visitIds),
    supabaseAdmin
      .from("medicines")
      .select("id, name")
      .eq("organization_id", orgId)
  ])

  const presList = presRes.data || []
  const presIds = presList.map(p => p.id)

  let presItems: any[] = []
  if (presIds.length > 0) {
    const { data: itemsData } = await supabaseAdmin
      .from("prescription_items")
      .select("prescription_id, medicine_id, quantity, instructions")
      .in("prescription_id", presIds)
    if (itemsData) presItems = itemsData
  }

  const medMap = new Map<string, string>((medsRes.data || []).map((m: any) => [m.id, m.name]))

  return visits
    .map(v => {
      const rm = (rmRes.data || []).find((r: any) => r.visit_id === v.id)
      const pres = presList.find((p: any) => p.visit_id === v.id)
      const items = pres
        ? presItems
            .filter((i: any) => i.prescription_id === pres.id)
            .map((i: any) => ({
              namaObat: i.medicine_id ? medMap.get(i.medicine_id) || "Obat Apotek" : i.instructions || "Obat Luar",
              isManual: !i.medicine_id,
              qty: i.quantity,
              aturan: i.instructions
            }))
        : []

      return {
        id: v.id,
        tanggal: v.visit_date,
        keluhan: rm?.chief_complaint || "-",
        pemeriksaan: rm?.physical_examination || "-",
        diagnosis: rm?.diagnosis || "-",
        tindakan: rm?.action_plan || "-",
        adaRekamMedis: Boolean(rm),
        obat: items
      }
    })
    .filter(item => item.adaRekamMedis)
}

export async function simpanRekamMedis(
  orgId: string,
  visitId: string,
  doctorId: string,
  formData: FormData,
  resepObat: any[]
) {
  if (!orgId) throw new Error("Organisasi tidak valid")

  const keluhan = formData.get("keluhan") as string
  const pemeriksaan = formData.get("pemeriksaan") as string
  const diagnosis = formData.get("diagnosis") as string
  const tindakan = formData.get("tindakan") as string

  const { error: recordError } = await supabaseAdmin
    .from("medical_records")
    .insert({
      organization_id: orgId,
      visit_id: visitId,
      doctor_id: doctorId || null,
      chief_complaint: keluhan,
      physical_examination: pemeriksaan,
      diagnosis: diagnosis,
      action_plan: tindakan,
      is_final: true,
      finalized_at: new Date().toISOString()
    })

  if (recordError) throw new Error("Gagal menyimpan rekam medis: " + recordError.message)

  if (resepObat && resepObat.length > 0) {
    const noResep = "RSP-" + Math.floor(Date.now() / 1000)

    const { data: resepData, error: resepError } = await supabaseAdmin
      .from("prescriptions")
      .insert({
        organization_id: orgId,
        visit_id: visitId,
        doctor_id: doctorId || null,
        prescription_number: noResep,
        status: "Menunggu"
      })
      .select()
      .single()

    if (resepError) throw new Error("Gagal membuat nomor resep: " + resepError.message)

    const rincianResep = resepObat.map(obat => ({
      prescription_id: resepData.id,
      medicine_id: obat.isManual ? null : obat.id,
      quantity: obat.qty,
      instructions: obat.isManual
        ? `[OBAT LUAR] ${obat.nama} (${obat.aturan})`
        : obat.aturan
    }))

    const { error: itemError } = await supabaseAdmin.from("prescription_items").insert(rincianResep)
    if (itemError) throw new Error("Gagal menyimpan rincian obat: " + itemError.message)
  }

  const { error: visitError } = await supabaseAdmin
    .from("patient_visits")
    .update({ status: "Selesai" })
    .eq("id", visitId)

  if (visitError) throw new Error("Gagal memperbarui status antrean: " + visitError.message)

  revalidatePath("/rekam-medis")
  revalidatePath("/pendaftaran")
  revalidatePath("/kasir")
  return { success: true }
}