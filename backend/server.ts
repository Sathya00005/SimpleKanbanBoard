import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import type { User, Task } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const PORT = 3001;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

const isValidObjectId = (value: string) => /^[a-fA-F0-9]{24}$/.test(value);

async function createHistoryEntry(taskId: string, eventType: string, details: string) {
  try {
    await prisma.taskHistory.create({
      data: {
        taskId,
        eventType,
        details,
      },
    });
  } catch (error) {
    console.error("History entry failed:", error);
  }
}

app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "Backend running" });
});

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

app.get("/api/users/:userId", async (req: Request<{ userId: string }>, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: "User ID is required" });

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

interface CreateTaskBody {
  name?: string;
  description?: string;
  userId?: string;
  testCases?: string[];
}

app.post("/api/tasks", async (req: Request<{}, {}, CreateTaskBody>, res: Response): Promise<any> => {
  try {
    const { name, description, userId, testCases } = req.body;

    if (!name || !userId) {
      return res.status(400).json({ error: "Task name and User ID are required" });
    }

    const task: Task = await prisma.task.create({
      data: {
        name,
        description: description || "",
        status: "Backlog",
        userId,
        testCases: testCases && testCases.length > 0 ? testCases : ["Unit Integration Test", "Regression Test Run"],
      },
    });

    await createHistoryEntry(task.id, "STATUS_CHANGE", "Task created under status: Backlog");

    return res.status(201).json(task);
  } catch (error) {
    console.error("Create Task Error:", error);
    return res.status(500).json({ error: "Failed to create task" });
  }
});

app.get("/api/tasks/:userId", async (req: Request<{ userId: string }>, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: "User ID is required" });

    const tasks = await prisma.task.findMany({
      where: { userId },
      include: {
        timeLogs: true,
        history: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return res.json(tasks);
  } catch (error) {
    console.error("Get Tasks Error:", error);
    return res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

interface UpdateTaskBody {
  name?: string;
  description?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  effortRequired?: string | number;
  workStatus?: string;
  deployedTime?: string;
  deploymentType?: string;
  testCases?: string[];
  testRunResult?: string;
}

interface PrismaUpdateData {
  name?: string;
  description?: string;
  status?: string;
  workStatus?: string;
  deploymentType?: string;
  startDate?: Date;
  endDate?: Date;
  deployedTime?: Date;
  effortRequired?: number;
  testCases?: string[];
}

app.put("/api/tasks/:taskId", async (req: Request<{ taskId: string }, {}, UpdateTaskBody>, res: Response): Promise<any> => {
  try {
    const { taskId } = req.params;
    const {
      name,
      description,
      status,
      startDate,
      endDate,
      effortRequired,
      workStatus,
      deployedTime,
      deploymentType,
      testCases,
      testRunResult,
    } = req.body;

    if (!taskId || !isValidObjectId(taskId)) {
      return res.status(400).json({ error: "Invalid task ID format" });
    }

    const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existingTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    const updateData: PrismaUpdateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (workStatus !== undefined) updateData.workStatus = workStatus;
    if (deploymentType !== undefined) updateData.deploymentType = deploymentType;
    if (testCases !== undefined) updateData.testCases = testCases;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (deployedTime) updateData.deployedTime = new Date(deployedTime);
    if (effortRequired !== undefined) updateData.effortRequired = Number(effortRequired);

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        timeLogs: true,
        history: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (status !== undefined && status !== existingTask.status) {
      await createHistoryEntry(taskId, "STATUS_CHANGE", `Moved task from column \"${existingTask.status}\" to \"${status}\"`);
    }
    if (name !== undefined && name !== existingTask.name) {
      await createHistoryEntry(taskId, "TASK_EDITED", `Task name changed to: ${name}`);
    }
    if (description !== undefined && description !== existingTask.description) {
      await createHistoryEntry(taskId, "TASK_EDITED", `Task description updated.`);
    }
    if (testCases !== undefined) {
      const previousCases = Array.isArray(existingTask.testCases) ? existingTask.testCases.join(", ") : "none";
      const nextCases = Array.isArray(testCases) ? testCases.join(", ") : "none";
      if (previousCases !== nextCases) {
        await createHistoryEntry(taskId, "TEST_CASES_UPDATED", `Test cases changed from [${previousCases}] to [${nextCases}]`);
      }
    }
    if (testRunResult) {
      const type = testRunResult === "PASSED" ? "TEST_PASSED" : "TEST_FAILED";
      const detailMsg = testRunResult === "PASSED"
        ? "Automated test results passed validation successfully."
        : "Automated test results failed validation and the task was moved back to Backlog.";
      await createHistoryEntry(taskId, type, detailMsg);
    }

    return res.status(200).json({ success: true, task: updatedTask });
  } catch (error) {
    console.error("Update Task Error:", error);
    return res.status(500).json({ error: "Failed to update task" });
  }
});

interface TimeLogBody {
  date?: string;
  logDate?: string;
  hours?: string | number;
  hoursSpent?: string | number;
  description?: string;
}

// ✅ FIXED: Robust tracking engine mappings
app.post("/api/tasks/:taskId/time-logs", async (req: Request<{ taskId: string }, {}, TimeLogBody>, res: Response): Promise<any> => {
  try {
    const { taskId } = req.params;
    
    // Support alternate key formats seamlessly
    const rawDate = req.body.logDate || req.body.date;
    const rawHours = req.body.hoursSpent !== undefined ? req.body.hoursSpent : req.body.hours;
    const { description } = req.body;

    if (!rawDate || rawHours === undefined || !description) {
      return res.status(400).json({ error: "All time-log fields are required (date, hours, description)" });
    }

    const parseHours = parseFloat(rawHours.toString());
    if (isNaN(parseHours) || parseHours < 0) {
      return res.status(400).json({ error: "Hours cannot be negative" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.timeLog.create({
        data: {
          taskId,
          logDate: new Date(rawDate),
          hoursSpent: parseHours,
          description,
        },
      });
      await tx.taskHistory.create({
        data: {
          taskId,
          eventType: "TIME_LOGGED",
          details: `Logged ${parseHours} hours on ${rawDate}. Notes: ${description}`,
        },
      });
    });

    return res.status(201).json({ success: true, message: "Time logged successfully" });
  } catch (error) {
    console.error("Time Log Error:", error);
    return res.status(500).json({ error: "Server error while saving time log" });
  }
});

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
        const hours = Math.abs(new Date(run.endTime).getTime() - new Date(run.startTime).getTime()) / 3600000;
        await tx.timeLog.create({
          data: {
            taskId,
            logDate: new Date(run.startTime),
            hoursSpent: hours,
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
            workStatus: "Pending",
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
            status: "Testing",
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

    return res.status(200).json({
      success: true,
      message: allPassed
        ? "All validation tests passed! Your task is verified and ready for deployment features."
        : "Tests failed! Task has been automatically moved back to the Backlog column.",
    });
  } catch (error) {
    console.error("Test Results Processing Error:", error);
    return res.status(500).json({ error: "Internal server exception handling execution validation matrices." });
  }
});

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