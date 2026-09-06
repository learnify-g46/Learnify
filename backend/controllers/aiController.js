import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import Course from "../models/courseModel.js";
import User from "../models/userModel.js";
dotenv.config();

// Chatbot for doubt solving - optionally scoped to a course/lecture for context
export const chatWithAi = async (req, res) => {
  try {
    const { message, courseTitle, lectureTitle } = req.body
    if (!message) {
      return res.status(400).json({ message: "Message is required" })
    }

    const ai = new GoogleGenAI({})
    const context = courseTitle
      ? `The student is currently studying the course "${courseTitle}"${lectureTitle ? `, lecture "${lectureTitle}"` : ""}. `
      : ""

    const prompt = `You are a friendly, encouraging teaching assistant on an LMS platform helping a student with their doubts.
${context}Answer the student's question clearly and concisely, using simple language and examples where helpful. If the question is unrelated to learning/education, gently redirect them back to their studies.

Student's question: ${message}`

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    })

    return res.status(200).json({ reply: response.text })
  } catch (error) {
    return res.status(500).json({ message: `Chatbot error ${error}` })
  }
}

// Personalized course recommendations based on the student's enrolled course categories
export const getRecommendations = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("enrolledCourses")
    if (!user) return res.status(404).json({ message: "User not found" })

    const enrolledCategories = [...new Set(
      (user.enrolledCourses || []).map(c => c.category).filter(Boolean)
    )]
    const enrolledIds = (user.enrolledCourses || []).map(c => c._id.toString())

    let recommended = []
    if (enrolledCategories.length > 0) {
      recommended = await Course.find({
        isPublished: true,
        category: { $in: enrolledCategories },
        _id: { $nin: enrolledIds }
      }).limit(6)
    }

    // Fallback: if no enrollments yet, or not enough matches, fill with popular published courses
    if (recommended.length < 6) {
      const existingIds = recommended.map(c => c._id.toString())
      const fallback = await Course.find({
        isPublished: true,
        _id: { $nin: [...enrolledIds, ...existingIds] }
      }).limit(6 - recommended.length)
      recommended = [...recommended, ...fallback]
    }

    return res.status(200).json(recommended)
  } catch (error) {
    return res.status(500).json({ message: `Failed to fetch recommendations ${error}` })
  }
}


export const searchWithAi = async (req,res) => {

    try {
         const { input } = req.body;
     
    if (!input) {
      return res.status(400).json({ message: "Search query is required" });
    }
 // case-insensitive
    const ai = new GoogleGenAI({});
const prompt=`You are an intelligent assistant for an LMS platform. A user will type any query about what they want to learn. Your task is to understand the intent and return one **most relevant keyword** from the following list of course categories and levels:

- App Development  
- AI/ML  
- AI Tools  
- Data Science  
- Data Analytics  
- Ethical Hacking  
- UI UX Designing  
- Web Development  
- Others  
- Beginner  
- Intermediate  
- Advanced  

Only reply with one single keyword from the list above that best matches the query. Do not explain anything. No extra text.

Query: ${input}
`

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents:prompt,
  });
  const keyword=response.text



    const courses = await Course.find({
      isPublished: true,
     $or: [
    { title: { $regex: input, $options: 'i' } },
    { subTitle: { $regex: input, $options: 'i' } },
    { description: { $regex: input, $options: 'i' } },
    { category: { $regex: input, $options: 'i' } },
    { level: { $regex: input, $options: 'i' } }
  ]
    });

    if(courses.length>0){
    return res.status(200).json(courses);
    }else{
       const courses = await Course.find({
      isPublished: true,
     $or: [
    { title: { $regex: keyword, $options: 'i' } },
    { subTitle: { $regex: keyword, $options: 'i' } },
    { description: { $regex: keyword, $options: 'i' } },
    { category: { $regex: keyword, $options: 'i' } },
    { level: { $regex: keyword, $options: 'i' } }
  ]
    });
       return res.status(200).json(courses);
    }


    } catch (error) {
        console.log(error)
    }
}