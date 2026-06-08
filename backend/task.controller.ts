import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createTask = async (
  req: Request,
  res: Response
) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        error: "Task name is required"
      });
    }

    const task = await prisma.task.create({
      data: {
        name,
        description: description || "",
        status: "Backlog"
      }
    });

    return res.status(201).json(task);
  } catch (error) {
    console.error("Error creating task:", error);

    return res.status(500).json({
      error: "Internal server error"
    });
  }
};

export const getTasks = async (
  req: Request,
  res: Response
) => {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { id: "asc" }
    });

    return res.status(200).json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);

    return res.status(500).json({
      error: "Internal server error"
    });
  }
};