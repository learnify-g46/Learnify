import Course from "../models/courseModel.js"
import User from "../models/userModel.js"
import Enrollment from "../models/enrollmentModel.js"
import Progress from "../models/progressModel.js"
import QuizAttempt from "../models/quizAttemptModel.js"
import Assignment from "../models/assignmentModel.js"
import AssignmentSubmission from "../models/assignmentSubmissionModel.js"

const round1 = (n) => Math.round(n * 10) / 10
const dayKey = (d) => new Date(d).toISOString().slice(0, 10) // UTC day

// Everything on the teacher dashboard comes from here, computed from real
// collections (Progress, Enrollment, QuizAttempt, Assignment*). Nothing is made up:
// when there is no data for a metric it is returned as null / 0 and the UI says so.
export const getCreatorAnalytics = async (req, res) => {
    try {
        const days = Math.min(90, Math.max(7, parseInt(req.query.days) || 30))
        const courses = await Course.find({ creator: req.userId })
        const courseIds = courses.map(c => c._id)

        const [progressDocs, enrollments, quizAttempts, assignments] = await Promise.all([
            Progress.find({ course: { $in: courseIds } }),
            Enrollment.find({ course: { $in: courseIds } }),
            QuizAttempt.find({ course: { $in: courseIds } }),
            Assignment.find({ course: { $in: courseIds }, status: { $ne: "draft" } })
        ])
        const submissions = await AssignmentSubmission.find({ assignment: { $in: assignments.map(a => a._id) } })

        // Who is enrolled (free AND paid courses alike) - names for the student lists
        const allStudentIds = [...new Set(courses.flatMap(c => c.enrolledStudents.map(s => s.toString())))]
        const users = allStudentIds.length
            ? await User.find({ _id: { $in: allStudentIds } }).select("name email photoUrl")
            : []
        const userById = {}
        users.forEach(u => { userById[u._id.toString()] = u })

        const enrollmentByKey = {}
        enrollments.forEach(e => { enrollmentByKey[`${e.course}|${e.student}`] = e })

        const perCourse = courses.map(course => {
            const cid = course._id.toString()
            const lectureIds = new Set(course.lectures.map(l => l.toString()))
            const totalLectures = lectureIds.size
            const enrolledIds = course.enrolledStudents.map(s => s.toString())
            const enrolledSet = new Set(enrolledIds)

            // ---- real completion % per enrolled student (no progress doc = 0%) ----
            const percentByStudent = {}
            const doneByStudent = {}
            progressDocs.filter(p => p.course.toString() === cid && enrolledSet.has(p.student.toString())).forEach(p => {
                const done = new Set(p.completedLectures.map(l => l.toString()).filter(l => lectureIds.has(l))).size
                doneByStudent[p.student.toString()] = done
                percentByStudent[p.student.toString()] = totalLectures ? Math.min(100, (done / totalLectures) * 100) : 0
            })
            const percents = enrolledIds.map(id => percentByStudent[id] || 0)
            const avgCompletion = percents.length && totalLectures ? round1(percents.reduce((a, b) => a + b, 0) / percents.length) : null
            const completedStudents = totalLectures ? percents.filter(p => p >= 100).length : 0

            // ---- revenue: recorded amount where we have it, course price otherwise ----
            const revenue = enrolledIds.reduce((sum, sid) => {
                const rec = enrollmentByKey[`${cid}|${sid}`]
                return sum + (rec ? rec.amount : (course.price || 0))
            }, 0)

            // ---- enrolled student list: same for free and paid courses ----
            const students = enrolledIds.map(sid => {
                const u = userById[sid]
                const rec = enrollmentByKey[`${cid}|${sid}`]
                return {
                    studentId: sid,
                    name: u?.name || "Unknown student",
                    email: u?.email || "",
                    photoUrl: u?.photoUrl || "",
                    enrolledAt: rec ? rec.createdAt : null,   // null = joined before dates were recorded
                    amountPaid: rec ? rec.amount : (course.price || 0),
                    completedLectures: doneByStudent[sid] || 0,
                    completionPercent: round1(percentByStudent[sid] || 0)
                }
            }).sort((a, b) => (b.enrolledAt ? new Date(b.enrolledAt).getTime() : -1) - (a.enrolledAt ? new Date(a.enrolledAt).getTime() : -1))

            // ---- quiz: each student's best attempt ----
            const best = {}
            quizAttempts.filter(a => a.course.toString() === cid && a.totalQuestions > 0).forEach(a => {
                const key = `${a.quiz}|${a.student}`
                const pct = (a.score / a.totalQuestions) * 100
                if (best[key] === undefined || pct > best[key]) best[key] = pct
            })
            const bestVals = Object.values(best)
            const quizAvgPercent = bestVals.length ? round1(bestVals.reduce((a, b) => a + b, 0) / bestVals.length) : null

            // ---- assignments ----
            const courseAssignments = assignments.filter(a => a.course.toString() === cid)
            const aIds = new Set(courseAssignments.map(a => a._id.toString()))
            const courseSubs = submissions.filter(s => aIds.has(s.assignment.toString()))
            const graded = courseSubs.filter(s => s.finalMarks !== null && s.finalMarks !== undefined)
            const assignmentAvgPercent = graded.length
                ? round1(graded.reduce((sum, s) => {
                    const a = courseAssignments.find(x => x._id.toString() === s.assignment.toString())
                    return sum + (a?.maxMarks ? (s.finalMarks / a.maxMarks) * 100 : 0)
                }, 0) / graded.length)
                : null

            return {
                courseId: cid,
                title: course.title,
                isPublished: course.isPublished,
                price: course.price || 0,
                isFree: !course.price,
                totalLectures,
                enrolled: enrolledIds.length,
                avgCompletion,
                completedStudents,
                revenue,
                quizAvgPercent,
                quizAttempts: bestVals.length,
                assignmentCount: courseAssignments.length,
                assignmentSubmissions: courseSubs.length,
                assignmentAvgPercent,
                students
            }
        })

        // ---- zero-filled daily trend of enrollments + revenue (tracked enrollments only) ----
        const start = new Date(); start.setUTCHours(0, 0, 0, 0); start.setUTCDate(start.getUTCDate() - (days - 1))
        const trendMap = {}
        for (let i = 0; i < days; i++) {
            const d = new Date(start); d.setUTCDate(start.getUTCDate() + i)
            trendMap[dayKey(d)] = { date: dayKey(d), enrollments: 0, revenue: 0 }
        }
        enrollments.forEach(e => {
            const k = dayKey(e.createdAt)
            if (trendMap[k]) { trendMap[k].enrollments += 1; trendMap[k].revenue += e.amount || 0 }
        })

        const totalEnrolledAll = perCourse.reduce((s, c) => s + c.enrolled, 0)
        const withCompletion = perCourse.filter(c => c.avgCompletion !== null && c.enrolled > 0)
        const weightedBase = withCompletion.reduce((s, c) => s + c.enrolled, 0)

        return res.status(200).json({
            rangeDays: days,
            totals: {
                courses: courses.length,
                students: new Set(courses.flatMap(c => c.enrolledStudents.map(s => s.toString()))).size,
                enrollments: totalEnrolledAll,
                revenue: perCourse.reduce((s, c) => s + c.revenue, 0),
                avgCompletion: weightedBase ? round1(withCompletion.reduce((s, c) => s + c.avgCompletion * c.enrolled, 0) / weightedBase) : null,
                completedStudents: perCourse.reduce((s, c) => s + c.completedStudents, 0)
            },
            perCourse,
            trend: Object.values(trendMap),
            // enrollments that happened before dates were tracked: counted in totals, not in the trend
            untrackedEnrollments: Math.max(0, totalEnrolledAll - enrollments.length)
        })
    } catch (error) {
        return res.status(500).json({ message: `Failed to build analytics ${error}` })
    }
}
