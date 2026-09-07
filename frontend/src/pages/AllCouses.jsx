import React, { useEffect, useState } from 'react';
import Card from "../components/Card.jsx";
import { HiOutlineFilter, HiX } from "react-icons/hi";
import { useNavigate } from 'react-router-dom';
import Nav from '../components/Nav';
import ai from '../assets/SearchAi.png'
import { useSelector } from 'react-redux';

function AllCourses() {
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const navigate = useNavigate()
  const [category, setCategory] = useState([])
  const [filterCourses, setFilterCourses] = useState([])
  const { courseData } = useSelector(state => state.course)

  const categoryList = [
    'App Development',
    'AI/ML',
    'AI Tools',
    'Data Science',
    'Data Analytics',
    'Ethical Hacking',
    'UI UX Designing',
    'Web Development',
    'Others',
  ]

  const toggleCategory = (e) => {
    if (category.includes(e.target.value)) {
      setCategory(prev => prev.filter(item => item !== e.target.value))
    } else {
      setCategory(prev => [...prev, e.target.value])
    }
  }

  const applyFilter = () => {
    let courseCopy = courseData.slice();

    if (category.length > 0) {
      courseCopy = courseCopy.filter(item => category.includes(item.category))
    }

    setFilterCourses(courseCopy)
  }

  useEffect(() => {
    setFilterCourses(courseData)
  }, [courseData])

  useEffect(() => {
    applyFilter()
  }, [category])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <Nav />

      <div className="flex">
        {/* Mobile Toggle Button */}
        <button
          onClick={() => setIsSidebarVisible(prev => !prev)}
          className="fixed top-20 left-4 z-40 flex items-center gap-2 rounded-lg bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 px-3 py-2 text-sm font-medium text-slate-700 dark:text-gray-200 shadow-sm md:hidden"
        >
          {isSidebarVisible ? <HiX /> : <HiOutlineFilter />}
          Filters
        </button>

        {/* Sidebar */}
        <aside className={`w-[260px] shrink-0 fixed top-16 left-0 h-[calc(100vh-4rem)] overflow-y-auto bg-white dark:bg-gray-900 border-r border-slate-200 dark:border-gray-800 p-6 z-30 transition-transform duration-300
          ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0`}>

          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 uppercase tracking-wide">Filter by Category</h2>

          <button
            className='w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 mb-6'
            onClick={() => navigate("/searchwithai")}
          >
            Search with AI <img src={ai} className='w-5 h-5 rounded-full' alt="" />
          </button>

          <form className="space-y-3 text-sm" onSubmit={(e) => e.preventDefault()}>
            {categoryList.map((cat) => (
              <label key={cat} className="flex items-center gap-3 cursor-pointer text-slate-600 dark:text-gray-300 hover:text-blue-600 transition">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-blue-600"
                  value={cat}
                  onChange={toggleCategory}
                />
                {cat}
              </label>
            ))}
          </form>
        </aside>

        {/* Main Courses Section */}
        <main className="w-full md:pl-[260px] pt-24 md:pt-10 pb-16 px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 place-items-center">
            {filterCourses?.map((item, index) => (
              <Card key={index} thumbnail={item.thumbnail} title={item.title} price={item.price} category={item.category} id={item._id} reviews={item.reviews} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AllCourses;
