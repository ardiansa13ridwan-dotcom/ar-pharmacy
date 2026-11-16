"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { daftarkanPasien, masukanKeAntrean, hapusDataPasien } from "./actions"

export default function PendaftaranClient({
  orgId,
  patients,
  activeVisits
}: {
  orgId: string
  patients: any[]
  activeVisits: any[]
}) {
  const router = useRouter()
  const [dobTeks, setDobTeks] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchDobTeks, setSearchDobTeks] = useState("")
  const [loading, setLoading] = useState(false)

  const formatTanggalIndo = (tgl: string) => {
    if (!tgl) return ""
    const bagian = tgl.slice(0, 10).split("-")
    if (bagian.length !== 3) return tgl
    return `${bagian[2]}/${bagian[1]}/${bagian[0]}`
  }

  const autoFormatKetikTanggal = (input: string) => {
    const angka = input.replace(/\D/g, "").slice(0, 8)
    if (angka.length <= 2) return angka
    if (angka.length <= 4) return `${angka.slice(0, 2)}/${angka.slice(2)}`
    return `${angka.slice(0, 2)}/${angka.slice(2, 4)}/${angka.slice(4, 8)}`
  }

  const konversiKeIso = (teksIndo: string) => {
    const bagian = teksIndo.split("/")
    if (bagian.length !== 3) return ""
    const [hari, bulan, tahun] = bagian
    if (hari.length !== 2 || bulan.length !== 2 || tahun.length !== 4) return ""
    const h = Number(hari)
    const b = Number(bulan)
    const t = Number(tahun)
    if (h < 1 || h > 31 || b < 1 || b > 12 || t < 1900 || t > 2100) return ""
    return `${tahun}-${bulan}-${hari}`
  }

  const handleSubmitPasienBaru = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const dobIso = konversiKeIso(dobTeks)
    if (!dobIso) {
      alert("Format Tanggal Lahir belum lengkap atau tidak valid. Ketik 8 angka dengan format Hari/Bulan/Tahun (contoh: 13/09/1988).")
      return
    }
    setLoading(true)
    try {
      const formElement = e.currentTarget
      const formData = new FormData(formElement)
      formData.set("dob", dobIso)
      const hasil = await daftarkanPasien(orgId, formData)

      if (hasil?.isDuplicate) {
        if (hasil.sudahAntre) {
          alert(
            `Pasien atas nama ${hasil.patientName} sudah pernah terdaftar (No. RM: ${hasil.patientNumber}) dan saat ini sudah berada di antrean hari ini pada Nomor Antrean ${hasil.nomorAntrean}.`
          )
        } else {
          alert(
            `Pasien atas nama ${hasil.patientName} sudah pernah terdaftar dengan No. RM: ${hasil.patientNumber}. Sistem otomatis menggunakan data lama dan memasukkan ke antrean Nomor ${hasil.nomorAntrean}.`
          )
        }
      } else {
        alert(
          `Pasien baru ${hasil?.patientName} berhasil didaftarkan dengan No. RM: ${hasil?.patientNumber} (Nomor Antrean: ${hasil?.nomorAntrean}).`
        )
      }

      formElement.reset()
      setDobTeks("")
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKlikAntrean = async (patientId: string, nama: string) => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.set("patientId", patientId)
      const hasil = await masukanKeAntrean(orgId, formData)
      if (hasil?.sudahAntre) {
        alert(`Pasien ${nama} sudah berada di dalam daftar tunggu hari ini (Nomor Antrean ${hasil.nomorAntrean}).`)
      }
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleHapusPasien = async (patientId: string, nama: string, rm: string) => {
    const yakin = window.confirm(`Hapus data pasien ${nama} (${rm}) yang salah input?`)
    if (!yakin) return
    setLoading(true)
    try {
      await hapusDataPasien(patientId)
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredPatients = patients.filter((p) => {
    const query = searchQuery.toLowerCase().trim()
    const nama = (p.full_name || "").toLowerCase()
    const noRm = (p.patient_number || "").toLowerCase()
    const tglAsli = (p.date_of_birth || "").slice(0, 10)
    const tglIndo = formatTanggalIndo(tglAsli)

    const cocokTeks =
      !query ||
      nama.includes(query) ||
      noRm.includes(query) ||
      tglAsli.includes(query) ||
      tglIndo.includes(query)

    const cocokTanggal = !searchDobTeks || tglIndo.includes(searchDobTeks)

    return cocokTeks && cocokTanggal
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="19" x2="19" y1="8" y2="14"/>
              <line x1="22" x2="16" y1="11" y2="11"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800">Pasien Baru</h2>
        </div>

        <form onSubmit={handleSubmitPasienBaru} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Lengkap Sesuai KTP</label>
            <input name="fullName" type="text" required className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-blue-500 focus:bg-white transition-colors text-sm" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tanggal Lahir (Ketik / Pilih)</label>
            <div className="relative flex items-center">
              <input
                type="text"
                inputMode="numeric"
                required
                value={dobTeks}
                onChange={(e) => setDobTeks(autoFormatKetikTanggal(e.target.value))}
                placeholder="Ketik dd/mm/yyyy (cth: 13091988)"
                className="w-full p-2.5 pr-10 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-blue-500 focus:bg-white transition-colors text-sm text-slate-800"
              />
              <div className="absolute right-2 flex items-center justify-center w-7 h-7 rounded hover:bg-slate-200/60 cursor-pointer">
                <svg className="w-4 h-4 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <input
                  type="date"
                  tabIndex={-1}
                  value={konversiKeIso(dobTeks)}
                  onChange={(e) => {
                    if (e.target.value) setDobTeks(formatTanggalIndo(e.target.value))
                  }}
                  onClick={(e: any) => e.target.showPicker && e.target.showPicker()}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nomor Telepon / WhatsApp</label>
            <input name="phone" type="tel" className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-blue-500 focus:bg-white transition-colors text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Alamat Lengkap</label>
            <textarea name="address" rows={3} className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-blue-500 focus:bg-white transition-colors text-sm resize-none" />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-bold transition-colors mt-2 shadow-sm"
          >
            {loading ? "Memproses..." : "Simpan & Daftarkan"}
          </button>
        </form>
      </div>

      <div className="lg:col-span-2 flex flex-col gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col gap-4 bg-slate-50/50">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">Database Pasien (Beri Antrean)</h2>
              {(searchQuery || searchDobTeks) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("")
                    setSearchDobTeks("")
                  }}
                  className="text-xs font-bold text-red-500 hover:text-red-700"
                >
                  Reset Filter
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Cari Nama atau Nomor RM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs outline-none focus:border-blue-500 shadow-sm"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Tgl Lahir:</span>
                <div className="relative flex items-center w-full">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={searchDobTeks}
                    onChange={(e) => setSearchDobTeks(autoFormatKetikTanggal(e.target.value))}
                    placeholder="Ketik dd/mm/yyyy..."
                    className="w-full p-2.5 pr-9 rounded-xl bg-white border border-slate-200 text-xs outline-none focus:border-blue-500 shadow-sm"
                  />
                  <div className="absolute right-2 flex items-center justify-center w-6 h-6 rounded hover:bg-slate-100 cursor-pointer">
                    <svg className="w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <input
                      type="date"
                      tabIndex={-1}
                      value={konversiKeIso(searchDobTeks)}
                      onChange={(e) => {
                        if (e.target.value) setSearchDobTeks(formatTanggalIndo(e.target.value))
                      }}
                      onClick={(e: any) => e.target.showPicker && e.target.showPicker()}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-2 max-h-72 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <tbody>
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{p.full_name}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
                          <span className="bg-slate-100 px-2 py-0.5 rounded font-mono">{p.patient_number}</span>
                          <span>Lahir: {p.date_of_birth ? formatTanggalIndo(p.date_of_birth) : "-"}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleHapusPasien(p.id, p.full_name, p.patient_number)}
                            className="px-2.5 py-2 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            Hapus
                          </button>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleKlikAntrean(p.id, p.full_name)}
                            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                          >
                            Beri Antrean
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="p-8 text-center text-slate-400 text-sm italic">
                      Tidak ditemukan pasien yang sesuai dengan pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 overflow-hidden relative">
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-500"></div>
          <div className="p-6 border-b border-slate-100 pl-8 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Antrean Kunjungan Hari Ini</h2>
              <p className="text-xs font-bold text-emerald-600 uppercase mt-0.5">
                {new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            <div className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-bold text-slate-700">
              Total: {activeVisits.length}
            </div>
          </div>
          <div className="p-6 bg-emerald-50/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeVisits.length > 0 ? (
                activeVisits.map((visit) => (
                  <div key={visit.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center font-black text-xl shrink-0">
                      {visit.queue_number}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-slate-800 truncate">{visit.patients?.full_name}</p>
                      <p className="text-xs font-mono text-slate-500 truncate mt-0.5">{visit.patients?.patient_number}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center p-6 text-slate-400 text-sm italic">
                  Belum ada antrean hari ini. Daftarkan pasien lalu klik Beri Antrean.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}