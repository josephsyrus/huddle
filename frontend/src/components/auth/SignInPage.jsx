import React, { useState } from "react";
import api from "../../api";
import PasswordInput from "../ui/PasswordInput";

const SignInPage = ({ onLogin, onSwitchToSignUp }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }
    try {
      const response = await api.post("/users/signin", { username, password });
      localStorage.setItem("token", response.data.token);
      onLogin();
    } catch (err) {
      setError(
        err.response?.data?.message || "Sign in failed. Please try again."
      );
    }
  };

  return (
    <div className="popup-box">
      <h1 className="popup-title">Sign In to Huddle</h1>
      {error && <p className="auth-error">{error}</p>}{" "}
      <form onSubmit={handleSubmit} className="popup-form">
        <div className="input-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
          />
        </div>
        <div className="input-group">
          <label htmlFor="password">Password</label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
        </div>
        <button type="submit" className="popup-button">
          Sign In
        </button>
      </form>
      <p className="auth-switch-text">
        Don't have an account?{" "}
        <span className="auth-switch-link" onClick={onSwitchToSignUp}>
          Sign Up
        </span>
      </p>
    </div>
  );
};

export default SignInPage;
