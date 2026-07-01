import { Link } from "react-router-dom";
import { BookOpenCheck, Bot, Building2, FileText, GitBranch, History, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SmartContextActions({ projectId }) {
  if (!projectId) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Link to={`/project/${projectId}/search`}>
        <Button variant="outline" size="sm" className="gap-2 cursor-pointer">
          <Search className="w-4 h-4" />
          Search Codebase
        </Button>
      </Link>
      <Link to={`/project/${projectId}/architecture`}>
        <Button variant="outline" size="sm" className="gap-2 cursor-pointer">
          <Building2 className="w-4 h-4" />
          Architecture
        </Button>
      </Link>
      <Link to={`/project/${projectId}/graph`}>
        <Button variant="outline" size="sm" className="gap-2 cursor-pointer">
          <GitBranch className="w-4 h-4" />
          Graph Lens
        </Button>
      </Link>
      <Link to={`/project/${projectId}/decisions`}>
        <Button variant="outline" size="sm" className="gap-2 cursor-pointer">
          <FileText className="w-4 h-4" />
          Decisions
        </Button>
      </Link>
      <Link to={`/project/${projectId}/mcp`}>
        <Button variant="outline" size="sm" className="gap-2 cursor-pointer">
          <Bot className="w-4 h-4" />
          MCP Setup
        </Button>
      </Link>
      <Link to={`/project/${projectId}/risk-memory`}>
        <Button variant="outline" size="sm" className="gap-2 cursor-pointer">
          <History className="w-4 h-4" />
          Risk Memory
        </Button>
      </Link>
      <Link to={`/project/${projectId}/rules`}>
        <Button variant="outline" size="sm" className="gap-2 cursor-pointer">
          <BookOpenCheck className="w-4 h-4" />
          Project Rules
        </Button>
      </Link>
    </div>
  );
}
