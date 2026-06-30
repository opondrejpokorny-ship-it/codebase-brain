import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, FileCode, FileDiff, Layers, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import ChatBox from "@/components/projects/ChatBox";
import CodeRelationsCard from "@/components/projects/CodeRelationsCard";
import ImportMetadataCard from "@/components/projects/ImportMetadataCard";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusStyles = {
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  indexed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  error: "bg-red-50 text-red-700 border-red-200",
};

const langColors = {
  JavaScript: "bg-yellow-100 text-yellow-800",
  TypeScript: "bg-blue-100 text-blue-800",
  Python: "bg-green-100 text-green-800",
  CSS: "bg-purple-100 text-purple-800",
  HTML: "bg-orange-100 text-orange-800",
  JSON: "bg-slate-100 text-slate-600",
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.CodebaseProject.filter({ id }),
      base44.entities.CodeFile.filter({ project_id: id }),
      base44.entities.CodebaseChatMessage.filter({ project_id: id }, "created_date", 100),
    ])
      .then(([projects, files, msgs]) => {
        setProject(projects[0] || null);
        setFiles(files);
        setMessages(msgs);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleNewMessage = (msg) => {
    setMessages((prev) => [...prev, msg]);
  };

  const handleDelete = async () => {
    await base44.entities.CodebaseProject.delete(id);
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Project not found.</p>
        <Link to="/" className="text-sm text-slate-900 underline mt-2 inline-block cursor-pointer">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors duration-150 cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" />
          Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <Link to={`/project/${id}/impact`}>
            <Button variant="outline" size="sm" className="cursor-pointer gap-1.5">
              <FileDiff className="w-3.5 h-3.5" />
              Impact Analysis
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete project?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{project.name}" and all its files and chat history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 cursor-pointer">
                  Delete Project
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Project header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-heading text-xl font-bold text-slate-900 truncate">{project.name}</h1>
              <Badge variant="outline" className={statusStyles[project.status] || statusStyles.draft}>
                {project.status}
              </Badge>
            </div>
            {project.repository_url && (
              <a
                href={project.repository_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline cursor-pointer"
              >
                {project.repository_url}
              </a>
            )}
          </div>
        </div>

        {project.detected_stack?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {project.detected_stack.map((tech) => (
              <span key={tech} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-medium">
                {tech}
              </span>
            ))}
          </div>
        )}

        {project.summary && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Project Summary</h3>
            <p className="text-sm text-slate-700 leading-relaxed">{project.summary}</p>
          </div>
        )}
      </div>

      <ImportMetadataCard project={project} />
      <CodeRelationsCard files={files} />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Files */}
        <div>
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5" />
            Files ({files.length})
          </h2>
          {files.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No files indexed yet.</p>
              <p className="text-xs text-slate-400 mt-1">Paste code when creating the project to populate files.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {files.map((f) => (
                <div key={f.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate font-mono">{f.path}</p>
                    {f.summary && <p className="text-xs text-slate-500 truncate mt-0.5">{f.summary}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {f.language && (
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${langColors[f.language] || "bg-slate-100 text-slate-600"}`}>
                        {f.language}
                      </span>
                    )}
                    {f.size != null && (
                      <span className="text-xs text-slate-400">{f.size > 1024 ? `${(f.size / 1024).toFixed(1)}KB` : `${f.size}B`}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat */}
        <div>
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">AI Chat</h2>
          <ChatBox projectId={id} messages={messages} onNewMessage={handleNewMessage} />
        </div>
      </div>
    </div>
  );
}
