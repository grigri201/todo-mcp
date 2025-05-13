import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}
const sql = postgres(connectionString)

export default sql

// --- New functions to be added ---

export async function addTodo(task: string, userId: string): Promise<void> {
  try {
    await sql`INSERT INTO todos (task, user_id) VALUES (${task}, ${userId})`;
    console.log(`DB: Added todo: ${task} for user: ${userId}`);
  } catch (error) {
    console.error('DB Error adding todo:', error);
    throw new Error('Failed to add todo in DB');
  }
}

export async function addSubtask(task: string, userId: string, parentTaskId: string): Promise<void> {
  try {
    await sql`INSERT INTO todos (task, user_id, parent_id) VALUES (${task}, ${userId}, ${parentTaskId})`;
    console.log(`DB: Added subtask: ${task} for user: ${userId}, parent: ${parentTaskId}`);
  } catch (error) {
    console.error('DB Error adding subtask:', error);
    throw new Error('Failed to add subtask in DB');
  }
}

export async function getTodos(userId: string, parentTaskId?: string): Promise<{ id: number; task: string; created_at: string }[]> {
  try {
    let query = sql`SELECT id, task, created_at FROM todos WHERE user_id = ${userId}`;
    if (parentTaskId) {
      // Append the parent_id condition. Note: direct concatenation is safe here because parentTaskId's origin is controlled.
      // For dynamic table/column names from user input, always sanitize or use helper functions.
      query = sql`SELECT id, task, created_at FROM todos WHERE user_id = ${userId} AND parent_id = ${parentTaskId}`;
    }
    query = sql`${query} ORDER BY created_at ASC`; // It's tricky to append to a TaggedTemplateLiteral directly for ordering.
                                                // A more robust way might involve building parts of the query.
                                                // For now, we'll re-state the query if parentTaskId is present.

    // Simplified approach for conditional parent_id and ordering with 'postgres' library:
    let result;
    if (parentTaskId) {
      result = await sql`
        SELECT id, task, created_at 
        FROM todos 
        WHERE user_id = ${userId} AND parent_id = ${parentTaskId}
        ORDER BY created_at ASC
      `;
    } else {
      result = await sql`
        SELECT id, task, created_at 
        FROM todos 
        WHERE user_id = ${userId}
        ORDER BY created_at ASC
      `;
    }
    console.log(`DB: Fetched todos for user: ${userId}` + (parentTaskId ? ` and parent: ${parentTaskId}` : ''));
    return result.map(row => ({ id: row.id, task: row.task, created_at: row.created_at }));
  } catch (error) {
    console.error('DB Error fetching todos:', error);
    throw new Error('Failed to fetch todos from DB');
  }
}

export async function completeTodo(userId: string, taskId: string): Promise<void> {
  try {
    const result = await sql`
      UPDATE todos 
      SET completed = TRUE 
      WHERE user_id = ${userId} AND id = ${taskId}
    `;
    if (result.count === 0) {
      console.warn(`DB: Attempted to complete todo ${taskId} for user ${userId}, but todo not found or not owned by user.`);
      // Optionally throw an error if the todo must exist
      // throw new Error('Todo not found or not owned by user');
    } else {
      console.log(`DB: Completed todo: ${taskId} for user: ${userId}`);
    }
  } catch (error) {
    console.error('DB Error completing todo:', error);
    throw new Error('Failed to complete todo in DB');
  }
}

export async function clearTodos(userId: string, parentTaskId?: string): Promise<void> {
  try {
    let query = sql`DELETE FROM todos WHERE user_id = ${userId}`;
    if (parentTaskId) {
      query = sql`DELETE FROM todos WHERE user_id = ${userId} AND parent_id = ${parentTaskId}`;
    }
    await query;
    console.log(`DB: Cleared todos for user: ${userId}` + (parentTaskId ? ` and parent: ${parentTaskId}` : ''));
  } catch (error) {
    console.error('DB Error clearing todos:', error);
    throw new Error('Failed to clear todos in DB');
  }
}