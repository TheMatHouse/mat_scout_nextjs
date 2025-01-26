"use client";

import { useState, useRef, useEffect } from "react";

const Tooltip = ({ text, children }) => {
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState("auto");
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      setWidth(`${containerRef.current.offsetWidth}px`);
    }
  }, []);

  return (
    <div
      className="relative inline-block w-full"
      ref={containerRef}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className="absolute left-0 bottom-full mb-2 bg-black text-white text-sm p-2 rounded-lg shadow-lg z-50"
          style={{ width }}
          dangerouslySetInnerHTML={{ __html: text }}
        />
      )}
    </div>
  );
};

export default Tooltip;
