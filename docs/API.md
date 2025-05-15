# todo-mcp API Documentation

This document provides a detailed description of the API tools available in the `todo-mcp` service. These tools are exposed via the Model Context Protocol (MCP).

## Task Data Structure

Before diving into the API tools, it's important to understand the `Task` object structure, which is central to this API:

```typescript
export type TaskStatus = "PENDING" | "DONE" | "DELETED";

export interface Task {
  id: string;          // Unique identifier for the task
  parentId?: string;    // Optional ID of the parent task
  title: string;       // Name of the task
  summary: string;     // A brief summary of the task
  description: string; // Detailed description of the task
  prompt: string;      // The prompt used for executing the task
  role: string;        // The role responsible for the task
  contexts: string[];  // Absolute paths to relevant files or contexts
  status: TaskStatus;  // Current status of the task (PENDING, DONE, DELETED)
  createdAt: Date;     // Timestamp of when the task was created
  updatedAt: Date;     // Timestamp of when the task was last updated
}
```

## API Tools

The `todo-mcp` service provides the following tools:

---

### 1. `addTask`

**Purpose:** Creates a new task.

**Parameters:**

*   `title`:
    *   **Type:** `string`
    *   **Required:** Yes
    *   **Description:** The title or name of the task.
*   `summary`:
    *   **Type:** `string`
    *   **Required:** Yes
    *   **Description:** A concise summary of the task.
*   `description`:
    *   **Type:** `string`
    *   **Required:** Yes
    *   **Description:** A detailed description of the task.
*   `prompt`:
    *   **Type:** `string`
    *   **Required:** Yes
    *   **Description:** The prompt or instructions for executing the task.
*   `role`:
    *   **Type:** `string`
    *   **Required:** Yes
    *   **Description:** The designated role responsible for handling the task.
*   `parentId` (optional):
    *   **Type:** `string`
    *   **Required:** No
    *   **Description:** The ID of an existing parent task. If provided, this task will be created as a subtask.
*   `contexts` (optional):
    *   **Type:** `string[]` (array of strings)
    *   **Required:** No
    *   **Description:** A list of absolute file paths or other context strings relevant to the task.

**Returns:**

*   On success: A message like `Task added with ID: {taskId}`.
*   On failure: An error message, e.g., `Error adding task: {error.message}`.

**Example Invocation (Conceptual):**

```json
{
  "tool_name": "addTask",
  "parameters": {
    "title": "Setup Project",
    "summary": "Initialize the new project repository and basic structure.",
    "description": "Create a new Git repository, add a README.md, a .gitignore file, and setup the initial folder structure for the \'phoenix\' project.",
    "prompt": "Initialize a new project named \'phoenix\'.",
    "role": "developer",
    "contexts": ["/path/to/project-brief.md"]
  }
}
```

---

### 2. `updateTask`

**Purpose:** Updates an existing task.

**Parameters:**

*   `id`:
    *   **Type:** `string`
    *   **Required:** Yes
    *   **Description:** The unique identifier of the task to update.
*   `title` (optional):
    *   **Type:** `string`
    *   **Required:** No
    *   **Description:** The new title for the task.
*   `summary` (optional):
    *   **Type:** `string`
    *   **Required:** No
    *   **Description:** The new summary for the task.
*   `description` (optional):
    *   **Type:** `string`
    *   **Required:** No
    *   **Description:** The new detailed description for the task.
*   `prompt` (optional):
    *   **Type:** `string`
    *   **Required:** No
    *   **Description:** The new prompt for the task.
*   `role` (optional):
    *   **Type:** `string`
    *   **Required:** No
    *   **Description:** The new role for the task.
*   `parentId` (optional, nullable):
    *   **Type:** `string | null`
    *   **Required:** No
    *   **Description:** The new parent ID for the task. Set to `null` to make it a top-level task.
*   `contexts` (optional):
    *   **Type:** `string[]` (array of strings)
    *   **Required:** No
    *   **Description:** The new list of context strings.
*   `status` (optional):
    *   **Type:** `"PENDING" | "DONE" | "DELETED"`
    *   **Required:** No
    *   **Description:** The new status for the task.

**Returns:**

*   On success: A message like `Task {id} updated successfully.`
*   On failure: An error message, e.g., `Error updating task {id}: {error.message}`.

**Example Invocation (Conceptual):**

```json
{
  "tool_name": "updateTask",
  "parameters": {
    "id": "task_123",
    "summary": "Initialize the project with Bun.",
    "status": "PENDING"
  }
}
```

---

### 3. `removeTask`

**Purpose:** Deletes a task.

**Parameters:**

*   `id`:
    *   **Type:** `string`
    *   **Required:** Yes
    *   **Description:** The unique identifier of the task to delete.
