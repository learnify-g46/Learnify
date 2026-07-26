import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.jpg"; // replace with actual path

const Footer = () => {
  let navigate = useNavigate();
  return (
    <footer className="bg-black text-gray-300 py-10 px-6">
      <div className="max-w-7xl mx-auto flex lg:items-center items-start justify-center gap-[40px] lg:gap-[150px] flex-col lg:flex-row">

        {/* Logo + Description */}
        <div className="lg:w-[40%] md:w-[50%] w-[100%]">
          <img src={logo} alt="Logo" className="h-10 mb-3 border-1 rounded-[5px]" />
          <h2 className="text-xl font-bold text-white mb-3">Virtual Courses</h2>
          <p className="text-sm">
            AI-powered learning platform to help you grow smarter. Learn anything, anytime, anywhere.
          </p>
        </div>

        {/* Quick Links */}
        <div className="lg:w-[30%] md:w-[100%]">
          <h3 className="text-white font-semibold mb-2">Quick Links</h3>
          <ul className="space-y-1 text-sm">
            <li className="hover:text-white cursor-pointer" onClick={() => navigate("/")}>Home</li>
            <li className="hover:text-white cursor-pointer" onClick={() => navigate("/allcourses")}>Courses</li>
            <li className="hover:text-white cursor-pointer" onClick={() => navigate("/login")}>Login</li>
            <li className="hover:text-white cursor-pointer" onClick={() => navigate("/profile")}>My Profile</li>
          </ul>
        </div>

        {/* Explore Categories */}
        <div className="lg:w-[30%] md:w-[100%]">
          <h3 className="text-white font-semibold mb-2">Explore Categories</h3>
          <ul className="space-y-1 text-sm">
            <li className="hover:text-white">Web Development</li>
            <li className="hover:text-white">AI/ML</li>
            <li className="hover:text-white">Data Science</li>
            <li className="hover:text-white">UI/UX Design</li>
          </ul>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-700 mt-10 pt-5 text-sm text-center text-gray-500">
        © {new Date().getFullYear()} LearnAI. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
