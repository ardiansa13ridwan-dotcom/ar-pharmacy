"use client"
import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"

export default function LoginForm({ org }: { org?: any }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    window.location.href = "/"
  }

  const validLogo = org?.logo_url && (org.logo_url.startsWith("data:image") || org.logo_url.startsWith("http"))

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f172a] text-white p-4">
      <div className="p-8 bg-[#1e293b] rounded-2xl shadow-xl w-full max-w-sm border border-slate-700/60">
        {validLogo && (
          <div className="flex justify-center mb-4">
            <img
              src={org.logo_url}
              alt="Logo Toko"
              className="w-20 h-20 rounded-2xl object-contain bg-white p-2 shadow-md"
            />
          </div>
        )}
        <h1 className="text-2xl font-bold mb-1 text-center text-blue-400">
          {org?.name || "AR Pharmacy"}
        </h1>
        <p className="text-sm text-center mb-6 text-slate-400">
          {org?.tagline || "Sistem Manajemen Terpadu"}
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 text-red-200 border border-red-800 rounded-lg text-sm text-center">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm mb-1 text-slate-300">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full p-2.5 rounded-lg bg-[#0f172a] border border-slate-600 text-white outline-none focus:border-blue-500 text-sm" 
              required 
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-slate-300">Kata Sandi</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full p-2.5 rounded-lg bg-[#0f172a] border border-slate-600 text-white outline-none focus:border-blue-500 text-sm" 
              required 
              autoComplete="new-password"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full p-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold mt-4 disabled:opacity-50 transition-colors"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>
        
        <div className="mt-8 text-center text-xs text-slate-500">
          Ar Development Team
        </div>
      </div>
    </div>
  )
}