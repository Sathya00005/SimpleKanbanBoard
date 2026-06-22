import { useState, useEffect, useRef } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

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

type Props = {
  setIsLoggedIn: (value: boolean) => void;
};

export default function SignUp({ setIsLoggedIn }: Props) {
  const navigate = useNavigate();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [signupEmail, setSignupEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");
    setStatusMessage("");
    setIsSubmitting(true);

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match");
      setIsSubmitting(false);
      return;
    }

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
        setErrorMessage(data.error || "Signup failed");
        return;
      }

      setSignupEmail(formData.email);
      setIsVerifying(true);
      setVerificationCode("");
      setStatusMessage("Verification code sent to your email. Enter it below to complete signup.");
      setFormData({ ...formData, password: "", confirmPassword: "" });
    } catch (error) {
      console.error(error);
      setErrorMessage("Unable to connect to server");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formIsValid =
    formData.username.trim().length > 0 &&
    formData.email.trim().length > 0 &&
    isStrongPassword(formData.password) &&
    formData.password === formData.confirmPassword;

  const verificationFormIsValid = signupEmail.trim().length > 0 && /^\d{6}$/.test(verificationCode);

  const handleVerifySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");
    setStatusMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: signupEmail,
          signupVerificationCode: verificationCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Verification failed");
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
      {isVerifying ? (
        <form className="auth-form" onSubmit={handleVerifySubmit}>
          <h2>Verify Signup</h2>

          {errorMessage && <div className="auth-alert auth-alert-error">{errorMessage}</div>}
          {statusMessage && <div className="auth-alert auth-alert-success">{statusMessage}</div>}

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={signupEmail}
            readOnly
            autoComplete="email"
            required
          />

          <input
            type="text"
            name="verificationCode"
            placeholder="6-digit verification code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
          />

          <button type="submit" disabled={!verificationFormIsValid || isSubmitting}>
            {isSubmitting ? "Verifying..." : "Verify Account"}
          </button>

          <button
            type="button"
            className="switch"
            onClick={() => {
              setIsVerifying(false);
              setVerificationCode("");
              setErrorMessage("");
              setStatusMessage("");
            }}
          >
            Back to Signup
          </button>
        </form>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Sign Up</h2>

          {errorMessage && errorMessage !== "Gmail account does not exist" && (
            <div className="auth-alert auth-alert-error">{errorMessage}</div>
          )}
          {statusMessage && <div className="auth-alert auth-alert-success">{statusMessage}</div>}

          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            autoComplete="username"
            required
          />

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          autoComplete="email"
          required
        />

        {errorMessage === "Gmail account does not exist" && (
          <div className="auth-alert auth-alert-error">Gmail account does not exist.</div>
        )}

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          autoComplete="new-password"
          required
        />

        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChange={handleChange}
          autoComplete="new-password"
          required
        />

        <PasswordChecklist password={formData.password} />

        <div ref={googleButtonRef} className="google-button-container" />

        <button type="submit" disabled={!formIsValid || isSubmitting}>
          {isSubmitting ? "Creating account..." : "Sign Up"}
        </button>

        <button type="button" className="switch" onClick={() => navigate("/login")}> 
          Already have an account? Login
        </button>
        </form>
      )}
    </div>
  );
}
