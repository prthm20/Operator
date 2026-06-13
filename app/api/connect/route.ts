import { generateOAuthUrl } from 'corsair/oauth';
import { NextRequest, NextResponse } from 'next/server';
import { corsair } from '@/server/corsair';
import { createClient } from '@/lib/supabase/server';
import dotenv from 'dotenv';
import path from 'path/win32';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const REDIRECT_URI = `${process.env.APP_URL}/api/auth`;

console.log('REDIRECT_URI:', REDIRECT_URI); // add this
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const plugin = new URL(request.url).searchParams.get('plugin');
  if (!plugin) return NextResponse.json({ error: 'Missing plugin param' }, { status: 400 });

  const { url, state } = await generateOAuthUrl(corsair, plugin, {
    tenantId: user.id,
    redirectUri: REDIRECT_URI,
  });

  const response = NextResponse.redirect(url);
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10,
  });
  return response;
}