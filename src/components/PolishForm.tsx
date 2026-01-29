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
  const [copyButtonText, setCopyButtonText] = useState("クリップボードにコピー");

  const modes: Mode[] = ["request_line", "summarize", "bulletize", "tasks"];

  const handlePolish = async () => {
    setStatus("loading");
    setOutput("");

    try {
      const response = await fetch('/api/polish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, mode, extraInstruction }),
      });

      const data = await response.json();

      if (response.ok) {
        setOutput(data.output);
        setStatus("success");
      } else {
        setOutput(`エラー: ${data.error || '不明なエラーが発生しました。'}`);
        setStatus("error");
      }
    } catch (error) {
      console.error("Failed to fetch from API:", error);
      setOutput("エラー: APIとの通信に失敗しました。");
      setStatus("error");
    }
  };

  const handleCopy = () => {
    if (output) {
      navigator.clipboard.writeText(output).then(() => {
        setCopyButtonText("コピーしました！");
        setTimeout(() => setCopyButtonText("クリップボードにコピー"), 2000);
      }).catch(err => {
        console.error("Failed to copy text: ", err);
        setCopyButtonText("コピー失敗");
        setTimeout(() => setCopyButtonText("クリップボードにコピー"), 2000);
      });
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-col space-y-4">
        {/* Input Text Area */}
        <label htmlFor="memo-input" className="font-bold">あなたのメモ:</label>
        <textarea
          id="memo-input"
          rows={10}
          className="p-2 border rounded"
          placeholder="ここに雑なメモを入力してください..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={status === 'loading'}
        />

        {/* Mode Selection */}
        <label htmlFor="mode-select" className="font-bold">モード:</label>
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
        <label htmlFor="extra-instruction" className="font-bold">追加の指示（任意）:</label>
        <input
          id="extra-instruction"
          type="text"
          className="p-2 border rounded"
          placeholder="例：丁寧な言葉遣いで"
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
            {status === 'loading' ? '清書中...' : '清書'}
          </button>
        </div>

        {/* Status Display */}
        <div className="text-center p-2">
          ステータス: {status}
        </div>

        {/* Output Text Area */}
        <label htmlFor="output-area" className="font-bold">清書後のメモ:</label>
        <textarea
          id="output-area"
          rows={10}
          readOnly
          className={`p-2 border rounded ${status === 'error' ? 'border-red-500 bg-red-50' : 'bg-gray-100'}`}
          placeholder="ここに清書結果が表示されます..."
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
