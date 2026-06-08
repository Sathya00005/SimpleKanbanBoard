import { useState } from 'react';
import Column from './Column';
import CreateTaskModal from './CreateTaskModal';
import './Board.css';

const BOARD_COLUMNS = [
  'Backlog',
  'Scheduled',
  'Work In Progress',
  'Testing',
  'Deployed'
];

export default function Board() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateTask = (data: { name: string; description: string; testCases: string[] }) => {
    console.log('Task created payload:', data);
    setIsModalOpen(false);
    // TODO: Phase 2.4 - Connect to backend API endpoint to create task
  };

  return (
    <div className="board-container">
      <header className="board-header">
        <h1>Kanban Board</h1>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)} data-testid="btn-open-create-task">
          + Create Task
        </button>
      </header>
      <div className="kanban-board">
        {BOARD_COLUMNS.map(col => (
          <Column key={col} title={col} />
        ))}
      </div>
      <CreateTaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleCreateTask} 
      />
    </div>
  );
}