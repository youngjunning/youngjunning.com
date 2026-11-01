import OpenAI from 'openai';

export const DEFAULT_MODEL = 'deepseek-flash';
export const DEFAULT_BASE_URL = 'https://api.deepseek.com';
export const getModelApiKey = env => env.DEEPSEEK_API_KEY;
export const getModelName = env => env.DEEPSEEK_MODEL || DEFAULT_MODEL;
export const getModelBaseUrl = env => env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL;

/**
 * Keep application-owned retries and cancellation; never return provider bodies on errors.
 * @param {Record<string, string | undefined>} env
 * @param {object} parameters
 * @param {{ fetcher?: typeof fetch; signal?: AbortSignal }} [options]
 */
export async function createChatCompletion(env, parameters, { fetcher = fetch, signal } = {}) {
  const base = new URL(getModelBaseUrl(env));
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) throw new Error('Invalid model endpoint');
  const client = new OpenAI({
    apiKey: getModelApiKey(env),
    baseURL: base.href.replace(/\/+$/, ''),
    maxRetries: 0,
    timeout: 45000,
    fetch: (url, options) => fetcher(url, { ...options, redirect: 'error', cache: 'no-store' }),
  });
  try {
    return await client.chat.completions.create({ thinking: { type: 'disabled' }, ...parameters, model: getModelName(env) }, { signal }).asResponse();
  } catch (error) {
    if (error instanceof OpenAI.APIError && error.status) return new Response(null, { status: error.status });
    throw error;
  }
}
