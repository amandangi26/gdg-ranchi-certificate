'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Download,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Award,
  ShieldCheck,
  FileText,
  ImageIcon,
  Tag,
  HelpCircle,
  ChevronDown,
  Check,
  Calendar,
  MapPin,
  QrCode,
  ArrowRight,
  Copy,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { TRACKS } from '@/lib/tracks';

interface PdfPage {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: unknown;
  }) => { promise: Promise<void> };
}

interface PdfDocument {
  getPage: (pageNumber: number) => Promise<PdfPage>;
}

interface PdfJsLib {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (url: string) => { promise: Promise<PdfDocument> };
}

interface CustomWindow extends Window {
  pdfjsLib?: PdfJsLib;
}

export default function Home() {
  const [ticketId, setTicketId] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadingPng, setDownloadingPng] = useState(false);
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [attendeeName, setAttendeeName] = useState('');
  const [verifiedTicketId, setVerifiedTicketId] = useState('');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [attendeeTrack, setAttendeeTrack] = useState('');
  const [copiedCertNo, setCopiedCertNo] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);

  // Check URL parameters for ticketId (e.g. ?ticketId=45123)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlTicket = params.get('ticketId');
      if (urlTicket) {
        setTicketId(urlTicket);
        fetchCertificate(urlTicket);
      }
    }
  }, []);

  const fetchCertificate = async (idToSearch: string) => {
    const trimmedId = idToSearch.trim().toUpperCase();
    if (!trimmedId) return;

    if (downloadUrl) {
      window.URL.revokeObjectURL(downloadUrl);
    }

    setLoading(true);
    setError('');
    setDownloadUrl(null);
    setAttendeeName('');
    setVerifiedTicketId('');
    setCertificateNumber('');
    setAttendeeTrack('');

    try {
      const res = await fetch(`/api/certificate?ticketId=${encodeURIComponent(trimmedId)}`);

      if (res.ok) {
        const certNoHeader = res.headers.get('X-Certificate-Number');
        const trackHeader = res.headers.get('X-Attendee-Track');
        if (certNoHeader) setCertificateNumber(certNoHeader);
        if (trackHeader) setAttendeeTrack(trackHeader);

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        setDownloadUrl(url);
        setVerifiedTicketId(trimmedId);

        const disposition = res.headers.get('Content-Disposition');
        let filename = 'Certificate.pdf';
        if (disposition && disposition.includes('filename=')) {
          filename = disposition.split('filename=')[1].replace(/"/g, '');
        }
        const parsedName = filename
          .replace('GDG_Certificate_', '')
          .replace('.pdf', '')
          .replace(/_/g, ' ');
        setAttendeeName(parsedName);

        // Smooth scroll to preview on mobile/desktop
        setTimeout(() => {
          previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 180);
      } else {
        const data = await res.json();
        setError(
          data.error ||
          'It seems you did not check-in at the event, so no certificate was found. Please enter a valid ticket order ID.'
        );
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred while generating your certificate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCertificate(ticketId);
  };

  // Convert PDF to PNG using PDF.js via client-side dynamic load
  const handleDownloadPng = async () => {
    if (!downloadUrl) return;
    setDownloadingPng(true);

    try {
      const customWindow = window as unknown as CustomWindow;

      if (!customWindow.pdfjsLib) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load PDF rendering engine'));
          document.head.appendChild(script);
        });
      }

      if (customWindow.pdfjsLib) {
        customWindow.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const loadingTask = customWindow.pdfjsLib.getDocument(downloadUrl);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        // Hi-DPI scale (3x) for crisp PNG output
        const scale = 3;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          const pngUrl = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          const safeName = attendeeName.trim().replace(/\s+/g, '_') || 'Attendee';
          downloadLink.href = pngUrl;
          downloadLink.download = `GDG_Certificate_${safeName}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
      }
    } catch (err) {
      console.error('PNG export failed:', err);
      alert('Could not export certificate as PNG. Please download the PDF directly.');
    } finally {
      setDownloadingPng(false);
    }
  };

  const copyCertNumber = () => {
    if (!certificateNumber) return;
    navigator.clipboard.writeText(certificateNumber);
    setCopiedCertNo(true);
    setTimeout(() => setCopiedCertNo(false), 2000);
  };

  const trackMeta = TRACKS.find((t) => t.name === attendeeTrack) || TRACKS[0];

  const faqs = [
    {
      q: 'Where do I find my Ticket Order ID?',
      a: 'Your Ticket Order ID is printed on your DevFest Ranchi check-in pass, badge, or the registration confirmation email from Townscript / Devfolio. It typically looks like 45123, 178497, or 011041.',
    },
    {
      q: 'What is the Certificate Number format?',
      a: 'Each verified attendee receives an official credential format like GDGR-DF26-[TRACK]-[TICKET_ID] (e.g. GDGR-DF26-CONF-45123), which is cryptographically linked to your participation record.',
    },
    {
      q: 'Can I download both PDF and PNG formats?',
      a: 'Yes! You can download a high-resolution print-ready PDF with embedded vector fonts, or a high-DPI PNG image suitable for LinkedIn, X (Twitter), and resumes.',
    },
    {
      q: 'How does the QR Code verification work?',
      a: 'Every certificate features an embedded high-resolution QR code. Anyone scanning it is instantly directed to the official GDG Ranchi cryptographic verification page to verify its authenticity.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFFBF0] text-[#111] font-sans flex flex-col selection:bg-[#FBBC05] selection:text-black bg-grid-pattern relative">
      <Navbar />

      {/* Main Container with generous top padding to clear the fixed navbar */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-32 sm:pt-40 pb-16 sm:pb-24 space-y-12 sm:space-y-16">

        {/* HERO SECTION */}
        <div className="relative text-center space-y-6 max-w-3xl mx-auto pt-2">
          {/* Subtle Bat and Spider accents from DevFest Ranchi Assets */}
          <div className="absolute -top-10 -left-6 sm:-left-12 hidden sm:block pointer-events-none select-none opacity-80">
            <Image
              src="/bat.svg"
              alt=""
              width={48}
              height={32}
              unoptimized
              className="w-10 sm:w-12 h-auto"
            />
          </div>

          <div className="absolute -top-12 -right-6 sm:-right-12 hidden sm:block pointer-events-none select-none opacity-70">
            <Image
              src="/spider.svg"
              alt=""
              width={42}
              height={42}
              unoptimized
              className="w-8 sm:w-10 h-auto"
            />
          </div>

          {/* Official DevFest Chapter Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-2 border-black bg-[#FFF8E7] text-xs font-black uppercase tracking-wider shadow-[2.5px_2.5px_0_0_#000]">
            <Award className="w-4 h-4 text-[#4285F4]" />
            <span>DevFest Ranchi 2026 Concluded • Official Certificates Live 🎉</span>
          </div>

          {/* Hero Headline */}
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-[#111] leading-none">
              Download Your <br />
              <span className="text-[#4285F4]">
                Certificate
              </span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg font-semibold text-[#555] max-w-2xl mx-auto leading-relaxed pt-1">
              Thank you to all attendees, speakers, and sponsors for making DevFest Ranchi 2026 unforgettable! Enter your Ticket Order ID or Certificate ID below to generate and download your verified credential.
            </p>
          </div>

          {/* 3 Tracks Showcase Pills */}
          <div className="pt-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-[#777] mb-2.5">
              Certified Event Tracks:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border-2 border-black bg-[#E8F0FE] text-[#1967D2] text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]">
                <span className="w-2 h-2 rounded-full bg-[#4285F4]" />
                Conference Track
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border-2 border-black bg-[#E6F4EA] text-[#137333] text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]">
                <span className="w-2 h-2 rounded-full bg-[#34A853]" />
                Beginner Track
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border-2 border-black bg-[#FEF7E0] text-[#B06000] text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]">
                <span className="w-2 h-2 rounded-full bg-[#FBBC05]" />
                Flagship Dev Track
              </span>
            </div>
          </div>
        </div>

        {/* NEO-BRUTALIST SEARCH & GENERATION CARD */}
        <div className="max-w-2xl mx-auto">
          <div className="rounded-[28px] sm:rounded-[32px] border-[3.5px] border-black bg-white p-6 sm:p-9 md:p-10 shadow-[8px_8px_0_0_#000] space-y-6 relative overflow-hidden">

            {/* Top Google 4-Color Accent Border inside card */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]" />

            <div className="space-y-1 pt-1">
              <span className="text-[11px] font-black uppercase tracking-[0.1em] text-[#4285F4] block">
                STEP 1 • ATTENDEE LOOKUP
              </span>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#111]">
                Enter Your Order / Ticket ID
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-[#666]">
                Look for the unique ticket code sent in your registration or printed on your physical badge.
              </p>
            </div>

            <form onSubmit={handleSearch} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="ticketIdInput"
                  className="block text-xs font-black uppercase tracking-wider text-[#111]"
                >
                  Ticket Order ID or Certificate Number
                </label>
                <div className="relative">
                  <input
                    id="ticketIdInput"
                    type="text"
                    value={ticketId}
                    onChange={(e) => setTicketId(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    placeholder="e.g. 45123 or GDGR-DF26-CONF-45123"
                    className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-black bg-[#FFFBF0] font-mono text-sm sm:text-base font-bold text-[#111] placeholder:text-[#999] shadow-[3px_3px_0_0_#000] focus:border-[#4285F4] focus:shadow-[4px_4px_0_0_#4285F4] focus:bg-white outline-none transition-all uppercase"
                    required
                  />
                  <Search className="w-5 h-5 text-black absolute left-4 top-4.5 pointer-events-none" />
                </div>
              </div>

              {/* Neo-Brutalist Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-[#4285F4] hover:bg-[#1a73e8] text-white font-black text-sm sm:text-base uppercase tracking-wider border-2 border-black shadow-[4px_4px_0_0_#000] hover:shadow-[2px_2px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all cursor-pointer select-none disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin stroke-[3]" />
                    <span>Verifying Check-In Record...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-[#FBBC05]" />
                    <span>Generate & View Certificate</span>
                  </>
                )}
              </button>
            </form>

            {/* Error Notification */}
            {error && (
              <div className="rounded-2xl border-2 border-black bg-[#FCE8E6] p-4 sm:p-5 text-[#111] shadow-[3.5px_3.5px_0_0_#000] space-y-1.5 animate-in fade-in">
                <div className="flex items-center gap-2 text-[#C5221F] font-black text-xs uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>No Attendee Found</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#333] leading-relaxed pl-6">
                  {error}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* CERTIFICATE VERIFIED & LIVE PREVIEW SECTION */}
        {downloadUrl && (
          <div ref={previewRef} className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Main Result Card */}
            <div className="rounded-[28px] sm:rounded-[32px] border-[3.5px] border-black bg-white p-6 sm:p-9 shadow-[8px_8px_0_0_#000] space-y-6 relative">

              {/* Header Badge */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b-2 border-black/10">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full border-2 border-black bg-[#34A853] text-white flex items-center justify-center font-black shadow-[2.5px_2.5px_0_0_#000] shrink-0">
                    <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase text-[#34A853] tracking-widest block">
                      AUTHENTICATED PARTICIPANT
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#111]">
                      {attendeeName || 'Verified Attendee'}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {attendeeTrack && (
                    <span className={`px-3.5 py-1.5 rounded-full border-2 border-black text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000] ${trackMeta.badgeClass}`}>
                      {attendeeTrack}
                    </span>
                  )}
                  <Link
                    href={`/verify/${encodeURIComponent(verifiedTicketId)}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-black bg-white hover:bg-[#FFF8E7] text-[#111] font-black text-xs uppercase tracking-wider shadow-[2px_2px_0_0_#000] transition-all"
                  >
                    <span>Audit Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Verified Details Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Certificate Number Card */}
                <div className="rounded-2xl border-2 border-black bg-[#FFF8E7] p-3.5 shadow-[2px_2px_0_0_#000] space-y-1 relative">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#666] block">
                    Certificate ID
                  </span>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-mono font-black text-[#4285F4] truncate">
                      {certificateNumber || 'GDGR-DF26-CONF-' + verifiedTicketId}
                    </span>
                    <button
                      onClick={copyCertNumber}
                      className="p-1 rounded hover:bg-black/5 text-[#555] transition-colors"
                      title="Copy Certificate Number"
                    >
                      {copiedCertNo ? <Check className="w-3.5 h-3.5 text-[#34A853]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Track Card */}
                <div className="rounded-2xl border-2 border-black bg-[#FFF8E7] p-3.5 shadow-[2px_2px_0_0_#000] space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#666] block">
                    Assigned Track
                  </span>
                  <span className="text-xs font-black text-[#111] block truncate">
                    {attendeeTrack || 'CONFERENCE TRACK'}
                  </span>
                </div>

                {/* Chapter Card */}
                <div className="rounded-2xl border-2 border-black bg-[#FFF8E7] p-3.5 shadow-[2px_2px_0_0_#000] space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#666] block">
                    Event / Chapter
                  </span>
                  <span className="text-xs font-black text-[#111] block truncate">
                    GDG Ranchi • DevFest 2026
                  </span>
                </div>

                {/* Status Card */}
                <div className="rounded-2xl border-2 border-black bg-[#E6F4EA] p-3.5 shadow-[2px_2px_0_0_#000] space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#137333] block">
                    Status
                  </span>
                  <span className="text-xs font-black text-[#137333] flex items-center gap-1.5 truncate">
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    100% Cryptographic
                  </span>
                </div>
              </div>

              {/* Certificate Preview Frame */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-[#111] flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#4285F4]" />
                    <span>Official Vector Certificate Preview</span>
                  </span>
                  <span className="text-[11px] font-bold text-[#666]">
                    Zoom / Inspect in browser
                  </span>
                </div>

                <div className="rounded-2xl border-[3px] border-black overflow-hidden bg-white shadow-[6px_6px_0_0_#000] aspect-[1.414/1] w-full relative">
                  <iframe
                    src={`${downloadUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    title="DevFest Ranchi Certificate Preview"
                    className="w-full h-full border-none"
                  />
                </div>
              </div>

              {/* Download Buttons Bar */}
              <div className="pt-3 flex flex-col sm:flex-row items-center gap-3.5">
                {/* Download PDF Button */}
                <a
                  href={downloadUrl}
                  download={`GDG_Certificate_${attendeeName.trim().replace(/\s+/g, '_') || 'Attendee'}.pdf`}
                  className="w-full sm:flex-1 inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-full bg-[#4285F4] hover:bg-[#1a73e8] text-white font-black text-xs sm:text-sm uppercase tracking-wider border-2 border-black shadow-[4px_4px_0_0_#000] hover:shadow-[2px_2px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-y-[4px] transition-all cursor-pointer text-center"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Download Print-Ready PDF</span>
                </a>

                {/* Download PNG Button */}
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  disabled={downloadingPng}
                  className="w-full sm:flex-1 inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-full bg-[#FBBC05] hover:bg-[#e2a800] text-[#111] font-black text-xs sm:text-sm uppercase tracking-wider border-2 border-black shadow-[4px_4px_0_0_#000] hover:shadow-[2px_2px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-y-[4px] transition-all cursor-pointer disabled:opacity-60 text-center"
                >
                  {downloadingPng ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                      <span>Exporting High-DPI PNG...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4 stroke-[2.5]" />
                      <span>Download Image (PNG)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3 TRACKS SHOWCASE SECTION */}
        <div className="space-y-6 pt-4">
          <div className="text-center space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.1em] text-[#4285F4]">
              EVENT TRACKS ARCHITECTURE
            </span>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#111]">
              DevFest Ranchi 2026 Tracks
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-[#666] max-w-xl mx-auto">
              Our 3 dedicated tracks brought comprehensive learning tailored to every stage of a developer’s career.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Track 1: Conference Track */}
            <div className="rounded-[24px] border-[3px] border-black bg-white p-6 shadow-[5px_5px_0_0_#000] space-y-4 hover:shadow-[7px_7px_0_0_#000] hover:-translate-y-1 transition-all">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full border-2 border-black bg-[#E8F0FE] text-[#1967D2] text-xs font-black uppercase shadow-[1.5px_1.5px_0_0_#000]">
                  Code: CONF
                </span>
                <div className="w-3 h-3 rounded-full bg-[#4285F4] border border-black" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-[#111]">
                Conference Track
              </h3>
              <p className="text-xs font-semibold text-[#555] leading-relaxed">
                Keynotes, high-level cloud architecture, AI breakthroughs, industry panels, and visionary sessions from global tech leaders.
              </p>
              <div className="pt-2 border-t border-black/10 flex items-center justify-between text-[11px] font-bold text-[#4285F4]">
                <span>Sample ID: GDGR-DF26-CONF-XXXXX</span>
              </div>
            </div>

            {/* Track 2: Beginner Track */}
            <div className="rounded-[24px] border-[3px] border-black bg-white p-6 shadow-[5px_5px_0_0_#000] space-y-4 hover:shadow-[7px_7px_0_0_#000] hover:-translate-y-1 transition-all">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full border-2 border-black bg-[#E6F4EA] text-[#137333] text-xs font-black uppercase shadow-[1.5px_1.5px_0_0_#000]">
                  Code: BEG
                </span>
                <div className="w-3 h-3 rounded-full bg-[#34A853] border border-black" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-[#111]">
                Beginner Track
              </h3>
              <p className="text-xs font-semibold text-[#555] leading-relaxed">
                Foundation workshops, introductory web & cloud labs, git mastery, career pathways, and mentorship for emerging tech talent.
              </p>
              <div className="pt-2 border-t border-black/10 flex items-center justify-between text-[11px] font-bold text-[#34A853]">
                <span>Sample ID: GDGR-DF26-BEG-XXXXX</span>
              </div>
            </div>

            {/* Track 3: Flagship Dev Track */}
            <div className="rounded-[24px] border-[3px] border-black bg-white p-6 shadow-[5px_5px_0_0_#000] space-y-4 hover:shadow-[7px_7px_0_0_#000] hover:-translate-y-1 transition-all">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full border-2 border-black bg-[#FEF7E0] text-[#B06000] text-xs font-black uppercase shadow-[1.5px_1.5px_0_0_#000]">
                  Code: DEV
                </span>
                <div className="w-3 h-3 rounded-full bg-[#FBBC05] border border-black" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-[#111]">
                Flagship Dev Track
              </h3>
              <p className="text-xs font-semibold text-[#555] leading-relaxed">
                In-depth code masterclasses, Android & Flutter internals, scalable distributed systems, and real-time machine learning deployment.
              </p>
              <div className="pt-2 border-t border-black/10 flex items-center justify-between text-[11px] font-bold text-[#B06000]">
                <span>Sample ID: GDGR-DF26-DEV-XXXXX</span>
              </div>
            </div>
          </div>
        </div>

        {/* HOW IT WORKS SECTION (3 Simple Steps) */}
        <div className="rounded-[28px] sm:rounded-[32px] border-[3px] border-black bg-[#FFF8E7] p-6 sm:p-10 shadow-[6px_6px_0_0_#000] space-y-6">
          <div className="text-center space-y-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-[#4285F4]">
              THREE EASY STEPS
            </span>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#111]">
              How To Claim Your Credential
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border-2 border-black bg-white p-5 shadow-[3px_3px_0_0_#000] space-y-2">
              <div className="w-8 h-8 rounded-full border-2 border-black bg-[#4285F4] text-white flex items-center justify-center font-black text-xs">
                1
              </div>
              <h4 className="font-black text-sm uppercase text-[#111]">Enter Ticket Order ID</h4>
              <p className="text-xs font-semibold text-[#666]">
                Provide your ticket number (e.g. 45123) or your full certificate ID.
              </p>
            </div>

            <div className="rounded-2xl border-2 border-black bg-white p-5 shadow-[3px_3px_0_0_#000] space-y-2">
              <div className="w-8 h-8 rounded-full border-2 border-black bg-[#34A853] text-white flex items-center justify-center font-black text-xs">
                2
              </div>
              <h4 className="font-black text-sm uppercase text-[#111]">Verify Track & Details</h4>
              <p className="text-xs font-semibold text-[#666]">
                Review the live vector certificate preview and check your assigned track.
              </p>
            </div>

            <div className="rounded-2xl border-2 border-black bg-white p-5 shadow-[3px_3px_0_0_#000] space-y-2">
              <div className="w-8 h-8 rounded-full border-2 border-black bg-[#FBBC05] text-[#111] flex items-center justify-center font-black text-xs">
                3
              </div>
              <h4 className="font-black text-sm uppercase text-[#111]">Download & Share</h4>
              <p className="text-xs font-semibold text-[#666]">
                Save your high-res PDF or PNG and showcase your achievement on LinkedIn.
              </p>
            </div>
          </div>
        </div>

        {/* FREQUENTLY ASKED QUESTIONS */}
        <div className="max-w-3xl mx-auto space-y-5 pt-2">
          <div className="text-center space-y-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-[#4285F4]">
              ATTENDEE ASSISTANCE
            </span>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#111]">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl border-2 border-black bg-white shadow-[3px_3px_0_0_#000] overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3 font-black text-xs sm:text-sm uppercase tracking-tight text-[#111] cursor-pointer hover:bg-[#FFFBF0]"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                        }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 text-xs sm:text-sm font-semibold text-[#555] leading-relaxed border-t border-black/10">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
