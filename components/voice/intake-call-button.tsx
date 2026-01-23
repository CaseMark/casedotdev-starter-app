"use client";

import { useState, useEffect } from "react";
import { Phone, PhoneOff, Mic, MicOff, Loader2, X, Info, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { useVapi } from "@/app/hooks/useVapi";
import { getUserId } from "@/lib/utils/get-user-id";

interface IntakeCallButtonProps {
  className?: string;
}

export function IntakeCallButton({ className }: IntakeCallButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [connectionString, setConnectionString] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");

  const {
    startCall,
    endCall,
    sendMessage,
    isSessionActive,
    isLoading,
    isSpeaking,
    error,
    transcripts,
    volumeLevel,
    clearError,
  } = useVapi({
    publicKey: process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "",
    assistantId: process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || "",
  });

  useEffect(() => {
    const stored = localStorage.getItem("bankruptcy_db_connection");
    setConnectionString(stored);

    // Get user ID (works with or without auth)
    // If Better Auth is enabled and user is logged in, we could enhance this
    // to try fetching from session first, but for now use localStorage-based ID
    const userId = getUserId();
    setCurrentUserId(userId);
  }, []);

  const handleOpenModal = () => {
    setIsOpen(true);
    clearError();
  };

  const handleStartCall = async () => {
    clearError();

    // Pass connection string and userId as metadata so webhook can access the database
    // userId works regardless of whether Better Auth is enabled or disabled
    // Note: The parameter passed to startCall IS the assistantOverrides object
    await startCall({
      metadata: {
        connectionString: connectionString,
        userId: currentUserId,
      },
    });
  };

  const handleEndCall = () => {
    endCall();
  };

  const handleClose = () => {
    if (isSessionActive) {
      endCall();
    }
    setIsOpen(false);
  };

  const handleSendText = () => {
    if (textInput.trim() && isSessionActive) {
      sendMessage(textInput.trim());
      setTextInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  // Get only final transcripts for display
  const finalTranscripts = transcripts.filter((t) => t.isFinal);

  return (
    <>
      {/* Call Button */}
      <Button
        onClick={handleOpenModal}
        disabled={isLoading || isSessionActive}
        variant="outline"
        className={className}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : isSessionActive ? (
          <Phone className="w-4 h-4 mr-2 text-green-500" />
        ) : (
          <Phone className="w-4 h-4 mr-2" />
        )}
        {isSessionActive ? "Call Active" : "Call for Intake"}
      </Button>

      {/* Call Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={`bg-background rounded-xl shadow-2xl w-full mx-4 overflow-hidden transition-all duration-500 ${
            isSessionActive ? "max-w-5xl" : "max-w-lg"
          }`}>
            {/* Header */}
            <div className="bg-primary p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isSessionActive ? "bg-white/20" : "bg-white/10"
                  }`}
                >
                  {isSpeaking ? (
                    <Mic className="w-5 h-5 text-white animate-pulse" />
                  ) : (
                    <Phone className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-white font-semibold text-xl">Client Intake</h3>
                  <p className="text-white/70 text-sm">
                    {isLoading
                      ? "Connecting..."
                      : isSessionActive
                        ? isSpeaking
                          ? "Assistant speaking..."
                          : "Listening..."
                        : "Ready to call"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-white/70 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Volume indicator */}
            {isSessionActive && (
              <div className="h-1 bg-primary/20">
                <div
                  className="h-full bg-primary transition-all duration-100"
                  style={{ width: `${volumeLevel * 100}%` }}
                />
              </div>
            )}

            {/* Content Area */}
            {!isSessionActive && !isLoading ? (
              /* Start Call button with info text */
              <div className="p-8 flex flex-col items-center justify-center gap-6">
                <Button
                  onClick={handleStartCall}
                  disabled={isLoading}
                  className="w-full h-48 text-2xl font-semibold flex items-center justify-center gap-3 hover:bg-primary/90 rounded-xl"
                  size="lg"
                >
                  <Phone className="w-8 h-8" />
                  Start call
                </Button>
                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-900">
                    When you click Start, our agent will call you to assist you through the intake process.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <>
                {/* Transcript during call */}
                <div className="h-96 overflow-y-auto p-4 space-y-3">
                  {finalTranscripts.length === 0 && !error && (
                    <div className="text-center text-muted-foreground py-8">
                      {isLoading ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 animate-spin" />
                          <p>Connecting to assistant...</p>
                        </div>
                      ) : (
                        <p>Waiting for conversation to begin...</p>
                      )}
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  {finalTranscripts.map((transcript, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        transcript.role === "system"
                          ? "justify-center"
                          : transcript.role === "user"
                            ? "justify-end"
                            : "justify-start"
                      }`}
                    >
                      <div
                        className={`${
                          transcript.role === "system"
                            ? "text-xs text-muted-foreground italic py-1"
                            : `max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                                transcript.role === "user"
                                  ? "bg-primary text-white"
                                  : "bg-muted text-foreground"
                              }`
                        }`}
                      >
                        {transcript.text}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Text input for manual typing */}
                <div className="px-4 pb-3 border-t bg-muted/10">
                  <div className="flex gap-2 pt-3">
                    <Input
                      type="text"
                      placeholder="Type here..."
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={!isSessionActive}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendText}
                      disabled={!textInput.trim() || !isSessionActive}
                      size="sm"
                      variant="outline"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* End Call button during active call */}
                <div className="p-4 border-t bg-muted/30">
                  <Button
                    onClick={handleEndCall}
                    variant="destructive"
                    className="w-full"
                  >
                    <PhoneOff className="w-4 h-4 mr-2" />
                    End Call
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
