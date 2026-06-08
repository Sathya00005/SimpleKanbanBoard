import { Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import SignUp from './SignUp';
import Login from './Login';
import Board from './Board';
import './App.css';

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    return (
        <Routes>
            {/* Main board protected */}
            <Route
                path="/"
                element={
                    isLoggedIn ? (
                        <Board setIsLoggedIn={setIsLoggedIn} />
                    ) : (
                        <Navigate to="/login" />
                    )
                }
            />

            {/* Signup → always goes to login after success */}
            <Route
                path="/signup"
                element={<SignUp />}
            />

            {/* Login → sets isLoggedIn */}
            <Route
                path="/login"
                element={<Login setIsLoggedIn={setIsLoggedIn} />}
            />
        </Routes>
    );
}

export default App;