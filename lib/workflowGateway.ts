/**
 * workflowGateway.ts
 * AI Agent Studio - 统一执行网关类
 * 
 * 提供工作流前置拦截（Before Run）与后置统一封装（After Run）能力。
 * 同时暴露 throttle 机制供传统预警节点使用。
 */

// 简单的 UUID 生成器替代方案（若无 uuid 库）
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 缓存 Map 用于控制报警频次
const throttleCache = new Map<string, number>();

export class WorkflowGateway {

  /**
   * 前置安全拦截与校验 (Before Run)
   * 1. 去除两端空格及可能包含的 '0x' 前缀
   * 2. 报文长度熔断检查 (上限 4096)
   * 3. 正则校验只允许合法的 16 进制字符及空格
   * @param payload 原始 16 进制字符串报文
   * @returns 处理清洗后的合法字符串，若非法则抛出 Error
   */
  static beforeRun(payload: string): string {
    if (!payload || typeof payload !== 'string') {
      throw new Error("Security Exception: Invalid payload type.");
    }

    // 长度熔断断路器
    if (payload.length > 4096) {
      throw new Error(`Security Exception: Payload length (${payload.length}) exceeds maximum limit of 4096 characters.`);
    }

    // 1. 去除首尾空格，尝试去除 '0x' 前缀
    let cleanPayload = payload.trim();
    if (cleanPayload.toLowerCase().startsWith('0x')) {
      cleanPayload = cleanPayload.slice(2);
    }

    // 2. 严格的正则过滤：仅允许 16 进制字符与内部空格
    const hexRegex = /^[0-9a-fA-F\s]+$/;
    if (!hexRegex.test(cleanPayload)) {
      throw new Error("Security Exception: Malicious payload detected. Only hexadecimal characters and spaces are allowed.");
    }

    return cleanPayload;
  }

  /**
   * 深拷贝并进行优雅降级
   * 将所有的 undefined、NaN 转化为 null，数字缺失时根据业务需要也可以设为 0，字符串转为 ""
   * @param obj 解析后的结果对象
   */
  private static sanitizeData(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (typeof obj === 'number' && isNaN(obj)) return null;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeData(item));
    }

    const sanitized: Record<string, any> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val === undefined) {
          sanitized[key] = null;
        } else if (typeof val === 'number' && isNaN(val)) {
          sanitized[key] = null;
        } else if (typeof val === 'object') {
          sanitized[key] = this.sanitizeData(val);
        } else {
          sanitized[key] = val;
        }
      }
    }
    return sanitized;
  }

  /**
   * 后置统一格式化 (After Run)
   * 将对象优雅降级并包裹进统一的 Standard Envelope 中
   * @param result 工作流最终解析并处理完成的结果
   */
  static afterRun(result: any) {
    const safeData = this.sanitizeData(result);
    return {
      code: 200,
      success: true,
      requestId: generateUUID(),
      timestamp: Math.floor(Date.now() / 1000),
      data: safeData,
      error: null
    };
  }

  /**
   * 检查节流阀 (Throttle)
   * 如果该 key 在过去 cooldownMs 毫秒内被触发过，则返回 true（表示应被节流拦截）
   * 否则更新触发时间并返回 false（表示允许放行执行）
   * @param key 防抖唯一标识 (如 nodeId_ruleIndex)
   * @param cooldownMs 冷却期（毫秒）
   */
  static checkThrottle(key: string, cooldownMs: number = 60000): boolean {
    const now = Date.now();
    const lastTriggeredTime = throttleCache.get(key) || 0;

    if (now - lastTriggeredTime < cooldownMs) {
      return true; // 处于冷却期，需要被截流
    }

    // 允许执行，更新缓存时间
    throttleCache.set(key, now);
    return false;
  }
}
