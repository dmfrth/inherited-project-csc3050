import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";

import teamsRouter from "./routes/teams.js";
import { logEvent } from "./lib/logger.js";

const app = express();

// OWASP: A05:2021 Security Misconfiguration - helmet sets protective HTTP headers
// (X-Content-Type-Options, frame and referrer policies, etc.) and removes the
// X-Powered-By header that would advertise "Express" to attackers.
app.use(helmet());

// OWASP: A05:2021 Security Misconfiguration - CORS is an explicit allow-list from
// the environment rather than "*", so only the intended front end origin(s) may
// call the API from a browser. (Requests without an Origin header, such as the
// Vite proxy and curl, are unaffected.)
const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false); // no CORS headers => browser blocks the response
    }
  })
);

// OWASP: A05:2021 Security Misconfiguration - cap request body size so oversized
// payloads are refused before they are parsed or stored.
app.use(express.json({ limit: "100kb" }));

// Main API route
app.use("/api/teams", teamsRouter);

// Handle unknown API routes
app.use((req, res) => {
  res.status(404).json({
    error: { code: "ROUTE_NOT_FOUND", message: "The requested API route does not exist." }
  });
});

// Central error handler.
// OWASP: A05:2021 Security Misconfiguration - clients only ever receive generic
// messages; stack traces and internals are logged on the server (A09) and never sent.
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      error: { code: "INVALID_JSON", message: "The request body contains invalid JSON." }
    });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      error: { code: "PAYLOAD_TOO_LARGE", message: "The request body is too large." }
    });
  }

  logEvent("error", "unhandled_error", {
    method: req.method,
    path: req.originalUrl,
    message: err.message,
    stack: err.stack
  });

  return res.status(500).json({
    error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected server error occurred." }
  });
});

export default app;