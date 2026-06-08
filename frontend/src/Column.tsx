import './Column.css';

interface ColumnProps {
  title: string;
}

export default function Column({ title }: ColumnProps) {
  // Convert title to a safe test id, e.g., "Work In Progress" -> "work-in-progress"
  const testId = `column-${title.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="kanban-column" data-testid={testId}>
      <h3 className="column-title">{title}</h3>
      <div className="column-content">
        {/* Future Task Cards will be rendered here */}
      </div>
    </div>
  );
}
