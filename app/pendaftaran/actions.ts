"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function hapusDataPasien(patientId: string) {
  if (!patientId) throw new Error("ID Pasien tidak valid")

  await supabaseAdmin.from("patient_visits").delete().eq("patient_id", patientId)
  const { error } = await supabaseAdmin.from("patients").delete().eq("id", patientId)

  if (error) {
    throw new Error("Gagal menghapus data pasien: " + error.message)
  }

  revalidatePath("/pendaftaran")
  revalidatePath("/rekam-medis")
}

export async function masukanKeAntrean(orgId: string, formData: FormData) {
  if (!orgId) throw new Error("ID Organisasi tidak valid")

  const patientId = formData.get("patientId") as string
  if (!patientId) throw new Error("ID Pasien tidak ditemukan")

  const witaDateTime = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Makassar" })
  const witaDate = witaDateTime.split(" ")[0]
  const startOfDayWITA = `${witaDate}T00:00:00+08:00`

  const { data: antreanAktif } = await supabaseAdmin
    .from("patient_visits")
    .select("id, queue_number")
    .eq("organization_id", orgId)
    .eq("patient_id", patientId)
    .ilike("status", "menunggu")
    .gte("visit_date", startOfDayWITA)
    .limit(1)

  if (antreanAktif && antreanAktif.length > 0) {
    revalidatePath("/pendaftaran")
    return {
      sudahAntre: true,
      nomorAntrean: antreanAktif[0].queue_number
    }
  }

  const { data: visitHariIni } = await supabaseAdmin
    .from("patient_visits")
    .select("queue_number")
    .eq("organization_id", orgId)
    .gte("visit_date", startOfDayWITA)
    .order("queue_number", { ascending: false })
    .limit(1)

  const nomorBerikutnya =
    visitHariIni && visitHariIni.length > 0
      ? Number(visitHariIni[0].queue_number || 0) + 1
      : 1

  const { error } = await supabaseAdmin.from("patient_visits").insert({
    organization_id: orgId,
    patient_id: patientId,
    queue_number: nomorBerikutnya,
    status: "Menunggu",
    visit_date: new Date().toISOString()
  })

  if (error) {
    throw new Error("Gagal memasukkan pasien ke antrean: " + error.message)
  }

  revalidatePath("/pendaftaran")
  revalidatePath("/rekam-medis")

  return {
    sudahAntre: false,
    nomorAntrean: nomorBerikutnya
  }
}

export async function daftarkanPasien(orgId: string, formData: FormData) {
  if (!orgId) throw new Error("ID Organisasi tidak valid")

  const fullName = ((formData.get("fullName") as string) || "").trim()
  const dob = (formData.get("dob") as string) || ""
  const phone = ((formData.get("phone") as string) || "").trim()
  const address = ((formData.get("address") as string) || "").trim()

  if (!fullName || !dob) {
    throw new Error("Nama lengkap dan tanggal lahir wajib diisi")
  }

  const { data: pasienLama } = await supabaseAdmin
    .from("patients")
    .select("id, full_name, patient_number, date_of_birth")
    .eq("organization_id", orgId)
    .ilike("full_name", fullName)
    .eq("date_of_birth", dob)
    .limit(1)

  let targetPatientId = ""
  let isDuplicate = false
  let nomorRmFinal = ""
  let namaFinal = fullName

  if (pasienLama && pasienLama.length > 0) {
    targetPatientId = pasienLama[0].id
    isDuplicate = true
    nomorRmFinal = pasienLama[0].patient_number
    namaFinal = pasienLama[0].full_name
  } else {
    const tglStr = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    const acak = Math.floor(100 + Math.random() * 900)
    const nomorRm = `RM-${tglStr}-${acak}`

    const { data: pasienBaru, error: errPasien } = await supabaseAdmin
      .from("patients")
      .insert({
        organization_id: orgId,
        patient_number: nomorRm,
        full_name: fullName,
        date_of_birth: dob,
        phone: phone || null,
        address: address || null
      })
      .select("id")
      .single()

    if (errPasien) {
      throw new Error("Gagal mendaftarkan pasien baru: " + errPasien.message)
    }

    targetPatientId = pasienBaru.id
    nomorRmFinal = nomorRm
  }

  const formAntrean = new FormData()
  formAntrean.set("patientId", targetPatientId)
  const hasilAntrean = await masukanKeAntrean(orgId, formAntrean)

  revalidatePath("/pendaftaran")
  revalidatePath("/rekam-medis")

  return {
    isDuplicate,
    patientName: namaFinal,
    patientNumber: nomorRmFinal,
    sudahAntre: hasilAntrean?.sudahAntre || false,
    nomorAntrean: hasilAntrean?.nomorAntrean || 1
  }
}