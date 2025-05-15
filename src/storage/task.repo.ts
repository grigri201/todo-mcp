import type { Task } from "../type/task";
import { randomUUID } from "crypto";
import type { IStorage } from "./storage";

// Custom Error Classes
export class ParentNotFoundError extends Error {
  constructor(parentId: string) {
    super(`Parent task with id ${parentId} not found.`);
    this.name = "ParentNotFoundError";
  }
}

export class ImmutableFieldError extends Error {
  constructor(fieldName: string) {
    super(`Field '${fieldName}' is immutable and cannot be updated.`);
    this.name = "ImmutableFieldError";
  }
}

export class MissingRequiredFieldError extends Error {
  constructor(fieldName: string) {
    super(`Required field '${fieldName}' is missing.`);
    this.name = "MissingRequiredFieldError";
  }
}

export class CycleError extends Error {
  constructor(taskId: string, parentId: string) {
    super(
      `Setting parent ${parentId} for task ${taskId} would create a cycle.`
    );
    this.name = "CycleError";
  }
}

// DTO for creating a task
export interface CreateTaskDto {
  title: string;
  summary: string;
  description: string;
  prompt: string;
  role: string;
  parentId?: string;
  contexts?: string[];
}

/**
 * Repository for managing tasks.
 * Handles CRUD operations and parent-child relationships between tasks.
 */
export class TaskRepo {
  private tasks: Map<string, Task>;
  private storage: IStorage;

  /**
   * Creates an instance of TaskRepo.
   * @param {IStorage} storage - The storage instance to persist tasks.
   */
  constructor(storage: IStorage) {
    this.storage = storage;
    this.tasks = new Map<string, Task>();
    this._initializeRepo();
  }

  private async _initializeRepo(): Promise<void> {
    try {
      const allTasks = await this.storage.getTasks();
      this.tasks = new Map(Object.entries(allTasks));
    } catch (error) {
      console.error("Failed to initialize TaskRepo from storage:", error);
      this.tasks = new Map<string, Task>();
    }
  }

  private async _persistTask(task: Task): Promise<void> {
    this.tasks.set(task.id, task);
    // Individual write is likely better for atomicity if supported well by IStorage
    await this.storage.createTask(task);
  }

  // This method might be useful if the storage engine prefers bulk updates
  // private async _persistAllTasks(): Promise<void> {
  //   const tasksObject: Record<string, Task> = {};
  //   for (const [id, task] of this.tasks) {
  //     tasksObject[id] = task;
  //   }
  //   await this.storage.writeAll(tasksObject);
  // }

  private async _removeTaskFromPersistence(taskId: string): Promise<void> {
    this.tasks.delete(taskId);
    await this.storage.deleteTask(taskId);
  }

  /**
   * Checks for a cycle if a task were to become a child of a potential parent.
   * Traverses up the ancestor chain from the potential parent.
   * @param taskId The ID of the task being checked (the potential child).
   * @param potentialParentId The ID of the task to check as a potential parent.
   * @returns Promise<void>
   * @throws {CycleError} If a cycle is detected.
   */
  private async _checkForCycle(
    taskId: string,
    potentialParentId: string | undefined
  ): Promise<void> {
    if (!potentialParentId) {
      return; // No parent means no cycle.
    }

    let currentAncestorId: string | undefined = potentialParentId;
    while (currentAncestorId) {
      if (currentAncestorId === taskId) {
        throw new CycleError(taskId, potentialParentId);
      }
      // Directly access tasks map to bypass status filtering in find() for cycle detection
      const ancestorTask = this.tasks.get(currentAncestorId);
      if (!ancestorTask) {
        // This case should ideally not be reached if data integrity is maintained
        // (e.g., parent exists checks are done prior or parentId is valid).
        // If it does, it means we're trying to set a parent that doesn't exist OR
        // an ancestor in the chain is missing. We stop to prevent infinite loops or errors.
        return;
      }
      currentAncestorId = ancestorTask.parentId;
    }
  }

  /**
   * Creates a new task.
   * @param {CreateTaskDto} taskData - The data for the new task.
   * @returns {Promise<string>} The ID of the newly created task.
   * @throws {MissingRequiredFieldError} If required fields (name, summary, description, prompt, role) are missing.
   * @throws {ParentNotFoundError} If `parentId` is provided but the parent task does not exist.
   * @throws {CycleError} If setting `parentId` would create a cycle.
   */
  async create(taskData: CreateTaskDto): Promise<string> {
    const requiredFields: Array<keyof CreateTaskDto> = [
      "title",
      "summary",
      "description",
      "prompt",
      "role",
    ];
    for (const field of requiredFields) {
      if (!taskData[field]) {
        throw new MissingRequiredFieldError(field);
      }
    }

    const id = randomUUID();
    const now = new Date();

    if (taskData.parentId) {
      const parentTask = await this.find(taskData.parentId);
      if (!parentTask) {
        throw new ParentNotFoundError(taskData.parentId);
      }
      // Check for cycle before creating the task structure
      await this._checkForCycle(id, taskData.parentId);
    }

    const newTask: Task = {
      id,
      // parentId, name, summary, description, prompt, role are from taskData
      ...taskData,
      contexts: taskData.contexts || [],
      status: "PENDING", // Default status
      createdAt: now,
      updatedAt: now,
    };

    await this._persistTask(newTask);
    return id;
  }

