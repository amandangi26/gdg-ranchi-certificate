import prisma from '@/lib/db';
import { CheckCircle2, XCircle, ArrowLeft, ShieldCheck, Download, Award, Tag, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import Footer from '@/app/components/Footer';
import { extractTicketId, getTrackForTicket, generateCertificateNumber, TRACKS } from '@/lib/tracks';

interface PageProps {
  params: Promise<{ ticketId: string }>;
}

export default async function VerifyPage({ params }: PageProps) {
  const { ticketId } = await params;
  const rawInput = ticketId.trim();
  const candidateId = extractTicketId(rawInput);

  let attendee = await prisma.attendee.findUnique({
    where: { ticketId: candidateId },
  });

  if (!attendee && candidateId.toUpperCase() !== candidateId) {
    attendee = await prisma.attendee.findUnique({
      where: { ticketId: candidateId.toUpperCase() },
    });
  }

  if (!attendee && candidateId !== rawInput) {
    attendee = await prisma.attendee.findUnique({
      where: { ticketId: rawInput },
    });
  }

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
    return (
      <div className="min-h-screen bg-[#FFFBF0] text-[#111] font-sans flex flex-col bg-grid-pattern">
        {/* Header Bar */}
        <header className="w-full bg-[#FFFBF0] border-b-2 border-black sticky top-0 z-50">
          <div className="google-stripe" />
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full border-2 border-black bg-[#4285F4] text-white flex items-center justify-center font-black text-xs shadow-[2px_2px_0_0_#000]">
                GDG
              </div>
              <span className="font-black text-sm uppercase tracking-tight text-[#111]">
                DevFest Ranchi 2026
              </span>
            </Link>
            <span className="px-3 py-1 rounded-full border-2 border-black bg-[#EA4335] text-white font-black text-xs uppercase tracking-wider shadow-[2px_2px_0_0_#000]">
              Verification Audit
            </span>
          </div>
        </header>

        <main className="flex-grow flex items-center justify-center p-4 sm:p-6 md:p-8 py-16 sm:py-24">
          <div className="rounded-[28px] sm:rounded-[32px] border-[3.5px] border-black bg-white p-7 sm:p-10 shadow-[8px_8px_0_0_#000] max-w-lg w-full text-center space-y-6">
            <div className="w-16 h-16 rounded-full border-[3px] border-black bg-[#EA4335] text-white flex items-center justify-center mx-auto shadow-[3.5px_3.5px_0_0_#000]">
              <XCircle className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-[0.1em] text-[#EA4335]">
                VERIFICATION AUDIT FAILED
              </span>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#111]">
                Unverified Credential
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-[#555] leading-relaxed">
                We could not find an attendee check-in record for Ticket / Certificate ID: <br />
                <span className="inline-block mt-2 font-mono font-bold text-xs bg-[#FFF8E7] px-3.5 py-1.5 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000]">
                  {ticketId}
                </span>
              </p>
            </div>

            <div className="rounded-2xl border-2 border-black bg-[#FFF8E7] p-4 text-xs font-semibold text-[#666] text-left space-y-1">
              <p className="font-black text-[#111] uppercase tracking-wide">Notice to Attendees:</p>
              <p>
                Only attendees with confirmed physical check-in at DevFest Ranchi 2026 receive authenticated certificates. If you believe this is an error, please contact the GDG Ranchi organizing team.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#4285F4] hover:bg-[#1a73e8] text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3.5px_3.5px_0_0_#000] hover:shadow-[1.5px_1.5px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-y-[3.5px] transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Certificate Portal</span>
              </Link>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // Retrieve track & certificate number
  const track = await getTrackForTicket(attendee.ticketId);
  const certNumber = generateCertificateNumber(attendee.ticketId, track);
  const trackMeta = TRACKS.find((t) => t.name === track) || TRACKS[0];

  return (
    <div className="min-h-screen bg-[#FFFBF0] text-[#111] font-sans flex flex-col bg-grid-pattern">
      {/* Header Bar */}
      <header className="w-full bg-[#FFFBF0] border-b-2 border-black sticky top-0 z-50">
        <div className="google-stripe" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-black bg-[#4285F4] text-white flex items-center justify-center font-black text-xs shadow-[2px_2px_0_0_#000]">
              GDG
            </div>
            <span className="font-black text-sm uppercase tracking-tight text-[#111]">
              DevFest Ranchi 2026
            </span>
          </Link>
          <span className="px-3.5 py-1 rounded-full border-2 border-black bg-[#34A853] text-white font-black text-xs uppercase tracking-wider shadow-[2px_2px_0_0_#000]">
            Audit Passed
          </span>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-4 sm:p-6 md:p-8 py-16 sm:py-24">
        <div className="rounded-[28px] sm:rounded-[32px] border-[3.5px] border-black bg-white p-7 sm:p-10 shadow-[8px_8px_0_0_#000] max-w-lg w-full text-center space-y-6">
          {/* Success Check Badge */}
          <div className="w-16 h-16 rounded-full border-[3px] border-black bg-[#34A853] text-white flex items-center justify-center mx-auto shadow-[3.5px_3.5px_0_0_#000]">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-black uppercase tracking-[0.1em] text-[#34A853] flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> OFFICIAL GDG RANCHI CREDENTIAL
            </span>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#111]">
              Certificate Verified
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-[#555]">
              This certificate was officially issued and authenticated by Google Developer Groups Ranchi.
            </p>
          </div>

          {/* Verification Details Table */}
          <div className="rounded-2xl border-2 border-black bg-[#FFF8E7] p-5 text-left space-y-3.5 shadow-[3px_3px_0_0_#000]">
            <div className="pb-3 border-b border-black/10 flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] text-[#666] uppercase tracking-wider font-bold">
                  Attendee Name
                </p>
                <p className="text-xl font-black text-[#111] uppercase tracking-tight">
                  {attendee.name}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full border-2 border-black text-[10px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0_0_#000] shrink-0 ${trackMeta.badgeClass}`}>
                {track}
              </span>
            </div>

            <div className="pb-3 border-b border-black/10">
              <p className="text-[10px] text-[#666] uppercase tracking-wider font-bold">
                Certificate ID
              </p>
              <p className="text-sm font-mono font-black text-[#4285F4] tracking-wide">
                {certNumber}
              </p>
            </div>

            <div className="pb-3 border-b border-black/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[#666] uppercase tracking-wider font-bold">
                  Ticket Order ID
                </p>
                <p className="text-xs font-mono font-bold text-[#111]">
                  {attendee.ticketId}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#666] uppercase tracking-wider font-bold">
                  Event Track
                </p>
                <p className="text-xs font-bold text-[#111]">
                  {track}
                </p>
              </div>
            </div>

            <div>
              <p className="text-[10px] text-[#666] uppercase tracking-wider font-bold">
                Event / Chapter
              </p>
              <p className="text-xs font-bold text-[#111]">
                DevFest Ranchi 2026 • Google Developer Groups Ranchi
              </p>
            </div>
          </div>

          {/* Action Links */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              href={`/?ticketId=${encodeURIComponent(attendee.ticketId)}`}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#34A853] hover:bg-[#2d9147] text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3.5px_3.5px_0_0_#000] hover:shadow-[1.5px_1.5px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-y-[3.5px] transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download Certificate</span>
            </Link>

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-white hover:bg-[#FFF8E7] text-[#111] font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2.5px_2.5px_0_0_#000] hover:shadow-[1px_1px_0_0_#000] hover:translate-x-[1.5px] hover:translate-y-[1.5px] active:translate-y-[2.5px] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Home</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
