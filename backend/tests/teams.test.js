import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";

import app from "../app.js";
import { resetDatabase } from "./helpers.js";
import { prisma } from "../lib/prisma.js";

describe("Teams REST API", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("GET /api/teams returns all teams", async () => {
    const response = await request(app)
      .get("/api/teams")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.data.length).toBe(3);
    expect(response.body.data[0]).toHaveProperty("name");
    expect(response.body.data[0]).toHaveProperty("number");
  });

  it("GET /api/teams/:id returns one team", async () => {
    const response = await request(app)
      .get("/api/teams/1")
      .expect(200);

    expect(response.body.data.id).toBe("1");
  });

  it("returns 404 when a team does not exist", async () => {
    const response = await request(app)
      .get("/api/teams/999")
      .expect(404);

    expect(response.body.error.code).toBe("TEAM_NOT_FOUND");
  });

  it("POST /api/teams creates a team", async () => {
    const newTeam = {
      name: "Test Robotics Team",
      number: 9999,
      rookieYear: 2020,
      description: "A team created during an automated test.",
      history: "Test history.",
      images: []
    };

    const response = await request(app)
      .post("/api/teams")
      .send(newTeam)
      .expect(201);

    expect(response.body.data.name).toBe(newTeam.name);
    expect(response.body.data.number).toBe(9999);
    expect(response.body.data.id).toBeDefined();
  });

  it("PUT /api/teams/:id updates a team", async () => {
    const updatedTeam = {
      name: "Updated Robotics Team",
      number: 1,
      rookieYear: 1992,
      description: "Updated description.",
      history: "Updated history.",
      images: []
    };

    const response = await request(app)
      .put("/api/teams/1")
      .send(updatedTeam)
      .expect(200);

    expect(response.body.data.name).toBe("Updated Robotics Team");
    expect(response.body.data.id).toBe("1");
  });

  it("DELETE /api/teams/:id deletes a team", async () => {
    await request(app)
      .delete("/api/teams/1")
      .expect(204);

    await request(app)
      .get("/api/teams/1")
      .expect(404);
  });

  it("rejects a team with missing required information", async () => {
    const response = await request(app)
      .post("/api/teams")
      .send({ name: "Incomplete Team" })
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a duplicate team number", async () => {
    const response = await request(app)
      .post("/api/teams")
      .send({
        name: "Duplicate Team",
        number: 1,
        rookieYear: 2020
      })
      .expect(409);

    expect(response.body.error.code).toBe("DUPLICATE_TEAM_NUMBER");
  });

    it("persists images in order and returns them as URL strings", async () => {
    const images = ["https://example.com/a.jpg", "https://example.com/b.jpg"];
    const created = await request(app)
      .post("/api/teams")
      .send({ name: "Image Team", number: 4242, rookieYear: 2015, images })
      .expect(201);

    const fetched = await request(app).get(`/api/teams/${created.body.data.id}`).expect(200);
    expect(fetched.body.data.images).toEqual(images);
  });

  it("A03: treats SQL-looking input as plain text (no injection)", async () => {
    const evil = "Robert'); DROP TABLE Team;--";
    const created = await request(app)
      .post("/api/teams")
      .send({ name: evil, number: 31337, rookieYear: 2020 })
      .expect(201);
    expect(created.body.data.name).toBe(evil);

    const all = await request(app).get("/api/teams").expect(200);
    expect(all.body.data.length).toBe(4); // table still exists, 3 seeds + 1
  });

  it("A03: rejects non-http image URLs such as javascript:", async () => {
    const response = await request(app)
      .post("/api/teams")
      .send({ name: "Bad Image", number: 77, rookieYear: 2020, images: ["javascript:alert(1)"] })
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("A03: rejects numbers sent as strings and out-of-range values", async () => {
    await request(app).post("/api/teams").send({ name: "X", number: "12", rookieYear: 2020 }).expect(400);
    await request(app).post("/api/teams").send({ name: "X", number: 12, rookieYear: 1800 }).expect(400);
    await request(app).post("/api/teams").send({ name: "x".repeat(101), number: 12, rookieYear: 2020 }).expect(400);
  });

  it("A05: sends security headers and hides X-Powered-By", async () => {
    const response = await request(app).get("/api/teams").expect(200);
    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("A05: rejects oversized request bodies with a generic error", async () => {
    const response = await request(app)
      .post("/api/teams")
      .send({ name: "Big", number: 5, rookieYear: 2020, history: "x".repeat(200000) })
      .expect(413);
    expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("A05: invalid JSON returns a generic error with no stack trace", async () => {
    const response = await request(app)
      .post("/api/teams")
      .set("Content-Type", "application/json")
      .send("{bad json")
      .expect(400);
    expect(response.body.error.code).toBe("INVALID_JSON");
    expect(JSON.stringify(response.body)).not.toMatch(/node_modules|at \w+/);
  });
});
