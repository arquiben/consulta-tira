
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { PatientData, AnalysisReport, Message, Protocol, FrequencyProtocol } from '../types';
import { useStore } from '../store/useStore';

export const generatePatientFolderZIP = async (patient: PatientData, messages: Message[], report?: AnalysisReport | null, image?: string | null) => {
  const zip = new JSZip();
  const folderName = `Paciente_${patient.name.replace(/\s+/g, '_')}`;
  const folder = zip.folder(folderName);

  if (!folder) return;

  // 1. Consulta Completa em PDF
  const pdfBlob = await generateConsultationPDF(patient, messages, report, image, true) as Blob;
  folder.file(`Consulta_${patient.name.replace(/\s+/g, '_')}.pdf`, pdfBlob);

  // 2. Consulta Completa em Word
  const wordBlob = await generateConsultationWord(patient, messages, report, true) as Blob;
  folder.file(`Consulta_${patient.name.replace(/\s+/g, '_')}.docx`, wordBlob);

  // 3. Receitas / Protocolos Individuais
  if (report?.suggestedProtocols) {
    const receitasFolder = folder.folder('Receitas_e_Protocolos');
    if (receitasFolder) {
      for (const protocol of report.suggestedProtocols) {
        const protocolBlob = await generatePrescriptionPDF(patient, protocol, true) as Blob;
        receitasFolder.file(`Receita_${protocol.title.replace(/\s+/g, '_')}.pdf`, protocolBlob);
      }
    }
  }

  // 4. Imagem do Exame (se houver)
  if (image) {
    try {
      const response = await fetch(image);
      const imageBlob = await response.blob();
      folder.file(`Exame_${patient.name.replace(/\s+/g, '_')}.jpg`, imageBlob);
    } catch (e) {
      console.error("Erro ao adicionar imagem ao ZIP", e);
    }
  }

  // Gerar e baixar o ZIP
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, `${folderName}.zip`);
};

