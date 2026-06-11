import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs'; // 💡 注入原生文件系统模块

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// 1.利用 process.cwd() 获取运行时的绝对根目录
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

// 通过 fs.statSync 显式声明这个文件依赖，会强行逼迫 Vercel 在打包编译时，
// 必须把项目里的 prisma 文件夹和 dev.db 文件打包复制进 Serverless 函数的只读沙箱物理路径中！
try {
  if (fs.existsSync(dbPath)) {
    console.log("⚡ [Prisma Gateway] 成功锚定云端 SQLite 数据库绝对路径:", dbPath);
  }
} catch (e) {
  console.error("⚠️ [Prisma Gateway] 预检数据库文件失败:", e);
}

// 2. 初始化或复用 Prisma 实例
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
    datasources: {
      db: {
        url: `file:${dbPath}`,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;