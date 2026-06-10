import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import type { User } from "@prisma/client";
// ✅ FIX: Remove the '.ts' extension from the end of the import path string
import { createTask, getTasks, updateTask, addTimeLog } from "./task.controller";

const app = express();
const prisma = new PrismaClient();
const PORT: number = 3001;

/* ---------------- MIDDLEWARE ---------------- */

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

/* ---------------- HEALTH ---------------- */

app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "Backend running" });
});

/* ---------------- SIGNUP ---------------- */

interface SignupBody {
  username?: string;
  email?: string;
  password?: string;
}

app.post("/api/auth/signup", async (req: Request<{}, {}, SignupBody>, res: Response): Promise<any> => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const user: User = await prisma.user.create({
      data: { username, email, password },
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      userId: user.id,
    });
  } catch (error) {
    console.error("Signup Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ---------------- LOGIN ---------------- */

interface LoginBody {
  email?: string;
  password?: string;
}

app.post("/api/auth/login", async (req: Request<{}, {}, LoginBody>, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      userId: user.id,
      username: user.username,
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ---------------- GET USER ---------------- */

app.get("/api/users/:userId", async (req: Request<{ userId: string }>, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ id: user.id, username: user.username, email: user.email });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ---------------- TASKS ROUTING MAPPINGS ---------------- */
// ✅ FIXED: Routes now funnel straight into task.controller.ts methods 
// This links relational arrays (timeLogs, history) and custom priority sorting rules.

app.post("/api/tasks", createTask);
app.get("/api/tasks/:userId", getTasks);
app.put("/api/tasks/:id", updateTask);
app.post("/api/tasks/:id/time-logs", addTimeLog);

/* ---------------- SPRINT 4: GATED TEST VERDICTS REGISTRATION & REVERSE FLOW ---------------- */
interface TestRunPayload {
  name: string;
  startTime: string;
  endTime: string;
  status: "Passed" | "Failed";
}

interface TestResultsBody {
  results?: TestRunPayload[];
}

app.post("/api/tasks/:taskId/test-results", async (req: Request<{ taskId: string }, {}, TestResultsBody>, res: Response): Promise<any> => {
  try {
    const { taskId } = req.params;
    const { results } = req.body;

    if (!results || !Array.isArray(results)) {
      return res.status(400).json({ error: "Invalid test results payload structure." });
    }

    const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existingTask) {
      return res.status(404).json({ error: "Target workflow task not found." });
    }

    let allPassed = true;

    await prisma.$transaction(async (tx) => {
      for (const run of results) {
        await tx.timeLog.create({
          data: {
            taskId,
            logDate: new Date(run.startTime),
            hoursSpent: Math.abs(new Date(run.endTime).getTime() - new Date(run.startTime).getTime()) / 3600000,
            description: `Test Case: [${run.name}] evaluated with verdict status: ${run.status}`,
          },
        });

        await tx.taskHistory.create({
          data: {
            taskId,
            eventType: "TEST_RUN",
            details: `Test Run [${run.name}] finished. Execution verdict state: ${run.status}`,
          },
        });

        if (run.status === "Failed") {
          allPassed = false;
        }
      }

      if (!allPassed) {
        await tx.task.update({
          where: { id: taskId },
          data: { 
            status: "Backlog",     
            workStatus: "Pending"  
          },
        });

        await tx.taskHistory.create({
          data: {
            taskId,
            eventType: "TEST_FAILED",
            details: "Task failed validation testing suite and was automatically reversed back to Backlog.",
          },
        });
      } else {
        await tx.task.update({
          where: { id: taskId },
          data: { 
            status: "Testing"
          },
        });

        await tx.taskHistory.create({
          data: {
            taskId,
            eventType: "TEST_PASSED",
            details: "All metrics passed validation. Moving task into the Testing lane.",
          },
        });
      }
    });

    if (!allPassed) {
      return res.status(200).json({ 
        success: true, 
        message: "Tests failed! Task has been automatically moved back to the Backlog column." 
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: "All validation tests passed! Your task is verified and ready for deployment features." 
    });

  } catch (error) {
    console.error("Test Results Processing Error:", error);
    return res.status(500).json({ error: "Internal server exception handling execution validation matrices." });
  }
});

/* ---------------- DELETE TASK ---------------- */

app.delete("/api/tasks/:taskId", async (req: Request<{ taskId: string }>, res: Response): Promise<any> => {
  try {
    const { taskId } = req.params;
    await prisma.task.delete({ where: { id: taskId } });

    return res.json({ success: true, message: "Task deleted" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to delete task" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});