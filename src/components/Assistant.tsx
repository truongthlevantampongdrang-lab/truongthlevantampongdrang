import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../types";
import { Send, Sparkles, User, GraduationCap, AlertCircle, RefreshCw, Star, Heart, CheckCircle2 } from "lucide-react";

const systemInstruction = `
Bạn là "Trợ lý Học tập Trường Tiểu học Lê Văn Tám" - một AI thân thiện, am hiểu và nhiệt huyết, hỗ trợ học sinh, phụ huynh và giáo viên của Trường Tiểu học Lê Văn Tám, xã Pơng Drang, tỉnh Đắk Lắk.
Hãy xưng hô thân thiện, ấm áp và gần gũi (Ví dụ: xưng "Cô", "Thầy" hoặc "Trợ lý Lê Văn Tám" và gọi người trò chuyện là "Em", "Con" với học sinh, hoặc "Anh/Chị", "Quý phụ huynh" với phụ huynh, hoặc "Đồng nghiệp", "Thầy/Cô" với giáo viên).

Nhiệm vụ của bạn:
1. Hỗ trợ học sinh (Học cấp 1 từ lớp 1 đến lớp 5): Giải thích bài tập Toán, Tiếng Việt, Khoa học, Lịch sử, Tiếng Anh một cách cực kỳ dễ hiểu, ngắn gọn, có ví dụ sinh động, khuyến khích các con tự học, không giải hộ ngay lập tức mà hướng dẫn từng bước. khen ngợi khi học sinh làm đúng.
2. Hỗ trợ phụ huynh: Giải đáp thắc mắc về tuyển sinh tiểu học, lịch học tập, phương pháp đồng hành cùng con học bài ở nhà, dạy con đọc viết, ứng xử tâm lý trẻ em tiểu học.
3. Hỗ trợ giáo viên: Gợi ý ý tưởng bài giảng sáng tạo, soạn câu hỏi trắc nghiệm vui nhộn, viết kịch bản hoạt động ngoại khóa, các trò chơi lớp học thú vị.

Lưu ý: Luôn trả lời bằng tiếng Việt lịch sự, truyền cảm hứng học tập và tràn đầy năng lượng tích cực của mái trường tiểu học. Giữ câu trả lời súc tích, dễ đọc bằng cách xuống dòng và dùng định dạng markdown đơn giản.
`;

const GEMINI_TEXT_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
];

const callGeminiDirectly = async (messages: ChatMessage[], apiKey: string) => {
  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  const payload = {
    contents,
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    }
  };

  const errors: string[] = [];

  for (const model of GEMINI_TEXT_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      errors.push(`${model}: ${errorData.error?.message || `HTTP error ${response.status}`}`);
      continue;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      return text;
    }

    errors.push(`${model}: Khong nhan duoc cau tra loi tu may chu Gemini.`);
  }

  throw new Error(errors.join(" | ") || "Khong the ket noi Gemini.");
};

