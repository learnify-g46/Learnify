import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { FaArrowLeft, FaEdit } from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { serverUrl } from '../../App';
import { ClipLoader } from 'react-spinners';
import { useDispatch, useSelector } from 'react-redux';
import { setLectureData } from '../../redux/lectureSlice';

function CreateLecture() {
    const navigate = useNavigate()
    const {courseId} = useParams()
    const [lectureTitle , setLectureTitle] = useState("")
    const [loading,setLoading] = useState(false)
    const dispatch = useDispatch()
    const {lectureData} = useSelector(state=>state.lecture)
    

    const createLectureHandler = async () => {
      setLoading(true)
      try {
        const result = await axios.post(serverUrl + `/api/course/createlecture/${courseId}` ,{lectureTitle} , {withCredentials:true})
        console.log(result.data)
      dispatch(setLectureData([...lectureData,result.data.lecture]))
        toast.success("Lecture Created")
        setLoading(false)
        setLectureTitle("")
      } catch (error) {
        console.log(error)
        toast.error(error.response.data.message)
        setLoading(false)
      }
    }

    useEffect(()=>{
      const getLecture = async () => {
        try {
          const result = await axios.get(serverUrl + `/api/course/getcourselecture/${courseId}`,{withCredentials:true})
        console.log(result.data)
        dispatch(setLectureData(result.data.lectures))
        

          
        } catch (error) {
           console.log(error)
        toast.error(error.response.data.message)
        
        }
        
      }
      getLecture()
    },[])

   
  
  return (
     <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white shadow-xl rounded-xl w-full max-w-2xl p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-800 mb-1">Let’s Add a Lecture</h1>
          <p className="text-sm text-gray-500">Enter the title and add your video lectures to enhance your course content.</p>
        </div>

        {/* Input */}
        <input
          type="text"
          placeholder="e.g. Introduction to Mern Stack"
          className="w-full border border-gray-300 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
          onChange={(e)=>setLectureTitle(e.target.value)}
          value={lectureTitle}
        />

        {/* Buttons */}
        <div className="flex gap-4 mb-6">
          <button className="flex items-center gap-2 px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-sm font-medium" onClick={()=>navigate(`/addcourses/${courseId}`)
          }>
            <FaArrowLeft /> Back to Course
          </button>
          <button className="px-5 py-2 rounded-md bg-[black] text-white hover:bg-gray-600 transition-all text-sm font-medium shadow" disabled={loading} onClick={createLectureHandler}>
           {loading?<ClipLoader size={30} color='white'/>: "+ Create Lecture"}
          </button>
        </div>

        {/* Lecture List */}
         <div className="space-y-2">
          {lectureData.map((lecture, index) => (
            <div key={index} className="bg-gray-100 rounded-md flex justify-between items-center p-3 text-sm font-medium text-gray-700">
              <span>Lecture - {index + 1}: {lecture.lectureTitle}</span>
              <FaEdit className="text-gray-500 hover:text-gray-700 cursor-pointer"  onClick={()=>navigate(`/editlecture/${courseId}/${lecture._id}`)}/>
            </div>
          ))}
        </div> 
      </div>
    </div>
    
  )
}

export default CreateLecture
