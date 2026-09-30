"use client";
import React, { useRef, useState } from "react";

// Portrait (9:16) video story inside a white card, details below the frame.
export default function HomeVideoStory({ video, stats }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);

  const play = () => {
    const v = ref.current;
    if (!v) return;
    v.play();
    setPlaying(true);
  };

  return (
    <div className="rt-vstory">
      <div className={`rt-vstory__frame${playing ? " is-playing" : ""}`}>
        <div className="rt-vstory__bg" style={{ backgroundImage: `url(${video.poster})` }}></div>
        <video
          ref={ref}
          src={video.src}
          poster={video.poster}
          playsInline
          controls={playing}
          preload="metadata"
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
        {!playing && (
          <>
            <span className="rt-story__chips">
              <span className="rt-chip"><span className="rt-chip__dot"></span>Video story</span>
              <span className="rt-chip">{video.duration}</span>
            </span>
            <button type="button" className="rt-vstory__play" onClick={play} aria-label="Play video story">
              <i className="icon-play text-14"></i>
            </button>
          </>
        )}
      </div>

      <div className="rt-vstory__body">
        <p className="rt-vstory__quote">“{video.quote}”</p>
        <div className="rt-vstory__name">{video.author}</div>
        <div className="rt-vstory__course">{video.position}</div>
        <div className="rt-vstory__stats">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="rt-vstory__num">{s.value}</div>
              <div className="rt-vstory__label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
