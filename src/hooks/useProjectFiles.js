import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export function useProjectFiles(projectId) {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    let cancelled = false;

    base44.entities.CodeFile.filter({ project_id: projectId })
      .then((storedFiles) => {
        if (!cancelled) setFiles(storedFiles || []);
      })
      .catch(() => {
        if (!cancelled) setFiles([]);
      });

    return () => { cancelled = true; };
  }, [projectId]);

  return files;
}
