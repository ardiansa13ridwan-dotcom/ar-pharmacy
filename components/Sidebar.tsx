"use client"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { createBrowserClient } from "@supabase/ssr"
import { useEffect, useState, useRef } from "react"
import { ambilProfilToko, ambilRolePengguna } from "@/app/pengaturan/actions"

let globalCache = {
  isInitialized: false,
  userId: "",
  role: "",
  org: null as { name: string, tagline: string, logo_url: string } | null
}

export default function Sidebar() {
  const pathname = usePathname()
  const isMounted = useRef(false)
  
  const [activePath, setActivePath] = useState(pathname)

  useEffect(() => {
    setActivePath(pathname)
  }, [pathname])

  const [role, setRole] = useState<string>(globalCache.role)
  const [org, setOrg] = useState(globalCache.org)
  const [loading, setLoading] = useState<boolean>(!globalCache.isInitialized)

  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  )

  const muatProfilToko = async () => {
    try {
      const dataToko = await ambilProfilToko()
      if (dataToko) {
        const profilBaru = {
          name: dataToko.name || "ARDT Pharmacy",
          tagline: dataToko.tagline || "Sistem Manajemen Apotek",
          logo_url: dataToko.logo_url || ""
        }
        globalCache.org = profilBaru
        setOrg(profilBaru)
        if (typeof window !== "undefined") {
            sessionStorage.setItem("ardt_org", JSON.stringify(profilBaru))
        }
      }
    } catch (e) {
      console.log("Gagal memuat profil toko")
    }
  }

  useEffect(() => {
    if (isMounted.current) return
    isMounted.current = true

    const sinkronkanData = async () => {
      if (typeof window !== "undefined" && !globalCache.isInitialized) {
        const savedOrg = sessionStorage.getItem("ardt_org")
        const savedRole = sessionStorage.getItem("ardt_role")
        const savedUid = sessionStorage.getItem("ardt_uid")

        if (savedOrg) {
          try {
            const parsed = JSON.parse(savedOrg)
            globalCache.org = parsed
            setOrg(parsed)
          } catch {}
        }
        
        if (savedRole && savedUid) {
          globalCache.role = savedRole
          globalCache.userId = savedUid
          globalCache.isInitialized = true
          setRole(savedRole)
          setLoading(false)
        }
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user

        if (!user) {
          setLoading(false)
          return
        }

        const [roleServer, dataToko] = await Promise.all([
          ambilRolePengguna(user.id),
          ambilProfilToko()
        ])

        if (dataToko) {
          const profilBaru = {
            name: dataToko.name || "ARDT Pharmacy",
            tagline: dataToko.tagline || "Sistem Manajemen Apotek",
            logo_url: dataToko.logo_url || ""
          }
          globalCache.org = profilBaru
          setOrg(profilBaru)
          if (typeof window !== "undefined") sessionStorage.setItem("ardt_org", JSON.stringify(profilBaru))
        }

        if (roleServer && roleServer !== globalCache.role) {
          globalCache.userId = user.id
          globalCache.role = roleServer
          globalCache.isInitialized = true
          setRole(roleServer)
          if (typeof window !== "undefined") {
              sessionStorage.setItem("ardt_uid", user.id)
              sessionStorage.setItem("ardt_role", roleServer)
          }
        }
      } catch (error) {
        console.log("Gagal membaca data sidebar dari server")
      } finally {
        setLoading(false)
        globalCache.isInitialized = true
      }
    }

    sinkronkanData()

    const handleUpdate = () => muatProfilToko()
    window.addEventListener("profil-toko-diperbarui", handleUpdate)
    return () => window.removeEventListener("profil-toko-diperbarui", handleUpdate)
  }, [supabase])

  const handleLogout = async () => {
    globalCache = { isInitialized: false, userId: "", role: "", org: null }
    if (typeof window !== "undefined") {
        sessionStorage.removeItem("ardt_uid")
        sessionStorage.removeItem("ardt_role")
        sessionStorage.removeItem("ardt_org")
    }
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  // JIKA DI HALAMAN LOGIN, SIDEBAR OTOMATIS MENGHILANG
  if (pathname === "/login") return null;

  const menuItems = [
    { name: "Dasbor", path: "/", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", allowedRoles: ["admin", "pemilik", "apoteker", "kasir", "dokter"] },
    { name: "Pendaftaran", path: "/pendaftaran", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", allowedRoles: ["admin", "pemilik", "dokter", "kasir"] },
    { name: "Rekam Medis", path: "/rekam-medis", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10", allowedRoles: ["admin", "pemilik", "dokter"] },
    { name: "Apotek & Stok", path: "/apotek", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z", allowedRoles: ["admin", "pemilik", "apoteker"] },
    { name: "Kasir POS", path: "/kasir", icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z", allowedRoles: ["admin", "pemilik", "kasir"] },
    { name: "Pengguna", path: "/karyawan", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", allowedRoles: ["admin", "pemilik"] },
    { name: "Laporan", path: "/laporan", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", allowedRoles: ["admin", "pemilik"] },
    { name: "Pengaturan Toko", path: "/pengaturan", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z", allowedRoles: ["admin", "pemilik"] }
  ]

  const filteredMenu = menuItems.filter(item => role && item.allowedRoles.includes(role))
  const validLogo = org?.logo_url && (org.logo_url.startsWith("data:image") || org.logo_url.startsWith("http"))

  return (
    <div className="w-64 bg-[#1e293b] h-screen sticky top-0 text-white flex flex-col border-r border-slate-700 shadow-xl z-50 shrink-0">
      <div className="p-6 flex items-center gap-3" suppressHydrationWarning>
        {validLogo ? (
          <img src={org!.logo_url} alt="Logo" className="w-11 h-11 rounded-xl object-contain bg-white p-1 shrink-0 shadow-xs" />
        ) : null}
        <div className="overflow-hidden">
          <h1 className="text-lg font-bold text-blue-400 leading-tight">{org?.name || "ARDT Pharmacy"}</h1>
          <p className="text-xs text-slate-400 mt-1 truncate">{org?.tagline || "Sistem Manajemen Apotek"}</p>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-2" suppressHydrationWarning>
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-11 bg-slate-800/50 rounded-lg w-full"></div>
            <div className="h-11 bg-slate-800/50 rounded-lg w-full"></div>
            <div className="h-11 bg-slate-800/50 rounded-lg w-full"></div>
          </div>
        ) : filteredMenu.length > 0 ? (
          filteredMenu.map((item) => {
            const isActive = activePath === item.path
            return (
              <Link 
                key={item.name} 
                href={item.path}
                onClick={() => setActivePath(item.path)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                </svg>
                <span className="font-medium">{item.name}</span>
              </Link>
            )
          })
        ) : (
          <div className="px-4 py-3 text-red-400 text-sm">Data peran gagal dimuat.</div>
        )}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="font-medium">Keluar</span>
        </button>
      </div>
    </div>
  )
}