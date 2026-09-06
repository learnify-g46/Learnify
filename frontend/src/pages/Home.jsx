import React from 'react'
import home from "../assets/lmsimg.jpg"
import Nav from '../components/Nav'
import { SiViaplay } from "react-icons/si";
import Logos from '../components/Logos';
import Cardspage from '../components/Cardspage';
import ExploreCourses from '../components/ExploreCourses';
import About from '../components/About';
import ai from '../assets/ai.png'
import ai1 from '../assets/SearchAi.png'
import ReviewPage from '../components/ReviewPage';
import Footer from '../components/Footer';
import Recommendations from '../components/Recommendations';
import ChatBot from '../components/ChatBot';
import { useNavigate } from 'react-router-dom';
function Home() {
      const navigate = useNavigate()

  return (

    
    
    <div className='w-[100%] overflow-hidden'>
      
      <div className='w-[100%] lg:h-[140vh] h-[70vh] relative'>
        <Nav/>
        <img src={home} className='object-cover md:object-fill   w-[100%] lg:h-[100%] h-[50vh]' alt="" />
        <span className='lg:text-[70px] absolute  md:text-[40px]  lg:top-[10%] top-[15%] w-[100%] flex items-center justify-center text-white font-bold text-[20px] '>
          Grow Your Skills to Advance 
        </span>
        <span className='lg:text-[70px] text-[20px] md:text-[40px] absolute lg:top-[18%] top-[20%] w-[100%] flex items-center justify-center text-white font-bold'>
          Your Career path
        </span>
        <div className='absolute lg:top-[30%] top-[75%]  md:top-[80%] w-[100%] flex items-center justify-center gap-3 flex-wrap'>
          <button 
  className='px-[20px] py-[10px] border-2 border-black bg-gray-100 text-black rounded-[10px] text-[18px] font-light flex gap-2 cursor-pointer'
  onClick={() => navigate("/allcourses")}
>
  View all Courses 
  <SiViaplay className='w-[30px] h-[30px] fill-black' />
</button>

      {/* <button className='px-[20px] py-[10px] border-2 lg:border-white border-black lg:text-white text-black rounded-[10px] text-[18px] font-light flex gap-2 cursor-pointer' onClick={()=>navigate("/allcourses")}>View all Courses <SiViaplay className='w-[30px] h-[30px] lg:fill-white fill-black' /></button> */}
      <button className='px-[20px] py-[10px] border-2 border-black lg:bg-white bg-black lg:text-black text-white rounded-[10px] text-[18px] font-light flex gap-2 cursor-pointer items-center justify-center' onClick={()=>navigate("/searchwithai")}>Search with AI <img src={ai} className='w-[30px] h-[30px] rounded-full hidden lg:block' alt="" /><img src={ai1} className='w-[35px] h-[35px] rounded-full lg:hidden' alt="" /></button>
      </div>
      </div>
      <Logos/>
      <ExploreCourses/>
      <Cardspage/>
      <About/>
      <Recommendations/>
      <ReviewPage/>
      <Footer/>
      <ChatBot/>

      
      
      
    </div>

  ) 
}

export default Home
