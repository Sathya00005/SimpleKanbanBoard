import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Internal helper function to log history entries automatically.
 * Satisfies Task 5.3 requirements.
 */
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

// 1. Create a Task
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
      }
    });

    await createHistoryEntry(task.id, "STATUS_CHANGE", `Task created under status: Backlog`);

    return res.status(201).json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// 2. Fetch Tasks filtered by userId + Complex Priority Sorting
// Satisfies Task 6.2: Oldest Failed -> Newest Failed -> Standard Tasks
// 2. Fetch Tasks filtered by userId + Complex Priority Sorting
// Satisfies Task 6.2: Oldest Failed -> Newest Failed -> Standard Tasks
export const getTasks = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "Invalid or missing User ID parameter" });
    }

    // Fetch all tasks with historical relations loaded
    const tasks = await prisma.task.findMany({
      where: { userId },
      include: {
        timeLogs: true,
        history: {
          orderBy: { createdAt: "desc" }
        }
      }
    });

    // ✅ FIX: Explicitly type 't' parameter to any or your specific schema type for matching
    const backlogTasks = tasks.filter((t: any) => t.status === "Backlog");
    const otherTasks = tasks.filter((t: any) => t.status !== "Backlog");

    // Process Backlog Sorting: Oldest Failed -> Newest Failed -> Standard Tasks
    // ✅ FIX: Explicitly type 'a', 'b', and internal 'h' loop variables
    backlogTasks.sort((a: any, b: any) => {
      const aFailed = a.history.some((h: any) => h.eventType === "TEST_FAILED");
      const bFailed = b.history.some((h: any) => h.eventType === "TEST_FAILED");

      if (aFailed && bFailed) {
        // Both failed: Oldest failure first (Ascending order of creation)
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (aFailed) return -1; // Move failed task a up
      if (bFailed) return 1;  // Move failed task b up

      // Neither failed: Standard creation sorting (Newest or default)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Recombine columns with chronological array sorting preserved
    const combinedTasks = [...backlogTasks, ...otherTasks];

    return res.status(200).json(combinedTasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
// 3. Update Task Status or Generic Fields
// Satisfies Task 6.1 (Generic Edit) & fixes the 500 error block safely!
export const updateTask = async (req: Request, res: Response) => {
  try {
    const taskId = req.params.id as string;
    
    if (!taskId) {
      return res.status(400).json({ error: "Task ID is required" });
    }

    // Look up the old state before making modifications
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: { history: true }
    });

    if (!existingTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Clone the raw request body payload
    const dataToUpdate = { ...req.body };

    // ✅ FIX: Extract fields that do not exist on the database model to prevent Prisma crashes!
    const testRunResult = dataToUpdate.testRunResult;
    delete dataToUpdate.testRunResult;
    delete dataToUpdate.priority; // Safely drops frontend priority text until schema is updated

    // Execute the database modifications
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: dataToUpdate,
      include: {
        timeLogs: true,
        history: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Task 5.3: Automated history trace logging
    if (dataToUpdate.status && dataToUpdate.status !== existingTask.status) {
      await createHistoryEntry(
        taskId, 
        "STATUS_CHANGE", 
        `Moved task from column "${existingTask.status}" to "${dataToUpdate.status}"`
      );
    }

    if (testRunResult) {
      const type = testRunResult === "PASSED" ? "TEST_PASSED" : testRunResult === "FAILED" ? "TEST_FAILED" : "TEST_RUN";
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

// 4. Log Work Hours
export const addTimeLog = async (req: Request, res: Response) => {
  try {
    const taskId = (req.body.taskId || req.params.id) as string;
    const hoursSpent = req.body.hoursSpent;
    const { description, logDate } = req.body;

    if (!taskId || !hoursSpent) {
      return res.status(400).json({ error: "taskId and hoursSpent are required fields" });
    }

    await prisma.timeLog.create({
      data: {
        taskId,
        hoursSpent: Number(hoursSpent),
        description: description || "No notes provided",
        logDate: logDate ? new Date(logDate) : new Date()
      }
    });

    // Task 5.3 History log update
    await createHistoryEntry(
      taskId, 
      "WORK_LOG_ADDED", 
      `Logged ${hoursSpent} hours of developer effort: "${description || 'No comments left'}"`
    );

    // Fetch parent task object so layout states maintain complete arrays
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