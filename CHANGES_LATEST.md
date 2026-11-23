# Latest changes

## 1. Student ko naya video / PDF dikh nahi raha tha  (fixed)
Root cause: course + lectures app ke start pe sirf ek baar fetch hote the. Ab `ViewLecture` aur `ViewCourse`
page khulte hi fresh data laate hain aur student jab tab pe wapas aata hai tab bhi refresh hota hai
(`frontend/src/customHooks/useRefreshCourses.jsx`). Selected lecture ab hamesha latest data se aata hai.
`getCourseById` ab lectures + reviews populate karta hai.

## 2. Delete + Download
- Teacher (Edit Lecture page): current video ka preview + "Delete video" button; PDF/study-material delete pehle se tha, ab confirm ke saath
  aur Cloudinary se file bhi hat jaati hai (best effort). Naya endpoint: `POST /api/course/removelecturevideo/:lectureId`.
- Student (Lecture page): "Download video" button (enrolled students) + har study material pe "Download" button (naam ke saath save hota hai).
- Security: edit / delete video / delete resource / delete lecture ab sirf us course ke teacher ke liye (pehle koi bhi logged-in user kar sakta tha).
- Bug fix: lecture ka title edit karne par "Is this video FREE" flag reset ho jaata tha - ab nahi hota. Edit page refresh pe crash nahi karta.

## 3. Teacher dashboard (real analytics)
Naya endpoint `GET /api/course/creator-analytics?days=7|30|90`. Charts: New Enrollments & Revenue (din-wise), Student Completion by Course
(real % - Progress data se), Enrolled vs Completed, Quiz & Assignment Performance. Data na ho to chart khali dikhane ke bajaye saaf message aata hai.
Naya model `Enrollment` (kaun, kis course me, kab, kitne paise) - free aur paid dono enrollment pe likha jaata hai.
Purane enrollments (jab date record nahi hoti thi) totals me ginte hain par trend chart me nahi - dashboard pe ye likha aata hai.

## 4. Search with AI
- Mute / Unmute button (preference save rehti hai) - voice reply aur mic-start sound dono band.
- Type karte hi (300ms ke baad) matching courses dikhte hain (naya `POST /api/ai/live-search`, AI call nahi, sasta + fast). Enter / button / mic se full AI search pehle jaisa.
- Full search ab pehle seedha match dekhta hai, AI sirf tab jab kuch na mile; AI fail ho to bhi 500/hang nahi.
- Search text ab plain text maana jaata hai (pehle `(` ya `c++` type karne pe regex error aa sakta tha).

## 5. Bugs jo testing me mile aur fix kiye
- Student ki Assignment list poori tarah toot rahi thi (`.select()` ka galat use) - fixed.
- PDF text extraction kabhi-kabhi pehli baar "bad XRef entry" se fail hota tha - ab retry hota hai.

## Pre-existing cheezein jo mili (touch nahi ki)
- Kisi protected page (jaise /viewlecture/...) pe browser refresh karne se app home pe bhej deta hai (user load hone se pehle redirect).
- `/api/course/getpublishedcoures` public hai aur saare lectures ke video URL bhej deta hai - "locked" lectures sirf frontend me lock hote hain.
- `verifyPayment` userId client se leta hai.
- Cloudinary free account par PDF/ZIP delivery default me band hoti hai: Cloudinary Settings -> Security -> "Allow delivery of PDF and ZIP files" ON karo, warna PDF open/download nahi hongi.
