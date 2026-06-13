import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { OpenAIAgentsProvider } from '@corsair-dev/mcp';
import { Agent, run, tool } from '@openai/agents';
import { corsair } from '@/server/corsair';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { prompt } = await request.json();
  if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });

  // Set before SDK uses them
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
  process.env.OPENAI_BASE_URL = process.env.OPENAI_BASE_URL!;

  const tenantCorsair = corsair.withTenant(user.id) as any;

  const provider = new OpenAIAgentsProvider();
  const tools = provider.build({ corsair: tenantCorsair, tool });

  const agent = new Agent({
    name: 'operator-agent',
    model: 'gpt-4.1',
    instructions: `You are a helpful email and calendar assistant. You have access to the user's Gmail and Google Calendar through Corsair tools.
Use list_operations to discover available APIs, get_schema to understand required arguments, and run_script to execute them.
When sending emails or creating calendar events, always confirm what you did.
Be concise and action-oriented.`,
    tools,
  });

  const result = await run(agent, prompt);

  return NextResponse.json({ result: result.finalOutput });
}