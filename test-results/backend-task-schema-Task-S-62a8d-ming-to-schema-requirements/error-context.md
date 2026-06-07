# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: backend\task-schema.spec.ts >> Task Schema Readiness API Verification >> Should accept task creation payload conforming to schema requirements
- Location: backend\task-schema.spec.ts:4:3

# Error details

```
TypeError: apiRequestContext.post: Invalid URL
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Task Schema Readiness API Verification', () => {
  4  |   test('Should accept task creation payload conforming to schema requirements', async ({ request }) => {
  5  |     // This simulates the upcoming Task Creation API (Sprint 2, Task 2.4)
  6  |     // ensuring our database schema constraints (e.g. required name) are respected.
> 7  |     const response = await request.post('/api/tasks/validate-schema', {
     |                                    ^ TypeError: apiRequestContext.post: Invalid URL
  8  |       data: {
  9  |         name: 'Setup CI/CD Pipeline',
  10 |         description: 'Implement GitHub actions for automated testing.',
  11 |         test_cases: ['Action runs on push', 'Action fails on bad tests']
  12 |       }
  13 |     });
  14 |     
  15 |     // Expecting a 200 OK or a 404 (if endpoint isn't fully wired yet), but validates the shape.
  16 |     expect(response.ok() || response.status() === 404).toBeTruthy();
  17 |   });
  18 | });
```