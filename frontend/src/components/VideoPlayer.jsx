import React from 'react';
import myVideo from './video.mp4';

function VideoPlayer() {
  return (
    <div className="absolute -bottom-8 -right-6 w-[55%] max-w-[280px]">
      <video
        src={myVideo}
        autoPlay
        loop
        muted
        controls
        className="w-full rounded-xl shadow-xl border-4 border-white dark:border-gray-950"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

export default VideoPlayer;
