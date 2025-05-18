import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { findAndReplace, find } from "./file-search-replace";
import * as fs from "fs/promises";

// Ensure the task file exists, create if not
async function ensureTaskFile(filePath: string) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, "");
  }
}

export function useTaskManagementTool(server: McpServer, filePath: string) {
  server.tool(
    "manage-task",
    `A task management tool that let the agents edit the task list.
this tool is used to record tasks and edit them, and it can also break down complex tasks into subtasks.

When to use this tool:
- User requests to record current tasks
- Breaking down complex tasks into subtasks
- Problems that require a multi-step solution
- Tasks that need to maintain context over multiple steps
- Situations where irrelevant information needs to be filtered outs

Key Features:
- Record and check tasks
- Break down complex tasks into subtasks
- Maintain context over multiple steps

Parameters explained:
- title: The title of the task
- original_text: The original text of the task
- edited_text: The edited text of the task

You should:
1. Break down each task into: title, prompt, context, refers, member
  - title: A brief description of the task
  - prompt: The prompt that the agent may use when completing the task
  - context: Context about the task in the history
  - refers: Files or URLs related to the task
  - member: Recommended characters for this quest. Usually 'agent' or 'user'
2. The format of the task should follow the following standards
\`\`\`
- [ ]: {title}
  - prompt: {prompt}
  - context: {context}
  - refers: {refers}
  - member: {member}
  - [ ]: subtasks
\`\`\`
3. Only modify one task-related content at a time
4. Feel free to ask the user to add more content about the task
`,
    {
      title: z.string(),
      original_text: z.string(),
      edited_text: z.string(),
    },
    async (params) => {
      await ensureTaskFile(filePath);

      const patch = {
        file: filePath,
        from: params.original_text,
        to: params.edited_text,
      };
      try {
        const results = await findAndReplace([patch]);
        const result = results[0];
        if (result && result.changed) {
          return {
            content: [{ type: "text", text: `Task updated: ${params.title}` }],
          };
        } else if (result && result.err) {
          return {
            content: [{ type: "text", text: `Error: ${result.err.message}` }],
          };
        } else {
          return {
            content: [
              { type: "text", text: `No changes made to the task file.` },
            ],
          };
        }
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Unexpected error: ${err.message}` }],
        };
      }
    }
  );

  server.tool(
    "get-task",
    "Get the task list",
    {
      title: z.string().optional(),
    },
    async (params) => {
      await ensureTaskFile(filePath);

      if (params.title) {
        // 查找指定 title 的任务及其 subtasks
        try {
          const line = await find(filePath, `- [ ]: ${params.title}`);
          if (!line) {
            return {
              content: [
                { type: "text", text: `Task not found: ${params.title}` },
              ],
            };
          }
          // 读取全部内容，提取该任务及其缩进内容（subtasks）
          const content = await fs.readFile(filePath, "utf-8");
          const lines = content.split("\n");
          const idx = lines.findIndex((l) => l.trim() === line.trim());
          if (idx === -1 || !lines[idx]) {
            return {
              content: [
                {
                  type: "text",
                  text: `Task not found in file: ${params.title}`,
                },
              ],
            };
          }
          // 收集该任务及其缩进内容
          const resultLines = [lines[idx]];
          const baseIndent = lines[idx].search(/\S/);
          for (let i = idx + 1; i < lines.length; i++) {
            const lineI = lines[i];
            if (!lineI) break;
            const indent = lineI.search(/\S/);
            if (indent <= baseIndent && lineI.trim() !== "") break;
            resultLines.push(lineI);
          }
          return {
            content: [{ type: "text", text: resultLines.join("\n") }],
          };
        } catch (err: any) {
          return {
            content: [{ type: "text", text: `Error: ${err.message}` }],
          };
        }
      } else {
        // 获取所有一级任务（不包括 subtasks）
        try {
          const content = await fs.readFile(filePath, "utf-8");
          const lines = content.split("\n");
          // 只取左侧无缩进的 - [ ]: 行
          const tasks = lines.filter((l) => l.match(/^\- \[ \]: /));
          if (tasks.length === 0) {
            return {
              content: [{ type: "text", text: "No tasks found." }],
            };
          }
          // 只返回 title
          const titles = tasks.map((l) => l.replace(/^- \[ \]: /, "").trim());
          return {
            content: [{ type: "text", text: `Tasks: ${titles.join(", ")}` }],
          };
        } catch (err: any) {
          return {
            content: [{ type: "text", text: `Error: ${err.message}` }],
          };
        }
      }
    }
  );
}
