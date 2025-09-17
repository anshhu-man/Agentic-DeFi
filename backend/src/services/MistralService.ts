import { Mistral } from '@mistralai/mistralai';
import { logger } from '../utils/logger';

export class MistralService {
  private client: Mistral;
  private model: string;

  constructor() {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      logger.warn('MISTRAL_API_KEY is not set in environment');
    }
    this.client = new Mistral({ apiKey: apiKey || '' });
    this.model = process.env.MISTRAL_MODEL || 'mistral-medium';
  }

  // Generic chat completion, returns raw string content
  async chatComplete(params: {
    system: string;
    user: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    const { system, user, temperature = 0.3, maxTokens = 500 } = params;

    const completion = await this.completeWithRetry({
      system,
      user,
      temperature,
      maxTokens,
    });

    const content = completion.choices?.[0]?.message?.content;
    let raw = '';
    if (Array.isArray(content)) {
      raw = content.map((c: any) => (typeof c === 'string' ? c : (c.text ?? ''))).join('');
    } else {
      raw = content ?? '';
    }
    raw = this.stripCodeFences(raw);
    return raw.trim();
  }

  // Convenience helper to enforce JSON response
  async chatCompleteJSON<T = any>(params: {
    system: string;
    user: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<T> {
    const raw = await this.chatComplete(params);
    try {
      return JSON.parse(raw) as T;
    } catch (e) {
      logger.error('Failed to parse Mistral JSON response', { raw });
      throw new Error('Mistral response was not valid JSON');
    }
  }

  // Internal: retry + fallback model on capacity errors
  private async completeWithRetry(params: {
    system: string;
    user: string;
    temperature: number;
    maxTokens: number;
  }) {
    const { system, user, temperature, maxTokens } = params;
    const primaryModel = this.model;
    const fallbackModel = process.env.MISTRAL_FALLBACK_MODEL || 'mistral-small';

    const attempt = async (model: string, tokens: number) => {
      return this.client.chat.complete({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature,
        maxTokens: tokens,
      });
    };

    try {
      return await attempt(primaryModel, maxTokens);
    } catch (e: any) {
      const status = e?.statusCode || e?.response?.status;
      const code = e?.code || e?.response?.data?.code;
      const isCapacity = status === 429 || code === '3505' || e?.message?.includes('capacity');

      if (isCapacity) {
        logger.warn('Mistral capacity hit, retrying with fallback or reduced tokens', { status, code });
        // Try fallback model first
        try {
          return await attempt(fallbackModel, Math.min(300, maxTokens));
        } catch (_e: any) {
          // Last resort: small backoff and retry primary with reduced tokens
          await new Promise(r => setTimeout(r, 500));
          return await attempt(primaryModel, Math.min(256, maxTokens));
        }
      }

      throw e;
    }
  }

  private stripCodeFences(text: string): string {
    return text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
  }
}

export default MistralService;
