"use client";

import React, { useState, useEffect } from "react";
import AgentCanvas from "@/components/AgentCanvas";
import DevicesMonitor from "@/components/DevicesMonitor";
import { Bot, Workflow, Plus, Search, Bell, FileCode2, Activity, Trash2 } from "lucide-react";

export default function Home() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'workflow' | 'monitor'>('workflow');

  const fetchWorkflows = async () => {
    try {
      const res = await fetch('/api/workflow');
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data);
        if (data.length > 0 && activeWorkflowId === null) {
          setActiveWorkflowId(data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchWorkflows();
    const handleWorkflowSaved = () => fetchWorkflows();
    window.addEventListener('workflow-saved', handleWorkflowSaved);
    return () => window.removeEventListener('workflow-saved', handleWorkflowSaved);
  }, []);

  const handleSelectWorkflow = (id: string | null) => {
    setActiveWorkflowId(id);
    window.dispatchEvent(new CustomEvent('load-workflow', { detail: id }));
  };

  const handleDeleteWorkflow = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(`⚠️ 确定要永久删除工作流【${name}】吗？\n此操作不可恢复！`)) {
      try {
        const res = await fetch(`/api/workflow/${id}`, { method: 'DELETE' });
        if (res.ok) {
          if (activeWorkflowId === id) {
            handleSelectWorkflow(null);
          }
          fetchWorkflows();
        } else {
          alert('删除失败，请稍后重试');
        }
      } catch (err) {
        console.error(err);
        alert('删除失败，服务器异常');
      }
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-50 font-sans overflow-hidden">
      {/* 侧边栏 */}
      <aside className="w-64 border-r border-zinc-800/60 bg-zinc-950 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-zinc-800/60">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <Bot className="w-6 h-6 text-blue-500" />
            <span>AI Agent Studio</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-zinc-500 mb-4 px-2 tracking-wider">菜单</div>
          <button 
            onClick={() => setActiveTab('workflow')}
            className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg transition-colors ${activeTab === 'workflow' ? 'bg-blue-500/10 text-blue-400 font-medium' : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900'}`}
          >
            <Workflow className="w-4 h-4" />
            <span>工作流编排 (Workflows)</span>
          </button>
          <button 
            onClick={() => setActiveTab('monitor')}
            className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg transition-colors ${activeTab === 'monitor' ? 'bg-blue-500/10 text-blue-400 font-medium' : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900'}`}
          >
            <Activity className="w-4 h-4" />
            <span>设备资产监测 (Monitor)</span>
          </button>

          {activeTab === 'workflow' && (
            <>
              <div className="mt-8 mb-2 px-2 flex items-center justify-between">
                <div className="text-xs font-semibold text-zinc-500 tracking-wider">已保存工作流</div>
                <button 
                  onClick={() => handleSelectWorkflow(null)}
                  className="text-zinc-400 hover:text-emerald-400 transition-colors"
                  title="新建工作流"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-1">
                {workflows.map(wf => (
                  <div key={wf.id} className="relative group">
                    <button
                      onClick={() => handleSelectWorkflow(wf.id)}
                      className={`flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg transition-colors pr-10 ${
                        activeWorkflowId === wf.id 
                          ? 'bg-blue-500/10 text-blue-400 font-medium' 
                          : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900'
                      }`}
                    >
                      <FileCode2 className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{wf.name}</span>
                    </button>
                    <button
                      onClick={(e) => handleDeleteWorkflow(e, wf.id, wf.name)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-rose-500/10"
                      title="删除工作流"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {workflows.length === 0 && (
                  <div className="px-3 py-2 text-xs text-zinc-600 text-center">暂无保存的工作流</div>
                )}
              </div>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-zinc-800/60">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-xs font-bold shadow-inner">
              US
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">User Admin</span>
              <span className="text-xs text-zinc-500">Pro Plan</span>
            </div>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0 bg-zinc-950/50 relative">
        {/* 背景光晕装饰 */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[128px] pointer-events-none" />

        {/* 顶部导航 */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-zinc-800/60 backdrop-blur-sm z-10">
          <div className="flex items-center text-sm text-zinc-400">
            <span>工作空间</span>
            <span className="mx-2">/</span>
            <span className="text-zinc-50 font-medium">{activeTab === 'workflow' ? '智能 Agent 编排' : '设备资产监测大屏'}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text" 
                placeholder="搜索节点或流程..." 
                className="bg-zinc-900 border border-zinc-800 rounded-full pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-zinc-300 placeholder:text-zinc-600 w-64"
              />
            </div>
            <button className="p-2 text-zinc-400 hover:text-zinc-50 rounded-full hover:bg-zinc-900 transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            {activeTab === 'workflow' && (
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('trigger-save-workflow'));
                  }
                }}
                className="flex items-center gap-2 bg-zinc-50 text-zinc-950 px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-zinc-200 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                保存工作流
              </button>
            )}
          </div>
        </header>

        {/* 内容区域 */}
        <div className="flex-1 p-6 flex flex-col z-10 h-[calc(100vh-4rem)]">
          {activeTab === 'workflow' ? (
            <>
              <div className="mb-4">
                <h1 className="text-2xl font-semibold tracking-tight">Agent 编排画布</h1>
                <p className="text-sm text-zinc-400 mt-1">
                  通过拖拽节点来设计您的 AI Agent 执行流程。双击节点以配置大模型参数。
                </p>
              </div>
              <div className="flex-1 w-full rounded-2xl border border-zinc-800/80 shadow-2xl overflow-hidden bg-zinc-950 relative">
                <AgentCanvas />
              </div>
            </>
          ) : (
            <DevicesMonitor workflows={workflows} />
          )}
        </div>
      </main>
    </div>
  );
}
