import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { extractProjectName } from "@/lib/codebaseUtils";
import { createRepositoryProject } from "@/lib/addRepositoryRuntime";

export function useAddRepository() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [repoUrl, setRepoUrl] = useState("");
  const [pastedCode, setPastedCode] = useState("");
  const [projectName, setProjectName] = useState("");
  const [importPublicRepo, setImportPublicRepo] = useState(true);
  const [importStatus, setImportStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const handleUrlChange = (value) => {
    setRepoUrl(value);
    if (!projectName) setProjectName(extractProjectName(value));
  };

  const handleCreate = async () => {
    setSaving(true);
    setImportStatus("");

    try {
      const project = await createRepositoryProject({
        repoUrl,
        pastedCode,
        projectName,
        importPublicRepo,
        setImportStatus,
        onUrlOnlyImport: () => toast({
          title: "Repository saved without file import",
          description: "This repository is private or inaccessible through public GitHub import. The project was created as URL-only until GitHub App/private access is enabled.",
        }),
      });
      navigate(`/project/${project.id}`);
    } catch (error) {
      toast({
        title: "Failed to create project",
        description: error?.message || "Public GitHub import failed. You can uncheck import and store the URL only.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setImportStatus("");
    }
  };

  return {
    repoUrl,
    handleUrlChange,
    pastedCode,
    setPastedCode,
    projectName,
    setProjectName,
    importPublicRepo,
    setImportPublicRepo,
    importStatus,
    saving,
    handleCreate,
  };
}
