import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getTemplatesStatus, getTemplateBytes, invalidateTemplateCache } from '@/lib/template-cache';
import { cookies } from 'next/headers';

async function isAuthenticated() {
  const cookieStore = await cookies();
  return cookieStore.get('admin_session')?.value === 'true';
}

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const download = searchParams.get('download');

  if (download) {
    try {
      const trackName =
        download === 'conference'
          ? 'CONFERENCE TRACK'
          : download === 'beginner'
          ? 'BEGINNER TRACK'
          : download === 'flagship'
          ? 'FLAGSHIP DEV TRACK'
          : undefined;

      const templateBytes = await getTemplateBytes(trackName);
      return new NextResponse(Buffer.from(templateBytes), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Template_${download}.pdf"`,
        },
      });
    } catch (err) {
      return NextResponse.json({ error: 'Failed to download template' }, { status: 500 });
    }
  }

  try {
    const status = await getTemplatesStatus();
    return NextResponse.json({ status });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve template statuses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const template = formData.get('template') as File | null;
    const target = (formData.get('target') as string) || 'global';

    if (!template) {
      return NextResponse.json({ error: 'No template PDF received.' }, { status: 400 });
    }

    const bytes = await template.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Template = buffer.toString('base64');

    let configKey = 'template_data';
    let targetLabel = 'Global / Default Template';

    if (target === 'conference') {
      configKey = 'template_data_conf';
      targetLabel = 'Conference Track Template';
    } else if (target === 'beginner') {
      configKey = 'template_data_beg';
      targetLabel = 'Beginner Track Template';
    } else if (target === 'flagship') {
      configKey = 'template_data_dev';
      targetLabel = 'Flagship Dev Track Template';
    }

    await prisma.config.upsert({
      where: { key: configKey },
      update: { value: base64Template },
      create: { key: configKey, value: base64Template },
    });

    invalidateTemplateCache(configKey);

    return NextResponse.json({
      success: true,
      message: `${targetLabel} updated successfully.`,
    });
  } catch (error) {
    console.error('Template upload error:', error);
    return NextResponse.json({ error: 'Failed to upload template' }, { status: 500 });
  }
}

