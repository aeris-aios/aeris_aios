import { useState, useRef, useEffect } from "react";
import { useListAnthropicConversations, useGetAnthropicConversation, useCreateAnthropicConversation } from "@workspace/api-client-react";
import { useSSE } from "@/hooks/use-sse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { BrainCircuit, Send, Plus, MessageSquare, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";

export default function Assistant() {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [deepThink, setDeepThink] = useState(false);
  
  const queryClient = useQueryClient();
  const { data: conversations, isLoading: loadingConvos } = useListAnthropicConversations();
  const { data: activeConversation, isLoading: loadingChat } = useGetAnthropicConversation(activeId as number, { query: { enabled: !!activeId } });
  const { mutate: createConvo, isPending: creatingConvo } = useCreateAnthropicConversation();
  
  const { stream, data: streamData, isStreaming } = useSSE();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConversation, streamData]);

  const handleCreate = () => {
    createConvo({ data: { title: "New Intelligence Session" } }, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["/api/anthropic/conversations"] });
        setActiveId(data.id);
      }
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeId || isStreaming) return;

    const userMessage = input;
    setInput("");

    // Optimistically update UI
    const currentMessages = activeConversation?.messages || [];
    queryClient.setQueryData([`/api/anthropic/conversations/${activeId}`], {
      ...activeConversation,
      messages: [...currentMessages, { id: Date.now(), role: "user", content: userMessage, createdAt: new Date().toISOString() }]
    });

    await stream(`/api/anthropic/conversations/${activeId}/messages`, {
      content: userMessage,
      model: deepThink ? "opus" : "sonnet"
    });

    // Invalidate to get actual final messages
    queryClient.invalidateQueries({ queryKey: [`/api/anthropic/conversations/${activeId}`] });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6 animate-in fade-in">
      {/* Sidebar */}
      <Card className="w-full md:w-64 flex-shrink-0 flex flex-col glass-panel border-white/5 bg-white/5">
        <div className="p-4 border-b border-white/5">
          <Button onClick={handleCreate} disabled={creatingConvo} className="w-full bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30">
            {creatingConvo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            New Session
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingConvos ? (
            <div className="p-4 text-sm text-muted-foreground text-center">Loading...</div>
          ) : conversations?.length ? (
            conversations.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full text-left px-3 py-3 text-sm rounded-lg transition-all flex items-center gap-3 ${activeId === c.id ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:bg-white/5'}`}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate">{c.title}</span>
              </button>
            ))
          ) : (
            <div className="p-4 text-sm text-muted-foreground text-center">No sessions found.</div>
          )}
        </div>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col min-w-0 glass-panel border-white/5 bg-white/5">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20 rounded-t-xl">
          <h2 className="font-medium text-foreground">
            {activeConversation ? activeConversation.title : "Select a session"}
          </h2>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setDeepThink(!deepThink)}
            className={`transition-all duration-300 ${deepThink ? 'bg-primary/20 border-primary/50 text-primary shadow-[0_0_15px_rgba(0,150,255,0.2)]' : 'bg-transparent border-white/10 text-muted-foreground'}`}
          >
            <BrainCircuit className="h-4 w-4 mr-2" />
            {deepThink ? "Opus Engine Active" : "Sonnet Engine"}
          </Button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {!activeId ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <BrainCircuit className="h-12 w-12 mb-4 opacity-20" />
              <p>Initialize a session to begin analysis.</p>
            </div>
          ) : loadingChat ? (
            <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <>
              {activeConversation?.messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-5 py-4 ${m.role === 'user' ? 'bg-primary/20 border border-primary/30 text-white' : 'bg-white/5 border border-white/10 text-gray-200'}`}>
                    <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl px-5 py-4 bg-white/5 border border-white/10 text-gray-200">
                    <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                      <ReactMarkdown>{streamData}</ReactMarkdown>
                    </div>
                    <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse align-middle" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/5 bg-black/20 rounded-b-xl">
          <form onSubmit={handleSend} className="relative flex items-center">
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={activeId ? "Command Atreyu..." : "Start a session first..."}
              disabled={!activeId || isStreaming}
              className="w-full bg-white/5 border-white/10 h-14 pl-4 pr-14 rounded-xl text-base focus-visible:ring-primary/50"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!input.trim() || !activeId || isStreaming}
              className="absolute right-2 h-10 w-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
