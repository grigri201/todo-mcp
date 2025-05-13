import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { todoAPI } from './todos.js'; // Import todoAPI from the new file

// Define server configuration
const serverConfig = {
  name: 'TodoService',
  version: '0.1.0',
  description: 'A simple TODO list MCP service',
  api: todoAPI,
  // Assuming no specific capabilities like prompts or resources for this simple example
};

// Create the MCP server
const server = new McpServer(serverConfig);

async function startServer() {
  try {
    // Start MCP Server
    const transport = new StdioServerTransport(); // Use Stdio transport
    await server.connect(transport);
  } catch (error) {
    console.error('Failed to start servers:', error); // Modified error message
  }
}

startServer();