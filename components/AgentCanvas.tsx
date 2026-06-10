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
import { useChat } from "@ai-sdk/react";
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

let idCounter = 0;
const getId = () => `node_${idCounter++}`;

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

  return (
    <div className={`bg-zinc-900 border ${data.colorClass || 'border-zinc-800'} text-zinc-100 rounded-xl shadow-lg min-w-[150px] group transition-all`}>
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

  const [inputValue, setInputValue] = useState("");

  const { messages, append, isLoading, setMessages } = useChat({
    api: '/api/chat',
    body: {
      systemPrompt,
      modelName,
    },
  });

  React.useEffect(() => {
    if (activeNode) {
      setModelName((activeNode.data.modelName as string) || "Gemini 2.5 Pro");
      setSystemPrompt((activeNode.data.systemPrompt as string) || "");
      setMessages([]); // 切换节点时清空测试历史
      setInputValue("");
    }
  }, [activeNode, setMessages]);

  const handleTestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    append({ role: 'user', content: inputValue });
    setInputValue("");
  };

  const onSaveConfig = () => {
    if (!activeNode) return;
    setNodes(nds => nds.map(n => {
      if (n.id === activeNode.id) {
        return {
          ...n,
          data: { ...n.data, modelName, systemPrompt }
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

        {/* 右侧抽屉面板 */}
        <div
          className={`absolute top-0 right-0 h-full w-[350px] bg-zinc-900 border-l border-zinc-800/80 shadow-2xl transition-transform duration-300 z-20 flex flex-col ${activeNode ? 'translate-x-0' : 'translate-x-full'}`}
        >
          {activeNode && (
            <>
              <div className="flex items-center justify-between p-4 border-b border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md">
                <div>
                  <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
                    {activeNode.data.label as string}
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

              <div className="p-5 flex-1 overflow-y-auto">
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
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">系统提示词 (System Prompt)</label>
                      <textarea
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        placeholder="请输入该 AI 节点的角色设定和任务指令..."
                        className="w-full h-48 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-sm text-zinc-100 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none shadow-inner leading-relaxed"
                      />
                    </div>

                    <button
                      onClick={onSaveConfig}
                      className="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.98]"
                    >
                      保存配置
                    </button>

                    {/* 新增的节点测试实验区 */}
                    <div className="mt-4 pt-6 border-t border-zinc-800/80">
                      <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                        <Play className="w-4 h-4 text-emerald-500" />
                        测试此节点 (实验区)
                      </h4>

                      <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3 h-48 overflow-y-auto mb-3 shadow-inner flex flex-col gap-3">
                        {messages.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center text-xs text-zinc-600 text-center px-4 leading-relaxed">
                            在此模拟用户输入，测试该节点的 System Prompt 实际效果...
                          </div>
                        ) : (
                          messages.map(m => (
                            <div key={m.id} className={`text-sm ${m.role === 'user' ? 'text-blue-400 self-end bg-blue-500/10 px-3 py-2 rounded-lg max-w-[85%]' : 'text-zinc-300 self-start bg-zinc-800/50 px-3 py-2 rounded-lg max-w-[95%]'}`}>
                              <span className="font-semibold text-[10px] uppercase tracking-wider opacity-50 mb-1 block">
                                {m.role === 'user' ? 'User' : 'AI'}
                              </span>
                              <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                            </div>
                          ))
                        )}
                        {isLoading && (
                          <div className="text-xs text-zinc-500 italic mt-1 self-start bg-zinc-800/30 px-3 py-2 rounded-lg animate-pulse">
                            大模型思考中...
                          </div>
                        )}
                      </div>

                      <form onSubmit={handleTestSubmit} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          placeholder="输入测试内容..."
                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all shadow-inner"
                          disabled={isLoading}
                        />
                        <button
                          type="submit"
                          disabled={isLoading || !inputValue.trim()}
                          className="bg-emerald-600/90 hover:bg-emerald-500 text-white p-2 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                          title="发送测试"
                        >
                          <Play className="w-4 h-4 ml-0.5" />
                        </button>
                      </form>
                    </div>
                  </div>
                ) : activeNode.data.iconName === 'Cpu' ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center bg-zinc-950/50 rounded-xl border border-zinc-800/50 p-6 shadow-inner">
                    <Cpu className="w-8 h-8 text-blue-500 mb-3 opacity-80" />
                    <p className="text-sm text-zinc-400 leading-relaxed">传统节点业务逻辑请前往后端对应 API 配置文件进行编辑。</p>
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
