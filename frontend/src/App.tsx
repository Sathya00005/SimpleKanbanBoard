import './App.css'

function App() {
  const isLoggedIn = true

  const COLUMNS = [
    'Backlog',
    'Scheduled',
    'Work In Progress',
    'Testing',
    'Deployed'
  ]

  if (!isLoggedIn) {
    return (
      <div
        className="app-container"
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <h1>Login Page</h1>
      </div>
    )
  }

  return (
    <div
      className="app-container"
      style={{
        backgroundColor: 'var(--color-bg-primary)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <header
        className="app-header"
        style={{
          padding: '24px 48px',
          backgroundColor: 'var(--color-surface-white)',
          borderBottom: '1px solid var(--color-border)'
        }}
      >
        <h1
          style={{
            color: 'var(--color-text-primary)',
            margin: 0,
            fontSize: '36px',
            fontWeight: 600
          }}
        >
          Simple Kanban
        </h1>
      </header>

      <main
        className="board-container"
        style={{
          flex: 1,
          padding: '48px',
          overflowX: 'auto',
          display: 'flex',
          gap: '24px',
          alignItems: 'flex-start'
        }}
      >
        {COLUMNS.map((column) => (
          <div
            key={column}
            data-testid={`column-${column
              .toLowerCase()
              .replace(/\s+/g, '-')}`}
            style={{
              flex: '0 0 320px',
              backgroundColor: '#F3F4F6',
              borderRadius: '16px',
              padding: '24px',
              minHeight: '65vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h2
                className="column-title"
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                {column}
              </h2>

              <span
                style={{
                  backgroundColor: '#E5E7EB',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)'
                }}
              >
                0
              </span>
            </div>

            <div
              className="task-list"
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'transparent',
                  borderRadius: '12px',
                  color: '#9CA3AF',
                  fontSize: '14px',
                  textAlign: 'center',
                  border: '2px dashed #D1D5DB'
                }}
              >
                Drop tasks here
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}

export default App