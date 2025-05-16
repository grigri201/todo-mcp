import path from "path";
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { useTaskManagementTool } from "./tools";

const server = new McpServer({
  name: "task-mcp",
  version: "0.1.0",
  description: `A task management tool that helps humans and agents collaborate.
This tool breaks down problems into atomic tasks step by step, recording them in a markdown file to facilitate task completion.`,
});
const defaultFilePath = path.join(process.cwd(), "task.md");
const taskFilePath = process.env.TASK_FILE_PATH || defaultFilePath;

useTaskManagementTool(server, taskFilePath);

const transport = new StdioServerTransport();
await server.connect(transport);