export const generateConsultationPDF = async (patient: PatientData, messages: Message[], report?: AnalysisReport | null, image?: string | null, returnBlob: boolean = false) => {
  const { clinicSettings } = useStore.getState();
  const doctorName = clinicSettings.therapistName || 'Dr. Terapeuta';
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // Header
  doc.setFontSize(22);
  doc.setTextColor(5, 150, 105); // Emerald 600
  doc.text('CONSULFISION', pageWidth / 2, y, { align: 'center' });
  y += 10;
  
  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text('Inteligência Artificial em Terapias Holísticas', pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Patient Info
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('Ficha do Paciente', margin, y);
  y += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85); // Slate 700
  doc.text(`Nome: ${patient.name}`, margin, y);
  doc.text(`Idade: ${patient.age}`, pageWidth / 2, y);
  y += 6;
  doc.text(`Data: ${new Date().toLocaleDateString()}`, margin, y);
  doc.text(`ID: ${patient.id.split('-')[0]}`, pageWidth / 2, y);
  y += 15;

  // Image (if provided, e.g., for Iridology)
  if (image) {
    try {
      const imgWidth = 80;
      const imgHeight = 80;
      doc.addImage(image, 'JPEG', (pageWidth - imgWidth) / 2, y, imgWidth, imgHeight);
      y += imgHeight + 15;
    } catch (e) {
      console.error("Error adding image to PDF:", e);
    }
  }

  // Technical Report / Analysis
  if (report) {
    doc.setFontSize(14);
    doc.setTextColor(5, 150, 105);
    doc.text('Relatório Técnico & Diagnóstico', margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    const summaryLines = doc.splitTextToSize(report.summary, pageWidth - 2 * margin);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 5 + 5;

    // Diagnosed Pathologies
    if (report.diagnosedPathologies && report.diagnosedPathologies.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(185, 28, 28); // Red 700
      doc.text('Diagnósticos Patológicos:', margin, y);
      y += 7;
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const pathologyText = report.diagnosedPathologies.join(', ');
      const pathLines = doc.splitTextToSize(`⚠️ ${pathologyText}`, pageWidth - 2 * margin);
      doc.text(pathLines, margin, y);
      y += pathLines.length * 5 + 10;
      if (y > 270) { doc.addPage(); y = 20; }
    }

    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85);
    doc.text('Principais Achados:', margin, y);
    y += 7;
    report.findings.forEach(finding => {
      const lines = doc.splitTextToSize(`• ${finding}`, pageWidth - 2 * margin - 5);
      doc.text(lines, margin + 5, y);
      y += lines.length * 5 + 2;
      
      if (y > 270) { doc.addPage(); y = 20; }
    });
    y += 5;

    // Comparative Analysis
    if (report.comparisonWithPrevious) {
      doc.setFontSize(12);
      doc.setTextColor(5, 150, 105);
      doc.text('Análise de Evolução Clínica:', margin, y);
      y += 7;
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const compLines = doc.splitTextToSize(report.comparisonWithPrevious, pageWidth - 2 * margin);
      doc.text(compLines, margin, y);
      y += compLines.length * 5 + 10;
      if (y > 270) { doc.addPage(); y = 20; }
    }

    // Exam Results
    if (report.examResults && report.examResults.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(5, 150, 105);
      doc.text('Resultados de Exames:', margin, y);
      y += 7;
      
      autoTable(doc, {
        startY: y,
        head: [['Exame', 'Resultado', 'Data']],
        body: report.examResults.map(e => [e.examName, e.result, e.date]),
        margin: { left: margin },
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105] }
      });
      y = (doc as any).lastAutoTable.finalY + 10;
      if (y > 270) { doc.addPage(); y = 20; }
    }

    // Protocols
    doc.setFontSize(14);
    doc.setTextColor(5, 150, 105);
    doc.text('Protocolos e Receitas Sugeridas', margin, y);
    y += 10;

    report.suggestedProtocols.forEach(protocol => {
      if (y > 250) { doc.addPage(); y = 20; }
      
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(protocol.title, margin, y);
      y += 6;

      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const instLines = doc.splitTextToSize(protocol.instructions, pageWidth - 2 * margin);
      doc.text(instLines, margin, y);
      y += instLines.length * 5 + 5;

      if (protocol.prescriptions && protocol.prescriptions.length > 0) {
        doc.setFontSize(11);
        doc.text('Receituário:', margin, y);
        y += 5;
        
        autoTable(doc, {
          startY: y,
          head: [['Item', 'Quantidade', 'Dosagem', 'Duração']],
          body: protocol.prescriptions.map(p => [p.name, p.quantity, p.dosage, `${p.days} dias`]),
          margin: { left: margin },
          theme: 'striped',
          headStyles: { fillColor: [5, 150, 105] }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }
      
      if (y > 270) { doc.addPage(); y = 20; }
    });

    // Revaluation Info
    if (report.revaluationDate || report.revaluationNotes) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(14);
      doc.setTextColor(5, 150, 105);
      doc.text('Acompanhamento Clínico', margin, y);
      y += 10;

      if (report.revaluationDate) {
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(`Próxima Reavaliação: ${new Date(report.revaluationDate).toLocaleDateString()}`, margin, y);
        y += 7;
      }

      if (report.revaluationNotes) {
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        doc.text('Notas de Reavaliação:', margin, y);
        y += 5;
        const noteLines = doc.splitTextToSize(report.revaluationNotes, pageWidth - 2 * margin);
        doc.text(noteLines, margin, y);
        y += noteLines.length * 5 + 10;
      }
    }
  }

  // Chat History
  if (messages && messages.length > 0) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setTextColor(5, 150, 105);
    doc.text('Histórico da Consulta', margin, y);
    y += 10;

    messages.forEach(msg => {
      if (y > 270) { doc.addPage(); y = 20; }
      
      doc.setFontSize(9);
      if (msg.role === 'user') {
        doc.setTextColor(37, 99, 235);
      } else {
        doc.setTextColor(5, 150, 105);
      }
      doc.text(msg.role === 'user' ? 'PACIENTE:' : 'CONSULFISION:', margin, y);
      y += 5;
      
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const lines = doc.splitTextToSize(msg.content, pageWidth - 2 * margin);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 8;
    });
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Página ${i} de ${pageCount} - Documento gerado por Consulfision AI - Profissional: ${doctorName} - ${new Date().toLocaleString()}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  if (returnBlob) {
    return doc.output('blob');
  }

  doc.save(`Consulta_${patient.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateFrequencyPDF = async (patient: PatientData | null, protocol: FrequencyProtocol) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // Header
  doc.setFontSize(22);
  doc.setTextColor(16, 185, 129); // Emerald 500
  doc.text('NSOFISION FREQUENCY', pageWidth / 2, y, { align: 'center' });
  y += 10;
  
  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text('Protocolo de Bio-Ressonância Celular', pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Patient Info
  if (patient) {
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Informações do Paciente', margin, y);
    y += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(`Nome: ${patient.name}`, margin, y);
    doc.text(`Idade: ${patient.age}`, pageWidth / 2, y);
    y += 15;
  }

  // Protocol Info
  doc.setFontSize(16);
  doc.setTextColor(16, 185, 129);
  doc.text(protocol.name, margin, y);
  y += 10;

  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.text(`Data de Criação: ${new Date(protocol.createdAt).toLocaleDateString()}`, margin, y);
  y += 10;

  if (protocol.isMixture && protocol.mixtureFrequencies) {
    doc.setFontSize(14);
    doc.text('Composição da Mistura:', margin, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Frequência', 'Valor (Hz)', 'Tipo de Onda']],
      body: protocol.mixtureFrequencies.map(f => [f.name, `${f.frequency} Hz`, f.waveType]),
      margin: { left: margin },
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] }
    });
    y = (doc as any).lastAutoTable.finalY + 15;
  } else {
    doc.setFontSize(12);
    doc.text(`Frequência Base: ${protocol.frequency} Hz`, margin, y);
    y += 7;
    doc.text(`Tipo de Onda: ${protocol.waveType}`, margin, y);
    y += 15;
  }

  if (protocol.description) {
    doc.setFontSize(14);
    doc.text('Descrição Terapêutica:', margin, y);
    y += 8;
    doc.setFontSize(10);
    const descLines = doc.splitTextToSize(protocol.description, pageWidth - 2 * margin);
    doc.text(descLines, margin, y);
    y += descLines.length * 5 + 15;
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Documento gerado por NSOFISION AI - ${new Date().toLocaleString()}`,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' }
  );

  doc.save(`Protocolo_Frequencia_${protocol.name.replace(/\s+/g, '_')}.pdf`);
};

