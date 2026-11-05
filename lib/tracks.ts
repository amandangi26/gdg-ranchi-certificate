import prisma from '@/lib/db';

export const TRACKS = [
  {
    id: 'conference',
    name: 'CONFERENCE TRACK',
    code: 'CONF',
    color: '#4285F4',
    bg: '#E8F0FE',
    border: '#4285F4',
    badgeClass: 'bg-[#E8F0FE] text-[#1967D2] border-[#4285F4]',
  },
  {
    id: 'beginner',
    name: 'BEGINNER TRACK',
    code: 'BEG',
    color: '#34A853',
    bg: '#E6F4EA',
    border: '#34A853',
    badgeClass: 'bg-[#E6F4EA] text-[#137333] border-[#34A853]',
  },
  {
    id: 'flagship',
    name: 'FLAGSHIP DEV TRACK',
    code: 'DEV',
    color: '#FBBC05',
    bg: '#FEF7E0',
    border: '#FBBC05',
    badgeClass: 'bg-[#FEF7E0] text-[#B06000] border-[#FBBC05]',
  },
] as const;

export type TrackId = typeof TRACKS[number]['id'];
export type TrackName = typeof TRACKS[number]['name'];

/**
 * Normalizes any track input string to one of the 3 official tracks
 */
export function normalizeTrackName(input?: string | null): string {
  if (!input) return 'CONFERENCE TRACK';
  const clean = input.trim().toUpperCase();
  if (clean.includes('BEGINNER')) return 'BEGINNER TRACK';
  if (clean.includes('FLAGSHIP') || clean.includes('DEV TRACK')) return 'FLAGSHIP DEV TRACK';
  if (clean.includes('CONFERENCE') || clean.includes('CONF')) return 'CONFERENCE TRACK';
  return clean;
}

/**
 * Returns the short code for a track (e.g. CONF, BEG, DEV)
 */
export function getTrackCode(trackName?: string | null): string {
  const normalized = normalizeTrackName(trackName);
  if (normalized === 'BEGINNER TRACK') return 'BEG';
  if (normalized === 'FLAGSHIP DEV TRACK') return 'DEV';
  return 'CONF';
}

/**
 * Generates an official Certificate Number
 * Format: GDGR-DF26-[TRACK_CODE]-[TICKET_ID]
 * Example: GDGR-DF26-CONF-45123, GDGR-DF26-BEG-178497, GDGR-DF26-DEV-011041
 */
export function generateCertificateNumber(ticketId: string, trackName?: string | null): string {
  const cleanTicket = ticketId.trim().toUpperCase();
  const trackCode = getTrackCode(trackName);
  return `GDGR-DF26-${trackCode}-${cleanTicket}`;
}

/**
 * Extracts raw ticketId from either a ticketId or a certificate number
 * Supports:
 * - 45123 -> 45123
 * - GDGR-DF26-CONF-45123 -> 45123
 * - GDGRDEVFEST26-BEG-178497 -> 178497
 * - GDGR26-DEV-011041 -> 011041
 */
export function extractTicketId(input: string): string {
  const clean = input.trim().toUpperCase();
  const match = clean.match(/(?:GDGR(?:DEVFEST)?(?:26|DF26)?-?(?:CONF|BEG|DEV|CT|BT|FT)?-?)(.+)$/i);
  if (match && match[1]) {
    const candidate = match[1].replace(/^[-_]+/, '');
    if (candidate) return candidate;
  }
  return clean;
}

// In-memory cache for track mapping: ticketId -> trackName
let cachedTracksMap: Record<string, string> | null = null;
let lastTrackCacheTime = 0;
const TRACK_CACHE_TTL = 1000 * 60 * 5; // 5 minutes

export function invalidateTrackCache() {
  cachedTracksMap = null;
  lastTrackCacheTime = 0;
}

/**
 * Retrieves all ticketId -> trackName mappings from Config table
 * Stored safely in Config table to avoid pushing any database schema changes to production.
 */
export async function getTrackMap(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedTracksMap && now - lastTrackCacheTime < TRACK_CACHE_TTL) {
    return cachedTracksMap;
  }

  try {
    const config = await prisma.config.findUnique({
      where: { key: 'track_mapping' },
    });

    if (config && config.value) {
      cachedTracksMap = JSON.parse(config.value);
      lastTrackCacheTime = now;
      return cachedTracksMap || {};
    }
  } catch (err) {
    console.error('Error reading track_mapping config:', err);
  }

  cachedTracksMap = {};
  lastTrackCacheTime = now;
  return {};
}

/**
 * Retrieves track for a specific ticketId
 */
export async function getTrackForTicket(ticketId: string): Promise<string> {
  const map = await getTrackMap();
  const clean = ticketId.trim().toUpperCase();
  return map[clean] || 'CONFERENCE TRACK';
}

/**
 * Saves/merges new track mappings into Config table
 */
export async function saveTrackMapping(newMappings: Record<string, string>): Promise<void> {
  const current = await getTrackMap();
  const updated = { ...current };

  for (const [ticket, track] of Object.entries(newMappings)) {
    updated[ticket.trim().toUpperCase()] = normalizeTrackName(track);
  }

  const jsonValue = JSON.stringify(updated);

  await prisma.config.upsert({
    where: { key: 'track_mapping' },
    update: { value: jsonValue },
    create: { key: 'track_mapping', value: jsonValue },
  });

  cachedTracksMap = updated;
  lastTrackCacheTime = Date.now();
}

/**
 * Removes a ticketId from the track mapping in Config
 */
export async function removeTrackForTicket(ticketId: string): Promise<void> {
  const current = await getTrackMap();
  const clean = ticketId.trim().toUpperCase();
  if (current[clean]) {
    delete current[clean];
    const jsonValue = JSON.stringify(current);
    await prisma.config.upsert({
      where: { key: 'track_mapping' },
      update: { value: jsonValue },
      create: { key: 'track_mapping', value: jsonValue },
    });
    cachedTracksMap = current;
    lastTrackCacheTime = Date.now();
  }
}

