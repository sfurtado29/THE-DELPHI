// frontend/src/components/ICP/PromptBox.js

import React, { useState } from "react";
import "../../styles/promptbox.css";

export default function PromptBox({ onSend }) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim()) return;

    if (onSend) {
      onSend(text);
    }

    setText("");
  };

  return (
    <div className="chatgpt-prompt-wrapper">
      <div className="chatgpt-prompt-box border-warning">
        {/* Input */}
        <textarea
          rows="1"
          value={text}
          placeholder="Requirement..."
          className="chatgpt-textarea"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        {/* Send Button */}
        <button
          className="chatgpt-send-btn"
          onClick={handleSend}
          type="button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}