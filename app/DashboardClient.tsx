"use client"

import { useState } from "react"

export default function DashboardClient({
  semuaTransaksi,
  semuaProduk,
  antreanHariIni,
  obatMenipis
}: {
  semuaTransaksi: any[]
  semuaProduk: any[]
  antreanHariIni: any[]
  obatMenipis: any[]
}) {
  const [modalAktif, setModalAktif] = useState<
    "pendapatan" | "transaksi" | "produk" | "antrean" | null
  >(null)

  const totalPendapatan = semuaTransaksi.reduce(
    (sum, s) => sum + Number(s.total_amount || 0),
    0
  )
  const totalTransaksi = semuaTransaksi.length
  const totalProduk = semuaProduk.length
  const totalAntrean = antreanHariIni.length
  const transaksiTerbaru = semuaTransaksi.slice(0, 5)

  const pendapatanTunai = semuaTransaksi
    .filter((s) => (s.payment_method || "").toLowerCase() === "tunai")
    .reduce((sum, s) => sum + Number(s.total_amount || 0), 0)

  const pendapatanTransfer = semuaTransaksi
    .filter((s) => (s.payment_method || "").toLowerCase() !== "tunai")
    .reduce((sum, s) => sum + Number(s.total_amount || 0), 0)

  const formatTanggalWaktu = (iso: string) => {
    if (!iso) return "-"
    const d = new Date(iso)
    const tgl = d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
    const jam = d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit"
    })
    return `${tgl} ${jam}`
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div
          onClick={() => setModalAktif("pendapatan")}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between group hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
              </svg>
            </div>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              Klik Rincian
            </span>
          </div>
          <div>
            <p className="text-slate-500 text-sm font-bold mb-1">Total Pendapatan</p>
            <p className="text-3xl font-black text-slate-800">
              Rp {totalPendapatan.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        <div
          onClick={() => setModalAktif("transaksi")}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between group hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
                <path d="M3 6h18"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              Klik Rincian
            </span>
          </div>
          <div>
            <p className="text-slate-500 text-sm font-bold mb-1">Transaksi Sukses</p>
            <p className="text-3xl font-black text-slate-800">
              {totalTransaksi} <span className="text-lg text-slate-400 font-medium">Nota</span>
            </p>
          </div>
        </div>

        <div
          onClick={() => setModalAktif("produk")}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between group hover:border-amber-500 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21 16-9 5-9-5V8l9-5 9 5Z"/>
                <path d="m3.27 6.96 8.73 5.05 8.73-5.05"/>
                <path d="M12 22V12"/>
              </svg>
            </div>
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
              Klik Rincian
            </span>
          </div>
          <div>
            <p className="text-slate-500 text-sm font-bold mb-1">Katalog Produk</p>
            <p className="text-3xl font-black text-slate-800">
              {totalProduk} <span className="text-lg text-slate-400 font-medium">Item</span>
            </p>
          </div>
        </div>

        <div
          onClick={() => setModalAktif("antrean")}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between group hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              Klik Rincian
            </span>
          </div>
          <div>
            <p className="text-slate-500 text-sm font-bold mb-1">Pasien Antre</p>
            <p className="text-3xl font-black text-slate-800">
              {totalAntrean} <span className="text-lg text-slate-400 font-medium">Orang</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-800">5 Transaksi Terakhir</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Klik kartu di atas untuk melihat seluruh daftar transaksi ({totalTransaksi} nota)
              </p>
            </div>
            <a href="/kasir" className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
              Buka Kasir
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/>
                <path d="m12 5 7 7-7 7"/>
              </svg>
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm">
                  <th className="p-4 font-bold border-b border-slate-200">No. Nota</th>
                  <th className="p-4 font-bold border-b border-slate-200">Waktu</th>
                  <th className="p-4 font-bold border-b border-slate-200">Metode</th>
                  <th className="p-4 font-bold border-b border-slate-200 text-right">Nilai Transaksi</th>
                </tr>
              </thead>
              <tbody>
                {transaksiTerbaru.length > 0 ? (
                  transaksiTerbaru.map((trx, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 border-b border-slate-100 font-mono text-sm text-slate-700">
                        {trx.invoice_number}
                      </td>
                      <td className="p-4 border-b border-slate-100 text-sm text-slate-500">
                        {formatTanggalWaktu(trx.created_at)}
                      </td>
                      <td className="p-4 border-b border-slate-100">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                            trx.payment_method === "tunai"
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {trx.payment_method}
                        </span>
                      </td>
                      <td className="p-4 border-b border-slate-100 font-bold text-slate-800 text-right">
                        Rp {Number(trx.total_amount).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 text-sm italic">
                      Belum ada transaksi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <path d="M12 9v4"/>
              <path d="M12 17h.01"/>
            </svg>
            <h2 className="text-lg font-bold text-slate-800">Stok Kritis</h2>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-4 bg-slate-50/50">
            {obatMenipis.length > 0 ? (
              obatMenipis.map((obat: any, i: number) => (
                <div key={i} className="flex justify-between items-center bg-white p-4 rounded-xl border border-red-100 shadow-sm relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                  <div>
                    <p className="font-bold text-slate-800">{obat.nama}</p>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">{obat.kode}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">Sisa Stok</p>
                    <p className="text-xl font-black text-red-600">{obat.stok}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-xl">
                <div className="p-3 bg-emerald-50 text-emerald-500 rounded-full mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                </div>
                <p className="font-bold text-slate-700">Stok Aman</p>
                <p className="text-xs text-slate-500 mt-1">Tidak ada obat dengan stok di bawah 10.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {modalAktif && (
        <div
          onClick={() => setModalAktif(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-black text-slate-800">
                  {modalAktif === "pendapatan" && "Rincian Total Pendapatan"}
                  {modalAktif === "transaksi" && `Daftar Seluruh Transaksi Sukses (${totalTransaksi} Nota)`}
                  {modalAktif === "produk" && `Daftar Katalog Produk & Stok (${totalProduk} Item)`}
                  {modalAktif === "antrean" && `Daftar Pasien Antre Hari Ini (${totalAntrean} Orang)`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Data transaksi telah disaring otomatis dari duplikasi
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalAktif(null)}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-red-500 hover:text-white text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                Tutup ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {(modalAktif === "pendapatan" || modalAktif === "transaksi") && (
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                      <p className="text-xs font-bold text-blue-600 uppercase">Total Keseluruhan</p>
                      <p className="text-xl font-black text-slate-800 mt-1">
                        Rp {totalPendapatan.toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                      <p className="text-xs font-bold text-emerald-600 uppercase">Pembayaran Tunai</p>
                      <p className="text-xl font-black text-slate-800 mt-1">
                        Rp {pendapatanTunai.toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
                      <p className="text-xs font-bold text-indigo-600 uppercase">Transfer / QRIS</p>
                      <p className="text-xl font-black text-slate-800 mt-1">
                        Rp {pendapatanTransfer.toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>

                  <table className="w-full text-left border-collapse border border-slate-200 rounded-xl overflow-hidden text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600">
                        <th className="p-3 font-bold border-b">No</th>
                        <th className="p-3 font-bold border-b">No. Nota</th>
                        <th className="p-3 font-bold border-b">Tanggal & Jam</th>
                        <th className="p-3 font-bold border-b">Metode</th>
                        <th className="p-3 font-bold border-b text-right">Nilai Transaksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {semuaTransaksi.map((t, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3 text-slate-500">{idx + 1}</td>
                          <td className="p-3 font-mono font-bold text-slate-700">{t.invoice_number}</td>
                          <td className="p-3 text-slate-600">{formatTanggalWaktu(t.created_at)}</td>
                          <td className="p-3 uppercase text-xs font-bold text-slate-700">{t.payment_method}</td>
                          <td className="p-3 font-bold text-slate-800 text-right">
                            Rp {Number(t.total_amount).toLocaleString("id-ID")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {modalAktif === "produk" && (
                <table className="w-full text-left border-collapse border border-slate-200 rounded-xl overflow-hidden text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600">
                      <th className="p-3 font-bold border-b">Kode SKU</th>
                      <th className="p-3 font-bold border-b">Nama Obat</th>
                      <th className="p-3 font-bold border-b text-right">Harga Jual</th>
                      <th className="p-3 font-bold border-b text-right">Total Stok</th>
                    </tr>
                  </thead>
                  <tbody>
                    {semuaProduk.map((m, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-600">{m.kode}</td>
                        <td className="p-3 font-bold text-slate-800">{m.nama}</td>
                        <td className="p-3 text-right text-slate-700">
                          Rp {Number(m.harga || 0).toLocaleString("id-ID")}
                        </td>
                        <td className="p-3 text-right font-black">
                          <span className={m.stok < 10 ? "text-red-600" : "text-emerald-600"}>
                            {m.stok}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {modalAktif === "antrean" && (
                <div className="flex flex-col gap-3">
                  {antreanHariIni.length > 0 ? (
                    antreanHariIni.map((v, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-slate-200 flex justify-between items-center bg-slate-50">
                        <div className="flex items-center gap-4">
                          <span className="w-10 h-10 rounded-lg bg-emerald-600 text-white font-black flex items-center justify-center">
                            {v.queue_number}
                          </span>
                          <div>
                            <p className="font-bold text-slate-800">{v.patients?.full_name || "Pasien"}</p>
                            <p className="text-xs font-mono text-slate-500">{v.patients?.patient_number || "-"}</p>
                          </div>
                        </div>
                        <a
                          href="/rekam-medis"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                        >
                          Periksa di Rekam Medis
                        </a>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-8 text-slate-400 italic text-sm">
                      Tidak ada pasien yang sedang menunggu di antrean saat ini.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}