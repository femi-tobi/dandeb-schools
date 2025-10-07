import express from 'express';
import { openDb } from '../db.js';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

router.get('/:student_id/result', async (req, res) => {
  const { student_id } = req.params;
  const { term, session } = req.query;
  const db = await openDb();
  const results = await db.all(
    'SELECT * FROM results WHERE student_id = ? AND term = ? AND session = ? AND approved = 1',
    [student_id, term, session]
  );
  res.json(results);
});

router.get('/:student_id/result/pdf', async (req, res) => {
  const { student_id } = req.params;
  const { term, session } = req.query;
  const db = await openDb();
  const results = await db.all(
    'SELECT * FROM results WHERE student_id = ? AND term = ? AND session = ?',
    [student_id, term, session]
  );
  const student = await db.get('SELECT * FROM students WHERE student_id = ?', [student_id]);

  // School logo path (user provided)
  const logoPath = path.join(__dirname, 'images.jpg');

  // Generate PDF
  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);

  // Add watermark logo before any other drawing
  doc.save();
  doc.opacity(0.10); // Set low opacity for watermark
  const watermarkWidth = 300; // Adjust as needed
  const watermarkHeight = 300; // Adjust as needed
  const centerX = (doc.page.width - watermarkWidth) / 2;
  const centerY = (doc.page.height - watermarkHeight) / 2;
  doc.image(logoPath, centerX, centerY, { width: watermarkWidth, height: watermarkHeight });
  doc.opacity(1); // Reset opacity for normal drawing
  doc.restore();

  // Set up border margin and usable width
  const borderMargin = 20;
  const pageWidth = doc.page.width;
  const usableWidth = pageWidth - 2 * borderMargin;

  // HEADER SECTION
  const logoWidth = 40;
  const logoHeight = 40;
  const logoY = borderMargin + 5;
  try { doc.image(logoPath, borderMargin, logoY, { width: logoWidth }); } catch {}

  // Calculate y-position for header text so it doesn't overlap the logo
  const headerTextY = logoY + 1;
  doc.fontSize(20).font('Helvetica-Bold').text("DANDEB HIGH SCHOOL.", borderMargin, headerTextY, { align: 'center', width: usableWidth });  
  doc.fontSize(9).font('Helvetica').text('(THE SEAT OF GOD)', borderMargin, headerTextY + 19, { align: 'center', width: usableWidth });
  doc.fontSize(9).font('Helvetica').text('59, BAYO OLUFEMI STREET, HERITAGE ESTATE, ABORU, IYANA-IPAJA, LAGOS STATE', borderMargin, headerTextY + 28, { align: 'center', width: usableWidth });
  doc.text('Web: www.dandebschools.com  Email: dandebhighschool@gmail.com  Tel.: 08150749181, 07082998471', borderMargin, headerTextY + 40, { align: 'center', width: usableWidth });
  doc.fontSize(13).font('Helvetica-Bold').text('END OF FIRST TERM E-DOSSIER SLIP FOR 2024/2025 ACADEMIC SESSION', borderMargin, headerTextY + 55, { align: 'center', width: usableWidth });
  doc.moveTo(borderMargin, headerTextY + 75).lineTo(pageWidth - borderMargin, headerTextY + 75).stroke();

  // Adjust y for student info section
  let y = headerTextY + 80;

  // STUDENT INFO SECTION
  // Row 1: Name, Sex, Age, Passport
  doc.fontSize(11).font('Helvetica-Bold');
  doc.rect(borderMargin, y, usableWidth, 20).stroke();
  doc.text('NAME:', borderMargin + 5, y + 5, { continued: true }).font('Helvetica').text(student.fullname, { continued: true });
  doc.font('Helvetica-Bold').text('   SEX:', { continued: true }).font('Helvetica').text('Female', { continued: true }); // Placeholder
  doc.font('Helvetica-Bold').text('   AGE:', { continued: true }).font('Helvetica').text('11years', { continued: true }); // Placeholder
  // Remove the rectangle for the passport
  // const passportBoxX = borderMargin + usableWidth - 80 - 50;
  // const passportBoxY = y + 2;
  // doc.rect(passportBoxX, passportBoxY, 40, 50).stroke();
  const passportBoxX = borderMargin + usableWidth - 80 - 50;
  const passportBoxY = y + 2;
  doc.font('Helvetica-Bold').fontSize(9).text('PASSPORT', passportBoxX, passportBoxY + 52, { width: 40, align: 'center' });
  // If student.photo exists, draw image inside box
  if (student.photo) {
    try {
      doc.image(student.photo, passportBoxX + 2, passportBoxY + 2, { width: 36, height: 46 });
    } catch {}
  }
  // Row 2: Class, Term, Session
  y += 20;
  doc.font('Helvetica-Bold').rect(borderMargin, y, usableWidth, 20).stroke();
  doc.text('CLASS:', borderMargin + 5, y + 5, { continued: true }).font('Helvetica').text(student.class, { continued: true });
  doc.font('Helvetica-Bold').text('   TERM:', { continued: true }).font('Helvetica').text(term, { continued: true });
  doc.font('Helvetica-Bold').text('   SESSION:', { continued: true }).font('Helvetica').text(session);
  // Build maps for previous terms per subject to fill summary columns
  const termOrder = ['1st Term', '2nd Term', '3rd Term'];
  const currentTermIndex = termOrder.indexOf(term);
  let prev1Map = {}; // First term totals per subject
  let prev2Map = {}; // Second term totals per subject
  try {
    if (currentTermIndex > 0) {
      const firstTermResults = await db.all(
        'SELECT subject, ca1, ca2, ca3, score FROM results WHERE student_id = ? AND term = ? AND session = ?',
        [student_id, '1st Term', session]
      );
      prev1Map = firstTermResults.reduce((acc, r) => {
        const total = (Number(r.ca1) || 0) + (Number(r.ca2) || 0) + (Number(r.ca3) || 0) + (Number(r.score) || 0);
        acc[r.subject] = total;
        return acc;
      }, {});
    }
    if (currentTermIndex > 1) {
      const secondTermResults = await db.all(
        'SELECT subject, ca1, ca2, ca3, score FROM results WHERE student_id = ? AND term = ? AND session = ?',
        [student_id, '2nd Term', session]
      );
      prev2Map = secondTermResults.reduce((acc, r) => {
        const total = (Number(r.ca1) || 0) + (Number(r.ca2) || 0) + (Number(r.ca3) || 0) + (Number(r.score) || 0);
        acc[r.subject] = total;
        return acc;
      }, {});
    }
  } catch {}

  // Calculate grand total and term average ONCE for use throughout the PDF
  const grandTotal = results.reduce((sum, r) => {
    const ca1 = Number(r.ca1) || 0;
    const ca2 = Number(r.ca2) || 0;
    const ca3 = Number(r.ca3) || 0;
    const exam = Number(r.score) || 0;
    return sum + ca1 + ca2 + ca3 + exam;
  }, 0);
  const termAverage = results.length ? (grandTotal / results.length).toFixed(2) : '0.00';
  // Calculate real-time cumulative grade based on gradingKey
  function getCumulativeGrade(average) {
    const avg = Number(average);
    if (avg >= 75) return 'A1 (Excellent)';
    if (avg >= 70) return 'B2 (Very Good)';
    if (avg >= 65) return 'B3 (Good)';
    if (avg >= 60) return 'C6 (Credit)';
    if (avg >= 55) return 'D7 (Pass)';
    if (avg >= 50) return 'E8 (Fair)';
    return 'F9 (Fail)';
  }
  const cumulativeGrade = getCumulativeGrade(termAverage);
  // Calculate class average for the class, term, and session
  let classAverage = '0.00';
  let highestClassAvg = '0.00';
  let lowestClassAvg = '0.00';
  try {
    const classResults = await db.all(
      'SELECT student_id FROM students WHERE class = ?', [student.class]
    );
    let sumOfAverages = 0;
    let studentCount = 0;
    let studentAverages = [];
    for (const s of classResults) {
      const sResults = await db.all(
        'SELECT * FROM results WHERE student_id = ? AND term = ? AND session = ?',
        [s.student_id, term, session]
      );
      if (sResults.length > 0) {
        const sGrandTotal = sResults.reduce((sum, r) => {
          const ca1 = Number(r.ca1) || 0;
          const ca2 = Number(r.ca2) || 0;
          const ca3 = Number(r.ca3) || 0;
          const exam = Number(r.score) || 0;
          return sum + ca1 + ca2 + ca3 + exam;
        }, 0);
        const sAverage = sResults.length ? (sGrandTotal / sResults.length) : 0;
        sumOfAverages += sAverage;
        studentAverages.push(sAverage);
        studentCount++;
      }
    }
    if (studentCount > 0) {
      classAverage = (sumOfAverages / studentCount).toFixed(2);
      highestClassAvg = Math.max(...studentAverages).toFixed(2);
      lowestClassAvg = Math.min(...studentAverages).toFixed(2);
    }
  } catch (e) {
    classAverage = '0.00';
    highestClassAvg = '0.00';
    lowestClassAvg = '0.00';
  }
  // Row 3: Summary stats
  y += 20;
  doc.font('Helvetica-Bold').rect(borderMargin, y, usableWidth, 20).stroke();
  doc.text("TERM'S AVERAGE:", borderMargin + 5, y + 5, { continued: true }).font('Helvetica').text(termAverage, { continued: true });
  doc.font('Helvetica-Bold').text('   CUMULATIVE GRADE:', { continued: true }).font('Helvetica').text(cumulativeGrade, { continued: true });
  doc.font('Helvetica-Bold').text('   HIGHEST CLASS AVG:', { continued: true }).font('Helvetica').text(highestClassAvg, { continued: true });
  doc.font('Helvetica-Bold').text('   LOWEST CLASS AVG:', { continued: true }).font('Helvetica').text(lowestClassAvg, { continued: true });
  doc.font('Helvetica-Bold').text('   CLASS AVG:', { continued: true }).font('Helvetica').text(classAverage, { continued: true });
  doc.font('Helvetica-Bold').text('   SESSION:', { continued: true }).font('Helvetica').text('2024/2025');
  // Move doc.y to below info section
  doc.y = y + 30;

  // Insert additional section image (Regularity, Conduct, Physical Development)
  const extraSectionPath = path.join(__dirname, 'report_extra_section.jpg');
  try {
    doc.image(extraSectionPath, borderMargin, doc.y + 10, { width: usableWidth });
    doc.y = doc.y + 10 + (usableWidth * 0.5); // approximate advance; image height depends on aspect ratio
  } catch {}

// === MAIN RESULT TABLE ===
const margin = borderMargin;
const colWidths = [
  60, // SUBJECTS
  35, // CA1
  35, // CA2
  35, // CA3
  35, // CA Total
  35, // Exam
  35, // Total
  35, // Grade
  45, // Remark
  60, // Prev Term 1
  50, // Prev Term 2
  60  // Cumulative
];
const colX = [margin];
for (let i = 0; i < colWidths.length; i++) {
  colX.push(colX[i] + colWidths[i]);
}
const rowHeight = 20; // Normal row height for data rows
const headerRowHeight = 44; // Taller header row
const tableStartY = doc.y + 10;
const numRows = results.length;
const dataStartY = tableStartY + headerRowHeight * 2;

// Draw only the outer border for the first header row
// Top border
doc.moveTo(colX[0], tableStartY).lineTo(colX[colX.length - 1], tableStartY).stroke();
// Bottom border of first header row
const firstHeaderBottomY = tableStartY + headerRowHeight;
doc.moveTo(colX[0], firstHeaderBottomY).lineTo(colX[colX.length - 1], firstHeaderBottomY).stroke();
// Left and right borders
doc.moveTo(colX[0], tableStartY).lineTo(colX[0], firstHeaderBottomY).stroke();
doc.moveTo(colX[colX.length - 1], tableStartY).lineTo(colX[colX.length - 1], firstHeaderBottomY).stroke();

// Draw vertical column lines from the second header row downward
for (let i = 0; i < colX.length; i++) {
  doc.moveTo(colX[i], firstHeaderBottomY).lineTo(colX[i], tableStartY + headerRowHeight * 2 + rowHeight * numRows).stroke();
}
// Draw horizontal lines for the second header row and data rows
for (let r = 1; r <= 2; r++) {
  doc.moveTo(colX[0], tableStartY + r * headerRowHeight).lineTo(colX[colX.length - 1], tableStartY + r * headerRowHeight).stroke();
}
// Draw the first data row horizontal line only from colX[1] to the end
doc.moveTo(colX[1], dataStartY).lineTo(colX[colX.length - 1], dataStartY).stroke();
// Draw the rest of the data row horizontal lines as usual
for (let r = 1; r <= numRows; r++) {
  doc.moveTo(colX[0], dataStartY + r * rowHeight).lineTo(colX[colX.length - 1], dataStartY + r * rowHeight).stroke();
}
// Draw a less bold vertical line before the previous terms summaries (at colX[9])
doc.save();
doc.lineWidth(1.2);
doc.moveTo(colX[9], tableStartY).lineTo(colX[9], tableStartY + headerRowHeight * 2 + rowHeight * numRows).stroke();
doc.restore();
// Draw a less bold vertical line before the TOTAL MARK OBTAINED (Exams & CA) OVER 100% column (at colX[6])
doc.save();
doc.lineWidth(1.2);
doc.moveTo(colX[6], tableStartY).lineTo(colX[6], tableStartY + headerRowHeight * 2 + rowHeight * numRows).stroke();
doc.restore();
// Draw a less bold vertical line at the start of the CA columns (at colX[1])
doc.save();
doc.lineWidth(1.2);
doc.moveTo(colX[1], tableStartY).lineTo(colX[1], tableStartY + headerRowHeight * 2 + rowHeight * numRows).stroke();
doc.restore();
// Draw a less bold vertical line at the end of the CA columns (at colX[5])
doc.save();
doc.lineWidth(1.2);
doc.moveTo(colX[5], tableStartY).lineTo(colX[5], tableStartY + headerRowHeight * 2 + rowHeight * numRows).stroke();
doc.restore();

// Vertical 'SUBJECTS' header (centered in header area)
doc.save();
doc.font('Helvetica-Bold').fontSize(11);
doc.rotate(-90, { origin: [colX[0] + colWidths[0] / 2, tableStartY + headerRowHeight + 10] });
doc.text('SUBJECTS', colX[0] + colWidths[0] / 4, tableStartY + headerRowHeight + 10, { align: 'center', width: colWidths[0] });
doc.restore();

// Grouped headers (centered in header area)
const groupHeaderY = tableStartY + headerRowHeight / 4; // Centered vertically in first header row
doc.font('Helvetica-Bold').fontSize(9);
doc.text('SUMMARY OF CONTINUOUS ASSESSMENT TEST', colX[1], groupHeaderY, { width: colX[5] - colX[1], align: 'center' });
doc.text('SUMMARY OF TERMS WORK', colX[6], groupHeaderY, { width: colX[9] - colX[6], align: 'center' });
doc.text('PREVIOUS TERMS SUMMARIES', colX[9], groupHeaderY, { width: colX[12] - colX[9], align: 'center' });

// Second header row for CA columns and PREVIOUS TERMS SUMMARIES
const caHeaderY = tableStartY + headerRowHeight + headerRowHeight / 4; // Centered vertically in second header row
doc.font('Helvetica-Bold').fontSize(8);
doc.text('1ST C.A.', colX[1], caHeaderY, { width: colX[2] - colX[1], align: 'center' });
doc.font('Helvetica').fontSize(7);
doc.text('Obtainable = 20%', colX[1], caHeaderY + 10, { width: colX[2] - colX[1], align: 'center' });
doc.font('Helvetica-Bold').fontSize(8);
doc.text('2ND C.A.', colX[2], caHeaderY, { width: colX[3] - colX[2], align: 'center' });
doc.font('Helvetica').fontSize(7);
doc.text('Obtainable = 10%', colX[2], caHeaderY + 10, { width: colX[3] - colX[2], align: 'center' });
doc.font('Helvetica-Bold').fontSize(8);
doc.text('3RD C.A.', colX[3], caHeaderY, { width: colX[4] - colX[3], align: 'center' });
doc.font('Helvetica').fontSize(7);
doc.text('Obtainable = 10%', colX[3], caHeaderY + 10, { width: colX[4] - colX[3], align: 'center' });
doc.font('Helvetica-Bold').fontSize(8);
doc.text('TOTAL', colX[4], caHeaderY, { width: colX[5] - colX[4], align: 'center' });
doc.font('Helvetica').fontSize(7);
doc.text('first, second & third', colX[4], caHeaderY + 10, { width: colX[5] - colX[4], align: 'center' });
doc.font('Helvetica-Bold').fontSize(8);
doc.text('FIRST TERM SUMMARY', colX[9], caHeaderY, { width: colX[10] - colX[9], align: 'center' });
doc.text('SECOND TERM SUMMARY', colX[10], caHeaderY, { width: colX[11] - colX[10], align: 'center' });
doc.text('CUMULATIVE AVERAGE', colX[11], caHeaderY, { width: colX[12] - colX[11], align: 'center' });
// Exams summary, TOTAL MARK, GRADE SCORE, GRADE REMARKS (already in second row)
doc.font('Helvetica-Bold').fontSize(8);
doc.text('100%', colX[6], caHeaderY, { width: colX[7] - colX[6], align: 'center' });
doc.text('GRADE SCORE', colX[7], caHeaderY, { width: colX[8] - colX[7], align: 'center' });
doc.text('GRADE REMARKS', colX[8], caHeaderY, { width: colX[9] - colX[8], align: 'center' });
// Vertical headers for 'PREVIOUS TERMS SUMMARIES'
  // Fill in subject rows
  let rowY = dataStartY; // Start from the first data row
  doc.font('Helvetica').fontSize(9);
  results.forEach((r, idx) => {
    doc.text(r.subject, colX[0], rowY + 5, { width: colX[1] - colX[0], align: 'center' });
    // Fill CA1, CA2, CA3, Total, Exam, Total, Grade, Remark (dynamic)
    doc.text(r.ca1 ?? '', colX[1], rowY + 5, { width: colX[2] - colX[1], align: 'center' });
    doc.text(r.ca2 ?? '', colX[2], rowY + 5, { width: colX[3] - colX[2], align: 'center' });
    doc.text(r.ca3 ?? '', colX[3], rowY + 5, { width: colX[4] - colX[3], align: 'center' });
    const caTotal = (Number(r.ca1) || 0) + (Number(r.ca2) || 0) + (Number(r.ca3) || 0);
    doc.text(caTotal, colX[4], rowY + 5, { width: colX[5] - colX[4], align: 'center' });
    doc.text(r.score ?? '', colX[5], rowY + 5, { width: colX[6] - colX[5], align: 'center' });
    const total = caTotal + (Number(r.score) || 0);
    doc.text(total, colX[6], rowY + 5, { width: colX[7] - colX[6], align: 'center' });
    doc.text(r.grade ?? '', colX[7], rowY + 5, { width: colX[8] - colX[7], align: 'center' });
    doc.text(r.remark ?? '', colX[8], rowY + 5, { width: colX[9] - colX[8], align: 'center' });

    // Previous term summaries per subject
    const firstTermTotal = prev1Map[r.subject];
    const secondTermTotal = prev2Map[r.subject];
    // First term column: only show when current term >= 2nd
    if (currentTermIndex >= 1 && firstTermTotal !== undefined) {
      doc.text(String(firstTermTotal), colX[9], rowY + 5, { width: colX[10] - colX[9], align: 'center' });
    }
    // Second term column: only show when current term is 3rd
    if (currentTermIndex >= 2 && secondTermTotal !== undefined) {
      doc.text(String(secondTermTotal), colX[10], rowY + 5, { width: colX[11] - colX[10], align: 'center' });
    }
    // Cumulative average column: average of available term totals up to current term
    let cumulativeTerms = [];
    if (currentTermIndex === 0) {
      cumulativeTerms = []; // leave blank for first term as requested focus is for 2nd/3rd
    } else if (currentTermIndex === 1) {
      if (firstTermTotal !== undefined) cumulativeTerms.push(firstTermTotal);
      cumulativeTerms.push(total);
    } else if (currentTermIndex === 2) {
      if (firstTermTotal !== undefined) cumulativeTerms.push(firstTermTotal);
      if (secondTermTotal !== undefined) cumulativeTerms.push(secondTermTotal);
      cumulativeTerms.push(total);
    }
    if (cumulativeTerms.length > 0) {
      const cumAvg = Math.round((cumulativeTerms.reduce((a, b) => a + b, 0) / cumulativeTerms.length));
      doc.text(String(cumAvg), colX[11], rowY + 5, { width: colX[12] - colX[11], align: 'center' });
    }
    rowY += rowHeight;
  });
  // Draw 'Previous Terms Summaries' table to the right
  const prevX = colX[9];
  const prevY = dataStartY; // Start from the first data row
  // Draw grid for previous terms
  for (let r = 0; r < 3; r++) {
    doc.moveTo(prevX, prevY + r * rowHeight).lineTo(colX[11], prevY + r * rowHeight).stroke();
    doc.moveTo(prevX, prevY + (r + 1) * rowHeight).lineTo(colX[11], prevY + (r + 1) * rowHeight).stroke();
  }
  for (let i = 9; i <= 11; i++) {
    doc.moveTo(colX[i], prevY).lineTo(colX[i], prevY + rowHeight * 3).stroke();
  }

  // === GRAND TOTAL ROW ===
  const grandTotalY = rowY + 10;
  doc.font('Helvetica-Bold').fontSize(14);
  doc.rect(colX[0], grandTotalY, colX[9] - colX[0], 30).stroke();
  doc.text('Grand Total=', colX[0] + 10, grandTotalY + 7, { continued: true });
  doc.font('Helvetica-Bold').fillColor('black').text(` ${grandTotal}`, { align: 'center' });
  doc.font('Helvetica').fillColor('black');

  // === PROMOTIONAL STATUS & REMARKS SECTION ===
  let remarksY = grandTotalY + 40;
  const remarksWidth = usableWidth - 160 - colX[0]; // 180 = grading table width + margin
  const remarksYStart = grandTotalY + 0;

// Promotional Status
doc.font('Helvetica-Bold').rect(colX[0], remarksY, remarksWidth, 20).stroke();
doc.fontSize(10).text('Promotional Status:', colX[0] + 5, remarksY + 5, { continued: true })
   .font('Helvetica').text('Passed');

// Class Teacher's Remark
remarksY += 20;
const classRemark = "OLUMATOVIN you have a very good result, you have really done well. Please brace up more for a richer performance next term. See you at the top.";
doc.font('Helvetica-Bold').fontSize(9).text("Class Teacher's Remark:", colX[0] + 5, remarksY + 7);

const remarkX = colX[0] + 140;
const remarkY = remarksY + 7;
const remarkWidth = remarksWidth - 145;
doc.font('Helvetica').fontSize(9);
const classRemarkHeight = doc.heightOfString(classRemark, { width: remarkWidth, align: 'left' });
const boxHeight = Math.max(30, classRemarkHeight + 14); // 14 for padding
doc.rect(colX[0], remarksY, remarksWidth, boxHeight).stroke();
doc.text(classRemark, remarkX, remarkY, { width: remarkWidth, align: 'left' });

// Head Teacher's Remark
remarksY += boxHeight;
const headRemark = "Commendable result indeed, you have very large room to perform better. OLUMATOVIN MORE! MORE!";
doc.font('Helvetica-Bold').fontSize(9).text("Head Teacher's Remark:", colX[0] + 5, remarksY + 7);
const headRemarkHeight = doc.heightOfString(headRemark, { width: remarkWidth, align: 'left' });
const headBoxHeight = Math.max(30, headRemarkHeight + 14);
doc.rect(colX[0], remarksY, remarksWidth, headBoxHeight).stroke();
doc.font('Helvetica').fontSize(9).text(headRemark, remarkX, remarksY + 7, { width: remarkWidth, align: 'left' });

 // === KEY TO GRADING TABLE (bottom right) ===
const gradingKey = [
  ['A1', '75%-100%'],
  ['B2', '70%-74.9%'],
  ['B3', '65%-69.9%'],
  ['C6', '60%-64.9%'],
  ['D7', '55%-59.9%'],
  ['E8', '50%-54.9%'],
  ['F9', '0%-49.9%']
];

// Position the table to the right of the main content but within page bounds
// const keyTableX = Math.min(colX[9] + 10, pageWidth - 150); // Ensure it stays within page width
// const keyTableY = grandTotalY + 10;
const keyTableX = colX[0] + remarksWidth + 24; // 20px margin between remarks and grading
const keyTableY = remarksYStart;
const keyColWidths = [40, 80];

doc.font('Helvetica-Bold').fontSize(11).text('KEY TO GRADING', keyTableX, keyTableY, { width: keyColWidths[0] + keyColWidths[1], align: 'center' });

// Draw header
const keyHeaderY = keyTableY + 18;
doc.font('Helvetica-Bold').fontSize(10);
doc.text('Grade', keyTableX, keyHeaderY, { width: keyColWidths[0], align: 'center' });
doc.text('Range', keyTableX + keyColWidths[0], keyHeaderY, { width: keyColWidths[1], align: 'center' });

// Draw header box
doc.rect(keyTableX, keyHeaderY - 3, keyColWidths[0] + keyColWidths[1], 18).stroke();

// Draw rows
let keyY = keyHeaderY + 15;
doc.font('Helvetica').fontSize(10);
gradingKey.forEach(row => {
  doc.rect(keyTableX, keyY, keyColWidths[0], 18).stroke();
  doc.rect(keyTableX + keyColWidths[0], keyY, keyColWidths[1], 18).stroke();
  doc.text(row[0], keyTableX, keyY + 3, { width: keyColWidths[0], align: 'center' });
  doc.text(row[1], keyTableX + keyColWidths[0], keyY + 3, { width: keyColWidths[1], align: 'center' });
  keyY += 18;
});

// After drawing the KEY TO GRADING box, set contentBottomY
let contentBottomY = keyY; // keyY is the last y position after KEY TO GRADING

// Draw a general rectangle border around the entire result content
const borderWidth = doc.page.width - 2 * borderMargin;
const borderHeight = contentBottomY - borderMargin + 20; // Add 20px padding at the bottom
doc.save();
doc.lineWidth(1.7);
doc.rect(borderMargin, borderMargin, borderWidth, borderHeight).stroke();
doc.restore();

  doc.end();
});

export default router; 
