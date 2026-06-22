import { useEffect, useState } from "react";
import type { Task } from "./types.ts";

interface RepoWorkspaceProps {
  data: {
    viewType: "project";
    layout?: any[];
    items: Task[];
  };
}

const RepoWorkspace = ({ data }: RepoWorkspaceProps) => {
  const { viewType, layout, items } = data;
  const [tasks, setTasks] = useState<Task[]>(items);

  useEffect(() => {
    setTasks(items);
  }, [items]);

  if (viewType === "project" && layout) {
    return (
      <div style={{ display: "flex", gap: "16px", padding: "16px" }}>
        {layout.map((column: any) => (
          <div key={column.id} style={{ flex: 1, padding: "8px", backgroundColor: "#f4f5f7", borderRadius: "4px" }}>
            <h3>{column.name}</h3>
            {tasks.map((task, idx) => (
              <div key={idx} style={{ padding: "4px", backgroundColor: "white", marginBottom: "4px", borderRadius: "2px" }}>
                {task.name}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return <div>Loading or invalid view type...</div>;
};

export default RepoWorkspace;