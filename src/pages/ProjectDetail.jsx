import { useParams, Link } from "react-router-dom";
import { ArrowLeft, FileDiff, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ChatBox from "@/components/projects/ChatBox";
import CodeRelationsCard from "@/components/projects/CodeRelationsCard";
import CodeSymbolsCard from "@/components/projects/CodeSymbolsCard";
import FilesPanel from "@/components/projects/FilesPanel";
import ImportMetadataCard from "@/components/projects/ImportMetadataCard";
import MissingContextQueueCard from "@/components/projects/MissingContextQueueCard";
import { useProjectDetail } from "@/hooks/useProjectDetail";
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
  url_only: "bg-blue-50 text-blue-700 border-blue-200",
  error: "bg-red-50 text-red-700 border-red-200",
};

export default function ProjectDetail() {
  const { id } = useParams();
  const projectState = useProjectDetail(id);
  const { project, files, messages, missingContextQueue, loading } = projectState;

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  if (!project) return <div className="text-center py-20"><p className="text-slate-500">Project not found.</p><Link to="/" className="text-sm text-slate-900 underline mt-2 inline-block cursor-pointer">Back to Dashboard</Link></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors duration-150 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" />Dashboard</Link>
        <div className="flex items-center gap-2">
          <Link to={`/project/${id}/impact`}><Button variant="outline" size="sm" className="cursor-pointer gap-1.5"><FileDiff className="w-3.5 h-3.5" />Impact Analysis</Button></Link>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer gap-1.5"><Trash2 className="w-3.5 h-3.5" />Delete</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Delete project?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{project.name}" and all its files and chat history.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel><AlertDialogAction onClick={projectState.deleteProject} className="bg-red-600 hover:bg-red-700 cursor-pointer">Delete Project</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1"><h1 className="font-heading text-xl font-bold text-slate-900 truncate">{project.name}</h1><Badge variant="outline" className={statusStyles[project.status] || statusStyles.draft}>{project.status}</Badge></div>
            {project.repository_url && <a href={project.repository_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline cursor-pointer">{project.repository_url}</a>}
          </div>
        </div>
        {project.detected_stack?.length > 0 && <div className="flex flex-wrap gap-1.5 mt-4">{project.detected_stack.map((tech) => <span key={tech} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-medium">{tech}</span>)}</div>}
        {project.summary && <div className="mt-4 pt-4 border-t border-slate-100"><h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Project Summary</h3><p className="text-sm text-slate-700 leading-relaxed">{project.summary}</p></div>}
      </div>

      <ImportMetadataCard project={project} />
      <MissingContextQueueCard project={project} projectId={id} queue={missingContextQueue} files={files} resolving={projectState.resolvingQueue} resolveMessage={projectState.queueResolveMessage} resolveError={projectState.queueResolveError} onResolve={projectState.resolveQueueFromGitHub} onClear={projectState.clearQueueState} />
      <CodeRelationsCard files={files} />
      <CodeSymbolsCard files={files} />

      <div className="grid lg:grid-cols-2 gap-6">
        <FilesPanel files={files} />
        <div><h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">AI Chat</h2><ChatBox projectId={id} messages={messages} onNewMessage={projectState.handleNewMessage} /></div>
      </div>
    </div>
  );
}
