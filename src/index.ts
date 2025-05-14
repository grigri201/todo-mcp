import path from "path";
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TaskRepo } from "./storage/task.repo.ts";
import { TomlFileStorage } from "./storage/toml-file.storage.ts";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Task } from "./type/task.ts";

const server = new McpServer({
  name: "task-mcp",
  version: "0.1.0",
});

function composeTaskString(task: Task): string {
  return `
context: ${task.contexts.join("\n")}

title: ${task.title}
summary: ${task.summary}
description: ${task.description}
prompt: ${task.prompt}
role: ${task.role}
`;
}

async function registerMcpHandlers(server: McpServer) {
  const tomlFileStorage = new TomlFileStorage();
  await tomlFileStorage.init({ filePath: path.join(__dirname, "tasks.toml") });

  const taskRepo = new TaskRepo(tomlFileStorage);

  // resources
  server.resource(
    "tasks",
    new ResourceTemplate("tasks://{parentId}/all", { list: undefined }),
    async (uri: URL, { parentId }: { parentId?: string }) => {
      const tasks = await taskRepo.list(parentId);
      return {
        uri: uri.href,
        contents: tasks.map((task) => ({
          uri: uri.href + "/" + task.id,
          text: composeTaskString(task),
        })),
      };
    }
  );

  server.resource(
    "first task",
    new ResourceTemplate("tasks://{parentId}/first", { list: undefined }),
    async (uri: URL, { parentId }: { parentId?: string }) => {
      const task = await taskRepo.firstTask(parentId);
      if (!task) {
        return {
          uri: uri.href,
          contents: [],
        };
      }
      return {
        uri: uri.href,
        contents: [
          {
            uri: "tasks://" + task.id,
            text: composeTaskString(task),
          },
        ],
      };
    }
  );

  // tools
  // addTask tool
  server.tool(
    "addTask",
    {
      title: z.string(),
      summary: z.string(),
      description: z.string(),
      prompt: z.string(),
      role: z.string(),
      parentId: z.string().optional(),
      contexts: z.array(z.string()).optional(),
    },
    async (params) => {
      try {
        const taskId = await taskRepo.create(params);
        return {
          content: [{ type: "text", text: `Task added with ID: ${taskId}` }],
        };
      } catch (error: any) {
        return {
          content: [
            { type: "text", text: `Error adding task: ${error.message}` },
          ],
        };
      }
    }
  );

  // updateTask tool
  server.tool(
    "updateTask",
    {
      id: z.string(),
      title: z.string().optional(),
      summary: z.string().optional(),
      description: z.string().optional(),
      prompt: z.string().optional(),
      role: z.string().optional(),
      parentId: z.string().optional().nullable(),
      contexts: z.array(z.string()).optional(),
      status: z.enum(["PENDING", "DONE", "DELETED"]).optional(),
    },
    async (params) => {
      const { id, ...patch } = params;
      // Filter out undefined values from the patch, and convert null parentId to undefined
      const filteredPatch = Object.entries(patch).reduce(
        (acc, [key, value]) => {
          if (key === "parentId" && value === null) {
            (acc as any)[key] = undefined;
          } else if (value !== undefined) {
            (acc as any)[key] = value;
          }
          return acc;
        },
        {} as Omit<typeof params, "id">
      );

      try {
        await taskRepo.update(
          id,
          filteredPatch as Partial<Omit<Task, "id" | "createdAt" | "updatedAt">>
        );
        return {
          content: [{ type: "text", text: `Task ${id} updated successfully.` }],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error updating task ${id}: ${error.message}`,
            },
          ],
        };
      }
    }
  );

  // removeTask tool
  server.tool(
    "removeTask",
    {
      id: z.string(),
      cascade: z.boolean().optional(),
    },
    async ({ id, cascade }) => {
      try {
        await taskRepo.remove(id, { cascade });
        return {
          content: [{ type: "text", text: `Task ${id} removed successfully.` }],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error removing task ${id}: ${error.message}`,
            },
          ],
        };
      }
    }
  );

  // addSubTask tool
  server.tool(
    "addSubTask",
    {
      parentId: z.string(), // parentId is required for a subtask
      title: z.string(),
      summary: z.string(),
      description: z.string(),
      prompt: z.string(),
      role: z.string(),
      contexts: z.array(z.string()).optional(),
    },
    async (params) => {
      try {
        const taskId = await taskRepo.create(params); // create method handles parentId
        return {
          content: [
            {
              type: "text",
              text: `Subtask added with ID: ${taskId} under parent ${params.parentId}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            { type: "text", text: `Error adding subtask: ${error.message}` },
          ],
        };
      }
    }
  );

  // completeTask tool
  server.tool(
    "completeTask",
    {
      id: z.string(),
    },
    async ({ id }) => {
      try {
        await taskRepo.update(id, { status: "DONE" });
        return {
          content: [{ type: "text", text: `Task ${id} marked as completed.` }],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error completing task ${id}: ${error.message}`,
            },
          ],
        };
      }
    }
  );
}

await registerMcpHandlers(server);

const transport = new StdioServerTransport();
await server.connect(transport);
