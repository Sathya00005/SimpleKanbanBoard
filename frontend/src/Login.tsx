import { useState, useEffect, useRef } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

type Props = {
  setIsLoggedIn: (value: boolean) => void;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

const PASSWORD_RULES = [
  { key: "length", label: "8 characters", test: (value: string) => value.length >= 8 },
  { key: "uppercase", label: "Uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { key: "lowercase", label: "Lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { key: "number", label: "Number", test: (value: string) => /\d/.test(value) },
  {
    key: "symbol",
    label: "Special symbol",
    test: (value: string) => /[@#$!%*?&^()[\]{}+\-_=~`|:;"'<>,./\\]/.test(value),
  },
];

const isStrongPassword = (password: string) => PASSWORD_RULES.every((rule) => rule.test(password));

function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul className="password-checklist" aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const isMet = rule.test(password);

        return (
          <li key={rule.key} className={isMet ? "met" : ""}>
            <span aria-hidden="true">{isMet ? "✓" : "○"}</span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

export default function Login({ setIsLoggedIn }: Props) {
  const navigate = useNavigate();

  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [resetData, setResetData] = useState({
    email: "",
    code: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isResetting, setIsResetting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestingCode, setIsRequestingCode] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleResetChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setResetData({
      ...resetData,
      [name]: name === "code" ? value.replace(/\D/g, "").slice(0, 6) : value,
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");
    setStatusMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Login failed");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("username", data.username);

      setIsLoggedIn(true);
      navigate("/");
    } catch (error) {
      console.error(error);
      setErrorMessage("Unable to connect to server");
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestResetCode = async () => {
    setErrorMessage("");
    setStatusMessage("");
    setIsRequestingCode(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: resetData.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Unable to generate reset code");
        return;
      }

      setStatusMessage(data.message || "Verification code generated");
    } catch (error) {
      console.error(error);
      setErrorMessage("Unable to connect to server");
    } finally {
      setIsRequestingCode(false);
    }
  };

  const handleResetSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");
    setStatusMessage("");

    if (resetData.newPassword !== resetData.confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: resetData.email,
          resetCode: resetData.code,
          newPassword: resetData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Password reset failed");
        return;
      }

      setStatusMessage("Password reset successful. You can sign in now.");
      setFormData({ email: resetData.email, password: "" });
      setResetData({ email: "", code: "", newPassword: "", confirmPassword: "" });
      setIsResetting(false);
    } catch (error) {
      console.error(error);
      setErrorMessage("Unable to connect to server");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFormIsValid =
    resetData.email.trim().length > 0 &&
    /^\d{6}$/.test(resetData.code) &&
    isStrongPassword(resetData.newPassword) &&
    resetData.newPassword === resetData.confirmPassword;

  const handleGoogleLogin = async (idToken: string) => {
    setErrorMessage("");
    setStatusMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/google-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Google login failed");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("username", data.username);
      setIsLoggedIn(true);
      navigate("/");
    } catch (error) {
      console.error(error);
      setErrorMessage("Unable to connect to server");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleCredentialResponse = (response: any) => {
    const credential = response?.credential;
    if (!credential) {
      setErrorMessage("Google login failed");
      return;
    }
    handleGoogleLogin(credential);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("sessionExpired") === "true") {
      setErrorMessage("Your session has expired. Please log in again.");
      params.delete("sessionExpired");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!googleClientId) return;

    const initialize = () => {
      const google = (window as any).google;
      if (!google || !googleButtonRef.current) return;

      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredentialResponse,
      });

      google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        width: "100%",
      });
    };

    if ((window as any).google) {
      initialize();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initialize;
    document.body.appendChild(script);
  }, [googleClientId]);

  return (
    <div className="auth-container">
      {isResetting ? (
        <form className="auth-form" onSubmit={handleResetSubmit}>
          <h2>Reset Password</h2>

          {errorMessage && <div className="auth-alert auth-alert-error">{errorMessage}</div>}
          {statusMessage && <div className="auth-alert auth-alert-success">{statusMessage}</div>}

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={resetData.email}
            onChange={handleResetChange}
            autoComplete="email"
            required
          />

          <button
            type="button"
            className="secondary-action"
            onClick={requestResetCode}
            disabled={!resetData.email.trim() || isRequestingCode}
          >
            {isRequestingCode ? "Requesting code..." : "Request Code"}
          </button>

          <input
            type="text"
            name="code"
            placeholder="6-digit code"
            value={resetData.code}
            onChange={handleResetChange}
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
          />

          <input
            type="password"
            name="newPassword"
            placeholder="New password"
            value={resetData.newPassword}
            onChange={handleResetChange}
            autoComplete="new-password"
            required
          />

          <PasswordChecklist password={resetData.newPassword} />

          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm new password"
            value={resetData.confirmPassword}
            onChange={handleResetChange}
            autoComplete="new-password"
            required
          />

          <button type="submit" disabled={!resetFormIsValid || isSubmitting}>
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </button>

          <button
            type="button"
            className="switch"
            onClick={() => {
              setIsResetting(false);
              setErrorMessage("");
              setStatusMessage("");
            }}
          >
            Back to Login
          </button>
        </form>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Login</h2>

          {errorMessage && <div className="auth-alert auth-alert-error">{errorMessage}</div>}
          {statusMessage && <div className="auth-alert auth-alert-success">{statusMessage}</div>}

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="current-password"
            required
          />

          <div ref={googleButtonRef} className="google-button-container" />

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Login"}
          </button>

          <button
            type="button"
            className="switch"
            onClick={() => {
              setIsResetting(true);
              setResetData({ ...resetData, email: formData.email });
              setErrorMessage("");
              setStatusMessage("");
            }}
          >
            Forgot Password?
          </button>

          <button type="button" className="switch" onClick={() => navigate("/signup")}>
            Create new account
          </button>
        </form>
      )}
    </div>
  );
}
