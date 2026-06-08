import './Column.css';
import TaskCard from './TaskCard';
import type { Task } from './types';

interface ColumnProps {
  title: string;
  tasks: Task[];
}

export default function Column({ title, tasks }: ColumnProps) {
  // Convert title to a safe test id, e.g., "Work In Progress" -> "work-in-progress"
  const testId = `column-${title.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="kanban-column" data-testid={testId}>
      <h3 className="column-title">{title}</h3>
      <ul className="kanban-card-list">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </ul>
    </div>
  );
}
