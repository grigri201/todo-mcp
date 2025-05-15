import * as fs from "fs/promises";
import * as path from "path";
import type { IStorage } from "./storage";
import type { Task } from "../type/task";
import { findAndReplace, find } from "./helper/file-search-replace"; // Assuming this is the correct path
import type { FilePatch } from "./helper/file-search-replace"; // Use type-only import for FilePatch
import { v4 as uuidv4 } from "uuid"; // Import uuid

// Helper function to generate a unique ID (example implementation)
function generateId(): string {
  return uuidv4();
}

export class MarkdownStorage implements IStorage {
  private storagePath!: string;
  private tasksFilePath!: string;
  private contentDirPath!: string;

  async init(config: { path?: string }): Promise<void> {
    this.storagePath = config.path || process.cwd();
    this.tasksFilePath = path.join(this.storagePath, "tasks.md");
    this.contentDirPath = path.join(this.storagePath, "content");

    try {
      await fs.access(this.storagePath);
    } catch (error) {
      await fs.mkdir(this.storagePath, { recursive: true });
    }

    try {
      await fs.access(this.tasksFilePath);
    } catch (error) {
      await fs.writeFile(this.tasksFilePath, "");
    }

    try {
      await fs.access(this.contentDirPath);
    } catch (error) {
      await fs.mkdir(this.contentDirPath, { recursive: true });
    }
  }

  async createTask(task: Partial<Task>): Promise<Task> {
    const taskId = task.id || generateId();
    const taskTitle = task.title || "Untitled Task";
    const taskPrompt = task.prompt || "";
    const taskRole = task.role || "";
    const taskContexts = task.context || "";

    const newTask: Task = {
      ...task,
      id: taskId,
      title: taskTitle,
      prompt: taskPrompt,
      role: taskRole,
      context: taskContexts,
      is_completed: false,
    };

    // Create content file for the task details (not directly part of tasks.md modification)
    const contentFilePath = path.join(this.contentDirPath, `${taskId}.md`);
    await fs.writeFile(contentFilePath, ""); // Assuming task details (prompt, role, context) go here

    // Logic to modify tasks.md
    const originalTasksContent = await fs
      .readFile(this.tasksFilePath, "utf-8")
      .catch((err) => {
        // If the file doesn't exist or is empty, treat it as empty string
        if (err.code === "ENOENT") return "";
        throw err;
      });
    let lines = originalTasksContent
      .split("\n")
      .filter((line) => line.trim() !== "" || line === ""); // Preserve existing empty lines if any, but filter those that are only whitespace after split
    if (lines.length === 1 && lines[0] === "") lines = []; // Handle case where file was empty or just a newline

    let taskEntry = `- [ ] [${newTask.title}](./content/${taskId}.md) id:${taskId}`;

    if (newTask.parentId) {
      let parentIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line?.includes(`id:${newTask.parentId}`)) {
          parentIndex = i;
          break;
        }
      }

