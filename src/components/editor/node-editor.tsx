"use client";

import { Node } from "@/types";
import { FileEditor } from "./file-editor";
import { FolderEditor } from "./folder-editor";

interface NodeEditorProps {
  node: Node;
  projectId: string;
  onNodeSelect?: (node: Node) => void;
}

export function NodeEditor({ node, projectId, onNodeSelect }: NodeEditorProps) {
  if (node.type === "FILE") {
    return <FileEditor node={node} projectId={projectId} />;
  }

  return (
    <FolderEditor
      node={node}
      projectId={projectId}
      onNodeSelect={onNodeSelect}
    />
  );
}
