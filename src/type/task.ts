export type TaskStatus = "PENDING" | "DONE" | "DELETED";

export interface Task {
  id: string;
  parentId?: string;
  title: string; // 任务名称
  summary: string; // 简明简介
  description: string; // 详细描述
  prompt: string; // 执行所用 prompt
  role: string; // 负责角色
  contexts: string[]; // 相关文件绝对路径
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
}
