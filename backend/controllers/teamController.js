import { prisma } from "../lib/prisma.js";
import { logEvent } from "../lib/logger.js";

// load a team together with its images in display order.
const withImages = { images: { orderBy: { position: "asc" } } };

// The database uses integer ids and a separate TeamImage table, but the API
// contract promises a string id and an images array of URL strings.
function toApi(team) {
  return {
    id: String(team.id),
    name: team.name,
    number: team.number,
    rookieYear: team.rookieYear,
    description: team.description,
    history: team.history,
    images: team.images.map((image) => image.url)
  };
}

function sendError(res, status, code, message, details) {
  const error = { code, message };
  if (details) error.details = details;
  return res.status(status).json({ error });
}

// validates input
const MAX = { name: 100, description: 2000, history: 20000, images: 20, url: 2000, number: 99999 };
const FIRST_FOUNDED = 1992;

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// OWASP: A03:2021 Injection - every field is checked for exact type, length and
// format before it reaches the database, so wrong or hostile input (including
// "javascript:" image URLs that could later be rendered in the page) is rejected
// at the edge. Database access itself uses only Prisma's parameterized queries.
function validateTeam(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return ["Request body must be a JSON object."];
  }
  const errors = [];
  const thisYear = new Date().getFullYear();

  if (typeof body.name !== "string" || body.name.trim() === "" || body.name.trim().length > MAX.name) {
    errors.push(`name is required and must be a non-empty string of at most ${MAX.name} characters.`);
  }
  if (!Number.isInteger(body.number) || body.number < 1 || body.number > MAX.number) {
    errors.push(`number is required and must be an integer from 1 to ${MAX.number}.`);
  }
  if (!Number.isInteger(body.rookieYear) || body.rookieYear < FIRST_FOUNDED || body.rookieYear > thisYear) {
    errors.push(`rookieYear is required and must be an integer from ${FIRST_FOUNDED} to ${thisYear}.`);
  }
  if (body.description !== undefined && (typeof body.description !== "string" || body.description.length > MAX.description)) {
    errors.push(`description must be a string of at most ${MAX.description} characters.`);
  }
  if (body.history !== undefined && (typeof body.history !== "string" || body.history.length > MAX.history)) {
    errors.push(`history must be a string of at most ${MAX.history} characters.`);
  }
  if (body.images !== undefined) {
    const ok =
      Array.isArray(body.images) &&
      body.images.length <= MAX.images &&
      body.images.every((url) => typeof url === "string" && url.length <= MAX.url && isHttpUrl(url));
    if (!ok) {
      errors.push(`images must be an array of at most ${MAX.images} http(s) URLs.`);
    }
  }
  return errors;
}

// route ids are only valid digits; anything else is treated as "not found".
function parseId(raw) {
  return /^\d{1,9}$/.test(raw) ? Number(raw) : null;
}

function teamFields(body) {
  return {
    name: body.name.trim(),
    number: body.number,
    rookieYear: body.rookieYear,
    description: body.description?.trim() ?? "",
    history: body.history?.trim() ?? ""
  };
}

const notFound = (res) =>
  sendError(res, 404, "TEAM_NOT_FOUND", "No team exists with that ID.");

// handlers
// Express 5 forwards rejected promises to the error handler in app.js, so these
// async handlers don't need their own try/catch for unexpected errors.

// GET /api/teams
export async function getAllTeams(req, res) {
  const teams = await prisma.team.findMany({ include: withImages, orderBy: { number: "asc" } });
  return res.status(200).json({ data: teams.map(toApi) });
}

// GET /api/teams/:id
export async function getTeamById(req, res) {
  const id = parseId(req.params.id);
  const team = id === null ? null : await prisma.team.findUnique({ where: { id }, include: withImages });
  if (!team) {
    logEvent("warn", "team_not_found", { method: req.method, path: req.originalUrl, ip: req.ip });
    return notFound(res);
  }
  return res.status(200).json({ data: toApi(team) });
}

// POST /api/teams
export async function createTeam(req, res) {
  const errors = validateTeam(req.body);
  if (errors.length > 0) {
    logEvent("warn", "validation_failed", { method: req.method, path: req.originalUrl, ip: req.ip, errors });
    return sendError(res, 400, "VALIDATION_ERROR", "The team information is invalid.", errors);
  }

  if (await prisma.team.findUnique({ where: { number: req.body.number } })) {
    logEvent("warn", "duplicate_team_number", { method: req.method, path: req.originalUrl, ip: req.ip });
    return sendError(res, 409, "DUPLICATE_TEAM_NUMBER", "A team with this number already exists.");
  }

  try {
    const team = await prisma.team.create({
      data: {
        ...teamFields(req.body),
        images: { create: (req.body.images ?? []).map((url, position) => ({ url, position })) }
      },
      include: withImages
    });
    logEvent("info", "team_created", { id: team.id, number: team.number, ip: req.ip });
    return res.status(201).json({ data: toApi(team) });
  } catch (err) {
    // guards from two requests with the same number passing the check above at once.
    if (err.code === "P2002") {
      return sendError(res, 409, "DUPLICATE_TEAM_NUMBER", "A team with this number already exists.");
    }
    throw err;
  }
}

// PUT /api/teams/:id
export async function updateTeam(req, res) {
  const id = parseId(req.params.id);
  const existing = id === null ? null : await prisma.team.findUnique({ where: { id } });
  if (!existing) {
    logEvent("warn", "team_not_found", { method: req.method, path: req.originalUrl, ip: req.ip });
    return notFound(res);
  }

  const errors = validateTeam(req.body);
  if (errors.length > 0) {
    logEvent("warn", "validation_failed", { method: req.method, path: req.originalUrl, ip: req.ip, errors });
    return sendError(res, 400, "VALIDATION_ERROR", "The team information is invalid.", errors);
  }

  const clash = await prisma.team.findUnique({ where: { number: req.body.number } });
  if (clash && clash.id !== id) {
    logEvent("warn", "duplicate_team_number", { method: req.method, path: req.originalUrl, ip: req.ip });
    return sendError(res, 409, "DUPLICATE_TEAM_NUMBER", "Another team already uses this team number.");
  }

  try {
    const team = await prisma.team.update({
      where: { id },
      data: {
        ...teamFields(req.body),
        // replace the whole image list in one atomic update.
        images: {
          deleteMany: {},
          create: (req.body.images ?? []).map((url, position) => ({ url, position }))
        }
      },
      include: withImages
    });
    logEvent("info", "team_updated", { id, ip: req.ip });
    return res.status(200).json({ data: toApi(team) });
  } catch (err) {
    if (err.code === "P2002") {
      return sendError(res, 409, "DUPLICATE_TEAM_NUMBER", "Another team already uses this team number.");
    }
    if (err.code === "P2025") return notFound(res); // deleted between check and update
    throw err;
  }
}

// DELETE /api/teams/:id
export async function deleteTeam(req, res) {
  const id = parseId(req.params.id);
  try {
    if (id === null) return notFound(res);
    await prisma.team.delete({ where: { id } }); // images removed by onDelete: Cascade
    logEvent("info", "team_deleted", { id, ip: req.ip });
    return res.status(204).send();
  } catch (err) {
    if (err.code === "P2025") {
      logEvent("warn", "team_not_found", { method: req.method, path: req.originalUrl, ip: req.ip });
      return notFound(res);
    }
    throw err;
  }
}