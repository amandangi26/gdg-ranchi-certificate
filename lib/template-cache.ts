import prisma from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';
import { getTrackCode } from './tracks';

// In-memory cache for templates by key (e.g. 'template_data', 'template_data_conf', etc.)
const cachedTemplates: Record<string, Uint8Array> = {};
const cacheTimestamps: Record<string, number> = {};
const CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutes

export function invalidateTemplateCache(key?: string) {
  if (key) {
    delete cachedTemplates[key];
    delete cacheTimestamps[key];
  } else {
    for (const k of Object.keys(cachedTemplates)) {
      delete cachedTemplates[k];
      delete cacheTimestamps[k];
    }
  }
}

/**
 * Returns template bytes for a specific track, falling back to global template, then filesystem fallback.
 */
export async function getTemplateBytes(trackName?: string): Promise<Uint8Array> {
  const trackCode = trackName ? getTrackCode(trackName).toLowerCase() : null;
  const specificKey = trackCode ? `template_data_${trackCode}` : null;
  const now = Date.now();

  // 1. Check if track-specific template is cached
  if (specificKey && cachedTemplates[specificKey] && now - (cacheTimestamps[specificKey] || 0) < CACHE_TTL_MS) {
    return cachedTemplates[specificKey];
  }

  // 2. Try track-specific template from DB
  if (specificKey) {
    try {
      const trackConfig = await prisma.config.findUnique({ where: { key: specificKey } });
      if (trackConfig && trackConfig.value) {
        const bytes = new Uint8Array(Buffer.from(trackConfig.value, 'base64'));
        cachedTemplates[specificKey] = bytes;
        cacheTimestamps[specificKey] = now;
        return bytes;
      }
    } catch (err) {
      console.warn(`Could not read ${specificKey} from DB:`, err);
    }
  }

  // 3. Check global template in cache
  const globalKey = 'template_data';
  if (cachedTemplates[globalKey] && now - (cacheTimestamps[globalKey] || 0) < CACHE_TTL_MS) {
    return cachedTemplates[globalKey];
  }

  // 4. Try global template from DB
  try {
    const config = await prisma.config.findUnique({ where: { key: globalKey } });
    if (config && config.value) {
      const bytes = new Uint8Array(Buffer.from(config.value, 'base64'));
      cachedTemplates[globalKey] = bytes;
      cacheTimestamps[globalKey] = now;
      return bytes;
    }
  } catch (err) {
    console.warn('Could not read global template from DB, trying filesystem fallback:', err);
  }

  // 5. Fallback to default file in public/uploads
  const defaultPath = path.join(process.cwd(), 'public', 'uploads', 'certificate_template.pdf');
  const fileBuffer = await fs.readFile(defaultPath);
  const bytes = new Uint8Array(fileBuffer);
  cachedTemplates[globalKey] = bytes;
  cacheTimestamps[globalKey] = now;
  return bytes;
}

/**
 * Checks the status of all available templates in the DB
 */
export async function getTemplatesStatus() {
  const keys = ['template_data', 'template_data_conf', 'template_data_beg', 'template_data_dev'];
  try {
    const configs = await prisma.config.findMany({
      where: { key: { in: keys } },
    });
    const map = new Map(configs.map((c) => [c.key, c.value]));

    return {
      global: {
        active: map.has('template_data'),
        sizeKb: map.has('template_data') ? Math.round((map.get('template_data')!.length * 3) / 4 / 1024) : 0,
      },
      conference: {
        active: map.has('template_data_conf'),
        sizeKb: map.has('template_data_conf') ? Math.round((map.get('template_data_conf')!.length * 3) / 4 / 1024) : 0,
      },
      beginner: {
        active: map.has('template_data_beg'),
        sizeKb: map.has('template_data_beg') ? Math.round((map.get('template_data_beg')!.length * 3) / 4 / 1024) : 0,
      },
      flagship: {
        active: map.has('template_data_dev'),
        sizeKb: map.has('template_data_dev') ? Math.round((map.get('template_data_dev')!.length * 3) / 4 / 1024) : 0,
      },
    };
  } catch (err) {
    return {
      global: { active: false, sizeKb: 0 },
      conference: { active: false, sizeKb: 0 },
      beginner: { active: false, sizeKb: 0 },
      flagship: { active: false, sizeKb: 0 },
    };
  }
}
