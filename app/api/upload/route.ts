import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import * as XLSX from 'xlsx';
import { invalidateTemplateCache } from '@/lib/template-cache';
import { saveTrackMapping, normalizeTrackName, getTrackCode } from '@/lib/tracks';
import { cookies } from 'next/headers';

async function isAuthenticated() {
  const cookieStore = await cookies();
  return cookieStore.get('admin_session')?.value === 'true';
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized. Please login as admin.' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const template = formData.get('template') as File | null;
    const track = formData.get('track') as string | null;
    const templateTarget = formData.get('templateTarget') as string | null; // 'global' | 'conference' | 'beginner' | 'flagship'

    if (!file && !template) {
      return NextResponse.json({ error: 'No files received.' }, { status: 400 });
    }

    let message = '';
    const selectedTrack = normalizeTrackName(track || 'CONFERENCE TRACK');

    // 1. Process Excel / CSV Attendees File with Track Association
    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

      // In-memory map to deduplicate records in the spreadsheet
      const attendeeMap = new Map<string, string>(); // ticketId -> formattedName
      const trackMap: Record<string, string> = {};

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 2) continue;

        const rawTicket = row[0]?.toString().trim();
        const rawName = row[1]?.toString().trim();

        if (!rawTicket || !rawName) continue;

        // Skip table headers like "Ticket ID", "Order ID", "Name", "Attendee"
        const lowerTicket = rawTicket.toLowerCase();
        const lowerName = rawName.toLowerCase();
        if (
          lowerTicket.includes('ticket') ||
          lowerTicket.includes('order') ||
          lowerTicket.includes('registration') ||
          lowerName === 'name' ||
          lowerName === 'attendee name' ||
          lowerName === 'full name'
        ) {
          continue;
        }

        const ticketId = rawTicket.toUpperCase();
        // Convert to clean Title Case
        const formattedName = rawName
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean)
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        if (ticketId && formattedName) {
          attendeeMap.set(ticketId, formattedName);
          trackMap[ticketId] = selectedTrack;
        }
      }

      const attendeeEntries = Array.from(attendeeMap.entries()).map(([ticketId, name]) => ({
        ticketId,
        name,
      }));

      if (attendeeEntries.length === 0) {
        return NextResponse.json(
          { error: 'No valid attendee records found in the uploaded file.' },
          { status: 400 }
        );
      }

      // Fast Chunked Upsert in Batches of 50 to avoid network timeouts
      const BATCH_SIZE = 50;
      let processedCount = 0;

      for (let i = 0; i < attendeeEntries.length; i += BATCH_SIZE) {
        const batch = attendeeEntries.slice(i, i + BATCH_SIZE);

        await prisma.$transaction(
          batch.map((entry) =>
            prisma.attendee.upsert({
              where: { ticketId: entry.ticketId },
              update: { name: entry.name },
              create: { ticketId: entry.ticketId, name: entry.name },
            })
          )
        );

        processedCount += batch.length;
      }

      // Persist track mappings safely into Config table (zero schema drift, production safe)
      await saveTrackMapping(trackMap);

      message += `Successfully synced ${processedCount} attendees for ${selectedTrack}. `;
    }

    // 2. Process Certificate PDF Template Upload / Update
    if (template) {
      const bytes = await template.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64Template = buffer.toString('base64');

      let configKey = 'template_data';
      let targetLabel = 'Global / Default Template';

      if (templateTarget === 'conference') {
        configKey = 'template_data_conf';
        targetLabel = 'Conference Track Template';
      } else if (templateTarget === 'beginner') {
        configKey = 'template_data_beg';
        targetLabel = 'Beginner Track Template';
      } else if (templateTarget === 'flagship') {
        configKey = 'template_data_dev';
        targetLabel = 'Flagship Dev Track Template';
      }

      await prisma.config.upsert({
        where: { key: configKey },
        update: { value: base64Template },
        create: { key: configKey, value: base64Template },
      });

      // Invalidate memory cache so attendees immediately get the newly uploaded template
      invalidateTemplateCache(configKey);

      message += `${targetLabel} uploaded and activated successfully.`;
    }

    return NextResponse.json({ message, success: true });
  } catch (error) {
    console.error('Upload processing error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error while processing upload.', details: String(error) },
      { status: 500 }
    );
  }
}