export default function Assistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Xin chào! Thầy cô, ba mẹ và các con thân yêu đang cần trợ lý học tập Lê Văn Tám đồng hành điều gì ạ? \n\n🤖 Hãy chọn một chủ đề gợi ý bên dưới hoặc gõ trực tiếp câu hỏi nhé!"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const suggestions = [
    {
      label: "Dành cho Học sinh",
      query: "Cho em một câu đố vui toán học dành cho học sinh lớp 4 và hướng dẫn em cách giải từng bước nhé!"
    },
    {
      label: "Dành cho Phụ huynh",
      query: "Phương pháp nào đồng hành cùng con chuẩn bị bước vào lớp 1 để con tự tin không sợ học đọc viết?"
    },
    {
      label: "Dành cho Giáo viên",
      query: "Gợi ý cho tôi 3 trò chơi khởi động vui nhộn dài 5 phút trên lớp học tiểu học để khuấy động không khí đầu tiết."
    }
  ];

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: textToSend };
    const updatedMessages = [...messages, userMsg];
    
    setMessages(updatedMessages);
    setInputValue("");
    setIsLoading(true);
    setErrorText("");

    // @ts-ignore
    const clientApiKey = (import.meta.env?.VITE_GEMINI_API_KEY as string) || localStorage.getItem("lvt_gemini_api_key") || "";

    try {
      let success = false;
      let assistantReply = "";

      try {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messages: updatedMessages }),
        });

        // Check if we received HTML (like a 404 page from static hosting like GitHub Pages) instead of JSON
        const contentType = response.headers.get("content-type");
        if (response.status === 404 || (contentType && !contentType.includes("application/json"))) {
          if (clientApiKey) {
            console.log("Backend failed or not found (static page). Trying client-side direct calling...");
            assistantReply = await callGeminiDirectly(updatedMessages, clientApiKey);
            success = true;
          } else {
            setErrorText("Không tìm thấy máy chủ backend AI (Tính năng AI cần máy chủ hoạt động, hoặc bạn cần cấu hình Khoá API trực tiếp trong bảng điều khiển Quản trị).");
          }
        } else {
          const data = await response.json();
          if (response.ok && data.content) {
            assistantReply = data.content;
            success = true;
          } else {
            // Backend returned 500 or error, check if client key can save us
            if (clientApiKey) {
              console.log("Backend returned an error. Attempting fallback direct Gemini API call...");
              assistantReply = await callGeminiDirectly(updatedMessages, clientApiKey);
              success = true;
            } else {
              setErrorText(data.error || "Không thể kết nối với máy chủ AI. Vui lòng kiểm tra lại cấu hình hoặc khoá API.");
            }
          }
        }
      } catch (backendErr) {
        // Network error - e.g. server is down or running on fully static client-only host
        if (clientApiKey) {
          console.log("Backend connection failed. Attempting direct Gemini API call...", backendErr);
          assistantReply = await callGeminiDirectly(updatedMessages, clientApiKey);
          success = true;
        } else {
          throw backendErr;
        }
      }

      if (success) {
        setMessages((prev) => [...prev, { role: "assistant", content: assistantReply }]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorText(
        clientApiKey 
          ? `Lỗi kết nối Gemini trực tiếp: ${err.message || "Vui lòng kiểm tra lại Key."}`
          : "Không tìm thấy máy chủ backend và chưa cấu hình Khoá API trực tiếp. Nếu bạn đang chạy trên GitHub Pages, vui lòng vào Bảng điều khiển Quản trị -> Cấu hình & Đổi mật khẩu để thêm Khoá Gemini API."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Cuộc trò chuyện đã được làm mới! Thầy cô, ba mẹ và các con thân yêu đang cần trợ lý học tập Lê Văn Tám đồng hành điều gì ạ?"
      }
    ]);
    setErrorText("");
  };

  return (
    <div className="space-y-8 py-6 font-sans">
      
      {/* Assistant Header */}
      <section className="text-center max-w-2xl mx-auto space-y-3">
        <span className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 border border-emerald-100">
          <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
          <span>Góc Giáo Dục Số 4.0</span>
        </span>
        <h2 className="text-3xl font-extrabold text-emerald-950">
          Trợ Lý Học Tập Lê Văn Tám AI
        </h2>
        <p className="text-sm text-emerald-900/70">
          Một công cụ ứng dụng Trí tuệ nhân tạo (Gemini) giúp hướng dẫn các em học sinh tự học, tư vấn phương pháp nuôi dạy trẻ cho phụ huynh, và gợi ý giáo án lớp học sáng tạo cho Thầy cô giáo.
        </p>
      </section>

      {/* Main chat box layout */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-12 max-w-5xl mx-auto">
        
        {/* Left column: Quick Suggestions & Guide card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-gradient-to-br from-emerald-800 to-teal-900 rounded-3xl p-6 text-white shadow-md space-y-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white">Giới thiệu về Trợ lý AI</h3>
            <p className="text-xs text-emerald-100 leading-relaxed">
              Trợ lý AI Lê Văn Tám được nạp dữ liệu định hướng hỗ trợ tối đa cho học sinh tiểu học, ba mẹ cư ngụ tại buôn làng xã Pơng Drang và thầy cô giáo trong công tác giảng dạy.
            </p>
            
            <div className="space-y-2 border-t border-white/10 pt-4">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Thân thiện, gần gũi và chuẩn mực</span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Không giải bài hộ - Chỉ hướng dẫn</span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Hỗ trợ đắc lực giáo án dạy học</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-emerald-50 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900/60 pl-1">
              Câu hỏi gợi ý có sẵn
            </h4>
            <div className="space-y-2">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(s.query)}
                  disabled={isLoading}
                  className="w-full text-left rounded-xl p-3 border border-emerald-50 hover:border-emerald-100/80 bg-emerald-50/20 hover:bg-emerald-50 text-xs text-emerald-950 font-bold transition-all disabled:opacity-55"
                >
                  <span className="block text-[10px] text-amber-600 uppercase tracking-widest font-extrabold mb-1">
                    {s.label}
                  </span>
                  <span className="line-clamp-2">{s.query}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Interactive Chat Engine */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-emerald-50 shadow-md flex flex-col h-[550px] overflow-hidden">
          
          {/* Chat Header controls */}
          <div className="bg-emerald-50/30 border-b border-emerald-50 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-emerald-950">Đang trực tuyến hỗ trợ</span>
            </div>
            
            <button
              onClick={clearChat}
              className="text-xs font-bold text-emerald-900/60 hover:text-emerald-950 flex items-center space-x-1 py-1 px-2.5 rounded-lg hover:bg-emerald-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Xóa hội thoại</span>
            </button>
          </div>

          {/* Chat message body list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-emerald-50/10">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-3 items-start ${m.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {/* Profile icon bubble */}
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                  m.role === "user"
                    ? "bg-emerald-600 text-white"
                    : "bg-amber-500 text-emerald-950"
                }`}>
                  {m.role === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </div>

                {/* Text bubble details */}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm border ${
                  m.role === "user"
                    ? "bg-emerald-600 text-white border-emerald-500"
                    : "bg-white text-emerald-950 border-emerald-50/50"
                }`}>
                  <p className="whitespace-pre-line font-medium">{m.content}</p>
                </div>
              </div>
            ))}

            {/* Is loading status message indicator */}
            {isLoading && (
              <div className="flex gap-3 items-start animate-pulse">
                <div className="h-8 w-8 rounded-lg bg-amber-500 text-emerald-950 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 animate-spin" />
                </div>
                <div className="bg-white rounded-2xl px-4 py-3 text-xs text-emerald-950 border border-emerald-50/50 shadow-sm">
                  <p className="font-semibold italic">Trợ lý Lê Văn Tám đang suy nghĩ...</p>
                </div>
              </div>
            )}

            {/* Error alerts */}
            {errorText && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3 items-start text-red-700 animate-pulse">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold">Không thể kết nối với AI</p>
                  <p className="text-[10px] leading-relaxed">{errorText}</p>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Chat bottom forms actions input */}
          <div className="p-4 border-t border-emerald-50 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                placeholder="Nhập nội dung câu hỏi của bạn tại đây..."
                className="flex-1 rounded-xl border border-emerald-100 bg-emerald-50/20 py-3 px-4 text-xs font-semibold placeholder-emerald-900/40 text-emerald-950 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="rounded-xl bg-emerald-600 px-5 text-white hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center shrink-0 shadow-md"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <p className="text-[10px] text-center text-emerald-900/40 font-semibold mt-2">
              Lưu ý: Mọi thông tin phản hồi từ Trợ lý AI mang tính chất tham khảo học tập, khuyến khích sự tự lập và sáng tạo.
            </p>
          </div>

        </div>

      </section>

    </div>
  );
}
