export interface Task {
  id: string;
  parentId?: string;
  title: string; // 任务名称
  prompt: string; // 执行所用 prompt
  role: string; // 负责角色
  context: string; // 相关文件绝对路径
  is_completed: boolean;
}
