import React, { useEffect, useRef, useState } from 'react'
import ai from "../assets/ai.png"
import ai1 from "../assets/SearchAi.png"
import { RiMicAiFill } from "react-icons/ri";
import { FaSearch, FaVolumeUp, FaVolumeMute } from "react-icons/fa";
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
  const [liveResults, setLiveResults] = useState([])     // instant matches while typing
  const [liveLoading, setLiveLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)  // a full (AI) search has been run
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem("searchAiMuted") === "true" } catch { return false }
  })
  const navigate = useNavigate();
  const mutedRef = useRef(muted)
  const liveRequestId = useRef(0)

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

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    mutedRef.current = next
    try { localStorage.setItem("searchAiMuted", String(next)) } catch { /* storage unavailable - preference just won't persist */ }
    if (next) window.speechSynthesis?.cancel()   // silence anything currently being spoken
  }

  function speak(message) {
    if (mutedRef.current) return
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
    if (!mutedRef.current) {
      startSoundRef.current.currentTime = 0
      startSoundRef.current.play().catch(() => {})
    }
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
    setSearchError('')
    setSearching(true)
    liveRequestId.current += 1   // drop any in-flight live-search reply, the full search wins
    try {
      const result = await axios.post(`${serverUrl}/api/ai/search`, { input: trimmed }, { withCredentials: true });
      setRecommendations(result.data);
      setHasSearched(true)
      if (result.data.length > 0) {
        speak("These are the top courses I found for you")
      } else {
        speak("No courses found")
      }
    } catch (error) {
      console.log(error);
      setSearchError(error?.response?.status === 429
        ? 'Too many searches. Please wait a moment and try again.'
        : 'AI search is temporarily unavailable. You can still find courses by typing keywords above.')
    } finally {
      setListening(false)
      setSearching(false)
      isSearchingRef.current = false
    }
  };

  // Live "as you type" suggestions: waits 300ms after the last keystroke, then does a cheap
  // plain DB match (no AI). The full AI search still runs on Enter / button / voice.
  useEffect(() => {
    const term = input.trim()
    if (term.length < 2) {
      setLiveResults([])
      setLiveLoading(false)
      return
    }
    const myId = ++liveRequestId.current
    setLiveLoading(true)
    const timer = setTimeout(async () => {
      try {
        const result = await axios.post(`${serverUrl}/api/ai/live-search`, { input: term }, { withCredentials: true })
        if (liveRequestId.current === myId) setLiveResults(result.data)   // ignore out-of-order replies
      } catch (error) {
        console.log(error)
      } finally {
        if (liveRequestId.current === myId) setLiveLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [input])

  const handleInputChange = (value) => {
    setInput(value)
    // typing again means the earlier full-search results no longer match what is in the box
    if (hasSearched) { setHasSearched(false); setRecommendations([]) }
  }

  const handleTypedSubmit = (e) => {
    e.preventDefault()
    handleRecommendation(input)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-gray-900 text-white flex flex-col items-center px-4 py-16">
      
      {/* Search Container */}
      <div className="bg-white shadow-xl rounded-3xl p-6 sm:p-8 w-full max-w-2xl text-center relative">
        <FaArrowLeftLong  className='text-[black] w-[22px] h-[22px] cursor-pointer absolute' onClick={()=>navigate("/")}/>
        <button
          type="button"
          onClick={toggleMute}
          className="absolute right-4 top-4 text-gray-600 hover:text-black"
          title={muted ? "Unmute voice replies" : "Mute voice replies"}
          aria-label={muted ? "Unmute voice replies" : "Mute voice replies"}
        >
          {muted ? <FaVolumeMute className="w-5 h-5" /> : <FaVolumeUp className="w-5 h-5" />}
        </button>
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
            onChange={(e) => handleInputChange(e.target.value)}
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

      {/* Results: full AI search results once submitted, otherwise live matches while typing */}
      {(() => {
        const showFull = hasSearched
        const list = showFull ? recommendations : liveResults
        const typing = input.trim().length >= 2

        if (list.length > 0) {
          return (
            <div className="w-full max-w-6xl mt-12 px-2 sm:px-4">
              <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-white text-center flex items-center justify-center gap-3">
                <img src={ai1} className="w-10 h-10 sm:w-[60px] sm:h-[60px] p-2 rounded-full" alt="AI Results" />
                {showFull ? "AI Search Results" : "Matching courses"}
              </h2>
              {!showFull && (
                <p className="text-center text-xs text-gray-400 -mt-3 mb-5">
                  Press Enter or the search button for a full AI search
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
                {list.map((course) => (
                  <div
                    key={course._id}
                    className="bg-white text-black p-5 rounded-2xl shadow-md hover:shadow-indigo-500/30 transition-all duration-200 border border-gray-200 cursor-pointer hover:bg-gray-200"
                    onClick={() => navigate(`/viewcourse/${course._id}`)}
                  >
                    <h3 className="text-lg font-bold sm:text-xl">{course.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{course.category}{course.level ? ` · ${course.level}` : ""}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        }

        if (listening) return <h1 className='text-center text-xl sm:text-2xl mt-10 text-gray-400'>Listening...</h1>
        if (searching) return <h1 className='text-center text-xl sm:text-2xl mt-10 text-gray-400'>Searching...</h1>
        if (showFull) return <h1 className='text-center text-xl sm:text-2xl mt-10 text-gray-400'>{searchError || 'No Courses Found'}</h1>
        if (typing && liveLoading) return <h1 className='text-center text-lg mt-10 text-gray-400'>Looking for matches...</h1>
        if (typing) return <h1 className='text-center text-lg mt-10 text-gray-400'>No direct match yet — press Enter to try a full AI search</h1>
        return <h1 className='text-center text-lg mt-10 text-gray-400'>Start typing to see matching courses</h1>
      })()}
    </div>
  );
}

export default SearchWithAi;
