import React from 'react'
import { ClipLoader } from 'react-spinners'

// Shown the first time a new person signs in with Google: they pick how they will use Learnify.
function RolePicker({ email, loading, onPick, onCancel }) {
  return (
    <div data-testid="role-picker" className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
        <h2 className="text-xl font-semibold text-black">Welcome to Learnify</h2>
        <p className="text-sm text-gray-500 mt-1">
          {email ? `Setting up your account for ${email}.` : "Setting up your account."} How will you use Learnify?
        </p>
        <div className="flex flex-col gap-3 mt-5">
          <button disabled={loading} onClick={() => onPick("student")}
            className="border border-black rounded-xl py-3 font-medium hover:bg-black hover:text-white transition disabled:opacity-50">
            {loading ? <ClipLoader size={18} /> : "I'm a Student"}
          </button>
          <button disabled={loading} onClick={() => onPick("educator")}
            className="border border-black rounded-xl py-3 font-medium hover:bg-black hover:text-white transition disabled:opacity-50">
            I'm an Educator
          </button>
        </div>
        <button disabled={loading} onClick={onCancel} className="mt-4 text-sm text-gray-500 underline">Cancel</button>
      </div>
    </div>
  )
}
export default RolePicker
