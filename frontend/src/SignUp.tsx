import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const SignUp = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });

    const navigate = useNavigate();

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const response = await fetch('http://localhost:3001/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            // 👉 IMPORTANT: go to login ONLY
            navigate('/login');
        } else {
            const data = await response.json();
            alert(data.error || 'Signup failed');
        }
    };

    return (
        <div className="auth-container">
            <h2>Sign Up</h2>

            <form onSubmit={handleSubmit} className="auth-form">
                <input name="username" placeholder="Username" onChange={handleChange} />
                <input name="email" placeholder="Email" onChange={handleChange} />
                <input name="password" type="password" placeholder="Password" onChange={handleChange} />

                <button type="submit">Sign Up</button>
            </form>

            <p className="switch" onClick={() => navigate('/login')}>
                Already have an account? Login
            </p>
        </div>
    );
};

export default SignUp;