'use client'

export async function exportToExcel(filename: string, sheetName: string, rows: Record<string, unknown>[]) {
  const XLSX = await import('xlsx')
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

/** Un solo archivo .xlsx con varias hojas. Se usa para la copia de seguridad completa. */
export async function exportWorkbook(
  filename: string,
  sheets: { name: string; rows: Record<string, unknown>[] }[]
) {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()
  for (const sheet of sheets) {
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows.length ? sheet.rows : [{ vacio: true }])
    // Excel limita los nombres de hoja a 31 caracteres.
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31))
  }
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
