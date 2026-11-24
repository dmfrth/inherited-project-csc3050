// OWASP: A09:2021 Security Logging and Monitoring Failures - one structured JSON
// line per security-relevant event, written server-side only. Request bodies are
// never logged, so personal data and large payloads don't end up in logs.
export function logEvent(level, event, details = {}) {
  if (process.env.NODE_ENV === "test") return; // keep test output readable
  const line = JSON.stringify({ time: new Date().toISOString(), level, event, ...details });
  (level === "error" ? console.error : console.log)(line);
}