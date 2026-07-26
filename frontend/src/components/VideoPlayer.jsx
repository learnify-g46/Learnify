import React from 'react';
import myVideo from './video.mp4';

function VideoPlayer() {
  return (
    <div className="max-w-[350px] mx-auto p-4 absolute top-[55%] left-[50%]">
      <video
        src={myVideo}
        autoPlay
        loop
        controls
        className="w-full rounded-xl shadow-lg  border-2 border-white"
        
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

export default VideoPlayer;
