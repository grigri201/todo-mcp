import z from 'zod'; // Import zod for schema definition
import { addTodo, addSubtask, getTodos, completeTodo, clearTodos } from './db'; // Import functions from db.ts

// Define the API for the TODO service using the documented approach
export const todoAPI = {
  // Function to add a new todo item
  addTodo: {
    description: "Add a new top level task to the TODO list for a specific user",
    inputSchema: z.object({ task: z.string(), userId: z.string() }), // Define input schema using zod
    handler: async ({ task, userId }: { task: string; userId: string }): Promise<void> => {
      await addTodo(task, userId);
      console.log(`Added todo: ${task} for user: ${userId}`);
    },
  },

  addSubtask: {
    description: "Add a new subtask to a specific top level task",
    inputSchema: z.object({ task: z.string(), userId: z.string(), parentTaskId: z.string() }), // Define input schema using zod
    handler: async ({ task, userId, parentTaskId }: { task: string; userId: string; parentTaskId: string }): Promise<void> => {
      await addSubtask(task, userId, parentTaskId);
      console.log(`Added subtask: ${task} for user: ${userId} and parent task: ${parentTaskId}`);
    },
  },

  // Function to get all todo items for a specific user
  getTodos: {
    description: "Get all tasks from the TODO list for a specific user",
    inputSchema: z.object({ userId: z.string(), parentTaskId: z.string().optional() }), // Define input schema for userId
    handler: async ({ userId, parentTaskId }: { userId: string; parentTaskId?: string }): Promise<{ todos: { id: number; task: string; created_at: string }[] }> => {
      const todos = await getTodos(userId, parentTaskId);
      console.log(`Returning current todos for user: ${userId}`);
      return { todos };
    },
    // outputSchema: z.object({ todos: z.array(z.object({ id: z.number(), task: z.string(), created_at: z.string() })) })
  },

  completeTodo: {
    description: "Complete a specific task",
    inputSchema: z.object({ userId: z.string(), taskId: z.string() }), // Define input schema for userId
    handler: async ({ userId, taskId }: { userId: string; taskId: string }): Promise<void> => {
      await completeTodo(userId, taskId);
      console.log(`Completed todo: ${taskId} for user: ${userId}`);
    },
  },

  // Function to clear all todo items for a specific user
  clearTodos: {
    description: "Clear all tasks from the TODO list for a specific user",
    inputSchema: z.object({ userId: z.string() }), // Define input schema for userId
    handler: async ({ userId }: { userId: string }): Promise<void> => {
      await clearTodos(userId);
      console.log(`Clearing all todos for user: ${userId}`);
    },
  },
}; 