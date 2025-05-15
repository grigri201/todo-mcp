import * as fs from "fs/promises"; // For Node.js environment

// Define custom error classes
class FileNotExistedError extends Error {
  constructor(filePath: string) {
    super(`File not found: ${filePath}`);
    this.name = "FileNotExistedError";
  }
}

class ContentNotFoundError extends Error {
  constructor(searchTerm: string | RegExp) {
    super(`Content not found: ${searchTerm.toString()}`);
    this.name = "ContentNotFoundError";
  }
}

class UnableToModifyFileError extends Error {
  constructor(filePath: string, originalError?: any) {
    super(
      `Unable to modify file: ${filePath}. ${
        originalError ? "Original error: " + originalError.message : ""
      }`
    );
    this.name = "UnableToModifyFileError";
  }
}

// Define custom error for reading file issues
class UnableToReadFileError extends Error {
  constructor(filePath: string, originalError?: any) {
    super(
      `Unable to read file: ${filePath}. ${
        originalError ? "Original error: " + originalError.message : ""
      }`
    );
    this.name = "UnableToReadFileError";
  }
}

// Define the FilePatch interface
interface FilePatch {
  file: string; // path to file
  from: string | RegExp;
  to: string;
  changed?: boolean; // default is false
  err?: FileNotExistedError | ContentNotFoundError | UnableToModifyFileError;
}

// We will implement findAndReplace next.
// The find function as described find(path: string, content: string) seems more like a utility
// that would be part of the findAndReplace logic or a separate utility.
// For now, let's focus on findAndReplace.

export type { FilePatch };
export {
  FileNotExistedError,
  ContentNotFoundError,
  UnableToModifyFileError,
  UnableToReadFileError,
};

async function findAndReplace(patches: FilePatch[]): Promise<FilePatch[]> {
  const results: FilePatch[] = [];

  for (const patch of patches) {
    const currentPatch: FilePatch = { ...patch, changed: false }; // Initialize changed to false

    try {
      // Check if file exists
      try {
        await fs.access(currentPatch.file);
      } catch (e) {
        currentPatch.err = new FileNotExistedError(currentPatch.file);
        results.push(currentPatch);
        continue; // Move to next patch
      }

      // Read file content
      let content = await fs.readFile(currentPatch.file, "utf-8");
      const originalContent = content;

      // Perform search and replace
      if (typeof currentPatch.from === "string") {
        if (!content.includes(currentPatch.from)) {
          currentPatch.err = new ContentNotFoundError(currentPatch.from);
          results.push(currentPatch);
          continue;
        }
        content = content.split(currentPatch.from).join(currentPatch.to);
      } else {
        // RegExp
        if (!currentPatch.from.test(content)) {
          currentPatch.err = new ContentNotFoundError(currentPatch.from);
          results.push(currentPatch);
          continue;
        }
        content = content.replace(currentPatch.from, currentPatch.to);
      }

      // Write content back if changed
      if (content !== originalContent) {
        await fs.writeFile(currentPatch.file, content, "utf-8");
        currentPatch.changed = true;
      } else if (!currentPatch.err) {
        // If content is the same and no error, it means the 'from' pattern might have been found,
        // but replacing it with 'to' resulted in identical content.
        // 'changed' remains false, which is correct.
      }
    } catch (error: any) {
      // Catch errors from readFile, writeFile, or other unexpected issues
      if (!currentPatch.err) {
        // Avoid overwriting a more specific error
        currentPatch.err = new UnableToModifyFileError(
          currentPatch.file,
          error
        );
      }
    }
    results.push(currentPatch);
  }

  return results;
}

export { findAndReplace };

async function find(
  filePath: string,
  pattern: string | RegExp
): Promise<string> {
  // Check if file exists
  try {
    await fs.access(filePath);
  } catch (e) {
    throw new FileNotExistedError(filePath);
  }

  let content: string;
  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch (error: any) {
    throw new UnableToReadFileError(filePath, error);
  }

  if (typeof pattern === "string") {
    const lines = content.split("\n");
    for (const line of lines) {
      if (line.includes(pattern)) {
        return line;
      }
    }
    return ""; // Not found
  } else {
    // RegExp
    const match = pattern.exec(content);
    if (match) {
      return match[0]; // Return the matched part
    }
    return ""; // Not found
  }
}

export { find };
