export const dynamic = "force-dynamic"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import LoginForm from "./LoginForm"
import { ambilProfilToko } from "@/app/pengaturan/actions"

export default async function LoginPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect("/")
  }

  const org = await ambilProfilToko()

  return <LoginForm org={org} />
}