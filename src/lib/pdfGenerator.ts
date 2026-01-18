import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PDFData {
  cliente?: string;
  fecha?: string;
  numeroCotizacion?: string;
  formaPago?: string;
  productos?: Array<{
    nombre: string;
    cantidad: number;
    precio: number;
    total: number;
  }>;
  totalFinal?: string;
}

interface PDFConfig {
  logo_url?: string;
  company_name?: string;
  address?: string;
  tax_id?: string;
  email?: string;
}

export const generarPDFZionak = (data: PDFData, config: PDFConfig = {}) => {
  const doc = new jsPDF();

  // 1. LOGO (Si existe en la configuración)
  if (config?.logo_url) {
    try {
        doc.addImage(config.logo_url, 'PNG', 150, 10, 40, 40);
    } catch (e) {
        console.warn("No se pudo cargar el logo", e);
    }
  }

  // 2. DATOS DE LA EMPRESA (Lado Izquierdo)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(config?.company_name || 'Zionak Studios', 14, 22);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(config?.address || 'Ciudad de Guatemala', 14, 30);
  doc.text(`NIT: ${config?.tax_id || 'CF'}`, 14, 35);
  doc.text(config?.email || 'info@zionak.com', 14, 40);

  // 3. TÍTULO
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('COTIZACIÓN', 14, 55);

  // 4. DATOS DEL CLIENTE
  doc.setFillColor(245, 247, 250); // Fondo Gris Claro
  doc.rect(14, 60, 182, 35, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(50);
  
  // Columna Izquierda (Cliente)
  doc.setFont('helvetica', 'bold'); doc.text('Cliente:', 20, 70);
  doc.setFont('helvetica', 'normal'); doc.text(data?.cliente || '---', 45, 70);
  
  doc.setFont('helvetica', 'bold'); doc.text('Fecha:', 20, 78);
  doc.setFont('helvetica', 'normal'); doc.text(data?.fecha || '---', 45, 78);
  
  // Columna Derecha (Info Cotización)
  doc.setFont('helvetica', 'bold'); doc.text('No:', 120, 70);
  doc.setFont('helvetica', 'normal'); doc.text(data?.numeroCotizacion || '---', 135, 70);
  
  doc.setFont('helvetica', 'bold'); doc.text('Pago:', 120, 78);
  doc.setFont('helvetica', 'normal'); doc.text(data?.formaPago || '---', 135, 78);

  // 5. TABLA DE PRODUCTOS
  const bodyData = data?.productos?.map((item) => [
      item.nombre,
      item.cantidad,
      `Q${Number(item.precio).toFixed(2)}`,
      `Q${Number(item.total).toFixed(2)}`
  ]) || [];

  autoTable(doc, {
    startY: 105,
    head: [['DESCRIPCIÓN', 'CANT', 'PRECIO UNIT.', 'TOTAL']],
    body: bodyData,
    theme: 'grid',
    headStyles: { fillColor: [45, 212, 191], textColor: 255, fontStyle: 'bold' }, // Color Teal
    styles: { fontSize: 9, cellPadding: 3 },
  });

  // 6. TOTALES
  // @ts-expect-error - lastAutoTable may not be in types
  const finalY = doc.lastAutoTable?.finalY || 150;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(`TOTAL: Q${data?.totalFinal || '0.00'}`, 140, finalY + 10);
  
  // Pie de página
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Generado por Kitsune CRM - Zionak Studios', 14, 280);

  // Descargar archivo
  doc.save(`Cotizacion_${data?.numeroCotizacion || 'Kitsune'}.pdf`);
};