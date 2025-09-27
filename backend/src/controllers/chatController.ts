import { Router, Request, Response } from 'express';
import axios from 'axios';
import MistralService from '@/services/MistralService';
import { logger } from '@/utils/logger';

const router = Router();
const mistral = new MistralService();

type ChatMessageRow = {
  id?: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  created_at?: string;
};

function getSupabaseRestConfig(req: Request) {
  const SUPABASE_URL = process.env.SUPABASE_URL || '';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

  // Accept token via:
  // 1) Header: x-supabase-auth: Bearer <token> OR authorization: Bearer <token>
  // 2) Body: supabaseAccessToken
  // 3) Query: access_token
  let token =
    (req.headers['x-supabase-auth'] as string) ||
    (req.headers['authorization'] as string) ||
    (req.body?.supabaseAccessToken as string) ||
    (req.query?.access_token as string) ||
    '';

  // Normalize to raw token (strip Bearer)
  if (token?.toLowerCase().startsWith('bearer ')) {
    token = token.slice(7);
  }

  return { SUPABASE_URL, SUPABASE_ANON_KEY, token };
}

async function insertChatMessage(
  supabaseUrl: string,
  anonKey: string,
  userToken: string,
  row: ChatMessageRow
) {
  const url = `${supabaseUrl}/rest/v1/chat_messages`;
  const headers = {
    'Content-Type': 'application/json',
    apikey: anonKey,
    Authorization: `Bearer ${userToken}`,
    Prefer: 'return=representation',
  };

  const resp = await axios.post(url, row, { headers });
  // Supabase REST returns an array for return=representation
  return Array.isArray(resp.data) ? resp.data[0] : resp.data;
}

/**
 * POST /api/chat
 * body: { message: string, userId?: string, supabaseAccessToken?: string }
 * - Calls Mistral for assistant reply
 * - If Supabase access token provided, persists both user and assistant messages via Supabase REST with RLS
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, userId } = req.body as { message?: string; userId?: string };
    if (!message) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_MESSAGE', message: 'message is required' },
      });
    }

    const systemPrompt = `You are an AI DeFi assistant for a portfolio and market explorer. 
Provide concise, helpful answers and, when relevant, structured insights.`;
    const reply =
      (await mistral.chatComplete({
        system: systemPrompt,
        user: message,
        temperature: 0.3,
        maxTokens: 250,
      })) || '';

    // Attempt persistence if we have a Supabase access token and userId
    const { SUPABASE_URL, SUPABASE_ANON_KEY, token } = getSupabaseRestConfig(req);
    const model = process.env.MISTRAL_MODEL || 'mistral-medium';

    if (token && userId && SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        await insertChatMessage(SUPABASE_URL, SUPABASE_ANON_KEY, token, {
          user_id: userId,
          role: 'user',
          content: message,
          model,
        });
        await insertChatMessage(SUPABASE_URL, SUPABASE_ANON_KEY, token, {
          user_id: userId,
          role: 'assistant',
          content: reply,
          model,
        });
      } catch (e: any) {
        logger.warn('Supabase chat persistence failed', {
          error: e?.response?.data || e?.message || e,
        });
        // Do not fail the request if persistence fails
      }
    }

    return res.json({
      success: true,
      data: { reply, model },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error: any) {
    logger.error('POST /api/chat failed', { error: error?.message || error });
    return res.status(500).json({
      success: false,
      error: { code: 'CHAT_FAILED', message: 'Failed to process chat message' },
    });
  }
});

/**
 * GET /api/chat/history?userId=...&limit=...
 * - Reads chat messages for user from Supabase REST using the caller's Supabase JWT.
 * - Requires Authorization header or x-supabase-auth or access_token query param.
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || '';
    const limit = parseInt((req.query.limit as string) || '50', 10);
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_USER_ID', message: 'userId is required' },
      });
    }

    const { SUPABASE_URL, SUPABASE_ANON_KEY, token } = getSupabaseRestConfig(req);
    if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Supabase access token required' },
      });
    }

    const url = `${SUPABASE_URL}/rest/v1/chat_messages`;
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    };

    // RLS will ensure user can only read own rows
    const params = new URLSearchParams();
    params.set('user_id', `eq.${userId}`);
    params.set('select', '*');
    params.set('order', 'created_at.desc');
    params.set('limit', String(Math.min(Math.max(limit, 1), 200)));

    const resp = await axios.get(`${url}?${params.toString()}`, { headers });
    const rows = Array.isArray(resp.data) ? resp.data : [];

    return res.json({
      success: true,
      data: rows,
      meta: { count: rows.length, userId },
    });
  } catch (error: any) {
    logger.error('GET /api/chat/history failed', { error: error?.response?.data || error?.message || error });
    return res.status(500).json({
      success: false,
      error: { code: 'HISTORY_FAILED', message: 'Failed to fetch chat history' },
    });
  }
});

export default router;
