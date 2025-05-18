# todo-mcp

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.7. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## Tools

### manage-task

Edit a task in the markdown file.

- `title`: task title
- `original_text`: the text to search for. When adding subtasks or updating a task, provide the exact text from the task file (include surrounding context if needed).
- `edited_text`: the replacement text

If `original_text` cannot be found, the content will be appended automatically.

### get-task

Retrieve tasks from the file. Provide `title` to get a specific task or omit it to list all top level tasks.
