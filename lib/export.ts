'use client'

export async function exportToExcel(filename: string, sheetName: string, rows: Record<string, unknown>[]) {
  const XLSX = await import('xlsx')
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

export async function exportToPDF(
  filename: string,
  title: string,
  columns: string[],
  rows: (string | number)[][]
) {
  const { default: jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text(title, 14, 16)
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 22,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [91, 110, 79] }, // moss
  })
  doc.save(`${filename}.pdf`)
}
