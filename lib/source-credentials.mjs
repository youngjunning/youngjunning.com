export function containsCredential(text) {
  return /-----BEGIN [\w ]*PRIVATE KEY-----|\b(?:gh[pousr]_[\w]{20,}|sk-[\w-]{20,}|AKIA[A-Z0-9]{16}|LTAI[\w]{16,})|https?:\/\/[^\s/]+:[^\s/@]+@|(?:api[_-]?key|access[_-]?token|private[_-]?token|client[_-]?secret|token|secret|password)["']?\s*[=:]\s*["']?[A-Za-z0-9_+\/-]{16,}|(?:[?&](?:token|secret|signature|access_key)=)[^\s"'<>]{16,}|Bearer\s+[A-Za-z0-9_.-]{24,}/i.test(text);
}
