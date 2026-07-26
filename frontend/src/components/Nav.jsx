import React, { useState } from 'react'
import logo from '../assets/learnify.jpeg';
import { IoMdPerson } from "react-icons/io";
import { GiHamburgerMenu } from "react-icons/gi";
import { GiSplitCross } from "react-icons/gi";

import { useNavigate } from 'react-router-dom';
import { serverUrl } from '../App';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import { setUserData } from '../redux/userSlice';
function Nav() {
  let [showHam,setShowHam] = useState(false)
  let [showPro,setShowPro] = useState(false)
  let navigate = useNavigate()
  let dispatch = useDispatch()
  let {userData} = useSelector(state=>state.user)

  const handleLogout = async () => {
    try {
      const result = await axios.get(serverUrl + "/api/auth/logout" , {withCredentials:true})
      console.log(result.data)
     await dispatch(setUserData(null))
      toast.success("LogOut Successfully")

      navigate("/login"); // ✅ redirect
    } catch (error) {
      console.log(error.response.data.message)
    }
  }
  return (
    <div>
      {/* NAVBAR */}
    <div className='w-[100%] h-[70px] fixed top-0 px-[20px] py-[10px] flex items-center justify-between bg-[#00000047]  z-10'>
     {/* LOGO LEFT */}
     <div className='lg:w-[20%] w-[40%] lg:pl-[50px] '>
        <img src={logo} className=' w-[140px]  rounded-[5px] border-2 border-white cursor-pointer' onClick={()=>navigate("/")} alt="" />
      
     </div>

     {/* RIGHT SIDE MENU */}
     {/* <div className='w-[28%] lg:flex items-center justify-center gap-4 hidden '> */}

     <div className='w-[30%] lg:flex items-center justify-center gap-6 hidden text-white text-[18px]'>

       {/* <span onClick={()=>navigate("/about")} className='cursor-pointer hover:text-gray-300'>
            About
          </span> */}

        {/* PROFILE ICON */}
        {!userData ? <IoMdPerson className='w-[50px] h-[50px] fill-white cursor-pointer border-[2px] border-[#fdfbfb] bg-[#000000d5] rounded-full p-[10px]'onClick={()=>setShowPro(prev=>!prev)}/>:

        
        
       <div className='w-[50px] h-[50px] rounded-full text-white flex items-center justify-center text-[20px] border-2 bg-black  border-white cursor-pointer' onClick={()=>setShowPro(prev=>!prev)}>
         {userData.photoUrl ? <img src={userData.photoUrl} className='w-[100%] h-[100%] rounded-full object-cover' alt="" />
         :
         <div className='w-[50px] h-[50px] rounded-full text-white flex items-center justify-center text-[20px] border-2 bg-black  border-white cursor-pointer' >{userData?.name.slice(0,1).toUpperCase()}</div>}
          </div>}

          {/* DASHBOARD */}
           {userData?.role == "educator" ? <div className='px-[20px] py-[10px] border-2 lg:border-white border-black lg:text-white bg-[black] text-black rounded-[10px] text-[18px] font-light flex gap-2 cursor-pointer' onClick={()=>navigate("/dashboard")}>Dashboard</div>
           :""}
        {!userData && <span className='px-[20px] py-[10px] border-2 border-white text-white rounded-[10px] text-[18px] font-light cursor-pointer bg-[#000000d5] ' onClick={()=>navigate("/login")}>Login</span>}
        {userData && <span className='px-[20px] py-[10px] bg-white text-black rounded-[10px] shadow-sm shadow-black text-[18px] cursor-pointer' onClick={handleLogout}>LogOut</span>}
       

     </div>
     {showPro && <div className=' absolute top-[110%] right-[15%] flex items-center flex-col justify-center gap-2 text-[16px] rounded-md bg-[white] px-[15px] py-[10px] border-[2px]  border-black hover:border-white hover:text-white cursor-pointer hover:bg-black  ' >
      <span className='bg-[black] text-white  px-[30px] py-[10px] rounded-2xl hover:bg-gray-600' onClick={()=>navigate("/profile")}>My Profile</span>
      <span className='bg-[black] text-white hover:bg-gray-600  px-[25px] py-[10px] rounded-2xl' onClick={()=>navigate("/enrolledcourses")}>My Courses</span>
       </div>}
     <GiHamburgerMenu className='w-[30px] h-[30px] lg:hidden fill-white cursor-pointer ' onClick={()=>setShowHam(prev=>!prev)}/>
      
     
    </div>
    <div className={`fixed  top-0 w-[100vw] h-[100vh] bg-[#000000d6] flex items-center justify-center flex-col gap-5 z-10 ${showHam?"translate-x-[0%] transition duration-600  ease-in-out" :"translate-x-[-100%] transition duration-700  ease-in-out"}`}>
     <GiSplitCross  className='w-[35px] h-[35px] fill-white absolute top-5 right-[4%]' onClick={()=>setShowHam(prev=>!prev)}/>
      {!userData ? <IoMdPerson className='w-[50px] h-[50px] fill-white cursor-pointer border-[2px] border-[#fdfbfb7a] bg-[#000000d5] rounded-full p-[10px]'/>:
      <div className='w-[50px] h-[50px] rounded-full text-white flex items-center justify-center text-[20px] border-2 bg-black  border-white cursor-pointer' onClick={()=>setShowPro(prev=>!prev)}>
         {userData.photoUrl ? <img src={userData.photoUrl} className='w-[100%] h-[100%] rounded-full object-cover ' alt="" />
         :
         <div className='w-[50px] h-[50px] rounded-full text-white flex items-center justify-center text-[20px] border-2 bg-black  border-white cursor-pointer' >{userData?.name.slice(0,1).toUpperCase()}</div>}</div>
      }
      
      <span className='flex items-center justify-center gap-2  text-white border-[2px] border-[#fdfbfb7a] bg-[#000000d5] rounded-lg px-[65px] py-[20px] text-[18px] ' onClick={()=>navigate("/profile")}>My Profile </span>
      <span className='flex items-center justify-center gap-2  text-white border-[2px] border-[#fdfbfb7a] bg-[#000000d5] rounded-lg px-[65px] py-[20px] text-[18px] ' onClick={()=>navigate("/enrolledcourses")}>My Courses </span>
      
      {userData?.role == "educator" ? <div className='flex items-center justify-center gap-2 text-[18px] text-white border-[2px] border-[#fdfbfb7a] bg-[#000000d5] rounded-lg px-[60px] py-[20px]' onClick={()=>navigate("/dashboard")}>Dashboard</div>
           :""}
      {!userData ?<span className='flex items-center justify-center gap-2 text-[18px] text-white border-[2px] border-[#fdfbfb7a] bg-[#000000d5] rounded-lg px-[80px] py-[20px]' onClick={()=>navigate("/login")}>Login</span>:
      <span className='flex items-center justify-center gap-2 text-[18px] text-white border-[2px] border-[#fdfbfb7a] bg-[#000000d5] rounded-lg px-[75px] py-[20px]' onClick={handleLogout}>LogOut</span>}
    

    </div>
   </div>
      
  )
}

export default Nav
