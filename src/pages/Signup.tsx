import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";

const Signup = () => {
  const [username, setUsername] = useState("");
  const [userType, setUserType] = useState("user");
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !phone || !password || !confirmPassword || (userType === "user" && !address)) {
      setError("Please fill in all fields.");
      return;
    }
    if (!/^\d{10,15}$/.test(phone)) {
      setError("Please enter a valid phone number (10-15 digits).");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    try {
      await api.auth.signup({
        username,
        email,
        phone,
        password,
        userType: userType as any,
        ...(userType === "user" && address ? { address } : {}),
      });
      alert("Successfully done");
      navigate("/login");
    } catch (err: any) {
      setError(err.message || "Signup failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-card rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-4">Create an Account</h2>
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
            <label className="block mb-1 font-medium">Email</label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Phone Number</label>
            <Input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Enter your phone number"
              required
              maxLength={15}
            />
          </div>
          {userType === "user" && (
            <div>
              <label className="block mb-1 font-medium">Address</label>
              <Input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Enter your address"
                required
              />
            </div>
          )}
          <div>
            <label className="block mb-1 font-medium">Password</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Create a password"
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Confirm Password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
            />
          </div>
          <Button type="submit" className="w-full mt-2">Sign Up</Button>
        </form>
        <div className="text-center text-sm mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">Login</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
