import React, { useEffect, useRef, useState } from 'react'
import ai from "../assets/ai.png"
import ai1 from "../assets/SearchAi.png"
import { RiMicAiFill } from "react-icons/ri";
import { FaSearch } from "react-icons/fa";
import axios from 'axios';
import { serverUrl } from '../App';
import { useNavigate } from 'react-router-dom';
import start from "../assets/start.mp3"
import { FaArrowLeftLong } from "react-icons/fa6";
function SearchWithAi() {
  const [input, setInput] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [listening, setListening] = useState(false)
  const [searching, setSearching] = useState(false)
  const navigate = useNavigate();

  // Keep one Audio instance and one SpeechRecognition instance for the whole
  // component lifetime instead of re-creating them on every render — this
  // was the root cause of the assistant sometimes speaking the same result
  // twice (a stray earlier recognition instance was still alive/listening).
  const startSoundRef = useRef(null)
  const recognitionRef = useRef(null)
  const isSearchingRef = useRef(false) // guards against double-submitting the same query

  if (!startSoundRef.current) startSoundRef.current = new Audio(start)

  useEffect(() => {
    const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionApi) {
      console.log("Speech recognition not supported");
      return;
    }
    const recognition = new SpeechRecognitionApi();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript.trim();
      setInput(transcript);
      handleRecommendation(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;

    // Stop any in-progress recognition session if the user navigates away
    return () => {
      try { recognition.stop(); } catch { /* already stopped */ }
    };
  }, []);

  function speak(message) {
    // Cancel any speech that might already be queued/playing so the same
    // sentence never overlaps or repeats.
    window.speechSynthesis.cancel();
    let utterance = new SpeechSynthesisUtterance(message);
    window.speechSynthesis.speak(utterance);
  }

  const handleSearch = () => {
    const recognition = recognitionRef.current;
    if (!recognition || listening) return; // already listening — ignore extra clicks
    setListening(true)
    startSoundRef.current.currentTime = 0
    startSoundRef.current.play()
    try {
      recognition.start();
    } catch {
      // "already started" if a click slips through — safe to ignore
      setListening(false)
    }
  };

  const handleRecommendation = async (query) => {
    const trimmed = (query || '').trim()
    if (!trimmed || isSearchingRef.current) return; // ignore empty query / duplicate in-flight call
    isSearchingRef.current = true
    setSearching(true)
    try {
      const result = await axios.post(`${serverUrl}/api/ai/search`, { input: trimmed }, { withCredentials: true });
      setRecommendations(result.data);
      if (result.data.length > 0) {
        speak("These are the top courses I found for you")
      } else {
        speak("No courses found")
      }
    } catch (error) {
      console.log(error);
    } finally {
      setListening(false)
      setSearching(false)
      isSearchingRef.current = false
    }
  };

  const handleTypedSubmit = (e) => {
    e.preventDefault()
    handleRecommendation(input)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-gray-900 text-white flex flex-col items-center px-4 py-16">
      
      {/* Search Container */}
      <div className="bg-white shadow-xl rounded-3xl p-6 sm:p-8 w-full max-w-2xl text-center relative">
        <FaArrowLeftLong  className='text-[black] w-[22px] h-[22px] cursor-pointer absolute' onClick={()=>navigate("/")}/>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-600 mb-6 flex items-center justify-center gap-2">
          <img src={ai} className='w-8 h-8 sm:w-[30px] sm:h-[30px]' alt="AI" />
          Search with <span className='text-[#CB99C7]'>AI</span>
        </h1>

        <form onSubmit={handleTypedSubmit} className="flex items-center bg-gray-700 rounded-full overflow-hidden shadow-lg relative w-full ">

          <input
            type="text"
            className="flex-grow px-4 py-3 pr-24 sm:pr-28 bg-transparent text-white placeholder-gray-400 focus:outline-none text-sm sm:text-base"
            placeholder="What do you want to learn? (e.g. AI, MERN, Cloud...)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          {/* Typed search — submits on Enter (form onSubmit) or on click */}
          <button
            type="submit"
            disabled={!input.trim() || searching}
            className="absolute right-14 sm:right-16 bg-white rounded-full disabled:opacity-40 w-10 h-10 flex items-center justify-center"
            title="Search"
          >
            <FaSearch className="w-4 h-4 text-[#cb87c5]" />
          </button>

          {/* Voice search */}
          <button
            type="button"
            className="absolute right-2 bg-white rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-40"
            onClick={handleSearch}
            disabled={listening}
            title="Search by voice"
          >
            <RiMicAiFill className={`w-5 h-5 text-[#cb87c5] ${listening ? "animate-pulse" : ""}`} />
          </button>
        </form>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 ? (
        <div className="w-full max-w-6xl mt-12 px-2 sm:px-4">
          <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-white text-center flex items-center justify-center gap-3">
            <img src={ai1} className="w-10 h-10 sm:w-[60px] sm:h-[60px] p-2 rounded-full" alt="AI Results" />
            AI Search Results 
          </h2>
       

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {recommendations.map((course, index) => (
              <div
                key={index}
                className="bg-white text-black p-5 rounded-2xl shadow-md hover:shadow-indigo-500/30 transition-all duration-200 border border-gray-200 cursor-pointer hover:bg-gray-200"
                onClick={() => navigate(`/viewcourse/${course._id}`)}
              >
                <h3 className="text-lg font-bold sm:text-xl">{course.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{course.category}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        listening ? (
          <h1 className='text-center text-xl sm:text-2xl mt-10 text-gray-400'>Listening...</h1>
        ) : searching ? (
          <h1 className='text-center text-xl sm:text-2xl mt-10 text-gray-400'>Searching...</h1>
        ) : (
          <h1 className='text-center text-xl sm:text-2xl mt-10 text-gray-400'>No Courses Found</h1>
        )
      )}
    </div>
  );
}

export default SearchWithAi;
