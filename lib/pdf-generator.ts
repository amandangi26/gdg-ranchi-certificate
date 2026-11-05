import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { generateCertificateNumber, normalizeTrackName } from './tracks';

// Configuration for name and element placement
// Adjust these values to fit your specific certificate template
const CONFIG = {
  fontSize: 60, // Default font size for attendee name
  minFontSize: 28, // Floor for dynamic down-scaling for very long names
  yOffset: 0, // Offset from center. Positive = up, Negative = down.
  color: rgb(0.27, 0.54, 0.97), // GDG Blue accent #4589f8
  qrSize: 100, // Size of QR code
  qrBottomOffset: 65, // Distance from bottom for QR code
  certNoFontSize: 9.5, // Font size for certificate number
  trackFontSize: 8.5, // Font size for track name
};

// In-memory cache for custom font bytes to eliminate disk I/O per attendee
let cachedFontBytes: Buffer | null = null;

function getFontBytes(): Buffer {
  if (!cachedFontBytes) {
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'GreatVibes-Regular.ttf');
    cachedFontBytes = fs.readFileSync(fontPath);
  }
  return cachedFontBytes;
}

export async function generateCertificate(
  name: string,
  templateBytes: Uint8Array,
  ticketId: string,
  trackName?: string,
  customCertNumber?: string
): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.load(templateBytes);
    pdfDoc.registerFontkit(fontkit);

    // Load Custom Script Font for Attendee Name
    const fontBytes = getFontBytes();
    const cursiveFont = await pdfDoc.embedFont(fontBytes);

    // Embed Standard Vector Fonts for Certificate Number & Track details
    const helveticaBold = await pdfDoc.embedStandardFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedStandardFont(StandardFonts.Helvetica);

    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // 1. Auto-scale font size dynamically if the attendee's name is exceptionally long
    let effectiveFontSize = CONFIG.fontSize;
    let textWidth = cursiveFont.widthOfTextAtSize(name, effectiveFontSize);
    const maxWidth = width * 0.76; // Generous 12% margins on left and right

    if (textWidth > maxWidth) {
      effectiveFontSize = Math.max(
        CONFIG.minFontSize,
        Math.floor(effectiveFontSize * (maxWidth / textWidth))
      );
      textWidth = cursiveFont.widthOfTextAtSize(name, effectiveFontSize);
    }

    // Position for attendee name
    const nameX = (width - textWidth) / 2;
    const nameY = height / 2 - 30 + CONFIG.yOffset;

    firstPage.drawText(name, {
      x: nameX,
      y: nameY,
      size: effectiveFontSize,
      font: cursiveFont,
      color: CONFIG.color,
    });

    // 2. Compute Official Certificate Number & Normalized Track
    const normalizedTrack = normalizeTrackName(trackName);
    const certificateNumber = customCertNumber || generateCertificateNumber(ticketId, normalizedTrack);

    // 3. Generate Crisp HD QR Code (links to official audit page)
    const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gdg-cert-app.vercel.app';
    const cleanAppUrl = rawAppUrl.replace(/\/+$/, '');
    const verifyUrl = `${cleanAppUrl}/verify/${encodeURIComponent(ticketId.trim())}`;

    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: CONFIG.qrSize * 2,
      errorCorrectionLevel: 'M',
    });
    const qrImage = await pdfDoc.embedPng(qrDataUrl);

    // Draw QR Code centered at designated offset
    const qrX = (width - CONFIG.qrSize) / 2;
    const qrY = CONFIG.qrBottomOffset;

    firstPage.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: CONFIG.qrSize,
      height: CONFIG.qrSize,
    });

    // 4. Draw Official Certificate Number (Centered directly below QR code)
    const certNoText = `Certificate ID: ${certificateNumber}`;
    const certNoWidth = helveticaBold.widthOfTextAtSize(certNoText, CONFIG.certNoFontSize);
    const certNoX = (width - certNoWidth) / 2;
    const certNoY = qrY - 15;

    firstPage.drawText(certNoText, {
      x: certNoX,
      y: certNoY,
      size: CONFIG.certNoFontSize,
      font: helveticaBold,
      color: rgb(0.12, 0.12, 0.12),
    });

    // 5. Draw Track Name (Centered directly below Certificate ID)
    const trackText = `Track: ${normalizedTrack}`;
    const trackWidth = helvetica.widthOfTextAtSize(trackText, CONFIG.trackFontSize);
    const trackX = (width - trackWidth) / 2;
    const trackY = certNoY - 12;

    firstPage.drawText(trackText, {
      x: trackX,
      y: trackY,
      size: CONFIG.trackFontSize,
      font: helvetica,
      color: rgb(0.38, 0.38, 0.38),
    });

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}
