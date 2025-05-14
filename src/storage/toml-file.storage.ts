import type { Task } from "../type/task";
import type { IStorage } from "./storage";
import fs from "fs/promises";
import TOML from "@iarna/toml"; // Assuming use of @iarna/toml
import { v4 as uuidv4 } from "uuid"; // Import uuid

interface TomlFileStorageConfig {
  filePath: string;
}

export class TomlFileStorage implements IStorage {
  private filePath: string | undefined;
  private tasks: Task[] = [];

  async init(config: TomlFileStorageConfig): Promise<void> {
    if (!config || !config.filePath) {
      throw new Error("File path is required in config for TomlFileStorage.");
    }
    this.filePath = config.filePath;

    try {
      await fs.access(this.filePath);
      const fileContent = await fs.readFile(this.filePath, "utf-8");
      const parsedToml = TOML.parse(fileContent) as { tasks?: any[] }; // Use any[] to handle raw parsed data
      // Assuming tasks are stored under a 'tasks' key in the TOML file
      if (parsedToml.tasks && Array.isArray(parsedToml.tasks)) {
        // Manually convert date strings to Date objects
        this.tasks = parsedToml.tasks.map((taskData) => {
          const { createdAt, updatedAt, ...rest } = taskData;
          return {
            ...rest,
            createdAt: createdAt ? new Date(createdAt) : new Date(), // Default to now if missing, or handle as error
            updatedAt: updatedAt ? new Date(updatedAt) : new Date(), // Default to now if missing, or handle as error
          } as Task; // Cast to Task after transformation
        });
      }
    } catch (error) {
      // If the file doesn't exist, or is invalid TOML, we'll start with an empty task list
      // and create the file on the first write operation.
      this.tasks = [];
      // We can choose to create an empty file here if it doesn't exist
      await this.saveTasks();
    }
  }

  private async saveTasks(): Promise<void> {
    if (!this.filePath) {
      throw new Error("Storage not initialized. Call init() first.");
    }
    // In TOML, an array of tables is a common way to represent a list of objects.
    // We'll wrap our tasks array in an object with a 'tasks' key.
    const tomlString = TOML.stringify({ tasks: this.tasks as any });
    await fs.writeFile(this.filePath, tomlString, "utf-8");
  }

  // Placeholder for other methods
  async createTask(task: Partial<Task>): Promise<Task> {
    if (!this.filePath) {
      throw new Error("Storage not initialized. Call init() first.");
    }
    const newTask: Task = {
      id: this.generateId(),
      title: task.title || "Untitled Task",
      summary: task.summary || "",
      description: task.description || "",
      // prompt, role, contexts will be undefined if not in task partial
      // but this is fine as they are not required for a minimal Task
      prompt: task.prompt || "", // Add default for prompt
      role: task.role || "", // Add default for role
      contexts: task.contexts || [], // Add default for contexts
      status: task.status || "PENDING", // Corrected default status
      createdAt: new Date(),
      updatedAt: new Date(),
      // Spread the partial task to override defaults.
      // Properties not in Task interface (like priority, dueDate) will still be added if present in 'task'
      // but won't be strongly typed on 'newTask'. This is generally acceptable.
      ...task,
    };
    this.tasks.push(newTask);
    await this.saveTasks();
    return newTask;
  }

  private generateId(): string {
    return uuidv4(); // Use uuid for ID generation
  }

  async getTasks(parentId?: string): Promise<Task[]> {
    if (!this.filePath) {
      throw new Error("Storage not initialized. Call init() first.");
    }

    let filteredTasks = this.tasks;
    if (parentId) {
      filteredTasks = this.tasks.filter((task) => task.parentId === parentId);
    }

    // Create a deep copy to prevent external modification, and ensure Date objects are preserved or restored.
    // The current JSON.parse(JSON.stringify(...)) converts Date objects to strings.
    // We need to restore them.
    const tasksCopy = JSON.parse(JSON.stringify(filteredTasks)) as any[];

    const tasksWithDates = tasksCopy.map((taskData) => {
      const { createdAt, updatedAt, ...rest } = taskData;
      return {
        ...rest,
        createdAt: createdAt ? new Date(createdAt) : undefined, // Allow undefined if Task type permits
        updatedAt: updatedAt ? new Date(updatedAt) : undefined, // Allow undefined if Task type permits
      } as Task;
    });

    return Promise.resolve(tasksWithDates);
  }

  async updateTask(id: string, taskUpdate: Partial<Task>): Promise<Task> {
    if (!this.filePath) {
      throw new Error("Storage not initialized. Call init() first.");
    }

    const taskIndex = this.tasks.findIndex((t) => t.id === id);
    if (taskIndex === -1) {
      throw new Error(`Task with id "${id}" not found.`);
    }

    const existingTask = this.tasks[taskIndex]; // Type checker knows this is a Task after the check

    if (!existingTask) {
      throw new Error(`Task with id "${id}" not found.`);
    }

    // Initialize updatedTask with all required fields from existingTask
    // and then selectively update with non-undefined values from taskUpdate.
    const updatedTask: Task = {
      id: existingTask.id, // id is always from existing
      title:
        taskUpdate.title !== undefined ? taskUpdate.title : existingTask.title,
      summary:
        taskUpdate.summary !== undefined
          ? taskUpdate.summary
          : existingTask.summary,
      description:
        taskUpdate.description !== undefined
          ? taskUpdate.description
          : existingTask.description,
      prompt:
        taskUpdate.prompt !== undefined
          ? taskUpdate.prompt
          : existingTask.prompt,
      role: taskUpdate.role !== undefined ? taskUpdate.role : existingTask.role,
      contexts:
        taskUpdate.contexts !== undefined
          ? taskUpdate.contexts
          : existingTask.contexts,
      status:
        taskUpdate.status !== undefined
          ? taskUpdate.status
          : existingTask.status,
      createdAt: existingTask.createdAt, // createdAt is from existing
      // parentId can be updated if present in taskUpdate, otherwise keep existing
      parentId:
        taskUpdate.parentId !== undefined
          ? taskUpdate.parentId
          : existingTask.parentId,
      // Spread other properties from taskUpdate that might not be explicitly listed above but are in Partial<Task>
      // This part is tricky as it might introduce properties not in Task if Partial<Task> is wider.
      // However, since updatedTask is typed as Task, TS should catch this.
      // For now, we assume taskUpdate only contains valid Task fields or fields we want to merge.
      ...taskUpdate, // This must come after explicit assignments to allow override
      updatedAt: new Date(), // Always update the timestamp
    };

    // Re-assign id and createdAt to ensure they are not changed by the spread of taskUpdate
    updatedTask.id = existingTask.id;
    updatedTask.createdAt = existingTask.createdAt;

    this.tasks[taskIndex] = updatedTask;
    await this.saveTasks();
    return updatedTask;
  }

  async deleteTask(id: string): Promise<void> {
    if (!this.filePath) {
      throw new Error("Storage not initialized. Call init() first.");
    }

    const initialLength = this.tasks.length;
    this.tasks = this.tasks.filter((task) => task.id !== id);

    if (this.tasks.length === initialLength) {
      // For idempotency, not finding the task is not an error for delete.
      // Consider if an error should be thrown: throw new Error(`Task with id "${id}" not found.`);
      return Promise.resolve();
    }

    await this.saveTasks();
    return Promise.resolve();
  }
}
