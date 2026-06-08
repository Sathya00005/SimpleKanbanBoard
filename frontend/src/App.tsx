import './App.css'
import Board from './Board'

function App() {
  const isLoggedIn = true

  if (!isLoggedIn) {
    return (
      <div>
        <h1>Login Page</h1>
      </div>
    )
  }

  return <Board />
}

export default App