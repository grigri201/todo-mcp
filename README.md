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
- `original_text`: the text to search for
- `edited_text`: the replacement text

If `original_text` cannot be found, `edited_text` will be appended to the end of the task file.

### get-task

Retrieve tasks from the file. Provide `title` to get a specific task or omit it to list all top level tasks.
