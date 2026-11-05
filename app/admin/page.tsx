'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  Check,
  AlertCircle,
  Loader2,
  Users,
  Trash2,
  RefreshCw,
  LogOut,
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
  Award,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { TRACKS, generateCertificateNumber, normalizeTrackName, TrackName } from '@/lib/tracks';

interface Attendee {
  id: string;
  name: string;
  ticketId: string;
  createdAt: string;
  track: string;
  certNumber: string;
}

interface ParsedPreviewRow {
  rowNum: number;
  ticketId: string;
  name: string;
  track: string;
  certNumber: string;
  isValid: boolean;
}

interface TemplateStatusItem {
  active: boolean;
  sizeKb: number;
}

interface TemplatesStatus {
  global: TemplateStatusItem;
  conference: TemplateStatusItem;
  beginner: TemplateStatusItem;
  flagship: TemplateStatusItem;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'import' | 'templates' | 'manage'>('import');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Track selection for spreadsheet import
  const [selectedTrack, setSelectedTrack] = useState<TrackName>('CONFERENCE TRACK');

  // Spreadsheet client-side preview state
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ParsedPreviewRow[]>([]);
  const [previewStats, setPreviewStats] = useState({ total: 0, valid: 0, duplicates: 0, skipped: 0 });
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Template window state
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateTarget, setTemplateTarget] = useState<'global' | 'conference' | 'beginner' | 'flagship'>('global');
  const [templateUploading, setTemplateUploading] = useState(false);
  const [templateMessage, setTemplateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [templatesStatus, setTemplatesStatus] = useState<TemplatesStatus | null>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);

  // Attendees list state
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [stats, setStats] = useState({ total: 0, conference: 0, beginner: 0, flagship: 0 });
  const [trackFilter, setTrackFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const router = useRouter();

  // Fetch attendees list and statistics
  const fetchAttendees = async () => {
    setLoadingAttendees(true);
    try {
      const res = await fetch('/api/attendees');
      if (res.ok) {
        const data = await res.json();
        setAttendees(data.attendees || []);
        setStats(data.stats || { total: data.count || 0, conference: 0, beginner: 0, flagship: 0 });
      } else if (res.status === 401) {
        router.push('/gdgr');
      }
    } catch (error) {
      console.error('Failed to fetch attendees:', error);
    } finally {
      setLoadingAttendees(false);
    }
  };

  // Fetch certificate template statuses
  const fetchTemplateStatus = async () => {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplatesStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to fetch template status:', error);
    }
  };

  useEffect(() => {
    fetchAttendees();
    fetchTemplateStatus();
  }, []);

  // Handle client-side file selection and generate preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewFile(file);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

        const rows: ParsedPreviewRow[] = [];
        const seenTickets = new Set<string>();
        let validCount = 0;
        let skippedCount = 0;
        let duplicateCount = 0;

        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length < 2) {
            skippedCount++;
            continue;
          }

          const rawTicket = row[0]?.toString().trim();
          const rawName = row[1]?.toString().trim();

          if (!rawTicket || !rawName) {
            skippedCount++;
            continue;
          }

          // Header detection
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
            skippedCount++;
            continue;
          }

          const ticketId = rawTicket.toUpperCase();
          const formattedName = rawName
            .toLowerCase()
            .split(/\s+/)
            .filter(Boolean)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          const isDuplicate = seenTickets.has(ticketId);
          if (isDuplicate) {
            duplicateCount++;
          } else {
            seenTickets.add(ticketId);
            validCount++;
          }

          rows.push({
            rowNum: i + 1,
            ticketId,
            name: formattedName,
            track: selectedTrack,
            certNumber: generateCertificateNumber(ticketId, selectedTrack),
            isValid: !isDuplicate,
          });
        }

        setPreviewData(rows);
        setPreviewStats({
          total: rows.length,
          valid: validCount,
          duplicates: duplicateCount,
          skipped: skippedCount,
        });
        setShowPreviewModal(true);
      } catch (err) {
        console.error('Error parsing spreadsheet:', err);
        setMessage({
          type: 'error',
          text: 'Failed to read spreadsheet file. Please ensure it is a valid .xlsx, .xls, or .csv file.',
        });
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Submit parsed data to database
  const handleConfirmImport = async () => {
    if (!previewFile) return;

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', previewFile);
    formData.append('track', selectedTrack);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setShowPreviewModal(false);
        setPreviewFile(null);
        setPreviewData([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchAttendees();
      } else {
        setMessage({ type: 'error', text: data.error || 'Import failed.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred during import.' });
    } finally {
      setUploading(false);
    }
  };

  // Upload certificate template
  const handleTemplateUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateFile) return;

    setTemplateUploading(true);
    setTemplateMessage(null);

    const formData = new FormData();
    formData.append('template', templateFile);
    formData.append('target', templateTarget);

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setTemplateMessage({ type: 'success', text: data.message });
        setTemplateFile(null);
        if (templateInputRef.current) templateInputRef.current.value = '';
        fetchTemplateStatus();
      } else {
        setTemplateMessage({ type: 'error', text: data.error || 'Template upload failed.' });
      }
    } catch (error) {
      setTemplateMessage({ type: 'error', text: 'An unexpected error occurred uploading template.' });
    } finally {
      setTemplateUploading(false);
    }
  };

  // Handle attendee deletion
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this attendee record?')) return;

    try {
      const res = await fetch(`/api/attendees?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAttendees();
      } else {
        alert('Failed to delete attendee');
      }
    } catch (error) {
      alert('Error deleting attendee');
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBF0] text-[#111] font-sans flex flex-col selection:bg-[#FBBC05] selection:text-black">
      {/* Header Bar */}
      <header className="w-full bg-[#FFFBF0] border-b-2 border-black sticky top-0 z-50">
        <div className="google-stripe" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full border-2 border-black bg-[#4285F4] text-white flex items-center justify-center font-black text-xs shadow-[2px_2px_0_0_#000]">
                GDG
              </div>
              <div>
                <span className="font-black text-sm uppercase tracking-tight text-[#111]">
                  DevFest Ranchi 2026
                </span>
                <span className="block text-[10px] font-bold text-[#555] -mt-0.5">
                  Admin & Management Console
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black bg-white hover:bg-[#FFF8E7] text-[#111] font-black text-xs uppercase tracking-wider shadow-[1.5px_1.5px_0_0_#000] transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Public View</span>
            </Link>

            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                router.push('/gdgr');
                router.refresh();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-black bg-[#EA4335] text-white font-black text-xs uppercase tracking-wider shadow-[1.5px_1.5px_0_0_#000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Track Stats Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-[20px] border-[3px] border-black bg-white p-4 sm:p-5 shadow-[4px_4px_0_0_#000] flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full border-2 border-black bg-[#111] text-white flex items-center justify-center font-black shadow-[2px_2px_0_0_#000] shrink-0">
              <Users className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[#666]">
                Total Attendees
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-[#111]">{stats.total}</h3>
            </div>
          </div>

          <div className="rounded-[20px] border-[3px] border-black bg-white p-4 sm:p-5 shadow-[4px_4px_0_0_#000] flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full border-2 border-black bg-[#4285F4] text-white flex items-center justify-center font-black shadow-[2px_2px_0_0_#000] shrink-0">
              <span className="text-xs font-black">CONF</span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[#4285F4]">
                Conference
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-[#111]">{stats.conference}</h3>
            </div>
          </div>

          <div className="rounded-[20px] border-[3px] border-black bg-white p-4 sm:p-5 shadow-[4px_4px_0_0_#000] flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full border-2 border-black bg-[#34A853] text-white flex items-center justify-center font-black shadow-[2px_2px_0_0_#000] shrink-0">
              <span className="text-xs font-black">BEG</span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[#34A853]">
                Beginner
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-[#111]">{stats.beginner}</h3>
            </div>
          </div>

          <div className="rounded-[20px] border-[3px] border-black bg-white p-4 sm:p-5 shadow-[4px_4px_0_0_#000] flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full border-2 border-black bg-[#FBBC05] text-[#111] flex items-center justify-center font-black shadow-[2px_2px_0_0_#000] shrink-0">
              <span className="text-xs font-black">DEV</span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[#B06000]">
                Flagship Dev
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-[#111]">{stats.flagship}</h3>
            </div>
          </div>
        </div>

        {/* Neo-Brutalist Navigation Tabs */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={() => setActiveTab('import')}
            className={`px-5 py-2.5 rounded-full border-2 border-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'import'
                ? 'bg-[#4285F4] text-white shadow-[3px_3px_0_0_#000]'
                : 'bg-white text-[#111] shadow-[2px_2px_0_0_#000] hover:bg-[#FFF8E7]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Track Data</span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`px-5 py-2.5 rounded-full border-2 border-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'templates'
                ? 'bg-[#FBBC05] text-[#111] shadow-[3px_3px_0_0_#000]'
                : 'bg-white text-[#111] shadow-[2px_2px_0_0_#000] hover:bg-[#FFF8E7]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Certificate Templates Window</span>
          </button>

          <button
            onClick={() => setActiveTab('manage')}
            className={`px-5 py-2.5 rounded-full border-2 border-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'manage'
                ? 'bg-[#34A853] text-white shadow-[3px_3px_0_0_#000]'
                : 'bg-white text-[#111] shadow-[2px_2px_0_0_#000] hover:bg-[#FFF8E7]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Manage Attendees ({stats.total})</span>
          </button>
        </div>

        {/* TAB 1: IMPORT ATTENDEE DATA WITH TRACK & PREVIEW WINDOW */}
        {activeTab === 'import' && (
          <div className="space-y-6">
            <div className="rounded-[24px] border-[3px] border-black bg-white p-6 sm:p-8 shadow-[6px_6px_0_0_#000] space-y-6">
              <div className="space-y-1">
                <span className="text-xs font-black uppercase tracking-[0.08em] text-[#4285F4]">
                  TRACK-WISE BATCH IMPORT
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#111]">
                  Import Attendee Spreadsheet with Live Preview
                </h2>
                <p className="text-xs sm:text-sm font-semibold text-[#555]">
                  Select the track for your sheet, choose your Excel/CSV file, inspect the preview window, and confirm import.
                </p>
              </div>

              {/* Step 1: Track Selector */}
              <div className="space-y-2.5">
                <label className="block text-xs font-black uppercase tracking-wider text-[#111]">
                  Step 1: Select Event Track for This Sheet
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {TRACKS.map((t) => {
                    const isSelected = selectedTrack === t.name;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTrack(t.name)}
                        className={`p-4 rounded-2xl border-2 border-black text-left transition-all cursor-pointer flex items-center gap-3 ${
                          isSelected
                            ? 'bg-[#FFF8E7] shadow-[3.5px_3.5px_0_0_#000] translate-x-[-1px] translate-y-[-1px]'
                            : 'bg-white shadow-[2px_2px_0_0_#000] hover:bg-[#FFFBF0]'
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center font-black text-xs text-white shrink-0 shadow-[1.5px_1.5px_0_0_#000]"
                          style={{ backgroundColor: t.color }}
                        >
                          {t.code}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-xs uppercase tracking-tight text-[#111] truncate">
                            {t.name}
                          </p>
                          <p className="text-[10px] font-mono font-bold text-[#666]">
                            Code: {t.code}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#34A853] text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: File Picker */}
              <div className="space-y-2.5">
                <label className="block text-xs font-black uppercase tracking-wider text-[#111]">
                  Step 2: Choose Excel or CSV Spreadsheet
                </label>
                <div className="rounded-2xl border-2 border-dashed border-black bg-[#FFF8E7] p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full border-2 border-black bg-[#4285F4] text-white flex items-center justify-center mx-auto shadow-[2px_2px_0_0_#000]">
                    <Upload className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-[#111]">
                      Select or drop your attendee spreadsheet
                    </p>
                    <p className="text-[11px] font-semibold text-[#666] mt-0.5">
                      Accepts .xlsx, .xls, and .csv files (Column 1: Ticket Order ID, Column 2: Attendee Name)
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    className="block mx-auto text-xs font-mono font-bold text-[#111] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-2 file:border-black file:text-xs file:font-black file:uppercase file:bg-[#4285F4] file:text-white file:shadow-[2px_2px_0_0_#000] hover:file:bg-[#1a73e8] cursor-pointer"
                  />
                </div>
              </div>

              {/* Status Banner */}
              {message && (
                <div
                  className={`rounded-xl border-2 border-black p-4 text-xs font-bold shadow-[2px_2px_0_0_#000] flex items-center gap-2.5 ${
                    message.type === 'success'
                      ? 'bg-[#E6F4EA] text-[#137333]'
                      : 'bg-[#FCE8E6] text-[#C5221F]'
                  }`}
                >
                  {message.type === 'success' ? (
                    <Check className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <p>{message.text}</p>
                </div>
              )}
            </div>

            {/* PREVIEW WINDOW / MODAL */}
            {showPreviewModal && previewFile && (
              <div className="rounded-[24px] border-[3px] border-black bg-white p-6 sm:p-8 shadow-[6px_6px_0_0_#000] space-y-5 animate-in fade-in duration-200">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b-2 border-black">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-black bg-[#FBBC05] text-[#111] flex items-center justify-center font-black shadow-[2px_2px_0_0_#000]">
                      <Eye className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#4285F4]">
                        DATA IMPORT AUDIT PREVIEW
                      </span>
                      <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-[#111]">
                        {previewFile.name}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full border-2 border-black bg-[#FFF8E7] text-xs font-black uppercase tracking-wider shadow-[1.5px_1.5px_0_0_#000]">
                      Track: {selectedTrack}
                    </span>
                    <button
                      onClick={() => setShowPreviewModal(false)}
                      className="p-1.5 rounded-full border border-black hover:bg-[#FCE8E6] text-[#EA4335] transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Preview Metrics Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-black/20 bg-[#FFF8E7] p-3 text-center">
                    <span className="text-[10px] font-black uppercase text-[#666] block">Total Rows</span>
                    <span className="text-base font-black text-[#111]">{previewStats.total}</span>
                  </div>
                  <div className="rounded-xl border border-black/20 bg-[#E6F4EA] p-3 text-center">
                    <span className="text-[10px] font-black uppercase text-[#137333] block">Valid Attendees</span>
                    <span className="text-base font-black text-[#137333]">{previewStats.valid}</span>
                  </div>
                  <div className="rounded-xl border border-black/20 bg-[#FEF7E0] p-3 text-center">
                    <span className="text-[10px] font-black uppercase text-[#B06000] block">Duplicates</span>
                    <span className="text-base font-black text-[#B06000]">{previewStats.duplicates}</span>
                  </div>
                  <div className="rounded-xl border border-black/20 bg-white p-3 text-center">
                    <span className="text-[10px] font-black uppercase text-[#666] block">Skipped/Headers</span>
                    <span className="text-base font-black text-[#666]">{previewStats.skipped}</span>
                  </div>
                </div>

                {/* Preview Table */}
                <div className="rounded-xl border-2 border-black overflow-hidden shadow-[2px_2px_0_0_#000]">
                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-xs font-semibold">
                      <thead className="bg-[#FFF8E7] border-b-2 border-black font-black uppercase text-[10px] text-[#111] sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-2.5">#</th>
                          <th className="px-4 py-2.5">Ticket ID</th>
                          <th className="px-4 py-2.5">Attendee Name</th>
                          <th className="px-4 py-2.5">Track</th>
                          <th className="px-4 py-2.5">Generated Certificate No.</th>
                          <th className="px-4 py-2.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/10 bg-white">
                        {previewData.slice(0, 15).map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#FFFBF0]">
                            <td className="px-4 py-2 text-[#888] font-mono text-[11px]">{row.rowNum}</td>
                            <td className="px-4 py-2 font-mono font-bold text-xs text-[#4285F4]">{row.ticketId}</td>
                            <td className="px-4 py-2 font-black text-[#111]">{row.name}</td>
                            <td className="px-4 py-2">
                              <span className="px-2 py-0.5 rounded-full border border-black bg-[#E8F0FE] text-[#1967D2] text-[9px] font-black uppercase">
                                {row.track}
                              </span>
                            </td>
                            <td className="px-4 py-2 font-mono text-xs font-bold text-[#111]">{row.certNumber}</td>
                            <td className="px-4 py-2 text-right">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[#137333] font-bold text-[10px]">
                                  <Check className="w-3 h-3 stroke-[3]" /> Valid
                                </span>
                              ) : (
                                <span className="text-[#C5221F] font-bold text-[10px]">Duplicate</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {previewData.length > 15 && (
                    <div className="p-2.5 bg-[#FFF8E7] border-t border-black/10 text-center text-[11px] font-bold text-[#666]">
                      Showing first 15 of {previewData.length} preview rows. All {previewStats.valid} valid records will be synced upon confirmation.
                    </div>
                  )}
                </div>

                {/* Confirmation Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPreviewModal(false);
                      setPreviewFile(null);
                      setPreviewData([]);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="w-full sm:w-auto px-5 py-3 rounded-full border-2 border-black bg-white hover:bg-[#FFF8E7] text-[#111] font-black text-xs uppercase tracking-wider shadow-[2px_2px_0_0_#000] cursor-pointer"
                  >
                    Cancel / Choose Different File
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={uploading || previewStats.valid === 0}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-[#34A853] hover:bg-[#2d9147] text-white font-black text-xs sm:text-sm uppercase tracking-wider border-2 border-black shadow-[3.5px_3.5px_0_0_#000] hover:shadow-[1.5px_1.5px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-y-[3.5px] transition-all cursor-pointer disabled:opacity-60"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                        <span>Syncing {previewStats.valid} Attendees to Database...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm & Sync {previewStats.valid} Attendees</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DEDICATED WINDOW FOR UPLOAD/UPDATE CERTIFICATE TEMPLATE */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div className="rounded-[24px] border-[3px] border-black bg-white p-6 sm:p-8 shadow-[6px_6px_0_0_#000] space-y-6">
              <div className="space-y-1">
                <span className="text-xs font-black uppercase tracking-[0.08em] text-[#FBBC05]">
                  TEMPLATE MANAGEMENT CONSOLE
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#111]">
                  Certificate Template Window & Status
                </h2>
                <p className="text-xs sm:text-sm font-semibold text-[#555]">
                  Upload and update global or track-specific high-resolution PDF certificate templates.
                </p>
              </div>

              {/* Templates Status Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Universal / Global */}
                <div className="rounded-2xl border-2 border-black bg-[#FFF8E7] p-4 shadow-[3px_3px_0_0_#000] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full border border-black bg-white text-[10px] font-black uppercase">
                      Universal
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[#666]">
                      {templatesStatus?.global?.active ? `${templatesStatus.global.sizeKb} KB` : 'Default File'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase text-[#111]">Default Template</h4>
                    <p className="text-[11px] font-semibold text-[#666] mt-0.5">
                      Applied to all attendees unless a track template is active.
                    </p>
                  </div>
                  <div className="pt-1 flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase ${templatesStatus?.global?.active ? 'text-[#137333]' : 'text-[#4285F4]'}`}>
                      {templatesStatus?.global?.active ? '● Active in DB' : '● Default Fallback'}
                    </span>
                    <a
                      href="/api/templates?download=global"
                      className="p-1.5 rounded-full border border-black bg-white hover:bg-[#FFFBF0] text-[#111] shadow-[1px_1px_0_0_#000]"
                      title="Download Current PDF Template"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* 2. Conference Track */}
                <div className="rounded-2xl border-2 border-black bg-[#E8F0FE] p-4 shadow-[3px_3px_0_0_#000] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full border border-black bg-[#4285F4] text-white text-[10px] font-black uppercase">
                      CONF
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[#666]">
                      {templatesStatus?.conference?.active ? `${templatesStatus.conference.sizeKb} KB` : 'Inherits Global'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase text-[#111]">Conference Track</h4>
                    <p className="text-[11px] font-semibold text-[#555] mt-0.5">
                      Custom override template for Conference Track attendees.
                    </p>
                  </div>
                  <div className="pt-1 flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase ${templatesStatus?.conference?.active ? 'text-[#137333]' : 'text-[#666]'}`}>
                      {templatesStatus?.conference?.active ? '● Custom Active' : '○ Inherits Global'}
                    </span>
                    <a
                      href="/api/templates?download=conference"
                      className="p-1.5 rounded-full border border-black bg-white hover:bg-[#FFFBF0] text-[#111] shadow-[1px_1px_0_0_#000]"
                      title="Download Current PDF Template"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* 3. Beginner Track */}
                <div className="rounded-2xl border-2 border-black bg-[#E6F4EA] p-4 shadow-[3px_3px_0_0_#000] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full border border-black bg-[#34A853] text-white text-[10px] font-black uppercase">
                      BEG
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[#666]">
                      {templatesStatus?.beginner?.active ? `${templatesStatus.beginner.sizeKb} KB` : 'Inherits Global'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase text-[#111]">Beginner Track</h4>
                    <p className="text-[11px] font-semibold text-[#555] mt-0.5">
                      Custom override template for Beginner Track attendees.
                    </p>
                  </div>
                  <div className="pt-1 flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase ${templatesStatus?.beginner?.active ? 'text-[#137333]' : 'text-[#666]'}`}>
                      {templatesStatus?.beginner?.active ? '● Custom Active' : '○ Inherits Global'}
                    </span>
                    <a
                      href="/api/templates?download=beginner"
                      className="p-1.5 rounded-full border border-black bg-white hover:bg-[#FFFBF0] text-[#111] shadow-[1px_1px_0_0_#000]"
                      title="Download Current PDF Template"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* 4. Flagship Dev Track */}
                <div className="rounded-2xl border-2 border-black bg-[#FEF7E0] p-4 shadow-[3px_3px_0_0_#000] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full border border-black bg-[#FBBC05] text-[#111] text-[10px] font-black uppercase">
                      DEV
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[#666]">
                      {templatesStatus?.flagship?.active ? `${templatesStatus.flagship.sizeKb} KB` : 'Inherits Global'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase text-[#111]">Flagship Dev Track</h4>
                    <p className="text-[11px] font-semibold text-[#555] mt-0.5">
                      Custom override template for Flagship Dev attendees.
                    </p>
                  </div>
                  <div className="pt-1 flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase ${templatesStatus?.flagship?.active ? 'text-[#137333]' : 'text-[#666]'}`}>
                      {templatesStatus?.flagship?.active ? '● Custom Active' : '○ Inherits Global'}
                    </span>
                    <a
                      href="/api/templates?download=flagship"
                      className="p-1.5 rounded-full border border-black bg-white hover:bg-[#FFFBF0] text-[#111] shadow-[1px_1px_0_0_#000]"
                      title="Download Current PDF Template"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Upload Form */}
              <form onSubmit={handleTemplateUpload} className="rounded-2xl border-2 border-black bg-[#FFFBF0] p-6 space-y-5">
                <h3 className="font-black text-base uppercase tracking-tight text-[#111]">
                  Upload or Replace Certificate Template
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-wider text-[#111]">
                      Target Template
                    </label>
                    <select
                      value={templateTarget}
                      onChange={(e) => setTemplateTarget(e.target.value as any)}
                      className="w-full h-11 px-3 rounded-xl border-2 border-black bg-white text-xs font-black uppercase tracking-wider text-[#111] shadow-[2px_2px_0_0_#000] outline-none"
                    >
                      <option value="global">Universal / Default Template (All Tracks)</option>
                      <option value="conference">Conference Track Override Template</option>
                      <option value="beginner">Beginner Track Override Template</option>
                      <option value="flagship">Flagship Dev Track Override Template</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-wider text-[#111]">
                      PDF Template File (.pdf)
                    </label>
                    <input
                      ref={templateInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
                      className="block w-full text-xs font-mono font-bold text-[#111] file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-2 file:border-black file:text-xs file:font-black file:uppercase file:bg-[#FBBC05] file:text-[#111] file:shadow-[2px_2px_0_0_#000] hover:file:bg-[#e2a800] cursor-pointer"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-[#666]">
                    Template is stored securely in base64 in database. Changes reflect instantly.
                  </p>

                  <button
                    type="submit"
                    disabled={templateUploading || !templateFile}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FBBC05] hover:bg-[#e2a800] text-[#111] font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0_0_#000] hover:shadow-[1px_1px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-y-[3px] transition-all cursor-pointer disabled:opacity-60"
                  >
                    {templateUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                        <span>Updating Template...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Upload & Apply Template</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {templateMessage && (
                <div
                  className={`rounded-xl border-2 border-black p-4 text-xs font-bold shadow-[2px_2px_0_0_#000] flex items-center gap-2.5 ${
                    templateMessage.type === 'success'
                      ? 'bg-[#E6F4EA] text-[#137333]'
                      : 'bg-[#FCE8E6] text-[#C5221F]'
                  }`}
                >
                  {templateMessage.type === 'success' ? (
                    <Check className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <p>{templateMessage.text}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MANAGE ATTENDEES WITH TRACK FILTER & CERTIFICATE NUMBERS */}
        {activeTab === 'manage' &&
          (() => {
            const cleanQuery = searchQuery.toLowerCase().trim();
            const filteredAttendees = attendees.filter((a) => {
              // Track filter
              if (trackFilter !== 'all' && a.track !== trackFilter) {
                return false;
              }
              // Search query
              if (!cleanQuery) return true;
              return (
                a.name.toLowerCase().includes(cleanQuery) ||
                a.ticketId.toLowerCase().includes(cleanQuery) ||
                (a.certNumber && a.certNumber.toLowerCase().includes(cleanQuery))
              );
            });

            const totalPages = Math.max(1, Math.ceil(filteredAttendees.length / pageSize));
            const paginatedAttendees = filteredAttendees.slice(
              (currentPage - 1) * pageSize,
              currentPage * pageSize
            );

            return (
              <div className="rounded-[24px] border-[3px] border-black bg-white shadow-[6px_6px_0_0_#000] overflow-hidden space-y-0">
                {/* Search & Actions Header */}
                <div className="p-5 sm:p-6 border-b-2 border-black flex flex-col gap-4 bg-[#FFFBF0]">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-[#111]">
                        Registered Attendees ({filteredAttendees.length}
                        {filteredAttendees.length !== attendees.length && ` of ${attendees.length}`})
                      </h2>
                      <p className="text-xs font-semibold text-[#555]">
                        Live attendee records with assigned track & certificate credentials.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Live Search Input */}
                      <div className="relative flex-1 sm:w-72">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                          }}
                          placeholder="Search name, ticket ID, or cert..."
                          className="w-full h-9 pl-9 pr-3 rounded-full border-2 border-black bg-white text-xs font-mono font-bold text-[#111] placeholder:text-[#888] shadow-[2px_2px_0_0_#000] outline-none focus:border-[#4285F4]"
                        />
                        <Search className="w-3.5 h-3.5 text-black absolute left-3 top-2.5 pointer-events-none" />
                      </div>

                      <button
                        onClick={fetchAttendees}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-black bg-white hover:bg-[#FFF8E7] text-[#111] font-black text-xs uppercase tracking-wider shadow-[1.5px_1.5px_0_0_#000] transition-all cursor-pointer shrink-0"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingAttendees ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                      </button>
                    </div>
                  </div>

                  {/* Track Filter Pills */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-black/10">
                    <span className="text-[11px] font-black uppercase text-[#666] mr-1">Filter Track:</span>
                    <button
                      onClick={() => {
                        setTrackFilter('all');
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1 rounded-full border text-xs font-black uppercase transition-all ${
                        trackFilter === 'all'
                          ? 'border-black bg-[#111] text-white shadow-[1.5px_1.5px_0_0_#000]'
                          : 'border-black/30 bg-white text-[#555] hover:bg-[#FFF8E7]'
                      }`}
                    >
                      All ({stats.total})
                    </button>
                    <button
                      onClick={() => {
                        setTrackFilter('CONFERENCE TRACK');
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1 rounded-full border text-xs font-black uppercase transition-all ${
                        trackFilter === 'CONFERENCE TRACK'
                          ? 'border-black bg-[#4285F4] text-white shadow-[1.5px_1.5px_0_0_#000]'
                          : 'border-black/30 bg-white text-[#555] hover:bg-[#FFF8E7]'
                      }`}
                    >
                      Conference ({stats.conference})
                    </button>
                    <button
                      onClick={() => {
                        setTrackFilter('BEGINNER TRACK');
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1 rounded-full border text-xs font-black uppercase transition-all ${
                        trackFilter === 'BEGINNER TRACK'
                          ? 'border-black bg-[#34A853] text-white shadow-[1.5px_1.5px_0_0_#000]'
                          : 'border-black/30 bg-white text-[#555] hover:bg-[#FFF8E7]'
                      }`}
                    >
                      Beginner ({stats.beginner})
                    </button>
                    <button
                      onClick={() => {
                        setTrackFilter('FLAGSHIP DEV TRACK');
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1 rounded-full border text-xs font-black uppercase transition-all ${
                        trackFilter === 'FLAGSHIP DEV TRACK'
                          ? 'border-black bg-[#FBBC05] text-[#111] shadow-[1.5px_1.5px_0_0_#000]'
                          : 'border-black/30 bg-white text-[#555] hover:bg-[#FFF8E7]'
                      }`}
                    >
                      Flagship Dev ({stats.flagship})
                    </button>
                  </div>
                </div>

                {/* Attendees Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-semibold">
                    <thead className="bg-[#FFF8E7] border-b-2 border-black font-black uppercase text-[11px] text-[#111]">
                      <tr>
                        <th className="px-6 py-3.5">Attendee Name</th>
                        <th className="px-6 py-3.5">Ticket Order ID</th>
                        <th className="px-6 py-3.5">Event Track</th>
                        <th className="px-6 py-3.5">Certificate Number</th>
                        <th className="px-6 py-3.5">Registration Date</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/10">
                      {paginatedAttendees.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-[#888] font-bold">
                            {searchQuery ? 'No attendees match your search query.' : 'No attendee records found.'}
                          </td>
                        </tr>
                      ) : (
                        paginatedAttendees.map((attendee) => {
                          const trackMeta = TRACKS.find((t) => t.name === attendee.track) || TRACKS[0];
                          return (
                            <tr key={attendee.id} className="hover:bg-[#FFFBF0] transition-colors">
                              <td className="px-6 py-3.5 font-black text-sm text-[#111]">
                                {attendee.name}
                              </td>
                              <td className="px-6 py-3.5 font-mono font-bold text-xs text-[#4285F4]">
                                {attendee.ticketId}
                              </td>
                              <td className="px-6 py-3.5">
                                <span className={`px-2.5 py-1 rounded-full border-2 border-black text-[10px] font-black uppercase tracking-wider shadow-[1px_1px_0_0_#000] ${trackMeta.badgeClass}`}>
                                  {attendee.track}
                                </span>
                              </td>
                              <td className="px-6 py-3.5 font-mono font-bold text-xs text-[#111]">
                                {attendee.certNumber}
                              </td>
                              <td className="px-6 py-3.5 text-[#555]">
                                {new Date(attendee.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-3.5 text-right flex items-center justify-end gap-2">
                                <Link
                                  href={`/verify/${encodeURIComponent(attendee.ticketId)}`}
                                  target="_blank"
                                  className="p-1.5 rounded-full border border-black bg-white hover:bg-[#FFF8E7] text-[#111] shadow-[1px_1px_0_0_#000]"
                                  title="View Public Verification Audit"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>

                                <button
                                  onClick={() => handleDelete(attendee.id)}
                                  className="p-1.5 rounded-full border border-black bg-white text-[#EA4335] hover:bg-[#FCE8E6] shadow-[1px_1px_0_0_#000] transition-all cursor-pointer"
                                  title="Delete Attendee"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="p-4 border-t-2 border-black bg-[#FFFBF0] flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs font-bold text-[#666]">
                      Showing {(currentPage - 1) * pageSize + 1} to{' '}
                      {Math.min(currentPage * pageSize, filteredAttendees.length)} of{' '}
                      {filteredAttendees.length} attendees
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-black bg-white hover:bg-[#FFF8E7] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-black uppercase tracking-wider shadow-[1.5px_1.5px_0_0_#000]"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Prev</span>
                      </button>

                      <span className="text-xs font-black font-mono px-3 py-1 rounded-full border border-black bg-[#FBBC05] text-[#111] shadow-[1.5px_1.5px_0_0_#000]">
                        {currentPage} / {totalPages}
                      </span>

                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-black bg-white hover:bg-[#FFF8E7] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-black uppercase tracking-wider shadow-[1.5px_1.5px_0_0_#000]"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
      </main>
    </div>
  );
}
