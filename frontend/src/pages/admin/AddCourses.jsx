import React, { useEffect, useRef, useState } from 'react'
import img from "../../assets/empty.jpg"
import { FaArrowLeftLong } from "react-icons/fa6";
import { useNavigate, useParams } from 'react-router-dom';
import { serverUrl } from '../../App';
import { MdEdit } from "react-icons/md";
import { FaBook, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
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
   const [publishing, setPublishing] = useState(false) // separate spinner so Save and Publish never fight over one flag
   const dispatch = useDispatch()
   const {courseData} = useSelector(state=>state.course)

   const lectureCount = selectedCourse?.lectures?.length || 0

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

  // Keeps the Redux course list (used by the /courses page) in sync after any
  // save/publish — shared by both actions so the behavior stays identical.
  const syncCourseDataInRedux = (updatedCourse) => {
    if (updatedCourse.isPublished) {
      const updatedCourses = courseData.map(c => c._id === courseId ? updatedCourse : c)
      if (!courseData.some(c => c._id === courseId)) {
        updatedCourses.push(updatedCourse)
      }
      dispatch(setCourseData(updatedCourses))
    } else {
      const filteredCourses = courseData.filter(c => c._id !== courseId)
      dispatch(setCourseData(filteredCourses))
    }
  }

const editCourseHandler = async () => {
  if (!level) {
    toast.error("Please select a course level before saving")
    return
  }
  setLoading(true);
  const formData = new FormData();
  formData.append("title", title);
  formData.append("subTitle", subTitle);
  formData.append("description", description);
  formData.append("category", category);
  formData.append("level", level);
  formData.append("price", price);
  if (backendImage) formData.append("thumbnail", backendImage); // only send if a new file was actually picked
  formData.append("isPublished", isPublished);

  try {
    const result = await axios.post(
      `${serverUrl}/api/course/editcourse/${courseId}`,
      formData,
      { withCredentials: true }
    );

    setSelectedCourse(result.data)
    syncCourseDataInRedux(result.data);

    navigate("/courses");
    toast.success("Course Updated");
  } catch (error) {
    console.log(error);
    toast.error(error.response?.data?.message || "Something went wrong");
  } finally {
    setLoading(false);
  }
};

  // Publish/Unpublish used to only flip a LOCAL checkbox-like state — the
  // change was lost the moment the teacher hit the Back arrow instead of the
  // separate "Save" button, so the course silently never actually published.
  // This now saves to the backend immediately, with the same validation a
  // real LMS enforces before making a course live.
  const handlePublishToggle = async () => {
    const nextPublishState = !isPublished

    if (nextPublishState) {
      if (!level) {
        toast.error("Please select a course level before publishing")
        return
      }
      if (lectureCount === 0) {
        toast.error("Add at least 1 lecture before publishing this course")
        return
      }
    }

    setPublishing(true)
    const formData = new FormData();
    formData.append("title", title);
    formData.append("subTitle", subTitle);
    formData.append("description", description);
    formData.append("category", category);
    formData.append("level", level);
    formData.append("price", price);
    if (backendImage) formData.append("thumbnail", backendImage);
    formData.append("isPublished", nextPublishState);

    try {
      const result = await axios.post(
        `${serverUrl}/api/course/editcourse/${courseId}`,
        formData,
        { withCredentials: true }
      );
      setSelectedCourse(result.data)
      setIsPublished(result.data.isPublished)
      syncCourseDataInRedux(result.data)
      toast.success(result.data.isPublished
        ? "Course Published! Students can now find and enroll in it. 🎉"
        : "Course Unpublished — hidden from students for now.")
    } catch (error) {
      console.log(error)
      toast.error(error.response?.data?.message || "Failed to update publish status")
    } finally {
      setPublishing(false)
    }
  }


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
          <button className="bg-black text-white px-4 py-2 rounded-md flex items-center gap-2" onClick={()=>navigate(`/createlecture/${selectedCourse?._id}`)}>
            <FaBook /> Manage Lectures ({lectureCount})
          </button>
        </div>
      </div>

      {/* Form Box */}
      <div className="bg-gray-50 p-6 rounded-md">
        <h3 className="text-lg font-medium mb-4">Basic Course Information</h3>

        {/* Clear, unambiguous status + publish action */}
        <div className="mb-4 p-4 rounded-md border bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            {isPublished ? (
              <>
                <FaCheckCircle className="text-green-600 text-xl" />
                <div>
                  <p className="font-medium text-green-700">Published</p>
                  <p className="text-xs text-gray-500">Visible to students right now.</p>
                </div>
              </>
            ) : (
              <>
                <FaExclamationCircle className="text-yellow-500 text-xl" />
                <div>
                  <p className="font-medium text-yellow-700">Draft</p>
                  <p className="text-xs text-gray-500">
                    Not visible to students yet. {lectureCount === 0 && "Add at least 1 lecture to publish."}
                  </p>
                </div>
              </>
            )}
          </div>
          <button
            className={`px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 min-w-[160px] ${
              isPublished
                ? "bg-red-100 text-red-600 border border-red-200 hover:bg-red-200"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
            disabled={publishing}
            onClick={handlePublishToggle}
          >
            {publishing ? <ClipLoader size={20} color={isPublished ? "black" : "white"} /> : (isPublished ? "Unpublish Course" : "🚀 Publish Course")}
          </button>
        </div>

        <div className="space-x-2 space-y-2 mb-2">
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
              <select required className="w-full border px-4 py-2 rounded-md bg-white" onChange={(e)=>setLevel(e.target.value)} value={level} >
                <option value="" disabled>Select Level</option>
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
