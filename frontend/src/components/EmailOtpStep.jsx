import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { serverUrl } from '../App'
import { toast } from 'react-toastify'
import { ClipLoader } from 'react-spinners'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { setUserData } from '../redux/userSlice'
import { getErrorMessage } from '../../utils/authErrors'

// Asks for the 6-digit code that was emailed to a new account (or an older account on its first login).
// A correct code verifies the email and logs the person in.
function EmailOtpStep({ email, onBack, note = "" }) {
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [wait, setWait] = useState(60) // the server only allows a new code once a minute
  const dispatch = useDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait(w => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const verify = async () => {
    if (!/^\d{6}$/.test(otp)) { setError("Please enter the 6-digit code."); return }
    setLoading(true); setError("")
    try {
      const result = await axios.post(serverUrl + "/api/auth/verify-email", { email, otp }, { withCredentials: true })
      dispatch(setUserData(result.data))
      toast.success("Email verified. Welcome to Learnify!")
      navigate("/")
    } catch (err) {
      setError(getErrorMessage(err, "That code did not work. Please try again."))
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    setError("")
    try {
      await axios.post(serverUrl + "/api/auth/resend-email-otp", { email }, { withCredentials: true })
      toast.success("If your email is waiting for verification, a new code was sent.")
      setWait(60)
    } catch (err) {
      setError(getErrorMessage(err, "We couldn't send the code right now. Please try again."))
    }
  }

  return (
    <div className='bg-[#dddbdb] w-[100vw] h-[100vh] flex items-center justify-center flex-col gap-3'>
      <form className='w-[90%] max-w-md bg-white shadow-xl rounded-2xl p-8 flex flex-col items-center gap-4' onSubmit={(e) => { e.preventDefault(); verify() }}>
        <h1 className='font-semibold text-2xl'>Verify your email</h1>
        <p className='text-[#6f6f6f] text-center text-[15px]'>
          {note || "We sent a 6-digit code to"} <span className='font-semibold text-black break-all'>{email}</span>. It is valid for 10 minutes.
        </p>
        <input
          id='emailOtp'
          inputMode='numeric'
          autoComplete='one-time-code'
          maxLength={6}
          className='border border-[#e7e6e6] w-full h-[45px] text-center text-2xl tracking-[0.5em] px-3'
          placeholder='------'
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
        />
        {error && <p className='text-red-600 text-sm text-center'>{error}</p>}
        <button type='submit' disabled={loading} className='w-full h-[40px] bg-black text-white rounded-[5px] flex items-center justify-center'>
          {loading ? <ClipLoader size={24} color='white' /> : "Verify"}
        </button>
        <button type='button' disabled={wait > 0} onClick={resend} className={`text-sm ${wait > 0 ? "text-[#999797]" : "underline text-black"}`}>
          {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
        </button>
        <button type='button' onClick={onBack} className='text-sm text-[#6f6f6f] underline'>Use a different email</button>
      </form>
    </div>
  )
}

export default EmailOtpStep
