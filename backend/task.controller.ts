import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createHistoryEntry(taskId: string, eventType: string, details: string) {
  try {
    await prisma.taskHistory.create({
      data: {
        taskId,
        eventType,
        details,
      },
    });
  } catch (err) {
    console.error("Failed to log task history:", err);
  }
}

export const createTask = async (req: Request, res: Response) => {
  try {
    const { name, description, userId } = req.body;

    if (!name || !userId) {
      return res.status(400).json({ error: "Task name and userId are required" });
    }

    const task = await prisma.task.create({
      data: {
        name,
        description: description || "",
        status: "Backlog",
        userId,
        testCases: ["Unit Integration Test", "Regression Test Run"]
      }
    });

    await createHistoryEntry(task.id, "STATUS_CHANGE", `Task created under status: Backlog`);
    return res.status(201).json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getTasks = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "Invalid or missing User ID parameter" });
    }

    const tasks = await prisma.task.findMany({
      where: { userId },
      include: {
        timeLogs: true,
        history: {
          orderBy: { createdAt: "desc" }
        }
      }
    });

    const backlogTasks = tasks.filter((t: any) => t.status === "Backlog");
    const otherTasks = tasks.filter((t: any) => t.status !== "Backlog");

    backlogTasks.sort((a: any, b: any) => {
      const aFailed = a.history.some((h: any) => h.eventType === "TEST_FAILED");
      const bFailed = b.history.some((h: any) => h.eventType === "TEST_FAILED");

      if (aFailed && bFailed) {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (aFailed) return -1; 
      if (bFailed) return 1;  

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const combinedTasks = [...backlogTasks, ...otherTasks];
    return res.status(200).json(combinedTasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const taskId = req.params.id as string;
    
    if (!taskId) {
      return res.status(400).json({ error: "Task ID is required" });
    }

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!existingTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    const updateData: any = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.workStatus !== undefined) updateData.workStatus = req.body.workStatus;
    if (req.body.deploymentType !== undefined) updateData.deploymentType = req.body.deploymentType;
    if (req.body.testCases !== undefined) updateData.testCases = req.body.testCases;

    if (req.body.startDate) updateData.startDate = new Date(req.body.startDate);
    if (req.body.endDate) updateData.endDate = new Date(req.body.endDate);
    if (req.body.deployedTime) updateData.deployedTime = new Date(req.body.deployedTime);
    
    if (req.body.effortRequired !== undefined) {
      updateData.effortRequired = Number(req.body.effortRequired);
    }

    const testRunResult = req.body.testRunResult;

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

    if (updateData.status && updateData.status !== existingTask.status) {
      await createHistoryEntry(
        taskId, 
        "STATUS_CHANGE", 
        `Moved task from column "${existingTask.status}" to "${updateData.status}"`
      );
    }

    if (testRunResult) {
      const type = testRunResult === "PASSED" ? "TEST_PASSED" : "TEST_FAILED";
      const detailMsg = testRunResult === "FAILED" 
        ? "Automated regression suite failed testing parameters. Shifting card back to Backlog lane." 
        : "All testing hooks passed execution suite criteria validation successfully.";
      
      await createHistoryEntry(taskId, type, detailMsg);
    }

    return res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const addTimeLog = async (req: Request, res: Response) => {
  try {
    const taskId = (req.body.taskId || req.params.id) as string;
    const rawHours = req.body.hoursSpent !== undefined ? req.body.hoursSpent : req.body.hours;
    const rawDate = req.body.logDate || req.body.date;
    const { description } = req.body;

    if (!taskId || rawHours === undefined || !rawDate || !description) {
      return res.status(400).json({ error: "taskId, hoursSpent, logDate, and description are required fields" });
    }

    const hoursSpent = Number(rawHours);
    if (isNaN(hoursSpent) || hoursSpent < 0) {
      return res.status(400).json({ error: "Hours spent must be a non-negative number" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.timeLog.create({
        data: {
          taskId,
          hoursSpent,
          description,
          logDate: new Date(rawDate)
        }
      });

      await tx.taskHistory.create({
        data: {
          taskId,
          eventType: "TIME_LOGGED",
          details: `Logged ${hoursSpent} hours of developer effort. Description: "${description}"`
        }
      });
    });

    const completedTaskContext = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        timeLogs: true,
        history: {
          orderBy: { createdAt: "desc" }
        }
      }
    });

    return res.status(201).json(completedTaskContext);
  } catch (error) {
    console.error("Error adding time log configuration:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};