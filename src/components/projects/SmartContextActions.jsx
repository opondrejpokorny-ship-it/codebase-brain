import { Link } from "react-router-dom";
import { Building2, Search } from "lucide-react";
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
    </div>
  );
}
