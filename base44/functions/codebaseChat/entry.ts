import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { project_id, user_question } = await req.json();
    if (!project_id || !user_question) {
      return Response.json({ error: 'Missing project_id or user_question' }, { status: 400 });
    }

    // Load project
    const projects = await base44.entities.CodebaseProject.filter({ id: project_id });
    const project = projects[0];
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // Load files (limit to keep context small)
    const files = await base44.entities.CodeFile.filter({ project_id }, 'path', 20);

    // Build context
    let context = `Project: ${project.name}\n`;
    if (project.repository_url) context += `Repository: ${project.repository_url}\n`;
    if (project.summary) context += `Summary: ${project.summary}\n`;
    if (project.detected_stack?.length) context += `Stack: ${project.detected_stack.join(', ')}\n`;

    context += `\n--- Files ---\n`;
    let totalChars = context.length;
    const maxContextChars = 8000;

    for (const file of files) {
      const fileHeader = `\nFile: ${file.path} (${file.language || 'unknown'})\n`;
      const fileContent = file.summary || file.content || '';
      const section = fileHeader + fileContent.substring(0, 2000) + '\n';

      if (totalChars + section.length > maxContextChars) {
        context += `\n... (${files.length - files.indexOf(file)} more files not included due to context limit)\n`;
        break;
      }
      context += section;
      totalChars += section.length;
    }

    const prompt = `You are a senior software engineer assistant. Answer questions about the following codebase based ONLY on the provided context. If you don't have enough information to answer fully, say so clearly.

${context}

User question: ${user_question}

Provide a concise, technical answer. Use markdown formatting for code snippets. If the context is incomplete, mention what additional information would help.`;

    const answer = await base44.integrations.Core.InvokeLLM({ prompt });

    return Response.json({ answer });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});