*   `cascade` (optional):
    *   **Type:** `boolean`
    *   **Required:** No
    *   **Description:** If `true`, also deletes all descendant subtasks. If not provided or `false`, only the specified task is targeted for deletion (subtasks, if any, would not be automatically deleted).

**Returns:**

*   On success: A message like `Task {id} removed successfully.`
*   On failure: An error message, e.g., `Error removing task {id}: {error.message}`.

**Example Invocation (Conceptual):**

```json
{
  "tool_name": "removeTask",
  "parameters": {
    "id": "task_456",
    "cascade": true
  }
}
```

---

### 4. `addSubTask`

**Purpose:** Adds a new task as a subtask to an existing parent task.

**Parameters:**

*   `parentId`:
    *   **Type:** `string`
    *   **Required:** Yes
    *   **Description:** The ID of the existing parent task.
*   `title`:
    *   **Type:** `string`
    *   **Required:** Yes
    *   **Description:** The title of the subtask.
*   `summary`:
    *   **Type:** `string`
    *   **Required:** Yes
    *   **Description:** A concise summary of the subtask.
*   `description`:
    *   **Type:** `string`
    *   **Required:** Yes
    *   **Description:** A detailed description of the subtask.
*   `prompt`:
    *   **Type:** `string`
    *   **Required:** Yes
    *   **Description:** The prompt for executing the subtask.
*   `role`:
    *   **Type:** `string`
    *   **Required:** Yes
    *   **Description:** The designated role for the subtask.
*   `contexts` (optional):
    *   **Type:** `string[]` (array of strings)
    *   **Required:** No
    *   **Description:** A list of context strings relevant to the subtask.

**Returns:**

*   On success: A message like `Subtask added with ID: {taskId} under parent {parentId}`.
*   On failure: An error message, e.g., `Error adding subtask: {error.message}`.

**Example Invocation (Conceptual):**

```json
{
  "tool_name": "addSubTask",
  "parameters": {
    "parentId": "task_123",
    "title": "Install Dependencies",
    "summary": "Install project dependencies using Bun.",
    "description": "Run `bun install` to fetch and install all required packages as defined in `package.json`.",
    "prompt": "Install dependencies for the \'phoenix\' project.",
    "role": "developer"
  }
}
```

---

### 5. `completeTask`

**Purpose:** Marks a task as completed by setting its status to "DONE".

**Parameters:**

*   `id`:
    *   **Type:** `string`
    *   **Required:** Yes
    *   **Description:** The unique identifier of the task to complete.

**Returns:**

*   On success: A message like `Task {id} marked as completed.`
*   On failure: An error message, e.g., `Error completing task {id}: {error.message}`.

**Example Invocation (Conceptual):**

```json
{
  "tool_name": "completeTask",
  "parameters": {
    "id": "task_789"
  }
}
```

---

### 6. `listTasks`

**Purpose:** Lists tasks. Can list all top-level tasks or subtasks of a specific parent.

**Parameters:**

*   `parentId` (optional):
    *   **Type:** `string`
    *   **Required:** No
    *   **Description:** If provided, lists direct children of this parent task. If omitted, lists all top-level tasks (tasks without a parent).

**Returns:**

*   A string containing the list of tasks, formatted with their ID and details (title, summary, description, prompt, role, contexts).
*   If no tasks are found, returns "No tasks found.".
*   Format of each task in the list:
    ```
    Task ID: {task.id}
    context: {task.contexts.join("\\n")}
    title: {task.title}
    summary: {task.summary}
    description: {task.description}
    prompt: {task.prompt}
    role: {task.role}
    ```
    Multiple tasks are separated by `\\n\\n---\\n\\n`.

**Example Invocation (Conceptual):**

```json
{
  "tool_name": "listTasks",
  "parameters": {
    "parentId": "task_123" // Optional: to list subtasks of task_123
  }
}
```
Or to list all top-level tasks:
```json
{
  "tool_name": "listTasks",
  "parameters": {}
}
```

---

### 7. `getFirstTask`

**Purpose:** Retrieves the first task that matches the criteria (e.g., the first top-level task or the first subtask of a given parent). "First" likely refers to the order in storage or a default sorting.

**Parameters:**

*   `parentId` (optional):
    *   **Type:** `string`
    *   **Required:** No
    *   **Description:** If provided, retrieves the first subtask of this parent. If omitted, retrieves the first top-level task.

**Returns:**

*   A string containing the details of the first matching task, formatted identically to tasks in `listTasks`.
*   If no task is found, returns "No task found matching the criteria.".

**Example Invocation (Conceptual):**

```json
{
  "tool_name": "getFirstTask",
  "parameters": {
    "parentId": "task_abc" // Optional: to get the first subtask of task_abc
  }
}
```
Or to get the first top-level task:
```json
{
  "tool_name": "getFirstTask",
  "parameters": {}
}
```

--- 