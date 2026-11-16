"use client"

import { useState } from "react"
import { tambahStok } from "./actions"

export default function ApotekClient({ medicines }: { medicines: any[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tanggalExp, setTanggalExp] = useState("")

  const formatTanggalLokal = (tanggal: string) => {
    if (!tanggal) return ""
    const [tahun, bulan, hari] = tanggal.split("-")
    return `${hari}/${bulan}/${tahun}`
  }

  const handleSimpanStok = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!tanggalExp) {
      alert("Pilih tanggal kedaluwarsa terlebih dahulu!")
      return
    }
    setIsSubmitting(true)
    
    const form = e.currentTarget
    const formData = new FormData(form)
    
    try {
      await tambahStok(formData)
      alert("Stok berhasil disimpan!")
      form.reset()
      setTanggalExp("")
    } catch (error: any) {
      alert("Gagal menyimpan stok: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6 h-fit border-t-4 border-t-green-500">
      <h2 className="text-lg font-bold text-slate-800 mb-4">3. Catat Stok Masuk</h2>
      <form onSubmit={handleSimpanStok} className="flex flex-col gap-3">
        <div>
          <label className="block text-xs mb-1 text-slate-500 font-bold uppercase">Pilih Obat</label>
          <select name="medicineId" required className="w-full p-2 rounded bg-slate-50 border border-slate-300 outline-none focus:border-green-500 text-sm">
            <option value="">-- Cari Obat --</option>
            {medicines.map((m: any) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs mb-1 text-slate-500 font-bold uppercase">No. Lot / Batch</label>
            <input name="batchNumber" type="text" required className="w-full p-2 rounded bg-slate-50 border border-slate-300 outline-none focus:border-green-500 text-sm uppercase" />
          </div>
          <div>
            <label className="block text-xs mb-1 text-slate-500 font-bold uppercase">Jumlah Stok</label>
            <input name="quantity" type="number" min="1" required className="w-full p-2 rounded bg-slate-50 border border-slate-300 outline-none focus:border-green-500 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-xs mb-1 text-slate-500 font-bold uppercase">Kedaluwarsa (Expired)</label>
          <div className="relative flex items-center">
            <input
              type="text"
              readOnly
              value={tanggalExp ? formatTanggalLokal(tanggalExp) : ""}
              placeholder="Hari/Bulan/Tahun"
              className="w-full p-2 rounded bg-slate-50 border border-slate-300 outline-none focus:border-green-500 text-sm text-slate-800 cursor-pointer"
            />
            <svg className="w-4 h-4 text-slate-500 absolute right-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <input
              name="expirationDate"
              type="date"
              required
              value={tanggalExp}
              onChange={(e) => setTanggalExp(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
        <button type="submit" disabled={isSubmitting} className="w-full p-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white rounded font-semibold text-sm mt-1 transition-colors">
          {isSubmitting ? "Menyimpan..." : "Simpan Stok"}
        </button>
      </form>
    </div>
  )
}