import React from 'react'
import { MdCastForEducation } from "react-icons/md";
import { SiOpenaccess } from "react-icons/si";
import { FaSackDollar } from "react-icons/fa6";
import { BiSupport } from "react-icons/bi";
import { FaUsers } from "react-icons/fa";

function Logos() {
  const items = [
    { icon: <MdCastForEducation className='text-xl' />, label: "Online Courses" },
    { icon: <SiOpenaccess className='text-xl' />, label: "Lifetime Access" },
    { icon: <FaSackDollar className='text-xl' />, label: "Value For Money" },
    { icon: <BiSupport className='text-xl' />, label: "Lifetime Support" },
    { icon: <FaUsers className='text-xl' />, label: "AI Chat Upcoming" },
  ]

  return (
    <div className='w-full bg-slate-50 dark:bg-gray-900 border-y border-slate-200 dark:border-gray-800 py-6'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-center gap-3'>
        {items.map((item, idx) => (
          <div
            key={idx}
            className='flex items-center gap-2 rounded-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-gray-200 shadow-sm'
          >
            <span className='text-blue-600 dark:text-blue-400'>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Logos
