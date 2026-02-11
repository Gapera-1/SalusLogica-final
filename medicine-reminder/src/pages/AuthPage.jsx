import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";

import LoginForm from "../components/LoginForm";
import SignupForm from "../components/SignupForm";

function AuthPage({ setIsAuthenticated }) {
  const navigate = useNavigate();

  const [isSignup, setIsSignup] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ✅ LOGIN
  const handleLogin = (e) => {
    e.preventDefault();

    const savedUser = JSON.parse(localStorage.getItem("user"));

    if (!savedUser) {
      setError("No account found. Please sign up first.");
      return;
    }

    if (savedUser.username === username && savedUser.password === password) {
      localStorage.setItem("loggedIn", "true");
      setIsAuthenticated(true);
      navigate("/app"); // ✅ Smooth navigation
    } else {
      setError("Invalid username or password");
      setSuccess("");
    }
  };

  // ✅ SIGNUP
  const handleSignup = (e) => {
    e.preventDefault();

    if (!username || !password || !confirmPassword) {
      setError("All fields are required");
      setSuccess("");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setSuccess("");
      return;
    }

    localStorage.setItem(
      "user",
      JSON.stringify({ username, password })
    );

    setSuccess("Signup successful! You can now log in.");
    setError("");

    setTimeout(() => {
      setSuccess("");
      setIsSignup(false);
    }, 2000);
  };

  return (
   <div
  className="fixed inset-0 flex justify-center items-center min-h-screen bg-cover bg-center bg-no-repeat"
  style={{
    backgroundImage: "url('/images/Login_background.jpg')"  // use your real extension
  }}
>

      <div className={`auth-container ${isSignup ? "active" : ""}`}>
        
        <div className="form-box login">
          <LoginForm
            username={username}
            password={password}
            error={error}
            setUsername={setUsername}
            setPassword={setPassword}
            handleLogin={handleLogin}
            setIsSignup={setIsSignup}
          />
        </div>

        <div className="form-box signup">
          <SignupForm
            username={username}
            password={password}
            confirmPassword={confirmPassword}
            error={error}
            success={success}
            setUsername={setUsername}
            setPassword={setPassword}
            setConfirmPassword={setConfirmPassword}
            handleSignup={handleSignup}
            setIsSignup={setIsSignup}
          />
        </div>

      </div>
    </div>
  );
}

export default AuthPage;