      if (parentIndex !== -1 && lines[parentIndex] !== undefined) {
        const parentLine = lines[parentIndex]!;
        const parentIndentMatch = parentLine.match(/^(\s*)/);
        const parentIndent = parentIndentMatch ? parentIndentMatch[0] : "";
        const subTaskIndent = parentIndent + "\t";
        taskEntry = `${subTaskIndent}${taskEntry}`;
        lines.splice(parentIndex + 1, 0, taskEntry);
      } else {
        // Parent not found or line undefined, append as a top-level task
        lines.push(taskEntry);
      }
    } else {
      // No parentId, append as a top-level task
      lines.push(taskEntry);
    }

    const newTasksContent = lines.join("\n");

    // Only call findAndReplace if the content has actually changed.
    // findAndReplace itself also checks this, but this prevents an unnecessary call.
    if (originalTasksContent !== newTasksContent) {
      const patch: FilePatch = {
        file: this.tasksFilePath,
        from: originalTasksContent, // Replace entire old content
        to: newTasksContent, // With entire new content
      };
      const results = await findAndReplace([patch]);
      // Optional: Check results[0].err for any errors during findAndReplace
      if (results[0]?.err) {
        console.error(
          "Error during task creation persistence:",
          results[0].err
        );
        // Potentially throw an error or handle it
        throw results[0].err;
      }
    } else if (originalTasksContent === "" && newTasksContent === "") {
      // If both are empty (e.g. creating first task in an empty file initially considered non-existent)
      // we might still want to write. However, the above logic for `lines.join('\n')` would result in `taskEntry` string.
      // This specific edge case needs careful handling if `readFile` throws ENOENT and `originalTasksContent` is empty.
      // The current logic: if original is "" and new is "taskEntry", it will proceed to patch.
      // If original is "" and new is also "", it won't patch.
      // This seems fine. The only case where originalTasksContent === newTasksContent and both are empty is if no task was added.
    }

    return newTask;
  }

  async getTask(id: string): Promise<Task> {
    // const contentFilePath = path.join(this.contentDirPath, `${id}.md`); // Original placement
    // try {
    //   await fs.access(contentFilePath);
    // } catch (error) {
    //   // If content file doesn't exist, we might still want to return task metadata from tasks.md
    //   // console.warn(`Content file not found for task ${id}: ${contentFilePath}`);
    // } // This block will be replaced by more specific error handling below.

    // Use the imported find function to get the specific task line
    const taskLine = await find(this.tasksFilePath, `id:${id}`);

    if (!taskLine) {
      throw new Error(`Task with id ${id} not found in ${this.tasksFilePath}`);
    }

    const titleMatch = taskLine.match(/\[(.*?)\]/);
    const title = titleMatch ? titleMatch[1] : "Untitled Task";
    const is_completed = taskLine.includes("- [x]");

    let filePrompt = "";
    let fileRole = "";
    let fileContext = "";
    const contentFilePath = path.join(this.contentDirPath, `${id}.md`);

    try {
      const fileContent = await fs.readFile(contentFilePath, "utf-8");
      if (fileContent.trim() !== "") {
        try {
          // Attempt to parse as JSON first
          const parsedContent = JSON.parse(fileContent);
          filePrompt = parsedContent.prompt || "";
          fileRole = parsedContent.role || "";
          fileContext = parsedContent.context || "";
        } catch (jsonError) {
          // If not JSON, assume the entire content is the prompt
          filePrompt = fileContent;
          // role and context remain empty if not parsable as JSON and not plain text.
        }
      }
      // If fileContent is empty or only whitespace, prompt, role, context remain ""
    } catch (error: any) {
      // If file doesn't exist (ENOENT) or other read errors, fields remain default empty strings.
      // Log a warning for errors other than ENOENT.
      if (error.code !== "ENOENT") {
        console.warn(
          `Could not read or parse content file ${contentFilePath} for task ${id}: ${error.message}`
        );
      }
    }

    return {
      id,
      title,
      is_completed,
      prompt: filePrompt,
      role: fileRole,
      context: fileContext,
    } as Task;
  }

  async getTasks(parentId?: string): Promise<Task[]> {
    const tasksContent = await fs.readFile(this.tasksFilePath, "utf-8");
    const lines = tasksContent.split("\n").filter((line) => line.trim() !== ""); // Filter out empty lines
    const tasks: Task[] = [];

    if (parentId) {
      let parentLineIndex = -1;
      let parentIndent = "";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (typeof line === "string" && line.includes(`id:${parentId}`)) {
          parentLineIndex = i;
          const parentLineMatch = line.match(/^(\s*)/);
          parentIndent = parentLineMatch ? parentLineMatch[0] : "";
          break;
        }
      }

      if (parentLineIndex !== -1) {
        const subTaskIndent = parentIndent + "\t";
        for (let i = parentLineIndex + 1; i < lines.length; i++) {
          const currentLine = lines[i];
          if (typeof currentLine === "string") {
            const currentLineIndentMatch = currentLine.match(/^(\s*)/);
            const currentLineIndent = currentLineIndentMatch
              ? currentLineIndentMatch[0]
              : "";

            if (
              currentLineIndent === subTaskIndent &&
              currentLine.startsWith(subTaskIndent)
            ) {
              const idMatch = currentLine.match(/id:(\S+)/);
              const titleMatch = currentLine.match(/\[(.*?)\]/);
              if (idMatch && titleMatch) {
                tasks.push({
                  id: idMatch[1],
                  title: titleMatch[1],
                  is_completed: currentLine.includes("- [x]"),
                  parentId: parentId,
                  prompt: "",
                  role: "",
                  context: "",
                } as Task);
              }
            } else if (currentLineIndent.length <= parentIndent.length) {
              // Reached a line that is not a subtask of the parent or is a new top-level/sibling task
              break;
            }
          }
        }
      }
    } else {
      // Get top-level tasks (lines that do not start with a tab or start with only list marker)
      for (const line of lines) {
        const indentMatch = line.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[0] : "";
        // A top-level task is one that starts with '- [ ]' or '- [x]' and has no tabs, or minimal space before list marker
        if (
          !indent.includes("\t") &&
          (line.startsWith("- [ ]") || line.startsWith("- [x]"))
        ) {
          const idMatch = line.match(/id:(\S+)/);
          const titleMatch = line.match(/\[(.*?)\]/);
          if (idMatch && titleMatch) {
            tasks.push({
              id: idMatch[1],
              title: titleMatch[1],
              is_completed: line.includes("- [x]"),
              prompt: "",
              role: "",
              context: "",
            } as Task);
          }
        }
      }
    }
    return tasks;
  }

  async updateTask(id: string, taskUpdate: Partial<Task>): Promise<Task> {
    const tasksFileContent = await fs.readFile(this.tasksFilePath, "utf-8");
    const lines = tasksFileContent.split("\n");
    const taskIndex = lines.findIndex((line) => line.includes(`id:${id}`));

    if (taskIndex === -1) {
      throw new Error(`Task with id ${id} not found in ${this.tasksFilePath}`);
    }

    const originalTaskLine = lines[taskIndex];
    if (originalTaskLine === undefined) {
      // Should not happen if taskIndex is valid
      throw new Error(`Task line for id ${id} is unexpectedly undefined.`);
    }
    let updatedTaskLine = originalTaskLine;

    // Update title
    if (taskUpdate.title) {
      const titleRegex = /\[(.*?)\]/;
      updatedTaskLine = updatedTaskLine.replace(
        titleRegex,
        `[${taskUpdate.title}]`
      );
    }

    // Update completion status
    if (typeof taskUpdate.is_completed === "boolean") {
      if (taskUpdate.is_completed) {
        updatedTaskLine = updatedTaskLine.replace(/^- \[ \]/, "- [x]");
      } else {
        updatedTaskLine = updatedTaskLine.replace(/^- \[x\]/, "- [ ]");
      }
    }

    if (originalTaskLine !== updatedTaskLine) {
      const patch: FilePatch = {
        file: this.tasksFilePath,
        from: originalTaskLine, // Exact original line content
        to: updatedTaskLine, // Exact new line content
      };
      const results = await findAndReplace([patch]);
      if (results[0]?.err) {
        console.error(`Error updating task ${id}:`, results[0].err);
        throw results[0].err;
      }
      // If findAndReplace could potentially affect other identical lines (if `from` wasn't unique enough),
      // this approach is fine. If `from` string could appear multiple times and we only want to change one instance,
      // findAndReplace would need to support that (e.g. by line number, or by only first match, which it does for strings).
      // Since we are replacing the exact full original line content, this should be safe.
    }

    // Fetch the task representation. Note: prompt, role, context are not in tasks.md line.
    const updatedTaskData = await this.getTask(id); // getTask will re-read and parse the (potentially) updated line.

    // Apply other updates that are not stored in tasks.md line itself but in the Task object (and potentially content file)
    // This part of the logic would typically involve updating the content file if prompt/role/context changed.
    // For this refactoring, we primarily focus on tasks.md modifications.
    const finalTask: Task = {
      ...updatedTaskData, // Contains id, title, is_completed from tasks.md
      prompt:
        taskUpdate.prompt !== undefined
          ? taskUpdate.prompt
          : updatedTaskData.prompt,
      role:
        taskUpdate.role !== undefined ? taskUpdate.role : updatedTaskData.role,
      context:
        taskUpdate.context !== undefined
          ? taskUpdate.context
          : updatedTaskData.context,
      parentId:
        taskUpdate.parentId !== undefined
          ? taskUpdate.parentId
          : updatedTaskData.parentId,
    };

    return finalTask;
  }

  async deleteTask(id: string): Promise<void> {
    const contentFilePath = path.join(this.contentDirPath, `${id}.md`);
    try {
      await fs.unlink(contentFilePath);
    } catch (error: any) {
      if (error.code !== "ENOENT") {
        console.warn(`Error deleting content file ${contentFilePath}:`, error);
      }
    }

    const originalTasksContent = await fs
      .readFile(this.tasksFilePath, "utf-8")
      .catch((err) => {
        if (err.code === "ENOENT") return ""; // If file doesn't exist, nothing to delete from it.
        throw err;
      });

    if (originalTasksContent === "") {
      // Nothing to delete if the file is empty or doesn't exist.
      return;
    }

    let lines = originalTasksContent.split("\n");
    const taskIndex = lines.findIndex((line) => line.includes(`id:${id}`));

    if (taskIndex !== -1) {
      const taskLineContent = lines[taskIndex];
      let taskIndent = "";

      if (typeof taskLineContent === "string") {
        const taskIndentMatch = taskLineContent.match(/^(\s*)/);
        taskIndent = taskIndentMatch ? taskIndentMatch[0] : "";
      } else {
        // This case should ideally not be hit if taskIndex is valid and file format is consistent.
        console.warn(
          `Task line for id ${id} at index ${taskIndex} was not a string or was undefined.`
        );
        // If taskIndent cannot be determined, we can only safely delete the found line.
        // Sub-task deletion might be unreliable.
      }

      lines.splice(taskIndex, 1); // Remove the task itself

      // Remove subtasks if taskIndent was determined
      if (taskIndent !== undefined) {
        // Ensure taskIndent could be determined
        let i = taskIndex;
        while (i < lines.length) {
          const currentLine = lines[i];
          if (typeof currentLine === "string") {
            const currentLineIndentMatch = currentLine.match(/^(\s*)/);
            const currentLineIndent = currentLineIndentMatch
              ? currentLineIndentMatch[0]
              : "";

            if (
              currentLineIndent.length > taskIndent.length &&
              currentLineIndent.startsWith(taskIndent + "\t") // Basic check for subtask
            ) {
              lines.splice(i, 1); // Remove subtask
              // Do not increment i here, as the array is modified
            } else if (currentLineIndent.length <= taskIndent.length) {
              // No longer in subtasks of the deleted task
              break;
            } else {
              // Not a direct sub-task by the simple check, or different indentation pattern
              i++;
            }
          } else {
            // currentLine is not a string (e.g. undefined if array was manipulated unexpectedly)
            i++;
          }
        }
      }

      const newTasksContent = lines.join("\n");

      if (originalTasksContent !== newTasksContent) {
        const patch: FilePatch = {
          file: this.tasksFilePath,
          from: originalTasksContent,
          to: newTasksContent,
        };
        const results = await findAndReplace([patch]);
        if (results[0]?.err) {
          console.error(
            `Error deleting task ${id} from tasks.md:`,
            results[0].err
          );
          throw results[0].err;
        }
      }
    }
    // If task not found in tasks.md, we assume it's already deleted or never existed there.
  }
}
