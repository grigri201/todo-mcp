import * as path from "path";
import { fileURLToPath } from "url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { useTaskManagementTool } from "./tools";

async function main() {
  const server = new McpServer({
    name: "task-mcp",
    version: "0.1.0",
    description: `A task management tool that helps humans and agents collaborate.
This tool breaks down problems into atomic tasks step by step, recording them in a markdown file to facilitate task completion.`,
  });
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const taskFilePath = path.join(__dirname, "..", "task.md");

  useTaskManagementTool(server, taskFilePath);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
