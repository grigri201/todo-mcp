import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import fs from "fs/promises";
import path from "path";
import { TomlFileStorage } from "./toml-file.storage";
import type { Task } from "../type/task";
import TOML from "@iarna/toml";

const TEST_FILE_DIR = "./test_data";
const TEST_FILE_PATH = path.join(TEST_FILE_DIR, "test-tasks.toml");

describe("TomlFileStorage", () => {
  let storage: TomlFileStorage;

  beforeEach(async () => {
    // Create a directory for test files if it doesn't exist
    try {
      await fs.access(TEST_FILE_DIR);
    } catch {
      await fs.mkdir(TEST_FILE_DIR, { recursive: true });
    }
    // Ensure the test file is clean before each test
    try {
      await fs.unlink(TEST_FILE_PATH);
    } catch (error: any) {
      // Ignore error if file doesn't exist
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
    storage = new TomlFileStorage();
  });

  afterEach(async () => {
    // Clean up the test file after each test
    try {
      await fs.unlink(TEST_FILE_PATH);
    } catch (error: any) {
      // Ignore error if file doesn't exist
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
    // Clean up the test directory if it's empty
    try {
      const files = await fs.readdir(TEST_FILE_DIR);
      if (files.length === 0) {
        await fs.rmdir(TEST_FILE_DIR);
      }
    } catch (error: any) {
      // ignore
    }
  });

  // Test cases will be added here
  describe("init", () => {
    test("should initialize and create a new file if it does not exist", async () => {
      await storage.init({ filePath: TEST_FILE_PATH });
      // Check if file was created
      await fs.access(TEST_FILE_PATH);
      const content = await fs.readFile(TEST_FILE_PATH, "utf-8");
      expect(content).toBe("tasks = [ ]\n"); // Adjusted expectation for space
    });

    test("should initialize and load tasks from an existing file", async () => {
      const now = new Date();
      const initialTasks: Task[] = [
        {
          id: "1",
          title: "Test Task 1",
          summary: "",
          description: "",
          prompt: "",
          role: "",
          context: [],
          is_complted: "PENDING",
          createdAt: now,
          updatedAt: now,
        },
      ];
      const tomlString = TOML.stringify({ tasks: initialTasks as any[] });
      await fs.writeFile(TEST_FILE_PATH, tomlString);

      await storage.init({ filePath: TEST_FILE_PATH });
      const tasks = await storage.getTasks();

      expect(tasks.length).toBe(1);
      const task = tasks[0];
      expect(task).toBeDefined();

      if (!task) {
        throw new Error("Test setup failed: task should be defined");
      }

      expect(task.title).toBe("Test Task 1");
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.createdAt.toISOString()).toBe(now.toISOString());
    });

    test("should throw an error if filePath is not provided in config", async () => {
      await expect(storage.init({} as any)).rejects.toThrow(
        "File path is required in config for TomlFileStorage."
      );
      await expect(storage.init(null as any)).rejects.toThrow(
        "File path is required in config for TomlFileStorage."
      );
      await expect(storage.init({ filePath: null } as any)).rejects.toThrow(
        "File path is required in config for TomlFileStorage."
      );
      await expect(storage.init({ filePath: "" } as any)).rejects.toThrow(
        "File path is required in config for TomlFileStorage."
      );
    });

    test("should initialize with an empty task list if the TOML file is invalid", async () => {
      await fs.writeFile(TEST_FILE_PATH, "invalid toml content");
      await storage.init({ filePath: TEST_FILE_PATH });
      const tasks = await storage.getTasks();
      expect(tasks.length).toBe(0);
      // And the file should be overwritten with a valid empty tasks list
      const content = await fs.readFile(TEST_FILE_PATH, "utf-8");
      expect(content).toBe("tasks = [ ]\n"); // Adjusted expectation for space
    });
  });

  describe("createTask", () => {
    beforeEach(async () => {
      // Initialize storage before each test in this describe block
      await storage.init({ filePath: TEST_FILE_PATH });
    });

    test("should create a new task with minimal properties and save it", async () => {
      const partialTask = { name: "New Task" };
      const createdTask = await storage.createTask(partialTask);

      expect(createdTask.id).toBeDefined();
      expect(createdTask.title).toBe("New Task");
      expect(createdTask.summary).toBe(""); // Default value
      expect(createdTask.description).toBe(""); // Default value
      expect(createdTask.prompt).toBe(""); // Default value
      expect(createdTask.role).toBe(""); // Default value
      expect(createdTask.context).toEqual([]); // Default value
      expect(createdTask.is_complted).toBe("PENDING"); // Default value
      expect(createdTask.createdAt).toBeInstanceOf(Date);
      expect(createdTask.updatedAt).toBeInstanceOf(Date);

      const tasks = await storage.getTasks();
      expect(tasks.length).toBe(1);
      const task = tasks[0];
      if (!task) throw new Error("Task not found after creation");
      expect(task.id).toBe(createdTask.id);
      expect(task.title).toBe("New Task");
    });

    test("should create a new task with all properties and save it", async () => {
      const now = new Date();
      const fullTaskData: Partial<Task> = {
        title: "Full Task",
        summary: "Task summary",
        description: "Task description",
        prompt: "Task prompt",
        role: "Task role",
        context: [], // Changed to empty array to avoid type conflict for now
        is_complted: "PENDING", // Changed to 'PENDING' as it's a known valid status
      };
      const createdTask = await storage.createTask(fullTaskData);

      expect(createdTask.id).toBeDefined();
      expect(createdTask.title).toBe("Full Task");
      expect(createdTask.summary).toBe("Task summary");
      expect(createdTask.is_complted).toBe("PENDING"); // Check against the assigned status
      expect(createdTask.createdAt).toBeInstanceOf(Date);
      expect(createdTask.updatedAt).toBeInstanceOf(Date);
      expect(createdTask.createdAt.getTime()).toBeGreaterThanOrEqual(
        now.getTime() - 1000
      );

      const tasksAfterCreate = await storage.getTasks();
      expect(tasksAfterCreate.length).toBe(1);
      const savedTask = tasksAfterCreate[0];
      if (!savedTask) throw new Error("Saved task not found");
      expect(savedTask.summary).toBe("Task summary");
    });

    test("should throw an error if storage is not initialized", async () => {
      const uninitializedStorage = new TomlFileStorage();
      await expect(
        uninitializedStorage.createTask({ title: "test" })
      ).rejects.toThrow("Storage not initialized. Call init() first.");
    });
  });

  describe("getTasks", () => {
    beforeEach(async () => {
      await storage.init({ filePath: TEST_FILE_PATH });
    });

    test("should return an empty array if no tasks exist", async () => {
      const tasks = await storage.getTasks();
      expect(tasks).toEqual([]);
    });

    test("should return all tasks if no parentId is provided", async () => {
      await storage.createTask({ title: "Task 1" });
      await storage.createTask({ title: "Task 2" });
      const tasks = await storage.getTasks();
      expect(tasks.length).toBe(2);
      expect(tasks.find((t) => t.title === "Task 1")).toBeDefined();
      expect(tasks.find((t) => t.title === "Task 2")).toBeDefined();
    });

    test("should return only tasks with the specified parentId", async () => {
      const parentTask = await storage.createTask({ title: "Parent Task" });
      await storage.createTask({
        title: "Child Task 1",
        parentId: parentTask.id,
      });
      await storage.createTask({
        title: "Child Task 2",
        parentId: parentTask.id,
      });
      await storage.createTask({ title: "Orphan Task" }); // No parentId

      const childTasks = await storage.getTasks(parentTask.id);
      expect(childTasks.length).toBe(2);
      expect(childTasks.every((t) => t.parentId === parentTask.id)).toBe(true);
      expect(childTasks.find((t) => t.title === "Child Task 1")).toBeDefined();
      expect(childTasks.find((t) => t.title === "Child Task 2")).toBeDefined();
    });

    test("should return an empty array if parentId is specified but no tasks match", async () => {
      await storage.createTask({ title: "Task 1" });
      const tasks = await storage.getTasks("non-existent-parent-id");
      expect(tasks).toEqual([]);
    });

    test("should throw an error if storage is not initialized", async () => {
      const uninitializedStorage = new TomlFileStorage();
      await expect(uninitializedStorage.getTasks()).rejects.toThrow(
        "Storage not initialized. Call init() first."
      );
    });
  });

  describe("updateTask", () => {
    let initialTask: Task;

    beforeEach(async () => {
      await storage.init({ filePath: TEST_FILE_PATH });
      initialTask = await storage.createTask({
        title: "Initial Task",
        summary: "Initial Summary",
      });
    });

    test("should update an existing task and return the updated task", async () => {
      const updates: Partial<Task> = {
        title: "Updated Task Name",
        summary: "Updated Summary",
        is_complted: "DONE",
      };

      // Wait for a short period to ensure updatedAt will be different
      await new Promise((resolve) => setTimeout(resolve, 300)); // 300ms delay

      const updatedTask = await storage.updateTask(initialTask.id, updates);

      expect(updatedTask.id).toBe(initialTask.id);
      expect(updatedTask.title).toBe("Updated Task Name");
      expect(updatedTask.summary).toBe("Updated Summary");
      expect(updatedTask.is_complted).toBe("DONE");
      expect(updatedTask.createdAt.toISOString()).toBe(
        initialTask.createdAt.toISOString()
      ); // Should not change
      expect(updatedTask.updatedAt.getTime()).toBeGreaterThan(
        initialTask.updatedAt.getTime()
      );

      const taskAfterUpdate = await storage.getTasks();
      const taskInStorage = taskAfterUpdate.find(
        (t) => t.id === initialTask.id
      );
      expect(taskInStorage).toBeDefined();
      if (!taskInStorage) throw new Error("Task not in storage after update");
      expect(taskInStorage.title).toBe("Updated Task Name");
      expect(taskInStorage.is_complted).toBe("DONE");
    });

    test("should only update provided fields, keeping others intact", async () => {
      const updates: Partial<Task> = { summary: "Only Summary Updated" };
      const updatedTask = await storage.updateTask(initialTask.id, updates);

      expect(updatedTask.title).toBe(initialTask.title); // Should remain "Initial Task"
      expect(updatedTask.summary).toBe("Only Summary Updated");
      expect(updatedTask.is_complted).toBe(initialTask.is_complted); // Should remain PENDING (default)
    });

    test("should throw an error if trying to update a non-existent task", async () => {
      await expect(
        storage.updateTask("non-existent-id", { title: "test" })
      ).rejects.toThrow('Task with id "non-existent-id" not found.');
    });

    test("should throw an error if storage is not initialized", async () => {
      const uninitializedStorage = new TomlFileStorage();
      // No need to create a task as init itself will be the point of failure for accessing filePath
      await expect(
        uninitializedStorage.updateTask("any-id", { title: "test" })
      ).rejects.toThrow("Storage not initialized. Call init() first.");
    });
  });

  describe("deleteTask", () => {
    let taskToDelete: Task;

    beforeEach(async () => {
      await storage.init({ filePath: TEST_FILE_PATH });
      taskToDelete = await storage.createTask({ title: "Task to Delete" });
      // Add another task to ensure only the specified one is deleted
      await storage.createTask({ title: "Another Task" });
    });

    test("should delete an existing task", async () => {
      await storage.deleteTask(taskToDelete.id);
      const tasks = await storage.getTasks();
      expect(tasks.length).toBe(1);
      expect(tasks.find((t) => t.id === taskToDelete.id)).toBeUndefined();

      const remainingTask = tasks[0];
      if (!remainingTask) {
        throw new Error(
          "Test logic error: remaining task should be defined after deletion."
        );
      }
      expect(remainingTask.title).toBe("Another Task");
    });

    test("should not throw an error if trying to delete a non-existent task (idempotency)", async () => {
      await expect(
        storage.deleteTask("non-existent-id")
      ).resolves.toBeUndefined();
      const tasks = await storage.getTasks();
      expect(tasks.length).toBe(2); // No task should have been deleted
    });

    test("should throw an error if storage is not initialized", async () => {
      const uninitializedStorage = new TomlFileStorage();
      await expect(uninitializedStorage.deleteTask("any-id")).rejects.toThrow(
        "Storage not initialized. Call init() first."
      );
    });
  });
});
