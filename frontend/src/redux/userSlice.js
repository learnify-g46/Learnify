import { createSlice } from "@reduxjs/toolkit"

const userSlice=createSlice({
    name:"user",
    initialState:{
        userData:null,
        authChecked:false // true once the server has told us whether a user is logged in
    },//setUserData("ankush")<={payload}
    reducers:{
        setUserData:(state,action)=>{
        state.userData=action.payload
        state.authChecked=true
        }
    }
})

export const {setUserData}=userSlice.actions
export default userSlice.reducer