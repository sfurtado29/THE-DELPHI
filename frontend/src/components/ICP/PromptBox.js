// frontend/src/components/ICP/PromptBox.js

import React, { useState } from "react";
import "../../styles/promptbox.css";

export default function PromptBox({ onSend }) {
  const [text, setText] = useState("");

  // Trigger send
  const handleSend = () => {
    if (!text.trim()) return;

    // Call parent function
    if (onSend) {
      onSend(text);
    }

    // Clear textbox like ChatGPT
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
        >
          ➤
        </button>
      </div>
    </div>
  );
}
