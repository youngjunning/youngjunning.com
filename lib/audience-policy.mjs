import { containsCredential } from './source-credentials.mjs';
export function assertContentAudience(text, audience) {
  if (!['public', 'company'].includes(audience)) throw new Error('An explicit receiving audience is required');
  if (containsCredential(text)) throw new Error('Audience policy: credential-shaped content');
  if (audience === 'public' && /(?:alibaba-inc\.com|atatech\.org|cdn\.fliggy\.com|\/(?:Users|home)\/[^\s"'<>]+|[A-Z]:\\Users\\|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.test(text)) throw new Error('Audience policy: internal or private locator');
  if (audience === 'company' && /(?:我(?:正在|计划|准备|想|打算).{0,20}(?:求职|跳槽|面试)|(?:我的|本人).{0,15}(?:薪资|薪酬|offer|手机号|住址|证件))/i.test(text)) throw new Error('Audience policy: personal sensitive information');
  // These checks only reject known signals. The review ledger must record a
  // separate semantic review of text, metadata, resources and the recipient.
}
