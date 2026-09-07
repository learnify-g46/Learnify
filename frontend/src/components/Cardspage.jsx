import React, { useEffect, useState } from 'react'
import Card from "./Card.jsx"
import { useSelector } from 'react-redux';
import { HiArrowRight } from "react-icons/hi";
import { useNavigate } from 'react-router-dom';

function Cardspage() {
  const [popularCourses, setPopularCourses] = useState([]);
  const { courseData } = useSelector(state => state.course)
  const navigate = useNavigate()

  useEffect(() => {
    setPopularCourses(courseData.slice(0, 6));
  }, [courseData])

  return (
    <section className='bg-white dark:bg-gray-950 py-16'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>

        <div className='flex flex-col items-center text-center mb-12'>
          <h2 className='text-3xl md:text-4xl font-bold text-slate-900 dark:text-white'>Our Popular Courses</h2>
          <p className='mt-3 max-w-2xl text-slate-500 dark:text-gray-400'>
            Explore top-rated courses designed to boost your skills, enhance careers, and unlock opportunities in tech, AI, business, and beyond.
          </p>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 place-items-center'>
          {popularCourses.map((item, index) => (
            <Card key={index} id={item._id} thumbnail={item.thumbnail} title={item.title} price={item.price} category={item.category} reviews={item.reviews} />
          ))}
        </div>

        <div className='flex justify-center mt-12'>
          <button
            className='flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700'
            onClick={() => navigate("/allcourses")}
          >
            View all Courses <HiArrowRight />
          </button>
        </div>

      </div>
    </section>
  )
}

export default Cardspage
