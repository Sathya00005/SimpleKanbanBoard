import { Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";

import Login from "./Login";
import SignUp from "./SignUp";
import Board from "./Board";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("userId")
  );

  return (
    <Routes>
      <Route
        path="/login"
        element={<Login setIsLoggedIn={setIsLoggedIn} />}
      />

      <Route
        path="/signup"
        element={<SignUp setIsLoggedIn={setIsLoggedIn} />}
      />

      <Route
        path="/"
        element={
          isLoggedIn
            ? <Board setIsLoggedIn={setIsLoggedIn} />
            : <Navigate to="/login" />
        }
      />
    </Routes>
  );
}

export default App;