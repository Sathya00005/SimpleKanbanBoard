import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css"; // Uses the shared authentication style layouts cleanly

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export default function SignUp() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Signup failed");
        return;
      }

      alert("Account created successfully");
      navigate("/login");
    } catch (error) {
      console.error(error);
      alert("Unable to connect to server");
    }
  };

  return (
    <div className="auth-container">
      {/* ✅ Heading and redirect links are tucked inside the form.
        Your existing flexbox column properties will automatically layer them one below another.
      */}
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Sign Up</h2>

        <input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <button type="submit">Sign Up</button>

        <p className="switch" onClick={() => navigate("/login")}>
          Already have an account? Login
        </p>
      </form>
    </div>
  );
}