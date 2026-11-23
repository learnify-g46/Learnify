import React, { useEffect } from 'react'
import { serverUrl } from '../App'
import axios from 'axios'
import { setCreatorCourseData } from '../redux/courseSlice'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'react-toastify'

const getCreatorCourseData = () => {
    const dispatch = useDispatch()
    const {userData} = useSelector(state=>state.user)
  return (
    useEffect(()=>{
    const getCreatorData = async () => {
      try {
        if (!userData) return // not logged in: nothing to load, and nothing to show
        const result = await axios.get(serverUrl + "/api/course/getcreatorcourses" , {withCredentials:true})
        
         await dispatch(setCreatorCourseData(result.data))

        
        console.log(result.data)
        
      } catch (error) {
        // background load: never pop a message at the user (logged-out visitors and students hit this too)
        console.log(error)
      }
      
    }
    getCreatorData()
  },[userData])
  )
}

export default getCreatorCourseData
