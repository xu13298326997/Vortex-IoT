import { PrismaClient } from '@prisma/client';
import path from 'path';

// 1. 获取全局单例对象的类型定义
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// 2.利用 process.cwd() 获取项目在 Vercel 运行时的绝对根目录
// 无论 Vercel 的云端 Serverless 环境怎么飘，强行锁死数据库读取项目根目录下的 prisma/dev.db 文件
// 兼容 Windows：将反斜杠替换为正斜杠，防止 Prisma URL 解析报错
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/');

// 3. 初始化或复用 Prisma 实例
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
    //在这里注入 datasources 参数，强行覆盖编译期的相对路径
    datasources: {
      db: {
        url: `file:${dbPath}`,
      },
    },
  });

// 4. 如果不是生产环境，将实例挂载到全局对象上，防止热更新重复创建连接
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;