"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { simpanRekamMedis, ambilRiwayatPasien, batalkanAntreanKunjungan } from "./actions"

export default function RekamMedisClient({ orgId, antrean, obat }: { orgId: string, antrean: any[], obat: any[] }) {
  const router = useRouter()
  const [pasienAktif, setPasienAktif] = useState<any>(null)
  const [riwayatMedis, setRiwayatMedis] = useState<any[]>([])
  const [loadingRiwayat, setLoadingRiwayat] = useState(false)
  const [bukaRiwayat, setBukaRiwayat] = useState(true)

  const [resep, setResep] = useState<any[]>([])
  const [tipeResep, setTipeResep] = useState<"apotek" | "manual">("apotek")
  
  const [obatPilihan, setObatPilihan] = useState("")
  const [namaManual, setNamaManual] = useState("")
  const [qty, setQty] = useState(1)
  const [aturan, setAturan] = useState("")
  const [proses, setProses] = useState(false)

  const getStokObat = (med: any) => {
    return (med.medicine_batches || []).reduce((sum: number, b: any) => sum + Number(b.quantity || 0), 0)
  }

  const pilihPasien = async (kunjungan: any) => {
    setPasienAktif(kunjungan)
    setResep([])
    setLoadingRiwayat(true)
    try {
      const dataRiwayat = await ambilRiwayatPasien(orgId, kunjungan.patient_id, kunjungan.id)
      setRiwayatMedis(dataRiwayat)
    } catch {
      setRiwayatMedis([])
    } finally {
      setLoadingRiwayat(false)
    }
  }

  const handleBatalkanAntrean = async (e: React.MouseEvent, visitId: string, nama: string) => {
    e.stopPropagation()
    const yakin = window.confirm(`Batalkan antrean pemeriksaan untuk pasien ${nama}?`)
    if (!yakin) return

    setProses(true)
    try {
      await batalkanAntreanKunjungan(visitId)
      if (pasienAktif?.id === visitId) {
        setPasienAktif(null)
        setRiwayatMedis([])
        setResep([])
      }
      router.refresh()
    } catch (error: any) {
      alert("Gagal membatalkan: " + error.message)
    } finally {
      setProses(false)
    }
  }

  const tambahObat = () => {
    if (qty < 1 || !aturan) return

    if (tipeResep === "apotek") {
      if (!obatPilihan) return
      const obatDetail = obat.find(o => o.id === obatPilihan)
      if (!obatDetail) return

      const stokTersedia = getStokObat(obatDetail)

      setResep([...resep, { 
        id: obatDetail.id, 
        nama: obatDetail.name, 
        qty, 
        aturan, 
        isManual: false,
        stokTersedia
      }])
      setObatPilihan("")
    } else {
      if (!namaManual.trim()) return

      setResep([...resep, { 
        id: null, 
        nama: namaManual.trim(), 
        qty, 
        aturan, 
        isManual: true,
        stokTersedia: 0
      }])
      setNamaManual("")
    }

    setQty(1)
    setAturan("")
  }

  const hapusObat = (index: number) => {
    setResep(resep.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!pasienAktif) return
    setProses(true)
    
    try {
      const formData = new FormData(e.currentTarget)
      await simpanRekamMedis(orgId, pasienAktif.id, pasienAktif.doctor_id, formData, resep)
      alert("Rekam medis berhasil disimpan")
      setPasienAktif(null)
      setRiwayatMedis([])
      setResep([])
      router.refresh()
    } catch (error: any) {
      alert("Gagal: " + error.message)
    } finally {
      setProses(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="w-full lg:w-1/3 flex flex-col gap-4">
        <div className="bg-[#1e293b] p-5 rounded-xl shadow-xl border border-slate-700">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-700">
            <h2 className="text-lg font-bold text-blue-400">Antrean Pasien</h2>
            <span className="bg-blue-900/50 text-blue-300 text-xs px-2 py-1 rounded-full font-bold">
              {antrean.length} Menunggu
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {antrean.length === 0 && (
              <div className="p-4 text-center rounded-lg bg-[#0f172a] border border-slate-700">
                <p className="text-sm text-slate-400 italic">Tidak ada antrean saat ini</p>
              </div>
            )}
            {antrean.map(kunjungan => {
              const namaPasien = kunjungan.patients?.full_name || "Pasien"
              return (
                <div
                  key={kunjungan.id}
                  onClick={() => pilihPasien(kunjungan)}
                  className={`relative text-left p-4 rounded-lg border transition-all overflow-hidden cursor-pointer ${
                    pasienAktif?.id === kunjungan.id 
                      ? "border-blue-500 bg-blue-900/20" 
                      : "border-slate-700 hover:border-blue-500 hover:bg-slate-800 bg-[#0f172a]"
                  }`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    pasienAktif?.id === kunjungan.id ? "bg-blue-500" : "bg-slate-600"
                  }`}></div>
                  
                  <div className="flex justify-between items-start mb-1 pl-2">
                    <span className="font-bold text-slate-200">{namaPasien}</span>
                    <span className={`text-xs px-2 py-1 rounded font-bold ${
                      pasienAktif?.id === kunjungan.id ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300"
                    }`}>
                      No. {kunjungan.queue_number}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-3 pl-2">
                    <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2 py-1 rounded">
                      RM: {kunjungan.patients?.patient_number}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleBatalkanAntrean(e, kunjungan.id, namaPasien)}
                      className="text-[11px] font-bold text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/50 border border-red-800/50 px-2.5 py-1 rounded transition-colors"
                    >
                      Batalkan
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-2/3 flex flex-col gap-6">
        {pasienAktif ? (
          <>
            {/* PANEL RIWAYAT BEROBAT PASIEN */}
            <div className="bg-[#1e293b] p-5 rounded-xl shadow-xl border border-slate-700 text-slate-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="font-bold text-amber-400">
                    Riwayat Berobat Pasien ({riwayatMedis.length} Kunjungan Sebelumnya)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setBukaRiwayat(!bukaRiwayat)}
                  className="text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-600 transition-colors"
                >
                  {bukaRiwayat ? "Sembunyikan" : "Tampilkan Riwayat"}
                </button>
              </div>

              {bukaRiwayat && (
                <div className="mt-4 pt-3 border-t border-slate-700">
                  {loadingRiwayat ? (
                    <p className="text-xs text-slate-400 italic">Memuat riwayat medis pasien...</p>
                  ) : riwayatMedis.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Pasien baru / belum memiliki catatan riwayat pemeriksaan sebelumnya.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
                      {riwayatMedis.map((rw: any) => (
                        <div key={rw.id} className="p-3.5 rounded-lg bg-[#0f172a] border border-slate-700 text-xs flex flex-col gap-1.5">
                          <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                            <span className="font-bold text-blue-400">
                              Tanggal: {new Date(rw.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                            </span>
                            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-semibold">
                              Diagnosis: {rw.diagnosis}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-300 mt-1">
                            <p><span className="text-slate-500 font-semibold">Keluhan:</span> {rw.keluhan}</p>
                            <p><span className="text-slate-500 font-semibold">Pemeriksaan:</span> {rw.pemeriksaan}</p>
                            <p className="md:col-span-2"><span className="text-slate-500 font-semibold">Tindakan:</span> {rw.tindakan}</p>
                          </div>
                          {rw.obat && rw.obat.length > 0 && (
                            <div className="mt-1 pt-1.5 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                              <span className="text-slate-400 font-semibold">Resep Obat:</span>
                              {rw.obat.map((o: any, idx: number) => (
                                <span key={idx} className="bg-blue-950/60 text-blue-300 border border-blue-800/50 px-2 py-0.5 rounded">
                                  {o.namaObat.replace("[OBAT LUAR]", "").trim()} ({o.qty}x)
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* FORMULIR PEMERIKSAAN BARU */}
            <form onSubmit={handleSubmit} className="bg-[#1e293b] p-6 rounded-xl shadow-xl border border-slate-700 flex flex-col gap-6 text-slate-300">
              <div className="pb-4 border-b border-slate-700 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-blue-400">Formulir Rekam Medis</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Pasien: <span className="font-bold text-white">{pasienAktif.patients?.full_name}</span>
                    <span className="ml-2 text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                      {pasienAktif.patients?.patient_number}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="block text-xs text-slate-400">Nomor Antrean</span>
                  <span className="text-2xl font-black text-white">{pasienAktif.queue_number}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Keluhan Utama</label>
                  <textarea name="keluhan" required rows={3} className="p-3 bg-[#0f172a] border border-slate-600 rounded-lg outline-none focus:border-blue-500 text-sm resize-none text-white"></textarea>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pemeriksaan Fisik</label>
                  <textarea name="pemeriksaan" required rows={3} className="p-3 bg-[#0f172a] border border-slate-600 rounded-lg outline-none focus:border-blue-500 text-sm resize-none text-white"></textarea>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Diagnosis</label>
                  <textarea name="diagnosis" required rows={2} className="p-3 bg-[#0f172a] border border-slate-600 rounded-lg outline-none focus:border-blue-500 text-sm resize-none text-white"></textarea>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rencana Tindakan</label>
                  <textarea name="tindakan" required rows={2} className="p-3 bg-[#0f172a] border border-slate-600 rounded-lg outline-none focus:border-blue-500 text-sm resize-none text-white"></textarea>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-6 mt-2">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                  <h3 className="text-md font-bold text-blue-400 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    Resep Obat
                  </h3>
                  <div className="flex bg-[#0f172a] p-1 rounded-lg border border-slate-600 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setTipeResep("apotek")}
                      className={`px-3 py-2 rounded-md transition-colors ${
                        tipeResep === "apotek"
                          ? "bg-blue-600 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Pilih Obat Apotek
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipeResep("manual")}
                      className={`px-3 py-2 rounded-md transition-colors ${
                        tipeResep === "manual"
                          ? "bg-amber-600 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Ketik Obat Luar (Tidak Ada di Apotek)
                    </button>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3 mb-5">
                  {tipeResep === "apotek" ? (
                    <select value={obatPilihan} onChange={(e) => setObatPilihan(e.target.value)} className="flex-1 p-3 bg-[#0f172a] border border-slate-600 rounded-lg outline-none focus:border-blue-500 text-sm text-white">
                      <option value="">Pilih Obat dari Apotek...</option>
                      {obat.map(o => {
                        const stok = getStokObat(o)
                        return (
                          <option key={o.id} value={o.id}>
                            {o.name} {stok > 0 ? `(Stok: ${stok})` : `(STOK HABIS)`}
                          </option>
                        )
                      })}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={namaManual}
                      onChange={(e) => setNamaManual(e.target.value)}
                      placeholder="Ketik nama obat yang tidak ada di apotek..."
                      className="flex-1 p-3 bg-[#0f172a] border border-amber-500/60 rounded-lg outline-none focus:border-amber-400 text-sm text-white"
                    />
                  )}

                  <div className="flex gap-3">
                    <input type="number" min="1" value={qty} onChange={(e) => setQty(Number(e.target.value))} placeholder="Jml" className="w-20 p-3 bg-[#0f172a] border border-slate-600 rounded-lg outline-none focus:border-blue-500 text-sm text-white" />
                    <input type="text" value={aturan} onChange={(e) => setAturan(e.target.value)} placeholder="Aturan Pakai (misal: 3x1)" className="w-48 p-3 bg-[#0f172a] border border-slate-600 rounded-lg outline-none focus:border-blue-500 text-sm text-white" />
                    <button type="button" onClick={tambahObat} className="bg-blue-600 text-white px-5 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors text-sm flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                      Tambah
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 bg-[#0f172a] p-4 rounded-lg border border-slate-700 min-h-[120px]">
                  {resep.length === 0 && <p className="text-sm text-slate-500 italic text-center my-auto">Belum ada obat yang ditambahkan ke resep</p>}
                  {resep.map((item, index) => (
                    <div key={index} className={`flex justify-between items-center p-3 border-l-4 ${item.isManual ? "border-l-amber-500 bg-amber-950/20" : "border-l-blue-500 bg-[#1e293b]"} border-t border-b border-r border-slate-600 rounded`}>
                      <div>
                        <p className="font-bold text-slate-200 text-sm">
                          {item.nama} 
                          <span className="text-blue-400 font-normal ml-2">x {item.qty}</span>
                          {item.isManual ? (
                            <span className="ml-2 text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">Obat Luar</span>
                          ) : (
                            item.stokTersedia < item.qty && (
                              <span className="ml-2 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-bold">
                                Stok Kurang (Sisa: {item.stokTersedia})
                              </span>
                            )
                          )}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5"><span className="font-semibold">Aturan:</span> {item.aturan}</p>
                      </div>
                      <button type="button" onClick={() => hapusObat(index)} className="text-red-400 text-xs font-bold hover:text-red-300 flex items-center gap-1 bg-red-900/20 px-3 py-1.5 rounded transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-5 border-t border-slate-700 mt-2">
                <button type="submit" disabled={proses} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-lg font-bold transition-colors disabled:opacity-50 shadow-lg flex items-center gap-2">
                  {proses ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                      Simpan & Selesaikan Kunjungan
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="bg-[#1e293b] p-10 rounded-xl shadow-xl border border-slate-700 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
            <div className="w-20 h-20 bg-[#0f172a] text-blue-400 rounded-full flex items-center justify-center mb-5 border-2 border-dashed border-slate-600 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M16 11h6"/></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-200 mb-2">Meja Kerja Dokter</h3>
            <p className="text-slate-400 text-sm max-w-sm">Pilih nama pasien dari daftar antrean di sebelah kiri untuk melihat riwayat berobat sebelumnya dan mulai menulis resep.</p>
          </div>
        )}
      </div>
    </div>
  )
}