# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\auth.test.ts >> Auth API Tests >> should signup user
- Location: tests\auth.test.ts:15:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 201
Received: 400
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import request from "supertest";
  3  | import { app } from "../server.js";
  4  | 
  5  | test.describe.serial("Auth API Tests", () => {
  6  | 
  7  |   const uniqueTimestamp = Date.now();
  8  |   const user = {
  9  |     email: `testauto_${uniqueTimestamp}@example.com`,
  10 |     password: "Password123"
  11 |   };
  12 | 
  13 |   let agent = request.agent(app);
  14 | 
  15 |   test("should signup user", async () => {
  16 |     const res = await agent.post("/api/auth/signup").send(user);
> 17 |     expect(res.statusCode).toBe(201);
     |                            ^ Error: expect(received).toBe(expected) // Object.is equality
  18 |   });
  19 | 
  20 |   test("should login user", async () => {
  21 |     const res = await agent.post("/api/auth/login").send(user);
  22 |     expect(res.statusCode).toBe(200);
  23 |   });
  24 | 
  25 |   test("should access protected route", async () => {
  26 |     const res = await agent.get("/api/profile");
  27 |     expect(res.statusCode).toBe(200);
  28 |   });
  29 | 
  30 | });
  31 | 
```