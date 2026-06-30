import { Sparkles, GitPullRequest, Share2, Server, TestTube } from "lucide-react";

const features = [
  { icon: Sparkles, label: "GitHub App Import", desc: "Auto-import from GitHub" },
  { icon: GitPullRequest, label: "PR Impact Analysis", desc: "Understand PR changes" },
  { icon: Share2, label: "Code Graph", desc: "Visualize dependencies" },
  { icon: Server, label: "MCP Server", desc: "IDE integration" },
  { icon: TestTube, label: "Test Suggestions", desc: "AI-generated tests" },
];

export default function ComingNextCard() {
  return (
    <div className="bg-white rounded-xl border border-dashed border-slate-300 p-5">
      <h3 className="font-heading font-semibold text-slate-900 text-sm mb-3">Coming Next</h3>
      <div className="space-y-2.5">
        {features.map((f) => (
          <div key={f.label} className="flex items-center gap-3 text-sm">
            <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
              <f.icon className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-slate-700">{f.label}</p>
              <p className="text-xs text-slate-400">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}