# AI Agent Studio 🔮

> A Next-Generation Multimodal AI Agent Workflow Orchestration Platform
> 
> 下一代多模态 AI Agent 工作流编排与高频物联网执行平台

![AI Agent Studio Cover](https://via.placeholder.com/1200x400?text=AI+Agent+Studio)

## 🌟 Core Technical Highlights / 核心技术亮点

### 1. LLM-Compiler Architecture (LLM-Compiler 动态编译架构)
**EN**: Replaces traditional static hard-coded parsers. The LLM dynamically compiles execution code based on incoming instructions and protocols, generating secure sandbox JavaScript logic on the fly.
**ZH**: 摒弃传统静态硬编码解析器，大模型根据传入指令与协议文档，动态实时编译并生成安全的沙箱 JavaScript 解析逻辑。

### 2. Adaptive Multimodal Visual Code Gen (自适应多模态识图代码生成)
**EN**: Directly upload equipment protocol manuals or architecture diagrams. The Vision-Language Model automatically understands the context and reverse-engineers the exact byte-parsing code required.
**ZH**: 支持直接上传设备协议手册或架构截图，视觉语言大模型（VLM）自动理解上下文并逆向工程出完全准确的字节解析代码。

### 3. DAG Topology Serial/Parallel Engine (DAG 拓扑串行/并行执行引擎)
**EN**: High-performance Directed Acyclic Graph execution engine. Automatically constructs adjacency lists, calculating node in-degrees to support complex parallel executions and data merging routing.
**ZH**: 高性能有向无环图执行引擎。自动构建邻接表与入度计算，完美支撑复杂的多节点并行流转、数据等待与合并路由。

### 4. High-frequency IoT Secure Gateway (高频物联网统一安全网关)
**EN**: All incoming telemetry data passes through a unified `WorkflowGateway`. Provides robust payload sanitization (Hex filtering), circuit-breaker limits (4096 bytes), and outputs a Standard Envelope with graceful degradation for null/NaN values.
**ZH**: 所有海量遥测数据流入统一 `WorkflowGateway`。提供坚固的报文清洗（Hex 严格过滤）、长度熔断断路器，并在出口输出统一的 Standard Envelope（空值与 NaN 优雅降级）。

### 5. Alert Storm Throttle Mechanism (报警风暴收敛节流机制)
**EN**: Prevents API exhaustion during high-frequency trigger events (e.g., 600 RPM). Implements an intelligent memory-based Debounce/Throttle system per node-rule, drastically reducing downstream notification floods.
**ZH**: 防止在极高频触发事件下的 API 瘫痪。基于内存级别的节点规则防抖与节流系统，在特定冷却期内自动收敛重复报警，大幅削减下游系统的通知风暴。

---

## 🔌 MQTT IoT Long-Connection Example / MQTT 高频物联网长连接接入示例代码

**EN**: Below is a complete Node.js example demonstrating how to subscribe to a factory topic via MQTT, safely filter the payload using our `WorkflowGateway`, and feed it into the execution engine.
**ZH**: 以下是一段完整的 Node.js 示例，展示如何使用 `mqtt` 包长连接订阅工厂主题，接收报文后经过 `WorkflowGateway` 安全过滤，最后送入工作流执行引擎。

### `mqtt-client-example.ts`

```typescript
import mqtt from 'mqtt';
import { WorkflowGateway } from './lib/workflowGateway';
// 假设这里是您的工作流引擎入口
// import { executeWorkflowEngine } from './engine'; 

const MQTT_BROKER_URL = 'mqtt://broker.emqx.io:1883';
const FACTORY_TOPIC = 'factory/line1/sensor/telemetry';

console.log(`[MQTT] 正在连接至 Broker: ${MQTT_BROKER_URL}...`);
const client = mqtt.connect(MQTT_BROKER_URL);

client.on('connect', () => {
  console.log(`[MQTT] ✅ 连接成功!`);
  client.subscribe(FACTORY_TOPIC, (err) => {
    if (!err) {
      console.log(`[MQTT] 📡 已订阅主题: ${FACTORY_TOPIC}`);
    } else {
      console.error(`[MQTT] ❌ 订阅失败:`, err);
    }
  });
});

client.on('message', async (topic, message) => {
  const rawPayload = message.toString();
  console.log(`\n[MQTT] 接收到新消息 (Topic: ${topic})`);
  console.log(`[RAW] ${rawPayload}`);

  try {
    // 1. 前置安全拦截与过滤 (Before Run)
    // 自动过滤非法字符并防止内存溢出攻击
    const safePayload = WorkflowGateway.beforeRun(rawPayload);
    console.log(`[GATEWAY] 校验通过，安全报文: ${safePayload}`);

    // 2. 将安全报文送入 DAG 工作流执行引擎
    // const rawResult = await executeWorkflowEngine(safePayload, currentWorkflowNodes);
    
    // 模拟工作流执行结果
    const rawResult = { 
      Temp: 85.5, 
      Status: "Warning", 
      ErrorCode: undefined // 将会被优雅降级处理
    };

    // 3. 后置统一格式化 (After Run)
    // 处理空值并将数据装入统一信封 (Standard Envelope)
    const finalResponse = WorkflowGateway.afterRun(rawResult);
    
    console.log(`[ENGINE] 工作流执行完毕，标准响应结果:`);
    console.log(JSON.stringify(finalResponse, null, 2));

  } catch (error: any) {
    // 拦截到异常请求 (如恶意 Hex 注入或超长报文)
    console.error(`[SECURITY BLOCK] 拦截异常: ${error.message}`);
  }
});
```

---

*Powered by Next.js 15, React Flow, and Google DeepMind.*
