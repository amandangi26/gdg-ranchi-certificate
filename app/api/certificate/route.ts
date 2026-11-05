import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateCertificate } from '@/lib/pdf-generator';
import { getTemplateBytes } from '@/lib/template-cache';
import { extractTicketId, getTrackForTicket, generateCertificateNumber } from '@/lib/tracks';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawTicketId = searchParams.get('ticketId');

  if (!rawTicketId || !rawTicketId.trim()) {
    return NextResponse.json({ error: 'Ticket Order ID or Certificate ID is required.' }, { status: 400 });
  }

  // Parse candidate ticket ID (handles both raw ticket IDs like 45123 and cert numbers like GDGR-DF26-CONF-45123)
  const candidateId = extractTicketId(rawTicketId.trim());
  const exactInput = rawTicketId.trim();

  try {
    // 1. Fast indexed lookup by candidate ticketId
    let attendee = await prisma.attendee.findUnique({
      where: { ticketId: candidateId },
    });

    // 2. Fallback: try uppercase candidate
    if (!attendee && candidateId.toUpperCase() !== candidateId) {
      attendee = await prisma.attendee.findUnique({
        where: { ticketId: candidateId.toUpperCase() },
      });
    }

    // 3. Fallback: try raw exact input if candidate was different
    if (!attendee && candidateId !== exactInput) {
      attendee = await prisma.attendee.findUnique({
        where: { ticketId: exactInput },
      });
    }

    // 4. Fallback to case-insensitive lookup
    if (!attendee) {
      attendee = await prisma.attendee.findFirst({
        where: {
          ticketId: {
            equals: candidateId,
            mode: 'insensitive',
          },
        },
      });
    }

    if (!attendee) {
      return NextResponse.json(
        {
          error:
            'It seems you did not check-in at the event, so no certificate was found. Please verify your ticket order ID.',
        },
        { status: 404 }
      );
    }

    // 5. Look up track for attendee
    const track = await getTrackForTicket(attendee.ticketId);
    const certNumber = generateCertificateNumber(attendee.ticketId, track);

    // 6. Retrieve cached template bytes (track-specific or global)
    const templateBytes = await getTemplateBytes(track);

    // 7. Generate PDF with dynamic cursive font, QR code, Track and Certificate Number
    const pdfBytes = await generateCertificate(
      attendee.name,
      templateBytes,
      attendee.ticketId,
      track,
      certNumber
    );

    // 8. Return response with caching and metadata headers
    const safeFilename = attendee.name.trim().replace(/\s+/g, '_') || 'Attendee';
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="GDG_Certificate_${safeFilename}.pdf"`,
        'X-Certificate-Number': certNumber,
        'X-Attendee-Track': track,
        'Cache-Control': 'private, no-transform, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Certificate generation error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error while generating certificate.', details: String(error) },
      { status: 500 }
    );
  }
}
