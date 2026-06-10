import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import type { User, Task } from "@prisma/client";;

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

/* ---------------- CREATE TASK ---------------- */

interface CreateTaskBody {
  name?: string;
  description?: string;
  userId?: string;
}

app.post("/api/tasks", async (req: Request<{}, {}, CreateTaskBody>, res: Response): Promise<any> => {
  try {
    const { name, description, userId } = req.body;

    if (!name || !userId) {
      return res.status(400).json({ error: "Task name and User ID are required" });
    }

    const task: Task = await prisma.task.create({
      data: {
        name,
        description: description || "",
        status: "Backlog",
        userId,
      },
    });

    return res.status(201).json(task);
  } catch (error) {
    console.error("Create Task Error:", error);
    return res.status(500).json({ error: "Failed to create task" });
  }
});

/* ---------------- GET USER TASKS ---------------- */

app.get("/api/tasks/:userId", async (req: Request<{ userId: string }>, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;
    const tasks: Task[] = await prisma.task.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return res.json(tasks);
  } catch (error) {
    console.error("Get Tasks Error:", error);
    return res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

/* ---------------- UPDATE TASK STATUS & METRICS ---------------- */

interface UpdateTaskBody {
  status?: string;
  startDate?: string;
  endDate?: string;
  effortRequired?: string | number;
  workStatus?: string;
  deployedTime?: string;
  deploymentType?: string;
}

interface PrismaUpdateData {
  status?: string;
  workStatus?: string;
  deploymentType?: string;
  startDate?: Date;
  endDate?: Date;
  deployedTime?: Date;
  effortRequired?: number;
}

app.put("/api/tasks/:taskId", async (req: Request<{ taskId: string }, {}, UpdateTaskBody>, res: Response): Promise<any> => {
  try {
    const { taskId } = req.params;
    const {
      status,
      startDate,
      endDate,
      effortRequired,
      workStatus,
      deployedTime,
      deploymentType,
    } = req.body;

    if (taskId.length === 24 && !/^[a-fA-F0-9]{24}$/.test(taskId)) {
      return res.status(400).json({ error: "Invalid task ID format" });
    }

    const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existingTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    const updateData: PrismaUpdateData = {};

    if (status !== undefined) updateData.status = status;
    if (workStatus !== undefined) updateData.workStatus = workStatus;
    if (deploymentType !== undefined) updateData.deploymentType = deploymentType;
    
    // Dates are safely converted to ISO objects here inside the execution block
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (deployedTime) updateData.deployedTime = new Date(deployedTime);
    
    if (effortRequired !== undefined) {
      updateData.effortRequired = Number(effortRequired);
    }

    const updatedTask: Task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    return res.status(200).json({ success: true, task: updatedTask });
  } catch (error) {
    console.error("Update Task Error:", error);
    return res.status(500).json({ error: "Failed to update task" });
  }
});
/* ---------------- SPRINT 4: WIP TIME LOGGING ---------------- */
interface TimeLogBody {
  date?: string;
  hours?: string | number;
  description?: string;
}

app.post("/api/tasks/:taskId/time-logs", async (req: Request<{ taskId: string }, {}, TimeLogBody>, res: Response): Promise<any> => {
  try {
    const { taskId } = req.params;
    const { date, hours, description } = req.body;

    if (!date || hours === undefined || !description) {
      return res.status(400).json({ error: "All time-log fields are required" });
    }

    const parseHours = parseFloat(hours.toString());
    if (parseHours < 0) {
      return res.status(400).json({ error: "Hours cannot be negative" });
    }

    // Using Prisma Interactive Transactions to match your schema architecture securely
    await prisma.$transaction(async (tx) => {
      // Create time log record linked to the task
      await tx.timeLog.create({
        data: {
          taskId,
          logDate: new Date(date),
          hoursSpent: parseHours,
          description,
        },
      });

      // Write into audit trail history
      await tx.taskHistory.create({
        data: {
          taskId,
          eventType: "TIME_LOGGED",
          details: `Logged ${parseHours} hours on ${date}. Notes: ${description}`,
        },
      });
    });

    return res.status(201).json({ success: true, message: "Time logged successfully" });
  } catch (error) {
    console.error("Time Log Error:", error);
    return res.status(500).json({ error: "Server error while saving time log" });
  }
});

/* ---------------- SPRINT 4: WIP STATUS UPDATE ---------------- */
interface StatusUpdateBody {
  status?: string;
}

app.patch("/api/tasks/:taskId/status", async (req: Request<{ taskId: string }, {}, StatusUpdateBody>, res: Response): Promise<any> => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status field is required" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: taskId },
        data: { workStatus: status },
      });

      await tx.taskHistory.create({
        data: {
          taskId,
          eventType: "STATUS_UPDATED",
          details: `Work status changed to ${status}`,
        },
      });
    });

    return res.status(200).json({ success: true, message: "Status updated successfully" });
  } catch (error) {
    console.error("Status Patch Error:", error);
    return res.status(500).json({ error: "Server error while modifying work status" });
  }
});
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

    // Use Prisma Transactions to match your original database integrity guarantees
    await prisma.$transaction(async (tx) => {
      for (const run of results) {
        // 1. Log the test case execution run run metrics
        await tx.timeLog.create({
          data: {
            taskId,
            logDate: new Date(run.startTime),
            hoursSpent: Math.abs(new Date(run.endTime).getTime() - new Date(run.startTime).getTime()) / 3600000, // Converts delta times to hours
            description: `Test Case: [${run.name}] evaluated with verdict status: ${run.status}`,
          },
        });

        // 2. Write into audit history track list
        await tx.taskHistory.create({
          data: {
            taskId,
            eventType: "TEST_RUN",
            details: `Test Run [${run.name}] finished. Execution verdict state: ${run.status}`,
          },
        });

        // Check if a single test target flag drops to Failed
        if (run.status === "Failed") {
          allPassed = false;
        }
      }

      // 3. 🚨 AUTOMATIC REVERSE FLOW INTERCEPTOR LOGIC
      if (!allPassed) {
        await tx.task.update({
          where: { id: taskId },
          data: { 
            status: "Backlog",     // Kick card back to column 0
            workStatus: "Pending"  // Reset checkbox control flag state
          },
        });

        await tx.taskHistory.create({
          data: {
            taskId,
            eventType: "TEST_FAILED",
            details: "Task failed validation testing suite and was automatically reversed back to Backlog.",
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