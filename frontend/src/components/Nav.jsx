import React, { useState } from 'react'
import logo from '../assets/learnify.jpeg';
import { IoMdPerson } from "react-icons/io";
import { HiMenu, HiX } from "react-icons/hi";
import { MdSpaceDashboard, MdDarkMode, MdLightMode } from "react-icons/md";
import { FaBookOpen, FaCrown } from "react-icons/fa";

import { useNavigate, useLocation } from 'react-router-dom';
import { serverUrl } from '../App';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import { setUserData } from '../redux/userSlice';
import { useTheme } from '../context/ThemeContext';

function Nav() {
  let [showHam, setShowHam] = useState(false)
  let [showPro, setShowPro] = useState(false)
  let navigate = useNavigate()
  let location = useLocation()
  let dispatch = useDispatch()
  let { userData } = useSelector(state => state.user)
  const { isDark, toggleTheme } = useTheme()

  const navLinks = [
    { label: "Home", path: "/" },
    { label: "Courses", path: "/allcourses" },
    { label: "Ask AI", path: "/searchwithai" },
  ]

  const isActive = (path) => location.pathname === path

  const handleLogout = async () => {
    try {
      const result = await axios.get(serverUrl + "/api/auth/logout", { withCredentials: true })
      await dispatch(setUserData(null))
      toast.success("LogOut Successfully")
      navigate("/login");
    } catch (error) {
      console.log(error.response?.data?.message)
    }
  }

  return (
    <nav className='sticky top-0 z-50 w-full border-b border-slate-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md'>

      <div className='mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8'>

        {/* Logo */}
        <div
          className='flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white cursor-pointer'
          onClick={() => navigate("/")}
        >
          <img
            src={logo}
            className='h-9 w-9 rounded-xl object-cover'
            alt="logo"
          />
          <span>Learnify</span>
        </div>

        {/* Desktop Navigation */}
        <div className='hidden items-center gap-8 md:flex'>
          {navLinks.map((link) => (
            <span
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`text-sm font-medium transition cursor-pointer ${isActive(link.path)
                  ? 'text-blue-600'
                  : 'text-slate-600 dark:text-gray-300 hover:text-blue-600'
                }`}
            >
              {link.label}
            </span>
          ))}
        </div>

        {/* Desktop Right side */}
        <div className='hidden items-center gap-3 md:flex'>

          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            className='flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition'
            title="Toggle dark mode"
          >
            {isDark ? <MdLightMode className='text-yellow-400' /> : <MdDarkMode />}
          </button>

          {userData?.role === "educator" &&
            <button
              className='flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700'
              onClick={() => navigate("/dashboard")}
            >
              <MdSpaceDashboard /> Dashboard
            </button>
          }

          {userData?.role === "student" &&
            <button
              className='flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700'
              onClick={() => navigate("/student-dashboard")}
            >
              <MdSpaceDashboard /> Dashboard
            </button>
          }

          {userData?.role === "admin" &&
            <button
              className='flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-300'
              onClick={() => navigate("/admin")}
            >
              <FaCrown /> Admin
            </button>
          }

          {!userData &&
            <>
              <span
                className='text-sm font-semibold text-slate-700 dark:text-gray-300 hover:text-blue-600 cursor-pointer'
                onClick={() => navigate("/login")}
              >
                Login
              </span>
              <span
                className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 cursor-pointer'
                onClick={() => navigate("/signup")}
              >
                Sign Up
              </span>
            </>
          }

          {/* PROFILE ICON */}
          {userData &&
            <div className='relative'>
              <div
                className='flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 dark:bg-gray-800 text-sm font-bold text-blue-600 dark:text-blue-400 cursor-pointer overflow-hidden border border-slate-200 dark:border-gray-700'
                onClick={() => setShowPro(prev => !prev)}
              >
                {userData.photoUrl
                  ? <img src={userData.photoUrl} className='h-full w-full object-cover' alt="" />
                  : userData?.name?.slice(0, 1).toUpperCase()}
              </div>

              {showPro && (
                <div className='absolute right-0 top-[130%] flex min-w-[180px] flex-col gap-1 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-2 text-sm shadow-xl'>
                  <span
                    className='flex items-center gap-2 rounded-lg px-3 py-2 text-slate-700 dark:text-gray-200 transition hover:bg-slate-100 dark:hover:bg-gray-800 cursor-pointer'
                    onClick={() => { navigate("/profile"); setShowPro(false) }}>
                    <IoMdPerson /> My Profile
                  </span>
                  <span
                    className='flex items-center gap-2 rounded-lg px-3 py-2 text-slate-700 dark:text-gray-200 transition hover:bg-slate-100 dark:hover:bg-gray-800 cursor-pointer'
                    onClick={() => { navigate("/enrolledcourses"); setShowPro(false) }}>
                    <FaBookOpen /> My Courses
                  </span>
                  <hr className='my-1 border-slate-200 dark:border-gray-700' />
                  <span
                    className='rounded-lg bg-slate-900 dark:bg-blue-600 px-3 py-2 text-center font-semibold text-white transition hover:bg-slate-800 dark:hover:bg-blue-700 cursor-pointer'
                    onClick={handleLogout}>
                    Logout
                  </span>
                </div>
              )}
            </div>
          }
        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          onClick={() => setShowHam(prev => !prev)}
          className='rounded-lg p-2 text-slate-700 dark:text-gray-200 md:hidden'
        >
          {showHam ? <HiX size={24} /> : <HiMenu size={24} />}
        </button>
      </div>

      {/* MOBILE MENU */}
      {showHam && (
        <div className='border-t border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-4 md:hidden'>
          <div className='flex flex-col gap-4'>

            {navLinks.map(link => (
              <span
                key={link.path}
                className={`text-sm font-medium cursor-pointer ${isActive(link.path) ? 'text-blue-600' : 'text-slate-600 dark:text-gray-300'}`}
                onClick={() => { navigate(link.path); setShowHam(false) }}>
                {link.label}
              </span>
            ))}

            <button
              onClick={toggleTheme}
              className='flex w-fit items-center gap-2 rounded-lg border border-slate-200 dark:border-gray-700 px-3 py-2 text-sm text-slate-600 dark:text-gray-300'
            >
              {isDark ? <MdLightMode className='text-yellow-400' /> : <MdDarkMode />}
              {isDark ? "Light Mode" : "Dark Mode"}
            </button>

            <hr className='border-slate-200 dark:border-gray-800' />

            {userData &&
              <span
                className='flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-gray-200 cursor-pointer'
                onClick={() => { navigate("/profile"); setShowHam(false) }}>
                <IoMdPerson /> My Profile
              </span>
            }

            {userData &&
              <span
                className='flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-gray-200 cursor-pointer'
                onClick={() => { navigate("/enrolledcourses"); setShowHam(false) }}>
                <FaBookOpen /> My Courses
              </span>
            }

            {userData?.role === "educator" &&
              <span
                className='flex items-center gap-2 text-sm font-semibold text-blue-600 cursor-pointer'
                onClick={() => { navigate("/dashboard"); setShowHam(false) }}>
                <MdSpaceDashboard /> Dashboard
              </span>
            }

            {userData?.role === "student" &&
              <span
                className='flex items-center gap-2 text-sm font-semibold text-blue-600 cursor-pointer'
                onClick={() => { navigate("/student-dashboard"); setShowHam(false) }}>
                <MdSpaceDashboard /> Dashboard
              </span>
            }

            {userData?.role === "admin" &&
              <span
                className='flex items-center gap-2 text-sm font-semibold text-amber-600 cursor-pointer'
                onClick={() => { navigate("/admin"); setShowHam(false) }}>
                <FaCrown /> Admin Panel
              </span>
            }

            {!userData
              ? (
                <div className='flex flex-col gap-3'>
                  <span
                    className='text-sm font-semibold text-slate-700 dark:text-gray-200 cursor-pointer'
                    onClick={() => { navigate("/login"); setShowHam(false) }}>
                    Login
                  </span>
                  <span
                    className='rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white cursor-pointer'
                    onClick={() => { navigate("/signup"); setShowHam(false) }}>
                    Sign Up
                  </span>
                </div>
              )
              : (
                <span
                  className='rounded-lg bg-red-50 dark:bg-red-950/40 px-4 py-2 text-center text-sm font-semibold text-red-500 cursor-pointer'
                  onClick={handleLogout}>
                  Logout
                </span>
              )
            }
          </div>
        </div>
      )}
    </nav>
  )
}

export default Nav
