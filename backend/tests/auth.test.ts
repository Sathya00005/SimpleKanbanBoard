import { test, expect } from '@playwright/test';
import request from "supertest";
import { app } from "../server.js";

test.describe.serial("Auth API Tests", () => {

  const uniqueTimestamp = Date.now();
  const user = {
    email: `testauto_${uniqueTimestamp}@example.com`,
    password: "Password123"
  };

  let agent = request.agent(app);

  test("should signup user", async () => {
    const res = await agent.post("/api/auth/signup").send(user);
    expect(res.statusCode).toBe(201);
  });

  test("should login user", async () => {
    const res = await agent.post("/api/auth/login").send(user);
    expect(res.statusCode).toBe(200);
  });

  test("should access protected route", async () => {
    const res = await agent.get("/api/profile");
    expect(res.statusCode).toBe(200);
  });

});