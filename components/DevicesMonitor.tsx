"use client";

import React, { useState, useEffect, useRef } from "react";
import { WorkflowGateway } from "@/lib/workflowGateway";
import { Activity, Play, Square, Server, Cpu, Thermometer, Zap, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Device {
  id: string;
  name: string;
  status: 'online' | 'offline';
}

const DEVICES: Device[] = [
  { id: 'dev-01', name: '#01号主轴转子电机', status: 'online' },
  { id: 'dev-02', name: '#02号核心风变频器', status: 'offline' }
];

export default function DevicesMonitor({ workflows }: { workflows: any[] }) {
  const [activeDeviceId, setActiveDeviceId] = useState<string>(DEVICES[0].id);
  const [deviceWorkflows, setDeviceWorkflows] = useState<Record<string, string>>({});
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [logs, setLogs] = useState<{ id: string; text: string; type: 'info' | 'success' | 'warning' | 'error' }[]>([]);
  
  // 实时状态数据
  const [metrics, setMetrics] = useState({ rpm: 0, temp: 0, power: 0 });
  const [tempHistory, setTempHistory] = useState<number[]>(Array(20).fill(60)); // 初始化20个点，默认60度
  const [isAlarming, setIsAlarming] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 滚动到最新日志
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    };
  }, []);

  const addLog = (text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setLogs(prev => [...prev, { id: Date.now().toString() + Math.random(), text, type }].slice(-50)); // 仅保留最近50条
  };

  const startSimulation = () => {
    if (isSimulating) return;
    
    if (!deviceWorkflows[activeDeviceId]) {
      addLog(`[SYSTEM] 🚫 启动失败: 请先在左侧为当前选中的设备绑定一个解析工作流！`, 'error');
      return;
    }

    setIsSimulating(true);
    addLog(`[SYSTEM] 启动高频 MQTT 数据流模拟 (每 800ms)`, 'info');

    let currentTemp = 65;

    simulationTimerRef.current = setInterval(() => {
      // 1. 模拟环境温度产生正弦/随机波动 (60 - 95度间游走)
      const noise = (Math.random() - 0.5) * 5;
      currentTemp = Math.max(60, Math.min(95, currentTemp + noise));
      if (Math.random() > 0.8) currentTemp += 10; // 偶尔突然升温

      // 转换为 16 进制并构造虚拟报文
      const tempHex = Math.floor(currentTemp).toString(16).padStart(2, '0').toUpperCase();
      const rawHex = `01 03 00 00 00 01 ${tempHex} 0A`;
      
      addLog(`[MQTT] 📡 收到原始高频报文: ${rawHex}`, 'info');

      try {
        // 2. 网关前置清洗拦截
        const safePayload = WorkflowGateway.beforeRun(rawHex);
        addLog(`[GATEWAY] 🛡️ 格式清洗与防注入校验通过。`, 'success');

        // 3. 获取绑定工作流及其代码
        const boundWorkflowId = deviceWorkflows[activeDeviceId];
        let parsedResult: any = null;

        if (boundWorkflowId) {
          const wf = workflows.find(w => w.id === boundWorkflowId);
          if (wf && wf.nodes) {
            const nodes = typeof wf.nodes === 'string' ? JSON.parse(wf.nodes) : wf.nodes;
            const aiNode = nodes.find((n: any) => n.data?.generatedCode);
            
            if (aiNode && aiNode.data.generatedCode) {
              addLog(`[ENGINE] ⚡ 命中本地编译代码，开始纯 JS 极速切片解析。`, 'success');
              try {
                const executableCode = `
                  ${aiNode.data.generatedCode}
                  if (typeof parseProtocol !== 'function') throw new Error("缺少 parseProtocol");
                  return parseProtocol(payload);
                `;
                const parserFn = new Function("payload", executableCode);
                parsedResult = parserFn(safePayload);
              } catch (err: any) {
                addLog(`[ENGINE] 解析执行报错: ${err.message}`, 'error');
              }
            }
          }
        }

        if (!parsedResult) {
          // 容错：如果未绑定工作流或未正确解析出，则伪造连贯性数据
          addLog(`[ENGINE] ⚠️ 未绑定包含代码的工作流或执行失败，采用容错兜底解析。`, 'warning');
          parsedResult = {
            Temp: parseFloat(currentTemp.toFixed(1)),
            RPM: Math.floor(3000 + Math.random() * 200),
            Power: parseFloat((15 + Math.random() * 2).toFixed(1))
          };
        } else {
          // 尝试从真实解析结果中拿取数据，兜底使用当前生成值
          parsedResult = {
            Temp: parsedResult.Temp || parsedResult.temperature || parseFloat(currentTemp.toFixed(1)),
            RPM: parsedResult.RPM || parsedResult.speed || Math.floor(3000 + Math.random() * 200),
            Power: parsedResult.Power || parsedResult.power || parseFloat((15 + Math.random() * 2).toFixed(1))
          };
        }

        // 4. 更新面板数据
        setMetrics({
          rpm: parsedResult.RPM,
          temp: parsedResult.Temp,
          power: parsedResult.Power
        });
        setTempHistory(prev => [...prev.slice(1), parsedResult.Temp]);

        // 5. 动态执行工作流中配置的传统规则并触发限流
        let hasMatchedRule = false;
        if (boundWorkflowId) {
          const wf = workflows.find(w => w.id === boundWorkflowId);
          if (wf && wf.nodes) {
            const nodes = typeof wf.nodes === 'string' ? JSON.parse(wf.nodes) : wf.nodes;
            const cpuNode = nodes.find((n: any) => n.data?.iconName === 'Cpu');
            
            if (cpuNode && cpuNode.data.rules && Array.isArray(cpuNode.data.rules)) {
              for (const rule of cpuNode.data.rules) {
                let isTriggered = false;
                if (rule.field in parsedResult) {
                  const actualValue = parsedResult[rule.field];
                  const value = Number(rule.value) || rule.value;
                  if (rule.operator === '>') isTriggered = Number(actualValue) > Number(value);
                  else if (rule.operator === '<') isTriggered = Number(actualValue) < Number(value);
                  else if (rule.operator === '==') isTriggered = actualValue == value;
                }

                if (isTriggered && rule.api && rule.api !== 'none') {
                  hasMatchedRule = true;
                  const throttleKey = `sim_device_${activeDeviceId}_${rule.id}`;
                  const isThrottled = WorkflowGateway.checkThrottle(throttleKey, 10000); // 10s cooldown
                  
                  if (isThrottled) {
                    addLog(`[THROTTLE] 🛑 规则 [${rule.field} ${rule.operator} ${rule.value}] 触发警报！处于 10 秒冷却期内，系统已自动收敛截流。`, 'warning');
                  } else {
                    addLog(`[ALERT] 🚨 规则 [${rule.field} ${rule.operator} ${rule.value}] 首次触发！正在调用 API: [${rule.api}]`, 'error');
                  }
                  break; // 只匹配第一个触发的规则，与工作流引擎保持一致
                }
              }
            }
          }
        }

        // 容错: 若无节点规则且温度过高，为了演示的兜底保护
        if (!hasMatchedRule && parsedResult.Temp > 98) {
           const throttleKey = `sim_device_${activeDeviceId}_fallback_overtemp`;
           if (WorkflowGateway.checkThrottle(throttleKey, 10000)) {
             addLog(`[THROTTLE] 🛑 默认超温保护(>98℃)触发！处于冷却期内已收敛。`, 'warning');
           } else {
             addLog(`[ALERT] 🚨 默认超温保护(>98℃)触发！`, 'error');
           }
        }
        
        setIsAlarming(hasMatchedRule || (!hasMatchedRule && parsedResult.Temp > 98));

      } catch (err: any) {
        addLog(`[GATEWAY] ❌ 安全拦截失败: ${err.message}`, 'error');
      }

    }, 800);
  };

  const stopSimulation = () => {
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
    setIsSimulating(false);
    addLog(`[SYSTEM] 已停止模拟。`, 'info');
  };

  // 生成 SVG 折线点
  const generateSvgPoints = () => {
    const width = 600;
    const height = 150;
    const minTemp = 50;
    const maxTemp = 100;
    
    const stepX = width / (tempHistory.length - 1);
    
    return tempHistory.map((temp, i) => {
      const x = i * stepX;
      // 归一化并反转Y轴（SVG 坐标系向下增长）
      const normalizedY = Math.max(0, Math.min(1, (temp - minTemp) / (maxTemp - minTemp)));
      const y = height - normalizedY * height;
      return `${x},${y}`;
    }).join(' ');
  };

  return (
    <div className="flex h-full w-full bg-zinc-950 text-zinc-100 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
      
      {/* 左侧设备列表 */}
      <div className="w-[300px] border-r border-zinc-800 bg-zinc-900/50 flex flex-col p-4">
        <h2 className="text-sm font-semibold text-zinc-400 mb-4 flex items-center gap-2 tracking-wider">
          <Server className="w-4 h-4" /> 工业资产列表
        </h2>
        
        <div className="flex flex-col gap-3">
          {DEVICES.map(device => (
            <div 
              key={device.id} 
              onClick={() => setActiveDeviceId(device.id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                activeDeviceId === device.id 
                  ? 'bg-blue-900/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                  : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-zinc-600'}`} />
                  {device.name}
                </span>
              </div>
              
              <div className="mt-3">
                <label className="text-xs text-zinc-500 mb-1 block">绑定解析工作流</label>
                <select 
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-blue-500 transition-colors"
                  value={deviceWorkflows[device.id] || ""}
                  onChange={(e) => setDeviceWorkflows(prev => ({ ...prev, [device.id]: e.target.value }))}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">-- 未绑定 --</option>
                  {workflows.map(wf => (
                    <option key={wf.id} value={wf.id}>{wf.name || '未命名'}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧遥测控制台 */}
      <div className="flex-1 flex flex-col p-6 bg-gradient-to-br from-zinc-950 to-zinc-900/80">
        
        {/* 控制头 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              实时遥测控制台 - {DEVICES.find(d => d.id === activeDeviceId)?.name}
            </h1>
            <p className="text-xs text-zinc-500 mt-1">展示网关拦截过滤、实时本地编译解析、防抖收敛全链路性能。</p>
          </div>
          
          <div className="flex items-center gap-3">
            {!isSimulating ? (
              <button 
                onClick={startSimulation}
                disabled={!deviceWorkflows[activeDeviceId]}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${
                  deviceWorkflows[activeDeviceId] 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)]' 
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
                }`}
              >
                <Play className={`w-4 h-4 ${deviceWorkflows[activeDeviceId] ? 'fill-current' : ''}`} />
                启动 MQTT 模拟数据流
              </button>
            ) : (
              <button 
                onClick={stopSimulation}
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-[0_0_15px_rgba(225,29,72,0.3)] hover:shadow-[0_0_20px_rgba(225,29,72,0.5)] active:scale-95"
              >
                <Square className="w-4 h-4 fill-current" />
                停止模拟
              </button>
            )}
          </div>
        </div>

        {/* 顶部指标卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-inner flex items-center gap-5">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Cpu className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1">主轴转速 (RPM)</div>
              <div className="text-3xl font-bold font-mono tracking-tighter text-blue-100">{metrics.rpm}</div>
            </div>
          </div>
          
          <div className={`bg-zinc-900 border rounded-2xl p-5 shadow-inner flex items-center gap-5 transition-colors duration-300 ${isAlarming ? 'border-rose-500/50 bg-rose-500/5' : 'border-zinc-800'}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${isAlarming ? 'bg-rose-500/20 border-rose-500/30 animate-pulse' : 'bg-orange-500/10 border-orange-500/20'}`}>
              <Thermometer className={`w-6 h-6 ${isAlarming ? 'text-rose-400' : 'text-orange-400'}`} />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1">核心温度 (Temp)</div>
              <div className={`text-3xl font-bold font-mono tracking-tighter flex items-end gap-1 ${isAlarming ? 'text-rose-400' : 'text-orange-100'}`}>
                {metrics.temp} <span className="text-sm pb-1">°C</span>
              </div>
            </div>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-inner flex items-center gap-5">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Zap className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1">运行能耗 (Power)</div>
              <div className="text-3xl font-bold font-mono tracking-tighter flex items-end gap-1 text-emerald-100">
                {metrics.power} <span className="text-sm pb-1">kW</span>
              </div>
            </div>
          </div>
        </div>

        {/* 动态温度折线图 */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-5 mb-6 shadow-inner relative overflow-hidden flex-shrink-0 h-48 flex flex-col">
          <div className="flex items-center justify-between mb-2 z-10">
            <span className="text-xs font-semibold text-zinc-400">实时温度趋势走势 (纯 SVG + React State)</span>
            <span className="text-xs font-mono text-zinc-500">Target Range: 60 - 85°C</span>
          </div>
          
          {/* 超温警戒红线 */}
          <div className="absolute left-0 right-0 top-[30%] border-t border-dashed border-rose-500/30 z-0">
             <span className="absolute right-2 -top-5 text-[10px] text-rose-500/80 font-mono">85°C ALARM LIMIT</span>
          </div>
          
          <div className="flex-1 relative w-full h-full">
            <svg 
              viewBox="0 0 600 150" 
              preserveAspectRatio="none" 
              className="w-full h-full overflow-visible absolute inset-0 drop-shadow-[0_0_10px_rgba(249,115,22,0.4)]"
            >
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="1" />
                </linearGradient>
              </defs>
              <polyline
                points={generateSvgPoints()}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300 ease-linear"
              />
            </svg>
          </div>
        </div>

        {/* 底部收敛日志 Console */}
        <div className="flex-1 bg-black/60 border border-zinc-800 rounded-2xl p-4 font-mono text-xs overflow-y-auto shadow-inner flex flex-col gap-1.5 h-64">
          {logs.map((log) => {
            let colorClass = 'text-zinc-400';
            if (log.type === 'success') colorClass = 'text-emerald-400';
            if (log.type === 'warning') colorClass = 'text-orange-400 font-semibold';
            if (log.type === 'error') colorClass = 'text-rose-400 font-semibold';
            
            let icon = '';
            if (log.text.includes('[MQTT]')) icon = '📡 ';
            if (log.text.includes('[GATEWAY]')) icon = '🛡️ ';
            if (log.text.includes('[ENGINE]')) icon = '⚡ ';
            if (log.text.includes('[THROTTLE]')) icon = '🛑 ';
            
            return (
              <div key={log.id} className={`${colorClass} whitespace-pre-wrap break-all leading-relaxed hover:bg-zinc-900/50 px-1 py-0.5 rounded transition-colors`}>
                <span className="text-zinc-600 select-none">[{new Date().toISOString().split('T')[1].slice(0, 12)}] </span>
                {log.text}
              </div>
            );
          })}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
