import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { FaLock, FaPlayCircle, FaTrophy, FaCheckCircle, FaFileAlt, FaFilePdf, FaFileWord, FaFilePowerpoint, FaDownload, FaClipboardList, FaExternalLinkAlt } from 'react-icons/fa';
import { FaArrowLeftLong } from "react-icons/fa6";
import { toast } from 'react-toastify';
import { useChatContext } from '../context/ChatContext';
import axios from 'axios';
import { serverUrl } from '../App';
import useRefreshCourses from '../customHooks/useRefreshCourses';

const getFileIcon = (name = "") => {
  const ext = name.split(".").pop()?.toLowerCase()
  if (ext === "pdf") return <FaFilePdf className="text-red-500 shrink-0" />
  if (ext === "doc" || ext === "docx") return <FaFileWord className="text-blue-500 shrink-0" />
  if (ext === "ppt" || ext === "pptx") return <FaFilePowerpoint className="text-orange-500 shrink-0" />
  return <FaFileAlt className="text-gray-500 shrink-0" />
}

// Cloudinary serves image/video files inline; the fl_attachment flag makes the browser
// download them (with a readable name) instead of just opening them. Raw files
// (docx/pptx) already download, so they are returned unchanged.
const toDownloadUrl = (url, filename = "") => {
  if (!url || !/\/(image|video)\/upload\//.test(url)) return url
  const safe = filename.replace(/\.[^/.]+$/, "").replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80)
  return url.replace("/upload/", `/upload/fl_attachment${safe ? ":" + safe : ""}/`)
}

