import React from 'react'
import { HiArrowRight } from "react-icons/hi";
import { TbDeviceDesktopAnalytics } from "react-icons/tb";
import { LiaUikit } from "react-icons/lia";
import { MdAppShortcut } from "react-icons/md";
import { FaHackerrank } from "react-icons/fa";
import { TbBrandOpenai } from "react-icons/tb";
import { SiGoogledataproc } from "react-icons/si";
import { BsClipboardDataFill } from "react-icons/bs";
import { SiOpenaigym } from "react-icons/si";
import { useNavigate } from 'react-router-dom';

function ExploreCourses() {
  const navigate = useNavigate()

  const categories = [
    { icon: <TbDeviceDesktopAnalytics />, label: "Web Development" },
    { icon: <LiaUikit />, label: "UI UX Designing" },
    { icon: <MdAppShortcut />, label: "App Development" },
    { icon: <FaHackerrank />, label: "Ethical Hacking" },
    { icon: <TbBrandOpenai />, label: "AI/ML" },
    { icon: <SiGoogledataproc />, label: "Data Science" },
    { icon: <BsClipboardDataFill />, label: "Data Analytics" },
    { icon: <SiOpenaigym />, label: "AI Tools" },
  ]

  return (
    <section className='bg-slate-50 dark:bg-gray-900 py-16'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-12'>

        <div className='lg:w-1/3 flex flex-col items-start gap-3'>
          <h2 className='text-3xl md:text-4xl font-bold text-slate-900 dark:text-white'>Explore Our Courses</h2>
          <p className='text-slate-500 dark:text-gray-400'>
            Pick a category and dive in — curated learning paths across the most in-demand tech and business skills.
          </p>
          <button
            className='flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 mt-4'
            onClick={() => navigate("/allcourses")}
          >
            Explore Courses <HiArrowRight />
          </button>
        </div>

        <div className='lg:w-2/3 grid grid-cols-2 sm:grid-cols-4 gap-6 w-full'>
          {categories.map((cat, idx) => (
            <div key={idx} className='flex flex-col items-center gap-3 text-center'>
              <div className='h-20 w-20 rounded-2xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 flex items-center justify-center text-3xl text-blue-600 dark:text-blue-400 shadow-sm'>
                {cat.icon}
              </div>
              <span className='text-sm font-medium text-slate-700 dark:text-gray-200'>{cat.label}</span>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}

export default ExploreCourses
