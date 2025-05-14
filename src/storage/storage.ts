import type { Task } from "../type/task";

export interface IStorage {
	init(config: any): Promise<void>;
	createTask(task: Partial<Task>): Promise<Task>;
	getTasks(parentId?: string): Promise<Task[]>;
	updateTask(id: string, task: Partial<Task>): Promise<Task>;
	deleteTask(id: string): Promise<void>;
}
