"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { prosesCheckout, batalkanResep } from "./actions"

export default function KasirClient({
  orgId,
  org,
  medicines,
  prescriptions = []
}: {
  orgId: string
  org?: any
  medicines: any[]
  prescriptions?: any[]
}) {
  const router = useRouter()
  const [cart, setCart] = useState<any[]>([])
  const [activePrescription, setActivePrescription] = useState<any>(null)
  const [externalItems, setExternalItems] = useState<any[]>([])
  const [buyerName, setBuyerName] = useState<string>("")
  const [serviceFee, setServiceFee] = useState<number>(0)
  const [cashReceived, setCashReceived] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showQris, setShowQris] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [receiptData, setReceiptData] = useState<any>(null)
  const [printerChar, setPrinterChar] = useState<any>(null)
  const [printerName, setPrinterName] = useState<string>("")
  const [isPrintingBt, setIsPrintingBt] = useState(false)

  const namaToko = org?.name || "AR Pharmacy"
  const sloganToko = org?.tagline || "Sistem Manajemen Apotek"
  const alamatToko = org?.address || ""
  const teleponToko = org?.phone || ""
  const logoToko =
    org?.logo_url && (org.logo_url.startsWith("data:image") || org.logo_url.startsWith("http"))
      ? org.logo_url
      : ""

  const getHarga = (med: any) => {
    const batchHarga =
      med.medicine_batches?.[0]?.selling_price ||
      med.medicine_batches?.[0]?.sales_price ||
      med.medicine_batches?.[0]?.price ||
      0
    return Number(med.sales_price || med.selling_price || med.price || batchHarga || 0)
  }

  const getStok = (med: any) => {
    return (med.medicine_batches || []).reduce((sum: number, b: any) => sum + Number(b.quantity || 0), 0)
  }

  const subtotalObat = cart.reduce((sum, item) => sum + Math.imul(getHarga(item), item.quantity), 0)
  const totalHarga = subtotalObat + Number(serviceFee || 0)
  const kembalian = Math.max(0, Number(cashReceived || 0) - totalHarga)

  const parseObatLuar = (instruksi: string) => {
    if (!instruksi) return { nama: "Obat Luar", aturan: "-" }
    if (instruksi.startsWith("[OBAT LUAR]")) {
      const bersih = instruksi.replace("[OBAT LUAR]", "").trim()
      const kurungTerakhir = bersih.lastIndexOf("(")
      if (kurungTerakhir > 0 && bersih.endsWith(")")) {
        const nama = bersih.slice(0, kurungTerakhir).trim()
        const aturan = bersih.slice(kurungTerakhir + 1, -1).trim()
        return { nama, aturan }
      }
      return { nama: bersih, aturan: "-" }
    }
    return { nama: "Obat Luar", aturan: instruksi }
  }

  const getNamaPasienResep = (pres: any) => {
    if (!pres) return ""
    const visit = Array.isArray(pres.patient_visits) ? pres.patient_visits[0] : pres.patient_visits
    const patient = Array.isArray(visit?.patients) ? visit.patients[0] : visit?.patients
    return patient?.full_name || "Pasien Klinik"
  }

  const pilihResep = (pres: any) => {
    setActivePrescription(pres)
    setBuyerName(getNamaPasienResep(pres))
    const keranjangBaru: any[] = []
    const obatLuarBaru: any[] = []

    const rincian = pres.items || []
    rincian.forEach((item: any) => {
      const jmlDiminta = Number(item.quantity || 1)

      if (!item.medicine_id) {
        const info = parseObatLuar(item.instructions || "")
        obatLuarBaru.push({
          name: info.nama,
          quantity: jmlDiminta,
          instructions: info.aturan,
          reason: "Obat Luar"
        })
        return
      }

      const med = medicines.find((m: any) => m.id === item.medicine_id)
      if (!med) {
        obatLuarBaru.push({
          name: "Obat Tidak Terdaftar",
          quantity: jmlDiminta,
          instructions: item.instructions || "-",
          reason: "Tidak Ada di Master"
        })
        return
      }

      const stokTersedia = getStok(med)

      if (stokTersedia >= jmlDiminta) {
        keranjangBaru.push({
          ...med,
          quantity: jmlDiminta,
          instructions: item.instructions || ""
        })
      } else if (stokTersedia > 0 && stokTersedia < jmlDiminta) {
        const selisihStok = jmlDiminta - stokTersedia
        keranjangBaru.push({
          ...med,
          quantity: stokTersedia,
          instructions: item.instructions || ""
        })
        obatLuarBaru.push({
          name: med.name,
          quantity: selisihStok,
          instructions: item.instructions || "-",
          reason: `Stok Kurang (Kurang ${selisihStok})`
        })
      } else {
        obatLuarBaru.push({
          name: med.name,
          quantity: jmlDiminta,
          instructions: item.instructions || "-",
          reason: "Stok Apotek Habis"
        })
      }
    })

    setCart(keranjangBaru)
    setExternalItems(obatLuarBaru)
  }

  const batalkanResepAktif = () => {
    setActivePrescription(null)
    setBuyerName("")
    setCart([])
    setExternalItems([])
  }

  const handleHapusAntreanResep = async (e: React.MouseEvent, presId: string, nama: string) => {
    e.stopPropagation()
    const yakin = window.confirm(`Batalkan antrean resep untuk pasien ${nama}?`)
    if (!yakin) return

    setIsProcessing(true)
    try {
      await batalkanResep(presId)
      if (activePrescription?.id === presId) {
        batalkanResepAktif()
      }
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const addToCart = (med: any) => {
    const stok = getStok(med)
    const existing = cart.find(item => item.id === med.id)
    if (existing) {
      if (existing.quantity >= stok) {
        alert(`Stok ${med.name} hanya tersisa ${stok}`)
        return
      }
      setCart(cart.map(item => (item.id === med.id ? { ...item, quantity: item.quantity + 1 } : item)))
    } else {
      setCart([...cart, { ...med, quantity: 1 }])
    }
  }

  const updateQuantity = (id: string, delta: number) => {
    setCart(
      cart.map(item => {
        if (item.id === id) {
          const medAsli = medicines.find(m => m.id === id)
          const stokMaks = medAsli ? getStok(medAsli) : 9999
          const newQuantity = item.quantity + delta
          if (newQuantity > stokMaks) {
            alert(`Stok maksimal ${item.name} adalah ${stokMaks}`)
            return item
          }
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item
        }
        return item
      })
    )
  }

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id))
  }

  const konversiLogoKeEscPos = (src: string): Promise<Uint8Array | null> => {
    return new Promise((resolve) => {
      if (!src) {
        resolve(null)
        return
      }
      const img = new Image()
      img.crossOrigin = "Anonymous"
      img.onload = () => {
        try {
          const maxW = 160
          const scale = Math.min(1, maxW / (img.width || 160))
          const w = Math.max(8, Math.floor(((img.width || 160) * scale) / 8) * 8)
          const h = Math.max(8, Math.floor((img.height || 80) * scale))

          const canvas = document.createElement("canvas")
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext("2d")
          if (!ctx) {
            resolve(null)
            return
          }
          ctx.fillStyle = "#FFFFFF"
          ctx.fillRect(0, 0, w, h)
          ctx.drawImage(img, 0, 0, w, h)

          const imgData = ctx.getImageData(0, 0, w, h).data
          const bytesPerRow = w / 8
          const header = [
            0x1b, 0x61, 0x01,
            0x1d, 0x76, 0x30, 0x00,
            bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff,
            h & 0xff, (h >> 8) & 0xff
          ]
          const raster: number[] = []

          for (let y = 0; y < h; y++) {
            for (let xByte = 0; xByte < bytesPerRow; xByte++) {
              let b = 0
              for (let bit = 0; bit < 8; bit++) {
                const x = xByte * 8 + bit
                const idx = (y * w + x) * 4
                const r = imgData[idx]
                const g = imgData[idx + 1]
                const bl = imgData[idx + 2]
                const a = imgData[idx + 3]
                const lum = 0.299 * r + 0.587 * g + 0.114 * bl
                if (a > 128 && lum < 175) {
                  b |= 1 << (7 - bit)
                }
              }
              raster.push(b)
            }
          }

          resolve(new Uint8Array([...header, ...raster, 0x0a]))
        } catch (e) {
          resolve(null)
        }
      }
      img.onerror = () => resolve(null)
      img.src = src
    })
  }

  const hubungkanPrinter = async () => {
    try {
      const nav: any = navigator
      if (!nav.bluetooth) {
        alert("Gunakan browser Google Chrome atau Microsoft Edge untuk memakai fitur Bluetooth.")
        return null
      }

      const daftarService = [
        "000018f0-0000-1000-8000-00805f9b34fb",
        "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
        "49535343-fe7d-4ae5-8fa9-9fafd205e455",
        "0000ff00-0000-1000-8000-00805f9b34fb",
        "0000ffe0-0000-1000-8000-00805f9b34fb"
      ]

      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: daftarService
      })

      const server = await device.gatt.connect()
      const services = await server.getPrimaryServices()

      let targetChar: any = null
      for (const service of services) {
        const chars = await service.getCharacteristics()
        for (const ch of chars) {
          if (ch.properties.write || ch.properties.writeWithoutResponse) {
            targetChar = ch
            break
          }
        }
        if (targetChar) break
      }

      if (!targetChar) {
        alert("Printer ditemukan tetapi saluran cetak tidak terbaca.")
        return null
      }

      setPrinterChar(targetChar)
      setPrinterName(device.name || "Printer Bluetooth")
      return targetChar
    } catch (err: any) {
      if (err?.name !== "NotFoundError") {
        alert("Gagal menyambungkan printer: " + err.message)
      }
      return null
    }
  }

  const formatBaris = (kiri: string, kanan: string) => {
    const lebar = 32
    const sisa = lebar - kiri.length - kanan.length
    if (sisa <= 0) return `${kiri} ${kanan}\n`
    return kiri + " ".repeat(sisa) + kanan + "\n"
  }

  const handlePrintBluetooth = async () => {
    if (!receiptData) return
    setIsPrintingBt(true)

    try {
      let activeChar = printerChar
      if (!activeChar) {
        activeChar = await hubungkanPrinter()
      }
      if (!activeChar) {
        setIsPrintingBt(false)
        return
      }

      const encoder = new TextEncoder()
      const garis = "--------------------------------\n"

      const initBytes = encoder.encode("\x1B\x40\x1B\x61\x01")
      let logoBytes: Uint8Array | null = null
      if (logoToko) {
        logoBytes = await konversiLogoKeEscPos(logoToko)
      }

      let teks = ""
      teks += "\x1B\x61\x01"
      teks += "\x1B\x45\x01"
      teks += `${namaToko.toUpperCase()}\n`
      teks += "\x1B\x45\x00"
      if (sloganToko) teks += `${sloganToko}\n`
      if (alamatToko) teks += `${alamatToko}\n`
      if (teleponToko) teks += `Telp/WA: ${teleponToko}\n`
      teks += garis

      teks += "\x1B\x61\x00"
      teks += `Nota   : ${receiptData.invoice}\n`
      teks += `Tgl    : ${receiptData.date}\n`
      teks += `Pasien : ${receiptData.patientName || "Umum"}\n`
      teks += `Cara   : ${receiptData.method.toUpperCase()}\n`
      teks += garis

      if (receiptData.items && receiptData.items.length > 0) {
        receiptData.items.forEach((item: any) => {
          const harga = getHarga(item)
          const subtotal = Math.imul(item.quantity, harga)
          teks += `${item.name}\n`
          teks += formatBaris(
            `${item.quantity} x ${harga.toLocaleString("id-ID")}`,
            subtotal.toLocaleString("id-ID")
          )
        })
      }

      if (receiptData.serviceFee > 0) {
        teks += "Jasa Dokter / Tindakan\n"
        teks += formatBaris("1 x", receiptData.serviceFee.toLocaleString("id-ID"))
      }

      teks += garis
      teks += "\x1B\x45\x01"
      teks += formatBaris("TOTAL", `Rp ${receiptData.total.toLocaleString("id-ID")}`)
      teks += "\x1B\x45\x00"

      if (receiptData.method === "tunai" && receiptData.cashReceived > 0) {
        teks += formatBaris("TUNAI", `Rp ${receiptData.cashReceived.toLocaleString("id-ID")}`)
        teks += formatBaris("KEMBALI", `Rp ${receiptData.changeAmount.toLocaleString("id-ID")}`)
      }

      teks += garis

      if (receiptData.externalItems && receiptData.externalItems.length > 0) {
        teks += "\x1B\x61\x01"
        teks += "SALINAN RESEP / OBAT LUAR\n"
        teks += "\x1B\x61\x00"
        receiptData.externalItems.forEach((ext: any) => {
          teks += `- ${ext.name} (${ext.quantity}x)\n`
          if (ext.instructions && ext.instructions !== "-") {
            teks += `  Aturan: ${ext.instructions}\n`
          }
        })
        teks += garis
      }

      teks += "\x1B\x61\x01"
      teks += "Terima Kasih\n"
      teks += "Semoga Lekas Sembuh\n\n\n\n"

      const teksBytes = encoder.encode(teks)
      const totalPanjang = initBytes.length + (logoBytes ? logoBytes.length : 0) + teksBytes.length
      const gabunganBytes = new Uint8Array(totalPanjang)

      let offset = 0
      gabunganBytes.set(initBytes, offset)
      offset += initBytes.length
      if (logoBytes) {
        gabunganBytes.set(logoBytes, offset)
        offset += logoBytes.length
      }
      gabunganBytes.set(teksBytes, offset)

      const ukuranPaket = 20
      for (let i = 0; i < gabunganBytes.length; i += ukuranPaket) {
        const potongan = gabunganBytes.slice(i, i + ukuranPaket)
        if (activeChar.properties.writeWithoutResponse) {
          await activeChar.writeValueWithoutResponse(potongan)
        } else {
          await activeChar.writeValue(potongan)
        }
        await new Promise(resolve => setTimeout(resolve, 20))
      }
    } catch (error: any) {
      setPrinterChar(null)
      setPrinterName("")
      alert("Koneksi printer terputus. Silakan tekan Cetak Bluetooth sekali lagi untuk menyambung ulang.")
    } finally {
      setIsPrintingBt(false)
    }
  }

  const handleCheckout = async (metode: string) => {
    if (metode === "tunai" && totalHarga > 0 && cashReceived > 0 && cashReceived < totalHarga) {
      alert("Nominal uang tunai yang diterima kurang dari total tagihan.")
      return
    }

    setIsProcessing(true)
    try {
      const namaPelangganFinal =
        buyerName.trim() || (activePrescription ? getNamaPasienResep(activePrescription) : "Pasien / Umum")

      await prosesCheckout(
        orgId,
        cart,
        totalHarga,
        metode,
        activePrescription?.id || null,
        namaPelangganFinal
      )

      const invoiceNumber = activePrescription?.prescription_number || "INV-" + Math.floor(Date.now() / 1000)

      setReceiptData({
        invoice: invoiceNumber,
        date: new Date().toLocaleString("id-ID"),
        method: metode,
        patientName: namaPelangganFinal,
        items: [...cart],
        externalItems: [...externalItems],
        serviceFee: Number(serviceFee || 0),
        total: totalHarga,
        cashReceived: metode === "tunai" ? Number(cashReceived || 0) : 0,
        changeAmount: metode === "tunai" ? kembalian : 0
      })

      setCart([])
      setExternalItems([])
      setActivePrescription(null)
      setBuyerName("")
      setServiceFee(0)
      setCashReceived(0)
      setShowQris(false)
      router.refresh()
    } catch (error: any) {
      alert("Transaksi gagal: " + error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePrint = () => {
    const printFrame = document.createElement("iframe")
    printFrame.hidden = true
    document.body.appendChild(printFrame)

    const doc = printFrame.contentWindow?.document
    if (doc && receiptData) {
      const itemsHtml = (receiptData.items || [])
        .map((item: any) => {
          const price = getHarga(item)
          const sub = Math.imul(item.quantity, price)
          return `
            <tr>
              <td colspan="2"><b>${item.name}</b></td>
            </tr>
            <tr>
              <td>${item.quantity} x ${price.toLocaleString("id-ID")}</td>
              <td align="right">${sub.toLocaleString("id-ID")}</td>
            </tr>
          `
        })
        .join("")

      const jasaHtml =
        receiptData.serviceFee > 0
          ? `
            <tr>
              <td><b>Jasa Dokter / Tindakan</b></td>
              <td align="right">${receiptData.serviceFee.toLocaleString("id-ID")}</td>
            </tr>
          `
          : ""

      const tunaiHtml =
        receiptData.method === "tunai" && receiptData.cashReceived > 0
          ? `
            <tr>
              <td>Tunai</td>
              <td align="right">Rp ${receiptData.cashReceived.toLocaleString("id-ID")}</td>
            </tr>
            <tr>
              <td>Kembali</td>
              <td align="right">Rp ${receiptData.changeAmount.toLocaleString("id-ID")}</td>
            </tr>
          `
          : ""

      const extHtml =
        receiptData.externalItems && receiptData.externalItems.length > 0
          ? `
            <hr>
            <center><b>SALINAN RESEP / OBAT LUAR</b></center>
            <table width="100%">
              ${receiptData.externalItems
                .map(
                  (ext: any) => `
                  <tr>
                    <td><b>- ${ext.name}</b> (${ext.quantity}x)<br><small>Aturan: ${ext.instructions || "-"}</small></td>
                  </tr>
                `
                )
                .join("")}
            </table>
          `
          : ""

      const logoHtml = logoToko
        ? `<img id="logo-struk" src="${logoToko}" style="max-height:55px;max-width:140px;object-fit:contain;margin-bottom:4px;display:inline-block;" /><br>`
        : ""
      const alamatHtml = alamatToko ? `<br><small>${alamatToko}</small>` : ""
      const teleponHtml = teleponToko ? `<br><small>Telp/WA: ${teleponToko}</small>` : ""

      doc.write(`
        <html>
          <head>
            <style>
              @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                img { display: inline-block !important; visibility: visible !important; }
              }
            </style>
          </head>
          <body text="#000000">
            <font face="Courier New, monospace" size="2">
              <center>
                ${logoHtml}
                <b>${namaToko.toUpperCase()}</b><br>
                ${sloganToko}${alamatHtml}${teleponHtml}
              </center>
              <hr>
              Nota   : ${receiptData.invoice}<br>
              Tgl    : ${receiptData.date}<br>
              Pasien : ${receiptData.patientName || "Umum"}<br>
              Cara   : ${receiptData.method.toUpperCase()}
              <hr>
              <table width="100%">
                ${itemsHtml}
                ${jasaHtml}
              </table>
              <hr>
              <table width="100%">
                <tr>
                  <td><b>TOTAL</b></td>
                  <td align="right"><b>Rp ${receiptData.total.toLocaleString("id-ID")}</b></td>
                </tr>
                ${tunaiHtml}
              </table>
              ${extHtml}
              <hr>
              <center>
                Terima Kasih<br>
                Semoga Lekas Sembuh
              </center>
            </font>
          </body>
        </html>
      `)
      doc.close()

      const jalankanCetak = () => {
        printFrame.contentWindow?.focus()
        printFrame.contentWindow?.print()
        setTimeout(() => {
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame)
          }
        }, 1500)
      }

      const imgEl = doc.getElementById("logo-struk") as HTMLImageElement | null
      if (imgEl && !imgEl.complete) {
        imgEl.onload = () => setTimeout(jalankanCetak, 150)
        imgEl.onerror = () => setTimeout(jalankanCetak, 150)
      } else {
        setTimeout(jalankanCetak, 300)
      }
    }
  }

  const filteredMedicines = medicines.filter(
    med =>
      med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const kurangBayar = Math.max(0, totalHarga - Number(cashReceived || 0))

  return (
    <>
      <div className="mb-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Antrean Resep Dokter</h2>
            <p className="text-xs text-slate-500">Klik pada kartu resep pasien untuk memuat obat ke keranjang kasir.</p>
          </div>
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
            {prescriptions.length} Resep Menunggu
          </span>
        </div>

        {prescriptions.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-sm text-slate-400 italic">
            Belum ada antrean resep dari ruang pemeriksaan dokter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prescriptions.map((pres: any) => {
              const visit = Array.isArray(pres.patient_visits) ? pres.patient_visits[0] : pres.patient_visits
              const patient = Array.isArray(visit?.patients) ? visit.patients[0] : visit?.patients
              const namaPasien = patient?.full_name || "Pasien"
              const isSelected = activePrescription?.id === pres.id

              return (
                <div
                  key={pres.id}
                  onClick={() => pilihResep(pres)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20"
                      : "border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-white"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-bold text-slate-800 block">{namaPasien}</span>
                        <span className="text-xs text-slate-500 font-mono">{pres.prescription_number}</span>
                      </div>
                      <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                        Antrean #{visit?.queue_number || "-"}
                      </span>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/80 flex flex-col gap-1.5">
                      {(pres.items || []).map((item: any, idx: number) => {
                        const med = medicines.find((m: any) => m.id === item.medicine_id)
                        const stok = med ? getStok(med) : 0
                        const isManual = !item.medicine_id
                        const infoManual = isManual ? parseObatLuar(item.instructions || "") : null

                        return (
                          <div key={idx} className="text-xs flex justify-between items-center">
                            <span className="text-slate-700 font-medium truncate pr-2">
                              {isManual ? infoManual?.nama : med?.name || "Obat"}
                              <span className="text-slate-400 ml-1">x{item.quantity}</span>
                            </span>
                            {isManual ? (
                              <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded">
                                Obat Luar
                              </span>
                            ) : stok < item.quantity ? (
                              <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded">
                                Sisa Stok: {stok}
                              </span>
                            ) : (
                              <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded">
                                Tersedia
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-200/60 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={(e) => handleHapusAntreanResep(e, pres.id, namaPasien)}
                      className="text-[11px] font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors"
                    >
                      Batalkan Resep
                    </button>
                    <span className="text-xs font-bold text-blue-600">
                      {isSelected ? "Sedang Diproses" : "Muat Resep ->"}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Cari nama obat atau ketik SKU untuk tambah/ganti obat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-4 rounded-xl border border-slate-200 mb-6 outline-none focus:border-blue-500 bg-white"
          />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredMedicines.map(med => {
              const stok = getStok(med)
              const habis = stok === 0
              const hargaStr = getHarga(med).toLocaleString("id-ID")
              return (
                <button
                  key={med.id}
                  onClick={() => addToCart(med)}
                  disabled={habis}
                  className={`p-4 rounded-xl border text-left transition-colors flex flex-col justify-between h-32 ${
                    habis
                      ? "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                      : "border-slate-200 bg-white hover:border-blue-400 shadow-sm"
                  }`}
                >
                  <div>
                    <p className="font-bold text-slate-800 line-clamp-2">{med.name}</p>
                  </div>
                  <div className="flex justify-between items-end w-full mt-2">
                    <p className="font-bold text-blue-600">Rp {hargaStr}</p>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded ${
                        habis ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"
                      }`}
                    >
                      Stok: {stok}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="w-full lg:w-96 bg-slate-900 rounded-2xl p-6 flex flex-col text-white min-h-[calc(100vh-4rem)] sticky top-8 shadow-xl">
          <div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-3">
            <div>
              <h2 className="text-lg font-bold">Keranjang Transaksi</h2>
              {activePrescription && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-blue-400 font-semibold">
                    Resep: {activePrescription.prescription_number}
                  </span>
                  <button
                    onClick={batalkanResepAktif}
                    className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded hover:bg-red-500/30"
                  >
                    Lepas Resep
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={hubungkanPrinter}
              className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-colors ${
                printerChar
                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600"
              }`}
            >
              {printerChar ? `Terhubung: ${printerName}` : "Hubungkan Printer"}
            </button>
          </div>

          <div className="mb-3">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Nama Pasien / Pembeli Umum
            </label>
            <input
              type="text"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="Contoh: Budi / Pembeli Umum"
              className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 max-h-64">
            {cart.length === 0 && externalItems.length === 0 && (
              <p className="text-slate-500 text-center my-8 text-sm">Belum ada obat yang dipilih</p>
            )}

            {cart.map(item => (
              <div
                key={item.id}
                className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700"
              >
                <div className="flex-1 pr-2">
                  <p className="font-bold text-sm text-slate-100">{item.name}</p>
                  <p className="text-blue-400 text-xs font-medium">Rp {getHarga(item).toLocaleString("id-ID")}</p>
                  {item.instructions && (
                    <p className="text-[11px] text-slate-400 mt-0.5">Aturan: {item.instructions}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-7 h-7 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded text-white font-bold transition-colors"
                  >
                    -
                  </button>
                  <span className="font-bold w-5 text-center text-sm">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-7 h-7 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded text-white font-bold transition-colors"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-400 text-xs font-bold hover:text-red-300 ml-1"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}

            {externalItems.length > 0 && (
              <div className="mt-2 pt-3 border-t border-slate-700">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                  Salinan Resep Luar / Stok Kosong (Rp 0)
                </p>
                <div className="flex flex-col gap-2">
                  {externalItems.map((ext, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-xs flex justify-between items-start"
                    >
                      <div>
                        <p className="font-bold text-amber-200">
                          {ext.name} <span className="font-normal">x{ext.quantity}</span>
                        </p>
                        <p className="text-amber-400/80 text-[11px]">Aturan: {ext.instructions || "-"}</p>
                        <span className="inline-block mt-1 text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                          {ext.reason}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-700 pt-4 mt-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Biaya Jasa Dokter (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={serviceFee || ""}
                  onChange={(e) => setServiceFee(Number(e.target.value))}
                  placeholder="0"
                  className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Uang Diterima (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={cashReceived || ""}
                  onChange={(e) => setCashReceived(Number(e.target.value))}
                  placeholder="0"
                  className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-bold">Total Tagihan</span>
                <span className="text-2xl font-black text-green-400">
                  Rp {totalHarga.toLocaleString("id-ID")}
                </span>
              </div>
              {cashReceived > 0 && (
                <div className="flex justify-between items-center pt-1 border-t border-slate-700/80 text-xs">
                  <span className="text-slate-400">Kembalian Tunai</span>
                  <span className={`font-bold ${cashReceived < totalHarga ? "text-red-400" : "text-amber-300"}`}>
                    {cashReceived < totalHarga
                      ? `Kurang Rp ${kurangBayar.toLocaleString("id-ID")}`
                      : `Rp ${kembalian.toLocaleString("id-ID")}`}
                  </span>
                </div>
              )}
            </div>

            {cart.length === 0 && totalHarga === 0 && externalItems.length > 0 ? (
              <button
                onClick={() => handleCheckout("resep_luar")}
                disabled={isProcessing}
                className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 p-3.5 rounded-xl font-bold transition-colors shadow-lg text-sm"
              >
                {isProcessing ? "Memproses..." : "Selesaikan & Cetak Salinan Resep (Rp 0)"}
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleCheckout("tunai")}
                  disabled={(cart.length === 0 && totalHarga <= 0) || isProcessing}
                  className="bg-green-600 hover:bg-green-500 disabled:bg-slate-800 disabled:text-slate-600 p-3.5 rounded-xl font-bold transition-colors shadow-lg text-sm"
                >
                  {isProcessing ? "Proses..." : "Bayar Tunai"}
                </button>
                <button
                  onClick={() => setShowQris(true)}
                  disabled={(cart.length === 0 && totalHarga <= 0) || isProcessing}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 p-3.5 rounded-xl font-bold transition-colors shadow-lg text-sm"
                >
                  Transfer / QRIS
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showQris && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full flex flex-col items-center shadow-2xl text-slate-800">
            <h2 className="text-2xl font-black mb-1">Scan QRIS</h2>
            <p className="text-xs font-bold text-slate-500 mb-4">{namaToko}</p>
            <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-200 mb-6">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(namaToko)}-${totalHarga}`}
                alt="QRIS"
                className="w-40 h-40 rounded-xl"
              />
            </div>
            <p className="text-3xl font-black text-blue-600 mb-8">Rp {totalHarga.toLocaleString("id-ID")}</p>
            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                onClick={() => setShowQris(false)}
                className="py-3 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleCheckout("qris")}
                disabled={isProcessing}
                className="py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-md"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full flex flex-col">
            <div className="text-slate-800 font-mono text-sm mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200 max-h-72 overflow-y-auto">
              <div className="text-center mb-4 border-b border-dashed border-slate-300 pb-2">
                {logoToko && (
                  <img
                    src={logoToko}
                    alt="Logo"
                    className="w-12 h-12 object-contain mx-auto mb-1 rounded"
                  />
                )}
                <h2 className="font-bold text-base uppercase">{namaToko}</h2>
                {alamatToko && <p className="text-[11px] text-slate-500">{alamatToko}</p>}
                {teleponToko && <p className="text-[11px] text-slate-500">Telp/WA: {teleponToko}</p>}
                <p className="text-xs text-slate-500 mt-1">Nota: {receiptData.invoice}</p>
                <p className="text-xs text-slate-500">{receiptData.date}</p>
                <p className="text-xs font-bold text-slate-700 mt-1">
                  Pasien/Pembeli: {receiptData.patientName || "Umum"}
                </p>
              </div>

              {receiptData.items && receiptData.items.length > 0 && (
                <div className="flex flex-col gap-2 mb-3">
                  {receiptData.items.map((item: any, i: number) => {
                    const itemPrice = getHarga(item)
                    const subtotal = Math.imul(item.quantity, itemPrice)
                    return (
                      <div key={i}>
                        <p className="font-bold text-xs">{item.name}</p>
                        <div className="flex justify-between text-xs text-slate-600">
                          <span>
                            {item.quantity} x {itemPrice.toLocaleString("id-ID")}
                          </span>
                          <span className="font-medium text-slate-800">{subtotal.toLocaleString("id-ID")}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {receiptData.serviceFee > 0 && (
                <div className="flex justify-between text-xs text-slate-700 mb-3 pt-1 border-t border-dotted border-slate-300">
                  <span className="font-bold">Jasa Dokter / Tindakan</span>
                  <span className="font-medium">{receiptData.serviceFee.toLocaleString("id-ID")}</span>
                </div>
              )}

              <div className="border-t border-dashed border-slate-300 pt-2 flex justify-between font-bold text-sm">
                <span>TOTAL</span>
                <span>Rp {receiptData.total.toLocaleString("id-ID")}</span>
              </div>

              {receiptData.method === "tunai" && receiptData.cashReceived > 0 && (
                <div className="mt-1 text-xs text-slate-600 flex flex-col gap-0.5">
                  <div className="flex justify-between">
                    <span>Tunai</span>
                    <span>Rp {receiptData.cashReceived.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Kembali</span>
                    <span>Rp {receiptData.changeAmount.toLocaleString("id-ID")}</span>
                  </div>
                </div>
              )}

              {receiptData.externalItems && receiptData.externalItems.length > 0 && (
                <div className="mt-3 pt-2 border-t border-dashed border-slate-300">
                  <p className="text-xs font-bold text-center mb-1">SALINAN RESEP / OBAT LUAR</p>
                  {receiptData.externalItems.map((ext: any, idx: number) => (
                    <div key={idx} className="text-xs text-slate-700 mb-1">
                      <p className="font-bold">
                        - {ext.name} ({ext.quantity}x)
                      </p>
                      <p className="text-[11px] text-slate-500 pl-2">Aturan: {ext.instructions || "-"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5 mt-auto">
              <button
                onClick={handlePrintBluetooth}
                disabled={isPrintingBt}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 7l10 10-5 5V2l5 5L7 17"
                  ></path>
                </svg>
                {isPrintingBt ? "Mencetak..." : "Cetak Bluetooth Langsung"}
              </button>

              <div className="flex gap-2.5">
                <button
                  onClick={() => setReceiptData(null)}
                  className="flex-1 py-2.5 text-slate-600 bg-slate-100 font-bold hover:bg-slate-200 rounded-xl transition-colors text-sm"
                >
                  Tutup
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors text-sm"
                >
                  Cetak Biasa / USB
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}