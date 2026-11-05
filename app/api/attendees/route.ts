import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getTrackMap, generateCertificateNumber, removeTrackForTicket } from '@/lib/tracks';
import { cookies } from 'next/headers';

// Helper to check auth
async function isAuthenticated() {
  const cookieStore = await cookies();
  return cookieStore.get('admin_session')?.value === 'true';
}

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [attendees, count, trackMap] = await Promise.all([
      prisma.attendee.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      prisma.attendee.count(),
      getTrackMap(),
    ]);

    const stats = {
      total: count,
      conference: 0,
      beginner: 0,
      flagship: 0,
    };

    const enrichedAttendees = attendees.map((a) => {
      const track = trackMap[a.ticketId.toUpperCase()] || 'CONFERENCE TRACK';
      const certNumber = generateCertificateNumber(a.ticketId, track);

      if (track === 'BEGINNER TRACK') {
        stats.beginner++;
      } else if (track === 'FLAGSHIP DEV TRACK') {
        stats.flagship++;
      } else {
        stats.conference++;
      }

      return {
        id: a.id,
        name: a.name,
        ticketId: a.ticketId,
        createdAt: a.createdAt,
        track,
        certNumber,
      };
    });

    return NextResponse.json({ attendees: enrichedAttendees, count, stats });
  } catch (error) {
    console.error('Failed to list attendees:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  try {
    const attendee = await prisma.attendee.findUnique({ where: { id } });
    if (attendee) {
      await Promise.all([
        prisma.attendee.delete({ where: { id } }),
        removeTrackForTicket(attendee.ticketId),
      ]);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete attendee:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