function ViewLecture() {
  const { courseId } = useParams();
  useRefreshCourses(courseId)
  const { courseData } = useSelector((state) => state.course);
  const {userData} = useSelector((state) => state.user)
  const selectedCourse = courseData?.find((course) => course._id === courseId);
  const navigate = useNavigate()
  const courseCreator = userData?._id === selectedCourse?.creator ? userData : null;
  const { setChatContext } = useChatContext()
  const [completedLectures, setCompletedLectures] = useState([])

  // Enrolled users (or the course's own creator) get full access.
  // Everyone else only gets lectures marked isPreviewFree.
  const isEnrolled = userData?.enrolledCourses?.some(c => {
    const enrolledId = typeof c === 'string' ? c : c._id;
    return enrolledId?.toString() === courseId?.toString();
  });
  const hasFullAccess = isEnrolled || !!courseCreator;

  const isLectureLocked = (lecture) => !hasFullAccess && !lecture?.isPreviewFree;

  const firstUnlockedLecture =
    selectedCourse?.lectures?.find((lec) => !isLectureLocked(lec)) || null;

  // Keep only the chosen lecture's id; the lecture itself is always read from the
  // latest course data so a refreshed video/resource list shows up immediately.
  const [selectedLectureId, setSelectedLectureId] = useState(null);
  const chosen = selectedCourse?.lectures?.find((lec) => lec._id === selectedLectureId);
  const selectedLecture = (chosen && !isLectureLocked(chosen)) ? chosen : firstUnlockedLecture;

  // Give the global chatbot context about what the student is currently studying
  useEffect(() => {
    setChatContext({
      courseTitle: selectedCourse?.title || null,
      lectureTitle: selectedLecture?.lectureTitle || null
    })
    return () => setChatContext({ courseTitle: null, lectureTitle: null })
  }, [selectedCourse, selectedLecture])

  // Fetch this student's progress for this course (which lectures are already completed)
  useEffect(() => {
    const fetchProgress = async () => {
      if (!userData || !hasFullAccess) return
      try {
        const result = await axios.get(serverUrl + `/api/progress/course/${courseId}`, { withCredentials: true })
        setCompletedLectures(result.data?.completedLectures?.map(id => id.toString()) || [])
      } catch (error) {
        console.log(error)
      }
    }
    fetchProgress()
  }, [courseId, userData, hasFullAccess])

  // Track "last watched" whenever the student opens a lecture
  useEffect(() => {
    const trackLastWatched = async () => {
      if (!userData || !hasFullAccess || !selectedLecture?._id) return
      try {
        await axios.post(serverUrl + "/api/progress/last-watched", {
          courseId, lectureId: selectedLecture._id
        }, { withCredentials: true })
      } catch (error) {
        console.log(error)
      }
    }
    trackLastWatched()
  }, [selectedLecture?._id])

  const handleSelectLecture = (lecture) => {
    if (isLectureLocked(lecture)) {
      toast.error("Enroll in this course to unlock this lecture")
      return
    }
    setSelectedLectureId(lecture._id)
  }

  // Mark the current lecture complete once the video finishes playing
  const handleVideoEnded = async () => {
    if (!userData || !selectedLecture?._id) return
    try {
      const result = await axios.post(serverUrl + "/api/progress/complete", {
        courseId, lectureId: selectedLecture._id
      }, { withCredentials: true })
      setCompletedLectures(prev => prev.includes(selectedLecture._id) ? prev : [...prev, selectedLecture._id])
      toast.success("Lecture marked as completed ✓")

      // Gamification feedback (only present the first time a lecture is completed)
      const gamification = result.data?.gamification
      if (gamification) {
        setTimeout(() => toast.success(`+${gamification.xpEarned} XP 🎉`), 400)
        gamification.newBadges?.forEach((badge, i) => {
          setTimeout(() => toast.success(`Badge unlocked: ${badge.emoji} ${badge.label}`), 900 + i * 500)
        })
      }
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 pt-[90px] flex flex-col md:flex-row gap-6 transition-colors">

      {/* Left - Video & Course Info */}
      <div className="w-full md:w-2/3 bg-white dark:bg-gray-900 rounded-2xl shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-800 transition-colors">
        {/* Course Details */}
        <div className="mb-6" >

          <h1 className="text-xl sm:text-2xl font-bold flex items-center justify-start gap-3 sm:gap-[20px] text-gray-800 dark:text-gray-100"><FaArrowLeftLong  className='text-black dark:text-white w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] cursor-pointer shrink-0' onClick={()=>navigate("/")}/><span className="truncate">{selectedCourse?.title}</span></h1>

          <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
            <span>Category: {selectedCourse?.category}</span>
            <span>Level: {selectedCourse?.level}</span>
          </div>
          {!hasFullAccess && (
            <div className="mt-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 text-sm rounded-lg px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span>You're viewing preview lectures only. Enroll to unlock the full course.</span>
              <button
                className="bg-black dark:bg-white dark:text-black text-white text-xs px-3 py-1.5 rounded whitespace-nowrap w-full sm:w-auto"
                onClick={() => navigate(`/viewcourse/${courseId}`)}
              >
                Go to Enroll
              </button>
            </div>
          )}
        </div>

        {/* Video Player */}
        <div className="aspect-video bg-black rounded-xl overflow-hidden mb-4 border border-gray-300 dark:border-gray-700">
          {selectedLecture?.videoUrl ? (
            <video
              src={selectedLecture.videoUrl}
              controls
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
              onEnded={handleVideoEnded}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-white text-center px-4">
              Select a lecture to start watching
            </div>
          )}
        </div>

        {/* Selected Lecture Info */}
        <div className="mt-2 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{selectedLecture?.lectureTitle}</h2>
          {selectedLecture?._id && completedLectures.includes(selectedLecture._id) && (
            <FaCheckCircle className="text-green-500" title="Completed" />
          )}
          {selectedLecture?.videoUrl && hasFullAccess && (
            <a
              href={toDownloadUrl(selectedLecture.videoUrl, selectedLecture.lectureTitle)}
              download
              className="ml-auto flex items-center gap-1.5 text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              title="Download this lecture video"
            >
              <FaDownload /> Download video
            </a>
          )}
        </div>

        {/* Study Materials / Resources */}
        {selectedLecture?.resources?.length > 0 && (
          <div className="mt-4 border-t border-gray-200 dark:border-gray-800 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <FaFileAlt className="text-gray-400" /> Study Materials
            </h3>
            <div className="space-y-2">
              {selectedLecture.resources.map((res) => (
                <div
                  key={res._id}
                  className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5"
                >
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 min-w-0 flex-1 hover:underline"
                    title="Open in a new tab"
                  >
                    {getFileIcon(res.name)}
                    <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{res.name}</span>
                    <FaExternalLinkAlt className="text-gray-300 dark:text-gray-600 text-[10px] shrink-0" />
                  </a>
                  <a
                    href={toDownloadUrl(res.url, res.name)}
                    download={res.name}
                    className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 px-2.5 py-1 rounded-md hover:bg-white dark:hover:bg-gray-700 shrink-0"
                    title="Download"
                  >
                    <FaDownload /> Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right - All Lectures + Creator Info */}
      <div className="w-full md:w-1/3 bg-white dark:bg-gray-900 rounded-2xl shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-800 h-fit transition-colors">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">All Lectures</h2>
        <div className="flex flex-col gap-3 mb-6">
          {selectedCourse?.lectures?.length > 0 ? (
            selectedCourse.lectures.map((lecture, index) => {
              const locked = isLectureLocked(lecture)
              const done = completedLectures.includes(lecture._id)
              return (
                <button
                  key={index}
                  onClick={() => handleSelectLecture(lecture)}
                  className={`flex items-center justify-between p-3 rounded-lg border transition text-left ${
                    locked
                      ? 'opacity-60 cursor-not-allowed border-gray-200 dark:border-gray-800'
                      : selectedLecture?._id === lecture._id
                      ? 'bg-gray-200 dark:bg-gray-800 border-gray-500 dark:border-gray-600'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/60 border-gray-300 dark:border-gray-700'
                  }`}
                >
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                      {lecture.lectureTitle}
                      {done && <FaCheckCircle className="text-green-500 text-xs shrink-0" />}
                    </h4>
                    {locked && <span className="text-xs text-gray-500 dark:text-gray-400">Enroll to unlock</span>}
                  </div>
                  {locked ? (
                    <FaLock className="text-gray-500 dark:text-gray-400 text-lg shrink-0" />
                  ) : (
                    <FaPlayCircle className="text-black dark:text-white text-xl shrink-0" />
                  )}
                </button>
              )
            })
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No lectures available.</p>
          )}
        </div>

        {hasFullAccess && (
          <button
            onClick={() => navigate(`/takequiz/${courseId}`)}
            className="w-full mb-3 flex items-center justify-center gap-2 bg-black dark:bg-white dark:text-black text-white py-3 rounded-lg text-sm font-medium hover:opacity-85 transition-opacity"
          >
            <FaTrophy /> Take Quiz
          </button>
        )}

        {hasFullAccess && (
          <button
            onClick={() => navigate(`/assignments/${courseId}`)}
            className="w-full mb-6 flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <FaClipboardList /> Assignments
          </button>
        )}

        {/* Creator Info */}
        {courseCreator && (
  <div className="mt-4 border-t border-gray-200 dark:border-gray-800 pt-4">
    <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-3">Instructor</h3>
    <div className="flex items-center gap-4">
      <img
        src={courseCreator.photoUrl || '/default-avatar.png'}
        alt="Instructor"
        className="w-14 h-14 rounded-full object-cover border border-gray-200 dark:border-gray-700"
      />
      <div>
        <h4 className="text-base font-medium text-gray-800 dark:text-gray-100">{courseCreator.name}</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {courseCreator.description || 'No bio available.'}
        </p>
      </div>
    </div>
  </div>
        )}
      </div>
    </div>
  );
}

export default ViewLecture;
