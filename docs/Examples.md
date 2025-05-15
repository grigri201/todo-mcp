# todo-mcp Usage Examples

This document provides practical examples of how to use the `todo-mcp` service by illustrating common scenarios and a sequence of API tool calls. These examples demonstrate how an MCP client would interact with the service.

For detailed information on each tool and its parameters, please refer to the [API Documentation (API.md)](API.md).

---

## Scenario 1: Basic Task Management Workflow

This scenario covers creating a task, listing tasks, updating it, completing it, and finally deleting it.

### Step 1: Add a New Task

Let's add a task to "Outline project proposal".

**Request:**
```json
{
  "tool_name": "addTask",
  "parameters": {
    "title": "Outline project proposal",
    "summary": "Create a high-level outline for the new \'Omega\' project proposal.",
    "description": "The outline should include sections for: Introduction, Problem Statement, Proposed Solution, Key Features, Timeline, and Budget.",
    "prompt": "Draft an outline for the Omega project proposal document.",
    "role": "project_manager",
    "contexts": ["/path/to/omega/project-brief.doc"]
  }
}
```

**Conceptual Response (Success):**
```json
{
  "content": [{ "type": "text", "text": "Task added with ID: task_alpha_001" }]
}
```

### Step 2: List All Top-Level Tasks

Verify the task was added.

**Request:**
```json
{
  "tool_name": "listTasks",
  "parameters": {}
}
```

**Conceptual Response (Success - showing the new task):**
```json
{
  "content": [{
    "type": "text",
    "text": "Task ID: task_alpha_001\\ncontext: /path/to/omega/project-brief.doc\\ntitle: Outline project proposal\\nsummary: Create a high-level outline for the new \'Omega\' project proposal.\\ndescription: The outline should include sections for: Introduction, Problem Statement, Proposed Solution, Key Features, Timeline, and Budget.\\nprompt: Draft an outline for the Omega project proposal document.\\nrole: project_manager"
  }]
}
```

### Step 3: Update the Task

Let's update the summary and add a context file.

**Request:**
```json
{
  "tool_name": "updateTask",
  "parameters": {
    "id": "task_alpha_001",
    "summary": "Create a detailed outline for the new \'Omega\' project proposal, including sub-points.",
    "contexts": ["/path/to/omega/project-brief.doc", "/path/to/omega/competitor-analysis.xlsx"]
  }
}
```

**Conceptual Response (Success):**
```json
{
  "content": [{ "type": "text", "text": "Task task_alpha_001 updated successfully." }]
}
```

### Step 4: Complete the Task

Mark the task as done.

**Request:**
```json
{
  "tool_name": "completeTask",
  "parameters": {
    "id": "task_alpha_001"
  }
}
```

**Conceptual Response (Success):**
```json
{
  "content": [{ "type": "text", "text": "Task task_alpha_001 marked as completed." }]
}
```

### Step 5: Delete the Task

Remove the task from the system.

**Request:**
```json
{
  "tool_name": "removeTask",
  "parameters": {
    "id": "task_alpha_001"
  }
}
```

**Conceptual Response (Success):**
```json
{
  "content": [{ "type": "text", "text": "Task task_alpha_001 removed successfully." }]
}
```

---

## Scenario 2: Managing Parent and Subtasks

This scenario demonstrates creating a main task and then adding several subtasks to it.

### Step 1: Create a Parent Task

Create a parent task: "Develop new feature X".

**Request:**
```json
{
  "tool_name": "addTask",
  "parameters": {
    "title": "Develop new feature X",
    "summary": "Implement the full \'Feature X\' as per specifications.",
    "description": "This involves backend API changes, frontend UI components, and integration tests for Feature X.",
    "prompt": "Develop Feature X.",
    "role": "lead_developer",
    "contexts": ["/path/to/feature_x_specs.md"]
  }
}
```

**Conceptual Response (Success):**
```json
{
  "content": [{ "type": "text", "text": "Task added with ID: task_beta_parent_001" }]
}
```

### Step 2: Add Subtasks

#### Subtask 1: Design API Endpoints

