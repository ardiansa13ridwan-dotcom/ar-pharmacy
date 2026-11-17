export const dynamic = "force-dynamic"
export const revalidate = 0

import Sidebar from "@/components/Sidebar"
import { createClient } from "@supabase/supabase-js"
import { tambahKategori, editKategori, hapusKategori, tambahObat, editObat, hapusObat, hapusStok } from "./actions"
import ApotekClient from "./ApotekClient"

export default async function ApotekPage() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: orgData } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .limit(1)
    .single()

  const activeOrgId = orgData?.id || ""
  let categories: any[] = []
  let medicines: any[] = []

  if (activeOrgId) {
    const { data: catData } = await supabaseAdmin
      .from("medicine_categories")
      .select("id, name")
      .eq("organization_id", activeOrgId)
      .order("name", { ascending: true })
    
    if (catData) categories = catData

    // PERBAIKAN: Pemanggilan data dilonggarkan seperti di Dasbor agar tidak terblokir relasi yang belum ketat
    const { data: medData, error: medError } = await supabaseAdmin
      .from("medicines")
      .select("*, medicine_batches(*)")
      .eq("organization_id", activeOrgId)
      .order("name", { ascending: true })

    if (medError) {
      console.log("Error mengambil data obat:", medError.message)
    }

    if (medData) medicines = medData
  }

  const handleTambahKategori = tambahKategori.bind(null, activeOrgId)
  const handleTambahObat = tambahObat.bind(null, activeOrgId)
  const formKey = Date.now()

  const formatTanggal = (tgl: string) => {
    if (!tgl) return "-"
    const bersih = tgl.split("T")[0]
    const [tahun, bulan, hari] = bersih.split("-")
    if (!tahun || !bulan || !hari) return tgl
    return `${hari}/${bulan}/${tahun}`
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 p-8">
        
        <div className="max-w-6xl mx-auto mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Apotek & Stok Obat</h1>
          <p className="text-slate-500">Kelola master data obat, kategori, dan penerimaan stok.</p>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
            <h2 className="text-lg font-bold text-slate-800 mb-4">1. Tambah Kategori</h2>
            <form key={`cat-${formKey}`} action={handleTambahKategori} className="flex flex-col gap-3">
              <div>
                <input name="name" type="text" placeholder="Misal: Sirup, Tablet" required className="w-full p-2 rounded bg-slate-50 border border-slate-300 outline-none focus:border-blue-500 text-sm" />
              </div>
              <button type="submit" className="w-full p-2 bg-slate-800 hover:bg-slate-900 text-white rounded font-semibold text-sm">Simpan Kategori</button>
            </form>

            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase">Daftar Kategori</h3>
                <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {categories.length} Kategori
                </span>
              </div>
              <div className="border border-slate-200 rounded-lg bg-slate-50 p-2.5 max-h-36 overflow-y-auto">
                {categories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c: any) => (
                      <div key={c.id} className="bg-white border border-slate-200 hover:border-blue-400 rounded-lg px-2.5 py-1 flex items-center gap-1 shadow-xs transition-all">
                        <form id={`edit-cat-${c.id}`} action={editKategori} className="hidden" />
                        <form id={`del-cat-${c.id}`} action={hapusKategori} className="hidden" />
                        <input type="hidden" name="id" value={c.id} form={`edit-cat-${c.id}`} />
                        <input type="hidden" name="id" value={c.id} form={`del-cat-${c.id}`} />
                        
                        <input
                          name="name"
                          type="text"
                          defaultValue={c.name}
                          form={`edit-cat-${c.id}`}
                          size={Math.max(4, (c.name || "").length)}
                          className="text-xs font-semibold text-slate-700 bg-transparent border-b border-transparent focus:border-blue-500 outline-none w-auto max-w-[110px]"
                          title="Ketik untuk ubah nama lalu klik centang biru"
                        />
                        
                        <button
                          type="submit"
                          form={`edit-cat-${c.id}`}
                          className="text-blue-600 hover:bg-blue-50 p-0.5 rounded text-xs font-bold"
                          title="Simpan Perubahan"
                        >
                          ✓
                        </button>
                        <button
                          type="submit"
                          form={`del-cat-${c.id}`}
                          className="text-red-500 hover:bg-red-50 p-0.5 rounded text-xs font-bold"
                          title="Hapus Kategori"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-2 italic text-slate-400 text-xs text-center">Belum ada kategori</div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
            <h2 className="text-lg font-bold text-slate-800 mb-4">2. Master Obat Baru</h2>
            <form key={`med-${formKey}`} action={handleTambahObat} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs mb-1 text-slate-500 font-bold uppercase">Kategori</label>
                <select name="categoryId" required className="w-full p-2 rounded bg-slate-50 border border-slate-300 outline-none focus:border-blue-500 text-sm">
                  <option value="">-- Pilih Kategori --</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1 text-slate-500 font-bold uppercase">Nama Obat</label>
                <input name="name" type="text" required className="w-full p-2 rounded bg-slate-50 border border-slate-300 outline-none focus:border-blue-500 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1 text-slate-500 font-bold uppercase">Kode / SKU</label>
                  <input name="code" type="text" required className="w-full p-2 rounded bg-slate-50 border border-slate-300 outline-none focus:border-blue-500 text-sm" />
                </div>
                <div>
                  <label className="block text-xs mb-1 text-slate-500 font-bold uppercase">Satuan (Unit)</label>
                  <input name="salesUnit" type="text" placeholder="Misal: Botol, Strip" required className="w-full p-2 rounded bg-slate-50 border border-slate-300 outline-none focus:border-blue-500 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1 text-slate-500 font-bold uppercase">Harga Jual (Rp)</label>
                <input name="salesPrice" type="number" min="0" required className="w-full p-2 rounded bg-slate-50 border border-slate-300 outline-none focus:border-blue-500 text-sm" />
              </div>
              <button type="submit" className="w-full p-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-sm mt-1">Daftarkan Obat</button>
            </form>
          </div>

          <ApotekClient medicines={medicines} />

        </div>

        <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Daftar Obat & Rincian Stok</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-100 border-y border-slate-200 text-slate-600 text-sm">
                  <th className="p-4 font-semibold w-1/5">Kode SKU</th>
                  <th className="p-4 font-semibold w-1/4">Informasi Obat</th>
                  <th className="p-4 font-semibold w-1/5">Harga & Satuan</th>
                  <th className="p-4 font-semibold w-1/5">Rincian Lot & Expired</th>
                  <th className="p-4 font-semibold text-center w-24">Total Stok</th>
                  <th className="p-4 font-semibold text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((med: any) => {
                  const activeBatches = (med.medicine_batches || [])
                    .filter((b: any) => Number(b.quantity) > 0)
                    .sort((a: any, b: any) => new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime())

                  const totalStock = activeBatches.reduce((acc: number, curr: any) => acc + Number(curr.quantity), 0)
                  const hargaJual = med.sales_price ?? med.selling_price ?? med.price ?? 0
                  const satuan = med.sales_unit ?? med.unit ?? ""

                  return (
                    <tr key={med.id} className="border-b border-slate-200 hover:bg-slate-50 align-top group">
                      <td className="p-4 pt-5">
                        <form id={`edit-med-${med.id}`} action={editObat} />
                        <form id={`del-med-${med.id}`} action={hapusObat} />
                        <input type="hidden" name="id" value={med.id} form={`edit-med-${med.id}`} />
                        <input type="hidden" name="id" value={med.id} form={`del-med-${med.id}`} />
                        
                        <input name="code" type="text" defaultValue={med.code} form={`edit-med-${med.id}`} className="w-full p-2 font-mono text-sm border border-transparent hover:border-slate-300 focus:border-blue-500 rounded outline-none bg-transparent" />
                      </td>
                      <td className="p-4 pt-5">
                        <div className="flex flex-col gap-2">
                          <input name="name" type="text" defaultValue={med.name} form={`edit-med-${med.id}`} className="w-full p-2 font-bold text-slate-800 border border-transparent hover:border-slate-300 focus:border-blue-500 rounded outline-none bg-transparent" />
                          <select name="categoryId" defaultValue={med.category_id || ""} form={`edit-med-${med.id}`} className="w-fit p-1 ml-1 text-xs text-slate-600 bg-slate-100 border border-slate-200 rounded outline-none focus:border-blue-500">
                            <option value="">Tanpa Kategori</option>
                            {categories.map((c: any) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="p-4 pt-5">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-400 pl-2">Rp</span>
                            <input name="salesPrice" type="number" defaultValue={hargaJual} form={`edit-med-${med.id}`} className="w-full p-2 text-sm font-bold text-slate-700 border border-transparent hover:border-slate-300 focus:border-blue-500 rounded outline-none bg-transparent" />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-400 pl-2">/</span>
                            <input name="salesUnit" type="text" defaultValue={satuan} placeholder="Satuan" form={`edit-med-${med.id}`} className="w-full p-2 text-xs text-slate-600 border border-transparent hover:border-slate-300 focus:border-blue-500 rounded outline-none bg-transparent uppercase" />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 pt-5">
                        {activeBatches.length > 0 ? (
                          <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pr-2">
                            {activeBatches.map((batch: any) => (
                              <div key={batch.id} className="text-xs border border-slate-200 p-2 rounded bg-white shadow-sm flex justify-between items-center group/batch">
                                <div>
                                  <span className="font-bold text-slate-700 uppercase">LOT: {batch.batch_number}</span>
                                  <span className="block text-slate-500 mt-0.5">Exp: {formatTanggal(batch.expiration_date)}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min="0"
                                    name={`batch_qty_${batch.id}`}
                                    defaultValue={batch.quantity}
                                    form={`edit-med-${med.id}`}
                                    className="w-14 text-center font-bold text-blue-600 bg-blue-50 border border-transparent hover:border-blue-300 focus:border-blue-500 px-1.5 py-1 rounded outline-none"
                                    title="Ubah angka stok lalu klik tombol Simpan di kanan"
                                  />
                                  <form action={hapusStok} className="opacity-0 group-hover/batch:opacity-100 transition-opacity">
                                    <input type="hidden" name="id" value={batch.id} />
                                    <button type="submit" className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1 rounded" title="Hapus Lot Ini">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                    </button>
                                  </form>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-red-500 italic mt-2 block">Stok habis / belum ada stok</span>
                        )}
                      </td>
                      <td className="p-4 pt-7 text-center">
                        <span className={`text-xl font-black ${totalStock > 0 ? "text-green-600" : "text-slate-300"}`}>
                          {totalStock}
                        </span>
                      </td>
                      <td className="p-4 pt-7 text-center">
                        <div className="flex flex-col gap-2">
                          <button type="submit" form={`edit-med-${med.id}`} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold w-full">Simpan</button>
                          <button type="submit" form={`del-med-${med.id}`} className="px-3 py-1.5 bg-slate-200 hover:bg-red-600 hover:text-white text-slate-600 rounded text-xs font-bold w-full transition-colors">Hapus</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {medicines.length === 0 && (
                  <tr>
                    <td className="p-8 text-slate-500 italic text-center" colSpan={6}>
                      Belum ada data obat. Silakan isi form di atas mulai dari Kategori.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}