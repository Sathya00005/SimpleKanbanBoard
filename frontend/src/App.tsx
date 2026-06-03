import { useState } from 'react'
import './App.css'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  
  const COLUMNS = ['Backlog', 'Scheduled', 'Work In Progress', 'Testing', 'Deployed']

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      if (response.ok) {
        setIsLoggedIn(true)
        setError('')
      } else {
        const data = await response.json()
        setError(data.error || 'Invalid credentials')
      }
    } catch (err) {
      setError('Network error. Please try again later.')
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="app-container" style={{ backgroundColor: 'var(--color-bg-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ backgroundColor: 'var(--color-surface-white)', padding: '48px', borderRadius: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <h1 style={{ color: 'var(--color-text-primary)', margin: '0 0 24px 0', fontSize: '28px', fontWeight: 600, textAlign: 'center' }}>Welcome to Kanban</h1>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && <div style={{ color: '#DC2626', fontSize: '14px', textAlign: 'center', backgroundColor: '#FEE2E2', padding: '8px', borderRadius: '8px' }}>{error}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: '#F9FAFB', fontSize: '16px', color: 'var(--color-text-primary)' }} required />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: '#F9FAFB', fontSize: '16px', color: 'var(--color-text-primary)' }} required />
            </div>
            <button type="submit" style={{ marginTop: '16px', padding: '16px 24px', borderRadius: '9999px', backgroundColor: 'var(--color-surface-dark)', color: 'var(--color-text-inverse)', fontWeight: 500, border: 'none', cursor: 'pointer', fontSize: '16px' }}>Log In</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container" style={{ backgroundColor: 'var(--color-bg-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="app-header" style={{ padding: '24px 48px', backgroundColor: 'var(--color-surface-white)', borderBottom: '1px solid var(--color-border)' }}>
        <h1 style={{ color: 'var(--color-text-primary)', margin: 0, fontSize: '36px', fontWeight: 600 }}>Simple Kanban</h1>
      </header>
      <main className="board-container" style={{ flex: 1, padding: '48px', overflowX: 'auto', display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {COLUMNS.map(column => (
          <div key={column} style={{ flex: '0 0 320px', backgroundColor: '#F3F4F6', borderRadius: '16px', padding: '24px', minHeight: '65vh', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{column}</h2>
              <span style={{ backgroundColor: '#E5E7EB', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>0</span>
            </div>
            
            <div className="task-list" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
               {/* Task cards will be injected here */}
               <div style={{ padding: '16px', backgroundColor: 'transparent', borderRadius: '12px', color: '#9CA3AF', fontSize: '14px', textAlign: 'center', border: '2px dashed #D1D5DB' }}>Drop tasks here</div>
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}

export default App
