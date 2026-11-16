"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function ambilProfilToko() {
  const { data } = await supabaseAdmin
    .from("organizations")
    .select("id, name, tagline, address, phone, logo_url")
    .limit(1)
    .maybeSingle()

  return data
}

export async function ambilRolePengguna(userId: string) {
  if (!userId) return ""

  const { data: memberData } = await supabaseAdmin
    .from("organization_members")
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()

  if (memberData && memberData.role) {
    return memberData.role.toLowerCase().trim()
  }

  const { data: roleData } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()

  if (roleData && roleData.role) {
    return roleData.role.toLowerCase().trim()
  }

  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
  const emailUser = userData?.user?.email?.toLowerCase() || ""
  if (emailUser.startsWith("apoteker")) return "apoteker"
  if (emailUser.startsWith("dokter")) return "dokter"
  if (emailUser.startsWith("kasir")) return "kasir"
  if (emailUser.startsWith("admin") || emailUser.startsWith("ardt")) return "admin"

  return ""
}

export async function updateOrganization(orgId: string, formData: FormData) {
  if (!orgId) throw new Error("ID Organisasi tidak valid")

  const name = ((formData.get("name") as string) || "").trim()
  const tagline = ((formData.get("tagline") as string) || "").trim()
  const address = ((formData.get("address") as string) || "").trim()
  const phone = ((formData.get("phone") as string) || "").trim()
  const logo_url = ((formData.get("logo_url") as string) || "").trim()

  if (!name) {
    throw new Error("Nama toko wajib diisi")
  }

  const { error } = await supabaseAdmin
    .from("organizations")
    .update({
      name,
      tagline: tagline || null,
      address: address || null,
      phone: phone || null,
      logo_url: logo_url || null,
    })
    .eq("id", orgId)

  if (error) {
    throw new Error("Gagal memperbarui pengaturan toko: " + error.message)
  }

  revalidatePath("/", "layout")
  return { success: true }
}