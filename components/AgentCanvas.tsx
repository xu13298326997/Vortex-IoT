"use client";

import React, { useState, useCallback } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  Handle,
  Position,
  NodeProps,
  BaseEdge,
  getBezierPath,
  EdgeProps,
  EdgeLabelRenderer
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Play,
  SquareTerminal,
  Cpu,
  CloudLightning,
  Server,
  GripVertical,
  Trash2,
  X
} from "lucide-react";
import { WorkflowGateway } from "@/lib/workflowGateway";

const getId = () => `node_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

interface TraditionalRule {
  id: string;
  field: string;
  operator: string;
  value: string;
  api: string;
}

// --- 自定义节点组件 ---
function CustomNode({ id, data, isConnectable }: NodeProps) {
  const { deleteElements } = useReactFlow();

  let Icon = Play;
  if (data.iconName === 'Play') Icon = Play;
  if (data.iconName === 'SquareTerminal') Icon = SquareTerminal;
  if (data.iconName === 'Cpu') Icon = Cpu;
  if (data.iconName === 'CloudLightning') Icon = CloudLightning;
  if (data.iconName === 'Server') Icon = Server;

  let iconColor = "text-emerald-500";
  if (data.iconName === 'SquareTerminal') iconColor = "text-rose-500";
  if (data.iconName === 'Cpu') iconColor = "text-blue-500";
  if (data.iconName === 'CloudLightning') iconColor = "text-purple-500";
  if (data.iconName === 'Server') iconColor = "text-orange-500";

  let borderClass = data.colorClass || 'border-zinc-800';
  if (data.executionState === 'executing') {
    borderClass = 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse';
  } else if (data.executionState === 'success') {
    borderClass = 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
  } else if (data.executionState === 'error') {
    borderClass = 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse';
  }

  return (
    <div className={`bg-zinc-900 border ${borderClass} text-zinc-100 rounded-xl shadow-lg min-w-[150px] group transition-all duration-300`}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-900" />

      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-medium">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="text-sm">{data.label as string}</span>
        </div>

        {/* 节点专属删除按钮 */}
        <button
          onClick={() => deleteElements({ nodes: [{ id }] })}
          className="text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
          title="删除节点"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-900" />
    </div>
  );
}

// --- 自定义连线组件 (带直观的删除按钮) ---
function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} className="react-flow__edge-path" />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            className="w-5 h-5 bg-zinc-800 text-zinc-400 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors border border-zinc-700 cursor-pointer shadow-sm group"
            onClick={(event) => {
              event.stopPropagation();
              setEdges((es) => es.filter((e) => e.id !== id));
            }}
            title="删除连线"
          >
            <X className="w-3 h-3 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

// 注册自定义类型
const nodeTypes = { customNode: CustomNode };
const edgeTypes = { customEdge: CustomEdge };

// 初始节点数据
const initialNodes: Node[] = [
  {
    id: "start-node",
    type: "customNode",
    position: { x: 250, y: 150 },
    data: {
      label: "开始节点",
      iconName: "Play",
      colorClass: "border-emerald-500/30 hover:border-emerald-500/80"
    },
  },
  {
    id: "end-node",
    type: "customNode",
    position: { x: 250, y: 350 },
    data: {
      label: "结束节点",
      iconName: "SquareTerminal",
      colorClass: "border-rose-500/30 hover:border-rose-500/80"
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: "e-start-end",
    source: "start-node",
    target: "end-node",
    type: "customEdge",
    animated: true,
    style: { stroke: "#52525b", strokeWidth: 2 },
  },
];

function DnDFlow() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const { screenToFlowPosition } = useReactFlow();

  const [activeNode, setActiveNode] = useState<Node | null>(null);
  const [modelName, setModelName] = useState("Gemini 2.5 Pro");
  const [systemPrompt, setSystemPrompt] = useState("");

  const [hexInput, setHexInput] = useState("");
  const [localGeneratedCode, setLocalGeneratedCode] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isParsingImage, setIsParsingImage] = useState(false);

  const [globalHex, setGlobalHex] = useState("01 03 00 00 00 01 84 0A");
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const [workflowLogs, setWorkflowLogs] = useState<{ id: string, message: string, type: 'info' | 'success' | 'error' }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState<string>("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [tempWorkflowName, setTempWorkflowName] = useState("");

  const [rules, setRules] = useState<TraditionalRule[]>([]);

  const nodesRef = React.useRef(nodes);
  const edgesRef = React.useRef(edges);

  React.useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  React.useEffect(() => {
    const loadWorkflow = async (id: string | null) => {
      if (!id) {
        setNodes(initialNodes);
        setEdges(initialEdges);
        setCurrentWorkflowId(null);
        setWorkflowName("");
        return;
      }
      try {
        const detailRes = await fetch(`/api/workflow/${id}`);
        if (detailRes.ok) {
          const data = await detailRes.json();
          setCurrentWorkflowId(data.id);
          setWorkflowName(data.name);
          if (data.nodes && data.nodes !== '[]') {
            const parsedNodes = JSON.parse(data.nodes);
            if (parsedNodes.length > 0) {
              setNodes(parsedNodes);
              setEdges(JSON.parse(data.edges));
            }
          }
        }
      } catch (e) {
        console.error("加载工作流失败", e);
      }
    };

    const handleLoadWorkflow = (e: any) => {
      loadWorkflow(e.detail);
    };

    window.addEventListener('load-workflow', handleLoadWorkflow);

    // Initial load
    fetch('/api/workflow')
      .then(res => res.json())
      .then(workflows => {
        if (workflows && workflows.length > 0) {
          loadWorkflow(workflows[0].id);
        }
      })
      .catch(e => console.error(e));

    return () => window.removeEventListener('load-workflow', handleLoadWorkflow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveClick = () => {
    if (workflowName) {
      executeSave(workflowName);
    } else {
      setTempWorkflowName("");
      setShowSaveDialog(true);
    }
  };

  const handleSaveClickRef = React.useRef(handleSaveClick);
  React.useEffect(() => {
    handleSaveClickRef.current = handleSaveClick;
  }, [handleSaveClick]);

  React.useEffect(() => {
    const handleGlobalSave = () => {
      handleSaveClickRef.current();
    };
    window.addEventListener('trigger-save-workflow', handleGlobalSave);
    return () => window.removeEventListener('trigger-save-workflow', handleGlobalSave);
  }, []);

  const executeSave = async (nameToSave: string) => {

    setIsSaving(true);
    try {
      const res = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentWorkflowId,
          name: nameToSave,
          nodes: nodesRef.current,
          edges: edgesRef.current
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentWorkflowId(data.workflow.id);
        setWorkflowName(nameToSave);
        setWorkflowLogs([{ id: Date.now().toString(), message: `🎉 保存工作流 [${nameToSave}] 成功！拓扑与编译代码已持久化至 SQLite 数据库。`, type: 'success' }]);
        setShowSaveDialog(false);
        window.dispatchEvent(new Event('workflow-saved'));
      } else {
        throw new Error("接口返回错误");
      }
    } catch (e) {
      console.error(e);
      setWorkflowLogs([{ id: Date.now().toString(), message: "保存失败，请检查后端服务是否正常运行。", type: 'error' }]);
    } finally {
      setIsSaving(false);
      setTimeout(() => setWorkflowLogs([]), 3000); // 3秒后清空提示
    }
  };

  const runWorkflow = async () => {
    if (isWorkflowRunning) return;
    setIsWorkflowRunning(true);
    setWorkflowLogs([]);

    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;

    // 重置所有节点状态
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, executionState: 'idle' } })));

    const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
      setWorkflowLogs(prev => [...prev, { id: Date.now().toString() + Math.random(), message, type }]);
    };

    let safePayload: string;
    try {
      safePayload = WorkflowGateway.beforeRun(globalHex);
    } catch (e: any) {
      addLog(`[ERROR] 网关安全拦截失败: ${e.message}`, 'error');
      setIsWorkflowRunning(false);
      return;
    }

    addLog(`[INFO] 开始工作流执行，已通过网关安全校验，清洗后报文: ${safePayload}`, 'info');

    // 1. 构建邻接表和入度表
    const adjList: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};
    currentNodes.forEach(n => {
      adjList[n.id] = [];
      inDegree[n.id] = 0;
    });

    currentEdges.forEach(e => {
      if (adjList[e.source]) adjList[e.source].push(e.target);
      if (inDegree[e.target] !== undefined) inDegree[e.target]++;
    });

    // 存储发往各个节点的数据队列
    const inbox: Record<string, any[]> = {};
    currentNodes.forEach(n => inbox[n.id] = []);

    if (inbox["start-node"]) {
      inbox["start-node"].push(safePayload);
    }

    let queue = currentNodes.filter(n => inDegree[n.id] === 0);

    try {
      while (queue.length > 0) {
        // 当前批次可以并行执行的节点
        const batch = [...queue];
        queue = [];

        // 标记执行中状态
        setNodes(nds => nds.map(n => batch.find(b => b.id === n.id) ? { ...n, data: { ...n.data, executionState: 'executing' } } : n));

        addLog(`[INFO] 正在并行执行节点: ${batch.map(n => n.data.label || n.id).join(', ')}...`, 'info');

        // 模拟执行延迟以供观察动画
        await new Promise(r => setTimeout(r, 1000));

        // 批量执行
        const results = await Promise.all(batch.map(async (node) => {
          try {
            let output: any = null;

            // 数据合并（Merge）：如果上游有多个输入，将其 Object.assign 合并。若是字符串则默认取第一个
            let mergedPayload: any = null;
            const messages = inbox[node.id];

            if (messages.length > 0) {
              if (typeof messages[0] === 'string') {
                mergedPayload = messages[0];
              } else {
                mergedPayload = Object.assign({}, ...messages);
              }
            }

            if (node.id === "start-node" || node.id === "end-node") {
              output = mergedPayload;
            } else if (node.data.iconName === 'Cpu') {
              // Traditional Code Node execution
              const nodeRules = (node.data.rules as TraditionalRule[]) || [];

              // Evaluate rules sequentially
              let isMatched = false;

              for (const rule of nodeRules) {
                let isTriggered = false;
                if (mergedPayload && typeof mergedPayload === 'object' && rule.field in mergedPayload) {
                  const actualValue = mergedPayload[rule.field];
                  const value = Number(rule.value) || rule.value;
                  if (rule.operator === '>') isTriggered = Number(actualValue) > Number(value);
                  else if (rule.operator === '<') isTriggered = Number(actualValue) < Number(value);
                  else if (rule.operator === '==') isTriggered = actualValue == value;
                }

                if (isTriggered) {
                  isMatched = true;
                  if (rule.api && rule.api !== 'none') {
                    const throttleKey = `${node.id}_${rule.id}`;
                    const isThrottled = WorkflowGateway.checkThrottle(throttleKey, 10000); // 10秒冷却
                    
                    if (isThrottled) {
                      addLog(`[INFO] 规则命中，但处于报警冷却期内，本次外部调用已收敛截流。`, 'info');
                    } else {
                      addLog(`[INFO] 传统节点命中规则：[${rule.field}] [${rule.operator}] [${rule.value}]，正在调用对应报警接口: [${rule.api}]...`, 'success');
                      try {
                        const url = rule.api.split(' ')[1] || rule.api;
                        // Mock request execution for UI display purposes
                        await fetch(url, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(mergedPayload)
                        }).catch(e => {
                          addLog(`[WARN] 调用 ${url} 遇到网络错误，已忽略: ${e.message}`, 'error');
                        });
                      } catch (e: any) {
                        addLog(`[ERROR] 执行 HTTP 调用异常: ${e.message}`, 'error');
                      }
                    }
                  } else {
                    addLog(`[INFO] 传统节点命中规则：[${rule.field}] [${rule.operator}] [${rule.value}]，正常结束，无调用。`, 'info');
                  }
                  // Break the loop after the first match
                  break;
                }
              }

              if (!isMatched) {
                addLog(`[INFO] 传统节点未命中任何规则，跳过调用流程。`, 'info');
              }
              output = mergedPayload; // pass data downstream
            } else {
              // AI Code Node
              const code = node.data.generatedCode as string;
              if (!code) {
                throw new Error("节点未包含编译好的代码！");
              }

              const executableCode = `
                ${code}
                if (typeof parseProtocol !== 'function') {
                   throw new Error("代码中没有名为 parseProtocol 的函数");
                }
                return parseProtocol(payload);
              `;

              const parserFn = new Function("payload", executableCode);
              output = parserFn(mergedPayload);
            }

            return { nodeId: node.id, output, success: true };
          } catch (e: any) {
            return { nodeId: node.id, output: e.message || e, success: false };
          }
        }));

        // 处理执行结果并分发
        let hasError = false;
        for (const res of results) {
          if (!res.success) {
            addLog(`[ERROR] 节点 ${res.nodeId} 执行异常: ${res.output}`, 'error');
            setNodes(nds => nds.map(n => n.id === res.nodeId ? { ...n, data: { ...n.data, executionState: 'error' } } : n));
            hasError = true;
          } else {
            setNodes(nds => nds.map(n => n.id === res.nodeId ? { ...n, data: { ...n.data, executionState: 'success' } } : n));
            if (res.nodeId === "end-node") {
              const envelopedOutput = WorkflowGateway.afterRun(res.output);
              addLog(`[SUCCESS] 接收到最终合并结果:\n${JSON.stringify(envelopedOutput, null, 2)}`, 'success');
            } else {
              // 分发结果给子节点
              const children = adjList[res.nodeId] || [];
              for (const childId of children) {
                inbox[childId].push(res.output);
                inDegree[childId]--;
                if (inDegree[childId] === 0) {
                  const childNode = currentNodes.find(n => n.id === childId);
                  if (childNode) queue.push(childNode);
                }
              }
            }
          }
        }

        if (hasError) {
          addLog(`[ERROR] 遇到异常，工作流中断执行。`, 'error');
          break;
        }
      }
    } catch (e: any) {
      addLog(`[ERROR] 引擎系统异常: ${e.message || e}`, 'error');
    } finally {
      setIsWorkflowRunning(false);
      addLog(`[INFO] 工作流执行完毕。`, 'info');
    }
  };

  React.useEffect(() => {
    if (activeNode) {
      setModelName((activeNode.data.modelName as string) || "Gemini 2.5 Pro");
      setSystemPrompt((activeNode.data.systemPrompt as string) || "");
      setLocalGeneratedCode((activeNode.data.generatedCode as string) || "");
      setHexInput("");
      setTestResult(null);
      setIsTestLoading(false);
      setSelectedImage(null);

      // Traditional node configs
      setRules((activeNode.data.rules as TraditionalRule[]) || []);
    }
  }, [activeNode]);

  const handleGenerateAndTest = async () => {
    if (isTestLoading) return;

    setIsTestLoading(true);
    setTestResult(null);
    let finalCode = "";

    try {
      // 1. 请求大模型生成代码
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: "请根据系统提示词中的协议内容，直接生成纯净的JavaScript解析代码。注意：如果传入的 payload 为空字符串、未定义或 null，请直接返回包含协议中所有规定字段的JSON对象，对应的值赋予缺省默认值(如0或\"\")；如果有实际的报文内容，则解析出具体的值填入。" }],
          systemPrompt,
          modelName,
        })
      });

      if (!res.ok) throw new Error("API Request Failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      setLocalGeneratedCode("");

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        finalCode += chunk;
        setLocalGeneratedCode(prev => prev + chunk);
      }

      // 2. 动态执行生成的代码
      const executableCode = `
        ${finalCode}
        if (typeof parseProtocol !== 'function') {
           throw new Error("大模型没有按要求生成名为 parseProtocol 的函数");
        }
        return parseProtocol(hexString);
      `;

      const parserFn = new Function("hexString", executableCode);
      const parsedResult = parserFn(hexInput);

      setTestResult(JSON.stringify(parsedResult, null, 2));

    } catch (e: any) {
      console.error("Test stream/execution error:", e);
      setTestResult("执行出错:\n" + String(e?.message || e));
    } finally {
      setIsTestLoading(false);
    }
  };

  const handleRunLocalOnly = () => {
    if (!localGeneratedCode) return;
    try {
      setTestResult(null);
      const executableCode = `
        ${localGeneratedCode}
        if (typeof parseProtocol !== 'function') {
           throw new Error("代码中没有名为 parseProtocol 的函数");
        }
        return parseProtocol(hexString);
      `;
      const parserFn = new Function("hexString", executableCode);
      const parsedResult = parserFn(hexInput);
      setTestResult(JSON.stringify(parsedResult, null, 2));
    } catch (e: any) {
      setTestResult("本地执行出错:\n" + String(e?.message || e));
    }
  };

  const onSaveConfig = () => {
    if (!activeNode) return;
    setNodes(nds => nds.map(n => {
      if (n.id === activeNode.id) {
        return {
          ...n,
          data: {
            ...n.data,
            modelName,
            systemPrompt,
            generatedCode: localGeneratedCode,
            rules
          }
        };
      }
      return n;
    }));
  };

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: "customEdge", animated: true, style: { stroke: "#52525b", strokeWidth: 2 } }, eds)),
    []
  );

  // 删除节点时，自动桥接上下游
  const onNodesDelete = useCallback((deletedNodes: Node[]) => {
    setEdges(eds => {
      const newEdges: Edge[] = [];
      deletedNodes.forEach(node => {
        // 找到指向该节点的所有入边，以及该节点发出的所有出边
        const incomingEdges = eds.filter(e => e.target === node.id);
        const outgoingEdges = eds.filter(e => e.source === node.id);

        // 笛卡尔积自动桥接
        incomingEdges.forEach(inEdge => {
          outgoingEdges.forEach(outEdge => {
            newEdges.push({
              id: `e-${inEdge.source}-${outEdge.target}-${getId()}`,
              source: inEdge.source,
              target: outEdge.target,
              type: 'customEdge',
              animated: true,
              style: { stroke: "#52525b", strokeWidth: 2 },
            });
          });
        });
      });
      // React Flow 会自动在 onEdgesChange 里帮我们清除被删节点的边，这里只需把新产生的桥接边追加进去即可
      return [...eds, ...newEdges];
    });
  }, [setEdges]);

  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string, label: string) => {
    event.dataTransfer.setData("application/reactflow", JSON.stringify({ type: nodeType, label }));
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const typeData = event.dataTransfer.getData("application/reactflow");
      if (!typeData) return;

      const { type, label } = JSON.parse(typeData);

      // 计算释放位置在画布中的实际坐标
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      let iconName = "";
      let colorClass = "";

      // 根据类型设定对应的图标和样式
      if (type === "code") {
        iconName = "Cpu";
        colorClass = "border-blue-500/50 hover:border-blue-500/80";
      } else if (type === "cloud-ai") {
        iconName = "CloudLightning";
        colorClass = "border-purple-500/50 hover:border-purple-500/80";
      } else if (type === "local-ai") {
        iconName = "Server";
        colorClass = "border-orange-500/50 hover:border-orange-500/80";
      }

      const newNode: Node = {
        id: getId(),
        type: 'customNode',
        position,
        data: {
          label,
          iconName,
          colorClass
        },
      };

      // 核心特性：检测是否释放在连线上，如果是，则进行插入操作 (A -> C -> B)
      // 优化：采用多点网格探测法，模拟被拖拽节点(150x50)的物理占位面积，
      // 只要该虚拟面积覆盖到了连线，就判定为插入，大幅提升拖拽体验。
      let targetEdgeId: string | null = null;
      const offsets = [
        { x: 0, y: 0 },
        { x: -50, y: 0 }, { x: 50, y: 0 },
        { x: 0, y: -25 }, { x: 0, y: 25 },
        { x: -50, y: -25 }, { x: 50, y: -25 },
        { x: -50, y: 25 }, { x: 50, y: 25 }
      ];

      for (const offset of offsets) {
        const elements = document.elementsFromPoint(event.clientX + offset.x, event.clientY + offset.y);
        const edgeElement = elements.find(el => el.closest('.react-flow__edge'))?.closest('.react-flow__edge');
        if (edgeElement) {
          targetEdgeId = edgeElement.getAttribute('data-id');
          if (targetEdgeId) break;
        }
      }

      if (targetEdgeId) {
        const edge = edges.find(e => e.id === targetEdgeId);

        if (edge) {
          // 删除旧的连线，并在这两个节点之间插入新的节点，生成两条新连线
          setEdges(eds => eds.filter(e => e.id !== targetEdgeId).concat([
            {
              id: `e-${edge.source}-${newNode.id}`,
              source: edge.source,
              target: newNode.id,
              type: 'customEdge',
              animated: true,
              style: { stroke: "#52525b", strokeWidth: 2 },
            },
            {
              id: `e-${newNode.id}-${edge.target}`,
              source: newNode.id,
              target: edge.target,
              type: 'customEdge',
              animated: true,
              style: { stroke: "#52525b", strokeWidth: 2 },
            }
          ]));
        }
      }

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, edges, setEdges, setNodes]
  );

  return (
    <div className="flex h-full w-full">
      {/* 左侧节点武器库 */}
      <aside className="w-[260px] flex-shrink-0 border-r border-zinc-800/80 bg-zinc-950/60 backdrop-blur-md p-4 flex flex-col z-10 relative">
        <h3 className="text-xs font-semibold text-zinc-500 mb-5 tracking-wider uppercase">节点武器库</h3>
        <div className="flex flex-col gap-3">

          <div
            className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl cursor-grab active:cursor-grabbing hover:border-blue-500/50 shadow-sm transition-all group"
            draggable
            onDragStart={(e) => onDragStart(e, "code", "传统代码节点")}
          >
            <GripVertical className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            <Cpu className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">传统代码节点</span>
          </div>

          <div
            className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl cursor-grab active:cursor-grabbing hover:border-purple-500/50 shadow-sm transition-all group"
            draggable
            onDragStart={(e) => onDragStart(e, "cloud-ai", "云端 AI 节点")}
          >
            <GripVertical className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            <CloudLightning className="w-5 h-5 text-purple-500" />
            <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">云端 AI 节点</span>
          </div>

          <div
            className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl cursor-grab active:cursor-grabbing hover:border-orange-500/50 shadow-sm transition-all group"
            draggable
            onDragStart={(e) => onDragStart(e, "local-ai", "本地私有化 AI")}
          >
            <GripVertical className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            <Server className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">本地私有化 AI</span>
          </div>

        </div>
      </aside>

      {/* 右侧画布区域 */}
      <div className="flex-1 relative overflow-hidden" onDragOver={onDragOver} onDrop={onDrop}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodesDelete={onNodesDelete}
          onNodeDoubleClick={(_, node) => setActiveNode(node)}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          className="bg-zinc-950"
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#3f3f46" />
          <Controls className="fill-zinc-400 border-zinc-800" />
        </ReactFlow>

        {/* 全局工作流控制台 */}
        <div className="absolute zIndex09 top-6 left-1/2 -translate-x-1/2 bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/60 shadow-2xl rounded-2xl p-4 flex flex-col gap-3 z-50 w-[600px] pointer-events-auto transition-all">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-zinc-400 mb-1">全局输入测试报文 (Hex)</label>
              <input
                type="text"
                value={globalHex}
                onChange={e => setGlobalHex(e.target.value)}
                placeholder="01 03 00 00 00 01 84 0A"
                className="w-full bg-zinc-950/80 border border-zinc-700/80 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all shadow-inner"
                disabled={isWorkflowRunning}
              />
            </div>
            <div className="flex items-end gap-2 self-stretch pt-5">
              <button
                onClick={runWorkflow}
                disabled={isWorkflowRunning || !globalHex.trim()}
                className="h-full bg-emerald-600 hover:bg-emerald-500 text-white px-5 rounded-lg font-medium text-sm transition-colors shadow flex items-center gap-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                运行工作流
              </button>
              <button
                onClick={handleSaveClick}
                disabled={isSaving}
                className="h-full bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-lg font-medium text-sm transition-colors shadow flex items-center gap-2 disabled:opacity-50"
                title="保存到SQLite数据库"
              >
                💾 {isSaving ? '保存中...' : '保存工作流'}
              </button>
              <button
                onClick={() => {
                  setWorkflowLogs([]);
                  setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, executionState: 'idle' } })));
                }}
                disabled={isWorkflowRunning}
                className="h-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 rounded-lg text-sm transition-colors shadow disabled:opacity-50"
                title="清除状态和日志"
              >
                清除
              </button>
            </div>
          </div>

          {workflowLogs.length > 0 && (
            <div className="mt-2 bg-zinc-950/90 border border-zinc-800 rounded-xl p-3 max-h-48 overflow-y-auto font-mono text-xs shadow-inner flex flex-col gap-2">
              {workflowLogs.map(log => (
                <div key={log.id} className={`${log.type === 'error' ? 'text-rose-400 font-semibold' : log.type === 'success' ? 'text-emerald-400' : 'text-zinc-400'} break-all whitespace-pre-wrap`}>
                  {log.message}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 弹出保存框 */}
        {showSaveDialog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
            <div className="bg-zinc-900 border border-zinc-700 shadow-2xl rounded-2xl p-6 w-[400px] flex flex-col gap-4 animate-in fade-in zoom-in-95">
              <h3 className="text-lg font-semibold text-zinc-100">保存工作流</h3>
              <p className="text-sm text-zinc-400">请为当前的工作流拓扑设定一个易读的名称。</p>
              <input
                type="text"
                value={tempWorkflowName}
                onChange={e => setTempWorkflowName(e.target.value)}
                placeholder="例如：车间A能耗统计解析流"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter' && tempWorkflowName.trim()) {
                    executeSave(tempWorkflowName.trim());
                  }
                }}
              />
              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => executeSave(tempWorkflowName.trim())}
                  disabled={!tempWorkflowName.trim() || isSaving}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
                >
                  {isSaving ? '保存中...' : '确认保存'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 右侧抽屉面板 */}
        <div
          className={`absolute top-0 right-0 h-full w-[350px] bg-zinc-900 border-l border-zinc-800/80 shadow-2xl transition-transform duration-300 z-20 flex flex-col ${activeNode ? 'translate-x-0' : 'translate-x-full'}`}
          style={{ zIndex: 99 }}
        >
          {activeNode && (
            <>
              <div className="flex items-center justify-between p-4 border-b border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md">
                <div>
                  <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
                    <input
                      value={activeNode.data.label as string}
                      onChange={(e) => {
                        const newLabel = e.target.value;
                        setActiveNode(prev => prev ? { ...prev, data: { ...prev.data, label: newLabel } } : null);
                        setNodes(nds => nds.map(n => n.id === activeNode.id ? { ...n, data: { ...n.data, label: newLabel } } : n));
                      }}
                      className="bg-transparent border-b border-zinc-700/50 focus:border-blue-500 focus:outline-none text-zinc-100 placeholder-zinc-500 max-w-[200px] pb-0.5 transition-colors"
                      placeholder="输入节点名称"
                    />
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 font-mono">ID: {activeNode.id}</p>
                </div>
                <button
                  onClick={() => setActiveNode(null)}
                  className="text-zinc-400 hover:text-zinc-100 transition-colors p-1.5 rounded-lg hover:bg-zinc-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 pb-32 flex-1 overflow-y-auto">
                {(activeNode.data.iconName === 'CloudLightning' || activeNode.data.iconName === 'Server') ? (
                  <div className="flex flex-col gap-5">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">选择模型</label>
                      <select
                        value={modelName}
                        onChange={(e) => setModelName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
                      >
                        <option value="Gemini 2.5 Pro">Gemini 2.5 Pro</option>
                        <option value="Gemini 1.5 Flash">Gemini 1.5 Flash</option>
                        {activeNode.data.iconName === 'Server' && (
                          <option value="Llama 3 8B (本地)">Llama 3 8B (本地)</option>
                        )}
                      </select>
                    </div>

                    <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/60">
                      <label className="block text-sm font-medium text-zinc-300 mb-2">协议图片智能导入</label>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                  setSelectedImage(e.target?.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="block w-full text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700 transition-colors"
                          />
                        </div>
                        {selectedImage && (
                          <div className="relative">
                            <img src={selectedImage} alt="Preview" className="max-h-32 object-contain rounded-lg border border-zinc-700/50" />
                          </div>
                        )}
                        <button
                          onClick={async () => {
                            if (!selectedImage || isParsingImage) return;
                            setIsParsingImage(true);
                            try {
                              const res = await fetch('/api/parse-protocol', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ imageBase64: selectedImage })
                              });
                              if (!res.ok) throw new Error("Parse failed");
                              const data = await res.json();
                              if (data.text) {
                                setSystemPrompt(prev => prev ? prev + '\n\n' + data.text : data.text);
                              }
                            } catch (e) {
                              console.error("Parse image error:", e);
                              alert("图片解析失败，请检查控制台网络请求");
                            } finally {
                              setIsParsingImage(false);
                            }
                          }}
                          disabled={!selectedImage || isParsingImage}
                          className="flex items-center justify-center gap-2 w-full bg-indigo-600/90 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm active:scale-[0.98]"
                        >
                          {isParsingImage ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                              解析中...
                            </>
                          ) : (
                            <>一键解析协议图</>
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">系统提示词 (System Prompt)</label>
                      <textarea
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        placeholder="请输入该 AI 节点的角色设定和任务指令..."
                        className="w-full h-48 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-sm text-zinc-100 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none shadow-inner leading-relaxed"
                      />
                    </div>



                    {/* 新增的 LLM-Compiler 节点测试实验区 */}
                    <div className="mt-4 pt-6 border-t border-zinc-800/80">
                      <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-emerald-500" />
                        LLM-Compiler 动态编译解析 (实验区)
                      </h4>

                      <div className="mb-3">
                        <label className="block text-xs font-medium text-zinc-500 mb-2">动态生成的解析器代码 (JavaScript)</label>
                        <textarea
                          readOnly
                          value={localGeneratedCode}
                          placeholder="点击下方测试按钮，AI 将根据协议自动生成代码..."
                          className="w-full h-32 bg-zinc-950/80 border border-zinc-800/80 rounded-xl px-3 py-3 text-xs text-zinc-300 font-mono focus:outline-none transition-all resize-none shadow-inner leading-relaxed"
                        />
                      </div>

                      <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3 h-32 overflow-y-auto mb-3 shadow-inner">
                        {testResult === null ? (
                          <div className="flex items-center justify-center h-full text-xs text-zinc-600 text-center px-4 leading-relaxed">
                            等待运行结果...
                          </div>
                        ) : (
                          <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap break-all">
                            {testResult}
                          </pre>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={hexInput}
                          onChange={(e) => setHexInput(e.target.value)}
                          placeholder="输入测试的 16 进制报文 (例如: 01 03 00...)"
                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all shadow-inner"
                          disabled={isTestLoading}
                        />
                        <button
                          type="button"
                          onClick={handleGenerateAndTest}
                          disabled={isTestLoading || !systemPrompt.trim()}
                          className="bg-purple-600/90 hover:bg-purple-500 text-white px-3 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 text-xs font-medium"
                          title="让AI生成代码并测试"
                        >
                          {isTestLoading ? '编译中...' : '生成并测试'}
                        </button>
                        <button
                          type="button"
                          onClick={handleRunLocalOnly}
                          disabled={isTestLoading || !localGeneratedCode}
                          className="bg-emerald-600/90 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 text-xs font-medium"
                          title="直接运行已有代码"
                        >
                          <Play className="w-4 h-4 ml-0.5" />
                        </button>
                      </div>
                      <button
                        onClick={onSaveConfig}
                        className="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.98]"
                      >
                        保存配置
                      </button>
                    </div>
                  </div>
                ) : activeNode.data.iconName === 'Cpu' ? (
                  <div className="flex flex-col gap-5">
                    <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-800/60 shadow-inner">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-blue-500" />
                          多条件动态规则判断面板
                        </h4>
                        <button
                          onClick={() => setRules([...rules, { id: getId(), field: '', operator: '>', value: '', api: 'none' }])}
                          className="flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          添加判断规则
                        </button>
                      </div>

                      <div className="space-y-4">
                        {rules.map((rule, idx) => (
                          <div key={rule.id} className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-3 flex flex-col gap-3 relative group">
                            <button
                              onClick={() => setRules(rules.filter(r => r.id !== rule.id))}
                              className="absolute -top-2 -right-2 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-500/50 w-6 h-6 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-lg z-10"
                              title="删除此规则"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-zinc-500 bg-zinc-800/50 px-1.5 py-0.5 rounded flex-shrink-0">If #{idx + 1}</span>
                              <input
                                type="text"
                                value={rule.field}
                                onChange={e => setRules(rules.map(r => r.id === rule.id ? { ...r, field: e.target.value } : r))}
                                placeholder="字段名, 如 Temp"
                                className="flex-1 min-w-0 w-1/3 bg-zinc-900 border border-zinc-700/80 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-zinc-600 shadow-sm"
                              />
                              <select
                                value={rule.operator}
                                onChange={e => setRules(rules.map(r => r.id === rule.id ? { ...r, operator: e.target.value } : r))}
                                className="flex-shrink-0 w-[50px] bg-zinc-900 border border-zinc-700/80 rounded-lg px-1 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-sm appearance-none text-center"
                              >
                                <option value=">">&gt;</option>
                                <option value="<">&lt;</option>
                                <option value="==">==</option>
                              </select>
                              <input
                                type="text"
                                value={rule.value}
                                onChange={e => setRules(rules.map(r => r.id === rule.id ? { ...r, value: e.target.value } : r))}
                                placeholder="对比数值"
                                className="flex-1 min-w-0 w-1/3 bg-zinc-900 border border-zinc-700/80 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-zinc-600 shadow-sm"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-zinc-500 bg-zinc-800/50 px-1.5 py-0.5 rounded flex-shrink-0">Do</span>
                              <select
                                value={rule.api}
                                onChange={e => setRules(rules.map(r => r.id === rule.id ? { ...r, api: e.target.value } : r))}
                                className="flex-1 min-w-0 w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-sm overflow-hidden text-ellipsis whitespace-nowrap"
                              >
                                <option value="none">正常结束，无外部调用</option>
                                <option value="POST /api/v1/alarmA">触发报警 A 接口 (POST /api/v1/alarmA)</option>
                                <option value="POST /api/v1/alarmB">触发报警 B 接口 (POST /api/v1/alarmB)</option>
                              </select>
                            </div>
                          </div>
                        ))}

                        {rules.length === 0 && (
                          <div className="py-6 text-center border-2 border-dashed border-zinc-800/50 rounded-xl">
                            <p className="text-xs text-zinc-500">当前未配置任何规则，流经此节点的数据将不做处理直接传递</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={onSaveConfig}
                      className="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.98]"
                    >
                      保存配置
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-center bg-zinc-950/50 rounded-xl border border-zinc-800/50 p-6 shadow-inner">
                    <p className="text-sm text-zinc-400">该类型节点暂无可用配置项。</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AgentCanvas() {
  return (
    <ReactFlowProvider>
      <div className="w-full h-full min-h-[500px] bg-zinc-950/50 relative overflow-hidden rounded-2xl">
        <DnDFlow />
      </div>
    </ReactFlowProvider>
  );
}
