import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { FaLock, FaPlayCircle, FaTrophy } from 'react-icons/fa';
import { FaArrowLeftLong } from "react-icons/fa6";
import { toast } from 'react-toastify';
import ChatBot from '../components/ChatBot';

function ViewLecture() {
  const { courseId } = useParams();
  const { courseData } = useSelector((state) => state.course);
  const {userData} = useSelector((state) => state.user)
  const selectedCourse = courseData?.find((course) => course._id === courseId);
  const navigate = useNavigate()
  const courseCreator = userData?._id === selectedCourse?.creator ? userData : null;

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

  const [selectedLecture, setSelectedLecture] = useState(firstUnlockedLecture);

  useEffect(() => {
    // If course data loads after mount (e.g. on refresh), sync the default lecture
    if (!selectedLecture && firstUnlockedLecture) {
      setSelectedLecture(firstUnlockedLecture)
    }
  }, [selectedCourse])

  const handleSelectLecture = (lecture) => {
    if (isLectureLocked(lecture)) {
      toast.error("Enroll in this course to unlock this lecture")
      return
    }
    setSelectedLecture(lecture)
  }


  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col md:flex-row gap-6">
     
      {/* Left - Video & Course Info */}
      <div className="w-full md:w-2/3 bg-white rounded-2xl shadow-md p-6 border border-gray-200">
        {/* Course Details */}
        <div className="mb-6" >
           
          <h1 className="text-2xl font-bold flex items-center justify-start gap-[20px]  text-gray-800"><FaArrowLeftLong  className=' text-black w-[22px] h-[22px] cursor-pointer' onClick={()=>navigate("/")}/>{selectedCourse?.title}</h1>
          
          <div className="mt-2 flex gap-4 text-sm text-gray-500 font-medium">
            <span>Category: {selectedCourse?.category}</span>
            <span>Level: {selectedCourse?.level}</span>
          </div>
          {!hasFullAccess && (
            <div className="mt-3 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span>You're viewing preview lectures only. Enroll to unlock the full course.</span>
              <button
                className="bg-black text-white text-xs px-3 py-1.5 rounded whitespace-nowrap w-full sm:w-auto"
                onClick={() => navigate(`/viewcourse/${courseId}`)}
              >
                Go to Enroll
              </button>
            </div>
          )}
        </div>

        {/* Video Player */}
        <div className="aspect-video bg-black rounded-xl overflow-hidden mb-4 border border-gray-300">
          {selectedLecture?.videoUrl ? (
            <video
              src={selectedLecture.videoUrl}
              controls
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-white">
              Select a lecture to start watching
            </div>
          )}
        </div>

        {/* Selected Lecture Info */}
        <div className="mt-2">
          <h2 className="text-lg font-semibold text-gray-800">{selectedLecture?.lectureTitle}</h2>
          
        </div>
      </div>

      {/* Right - All Lectures + Creator Info */}
      <div className="w-full md:w-1/3 bg-white rounded-2xl shadow-md p-6 border border-gray-200 h-fit">
        <h2 className="text-xl font-bold mb-4 text-gray-800">All Lectures</h2>
        <div className="flex flex-col gap-3 mb-6">
          {selectedCourse?.lectures?.length > 0 ? (
            selectedCourse.lectures.map((lecture, index) => {
              const locked = isLectureLocked(lecture)
              return (
                <button
                  key={index}
                  onClick={() => handleSelectLecture(lecture)}
                  className={`flex items-center justify-between p-3 rounded-lg border transition text-left ${
                    locked
                      ? 'opacity-60 cursor-not-allowed border-gray-200'
                      : selectedLecture?._id === lecture._id
                      ? 'bg-gray-200 border-gray-500'
                      : 'hover:bg-gray-50 border-gray-300'
                  }`}
                >
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800">{lecture.lectureTitle}</h4>
                    {locked && <span className="text-xs text-gray-500">Enroll to unlock</span>}
                  </div>
                  {locked ? (
                    <FaLock className="text-gray-500 text-lg" />
                  ) : (
                    <FaPlayCircle className="text-black text-xl" />
                  )}
                </button>
              )
            })
          ) : (
            <p className="text-gray-500">No lectures available.</p>
          )}
        </div>

        {hasFullAccess && (
          <button
            onClick={() => navigate(`/takequiz/${courseId}`)}
            className="w-full mb-6 flex items-center justify-center gap-2 bg-black text-white py-3 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <FaTrophy /> Take Quiz
          </button>
        )}

        {/* Creator Info */}
        {courseCreator && (
  <div className="mt-4 border-t pt-4">
    <h3 className="text-md font-semibold text-gray-700 mb-3">Instructor</h3>
    <div className="flex items-center gap-4">
      <img
        src={courseCreator.photoUrl || '/default-avatar.png'}
        alt="Instructor"
        className="w-14 h-14 rounded-full object-cover border"
      />
      <div>
        <h4 className="text-base font-medium text-gray-800">{courseCreator.name}</h4>
        <p className="text-sm text-gray-600">
          {courseCreator.description || 'No bio available.'}
        </p>
      </div>
    </div>
  </div>
        )}
      </div>
      <ChatBot courseTitle={selectedCourse?.title} lectureTitle={selectedLecture?.lectureTitle} />
    </div>
  );
}

export default ViewLecture;