**Request:**
```json
{
  "tool_name": "addSubTask",
  "parameters": {
    "parentId": "task_beta_parent_001",
    "title": "Design API Endpoints for Feature X",
    "summary": "Define and document the new API endpoints required for Feature X.",
    "description": "Includes request/response schemas, authentication, and rate limiting considerations.",
    "prompt": "Design API for Feature X.",
    "role": "backend_developer",
    "contexts": ["/path/to/feature_x_specs.md#api-section"]
  }
}
```

**Conceptual Response (Success):**
```json
{
  "content": [{ "type": "text", "text": "Subtask added with ID: task_beta_sub_001 under parent task_beta_parent_001" }]
}
```

#### Subtask 2: Implement Backend Logic

**Request:**
```json
{
  "tool_name": "addSubTask",
  "parameters": {
    "parentId": "task_beta_parent_001",
    "title": "Implement Backend Logic for Feature X",
    "summary": "Write the server-side code for the designed API endpoints.",
    "description": "Includes business logic, database interactions, and unit tests.",
    "prompt": "Implement backend for Feature X API.",
    "role": "backend_developer",
    "contexts": ["/path/to/api_design_doc.md"]
  }
}
```

**Conceptual Response (Success):**
```json
{
  "content": [{ "type": "text", "text": "Subtask added with ID: task_beta_sub_002 under parent task_beta_parent_001" }]
}
```

### Step 3: List Subtasks of the Parent Task

See all tasks under "Develop new feature X".

**Request:**
```json
{
  "tool_name": "listTasks",
  "parameters": {
    "parentId": "task_beta_parent_001"
  }
}
```

**Conceptual Response (Success - showing subtasks):**
```json
{
  "content": [{
    "type": "text",
    "text": "Task ID: task_beta_sub_001\\ncontext: /path/to/feature_x_specs.md#api-section\\ntitle: Design API Endpoints for Feature X...\\n---\\nTask ID: task_beta_sub_002\\ncontext: /path/to/api_design_doc.md\\ntitle: Implement Backend Logic for Feature X..."
  }]
}
```
_(Content abridged for brevity)_ 

### Step 4: Get the First Subtask

Retrieve the first subtask for `task_beta_parent_001`.

**Request:**
```json
{
  "tool_name": "getFirstTask",
  "parameters": {
    "parentId": "task_beta_parent_001"
  }
}
```

**Conceptual Response (Success - showing first subtask):**
```json
{
  "content": [{
    "type": "text",
    "text": "Task ID: task_beta_sub_001\\ncontext: /path/to/feature_x_specs.md#api-section\\ntitle: Design API Endpoints for Feature X\\nsummary: Define and document the new API endpoints required for Feature X.\\ndescription: Includes request/response schemas, authentication, and rate limiting considerations.\\nprompt: Design API for Feature X.\\nrole: backend_developer"
  }]
}
```

---

## Scenario 3: Attempting to Add a Task with Missing Required Fields

This shows a conceptual error response if a required field is missing.

**Request (Missing `summary`, `description`, `prompt`, `role`):**
```json
{
  "tool_name": "addTask",
  "parameters": {
    "title": "A task with missing details"
  }
}
```

**Conceptual Response (Failure):**
```json
{
  "content": [{ "type": "text", "text": "Error adding task: Missing required field: summary" }] // Or a more comprehensive error detailing all missing fields
}
```

---

## Scenario 4: Attempting to Create a Subtask for a Non-Existent Parent

**Request:**
```json
{
  "tool_name": "addSubTask",
  "parameters": {
    "parentId": "task_non_existent_parent_999",
    "title": "Subtask for a ghost parent",
    "summary": "This parent does not exist.",
    "description": "This should fail.",
    "prompt": "Try to create a subtask.",
    "role": "tester"
  }
}
```

**Conceptual Response (Failure - based on `ParentNotFoundError` in `task.repo.ts`):
```json
{
  "content": [{ "type": "text", "text": "Error adding subtask: Parent task with id task_non_existent_parent_999 not found." }]
}
```

These examples should provide a good starting point for understanding how to interact with the `todo-mcp` service across various use cases. 