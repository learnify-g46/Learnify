import { useEffect } from 'react'
import axios from 'axios'
import { useDispatch } from 'react-redux'
import { serverUrl } from '../App.jsx'
import { setCourseData } from '../redux/courseSlice.js'

// The course list (with lectures, videos and study materials) used to be fetched
// once when the app first loaded, so anything a teacher uploaded afterwards was
// invisible to students until a full browser reload. Pages that show lecture
// content call this hook so they always start from fresh data and re-sync
// whenever the student comes back to the tab.
const useRefreshCourses = (dependency) => {
  const dispatch = useDispatch()

  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      try {
        const result = await axios.get(serverUrl + "/api/course/getpublishedcoures", { withCredentials: true })
        if (!cancelled) dispatch(setCourseData(result.data))
      } catch (error) {
        console.log(error)
      }
    }
    refresh()

    const onVisible = () => { if (document.visibilityState === "visible") refresh() }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [dependency])
}

export default useRefreshCourses
