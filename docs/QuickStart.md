# todo-mcp Quick Start Guide

Welcome to `todo-mcp`! This guide will help you get the `todo-mcp` service up and running and show you how to interact with its basic functionalities.

`todo-mcp` is a service for managing tasks (todos) via the Model Context Protocol (MCP). This means it's designed to be interacted with programmatically by MCP-compatible clients, rather than directly by end-users through a command-line interface for typical todo management.

This guide is primarily for developers or users who intend to integrate with or build upon the `todo-mcp` service.

## Prerequisites

*   **Bun:** `todo-mcp` uses the Bun runtime. Ensure you have Bun installed. You can find installation instructions at [bun.sh](https://bun.sh/).
*   **Git:** You'll need Git to clone the repository.

## Installation

1.  **Clone the Repository:**
    Open your terminal and clone the `todo-mcp` repository. Replace `<YOUR_REPOSITORY_URL>` with the actual Git URL of the project.

    ```bash
    git clone <YOUR_REPOSITORY_URL> todo-mcp
    cd todo-mcp
    ```

2.  **Install Dependencies:**
    Use Bun to install the project dependencies.

    ```bash
    bun install
    ```

## Running the Service

To start the `todo-mcp` service, run the following command from the root directory of the project:

```bash
bun run src/index.ts
```

You should see output indicating that the MCP server has started and is listening for connections (likely via stdio, based on the `StdioServerTransport` in `src/index.ts`).

Example (conceptual output):
```
McpServer task-mcp v0.1.0 listening...
```

The service is now running and ready to accept MCP requests.

## Interacting with todo-mcp (Core Functionality)

Interaction with `todo-mcp` involves sending MCP requests to its exposed "tools" (API functions). You would typically use an MCP client library or tool for this. The examples below are conceptual JSON representations of MCP tool calls.

Refer to the [API Documentation (API.md)](API.md) for detailed information on all parameters and tools.

### 1. Adding a Task

To add a new task, you can use the `addTask` tool.

**Conceptual Request:**

```json
{
  "tool_name": "addTask",
  "parameters": {
    "title": "Write Quick Start Guide",
    "summary": "Draft the initial quick start guide for todo-mcp.",
    "description": "The guide should cover prerequisites, installation, running the service, and basic interactions like adding, listing, and completing tasks.",
    "prompt": "Create a quick start guide for todo-mcp.",
    "role": "technical_writer",
    "contexts": []
  }
}
```

**Expected Response (Conceptual):**

```json
{
  "content": [{ "type": "text", "text": "Task added with ID: {new_task_id}" }]
}
```
Let\'s say this returns `Task added with ID: task_001`.

### 2. Listing Tasks

To see your tasks, use the `listTasks` tool. To list all top-level tasks:

**Conceptual Request:**

```json
{
  "tool_name": "listTasks",
  "parameters": {}
}
```

**Expected Response (Conceptual - snippet):**

```json
{
  "content": [{
    "type": "text",
    "text": "Task ID: task_001\\ncontext: \\ntitle: Write Quick Start Guide\\nsummary: Draft the initial quick start guide for todo-mcp.\\ndescription: The guide should cover prerequisites, installation, running the service, and basic interactions like adding, listing, and completing tasks.\\nprompt: Create a quick start guide for todo-mcp.\\nrole: technical_writer"
  }]
}
```

### 3. Completing a Task

Once you\'ve finished a task, you can mark it as "DONE" using the `completeTask` tool.

**Conceptual Request:**

```json
{
  "tool_name": "completeTask",
  "parameters": {
    "id": "task_001"
  }
}
```

**Expected Response (Conceptual):**

```json
{
  "content": [{ "type": "text", "text": "Task task_001 marked as completed." }]
}
```

### 4. Removing a Task

If you need to remove a task, use the `removeTask` tool.

**Conceptual Request:**

```json
{
  "tool_name": "removeTask",
  "parameters": {
    "id": "task_001"
  }
}
```

**Expected Response (Conceptual):**

```json
{
  "content": [{ "type": "text", "text": "Task task_001 removed successfully." }]
}
```

## Next Steps

This guide provided a brief overview of how to get `todo-mcp` running and interact with its basic features.

*   For a comprehensive understanding of all available tools, their parameters, and responses, please refer to the **[API Documentation (API.md)](API.md)**.
*   Explore other tools like `updateTask`, `addSubTask`, and `getFirstTask` to manage your tasks more effectively.

Happy tasking! 