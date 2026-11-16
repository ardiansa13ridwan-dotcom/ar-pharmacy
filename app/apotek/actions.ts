"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function tambahKategori(orgId: string, formData: FormData) {
  if (!orgId) throw new Error("ID Apotek tidak valid")
  const name = formData.get("name") as string
  const { error } = await supabaseAdmin.from("medicine_categories").insert({
    organization_id: orgId,
    name: name
  })
  if (error) throw new Error(error.message)
  revalidatePath("/apotek")
}

export async function editKategori(formData: FormData) {
  const id = formData.get("id") as string
  const name = formData.get("name") as string
  const { error } = await supabaseAdmin.from("medicine_categories").update({ name: name }).eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/apotek")
}

export async function hapusKategori(formData: FormData) {
  const id = formData.get("id") as string
  const { error } = await supabaseAdmin.from("medicine_categories").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/apotek")
}

export async function tambahObat(orgId: string, formData: FormData) {
  if (!orgId) throw new Error("ID Apotek tidak valid")
  const name = formData.get("name") as string
  const code = formData.get("code") as string
  const categoryId = formData.get("categoryId") as string
  const salesUnit = formData.get("salesUnit") as string
  const salesPrice = parseFloat(formData.get("salesPrice") as string) || 0

  const { error } = await supabaseAdmin.from("medicines").insert({
    organization_id: orgId,
    name: name,
    code: code,
    category_id: categoryId,
    sales_unit: salesUnit,
    sales_price: salesPrice
  })
  if (error) throw new Error(error.message)
  revalidatePath("/apotek")
  revalidatePath("/kasir")
  revalidatePath("/")
}

export async function editObat(formData: FormData) {
  const id = formData.get("id") as string
  const name = formData.get("name") as string
  const code = formData.get("code") as string
  const categoryId = formData.get("categoryId") as string
  const salesUnit = formData.get("salesUnit") as string
  const salesPrice = parseFloat(formData.get("salesPrice") as string) || 0

  const { error } = await supabaseAdmin.from("medicines").update({
    name: name,
    code: code,
    category_id: categoryId,
    sales_unit: salesUnit,
    sales_price: salesPrice
  }).eq("id", id)
  if (error) throw new Error(error.message)

  // Simpan perubahan jumlah stok per lot jika diedit dari tabel
  for (const [key, value] of Array.from(formData.entries())) {
    if (key.startsWith("batch_qty_")) {
      const batchId = key.replace("batch_qty_", "")
      const newQty = parseInt(value as string)
      if (!isNaN(newQty) && newQty >= 0) {
        await supabaseAdmin
          .from("medicine_batches")
          .update({ quantity: newQty })
          .eq("id", batchId)
      }
    }
  }

  revalidatePath("/apotek")
  revalidatePath("/kasir")
  revalidatePath("/")
}

export async function hapusObat(formData: FormData) {
  const id = formData.get("id") as string
  await supabaseAdmin.from("medicine_batches").delete().eq("medicine_id", id)
  const { error } = await supabaseAdmin.from("medicines").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/apotek")
  revalidatePath("/kasir")
  revalidatePath("/")
}

export async function tambahStok(formData: FormData) {
  const medicineId = formData.get("medicineId") as string
  const batchNumber = (formData.get("batchNumber") as string)?.trim().toUpperCase()
  const expirationDate = formData.get("expirationDate") as string
  const quantity = parseInt(formData.get("quantity") as string)
  
  if (!medicineId) throw new Error("Obat belum dipilih")

  // Cek apakah nomor lot yang sama untuk obat ini sudah ada
  const { data: existingBatch } = await supabaseAdmin
    .from("medicine_batches")
    .select("*")
    .eq("medicine_id", medicineId)
    .eq("batch_number", batchNumber)
    .maybeSingle()

  if (existingBatch) {
    const { error } = await supabaseAdmin
      .from("medicine_batches")
      .update({
        quantity: Number(existingBatch.quantity || 0) + quantity,
        expiration_date: expirationDate
      })
      .eq("id", existingBatch.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabaseAdmin.from("medicine_batches").insert({
      medicine_id: medicineId,
      batch_number: batchNumber,
      expiration_date: expirationDate,
      quantity: quantity
    })
    if (error) throw new Error(error.message)
  }

  revalidatePath("/apotek")
  revalidatePath("/kasir")
  revalidatePath("/")
}

export async function hapusStok(formData: FormData) {
  const id = formData.get("id") as string
  await supabaseAdmin.from("sale_items").update({ batch_id: null }).eq("batch_id", id)
  const { error } = await supabaseAdmin.from("medicine_batches").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/apotek")
  revalidatePath("/kasir")
  revalidatePath("/")
}