export const dynamic = "force-dynamic"

import Sidebar from "@/components/Sidebar"
import { createClient } from "@supabase/supabase-js"
import PengaturanClient from "./PengaturanClient"

export default async function PengaturanPage() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: orgData } = await supabaseAdmin
    .from("organizations")
    .select("*")
    .limit(1)
    .single()

  return (
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Pengaturan Toko</h1>
          <p className="text-slate-500 mt-1 font-medium">Ubah nama apotek, tagline, logo, dan informasi kontak operasional.</p>
        </div>

        <PengaturanClient org={orgData} />
      </div>
    </div>
  )
}