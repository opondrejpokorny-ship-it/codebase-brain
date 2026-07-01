import { Link } from "react-router-dom";
import { GitBranch, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const statusStyles = {
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  indexed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  error: "bg-red-50 text-red-700 border-red-200",
};

export default function ProjectCard({ project }) {
  return (
    <Link
      to={`/project/${project.id}`}
      className="group block bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm transition-all duration-150 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-heading font-semibold text-slate-900 truncate">{project.name}</h3>
          {project.repository_url && (
            <p className="text-sm text-slate-500 truncate mt-1 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 flex-shrink-0" />
              {project.repository_url.replace("https://github.com/", "")}
            </p>
          )}
        </div>
        <Badge variant="outline" className={statusStyles[project.status] || statusStyles.draft}>
          {project.status}
        </Badge>
      </div>

      {project.detected_stack?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {project.detected_stack.slice(0, 5).map((tech) => (
            <span key={tech} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
              {tech}
            </span>
          ))}
        </div>
      )}

      {project.description && (
        <p className="text-sm text-slate-600 mt-3 line-clamp-2">{project.description}</p>
      )}

      <div className="flex items-center justify-end mt-4 text-sm text-slate-400 group-hover:text-slate-600 transition-colors duration-150">
        <span className="mr-1">Open</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </Link>
  );
}
