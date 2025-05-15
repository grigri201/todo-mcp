- [ ] 实现基于 markdown checklist 的 storage
  prompt: 
```
实现 file-search-replace 功能

FilePatch {
file: string // path to files
from: string | regexp
to: string
changed: bool // default is false
err?: FileNotExistedError | ContentNotFoundError | UnableToModifyFileError
}

find(path: string, content: string)

findAndReplace(patches: FilePatch[]) -> FilePatch[]

每个 patch 修改完成后都会让 changed 变为 true
全部修改后再返回
如果有错误，会将错误信息放入 err 中
```
  role: coder
  - [ ] 完成 file search and replace 工具
- 添加单元测试