import './App.css'

function App() {
  return (
    <div className="app-container" style={{ backgroundColor: 'var(--color-bg-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="app-header" style={{ padding: '24px 48px', backgroundColor: 'var(--color-surface-white)', borderBottom: '1px solid var(--color-border)' }}>
        <h1 style={{ color: 'var(--color-text-primary)', margin: 0, fontSize: '36px', fontWeight: 600 }}>Simple Kanban</h1>
      </header>
      <main className="board-container" style={{ flex: 1, padding: '48px', overflowX: 'auto' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Kanban board initialized. Awaiting column implementation...</p>
      </main>
    </div>
  )
}

export default App