export const generatePrescriptionPDF = async (patient: PatientData, protocol: Protocol, returnBlob: boolean = false) => {
  const { clinicSettings } = useStore.getState();
  const doctorName = clinicSettings.therapistName || 'Dr. Terapeuta';
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // Header - Clinic Info
  doc.setFontSize(22);
  doc.setTextColor(225, 29, 72); // Rose 600
  doc.text('RECEITUÁRIO CLÍNICO', pageWidth / 2, y, { align: 'center' });
  y += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('CONSULFISION - Inteligência Artificial em Terapias Holísticas', pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Patient Info Box
  doc.setDrawColor(225, 29, 72);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, pageWidth - 2 * margin, 25);
  
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`PACIENTE: ${patient.name.toUpperCase()}`, margin + 5, y + 10);
  doc.text(`IDADE: ${patient.age}`, margin + 5, y + 18);
  doc.text(`DATA: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin - 40, y + 10);
  y += 35;

  // Prescription Title
  doc.setFontSize(14);
  doc.setTextColor(225, 29, 72);
  doc.text(protocol.title.toUpperCase(), margin, y);
  y += 10;

  // Instructions
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const instLines = doc.splitTextToSize(protocol.instructions, pageWidth - 2 * margin);
  doc.text(instLines, margin, y);
  y += instLines.length * 5 + 10;

  // Prescription Table
  if (protocol.prescriptions && protocol.prescriptions.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['MEDICAMENTO / SUPLEMENTO', 'QTD', 'POSOLOGIA', 'DURAÇÃO']],
      body: protocol.prescriptions.map(p => [p.name, p.quantity, p.dosage, `${p.days} dias`]),
      margin: { left: margin },
      theme: 'grid',
      headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 5 }
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  // Other items (Phytotherapeutics, etc)
  const otherItems = [
    { label: 'FITOTERÁPICOS:', items: protocol.suggestedPhytotherapeutics },
    { label: 'SUPLEMENTOS:', items: protocol.suggestedSupplements },
    { label: 'FARMACÊUTICOS:', items: protocol.suggestedPharmaceuticals }
  ];

  otherItems.forEach(group => {
    if (group.items && group.items.length > 0) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.setTextColor(225, 29, 72);
      doc.text(group.label, margin, y);
      y += 6;
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      const itemsText = group.items.join(', ');
      const lines = doc.splitTextToSize(itemsText, pageWidth - 2 * margin);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 10;
    }
  });

  // Signature Area
  if (y > 230) { doc.addPage(); y = 20; }
  y = doc.internal.pageSize.getHeight() - 60;
  doc.setDrawColor(100, 116, 139);
  doc.line(pageWidth / 2 - 40, y, pageWidth / 2 + 40, y);
  y += 5;
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(doctorName, pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.text('Assinatura do Profissional', pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Consulfision AI - CRM/CRP/CRN Digital Validation', pageWidth / 2, y, { align: 'center' });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Este documento tem validade clínica como sugestão terapêutica baseada em IA.`,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' }
  );

  if (returnBlob) {
    return doc.output('blob');
  }

  doc.save(`Receita_${patient.name.replace(/\s+/g, '_')}_${protocol.title.replace(/\s+/g, '_')}.pdf`);
};

