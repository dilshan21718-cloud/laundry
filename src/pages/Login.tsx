import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";

const Login = () => {
  const [username, setUsername] = useState("");
  const [userType, setUserType] = useState("user");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }
    try {
      const res = await api.auth.login({ identifier: username, password, userType: userType as any });
      localStorage.setItem("laundrybuddy_token", res.token);
      localStorage.setItem("laundrybuddy_loggedin_type", res.user.userType);
      alert("Logged in!");
      if (res.user.userType === "admin") {
        navigate("/admin");
      } else if (res.user.userType === "staff") {
        navigate("/staff");
      } else {
        navigate("/account");
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-card rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-4">Login to Your Account</h2>
        {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block mb-1 font-medium">Account Type</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={userType}
              onChange={e => setUserType(e.target.value)}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="staff">Delivery Staff</option>
            </select>
          </div>
          <div>
            <label className="block mb-1 font-medium">User Name</label>
            <Input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your user name"
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Password</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          <Button type="submit" className="w-full mt-2">Login</Button>
        </form>
        <div className="text-center text-sm mt-4">
          Don't have an account?{' '}
          <Link to="/signup" className="text-blue-600 hover:underline">Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
