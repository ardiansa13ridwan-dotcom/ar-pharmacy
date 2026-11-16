"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function tambahKaryawan(orgId: string, formData: FormData) {
  const fullName = ((formData.get("fullName") as string) || "").trim()
  const email = ((formData.get("email") as string) || "").trim().toLowerCase()
  const password = ((formData.get("password") as string) || "").trim()
  const roleInput = ((formData.get("role") as string) || "kasir").toLowerCase().trim()

  if (!fullName || !email || !password) {
    return
  }

  let userId = ""

  const { data: listUsers } = await supabaseAdmin.auth.admin.listUsers()
  const existingUser = listUsers?.users?.find(
    (u) => u.email?.toLowerCase() === email
  )

  if (existingUser) {
    userId = existingUser.id
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })
  } else {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })

    if (authError || !authData?.user) {
      return
    }
    userId = authData.user.id
  }

  const roleSidebar = roleInput === "pemilik" ? "admin" : roleInput

  await supabaseAdmin
    .from("profiles")
    .upsert({ id: userId, full_name: fullName })

  const { data: existingMember } = await supabaseAdmin
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle()

  if (existingMember) {
    await supabaseAdmin
      .from("organization_members")
      .update({ role: roleInput })
      .eq("organization_id", orgId)
      .eq("user_id", userId)
  } else {
    await supabaseAdmin
      .from("organization_members")
      .insert({
        organization_id: orgId,
        user_id: userId,
        role: roleInput
      })
  }

  await supabaseAdmin.from("user_roles").delete().eq("user_id", userId)
  await supabaseAdmin.from("user_roles").insert({
    user_id: userId,
    role: roleSidebar
  })

  revalidatePath("/karyawan")
}

export async function editKaryawan(formData: FormData) {
  const userId = formData.get("userId") as string
  const orgId = formData.get("orgId") as string
  const fullName = ((formData.get("fullName") as string) || "").trim()
  const roleInput = ((formData.get("role") as string) || "kasir").toLowerCase().trim()

  if (!userId) return

  const roleSidebar = roleInput === "pemilik" ? "admin" : roleInput

  if (fullName) {
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, full_name: fullName })
  }

  await supabaseAdmin
    .from("organization_members")
    .update({ role: roleInput })
    .eq("user_id", userId)
    .eq("organization_id", orgId)

  await supabaseAdmin.from("user_roles").delete().eq("user_id", userId)
  await supabaseAdmin.from("user_roles").insert({
    user_id: userId,
    role: roleSidebar
  })

  revalidatePath("/karyawan")
}

export async function hapusKaryawan(formData: FormData) {
  const userId = formData.get("userId") as string
  if (!userId) return

  await supabaseAdmin.from("user_roles").delete().eq("user_id", userId)
  await supabaseAdmin.from("organization_members").delete().eq("user_id", userId)
  await supabaseAdmin.from("profiles").delete().eq("id", userId)
  await supabaseAdmin.auth.admin.deleteUser(userId)

  revalidatePath("/karyawan")
}