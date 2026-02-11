import React from "react";

function SignupForm({
  username,
  password,
  confirmPassword,
  error,
  success,
  setUsername,
  setPassword,
  setConfirmPassword,
  handleSignup,
  setIsSignup,
}) {
  return (
    <form onSubmit={handleSignup} className="flex flex-col gap-3 p-6 bg-white bg-opacity-90  rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-2 text-center">Sign Up</h2>

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

      <input
        type="password"
        placeholder="Confirm Password"
        className="border px-3 py-2 rounded"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />

      {error && <div className="text-red-500 text-sm">{error}</div>}
      {success && <div className="text-green-500 text-sm">{success}</div>}

      <button
        type="submit"
        className="bg-green-500 text-white py-2 rounded hover:bg-green-600 transition"
      >
        Sign Up
      </button>

      <p className="text-sm text-center mt-2">
        Already have an account?{" "}
        <button
          type="button"
          className="text-blue-600 hover:underline"
          onClick={() => setIsSignup(false)}
        >
          Log In
        </button>
      </p>
    </form>
  );
}

export default SignupForm;