export const generateFrequencyWord = async (patient: PatientData | null, protocol: FrequencyProtocol) => {
  const { clinicSettings } = useStore.getState();
  const doctorName = clinicSettings.therapistName || 'Dr. Terapeuta';
  const sections = [];

  sections.push(
    new Paragraph({
      text: "NSOFISION FREQUENCY",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: "Protocolo de Bio-Ressonância Celular",
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  if (patient) {
    sections.push(
      new Paragraph({
      children: [
        new TextRun({ text: "Profissional: ", bold: true }),
        new TextRun({ text: doctorName }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({ text: "Informações do Paciente", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({
        children: [
          new TextRun({ text: `Nome: ${patient.name}`, bold: true }),
          new TextRun({ text: `\tIdade: ${patient.age}`, bold: true }),
        ],
        spacing: { after: 400 },
      })
    );
  }

  sections.push(
    new Paragraph({ text: protocol.name, heading: HeadingLevel.HEADING_2 }),
    new Paragraph({ text: `Data de Criação: ${new Date(protocol.createdAt).toLocaleDateString()}`, spacing: { after: 200 } })
  );

  if (protocol.isMixture && protocol.mixtureFrequencies) {
    sections.push(new Paragraph({ text: "Composição da Mistura:", heading: HeadingLevel.HEADING_3 }));
    
    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Frequência", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Valor (Hz)", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tipo de Onda", bold: true })] })] }),
          ],
        }),
        ...protocol.mixtureFrequencies.map(f => new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(f.name)] }),
            new TableCell({ children: [new Paragraph(`${f.frequency} Hz`)] }),
            new TableCell({ children: [new Paragraph(f.waveType)] }),
          ],
        })),
      ],
    });
    sections.push(table, new Paragraph({ text: "", spacing: { after: 400 } }));
  } else {
    sections.push(
      new Paragraph({ children: [new TextRun({ text: `Frequência Base: ${protocol.frequency} Hz`, bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: `Tipo de Onda: ${protocol.waveType}`, bold: true })], spacing: { after: 400 } })
    );
  }

  if (protocol.description) {
    sections.push(
      new Paragraph({ text: "Descrição Terapêutica:", heading: HeadingLevel.HEADING_3 }),
      new Paragraph({ text: protocol.description, spacing: { after: 400 } })
    );
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: sections,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Protocolo_Frequencia_${protocol.name.replace(/\s+/g, '_')}.docx`);
};

export const generateConsultationWord = async (patient: PatientData, messages: Message[], report?: AnalysisReport | null, returnBlob: boolean = false) => {
  const { clinicSettings } = useStore.getState();
  const doctorName = clinicSettings.therapistName || 'Dr. Terapeuta';
  const sections = [];

  // Header
  sections.push(
    new Paragraph({
      text: "CONSULFISION",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: "Inteligência Artificial em Terapias Holísticas",
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Patient Info
  sections.push(
    new Paragraph({
      text: "Ficha do Paciente",
      heading: HeadingLevel.HEADING_2,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Nome: ${patient.name}`, bold: true }),
        new TextRun({ text: `\tIdade: ${patient.age}`, bold: true }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Data: ${new Date().toLocaleDateString()}` }),
        new TextRun({ text: `\tID: ${patient.id}` }),
      ],
      spacing: { after: 400 },
    })
  );

  // Technical Report
  if (report) {
    sections.push(
      new Paragraph({
        text: "Relatório Técnico & Diagnóstico",
        heading: HeadingLevel.HEADING_2,
      }),
      new Paragraph({
        text: report.summary,
        spacing: { after: 200 },
      }),
      // Diagnosed Pathologies
      ...(report.diagnosedPathologies && report.diagnosedPathologies.length > 0 ? [
        new Paragraph({
          text: "Diagnósticos Patológicos:",
          heading: HeadingLevel.HEADING_3,
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "⚠️ " + report.diagnosedPathologies.join(', '), color: "B91C1C", bold: true }),
          ],
          spacing: { after: 400 },
        })
      ] : []),
      new Paragraph({
        text: "Principais Achados:",
        heading: HeadingLevel.HEADING_3,
      }),
      ...report.findings.map(f => new Paragraph({ text: `• ${f}`, bullet: { level: 0 } })),
      new Paragraph({ text: "", spacing: { after: 400 } })
    );

    // Comparative Analysis
    if (report.comparisonWithPrevious) {
      sections.push(
        new Paragraph({ text: "Análise de Evolução Clínica:", heading: HeadingLevel.HEADING_3 }),
        new Paragraph({ text: report.comparisonWithPrevious, spacing: { after: 400 } })
      );
    }

    // Exam Results
    if (report.examResults && report.examResults.length > 0) {
      sections.push(new Paragraph({ text: "Resultados de Exames:", heading: HeadingLevel.HEADING_3 }));
      const examTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Exame", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Resultado", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Data", bold: true })] })] }),
            ],
          }),
          ...report.examResults.map(e => new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(e.examName)] }),
              new TableCell({ children: [new Paragraph(e.result)] }),
              new TableCell({ children: [new Paragraph(e.date)] }),
            ],
          })),
        ],
      });
      sections.push(examTable, new Paragraph({ text: "", spacing: { after: 400 } }));
    }

    // Protocols
    sections.push(
      new Paragraph({
        text: "Protocolos e Receitas Sugeridas",
        heading: HeadingLevel.HEADING_2,
      })
    );

    report.suggestedProtocols.forEach(protocol => {
      sections.push(
        new Paragraph({
          text: protocol.title,
          heading: HeadingLevel.HEADING_3,
        }),
        new Paragraph({
          text: protocol.instructions,
          spacing: { after: 200 },
        })
      );

      if (protocol.prescriptions && protocol.prescriptions.length > 0) {
        sections.push(new Paragraph({ children: [new TextRun({ text: "Receituário:", bold: true })] }));
        
        const table = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Item", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Quantidade", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Dosagem", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Duração", bold: true })] })] }),
              ],
            }),
            ...protocol.prescriptions.map(p => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(p.name)] }),
                new TableCell({ children: [new Paragraph(p.quantity)] }),
                new TableCell({ children: [new Paragraph(p.dosage)] }),
                new TableCell({ children: [new Paragraph(`${p.days} dias`)] }),
              ],
            })),
          ],
        });
        sections.push(table, new Paragraph({ text: "", spacing: { after: 200 } }));
      }
    });

    // Revaluation Info
    if (report.revaluationDate || report.revaluationNotes) {
      sections.push(
        new Paragraph({ text: "Acompanhamento Clínico", heading: HeadingLevel.HEADING_2, spacing: { before: 400 } })
      );

      if (report.revaluationDate) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Próxima Reavaliação: ", bold: true }),
              new TextRun({ text: new Date(report.revaluationDate).toLocaleDateString() }),
            ],
            spacing: { after: 200 },
          })
        );
      }

      if (report.revaluationNotes) {
        sections.push(
          new Paragraph({ text: "Notas de Reavaliação:", heading: HeadingLevel.HEADING_3 }),
          new Paragraph({ text: report.revaluationNotes, spacing: { after: 400 } })
        );
      }
    }
  }

  // Chat History
  if (messages.length > 0) {
    sections.push(
      new Paragraph({
        text: "Histórico da Consulta",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400 },
      }),
      ...messages.map(msg => new Paragraph({
        children: [
          new TextRun({ 
            text: msg.role === 'user' ? "PACIENTE: " : "CONSULFISION: ", 
            bold: true,
            color: msg.role === 'user' ? "2563EB" : "059669"
          }),
          new TextRun(msg.content),
        ],
        spacing: { after: 200 },
      }))
    );
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: sections,
    }],
  });

  const blob = await Packer.toBlob(doc);
  if (returnBlob) return blob;
  saveAs(blob, `Consulta_${patient.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`);
};

export const generateBioScanPDF = async (scanResult: any, image?: string | null) => {
  const { clinicSettings } = useStore.getState();
  const investigatorName = "Quissambi Benvindo";
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // Header
  doc.setFontSize(22);
  doc.setTextColor(16, 185, 129); // Emerald 500
  doc.text('BIOSCAN PRO', pageWidth / 2, y, { align: 'center' });
  y += 10;
  
  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text('Relatório Botânico IA & Catalogação Biológica', pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Split layout: Image on left/right or top
  if (image) {
    try {
      const imgWidth = 60;
      const imgHeight = 60;
      doc.addImage(image, 'JPEG', pageWidth - margin - imgWidth, y, imgWidth, imgHeight);
      
      const textAreaWidth = pageWidth - 2 * margin - imgWidth - 10;
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text(scanResult.scientificName, margin, y + 10);
      y += 18;

      doc.setFontSize(12);
      doc.setTextColor(51, 65, 85);
      doc.text(`Nomes Populares: ${scanResult.popularNames.join(', ')}`, margin, y);
      y += 7;

      doc.setFontSize(10);
      if (scanResult.isCataloged) {
        doc.setTextColor(16, 185, 129);
      } else {
        doc.setTextColor(239, 68, 68);
      }
      doc.text(scanResult.isCataloged ? '✓ CATALOGADA (IPNI/Index Fungorum)' : '⚠ STATUS: NOVA DESCOBERTA', margin, y);
      y += 20;

      if (y < 20 + 60) y = 20 + 60 + 10; // Ensure y is below image if it was taller
    } catch (e) {
      console.error(e);
    }
  } else {
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(scanResult.scientificName, margin, y);
    y += 10;
  }

  // Morphological Analysis
  doc.setFontSize(14);
  doc.setTextColor(16, 185, 129);
  doc.text('ANÁLISE MORFOLÓGICA', margin, y);
  y += 10;

  const morphologyKeys = [
    { key: 'roots', label: 'RAÍZES' },
    { key: 'stems', label: 'CAULES/CASCAS' },
    { key: 'leaves', label: 'FOLHAS' },
    { key: 'flowers', label: 'FLORES' },
    { key: 'fruits', label: 'FRUTOS' },
    { key: 'seeds', label: 'SEMENTES' }
  ];

  morphologyKeys.forEach(m => {
    const data = scanResult.morphology[m.key];
    if (data && data.properties) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(m.label, margin, y);
      y += 6;
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const lines = doc.splitTextToSize(`Propriedades: ${data.properties}`, pageWidth - 2 * margin);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 2;

      if (data.chemicalFormulas && data.chemicalFormulas.length > 0) {
        doc.text(`Fórmulas Químicas: ${data.chemicalFormulas.join(', ')}`, margin, y);
        y += 7;
      }
      y += 3;
    }
  });

  // Pharmacopoeia
  if (y > 230) { doc.addPage(); y = 20; }
  doc.setFontSize(14);
  doc.setTextColor(16, 185, 129);
  doc.text('FARMACOPEIA & PREPARO', margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`Modo de Preparo: ${scanResult.pharmacopoeia.method}`, margin, y);
  y += 6;
  const pLines = doc.splitTextToSize(scanResult.pharmacopoeia.instructions, pageWidth - 2 * margin);
  doc.text(pLines, margin, y);
  y += pLines.length * 5 + 6;
  doc.text(`Dosagem: ${scanResult.pharmacopoeia.dosagePerWeight}`, margin, y);
  y += 6;
  doc.text(`Frequência: ${scanResult.pharmacopoeia.frequency}`, margin, y);
  y += 15;

  // Synergy & Geolocation
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setTextColor(16, 185, 129);
  doc.text('INTERAÇÃO & SINERGIA', margin, y);
  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const sLines = doc.splitTextToSize(scanResult.synergy, pageWidth - 2 * margin);
  doc.text(sLines, margin, y);
  y += sLines.length * 5 + 10;

  doc.setFontSize(12);
  doc.setTextColor(16, 185, 129);
  doc.text('GEOLOCALIZAÇÃO', margin, y);
  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`País: ${scanResult.geolocation.country}`, margin, y);
  y += 6;
  doc.text(`Região: ${scanResult.geolocation.region}`, margin, y);
  y += 6;
  doc.text(`Localidade: ${scanResult.geolocation.locality}`, margin, y);
  y += 20;

  // Signature
  if (y > 250) { doc.addPage(); y = 20; }
  y = doc.internal.pageSize.getHeight() - 40;
  doc.setDrawColor(16, 185, 129);
  doc.line(pageWidth / 2 - 40, y, pageWidth / 2 + 40, y);
  y += 7;
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(investigatorName, pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Investigador BioScan Pro', pageWidth / 2, y, { align: 'center' });

  doc.save(`BioScan_${scanResult.scientificName.replace(/\s+/g, '_')}.pdf`);
};
