import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.jpg";

const Footer = () => {
  let navigate = useNavigate();
  return (
    <footer className="bg-black border-t border-gray-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">

          {/* Logo + Description */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src={logo} alt="Logo" className="h-9 w-9 rounded-lg object-cover" />
              <span className="text-lg font-bold text-white">Learnify</span>
            </div>
            <p className="text-sm text-gray-400 max-w-sm">
              AI-powered learning platform to help you grow smarter. Learn anything, anytime, anywhere.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="hover:text-blue-500 cursor-pointer transition" onClick={() => navigate("/")}>Home</li>
              <li className="hover:text-blue-500 cursor-pointer transition" onClick={() => navigate("/allcourses")}>Courses</li>
              <li className="hover:text-blue-500 cursor-pointer transition" onClick={() => navigate("/login")}>Login</li>
              <li className="hover:text-blue-500 cursor-pointer transition" onClick={() => navigate("/profile")}>My Profile</li>
            </ul>
          </div>

          {/* Explore Categories */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Explore Categories</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="hover:text-blue-500 transition cursor-default">Web Development</li>
              <li className="hover:text-blue-500 transition cursor-default">AI/ML</li>
              <li className="hover:text-blue-500 transition cursor-default">Data Science</li>
              <li className="hover:text-blue-500 transition cursor-default">UI/UX Design</li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-10 border-t border-gray-800 pt-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Learnify. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
