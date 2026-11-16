"use client"

import { useState } from "react"
import { updateOrganization } from "./actions"

export default function PengaturanClient({ org }: { org: any }) {
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")
  const [logoPreview, setLogoPreview] = useState<string>(
    org?.logo_url && (org.logo_url.startsWith("data:image") || org.logo_url.startsWith("http"))
      ? org.logo_url
      : ""
  )

  const handlePilihFileLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 1500000) {
      alert("Ukuran gambar maksimal 1.5 MB agar ringan dimuat.")
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setSuccessMsg("")
    try {
      const formElement = e.currentTarget
      const formData = new FormData(formElement)
      formData.set("logo_url", logoPreview)
      await updateOrganization(org.id, formData)
      setSuccessMsg("Pengaturan toko berhasil diperbarui!")
      window.dispatchEvent(new Event("profil-toko-diperbarui"))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 max-w-2xl p-6">
      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-bold">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Toko / Apotek</label>
          <input
            name="name"
            type="text"
            defaultValue={org?.name || ""}
            required
            className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-blue-500 focus:bg-white text-sm font-bold text-slate-800"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tagline / Slogan</label>
          <input
            name="tagline"
            type="text"
            defaultValue={org?.tagline || ""}
            placeholder="Contoh: Sistem Manajemen Apotek"
            className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-blue-500 focus:bg-white text-sm text-slate-800"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Logo Toko / Apotek</label>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Preview Logo"
                className="w-16 h-16 rounded-xl object-contain bg-white border border-slate-200 p-1 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">
                No Logo
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs">
                  Pilih Gambar dari Komputer
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePilihFileLogo}
                    className="hidden"
                  />
                </label>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={() => setLogoPreview("")}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-colors"
                  >
                    Hapus Logo
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Format PNG atau JPG. Pilih langsung file gambar dari folder komputer milikmu.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nomor Telepon / WhatsApp</label>
            <input
              name="phone"
              type="text"
              defaultValue={org?.phone || ""}
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-blue-500 focus:bg-white text-sm text-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Alamat Lengkap</label>
            <input
              name="address"
              type="text"
              defaultValue={org?.address || ""}
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-blue-500 focus:bg-white text-sm text-slate-800"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold transition-colors shadow-sm text-sm"
          >
            {loading ? "Menyimpan..." : "Simpan Perubahan Toko"}
          </button>
        </div>
      </form>
    </div>
  )
}