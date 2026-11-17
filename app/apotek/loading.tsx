import Sidebar from "@/components/Sidebar"

export default function LoadingApotek() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium text-sm animate-pulse">Memuat data obat...</p>
        </div>
      </div>
    </div>
  )
}