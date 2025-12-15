import React, { useEffect, useRef, useState } from 'react';
import { ChefState, ToastType, InterviewMessage } from '../types.ts';
import { getInterviewQuestion, evaluateAudioAnswer } from '../services/geminiService.ts';
import { ChefHat, RefreshCw, Star, Video, Mic, Camera } from 'lucide-react';

interface TasteTestProps {
  state: ChefState;
  setState: React.Dispatch<React.SetStateAction<ChefState>>;
  onShowToast: (msg: string, type: ToastType) => void;
}

export const TasteTest: React.FC<TasteTestProps> = ({ state, setState, onShowToast }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // Media State
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMediaStream();
    };
  }, []);

  // Auto-scroll chat is less relevant in video mode, but good for history view
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.interviewHistory]);

  const stopMediaStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Avoid feedback loop
      }
      streamRef.current = stream;
    } catch (err) {
      console.error("Error accessing camera:", err);
      onShowToast("Could not access camera/microphone. Check permissions.", "error");
    }
  };

  const startInterview = async () => {
    if (!state.currentRecipe || state.ingredients.length === 0) {
      onShowToast("Please add ingredients and a job description first!", "error");
      return;
    }

    // Start Camera immediately for immersion
    await startCamera();

    setIsProcessing(true);
    const newHistory: InterviewMessage[] = [];
    setState(prev => ({ ...prev, interviewHistory: newHistory }));

    try {
      const question = await getInterviewQuestion(state.ingredients, state.currentRecipe, []);
      const chefMsg: InterviewMessage = {
        id: Date.now().toString(),
        role: 'chef',
        content: question
      };
      setState(prev => ({ ...prev, interviewHistory: [chefMsg] }));
    } catch (e: any) {
      onShowToast("Failed to start the interview.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = () => {
    if (!streamRef.current) {
        startCamera().then(() => {
            if (streamRef.current) initiateRecording();
        });
        return;
    }
    initiateRecording();
  };

  const initiateRecording = () => {
    // We only record audio for the AI analysis to save bandwidth and improve speed,
    // but the user sees the video so it feels like a video interview.
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    if (!audioTrack) {
        onShowToast("Microphone not found.", "error");
        return;
    }
    
    const audioStream = new MediaStream([audioTrack]);
    const recorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
    
    recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await handleAudioSubmission(blob);
        chunksRef.current = [];
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
    }
  };

  const handleAudioSubmission = async (audioBlob: Blob) => {
    setIsProcessing(true);
    onShowToast("Analyzing your answer...", "info");

    try {
        // Convert Blob to Base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
            const base64String = (reader.result as string).split(',')[1];
            
            // Add user "message" placeholder while analyzing
            const userMsgId = Date.now().toString();
            const userMsg: InterviewMessage = {
                id: userMsgId,
                role: 'candidate',
                content: "(Audio Answer Submitted)"
            };
            
            const currentHistory = [...state.interviewHistory, userMsg];
            setState(prev => ({ ...prev, interviewHistory: currentHistory }));

            // Evaluate
            const lastQuestion = state.interviewHistory[state.interviewHistory.length - 1].content;
            const evaluation = await evaluateAudioAnswer(lastQuestion, base64String, 'audio/webm');

            // Update user message with transcription and feedback
            const historyWithFeedback = currentHistory.map(msg => 
                msg.id === userMsgId ? { 
                    ...msg, 
                    content: evaluation.transcription || "(Audio transcription failed)",
                    feedback: evaluation.feedback, 
                    score: evaluation.score 
                } : msg
            );
            setState(prev => ({ ...prev, interviewHistory: historyWithFeedback }));

            // Get Next Question
            const nextQuestion = await getInterviewQuestion(state.ingredients, state.currentRecipe, historyWithFeedback);
            const chefMsg: InterviewMessage = {
                id: (Date.now() + 1).toString(),
                role: 'chef',
                content: nextQuestion
            };

            setState(prev => ({ ...prev, interviewHistory: [...historyWithFeedback, chefMsg] }));
            setIsProcessing(false);
        };
    } catch (e: any) {
        console.error(e);
        onShowToast("Failed to analyze audio.", "error");
        setIsProcessing(false);
    }
  };

  // Render the current/latest question prominently
  const currentQuestion = state.interviewHistory.length > 0 && state.interviewHistory[state.interviewHistory.length - 1].role === 'chef'
    ? state.interviewHistory[state.interviewHistory.length - 1].content
    : "Processing answer...";

  const lastFeedback = state.interviewHistory.filter(m => m.role === 'candidate' && m.feedback).pop();

  return (
    <div className="flex flex-col h-full animate-fadeIn pb-4">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-display font-bold text-slate-800">Video Mock Interview</h1>
            <p className="text-slate-500 mt-1">Practice facing the camera. AI evaluates your content and delivery.</p>
        </div>
        <div className="flex gap-2">
            {state.interviewHistory.length > 0 && (
            <button 
                onClick={() => {
                    stopMediaStream();
                    startInterview();
                }}
                className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-4 py-2 rounded-lg hover:border-slate-300 transition-all shadow-sm"
            >
                <RefreshCw size={16} />
                Restart
            </button>
            )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        
        {/* Left: AI & Context */}
        <div className="flex flex-col gap-6 h-full overflow-hidden">
             
             {/* Question Card */}
             <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-center min-h-[200px] relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-2 h-full bg-slate-900" />
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ChefHat size={14} />
                    Current Question
                 </h3>
                 {state.interviewHistory.length === 0 ? (
                    <div className="flex flex-col items-center text-center py-6">
                        <p className="text-slate-500 mb-6">Ready to start your video interview session?</p>
                        <button 
                            onClick={startInterview}
                            className="bg-slate-900 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 hover:bg-slate-800 transition-all shadow-md"
                        >
                            <Video size={18} />
                            Start Session
                        </button>
                    </div>
                 ) : (
                    <p className="text-xl md:text-2xl font-medium text-slate-800 leading-relaxed animate-fadeIn">
                        "{currentQuestion}"
                    </p>
                 )}
                 {isProcessing && state.interviewHistory.length > 0 && (
                     <div className="absolute bottom-4 right-4 flex gap-1">
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-200"></div>
                     </div>
                 )}
             </div>

             {/* Feedback Display */}
             {lastFeedback && !isProcessing && (
                <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-y-auto animate-slideUp">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <Star className="text-amber-400 fill-amber-400" size={18} />
                            Answer Analysis
                        </h3>
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1 rounded-full">
                            Score: {lastFeedback.score}/10
                        </span>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                             <p className="text-xs font-bold text-slate-400 uppercase mb-1">Feedback</p>
                             <p className="text-slate-700 text-sm leading-relaxed">{lastFeedback.feedback}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 opacity-80">
                             <p className="text-xs font-bold text-slate-400 uppercase mb-1">You Said (Transcribed)</p>
                             <p className="text-slate-600 text-xs italic leading-relaxed">"{lastFeedback.content}"</p>
                        </div>
                    </div>
                </div>
             )}
        </div>

        {/* Right: Camera Stage */}
        <div className="flex flex-col gap-4">
             {/* Use aspect-video to enforce consistent size regardless of other content */}
             <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden relative shadow-md border border-slate-200 group">
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover transform scale-x-[-1]"
                />
                
                {/* Overlay Status */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                   {isRecording && (
                       <div className="flex items-center gap-2 bg-red-500/90 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse backdrop-blur-sm">
                           <div className="w-2 h-2 bg-white rounded-full" />
                           REC
                       </div>
                   )}
                </div>

                {/* No Camera State */}
                {!streamRef.current && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white">
                        <Camera size={48} className="text-slate-600 mb-4" />
                        <p className="text-slate-400 font-medium">Camera is off</p>
                    </div>
                )}
             </div>

             {/* Controls */}
             <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center gap-6">
                {!isRecording ? (
                    <button
                        onClick={startRecording}
                        disabled={state.interviewHistory.length === 0 || isProcessing}
                        className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 flex items-center justify-center transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                        title="Start Recording"
                    >
                        <Mic size={28} className="text-white" />
                    </button>
                ) : (
                    <button
                        onClick={stopRecording}
                        className="w-16 h-16 rounded-full bg-white border-4 border-red-500 flex items-center justify-center transition-all transform hover:scale-105 shadow-md"
                        title="Stop Recording"
                    >
                        <div className="w-6 h-6 bg-red-500 rounded-sm" />
                    </button>
                )}
                
                <div className="flex flex-col items-start gap-1">
                    <span className="text-sm font-bold text-slate-800">
                        {isRecording ? "Recording Answer..." : "Ready to Record"}
                    </span>
                    <span className="text-xs text-slate-500">
                        {isRecording ? "Click stop when finished" : "Click mic to answer"}
                    </span>
                </div>
             </div>
        </div>

      </div>
    </div>
  );
};