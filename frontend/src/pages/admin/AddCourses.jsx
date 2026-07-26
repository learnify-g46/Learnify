import React, { useEffect, useRef, useState } from 'react'
import img from "../../assets/empty.jpg"
import { FaArrowLeftLong } from "react-icons/fa6";
import { useNavigate, useParams } from 'react-router-dom';
import { serverUrl } from '../../App';
import { MdEdit } from "react-icons/md";
import axios from 'axios';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import { ClipLoader } from 'react-spinners';
import { setCourseData } from '../../redux/courseSlice';
function AddCourses() {
    const navigate= useNavigate()
    const {courseId} = useParams()
   
    
    const [selectedCourse,setSelectedCourse] = useState(null)
    const [title,setTitle] = useState("")
    const [subTitle,setSubTitle] = useState("")
    const [description,setDescription] = useState("")
    const [category,setCategory] = useState("")
    const [level,setLevel] = useState("")
    const [price,setPrice] = useState("")
    const [isPublished,setIsPublished] = useState(false)
   const thumb=useRef()
   const [frontendImage,setFrontendImage] = useState(null)
   const [backendImage,setBackendImage] = useState(null)
   let [loading,setLoading] = useState(false)
   const dispatch = useDispatch()
   const {courseData} = useSelector(state=>state.course)



    const getCourseById = async () => {
      try {
        const result = await axios.get(serverUrl + `/api/course/getcourse/${courseId}` , {withCredentials:true})
          setSelectedCourse(result.data)
          console.log(result)
        
      } catch (error) {
        console.log(error)
      }
      
    }
    useEffect(() => {
  if (selectedCourse) {
    setTitle(selectedCourse.title || "")
    setSubTitle(selectedCourse.subTitle || "")
    setDescription(selectedCourse.description || "")
    setCategory(selectedCourse.category || "")
    setLevel(selectedCourse.level || "")
    setPrice(selectedCourse.price || "")
    setFrontendImage(selectedCourse.thumbnail || img)
    setIsPublished(selectedCourse?.isPublished)


  }
}, [selectedCourse])

    useEffect(()=>{
      getCourseById()

    },[])
  const handleThumbnail = (e)=>{
    const file = e.target.files[0]
    setBackendImage(file)
    setFrontendImage(URL.createObjectURL(file))
  }


const editCourseHandler = async () => {
  setLoading(true);
  const formData = new FormData();
  formData.append("title", title);
  formData.append("subTitle", subTitle);
  formData.append("description", description);
  formData.append("category", category);
  formData.append("level", level);
  formData.append("price", price);
  formData.append("thumbnail", backendImage);
  formData.append("isPublished", isPublished);

  try {
    const result = await axios.post(
      `${serverUrl}/api/course/editcourse/${courseId}`,
      formData,
      { withCredentials: true }
    );

    const updatedCourse = result.data;
    if (updatedCourse.isPublished) {
      const updatedCourses = courseData.map(c =>
        c._id === courseId ? updatedCourse : c
      );
      if (!courseData.some(c => c._id === courseId)) {
        updatedCourses.push(updatedCourse);
      }
      dispatch(setCourseData(updatedCourses));
    } else {
      const filteredCourses = courseData.filter(c => c._id !== courseId);
      dispatch(setCourseData(filteredCourses));
    }

    navigate("/courses");
    toast.success("Course Updated");
  } catch (error) {
    console.log(error);
    toast.error(error.response?.data?.message || "Something went wrong");
  } finally {
    setLoading(false);
  }
};


  const removeCourse = async () => {
    setLoading(true)
    try {
      const result = await axios.delete(serverUrl + `/api/course/removecourse/${courseId}` , {withCredentials:true})
      toast.success("Course Deleted")
       const filteredCourses = courseData.filter(c => c._id !== courseId);
      dispatch(setCourseData(filteredCourses));
      console.log(result)
      navigate("/courses")
      setLoading(false)

    } catch (error) {
      console.log(error)
      toast.error(error.response.data.message)
      setLoading(false)
    }
  }

    
  return (
     <div className="max-w-5xl mx-auto p-6 mt-10 bg-white rounded-lg shadow-md">
        
      {/* Top Bar */}
      <div className="flex items-center justify-center gap-[20px] md:justify-between flex-col md:flex-row  mb-6 relative">
        <FaArrowLeftLong  className='top-[-20%] md:top-[20%] absolute left-[0] md:left-[2%] w-[22px] h-[22px] cursor-pointer' onClick={()=>navigate("/courses")}/>
        <h2 className="text-2xl font-semibold md:pl-[60px]">Add detail information regarding course</h2>
        <div className="space-x-2 space-y-2 ">
          <button className="bg-black text-white px-4 py-2 rounded-md" onClick={()=>navigate(`/createlecture/${selectedCourse?._id}`)}>Go to lectures page</button>
          
        </div>
      </div>

      {/* Form Box */}
      <div className="bg-gray-50 p-6 rounded-md">
        <h3 className="text-lg font-medium mb-4">Basic Course Information</h3>
        <div className="space-x-2 space-y-2 ">
          {!isPublished? <button className="bg-green-100 text-green-600 px-4 py-2 rounded-md border-1" onClick={()=>setIsPublished(prev=>!prev)}>Click to Publish</button> 
          :<button className="bg-red-100 text-red-600 px-4 py-2 rounded-md border-1" onClick={()=>setIsPublished(prev=>!prev)}>Click to UnPublish</button>
          }
          <button className="bg-red-600 text-white px-4 py-2 rounded-md" disabled={loading} onClick={removeCourse}>{loading?<ClipLoader size={30} color='white'/> :"Remove Course"}</button>
        </div>

        <form className="space-y-6" onSubmit={(e)=>e.preventDefault()}>
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input type="text" placeholder="Course Title" className="w-full border px-4 py-2 rounded-md" onChange={(e)=>setTitle(e.target.value)} value={title}/>
          </div>

          {/* Subtitle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
            <input type="text" placeholder="Subtitle" className="w-full border px-4 py-2 rounded-md" onChange={(e)=>setSubTitle(e.target.value)} value={subTitle} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea placeholder="Course description" className="w-full border px-4 py-2 rounded-md h-24 resize-none" onChange={(e)=>setDescription(e.target.value)} value={description}></textarea>
          </div>

          {/* Category, Level, Price - Flex row */}
          <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
            {/* Category */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select className="w-full border px-4 py-2 rounded-md bg-white" onChange={(e)=>setCategory(e.target.value)} value={category}>
                <option value="">Select Category</option>
                 <option value="App Development">App Development</option>
                             <option value="AI/ML">AI/ML</option>
                            <option value="AI Tools">AI Tools
                            </option>
                             <option value="Data Science">Data Science</option>
                            <option value="Data Analytics">Data Analytics</option>
                            <option value="Ethical Hacking">Ethical Hacking</option>
                            <option value="UI UX Designing">UI UX Designing</option>
                            <option value="Web Development">Web Development</option>
                            <option value="Others">Others</option>
              </select>
            </div>

            {/* Level */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Course Level</label>
              <select className="w-full border px-4 py-2 rounded-md bg-white" onChange={(e)=>setLevel(e.target.value)} value={level} >
                <option value="">Select Level</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            {/* Price */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (INR)</label>
              <input type="number" placeholder="₹" className="w-full border px-4 py-2 rounded-md" onChange={(e)=>setPrice(e.target.value)} value={price} />
            </div>
          </div>

          {/* Thumbnail */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Thumbnail</label>
            <input type="file" ref={thumb} hidden className="w-full border px-4 py-2 rounded-md" onChange={handleThumbnail} accept='image/*' />
          </div>

          <div  className='relative w-[300px]
          h-[170px]'><img src={frontendImage} alt="" className='w-[100%]
          h-[100%] border-1 border-black rounded-[5px]' onClick={()=>thumb.current.click()} />
          <MdEdit className='w-[20px] h-[20px] absolute top-2 right-2  ' onClick={()=>thumb.current.click()}/> </div>

          <div className='flex items-center justify-start gap-[15px]'>
            <button className='bg-[#e9e8e8] hover:bg-red-200 text-black border-1 border-black cursor-pointer px-4 py-2 rounded-md' onClick={()=>navigate("/courses")}>Cancel</button>
            <button className='bg-black text-white px-7 py-2 rounded-md hover:bg-gray-500 cursor-pointer' disabled={loading} onClick={editCourseHandler}>{loading ? <ClipLoader size={30} color='white'/>:"Save"}</button>
            
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddCourses
