import React from "react";

function LoginForm({
  username,
  password,
  error,
  setUsername,
  setPassword,
  handleLogin,
  setIsSignup,
}) {
  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-3 p-6 bg-white bg-opacity-90  rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-2 text-center">Login</h2>

      <input
        type="text"
        placeholder="Username"
        className="border px-3 py-2 rounded"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        className="border px-3 py-2 rounded"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <div className="text-red-500 text-sm">{error}</div>}

      <button
        type="submit"
        className="bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
      >
        Log In
      </button>

      <p className="text-sm text-center mt-2">
        Don't have an account?{" "}
        <button
          type="button"
          className="text-green-600 hover:underline"
          onClick={() => setIsSignup(true)}
        >
          Sign Up
        </button>
      </p>
    </form>
  );
}

export default LoginForm;