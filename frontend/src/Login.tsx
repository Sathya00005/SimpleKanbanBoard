import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

type Props = {
    setIsLoggedIn: (value: boolean) => void;
};

const Login = ({ setIsLoggedIn }: Props) => {
    const [formData, setFormData] = useState({
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

        const response = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            setIsLoggedIn(true);
            navigate('/');
        } else {
            const data = await response.json();
            alert(data.error || 'Login failed');
        }
    };

    return (
        <div className="auth-container">
            <h2>Login</h2>

            <form onSubmit={handleSubmit} className="auth-form">
                <input name="email" placeholder="Email" onChange={handleChange} />
                <input name="password" type="password" placeholder="Password" onChange={handleChange} />

                <button type="submit">Login</button>
            </form>

            <p className="switch" onClick={() => navigate('/signup')}>
                Create new account
            </p>
        </div>
    );
};

export default Login;