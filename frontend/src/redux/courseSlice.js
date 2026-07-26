import { createSlice } from "@reduxjs/toolkit"

const courseSlice=createSlice({
    name:"course",
    initialState:{
        creatorCourseData:[],
        courseData:[],
        selectedCourseData:null
        

    },
    reducers:{
        setCreatorCourseData:(state,action)=>{
        state.creatorCourseData=action.payload
        },
        setCourseData:(state,action)=>{
            state.courseData = action.payload
        },
        setSelectedCourseData:(state,action)=>{
            state.selectedCourseData=action.payload
        }
    }
})

export const {setCreatorCourseData}=courseSlice.actions
export const {setCourseData} = courseSlice.actions
export const {setSelectedCourseData} = courseSlice.actions
export default courseSlice.reducer