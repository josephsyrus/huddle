import React, { useState } from "react";
import api from "../../api";
import PasswordInput from "../ui/PasswordInput";
const SignUpPage = ({ onLogin, onSwitchToSignIn }) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    try {
      const response = await api.post("/users/signup", {
        username,
        email,
        password,
      });
      localStorage.setItem("token", response.data.token);
      onLogin();
    } catch (err) {
      setError(
        err.response?.data?.message || "Sign up failed. Please try again."
      );
    }
  };

  return (
    <div className="popup-box">
      <h1 className="popup-title">Create an Account</h1>
      {error && <p className="auth-error">{error}</p>}
      <form onSubmit={handleSubmit} className="popup-form">
        <div className="input-group">
          <label htmlFor="username-signup">Username</label>
          <input
            id="username-signup"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
          />
        </div>
        <div className="input-group">
          <label htmlFor="email-signup">Email Address</label>
          <input
            id="email-signup"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
          />
        </div>
        <div className="input-group">
          <label htmlFor="password-signup">Password</label>
          <PasswordInput
            id="password-signup"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
          />
        </div>
        <div className="input-group">
          <label htmlFor="confirm-password-signup">Confirm Password</label>
          <PasswordInput
            id="confirm-password-signup"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
          />
        </div>
        <button type="submit" className="popup-button">
          Sign Up
        </button>
      </form>
      <p className="auth-switch-text">
        Already have an account?{" "}
        <span className="auth-switch-link" onClick={onSwitchToSignIn}>
          Sign In
        </span>
      </p>
    </div>
  );
};

export default SignUpPage;
