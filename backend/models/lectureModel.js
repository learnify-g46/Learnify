import mongoose from "mongoose";

const lectureSchema = new mongoose.Schema({
    lectureTitle:{
        type:String,
        required:true
    },
    videoUrl:{
        type:String
    },
    resources:[{
        name:{ type:String },
        url:{ type:String },
        // AI summary of this note (JSON text), made once and reused for every student
        summary:{ type:String },
        summaryAt:{ type:Date }
    }],
    isPreviewFree:{
        type:Boolean
    },
    
},{timestamps:true})


const Lecture = mongoose.model("Lecture" , lectureSchema)

export default Lecture