import axios from 'axios'
import React, { useState } from 'react'
import { FaArrowLeft, FaFilePdf, FaFileWord, FaFilePowerpoint, FaFileAlt, FaTrash, FaCloudUploadAlt } from "react-icons/fa"
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { serverUrl } from '../../App'
import { setLectureData } from '../../redux/lectureSlice'
import { toast } from 'react-toastify'
import { ClipLoader } from 'react-spinners'

const getFileIcon = (name = "") => {
  const ext = name.split(".").pop()?.toLowerCase()
  if (ext === "pdf") return <FaFilePdf className="text-red-500" />
  if (ext === "doc" || ext === "docx") return <FaFileWord className="text-blue-500" />
  if (ext === "ppt" || ext === "pptx") return <FaFilePowerpoint className="text-orange-500" />
  return <FaFileAlt className="text-gray-500" />
}

function EditLecture() {
    const [loading,setLoading]= useState(false)
    const [loading1,setLoading1]= useState(false)
    const {courseId , lectureId} = useParams()
    const {lectureData} = useSelector(state=>state.lecture)
    const dispatch = useDispatch()
    const selectedLecture = lectureData.find(lecture => lecture._id === lectureId)
    const [videoUrl,setVideoUrl] = useState(null)
    const [resourceFiles,setResourceFiles] = useState([])
    const [lectureTitle,setLectureTitle] = useState(selectedLecture.lectureTitle)
    const [isPreviewFree,setIsPreviewFree] = useState(false)
    const [existingResources, setExistingResources] = useState(selectedLecture.resources || [])
    const [removingId, setRemovingId] = useState(null)

    const editLecture = async () => {
      setLoading(true)
      try {
        const formData = new FormData()
        formData.append("lectureTitle",lectureTitle)
        if(videoUrl) formData.append("videoUrl",videoUrl)
        resourceFiles.forEach(file => formData.append("resources", file))
        formData.append("isPreviewFree",isPreviewFree)

        const result = await axios.post(serverUrl + `/api/course/editlecture/${lectureId}` , formData , {withCredentials:true})
        dispatch(setLectureData([...lectureData,result.data]))
        setExistingResources(result.data.resources || [])
        setResourceFiles([])
        toast.success("Lecture Updated")
        navigate("/courses")
        setLoading(false)
      } catch (error) {
        console.log(error)
        toast.error(error.response.data.message)
        setLoading(false)
      }
    }

    const removeExistingResource = async (resourceId) => {
      setRemovingId(resourceId)
      try {
        const result = await axios.post(serverUrl + `/api/course/removelectureresource/${lectureId}`, { resourceId }, { withCredentials: true })
        setExistingResources(result.data.resources || [])
        toast.success("Resource removed")
      } catch (error) {
        toast.error("Failed to remove resource")
      } finally {
        setRemovingId(null)
      }
    }

    const handleResourceSelect = (e) => {
      setResourceFiles(prev => [...prev, ...Array.from(e.target.files)])
      e.target.value = ""
    }

    const removeSelectedFile = (index) => {
      setResourceFiles(prev => prev.filter((_, i) => i !== index))
    }

    const removeLecture = async () => {
      setLoading1(true)
      try {
        const result = await axios.delete(serverUrl + `/api/course/removelecture/${lectureId}` , {withCredentials:true})
        toast.success("Lecture Removed")
       navigate(`/createlecture/${courseId}`)
        setLoading1(false)
      } catch (error) {
        console.log(error)
        toast.error("Lecture remove error")
        setLoading1(false)
      }
      
    }

    const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center p-4 pt-[90px] transition-colors">
      <div className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 space-y-6 transition-colors">

        {/* Header Inside Box */}
        <div className="flex items-center gap-2 mb-2">
          <FaArrowLeft className="text-gray-600 dark:text-gray-300 cursor-pointer" onClick={()=>navigate(`/createlecture/${courseId}`)} />
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Update Your Lecture</h2>
        </div>

        {/* Instruction */}
        <div>
          <button className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all text-sm" disabled={loading1} onClick={removeLecture}>
            {loading1?<ClipLoader size={30} color='white'/>:"Remove Lecture"}
          </button>
        </div>

        {/* Input Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              type="text"
              className="w-full p-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md text-sm focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none"
              placeholder={selectedLecture.lectureTitle}
              onChange={(e)=>setLectureTitle(e.target.value)}
              value={lectureTitle}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Video {!selectedLecture.videoUrl && "*"}
            </label>
            <input
              type="file"
              required={!selectedLecture.videoUrl}
              accept='video/*'
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md p-2 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-gray-700 file:text-white hover:file:bg-gray-500 dark:text-gray-300"
              onChange={(e)=>setVideoUrl(e.target.files[0])}
            />
            {selectedLecture.videoUrl && !videoUrl && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Video already uploaded. Choose a new file only to replace it.</p>
            )}
          </div>

          {/* Resources / Study Materials */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Study Materials <span className="text-gray-400 font-normal">(PDF, Word, PPT — optional, multiple allowed)</span>
            </label>

            {/* Existing resources */}
            {existingResources.length > 0 && (
              <div className="space-y-2 mb-3">
                {existingResources.map((res) => (
                  <div key={res._id} className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {getFileIcon(res.name)}
                      <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{res.name}</span>
                    </div>
                    <button
                      onClick={() => removeExistingResource(res._id)}
                      disabled={removingId === res._id}
                      className="text-red-400 hover:text-red-600 shrink-0"
                    >
                      {removingId === res._id ? <ClipLoader size={14} /> : <FaTrash />}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Newly selected files (not uploaded yet) */}
            {resourceFiles.length > 0 && (
              <div className="space-y-2 mb-3">
                {resourceFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {getFileIcon(file.name)}
                      <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{file.name}</span>
                      <span className="text-xs text-blue-500 shrink-0">(will upload on save)</span>
                    </div>
                    <button onClick={() => removeSelectedFile(index)} className="text-red-400 hover:text-red-600 shrink-0">
                      <FaTrash />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:border-gray-500 dark:hover:border-gray-500 transition-colors text-sm text-gray-500 dark:text-gray-400">
              <FaCloudUploadAlt className="text-lg" /> Click to add study material
              <input type="file" multiple accept='.pdf,.doc,.docx,.ppt,.pptx' className="hidden" onChange={handleResourceSelect} />
            </label>
          </div>

          {/* Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              className="accent-black dark:accent-white h-4 w-4"
              onChange={() => setIsPreviewFree(prev=>!prev)}
            />
            <label htmlFor="isFree" className="text-sm text-gray-700 dark:text-gray-300">Is this video FREE</label>
          </div>
        </div>
         <div>
          {loading ?<p className="text-gray-600 dark:text-gray-300 text-sm">Uploading... Please wait.</p>:""}
         </div>
        {/* Submit Button */}
        <div className="pt-4">
          <button className="w-full bg-black dark:bg-white dark:text-black text-white py-3 rounded-md text-sm font-medium hover:opacity-85 transition" disabled={loading} onClick={editLecture}>
            {loading?<ClipLoader size={30} color='white'/> :"Update Lecture"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditLecture
