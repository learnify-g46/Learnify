import React from 'react'
import about from "../assets/about.jpg"
import VideoPlayer from './VideoPlayer'
import { HiMinus } from "react-icons/hi";
import { BiSolidBadgeCheck } from "react-icons/bi";

function About() {
  const points = [
    "Simplified Learning",
    "Expert Trainers",
    "Big Experience",
    "Lifetime Access",
  ]

  return (
    <section className='bg-white dark:bg-gray-950 py-16'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-16'>

        <div className='lg:w-2/5 w-full relative flex justify-center'>
          <img src={about} className='w-[85%] rounded-2xl shadow-lg object-cover' alt="" />
          <VideoPlayer />
        </div>

        <div className='lg:w-3/5 w-full flex flex-col items-start gap-4'>
          <div className='flex items-center gap-3 text-blue-600 font-semibold text-sm uppercase tracking-wide'>
            About Us <HiMinus className='text-2xl' />
          </div>
          <h2 className='text-3xl md:text-4xl font-bold text-slate-900 dark:text-white'>
            We Are Maximize Your Learning Growth
          </h2>
          <p className='text-slate-500 dark:text-gray-400'>
            We provide a modern Learning Management System to simplify online education, track progress, and enhance student-instructor collaboration efficiently.
          </p>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 w-full sm:w-3/4'>
            {points.map((point, idx) => (
              <div key={idx} className='flex items-center gap-2 text-slate-700 dark:text-gray-200'>
                <BiSolidBadgeCheck className='text-blue-600 text-xl shrink-0' />
                {point}
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}

export default About
