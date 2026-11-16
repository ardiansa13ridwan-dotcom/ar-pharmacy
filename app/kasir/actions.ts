"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function batalkanResep(prescriptionId: string) {
  if (!prescriptionId) throw new Error("ID Resep tidak valid")

  const { error } = await supabaseAdmin
    .from("prescriptions")
    .update({ status: "Dibatalkan" })
    .eq("id", prescriptionId)

  if (error) {
    throw new Error("Gagal membatalkan resep: " + error.message)
  }

  revalidatePath("/kasir")
  revalidatePath("/laporan")
  return { success: true }
}

export async function prosesCheckout(
  orgId: string,
  cart: any[],
  totalAmount: number,
  paymentMethod: string,
  prescriptionId?: string | null,
  customerName?: string | null
) {
  if (!orgId) throw new Error("ID Apotek tidak valid")
  if (cart.length === 0 && !prescriptionId && totalAmount <= 0) {
    throw new Error("Keranjang transaksi masih kosong")
  }

  const invoiceNumber = "INV-" + Math.floor(Date.now() / 1000)

  if (cart.length > 0 || totalAmount > 0) {
    const payloadLengkap: any = {
      organization_id: orgId,
      invoice_number: invoiceNumber,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      status: "selesai"
    }

    if (prescriptionId) payloadLengkap.prescription_id = prescriptionId
    if (customerName) payloadLengkap.customer_name = customerName

    let saleData: any = null

    const { data: trySale, error: tryError } = await supabaseAdmin
      .from("sales")
      .insert(payloadLengkap)
      .select()
      .single()

    if (tryError) {
      const { data: fallbackSale, error: fallbackError } = await supabaseAdmin
        .from("sales")
        .insert({
          organization_id: orgId,
          invoice_number: invoiceNumber,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          status: "selesai"
        })
        .select()
        .single()

      if (fallbackError) throw new Error("Gagal membuat transaksi: " + fallbackError.message)
      saleData = fallbackSale
    } else {
      saleData = trySale
    }

    const saleId = saleData.id

    for (const item of cart) {
      let remainingQty = Number(item.quantity ?? item.qty ?? 0)
      if (remainingQty <= 0) continue

      const { data: batches, error: batchError } = await supabaseAdmin
        .from("medicine_batches")
        .select("id, medicine_id, quantity, expiration_date")
        .eq("medicine_id", item.id)
        .gt("quantity", 0)
        .order("expiration_date", { ascending: true })

      if (batchError || !batches || batches.length === 0) {
        throw new Error(`Stok obat ${item.name} kosong di sistem.`)
      }

      const totalTersedia = batches.reduce((sum, b) => sum + Number(b.quantity || 0), 0)
      if (totalTersedia < remainingQty) {
        throw new Error(`Sisa stok ${item.name} tidak cukup. Stok tersedia: ${totalTersedia}`)
      }

      for (const batch of batches) {
        if (remainingQty <= 0) break

        const stokBatch = Number(batch.quantity || 0)
        if (stokBatch <= 0) continue

        const deductQty = Math.min(stokBatch, remainingQty)
        const unitPrice = Number(
          item.sales_price ||
          item.selling_price ||
          item.price ||
          0
        )

        const { error: itemError } = await supabaseAdmin
          .from("sale_items")
          .insert({
            sale_id: saleId,
            medicine_id: item.id,
            batch_id: batch.id,
            quantity: deductQty,
            price: unitPrice,
            subtotal: Math.imul(deductQty, unitPrice)
          })

        if (itemError) {
          throw new Error("Gagal menyimpan rincian obat: " + itemError.message)
        }

        const { error: updateError } = await supabaseAdmin
          .from("medicine_batches")
          .update({ quantity: stokBatch - deductQty })
          .eq("id", batch.id)

        if (updateError) {
          throw new Error("Gagal memperbarui stok lot: " + updateError.message)
        }

        remainingQty -= deductQty
      }
    }
  }

  if (prescriptionId) {
    const { error: presError } = await supabaseAdmin
      .from("prescriptions")
      .update({ status: "Selesai" })
      .eq("id", prescriptionId)

    if (presError) {
      throw new Error("Gagal memperbarui status resep: " + presError.message)
    }
  }

  revalidatePath("/kasir")
  revalidatePath("/apotek")
  revalidatePath("/laporan")
  revalidatePath("/rekam-medis")

  return { success: true, invoice: invoiceNumber }
}