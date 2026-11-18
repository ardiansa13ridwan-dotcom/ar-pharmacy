export const dynamic = "force-dynamic"

import Sidebar from "@/components/Sidebar"
import { createClient } from "@supabase/supabase-js"
import { tambahKaryawan, editKaryawan, hapusKaryawan } from "./actions"

export default async function KaryawanPage() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: orgData } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .limit(1)
    .single()

  const activeOrgId = orgData?.id || ""
  let members: any[] = []

  if (activeOrgId) {
    const { data: membersData } = await supabaseAdmin
      .from("organization_members")
      .select("role, user_id, profiles(full_name)")
      .eq("organization_id", activeOrgId)
      .order("role", { ascending: true })

    const { data: authList } = await supabaseAdmin.auth.admin.listUsers()
    const emailMap = new Map<string, string>()
    authList?.users?.forEach((u) => {
      if (u.id && u.email) emailMap.set(u.id, u.email)
    })

    if (membersData) {
      members = membersData.map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        full_name: m.profiles?.full_name || "",
        email: emailMap.get(m.user_id) || ""
      }))
    }
  }

  const handleTambahKaryawan = tambahKaryawan.bind(null, activeOrgId)
  const formKey = Date.now()

  return (
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Daftar Karyawan</h1>
                <p className="text-slate-500">Kelola data karyawan dan hak akses apotek milikmu.</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 text-sm">
                    <th className="p-4 font-semibold w-5/12">Nama Lengkap / Email</th>
                    <th className="p-4 font-semibold w-4/12">Peran (Role)</th>
                    <th className="p-4 font-semibold text-center w-3/12">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const roleVal =
                      (member.role || "").toLowerCase() === "admin"
                        ? "pemilik"
                        : (member.role || "kasir").toLowerCase()
                    const namaTampil = member.full_name || member.email || ""

                    return (
                      <tr key={member.user_id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-4">
                          <form id={`edit-${member.user_id}`} action={editKaryawan} />
                          <form id={`del-${member.user_id}`} action={hapusKaryawan} />
                          
                          <input type="hidden" name="userId" value={member.user_id} form={`edit-${member.user_id}`} />
                          <input type="hidden" name="orgId" value={activeOrgId} form={`edit-${member.user_id}`} />
                          <input type="hidden" name="userId" value={member.user_id} form={`del-${member.user_id}`} />

                          <input 
                            name="fullName" 
                            type="text" 
                            defaultValue={namaTampil} 
                            form={`edit-${member.user_id}`} 
                            className="w-full p-2 border border-slate-200 rounded outline-none focus:border-blue-500 text-sm font-medium text-slate-800 bg-transparent" 
                          />
                          {member.email && (
                            <span className="block text-xs text-slate-400 mt-1 font-mono">
                              {member.email}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <select 
                            name="role" 
                            defaultValue={roleVal} 
                            form={`edit-${member.user_id}`} 
                            className="w-full p-2 border border-slate-200 rounded outline-none focus:border-blue-500 uppercase text-xs font-bold text-slate-600 bg-transparent"
                          >
                            <option value="pemilik">ADMIN / PEMILIK</option>
                            <option value="apoteker">APOTEKER</option>
                            <option value="dokter">DOKTER</option>
                            <option value="kasir">KASIR</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-center">
                            <button type="submit" form={`edit-${member.user_id}`} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold">Simpan</button>
                            <button type="submit" form={`del-${member.user_id}`} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold">Hapus</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {members.length === 0 && (
                    <tr>
                      <td className="p-8 text-slate-500 italic text-center" colSpan={3}>
                        Belum ada karyawan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 h-fit">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Tambah Karyawan</h2>
            <form key={formKey} action={handleTambahKaryawan} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm mb-1 text-slate-600 font-medium">Nama Lengkap</label>
                <input name="fullName" type="text" required placeholder="Contoh: Admin Apotek" className="w-full p-2 rounded bg-slate-50 border border-slate-300 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm mb-1 text-slate-600 font-medium">Email Akun</label>
                <input name="email" type="email" required placeholder="admin@apotek.com" className="w-full p-2 rounded bg-slate-50 border border-slate-300 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm mb-1 text-slate-600 font-medium">Kata Sandi</label>
                <input name="password" type="text" required placeholder="Minimal 6 karakter" className="w-full p-2 rounded bg-slate-50 border border-slate-300 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm mb-1 text-slate-600 font-medium">Posisi / Role</label>
                <select name="role" className="w-full p-2 rounded bg-slate-50 border border-slate-300 outline-none focus:border-blue-500">
                  <option value="pemilik">Admin / Pemilik</option>
                  <option value="apoteker">Apoteker</option>
                  <option value="dokter">Dokter</option>
                  <option value="kasir">Kasir</option>
                </select>
              </div>
              <button type="submit" className="w-full p-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold mt-2">Daftarkan Karyawan</button>
            </form>
          </div>

        </div>
      </div>
    </div>
  )
}