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

  // Convenience helper to enforce JSON response (robust parsing using sanitization and extraction)
  async chatCompleteJSON<T = any>(params: {
    system: string;
    user: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<T> {
    const raw = await this.chatComplete(params);
    const cleaned = this.sanitizeJson(raw);
    try {
      return JSON.parse(cleaned) as T;
    } catch (_e1) {
      const extracted = this.extractFirstJsonObject(cleaned);
      if (extracted) {
        try {
          return JSON.parse(extracted) as T;
        } catch (_e2) {
          // continue to final error
        }
      }
      logger.error('Failed to parse Mistral JSON response', { raw: raw.slice(0, 2000) });
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

  // Remove markdown artifacts, comments, and trailing commas to improve JSON parse robustness
  private sanitizeJson(text: string): string {
    let s = text || '';
    // Remove common markdown wrappers and bold markers
    s = s.replace(/```json|```/gi, '');
    s = s.replace(/\*\*/g, '');
    // Remove inline italic annotations like *(...)* inserted by LLMs
    s = s.replace(/\*\([^)]*\)\*/g, '');
    // Remove BOM and control chars except newline/tab
    s = s.replace(/^\uFEFF/, '');
    // Remove JavaScript style comments
    s = s.replace(/\/\*[\s\S]*?\*\//g, ''); // block comments
    s = s.replace(/(^|[^:])\/\/.*$/gm, '$1'); // line comments not in URLs
    // Remove trailing commas before } or ]
    s = s.replace(/,\s*([}\]])/g, '$1');
    // Trim and attempt to isolate JSON-like section if extra prose surrounds it
    // Heuristic: if content has multiple lines of prose before {, keep from first {
    const firstBrace = s.indexOf('{');
    if (firstBrace > 0) {
      s = s.slice(firstBrace);
    }
    return s.trim();
  }

  // Extract the first balanced JSON object substring to attempt parsing
  private extractFirstJsonObject(text: string): string | null {
    const s = text.trim();
    let depth = 0;
    let start = -1;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0 && start !== -1) {
          return s.slice(start, i + 1);
        }
      }
    }
    return null;
  }
}

export default MistralService;
