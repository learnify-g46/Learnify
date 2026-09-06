import React, { useState } from 'react'
import logo from '../assets/learnify.jpeg';
import { IoMdPerson } from "react-icons/io";
import { GiHamburgerMenu } from "react-icons/gi";
import { GiSplitCross } from "react-icons/gi";
import { MdSpaceDashboard } from "react-icons/md";
import { FaBookOpen, FaCrown } from "react-icons/fa";

import { useNavigate, useLocation } from 'react-router-dom';
import { serverUrl } from '../App';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import { setUserData } from '../redux/userSlice';

function Nav() {
  let [showHam, setShowHam] = useState(false)
  let [showPro, setShowPro] = useState(false)
  let navigate = useNavigate()
  let location = useLocation()
  let dispatch = useDispatch()
  let { userData } = useSelector(state => state.user)

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
    <div>
      {/* NAVBAR */}
      <div className='w-full h-[68px] fixed top-0 left-0 px-4 md:px-8 flex items-center justify-between z-30
        bg-white/10 backdrop-blur-xl border-b border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.15)]'>

        {/* LOGO LEFT */}
        <div className='flex items-center gap-2'>
          <img
            src={logo}
            className='w-[42px] h-[42px] object-cover rounded-full border-2 border-white shadow-md cursor-pointer'
            onClick={() => navigate("/")}
            alt="logo"
          />
          <span className='hidden sm:block text-white font-bold text-xl tracking-wide drop-shadow'>Learnify</span>
        </div>

        {/* CENTER NAV LINKS */}
        <div className='hidden lg:flex items-center gap-1 bg-black/20 rounded-full px-2 py-1.5 border border-white/10'>
          {navLinks.map((link) => (
            <span
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`px-4 py-1.5 rounded-full text-[15px] cursor-pointer transition-all duration-300
                ${isActive(link.path)
                  ? 'bg-white text-black font-semibold shadow'
                  : 'text-white/90 hover:bg-white/15'}`}
            >
              {link.label}
            </span>
          ))}
        </div>

        {/* RIGHT SIDE MENU */}
        <div className='hidden lg:flex items-center gap-4 text-white text-[15px]'>

          {userData?.role === "educator" &&
            <button
              className='flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black font-medium
                hover:bg-gray-200 transition-all duration-300 shadow'
              onClick={() => navigate("/dashboard")}
            >
              <MdSpaceDashboard /> Dashboard
            </button>
          }

          {userData?.role === "admin" &&
            <button
              className='flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-400 text-black font-medium
                hover:bg-yellow-300 transition-all duration-300 shadow'
              onClick={() => navigate("/admin")}
            >
              <FaCrown /> Admin
            </button>
          }

          {!userData &&
            <span
              className='px-5 py-2 rounded-full border border-white/40 text-white cursor-pointer
                hover:bg-white/15 transition-all duration-300'
              onClick={() => navigate("/login")}
            >
              Login
            </span>
          }

          {/* PROFILE ICON */}
          <div className='relative'>
            {!userData ?
              <IoMdPerson
                className='w-[44px] h-[44px] fill-white cursor-pointer border-2 border-white/50 bg-black/30 rounded-full p-[9px] hover:bg-black/50 transition-all'
                onClick={() => setShowPro(prev => !prev)}
              /> :
              <div
                className='w-[44px] h-[44px] rounded-full text-white flex items-center justify-center text-[18px]
                  border-2 border-white/70 bg-gradient-to-br from-gray-700 to-black cursor-pointer shadow-md hover:scale-105 transition-transform'
                onClick={() => setShowPro(prev => !prev)}
              >
                {userData.photoUrl
                  ? <img src={userData.photoUrl} className='w-full h-full rounded-full object-cover' alt="" />
                  : userData?.name?.slice(0, 1).toUpperCase()}
              </div>
            }

            {showPro && (
              <div className='absolute top-[130%] right-0 flex flex-col gap-1 text-[15px] rounded-xl
                bg-white/95 backdrop-blur-md px-2 py-2 border border-gray-200 shadow-2xl min-w-[170px] animate-[fadeIn_0.15s_ease-out]'>
                {userData &&
                  <>
                    <span className='flex items-center gap-2 text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors'
                      onClick={() => { navigate("/profile"); setShowPro(false) }}>
                      <IoMdPerson /> My Profile
                    </span>
                    <span className='flex items-center gap-2 text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors'
                      onClick={() => { navigate("/enrolledcourses"); setShowPro(false) }}>
                      <FaBookOpen /> My Courses
                    </span>
                    <div className='h-[1px] bg-gray-200 my-1' />
                    <span className='text-white bg-black px-3 py-2 rounded-lg hover:bg-gray-800 cursor-pointer text-center transition-colors'
                      onClick={handleLogout}>
                      Logout
                    </span>
                  </>
                }
              </div>
            )}
          </div>
        </div>

        {/* MOBILE HAMBURGER */}
        <GiHamburgerMenu className='w-[26px] h-[26px] lg:hidden fill-white cursor-pointer' onClick={() => setShowHam(prev => !prev)} />
      </div>

      {/* MOBILE MENU */}
      <div className={`fixed top-0 w-screen h-screen bg-black/90 backdrop-blur-md flex items-center justify-center flex-col gap-4 z-40
        transition-transform duration-500 ease-in-out ${showHam ? "translate-x-0" : "translate-x-[-100%]"}`}>
        <GiSplitCross className='w-[32px] h-[32px] fill-white absolute top-6 right-6 cursor-pointer' onClick={() => setShowHam(prev => !prev)} />

        <div className='w-[64px] h-[64px] rounded-full text-white flex items-center justify-center text-[24px] border-2 bg-gradient-to-br from-gray-700 to-black border-white mb-2'>
          {userData?.photoUrl
            ? <img src={userData.photoUrl} className='w-full h-full rounded-full object-cover' alt="" />
            : (userData ? userData.name.slice(0, 1).toUpperCase() : <IoMdPerson className='w-8 h-8' />)}
        </div>

        {navLinks.map(link => (
          <span key={link.path}
            className='w-[85%] max-w-[320px] text-center text-white border border-white/20 bg-white/10 rounded-xl py-4 text-[17px] cursor-pointer hover:bg-white/20 transition-colors'
            onClick={() => { navigate(link.path); setShowHam(false) }}>
            {link.label}
          </span>
        ))}

        {userData &&
          <span className='w-[85%] max-w-[320px] text-center text-white border border-white/20 bg-white/10 rounded-xl py-4 text-[17px] cursor-pointer hover:bg-white/20 transition-colors'
            onClick={() => { navigate("/profile"); setShowHam(false) }}>
            My Profile
          </span>
        }
        {userData &&
          <span className='w-[85%] max-w-[320px] text-center text-white border border-white/20 bg-white/10 rounded-xl py-4 text-[17px] cursor-pointer hover:bg-white/20 transition-colors'
            onClick={() => { navigate("/enrolledcourses"); setShowHam(false) }}>
            My Courses
          </span>
        }
        {userData?.role === "educator" &&
          <span className='w-[85%] max-w-[320px] text-center text-white border border-white/20 bg-white/10 rounded-xl py-4 text-[17px] cursor-pointer hover:bg-white/20 transition-colors'
            onClick={() => { navigate("/dashboard"); setShowHam(false) }}>
            Dashboard
          </span>
        }
        {userData?.role === "admin" &&
          <span className='w-[85%] max-w-[320px] text-center text-black border border-yellow-300 bg-yellow-400 rounded-xl py-4 text-[17px] cursor-pointer hover:bg-yellow-300 transition-colors font-medium'
            onClick={() => { navigate("/admin"); setShowHam(false) }}>
            Admin Panel
          </span>
        }

        {!userData
          ? <span className='w-[85%] max-w-[320px] text-center text-black bg-white rounded-xl py-4 text-[17px] cursor-pointer font-medium'
              onClick={() => { navigate("/login"); setShowHam(false) }}>
              Login
            </span>
          : <span className='w-[85%] max-w-[320px] text-center text-white bg-red-500/80 rounded-xl py-4 text-[17px] cursor-pointer hover:bg-red-500 transition-colors'
              onClick={handleLogout}>
              Logout
            </span>
        }
      </div>
    </div>
  )
}

export default Nav
