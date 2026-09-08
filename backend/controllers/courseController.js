import uploadOnCloudinary from "../configs/cloudinary.js"
import Course from "../models/courseModel.js"
import Lecture from "../models/lectureModel.js"
import User from "../models/userModel.js"

// create Courses
export const createCourse = async (req,res) => {

    try {
        const {title,category} = req.body
        if(!title || !category){
            return res.status(400).json({message:"title and category is required"})
        }
        const course = await Course.create({
            title,
            category,
            creator: req.userId
        })
        
        return res.status(201).json(course)
    } catch (error) {
         return res.status(500).json({message:`Failed to create course ${error}`})
    }
    
}

export const getPublishedCourses = async (req,res) => {
    try {
        const courses = await Course.find({isPublished:true}).populate("lectures reviews")
        if(!courses)
        {
            return res.status(404).json({message:"Course not found"})
        }

        return res.status(200).json(courses)
        
    } catch (error) {
          return res.status(500).json({message:`Failed to get All  courses ${error}`})
    }
}


export const getCreatorCourses = async (req,res) => {
    try {
        const userId = req.userId
        const courses = await Course.find({creator:userId})
        if(!courses)
        {
            return res.status(404).json({message:"Course not found"})
        }
        return res.status(200).json(courses)
        
    } catch (error) {
        return res.status(500).json({message:`Failed to get creator courses ${error}`})
    }
}

export const editCourse = async (req,res) => {
    try {
        const {courseId} = req.params;
        const {title , subTitle , description , category , level , price , isPublished } = req.body;
        let thumbnail
         if(req.file){
            thumbnail = await uploadOnCloudinary(req.file.path)
            if (!thumbnail) {
                // Cloudinary upload failed (bad/expired credentials, network
                // issue, unsupported file, etc.) — this used to fail silently
                // and still report "Course Updated" even though the photo
                // never actually saved. Now we tell the teacher clearly.
                return res.status(500).json({ message: "Failed to upload the thumbnail image. Please check the file and try again." })
            }
        }
        let course = await Course.findById(courseId)
        if(!course){
            return res.status(404).json({message:"Course not found"})
        }

        // Guard against saving an invalid/blank level (this previously caused
        // enrollment to fail later with a validation error)
        const validLevels = ['Beginner', 'Intermediate', 'Advanced']
        if (level && !validLevels.includes(level)) {
            return res.status(400).json({ message: "Invalid course level. Must be Beginner, Intermediate, or Advanced." })
        }

        const updateData = {title , subTitle , description , category , price , isPublished ,thumbnail}
        if (level) updateData.level = level // only overwrite if a valid value was actually sent

        course = await Course.findByIdAndUpdate(courseId , updateData , {new:true})
        return res.status(201).json(course)
    } catch (error) {
        return res.status(500).json({message:`Failed to update course ${error}`})
    }
}


export const getCourseById = async (req,res) => {
    try {
        const {courseId} = req.params
        let course = await Course.findById(courseId)
        if(!course){
            return res.status(404).json({message:"Course not found"})
        }
         return res.status(200).json(course)
        
    } catch (error) {
        return res.status(500).json({message:`Failed to get course ${error}`})
    }
}
export const removeCourse = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const course = await Course.findById(courseId);
    
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    await course.deleteOne();
    return res.status(200).json({ message: "Course Removed Successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({message:`Failed to remove course ${error}`})
  }
};



//create lecture

export const createLecture = async (req,res) => {
    try {
        const {lectureTitle}= req.body
        const {courseId} = req.params

        if(!lectureTitle || !courseId){
             return res.status(400).json({message:"Lecture Title required"})
        }
        const lecture = await Lecture.create({lectureTitle})
        const course = await Course.findById(courseId)
        if(course){
            course.lectures.push(lecture._id)
            
        }
        await course.populate("lectures")
        await course.save()
        return res.status(201).json({lecture,course})
        
    } catch (error) {
        return res.status(500).json({message:`Failed to Create Lecture ${error}`})
    }
    
}

