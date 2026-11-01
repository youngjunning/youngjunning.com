import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatCompletion } from '../lib/chat-model.mjs';

const env = { DEEPSEEK_API_KEY: 'fixture-key', DEEPSEEK_BASE_URL: 'https://models.example/v1', DEEPSEEK_MODEL: 'fixture-model' };
test('SDK sends the configured model and auth to the compatible endpoint without thinking', async () => {
  const response = await createChatCompletion(env, { messages: [{ role: 'user', content: 'Return JSON' }] }, { fetcher: async (url, options) => {
    assert.equal(url, 'https://models.example/v1/chat/completions');
    assert.equal(new Headers(options.headers).get('authorization'), 'Bearer fixture-key');
    assert.equal(options.redirect, 'error');
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'fixture-model');
    assert.equal(body.thinking.type, 'disabled');
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: '{}' } }] });
  } });
  assert.equal(response.status, 200);
});
test('SDK does not retry provider errors or expose their bodies', async () => {
  let calls = 0;
  const response = await createChatCompletion(env, { messages: [] }, { fetcher: async () => {
    calls++;
    return Response.json({ error: { message: 'PRIVATE_PROVIDER_BODY' } }, { status: 429 });
  } });
  assert.equal(calls, 1);
  assert.equal(response.status, 429);
  assert.ok(!(await response.text()).includes('PRIVATE_PROVIDER_BODY'));
});