  /**
   * Finds a task by its ID.
   * @param {string} id - The ID of the task to find.
   * @returns {Promise<Task | undefined>} The task if found, otherwise undefined.
   */
  async find(id: string): Promise<Task | undefined> {
    // Assuming this.tasks is the source of truth after _initializeRepo
    // If direct storage reads are needed for freshness, this could change:
    // return await this.storage.read(id);
    const task = this.tasks.get(id);
    if (task && task.status === "PENDING") {
      return task;
    }
    return undefined;
  }

  /**
   * Updates an existing task.
   * Only allows patching of specified fields. `id`, `createdAt`, `updatedAt` cannot be updated.
   * `status` updates might be better handled by dedicated methods if logic is complex.
   * Automatically updates the `updatedAt` timestamp.
   * @param {string} id - The ID of the task to update.
   * @param {Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>} patch - An object containing the fields to update.
   *        This allows updating `parentId`, `name`, `summary`, `description`, `prompt`, `role`, `contexts`, and `status`.
   * @returns {Promise<void>}
   * @throws {CycleError} If updating `parentId` would create a cycle.
   * @throws {ParentNotFoundError} If a new `parentId` is provided but the parent task does not exist.
   * @throws {Error} If the task with the given ID is not found.
   */
  async update(
    id: string,
    patch: Partial<
      Omit<Task, "id" | "createdAt" | "updatedAt"> // Allow parentId and status to be updated
    >
  ): Promise<void> {
    const task = await this.find(id);
    if (!task) {
      throw new Error(`Task with id ${id} not found.`);
    }

    // Create updated task, ensuring not to spread undefined values from patch that might overwrite existing fields with undefined.
    const updatedTask: Task = { ...task };

    // Apply patch carefully
    for (const key in patch) {
      if (patch.hasOwnProperty(key)) {
        const typedKey = key as keyof typeof patch;
        if (patch[typedKey] !== undefined) {
          // Specific handling for parentId update
          if (typedKey === "parentId") {
            const newParentId = patch[typedKey] as string | undefined;
            if (newParentId !== task.parentId) {
              // Only check if parentId is actually changing
              if (newParentId) {
                // If setting a new parent
                const parentTask = await this.find(newParentId);
                if (!parentTask) {
                  throw new ParentNotFoundError(newParentId);
                }
                await this._checkForCycle(id, newParentId);
              }
              // If newParentId is undefined, it means we are detaching it from its parent. No cycle check needed.
              (updatedTask as any)[typedKey] = newParentId;
            }
          } else {
            (updatedTask as any)[typedKey] = patch[typedKey];
          }
        }
      }
    }
    updatedTask.updatedAt = new Date();

    await this._persistTask(updatedTask);
  }

  /**
   * Removes a task.
   * By default, performs a soft delete by setting the task's status to 'DELETED' (to be implemented in Step 3).
   * If `cascade` is true, recursively removes all child tasks (to be implemented in Step 3).
   *    Cascade removal will now need to find children by querying tasks with matching parentId.
   * @param {string} id - The ID of the task to remove.
   * @param {{ cascade?: boolean }} options - Options for removal, e.g., cascade delete.
   * @returns {Promise<void>}
   * @throws {Error} If the task with the given ID is not found.
   */
  async remove(id: string, options: { cascade?: boolean } = {}): Promise<void> {
    const task = await this.find(id);
    if (!task) {
      throw new Error(`Task with id ${id} not found.`);
    }

    // Placeholder for Step 3 logic (soft delete, cascade)
    // Example for soft delete:
    // task.status = 'DELETED';
    // task.updatedAt = new Date();
    // await this._persistTask(task);
    //
    // if (options.cascade && task.childrenIds) { ... }

    // Current placeholder: actual removal
    await this._removeTaskFromPersistence(id);
  }

  /**
   * Lists tasks.
   * If `parentId` is provided, lists direct children of that parent.
   * If `parentId` is undefined, lists all top-level tasks (tasks without a parent).
   * @param {string} [parentId] - The ID of the parent task.
   * @returns {Promise<Task[]>} An array of tasks.
   */
  async list(parentId?: string): Promise<Task[]> {
    // Ensure tasks are loaded if _initializeRepo might not have finished or failed silently
    if (this.tasks.size === 0) {
      await this._initializeRepo();
    }
    const allTasks = Array.from(this.tasks.values());
    let filteredByParentTasks: Task[];
    if (parentId === undefined) {
      filteredByParentTasks = allTasks.filter((task) => !task.parentId);
    } else {
      // This lists tasks that have parentId set to the given parentId.
      // If childrenIds on the parent is the source of truth for children, this logic would change.
      // For now, this is consistent with the request for `list(parentId?)`
      filteredByParentTasks = allTasks.filter(
        (task) => task.parentId === parentId
      );
    }
    // Further filter by status
    return filteredByParentTasks.filter((task) => task.status === "PENDING");
  }

  async firstTask(parentId?: string) {
    const tasks = await this.list(parentId);
    return tasks[0];
  }
}
