# Clean Next.js 15 Template

这是一个最干净的 Next.js 15 项目模板，包含了 App Router、TypeScript 和 Tailwind CSS，并剔除了多余的样板代码和文件。

## 如何运行

由于当前环境尚未安装 Node.js，你需要先在你的系统上安装 [Node.js](https://nodejs.org/) (建议 Node 18.18.0 或更高版本)。

安装完毕后，执行以下命令：

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 即可预览。

## Next.js 15：服务端组件与客户端组件边界

在 Next.js 的 App Router (自 Next.js 13 引入并在 15 中进一步完善) 中，组件默认都是 **Server Components（服务端组件）**。理解服务端和客户端组件的边界对于构建高性能的 React 应用至关重要。

### 服务端组件 (Server Components)

**默认状态**：所有在 `app/` 目录下的组件（例如 `page.tsx`, `layout.tsx`）默认都是服务端组件。

**特点**：
- 在服务器端渲染，并将生成的 HTML 或特殊的 JSON 格式直接发送到客户端。
- **无 JavaScript 捆绑**：服务端组件的代码（包括它们引入的大型依赖包）不会被发送到浏览器，大大减少了客户端的代码体积。
- 可以直接访问后端资源（如数据库、文件系统等）。
- **不支持** 任何与浏览器或状态相关的 API，比如 `useState`, `useEffect`, 浏览器 API (`window`, `document`) 或 DOM 事件监听器（`onClick`, `onChange` 等）。

### 客户端组件 (Client Components)

**如何声明**：在文件的最顶部（在任何 import 语句之前）添加 `"use client";` 指令。

**特点**：
- 在服务端会进行预渲染（SSR），在客户端会被注入 React 状态并使其具有交互性（Hydration）。
- **支持** React 状态 (`useState`, `useReducer`), 生命周期钩子 (`useEffect`), 以及浏览器专属的 API。
- 可以监听 DOM 事件（`onClick` 等）。

### 边界划分规则

1. **"use client" 划定边界**：当你在一个文件中定义 `"use client";` 时，你创建了一个从服务端到客户端的“边界”。**该组件及其导入的所有子组件都将成为客户端包的一部分**。
2. **交错使用模式（Interleaving）**：
   - ❌ **不允许**：在客户端组件内部直接导入（import）并渲染服务端组件。
   - ✅ **允许（推荐模式）**：将服务端组件作为 `children` 或其他 `props` 传递给客户端组件。这样，服务端组件仍然会在服务器上渲染，客户端组件仅仅是作为一个“包装器（Wrapper）”来包裹它们。
   
   ```tsx
   // 客户端组件 (ClientWrapper.tsx)
   "use client";
   export default function ClientWrapper({ children }) {
     return <div onClick={() => console.log('Clicked!')}>{children}</div>;
   }
   
   // 服务端组件 (ServerPage.tsx)
   import ClientWrapper from './ClientWrapper';
   import ServerComponent from './ServerComponent';

   export default function Page() {
     return (
       <ClientWrapper>
         <ServerComponent /> {/* 这依然在服务端渲染！*/}
       </ClientWrapper>
     );
   }
   ```

### 最佳实践总结
- 尽可能保持大部分组件为服务端组件（默认行为），仅在需要交互、状态管理或访问浏览器 API 时才使用客户端组件。
- 把 `"use client"` 下推到组件树的叶子节点，避免将大型的纯展示组件不必要地打包到客户端中。
