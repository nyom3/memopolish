"use client";

import { useState } from 'react';

type Mode = "request_line" | "summarize" | "bulletize" | "tasks";
type Status = "idle" | "loading" | "success" | "error";

export default function PolishForm() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("request_line");
  const [extraInstruction, setExtraInstruction] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [copyButtonText, setCopyButtonText] = useState("Copy to Clipboard");

  const modes: Mode[] = ["request_line", "summarize", "bulletize", "tasks"];

  const handlePolish = () => {
    console.log("Polishing with:", { text, mode, extraInstruction });
    setStatus("loading");
    setOutput("");

    // Simulate API call
    setTimeout(() => {
      if (text.trim() === "") {
        setOutput("Error: Input memo cannot be empty.");
        setStatus("error");
      } else {
        const dummyOutput = `This is a polished version of your memo in "${mode}" mode.\n\nOriginal length: ${text.length}`;
        setOutput(dummyOutput);
        setStatus("success");
      }
    }, 1500);
  };

  const handleCopy = () => {
    if (output) {
      navigator.clipboard.writeText(output).then(() => {
        setCopyButtonText("Copied!");
        setTimeout(() => setCopyButtonText("Copy to Clipboard"), 2000);
      }).catch(err => {
        console.error("Failed to copy text: ", err);
        setCopyButtonText("Failed to copy");
        setTimeout(() => setCopyButtonText("Copy to Clipboard"), 2000);
      });
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-col space-y-4">
        {/* Input Text Area */}
        <label htmlFor="memo-input" className="font-bold">Your Memo:</label>
        <textarea
          id="memo-input"
          rows={10}
          className="p-2 border rounded"
          placeholder="Enter your rough memo here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={status === 'loading'}
        />

        {/* Mode Selection */}
        <label htmlFor="mode-select" className="font-bold">Mode:</label>
        <select 
          id="mode-select" 
          className="p-2 border rounded"
          value={mode}
          onChange={(e) => setMode(e.target.value as Mode)}
          disabled={status === 'loading'}
        >
          {modes.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {/* Extra Instruction */}
        <label htmlFor="extra-instruction" className="font-bold">Extra Instruction (Optional):</label>
        <input
          id="extra-instruction"
          type="text"
          className="p-2 border rounded"
          placeholder="e.g., Make it friendly"
          value={extraInstruction}
          onChange={(e) => setExtraInstruction(e.target.value)}
          disabled={status === 'loading'}
        />

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button 
            onClick={handlePolish}
            className="flex-1 bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 disabled:bg-blue-300"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Polishing...' : 'Polish'}
          </button>
        </div>

        {/* Status Display */}
        <div className="text-center p-2">
          Status: {status}
        </div>

        {/* Output Text Area */}
        <label htmlFor="output-area" className="font-bold">Polished Memo:</label>
        <textarea
          id="output-area"
          rows={10}
          readOnly
          className="p-2 border rounded bg-gray-100"
          placeholder="Polished output will appear here..."
          value={output}
        />
        
        {/* Copy Button */}
        <button 
          onClick={handleCopy}
          className="bg-green-500 text-white font-bold py-2 px-4 rounded hover:bg-green-700 disabled:bg-gray-400"
          disabled={!output || status === 'loading'}
        >
            {copyButtonText}
        </button>
      </div>
    </div>
  );
}
