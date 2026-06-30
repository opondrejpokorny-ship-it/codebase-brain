import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { buildCodeRelations } from "@/lib/codeGraphUtils";
import { searchCodebase } from "@/lib/codeSearchUtils";

export default function CodeSearch() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.CodebaseProject.filter({ id }),
      base44.entities.CodeFile.filter({ project_id: id }),
    ])
      .then(([projects, storedFiles]) => {
        setProject(projects?.[0] || null);
        setFiles(storedFiles || []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const relations = useMemo(() => buildCodeRelations(files), [files]);
  const results = useMemo(() => searchCodebase({ query, files, relations, limit: 12 }), [query, files, relations]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <Link to={`/project/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors duration-150 cursor-pointer">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Project
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h1 className="font-heading text-xl font-bold text-slate-900 flex items-center gap-2">
          <Search className="w-5 h-5 text-slate-500" />
          Search Codebase
        </h1>
        <p className="text-sm text-slate-500 mt-1">Deterministic semantic search lite for {project?.name || "this project"}. No embeddings or LLM call required.</p>
        <div className="flex gap-2 mt-4">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by meaning, file path, symbol, import, or domain e.g. webhook refund auth" />
          <Button variant="outline" className="gap-2 cursor-pointer"><Search className="w-4 h-4" />Search</Button>
        </div>
      </div>

      {!query.trim() ? (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 text-sm text-slate-500">Enter a query to search stored files, paths, imports, and lightweight symbols.</div>
      ) : results.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">No matches found in the stored sample.</div>
      ) : (
        <div className="space-y-3">
          {results.map((result) => (
            <div key={result.path} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-slate-900 truncate">{result.path}</p>
                  <p className="text-xs text-slate-400 mt-1">score {result.score}</p>
                </div>
                <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">{result.language}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {result.reasons.map((reason) => (
                  <span key={reason} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md">{reason}</span>
                ))}
              </div>
              {result.symbols.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {result.symbols.map((symbol) => (
                    <span key={symbol} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-mono">{symbol}</span>
                  ))}
                </div>
              )}
              {result.matchedSnippets.length > 0 && (
                <div className="mt-3 space-y-2">
                  {result.matchedSnippets.map((snippet) => (
                    <pre key={`${result.path}-${snippet.line}`} className="bg-slate-950 text-slate-100 rounded-lg p-3 text-xs overflow-auto"><span className="text-slate-400">line {snippet.line}</span>{"\n"}{snippet.text}</pre>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
