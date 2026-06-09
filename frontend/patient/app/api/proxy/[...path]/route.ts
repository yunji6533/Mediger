import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || '';
const API_KEY = process.env.API_KEY || '';

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join('/');
  const search = request.nextUrl.search;
  const targetUrl = `${API_URL}/${pathStr}${search}`;

  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['x-api-key'] = API_KEY;

  const res = await fetch(targetUrl, { method: request.method, headers });
  const data = await res.text();

  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET = handler;
export const POST = handler;