export const getCourseLecture = async (req,res) => {
    try {
        const {courseId} = req.params
        const course = await Course.findById(courseId)
        if(!course){
            return res.status(404).json({message:"Course not found"})
        }
        await course.populate("lectures")
        await course.save()
        return res.status(200).json(course)
    } catch (error) {
        return res.status(500).json({message:`Failed to get Lectures ${error}`})
    }
}

export const editLecture = async (req,res) => {
    try {
        const {lectureId} = req.params
        const {isPreviewFree , lectureTitle} = req.body
        const lecture = await Lecture.findById(lectureId)
          if(!lecture){
            return res.status(404).json({message:"Lecture not found"})
        }
        if(req.files?.videoUrl?.[0]){
            const videoUrl = await uploadOnCloudinary(req.files.videoUrl[0].path)
            lecture.videoUrl = videoUrl
        }
        if(req.files?.resources?.length){
            for(const file of req.files.resources){
                const url = await uploadOnCloudinary(file.path)
                lecture.resources.push({ name: file.originalname, url })
            }
        }
        if(lectureTitle){
            lecture.lectureTitle = lectureTitle
        }
        lecture.isPreviewFree = isPreviewFree
        
         await lecture.save()
        return res.status(200).json(lecture)
    } catch (error) {
        return res.status(500).json({message:`Failed to edit Lectures ${error}`})
    }
    
}

// Remove a single resource file from a lecture (professional LMS-style resource management)
export const removeLectureResource = async (req,res) => {
    try {
        const {lectureId} = req.params
        const {resourceId} = req.body
        const lecture = await Lecture.findById(lectureId)
        if(!lecture){
            return res.status(404).json({message:"Lecture not found"})
        }
        lecture.resources = lecture.resources.filter(r => r._id.toString() !== resourceId)
        await lecture.save()
        return res.status(200).json(lecture)
    } catch (error) {
        return res.status(500).json({message:`Failed to remove resource ${error}`})
    }
}

export const removeLecture = async (req,res) => {
    try {
        const {lectureId} = req.params
        const lecture = await Lecture.findByIdAndDelete(lectureId)
        if(!lecture){
             return res.status(404).json({message:"Lecture not found"})
        }
        //remove the lecture from associated course

        await Course.updateOne(
            {lectures: lectureId},
            {$pull:{lectures: lectureId}}
        )
        return res.status(200).json({message:"Lecture Remove Successfully"})
        }
    
     catch (error) {
        return res.status(500).json({message:`Failed to remove Lectures ${error}`})
    }
}



// Enroll in a FREE course directly (no payment required)
export const enrollFreeCourse = async (req, res) => {
    try {
        const { courseId } = req.params
        const userId = req.userId

        const course = await Course.findById(courseId).populate("lectures")
        if (!course) {
            return res.status(404).json({ message: "Course not found" })
        }

        // Guard: this endpoint is only for free courses. Paid courses must go
        // through the payment flow (/api/payment/create-order + verify-payment)
        if (course.price && course.price > 0) {
            return res.status(400).json({ message: "This course is paid. Please complete payment to enroll." })
        }

        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        // Use findByIdAndUpdate with $addToSet instead of .save() so Mongoose
        // does NOT re-validate the entire document (e.g. old courses with a
        // blank "level" field would otherwise fail validation on enroll).
        await User.findByIdAndUpdate(userId, { $addToSet: { enrolledCourses: courseId } })
        await Course.findByIdAndUpdate(courseId, { $addToSet: { enrolledStudents: userId } })

        return res.status(200).json({ message: "Enrolled successfully", course, user })
    } catch (error) {
        return res.status(500).json({ message: `Failed to enroll in course ${error}` })
    }
}

//get Creator data


// controllers/userController.js

export const getCreatorById = async (req, res) => {
  try {
    const {userId} = req.body;

    const user = await User.findById(userId).select("-password"); // Exclude password

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json( user );
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    res.status(500).json({ message: "get Creator error" });
  }
};




