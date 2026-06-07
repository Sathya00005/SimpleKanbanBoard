import Column from './Column';
import './Board.css';

const BOARD_COLUMNS = [
  'Backlog',
  'Scheduled',
  'Work In Progress',
  'Testing',
  'Deployed'
];

export default function Board() {
  return (
    <div className="kanban-board">
      {BOARD_COLUMNS.map(col => (
        <Column key={col} title={col} />
      ))}
    </div>
  );
}