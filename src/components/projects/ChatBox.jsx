import { useState, useRef, useEffect } from "react";
import { Send, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from "react-markdown";
import { buildCodebaseQuestionPrompt } from "@/lib/codebaseUtils";

async function answerWithCoreLLM(projectId, question) {
  const [projects, files] = await Promise.all([
    base44.entities.CodebaseProject.filter({ id: projectId }),
    base44.entities.CodeFile.filter({ project_id: projectId }),
  ]);

  const project = projects[0];
  const prompt = buildCodebaseQuestionPrompt({ project, files, question });
  const answer = await base44.integrations.Core.InvokeLLM({ prompt });

  return answer || "I could not generate a response from the available codebase context.";
}

export default function ChatBox({ projectId, messages, onNewMessage }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;
    setInput("");

    const userMsg = { project_id: projectId, role: "user", content: question };
    await base44.entities.CodebaseChatMessage.create(userMsg);
    onNewMessage({ ...userMsg, id: "temp-user-" + Date.now() });

    setLoading(true);
    try {
      let answer = null;

      try {
        const res = await base44.functions.invoke("codebaseChat", {
          project_id: projectId,
          user_question: question,
        });
        answer = res.data?.answer || null;
      } catch {
        // Phase 1 intentionally works without a deployed custom backend function.
        // This keeps the MVP small and lets Base44's built-in LLM integration answer from stored context.
        answer = await answerWithCoreLLM(projectId, question);
      }

      const assistantMsg = {
        project_id: projectId,
        role: "assistant",
        content: answer || "Sorry, I couldn't generate a response from the available context.",
      };
      await base44.entities.CodebaseChatMessage.create(assistantMsg);
      onNewMessage({ ...assistantMsg, id: "temp-asst-" + Date.now() });
    } catch {
      const errMsg = {
        project_id: projectId,
        role: "assistant",
        content: "An error occurred while answering. The project may not have enough stored code context yet.",
      };
      await base44.entities.CodebaseChatMessage.create(errMsg);
      onNewMessage({ ...errMsg, id: "temp-err-" + Date.now() });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 flex flex-col h-[420px]">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-heading font-semibold text-sm text-slate-900">Ask About This Codebase</h3>
        <div className="flex items-center gap-1.5 text-xs text-amber-600">
          <AlertTriangle className="w-3 h-3" />
          <span>Context may be incomplete</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-slate-400 text-center mt-12">Ask a question about the codebase…</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              {msg.role === "user" ? (
                <p>{msg.content}</p>
              ) : (
                <ReactMarkdown className="prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  {msg.content}
                </ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-xl px-3.5 py-2.5 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-slate-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="e.g. What does the auth middleware do?"
            className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-colors duration-150"
            disabled={loading}
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            size="sm"
            className="px-3 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
