// src/lib/pdfGenerator.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


interface DatosCotizacion {
  numeroCotizacion: string;
  cliente: string;
  fecha: string;
  direccion: string;
  formaPago: string;
  totalEnLetras: string;
  productos: Array<{
    nombre: string;
    cantidad: number | string;
    precio: number | string;
    subtotal: number | string;
    iva: number | string;
    total: number | string;
  }>;
  totalFinal: string;
  logo?: string; 
}

export const generarPDFZionak = (datos: DatosCotizacion) => {
  const doc = new jsPDF();

  // --- CONFIGURACIÓN ---
  const margenIzq = 15;
  const colorGris = [80, 80, 80] as [number, number, number];
  const colorNegro = [0, 0, 0] as [number, number, number];

  // --- 1. ENCABEZADO ---
  // LOGO
  if (datos.logo) {
    doc.addImage(datos.logo, 'PNG', margenIzq, 10, 45, 25);
  }

  // Datos Empresa (Lado Derecho)
  const xEmpresa = 110;
  doc.setFontSize(8);
  doc.setTextColor(...colorNegro);
  doc.setFont("helvetica", "bold");
  doc.text("GRUPO ZIONAK CENTROAMERICA SA", xEmpresa, 15);
  doc.text("ZIONAK CENTROAMERICA", xEmpresa, 20);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...colorGris);
  doc.text("Nit No 12 00 12 86-3", xEmpresa, 25);
  doc.text("Km 22.5 CAES Condominio Villa Capelo", xEmpresa, 30);
  doc.text("Frente a Plaza Madero, Fraijanes Guatemala", xEmpresa, 34);
  doc.text("Apartado Postal 01062", xEmpresa, 38);
  doc.text("www.zionak.com", xEmpresa, 42);
  doc.text("Telefono Planta: + 502 4654 7712", xEmpresa, 46);

  // --- 2. DATOS DEL CLIENTE ---
  doc.setTextColor(...colorNegro);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`COTIZACION NO ${datos.numeroCotizacion}`, margenIzq, 60);

  doc.setFontSize(9);
  let cursorY = 70;

  // Fila 1
  doc.setFont("helvetica", "bold");
  doc.text("Cliente:", margenIzq, cursorY);
  doc.setFont("helvetica", "normal");
  doc.text(datos.cliente, margenIzq + 20, cursorY);

  doc.setFont("helvetica", "bold");
  doc.text("Fecha:", 140, cursorY);
  doc.setFont("helvetica", "normal");
  doc.text(datos.fecha, 155, cursorY);

  // Fila 2
  cursorY += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Dirección:", margenIzq, cursorY);
  doc.setFont("helvetica", "normal");
  doc.text(datos.direccion, margenIzq + 20, cursorY);

  // Fila 3
  cursorY += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Forma de Pago:", margenIzq, cursorY);
  doc.setFont("helvetica", "normal");
  doc.text(datos.formaPago, margenIzq + 28, cursorY);

  // Fila 4
  cursorY += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Monto Letras:", margenIzq, cursorY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(datos.totalEnLetras, margenIzq + 28, cursorY);

  // --- 3. TABLA DE PRODUCTOS ---
  const cuerpoTabla = datos.productos.map(item => [
    item.nombre,
    item.cantidad,
    `Q ${Number(item.precio).toFixed(2)}`,
    `Q ${Number(item.subtotal).toFixed(2)}`,
    `Q ${Number(item.iva).toFixed(2)}`,
    `Q ${Number(item.total).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: cursorY + 10,
    head: [['Producto', 'Cantidad', 'Unitario Q', 'Sub Total Q', 'IVA Q', 'Total Q']],
    body: cuerpoTabla,
    theme: 'plain',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [200, 200, 200],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 60 },
      5: { fontStyle: 'bold' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // --- 4. PIE DE PÁGINA ---
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Quetzales:   Q ${datos.totalFinal}`, 110, finalY);

  const firmaY = finalY + 15;
  doc.setFontSize(9);
  doc.text("Angelica Maria Villanueva", margenIzq, firmaY);
  doc.setFont("helvetica", "normal");
  doc.text("Administradora General", margenIzq, firmaY + 5);
  doc.text("502 3030 1193", margenIzq, firmaY + 10);
  doc.text("mercadeo@zionak.com", margenIzq, firmaY + 15);

  doc.setFont("helvetica", "bold");
  doc.text("Puesto en:", 110, firmaY);
  doc.setFont("helvetica", "normal");
  doc.text("Bodega Cliente GT / 35 dias habiles", 110, firmaY + 5);

  doc.save(`Cotizacion_${datos.numeroCotizacion}.pdf`);
};