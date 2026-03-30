
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { PatientData } from '../types';

export const generateExamPDF = (patient: PatientData, exams: string[]) => {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString('pt-BR');

  // Header
  doc.setFontSize(22);
  doc.setTextColor(16, 185, 129); // Emerald-600
  doc.text('CONSULFISION NSO', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('REQUISIÇÃO DE EXAMES LABORATORIAIS E DE IMAGEM', 105, 28, { align: 'center' });

  // Patient Info Box
  doc.setDrawColor(230);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 35, 182, 30, 3, 3, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(50);
  doc.setFont('helvetica', 'bold');
  doc.text('PACIENTE:', 20, 45);
  doc.setFont('helvetica', 'normal');
  doc.text(patient.name.toUpperCase(), 45, 45);

  doc.setFont('helvetica', 'bold');
  doc.text('IDADE:', 20, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(`${patient.age} anos`, 45, 52);

  doc.setFont('helvetica', 'bold');
  doc.text('DATA:', 140, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(date, 155, 52);

  doc.setFont('helvetica', 'bold');
  doc.text('QUEIXA PRINCIPAL:', 20, 59);
  doc.setFont('helvetica', 'normal');
  doc.text(patient.complaints || 'Não informada', 55, 59, { maxWidth: 130 });

  // Exams List
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text('EXAMES SOLICITADOS:', 14, 75);

  const tableData = exams.map((exam, index) => [index + 1, exam]);

  autoTable(doc, {
    startY: 80,
    head: [['#', 'Descrição do Exame']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 5 },
    columnStyles: { 0: { cellWidth: 15 } }
  });

  // Footer / Signature
  const finalY = (doc as any).lastAutoTable.finalY + 30;
  
  doc.setDrawColor(200);
  doc.line(60, finalY, 150, finalY);
  doc.setFontSize(10);
  doc.text('Assinatura e Carimbo do Profissional', 105, finalY + 5, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Documento gerado eletronicamente via Plataforma Consulfision NSO', 105, 285, { align: 'center' });

  doc.save(`Requisicao_Exames_${patient.name.replace(/\s+/g, '_')}.pdf`);
};

export const generateExamWord = async (patient: PatientData, exams: string[]) => {
  const date = new Date().toLocaleDateString('pt-BR');

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "CONSULFISION NSO",
              bold: true,
              size: 32,
              color: "10b981",
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "REQUISIÇÃO DE EXAMES",
              bold: true,
              size: 20,
              color: "64748b",
            }),
          ],
        }),
        new Paragraph({ text: "", spacing: { before: 400 } }),
        
        // Patient Info
        new Paragraph({
          children: [
            new TextRun({ text: "PACIENTE: ", bold: true }),
            new TextRun({ text: patient.name.toUpperCase() }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "IDADE: ", bold: true }),
            new TextRun({ text: `${patient.age} anos` }),
            new TextRun({ text: "\t\t\t\t\tDATA: ", bold: true }),
            new TextRun({ text: date }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "QUEIXA PRINCIPAL: ", bold: true }),
            new TextRun({ text: patient.complaints || "Não informada" }),
          ],
        }),
        
        new Paragraph({ text: "", spacing: { before: 400 } }),
        new Paragraph({
          children: [
            new TextRun({ text: "EXAMES SOLICITADOS:", bold: true, size: 24, color: "10b981" }),
          ],
        }),
        new Paragraph({ text: "", spacing: { before: 200 } }),

        // Exams Table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ 
                  children: [new Paragraph({ children: [new TextRun({ text: "#", bold: true, color: "ffffff" })] })],
                  shading: { fill: "10b981" }
                }),
                new TableCell({ 
                  children: [new Paragraph({ children: [new TextRun({ text: "Descrição do Exame", bold: true, color: "ffffff" })] })],
                  shading: { fill: "10b981" }
                }),
              ],
            }),
            ...exams.map((exam, index) => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: (index + 1).toString() })] }),
                new TableCell({ children: [new Paragraph({ text: exam })] }),
              ],
            })),
          ],
        }),

        new Paragraph({ text: "", spacing: { before: 1200 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "_______________________________________" }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Assinatura e Carimbo do Profissional", size: 18 }),
          ],
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Requisicao_Exames_${patient.name.replace(/\s+/g, '_')}.docx`);
};
