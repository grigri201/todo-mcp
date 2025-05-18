- [ ]: 为当前项目添加测试
- prompt: 为当前项目添加单元测试和/或集成测试，确保主要功能有测试覆盖
- context: 用户希望为当前项目补充测试，提升代码质量和可维护性
- refers: 项目代码目录、测试相关文件
- member: agent
- [ ]: subtasks

- [ ]: 分解为当前项目添加测试的子任务
- prompt: 将“为当前项目添加测试”任务细分为更小的可执行子任务，并添加到任务记录中
- context: 用户希望将测试任务细化，便于逐步完成
- refers: 为当前项目添加测试
- member: agent
- [ ]: subtasks

- [ ]: 为 index.ts 添加单元测试
- prompt: 编写 src/index.ts 的单元测试，覆盖其主要功能
- context: src/index.ts 是项目入口文件，需确保其核心逻辑有测试覆盖
- refers: src/index.ts
- member: agent

- [ ]: 为 tools.ts 添加单元测试
- prompt: 编写 src/tools.ts 的单元测试，覆盖其主要工具函数
- context: src/tools.ts 包含多个工具函数，需分别编写测试
- refers: src/tools.ts
- member: agent

- [ ]: 为 file-search-replace.ts 添加单元测试
- prompt: 编写 src/file-search-replace.ts 的单元测试，覆盖其文件搜索与替换功能
- context: src/file-search-replace.ts 负责文件搜索和替换，需确保其功能正确
- refers: src/file-search-replace.ts
- member: agent

- [ ]: 配置测试环境
- prompt: 配置并初始化测试框架（如 Jest、Vitest 或 Bun test），确保可以运行测试
- context: 项目需具备可运行的测试环境
- refers: package.json, tsconfig.json
- member: agent

- [ ]: 编写测试运行文档
- prompt: 在 README.md 或单独文档中说明如何运行和编写测试
- context: 便于团队成员了解测试流程
- refers: README.md
- member: agent

