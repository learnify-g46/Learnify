import React, { useEffect, useState } from 'react'
import ReviewCard from './ReviewCard'
import { useSelector } from 'react-redux';

function ReviewPage() {
  const [latestReview, setLatestReview] = useState([]);
  const { allReview } = useSelector(state => state.review)

  useEffect(() => {
    setLatestReview(allReview.slice(0, 6));
  }, [allReview])

  return (
    <section className='bg-white dark:bg-gray-950 py-16'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>

        <div className='flex flex-col items-center text-center mb-12'>
          <h2 className='text-3xl md:text-4xl font-bold text-slate-900 dark:text-white'>Real Reviews from Real Learners</h2>
          <p className='mt-3 max-w-2xl text-slate-500 dark:text-gray-400'>
            Discover how our Virtual Courses is transforming learning experiences through real feedback from students and professionals worldwide.
          </p>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 place-items-center'>
          {latestReview.map((item, index) => (
            <ReviewCard key={index} rating={item.rating} image={item.user.photoUrl} text={item.comment} name={item.user.name} role={item.user.role} />
          ))}
        </div>

      </div>
    </section>
  )
}

export default ReviewPage
