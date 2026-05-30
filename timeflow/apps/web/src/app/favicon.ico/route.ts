import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

/** Legacy browsers request /favicon.ico — serve the app icon. */
export async function GET() {
  const iconPath = path.join(process.cwd(), 'public', 'favicon.png');
  const buffer = await readFile(iconPath);
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
