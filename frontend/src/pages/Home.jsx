import React from 'react'
import home from "../assets/lmsimg.jpg"
import Nav from '../components/Nav'
import { HiArrowRight, HiOutlineBookOpen } from "react-icons/hi";
import Logos from '../components/Logos';
import Cardspage from '../components/Cardspage';
import ExploreCourses from '../components/ExploreCourses';
import About from '../components/About';
import ai1 from '../assets/SearchAi.png'
import ReviewPage from '../components/ReviewPage';
import Footer from '../components/Footer';
import Recommendations from '../components/Recommendations';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate()

  return (
    <div className='w-full overflow-hidden bg-white dark:bg-gray-950 transition-colors'>
      <Nav />

      {/* HERO */}
      <section className='relative overflow-hidden'>
        <img src={home} className='absolute inset-0 h-full w-full object-cover object-center' alt="" />
        <div className='absolute inset-0 bg-slate-900/30' />
        <div className='absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent dark:from-gray-950 dark:via-gray-950/85' />

        <div className='relative mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-32'>
          <div className='max-w-2xl'>

            <div className='inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-gray-900/80 px-4 py-2 text-sm font-semibold text-blue-700 dark:text-blue-400 shadow-sm backdrop-blur-md'>
              <HiOutlineBookOpen size={18} />
              Your Learning Journey Starts Here
            </div>

            <h1 className='mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white'>
              Grow Your Skills to Advance
              <span className='block text-blue-600'>Your Career Path</span>
            </h1>

            <p className='mt-6 max-w-xl text-base sm:text-lg leading-8 text-slate-600 dark:text-gray-300'>
              Learn in-demand skills with expert-led courses, track your progress, and get AI-powered help whenever you're stuck.
            </p>

            <div className='mt-8 flex flex-col gap-4 sm:flex-row'>
              <button
                className='flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-1 hover:bg-blue-700'
                onClick={() => navigate("/allcourses")}
              >
                View all Courses
                <HiArrowRight size={18} />
              </button>

              <button
                className='flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 px-6 py-4 font-semibold text-blue-700 dark:text-blue-400 shadow-sm backdrop-blur transition hover:bg-white dark:hover:bg-gray-800'
                onClick={() => navigate("/searchwithai")}
              >
                Search with AI
                <img src={ai1} className='h-6 w-6 rounded-full' alt="" />
              </button>
            </div>

          </div>
        </div>
      </section>

      <Logos />
      <ExploreCourses />
      <Cardspage />
      <About />
      <Recommendations />
      <ReviewPage />
      <Footer />
    </div>
  )
}

export default Home
