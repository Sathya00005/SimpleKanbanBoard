import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

const PORT = 3001;

/* ---------------- MIDDLEWARE ---------------- */

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

/* ---------------- HEALTH ---------------- */

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend running",
  });
});

/* ---------------- SIGNUP ---------------- */

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: "All fields are required",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        error: "Email already registered",
      });
    }

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      userId: user.id,
    });
  } catch (error) {
    console.error("Signup Error:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

/* ---------------- LOGIN ---------------- */

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    if (user.password !== password) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      userId: user.id,
      username: user.username,
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

/* ---------------- GET USER ---------------- */

app.get("/api/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

/* ---------------- CREATE TASK ---------------- */

app.post("/api/tasks", async (req, res) => {
  try {
    const { name, description, userId } = req.body;

    if (!name) {
      return res.status(400).json({
        error: "Task name is required",
      });
    }

    if (!userId) {
      return res.status(400).json({
        error: "User ID is required",
      });
    }

    const task = await prisma.task.create({
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

    return res.status(500).json({
      error: "Failed to create task",
    });
  }
});

/* ---------------- GET USER TASKS ---------------- */

app.get("/api/tasks/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const tasks = await prisma.task.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(tasks);
  } catch (error) {
    console.error("Get Tasks Error:", error);

    return res.status(500).json({
      error: "Failed to fetch tasks",
    });
  }
});

/* ---------------- UPDATE TASK STATUS ---------------- */

/* ---------------- UPDATE TASK STATUS ---------------- */

app.put("/api/tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;

    const {
      status,
      startDate,
      endDate,
      effortRequired,
      workStatus,
    } = req.body;

    // Validate MongoDB ObjectId
    if (!/^[a-fA-F0-9]{24}$/.test(taskId)) {
      return res.status(400).json({
        error: "Invalid task ID format",
      });
    }

    const existingTask =
      await prisma.task.findUnique({
        where: {
          id: taskId,
        },
      });

    if (!existingTask) {
      return res.status(404).json({
        error: "Task not found",
      });
    }

    const updateData: any = {};

    if (status !== undefined) {
      updateData.status = status;
    }

    if (startDate !== undefined) {
      updateData.startDate =
        new Date(startDate);
    }

    if (endDate !== undefined) {
      updateData.endDate =
        new Date(endDate);
    }

    if (effortRequired !== undefined) {
      updateData.effortRequired =
        Number(effortRequired);
    }

    if (workStatus !== undefined) {
      updateData.workStatus = workStatus;
    }

    const updatedTask =
      await prisma.task.update({
        where: {
          id: taskId,
        },
        data: updateData,
      });

    return res.status(200).json({
      success: true,
      task: updatedTask,
    });
  } catch (error) {
    console.error(
      "Update Task Error:",
      error
    );

    return res.status(500).json({
      error: "Failed to update task",
    });
  }
});
/* ---------------- DELETE TASK ---------------- */

app.delete("/api/tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;

    await prisma.task.delete({
      where: {
        id: taskId,
      },
    });

    return res.json({
      success: true,
      message: "Task deleted",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Failed to delete task",
    });
  }
});

/* ---------------- START SERVER ---------------- */

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});