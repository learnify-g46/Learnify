import React, { useState } from 'react'
import logo from '../assets/blackBackgound.jpg'
import google from '../assets/google.jpg'
import axios from 'axios'
import { serverUrl } from '../App'
import { MdOutlineRemoveRedEye } from "react-icons/md";

import { MdRemoveRedEye } from "react-icons/md";
import { useNavigate } from 'react-router-dom'
import { signInWithPopup } from 'firebase/auth'
import { auth, provider } from '../../utils/Firebase'
import { ClipLoader } from 'react-spinners'
import { toast } from 'react-toastify'
import { useDispatch } from 'react-redux'
import { setUserData } from '../redux/userSlice'
import { getErrorMessage, isSilentGoogleError } from '../../utils/authErrors'
import EmailOtpStep from '../components/EmailOtpStep'
function SignUp() {
    const [name,setName]= useState("")
    const [email,setEmail]= useState("")
    const [password,setPassword]= useState("")
    const [role,setRole]= useState("student")
    const navigate = useNavigate()
    let [show,setShow] = useState(false)
    const [loading,setLoading]= useState(false)
    let dispatch = useDispatch()
    const [pendingEmail,setPendingEmail] = useState(null) // set once the account is created and waits for the emailed code

    // common typing mistakes in the email domain -> suggest the right one (the server checks too)
    const TYPOS = { "gmil.com":"gmail.com","gmial.com":"gmail.com","gamil.com":"gmail.com","gmai.com":"gmail.com","gmaill.com":"gmail.com","gmail.co":"gmail.com","gmail.con":"gmail.com","gnail.com":"gmail.com","yahooo.com":"yahoo.com","yaho.com":"yahoo.com","yahoo.con":"yahoo.com","hotmial.com":"hotmail.com","hotmail.con":"hotmail.com","outlok.com":"outlook.com","outlook.con":"outlook.com" }
    const emailSuggestion = (() => {
        const at = email.lastIndexOf("@")
        if (at < 1) return ""
        const fixed = TYPOS[email.slice(at + 1).trim().toLowerCase()]
        return fixed ? email.slice(0, at + 1) + fixed : ""
    })()

    const handleSignUp = async () => {
        setLoading(true)
        try {
            const result = await axios.post(serverUrl + "/api/auth/signup" , {name , email , password , role} , {withCredentials:true} )
            setLoading(false)
            if (result.data?.needsVerification) {
                setPendingEmail(result.data.email)
                toast.success("Account created. Check your email for the code.")
                return
            }
            // email verification switched off (local development only)
            dispatch(setUserData(result.data))
            navigate("/")
            toast.success("SignUp Successfully")
        } 
        catch (error) {
            console.log(error)
            setLoading(false)
            if (error.response?.data?.code === "OTP_MAIL_FAILED") {
                setPendingEmail(error.response.data.email) // account exists; the person can ask for the code again
            }
            toast.error(getErrorMessage(error))
        }
        
    }
    const googleSignUp = async () => {
        try {
            const response = await signInWithPopup(auth,provider)
            const idToken = await response.user.getIdToken()
            // role = the one picked above; ignored by the server when the account already exists
            const result = await axios.post(serverUrl + "/api/auth/googlesignup" , {idToken , role}
                , {withCredentials:true}
            )
            dispatch(setUserData(result.data))
            navigate("/")
            toast.success("SignUp Successfully")
            if (result.data?.passwordRemoved) {
              toast.info("For your security your old password was removed. Keep using Google, or set a new password with Forgot password.", { autoClose: 9000 })
            }
        } catch (error) {
            console.log(error)
            if (!isSilentGoogleError(error)) toast.error(getErrorMessage(error, "Google sign-up failed. Please try again."))
        }
    }
  if (pendingEmail) return <EmailOtpStep email={pendingEmail} onBack={()=>{ setPendingEmail(null); setPassword('') }} />
  return (
    <div className='bg-[#dddbdb] w-[100vw] h-[100vh] flex items-center justify-center flex-col gap-3'>
        <form className='w-[90%] md:w-200 h-150 bg-[white] shadow-xl rounded-2xl flex' onSubmit={(e)=>e.preventDefault()}>
            <div className='md:w-[50%] w-[100%] h-[100%] flex flex-col items-center justify-center gap-3 '>
                <div><h1 className='font-semibold text-[black] text-2xl'>Let's get Started</h1>
                <h2 className='text-[#999797] text-[18px]'>Create your account</h2>
                </div>
                <div className='flex flex-col gap-1 w-[80%] items-start justify-center px-3'>
                    <label htmlFor="name" className='font-semibold'>
                        Name
                    </label>
                    <input id='name' type="text" className='border-1 w-[100%] h-[35px] border-[#e7e6e6] text-[15px] px-[20px]'placeholder='Your name' onChange={(e)=>setName(e.target.value)} value={name} />
                </div>
                 <div className='flex flex-col gap-1 w-[80%] items-start justify-center px-3'>
                    <label htmlFor="email" className='font-semibold'>
                        Email
                    </label>
                    <input id='email' type="text" className='border-1 w-[100%] h-[35px] border-[#e7e6e6] text-[15px] px-[20px]'placeholder='Your email' onChange={(e)=>setEmail(e.target.value)} value={email} />
                    {emailSuggestion && (
                        <div className='text-[12px] text-amber-700'>Did you mean <button type='button' className='font-semibold underline' onClick={()=>setEmail(emailSuggestion)}>{emailSuggestion}</button>?</div>
                    )}
                </div>
                 <div className='flex flex-col gap-1 w-[80%] items-start justify-center px-3 relative'>
                    <label htmlFor="password" className='font-semibold'>
                        Password
                    </label>
                    <input id='password' type={show?"text":"password"} className='border-1 w-[100%] h-[35px] border-[#e7e6e6] text-[15px] px-[20px]' placeholder='***********' onChange={(e)=>setPassword(e.target.value)} value={password}/>
                    {!show && <MdOutlineRemoveRedEye className='absolute w-[20px] h-[20px] cursor-pointer right-[5%] bottom-[10%]' onClick={()=>setShow(prev => !prev)}/>}
              {show && <MdRemoveRedEye className='absolute w-[20px] h-[20px] cursor-pointer right-[5%] bottom-[10%]' onClick={()=>setShow(prev => !prev)} />}
                </div>
                 <div className='flex md:w-[50%] w-[70%] items-center justify-between'>
                  <span className={`px-[10px] py-[5px] border-[1px] border-[#e7e6e6] rounded-2xl  cursor-pointer ${role === 'student' ? "border-black" : "border-[#646464]"}`} onClick={()=>setRole("student")}>Student</span>
                  <span className={`px-[10px] py-[5px] border-[1px] border-[#e7e6e6] rounded-2xl  cursor-pointer ${role === 'educator' ? "border-black" : "border-[#646464]"}`}  onClick={()=>setRole("educator")}>Educator</span>
                </div>
                <button className='w-[80%] h-[40px] bg-black text-white cursor-pointer flex items-center justify-center rounded-[5px]' disabled={loading} onClick={handleSignUp}>{loading?<ClipLoader size={30} color='white' /> : "Sign Up"}</button>
             

                <div className='w-[80%] flex items-center gap-2'>
                    <div className='w-[25%] h-[0.5px] bg-[#c4c4c4]'></div>
                    <div className='w-[50%] text-[15px] text-[#6f6f6f] flex items-center justify-center '>Or continue with</div>
                    <div className='w-[25%] h-[0.5px] bg-[#c4c4c4]'></div>
                </div>
                <div className='w-[80%] h-[40px] border-1 border-[black] rounded-[5px] flex items-center justify-center  ' onClick={googleSignUp} ><img src={google} alt="" className='w-[25px]' /><span className='text-[18px] text-gray-500'>oogle</span> </div>
                 <div className='text-[#6f6f6f]'>Already have an account? <span className='underline underline-offset-1 text-[black] cursor-pointer' onClick={()=>navigate("/login")}>Login</span></div>

            </div>
            <div className='w-[50%] h-[100%] rounded-r-2xl bg-[black] md:flex items-center justify-center flex-col hidden'><img src={logo} className='w-100 shadow-2xl' alt="" />
            <span className='text-[white] text-2xl'></span>
            </div>
           
        </form>
     
    </div>
  )
}

export default SignUp
