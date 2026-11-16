"use client"

import { useState } from "react"
import { getLaporanKunjungan, getLaporanPenjualan } from "./actions"

export default function LaporanClient({
  orgId,
  org
}: {
  orgId: string
  org?: any
}) {
  const [tanggalMulai, setTanggalMulai] = useState("")
  const [tanggalAkhir, setTanggalAkhir] = useState("")
  const [proses, setProses] = useState(false)

  const namaToko = org?.name || "AR Pharmacy"
  const sloganToko = org?.tagline || "Sistem Manajemen Apotek"
  const alamatToko = org?.address || ""
  const teleponToko = org?.phone || ""
  const logoToko =
    org?.logo_url && (org.logo_url.startsWith("data:image") || org.logo_url.startsWith("http"))
      ? org.logo_url
      : ""

  const formatTanggalLokal = (tanggal: string) => {
    if (!tanggal) return ""
    const [tahun, bulan, hari] = tanggal.split("-")
    return `${hari}/${bulan}/${tahun}`
  }

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

  const siapkanLogoPng = (src: string): Promise<string> => {
    return new Promise((resolve) => {
      if (!src) {
        resolve("")
        return
      }
      const img = new Image()
      img.crossOrigin = "Anonymous"
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas")
          canvas.width = img.width || 200
          canvas.height = img.height || 200
          const ctx = canvas.getContext("2d")
          if (ctx) {
            ctx.fillStyle = "#FFFFFF"
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, 0, 0)
            resolve(canvas.toDataURL("image/png"))
          } else {
            resolve("")
          }
        } catch (err) {
          resolve("")
        }
      }
      img.onerror = () => resolve("")
      img.src = src
    })
  }

  const muatSkripEksternal = (src: string) => {
    return new Promise<void>((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve()
        return
      }
      const script = document.createElement("script")
      script.src = src
      script.onload = () => resolve()
      script.onerror = () => reject(new Error("Gagal memuat modul laporan"))
      document.head.appendChild(script)
    })
  }

  const unduhFileExcelDenganLogo = async (
    judulLaporan: string,
    namaSheet: string,
    namaFile: string,
    dataTabel: any[],
    lebarKolom: { wch: number }[]
  ) => {
    await muatSkripEksternal("https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js")
    const win: any = window
    const workbook = new win.ExcelJS.Workbook()
    const sheet = workbook.addWorksheet(namaSheet)

    const kolomKunci = Object.keys(dataTabel[0] || {})
    sheet.columns = kolomKunci.map((k, idx) => ({
      key: k,
      width: lebarKolom[idx]?.wch || 16
    }))

    let pngDataUrl = ""
    if (logoToko) {
      pngDataUrl = await siapkanLogoPng(logoToko)
    }

    const startCol = pngDataUrl ? "C" : "A"

    sheet.getRow(1).height = 20
    sheet.getRow(2).height = 18
    sheet.getRow(3).height = 18
    sheet.getRow(4).height = 18

    if (pngDataUrl) {
      try {
        const imageId = workbook.addImage({
          base64: pngDataUrl,
          extension: "png"
        })
        sheet.addImage(imageId, {
          tl: { col: 0.15, row: 0.15 },
          ext: { width: 78, height: 78 }
        })
      } catch (e) {}
    }

    const infoKontak = [
      alamatToko ? `Alamat: ${alamatToko}` : "",
      teleponToko ? `Telp/WA: ${teleponToko}` : ""
    ]
      .filter(Boolean)
      .join("  |  ")

    const cellJudulToko = sheet.getCell(`${startCol}1`)
    cellJudulToko.value = `${namaToko.toUpperCase()} - ${sloganToko.toUpperCase()}`
    cellJudulToko.font = { name: "Calibri", size: 14, bold: true }

    const cellKontak = sheet.getCell(`${startCol}2`)
    cellKontak.value = infoKontak || "Sistem Manajemen Apotek"
    cellKontak.font = { name: "Calibri", size: 10 }

    const cellJudulLaporan = sheet.getCell(`${startCol}3`)
    cellJudulLaporan.value = judulLaporan
    cellJudulLaporan.font = { name: "Calibri", size: 11, bold: true }

    const cellPeriode = sheet.getCell(`${startCol}4`)
    cellPeriode.value = `Periode: ${formatTanggalLokal(tanggalMulai)} s/d ${formatTanggalLokal(tanggalAkhir)}`
    cellPeriode.font = { name: "Calibri", size: 10 }

    const headerRow = sheet.getRow(6)
    headerRow.values = kolomKunci
    headerRow.height = 22
    headerRow.eachCell((cell: any) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E293B" }
      }
      cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } }
      cell.alignment = { vertical: "middle", horizontal: "left" }
      cell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } }
      }
    })

    dataTabel.forEach((item, index) => {
      const rowValues = kolomKunci.map((k) => item[k])
      const r = sheet.getRow(7 + index)
      r.values = rowValues
      const isRekapRow = item["No"] === ""
      r.eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
        if (colNumber <= kolomKunci.length) {
          cell.font = { name: "Calibri", size: 10, bold: isRekapRow }
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } }
          }
          if (typeof cell.value === "number" && colNumber >= 8) {
            cell.numFmt = "#,##0"
          }
        }
      })
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${namaFile}.xlsx`
    anchor.click()
    window.URL.revokeObjectURL(url)
  }

  const unduhFilePdf = async (
    judul: string,
    namaFile: string,
    kolom: string[],
    baris: any[][]
  ) => {
    await muatSkripEksternal("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js")
    await muatSkripEksternal("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js")

    const win: any = window
    const { jsPDF } = win.jspdf
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })

    let posisiX = 14
    if (logoToko) {
      const pngDataUrl = await siapkanLogoPng(logoToko)
      if (pngDataUrl) {
        try {
          doc.addImage(pngDataUrl, "PNG", 14, 10, 20, 20)
          posisiX = 38
        } catch (e) {
          posisiX = 14
        }
      }
    }

    doc.setFontSize(15)
    doc.setFont("helvetica", "bold")
    doc.text(`${namaToko.toUpperCase()} - ${sloganToko.toUpperCase()}`, posisiX, 15)

    const infoKontak = [alamatToko, teleponToko ? `Telp/WA: ${teleponToko}` : ""].filter(Boolean).join("  |  ")
    if (infoKontak) {
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text(infoKontak, posisiX, 20)
    }

    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text(judul, posisiX, 26)

    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.text(
      `Periode: ${formatTanggalLokal(tanggalMulai)} s/d ${formatTanggalLokal(tanggalAkhir)}`,
      posisiX,
      31
    )

    doc.autoTable({
      startY: 36,
      head: [kolom],
      body: baris,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    })

    doc.save(`${namaFile}.pdf`)
  }

  const handleEkspor = async (jenis: "Kunjungan" | "Penjualan", format: "excel" | "pdf") => {
    if (!tanggalMulai || !tanggalAkhir) {
      alert("Pilih tanggal mulai dan tanggal akhir terlebih dahulu")
      return
    }
    setProses(true)

    try {
      const waktuUnduh = new Date().toTimeString().slice(0, 5).replace(":", "")
      const slugToko = namaToko.replace(/[^a-zA-Z0-9]/g, "_")

      if (jenis === "Kunjungan") {
        const res = await getLaporanKunjungan(orgId, tanggalMulai, tanggalAkhir)

        if (!res.visits || res.visits.length === 0) {
          alert("Tidak ada data kunjungan pada rentang tanggal tersebut.")
          setProses(false)
          return
        }

        const patientMap = new Map<string, any>(res.patients.map((p: any) => [p.id, p]))
        const medMap = new Map<string, any>(res.medicines.map((m: any) => [m.id, m]))

        const rmMap = new Map<string, any>()
        res.medicalRecords.forEach((rm: any) => {
          if (rm.visit_id) rmMap.set(rm.visit_id, rm)
        })

        const presMap = new Map<string, any>()
        res.prescriptions.forEach((p: any) => {
          if (p.visit_id) presMap.set(p.visit_id, p)
        })

        const dataBersih: any[] = res.visits.map((visit: any, index: number) => {
          const pasien: any = patientMap.get(visit.patient_id) || {}
          const rm: any = rmMap.get(visit.id) || {}
          const pres: any = presMap.get(visit.id)

          let daftarObat = "-"
          if (pres) {
            const items = res.prescriptionItems.filter((pi: any) => pi.prescription_id === pres.id)
            if (items.length > 0) {
              daftarObat = items
                .map((pi: any) => {
                  if (!pi.medicine_id) {
                    const info = parseObatLuar(pi.instructions || "")
                    return `${info.nama} [Obat Luar] (${pi.quantity}x, ${info.aturan})`
                  }
                  const med: any = medMap.get(pi.medicine_id) || {}
                  return `${med.name || "Obat"} (${pi.quantity}x, ${pi.instructions || "-"})`
                })
                .join(", ")
            }
          }

          return {
            "No": index + 1,
            "Tanggal Kunjungan": new Date(visit.visit_date).toLocaleDateString("id-ID"),
            "No. Antrean": visit.queue_number || "-",
            "No. RM": pasien.patient_number || "-",
            "Nama Pasien": pasien.full_name || "-",
            "Keluhan Utama": rm.chief_complaint || "-",
            "Pemeriksaan Fisik": rm.physical_examination || "-",
            "Diagnosis": rm.diagnosis || "-",
            "Rencana Tindakan": rm.action_plan || "-",
            "Resep Obat": daftarObat,
            "Status Kunjungan": (visit.status || "-").toUpperCase()
          }
        })

        dataBersih.push({
          "No": "",
          "Tanggal Kunjungan": "",
          "No. Antrean": "",
          "No. RM": "",
          "Nama Pasien": "TOTAL KUNJUNGAN PASIEN",
          "Keluhan Utama": `${res.visits.length} Pasien`,
          "Pemeriksaan Fisik": "",
          "Diagnosis": "",
          "Rencana Tindakan": "",
          "Resep Obat": "",
          "Status Kunjungan": ""
        })

        const namaFile = `Laporan_Kunjungan_${slugToko}_${tanggalMulai}_sd_${tanggalAkhir}_${waktuUnduh}`

        if (format === "excel") {
          const lebarKolom = [
            { wch: 6 },
            { wch: 18 },
            { wch: 13 },
            { wch: 18 },
            { wch: 24 },
            { wch: 24 },
            { wch: 22 },
            { wch: 22 },
            { wch: 24 },
            { wch: 38 },
            { wch: 16 }
          ]
          await unduhFileExcelDenganLogo(
            "LAPORAN KUNJUNGAN PASIEN",
            "Laporan Kunjungan",
            namaFile,
            dataBersih,
            lebarKolom
          )
        } else {
          const kolom = [
            "No",
            "Tanggal",
            "Antrean",
            "No. RM",
            "Nama Pasien",
            "Keluhan",
            "Pemeriksaan",
            "Diagnosis",
            "Tindakan",
            "Resep Obat",
            "Status"
          ]
          const baris = dataBersih.map((d: any) => [
            d["No"],
            d["Tanggal Kunjungan"],
            d["No. Antrean"],
            d["No. RM"],
            d["Nama Pasien"],
            d["Keluhan Utama"],
            d["Pemeriksaan Fisik"],
            d["Diagnosis"],
            d["Rencana Tindakan"],
            d["Resep Obat"],
            d["Status Kunjungan"]
          ])
          await unduhFilePdf("LAPORAN KUNJUNGAN PASIEN", namaFile, kolom, baris)
        }

      } else if (jenis === "Penjualan") {
        const res = await getLaporanPenjualan(orgId, tanggalMulai, tanggalAkhir)

        const priceMap = new Map<string, number>()

        res.medicines.forEach((m: any) => {
          const p = Number(m.selling_price || m.sales_price || m.price || m.unit_price || 0)
          if (p > 0) priceMap.set(m.id, p)
        })

        res.batches.forEach((b: any) => {
          const p = Number(b.selling_price || b.sales_price || b.price || b.unit_price || 0)
          if (p > 0 && b.medicine_id) priceMap.set(b.medicine_id, p)
        })

        res.saleItems.forEach((si: any) => {
          const qty = Number(si.quantity || 1)
          const p = Number(si.unit_price || si.price || (si.subtotal ? si.subtotal / qty : 0))
          if (p > 0 && si.medicine_id) priceMap.set(si.medicine_id, p)
        })

        const medMap = new Map<string, any>(res.medicines.map((m: any) => [m.id, m]))
        const presMap = new Map<string, any>(res.prescriptions.map((p: any) => [p.id, p]))

        const startMs = new Date(`${tanggalMulai}T00:00:00+08:00`).getTime()
        const endMs = new Date(`${tanggalAkhir}T23:59:59+08:00`).getTime()

        const resepUnikPerKunjungan = new Map<string, any>()
        res.prescriptions.forEach((pres: any) => {
          const waktuResep = new Date(pres.created_at).getTime()
          if (waktuResep >= startMs && waktuResep <= endMs) {
            const key = pres.visit_id || pres.id
            resepUnikPerKunjungan.set(key, pres)
          }
        })

        const daftarResepPeriode = Array.from(resepUnikPerKunjungan.values())

        const barisLaporan: any[] = []
        let nomorUrut = 1
        let qtyLunas = 0
        let omzetLunas = 0
        let qtyMenunggu = 0
        let omzetMenunggu = 0

        const usedPrescriptionIds = new Set<string>()

        res.sales.forEach((sale: any) => {
          const tanggal = new Date(sale.created_at).toLocaleDateString("id-ID")
          const noFakturAsli = sale.invoice_number || sale.sale_number || `INV-${String(sale.id).slice(0, 8).toUpperCase()}`
          const metodeBayar = (sale.payment_method || "TUNAI").toUpperCase()

          const rincianKasir = res.saleItems.filter((si: any) => si.sale_id === sale.id)
          let resepTerkait = sale.prescription_id ? presMap.get(sale.prescription_id) : null

          if (!resepTerkait && rincianKasir.length > 0) {
            const kandidat = daftarResepPeriode.find((p: any) => {
              if (usedPrescriptionIds.has(p.id)) return false
              const st = (p.status || "").toUpperCase()
              if (st !== "SELESAI" && st !== "LUNAS") return false
              const itemApotekResep = res.prescriptionItems.filter(
                (pi: any) => pi.prescription_id === p.id && pi.medicine_id
              )
              if (itemApotekResep.length === 0) return false
              return rincianKasir.every((rk: any) =>
                itemApotekResep.some((ir: any) => ir.medicine_id === rk.medicine_id)
              )
            })
            if (kandidat) resepTerkait = kandidat
          }

          if (resepTerkait) {
            usedPrescriptionIds.add(resepTerkait.id)
          }

          const visit = Array.isArray(resepTerkait?.patient_visits)
            ? resepTerkait.patient_visits[0]
            : resepTerkait?.patient_visits
          const pasienResep = Array.isArray(visit?.patients) ? visit.patients[0] : visit?.patients
          const namaPelanggan = sale.customer_name || pasienResep?.full_name || "Pasien / Umum"
          const jenisLayanan = resepTerkait ? "Penebusan Resep" : "Penjualan Langsung"
          const noFaktur = resepTerkait ? `${noFakturAsli} (${resepTerkait.prescription_number})` : noFakturAsli

          if (rincianKasir.length > 0) {
            rincianKasir.forEach((item: any) => {
              const med: any = medMap.get(item.medicine_id) || {}
              const qty = Number(item.quantity || 1)
              const harga = Number(item.unit_price || item.price || priceMap.get(item.medicine_id) || 0)
              const subtotal = Number(item.subtotal || item.total_price || Math.imul(qty, harga))

              qtyLunas += qty
              omzetLunas += subtotal

              barisLaporan.push({
                "No": nomorUrut++,
                "Tanggal": tanggal,
                "No. Faktur": noFaktur,
                "Jenis Transaksi": jenisLayanan,
                "Nama Pasien / Pelanggan": namaPelanggan,
                "Kode Obat": med.code || "-",
                "Nama Obat": item.medicine_name || med.name || "Obat Apotek",
                "Qty": qty,
                "Harga Satuan (Rp)": harga,
                "Subtotal (Rp)": subtotal,
                "Metode Bayar": metodeBayar
              })
            })
          }

          if (resepTerkait) {
            const obatLuarResep = res.prescriptionItems.filter(
              (pi: any) => pi.prescription_id === resepTerkait.id && !pi.medicine_id
            )
            obatLuarResep.forEach((pi: any) => {
              const info = parseObatLuar(pi.instructions || "")
              const qty = Number(pi.quantity || 1)

              barisLaporan.push({
                "No": nomorUrut++,
                "Tanggal": tanggal,
                "No. Faktur": resepTerkait.prescription_number,
                "Jenis Transaksi": "Salinan Resep Luar",
                "Nama Pasien / Pelanggan": namaPelanggan,
                "Kode Obat": "OBAT-LUAR",
                "Nama Obat": `${info.nama} (Obat Luar)`,
                "Qty": qty,
                "Harga Satuan (Rp)": 0,
                "Subtotal (Rp)": 0,
                "Metode Bayar": "RESEP LUAR"
              })
            })
          }
        })

        daftarResepPeriode.forEach((pres: any) => {
          if (usedPrescriptionIds.has(pres.id)) return

          const tanggal = new Date(pres.created_at).toLocaleDateString("id-ID")
          const visit = Array.isArray(pres.patient_visits) ? pres.patient_visits[0] : pres.patient_visits
          const pasien = Array.isArray(visit?.patients) ? visit.patients[0] : visit?.patients
          const namaPasien = pasien?.full_name || "Pasien Klinik"
          const rincian = res.prescriptionItems.filter((pi: any) => pi.prescription_id === pres.id)
          const statusResep = (pres.status || "MENUNGGU").toUpperCase()
          const sudahLunas = statusResep === "SELESAI" || statusResep === "LUNAS"

          rincian.forEach((pi: any) => {
            const qty = Number(pi.quantity || 1)

            if (!pi.medicine_id) {
              const info = parseObatLuar(pi.instructions || "")
              barisLaporan.push({
                "No": nomorUrut++,
                "Tanggal": tanggal,
                "No. Faktur": pres.prescription_number,
                "Jenis Transaksi": "Salinan Resep Luar",
                "Nama Pasien / Pelanggan": namaPasien,
                "Kode Obat": "OBAT-LUAR",
                "Nama Obat": `${info.nama} (Obat Luar)`,
                "Qty": qty,
                "Harga Satuan (Rp)": 0,
                "Subtotal (Rp)": 0,
                "Metode Bayar": "RESEP LUAR"
              })
              return
            }

            const med: any = medMap.get(pi.medicine_id) || {}
            const harga = Number(priceMap.get(pi.medicine_id) || 0)
            const subtotal = Math.imul(qty, harga)

            if (sudahLunas) {
              qtyLunas += qty
              omzetLunas += subtotal
            } else {
              qtyMenunggu += qty
              omzetMenunggu += subtotal
            }

            barisLaporan.push({
              "No": nomorUrut++,
              "Tanggal": tanggal,
              "No. Faktur": pres.prescription_number,
              "Jenis Transaksi": "Resep Dokter",
              "Nama Pasien / Pelanggan": namaPasien,
              "Kode Obat": med.code || "-",
              "Nama Obat": med.name || "-",
              "Qty": qty,
              "Harga Satuan (Rp)": harga,
              "Subtotal (Rp)": subtotal,
              "Metode Bayar": statusResep
            })
          })
        })

        if (barisLaporan.length === 0) {
          alert("Tidak ada data penjualan pada rentang tanggal tersebut.")
          setProses(false)
          return
        }

        barisLaporan.push({
          "No": "",
          "Tanggal": "",
          "No. Faktur": "",
          "Jenis Transaksi": "",
          "Nama Pasien / Pelanggan": "",
          "Kode Obat": "",
          "Nama Obat": "TOTAL PENDAPATAN LUNAS (KASIR)",
          "Qty": qtyLunas,
          "Harga Satuan (Rp)": "",
          "Subtotal (Rp)": omzetLunas,
          "Metode Bayar": "LUNAS"
        })

        barisLaporan.push({
          "No": "",
          "Tanggal": "",
          "No. Faktur": "",
          "Jenis Transaksi": "",
          "Nama Pasien / Pelanggan": "",
          "Kode Obat": "",
          "Nama Obat": "TOTAL RESEP MENUNGGU",
          "Qty": qtyMenunggu,
          "Harga Satuan (Rp)": "",
          "Subtotal (Rp)": omzetMenunggu,
          "Metode Bayar": "MENUNGGU"
        })

        barisLaporan.push({
          "No": "",
          "Tanggal": "",
          "No. Faktur": "",
          "Jenis Transaksi": "",
          "Nama Pasien / Pelanggan": "",
          "Kode Obat": "",
          "Nama Obat": "TOTAL KESELURUHAN",
          "Qty": qtyLunas + qtyMenunggu,
          "Harga Satuan (Rp)": "",
          "Subtotal (Rp)": omzetLunas + omzetMenunggu,
          "Metode Bayar": ""
        })

        const namaFile = `Laporan_Penjualan_${slugToko}_${tanggalMulai}_sd_${tanggalAkhir}_${waktuUnduh}`

        if (format === "excel") {
          const lebarKolom = [
            { wch: 6 },
            { wch: 13 },
            { wch: 28 },
            { wch: 20 },
            { wch: 24 },
            { wch: 13 },
            { wch: 32 },
            { wch: 8 },
            { wch: 18 },
            { wch: 18 },
            { wch: 16 }
          ]
          await unduhFileExcelDenganLogo(
            "LAPORAN PENJUALAN & OMZET APOTEK",
            "Laporan Penjualan",
            namaFile,
            barisLaporan,
            lebarKolom
          )
        } else {
          const kolom = [
            "No",
            "Tanggal",
            "No. Faktur",
            "Jenis Transaksi",
            "Pasien / Pelanggan",
            "Kode",
            "Nama Obat",
            "Qty",
            "Harga (Rp)",
            "Subtotal (Rp)",
            "Status / Bayar"
          ]
          const baris = barisLaporan.map((b: any) => [
            b["No"],
            b["Tanggal"],
            b["No. Faktur"],
            b["Jenis Transaksi"],
            b["Nama Pasien / Pelanggan"],
            b["Kode Obat"],
            b["Nama Obat"],
            b["Qty"],
            typeof b["Harga Satuan (Rp)"] === "number"
              ? b["Harga Satuan (Rp)"].toLocaleString("id-ID")
              : b["Harga Satuan (Rp)"],
            typeof b["Subtotal (Rp)"] === "number"
              ? b["Subtotal (Rp)"].toLocaleString("id-ID")
              : b["Subtotal (Rp)"],
            b["Metode Bayar"]
          ])
          await unduhFilePdf("LAPORAN PENJUALAN & OMZET APOTEK", namaFile, kolom, baris)
        }
      }
    } catch (error: any) {
      alert("Gagal mengunduh laporan: " + error.message)
    } finally {
      setProses(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-[#1e293b] p-6 rounded-xl shadow-xl border border-slate-700">
        <h2 className="text-lg font-bold text-blue-400 mb-4">Filter Periode Laporan</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tanggal Mulai</label>
            <div className="relative flex items-center">
              <input
                type="text"
                readOnly
                value={tanggalMulai ? formatTanggalLokal(tanggalMulai) : ""}
                placeholder="Hari/Bulan/Tahun"
                className="w-full p-3 bg-[#0f172a] border border-slate-600 rounded-lg outline-none text-sm text-slate-200 cursor-pointer focus:border-blue-500"
              />
              <svg className="w-5 h-5 text-slate-400 absolute right-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              <input
                type="date"
                value={tanggalMulai}
                onChange={(e) => setTanggalMulai(e.target.value)}
                onClick={(e: any) => e.target.showPicker && e.target.showPicker()}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tanggal Akhir</label>
            <div className="relative flex items-center">
              <input
                type="text"
                readOnly
                value={tanggalAkhir ? formatTanggalLokal(tanggalAkhir) : ""}
                placeholder="Hari/Bulan/Tahun"
                className="w-full p-3 bg-[#0f172a] border border-slate-600 rounded-lg outline-none text-sm text-slate-200 cursor-pointer focus:border-blue-500"
              />
              <svg className="w-5 h-5 text-slate-400 absolute right-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              <input
                type="date"
                value={tanggalAkhir}
                onChange={(e) => setTanggalAkhir(e.target.value)}
                onClick={(e: any) => e.target.showPicker && e.target.showPicker()}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#1e293b] p-6 rounded-xl shadow-xl border border-slate-700 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-200 mb-2">Laporan Kunjungan Pasien</h3>
            <p className="text-slate-400 text-sm mb-6">
              Ekspor data riwayat pemeriksaan, diagnosis, tindakan medis, dan rincian resep obat dalam format Excel atau PDF.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleEkspor("Kunjungan", "excel")}
              disabled={proses}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 text-sm"
            >
              {proses ? "Proses..." : "Unduh Excel"}
            </button>
            <button
              onClick={() => handleEkspor("Kunjungan", "pdf")}
              disabled={proses}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 text-sm"
            >
              {proses ? "Proses..." : "Unduh PDF"}
            </button>
          </div>
        </div>

        <div className="bg-[#1e293b] p-6 rounded-xl shadow-xl border border-slate-700 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-200 mb-2">Laporan Penjualan & Omzet Apotek</h3>
            <p className="text-slate-400 text-sm mb-6">
              Ekspor rincian obat keluar, harga satuan, subtotal, dan rekap omzet lunas serta resep menunggu dalam format Excel atau PDF.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleEkspor("Penjualan", "excel")}
              disabled={proses}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 text-sm"
            >
              {proses ? "Proses..." : "Unduh Excel"}
            </button>
            <button
              onClick={() => handleEkspor("Penjualan", "pdf")}
              disabled={proses}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 text-sm"
            >
              {proses ? "Proses..." : "Unduh PDF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}