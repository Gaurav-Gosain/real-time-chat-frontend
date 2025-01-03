import { Chat } from "@/components/chat/chat";
import { useToast } from "@/components/ui/use-toast";
import { Message } from "@/data/data";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

export default function Home() {
  const { toast } = useToast();

  const selectedUser = {
    name: "Me",
  };
  const [isMobile, setIsMobile] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [serverAvailable, setServerAvailable] = useState(false);
  const [micAvailable, setMicAvailable] = useState(false);
  const [fullSentences, setFullSentences] = useState<Message[]>([]);
  const [realtimeText, setRealtimeText] = useState("");
  const [isSending, setIsSending] = useState(true); // State to control audio data sending
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [needsSleep, setNeedsSleep] = useState(false);
  const [redirect, setRedirect] = useState(false);

  const router = useRouter();

  const serverCheckInterval = 5000; // Check every 5 seconds

  useEffect(() => {
    if (redirect) {
      router.push("/");
    }
  }, [redirect]);

  useEffect(() => {
    connectToServer();

    const intervalId = setInterval(() => {
      if (!serverAvailable) {
        connectToServer();
      }
    }, serverCheckInterval);

    return () => clearInterval(intervalId);
  }, [serverAvailable]);

  useEffect(() => {
    startMsg();
  }, [serverAvailable, micAvailable]);

  useEffect(() => {
    if (needsSleep) {
      stopSending();
    } else {
      startSending();
    }
  }, [needsSleep]);

  useEffect(() => {
    if (navigator.mediaDevices) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(async (mediaStream) => {
          setStream(mediaStream);
          const audioContext = new AudioContext();

          // Load the audio worklet processor
          await audioContext.audioWorklet.addModule("/audio-processor.js");

          const source = audioContext.createMediaStreamSource(mediaStream);
          const processorNode = new AudioWorkletNode(audioContext, "processor");

          source.connect(processorNode);
          processorNode.connect(audioContext.destination);
          setMicAvailable(true);

          processorNode.port.onmessage = (event) => {
            if (socket && socket.readyState === WebSocket.OPEN) {
              const outputData = event.data;

              const metadata = JSON.stringify({
                sampleRate: audioContext.sampleRate,
              });
              const metadataBytes = new TextEncoder().encode(metadata);
              const metadataLength = new ArrayBuffer(4);
              const metadataLengthView = new DataView(metadataLength);
              metadataLengthView.setInt32(0, metadataBytes.byteLength, true);

              const combinedData = new Blob([
                metadataLength,
                metadataBytes,
                outputData.buffer,
              ]);

              socket.send(combinedData);
            }
          };

          if (!isSending) {
            toggleMicStream(false);
          }
        })
        .catch((e) => console.error(e));
    }
  }, [socket]);

  function connectToServer() {
    if (
      socket &&
      (socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const newSocket = new WebSocket(
      "wss://" + process.env.NEXT_PUBLIC_SERVER_HOST,
    );

    newSocket.onopen = () => {
      setServerAvailable(true);
      toast({
        title: "Connected to server",
        description: "You are now connected to the server",
      });
      startMsg();
    };

    newSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "realtime") {
        setRealtimeText(data.text);
      } else if (data.type === "fullSentence") {
        setFullSentences((prev) => [
          ...prev,
          {
            message: data.text,
            audio: "",
          },
        ]);
        toast({
          title: "Generating a response",
          description: "Please wait while the response is generated",
        });
        setRealtimeText("generating..."); // Refresh display with new full sentence
        setNeedsSleep(true);
      } else if (data.type === "llm") {
        setFullSentences((prev) => [
          ...prev,
          {
            message: data.text,
            audio: data.audio,
          },
        ]);
        toast({
          title: "Response generated",
          description: "Response generated, you can start speaking",
        });
        setRealtimeText("start speaking..."); // Refresh display with new full sentence
        setNeedsSleep(false);
      } else if (data.type === "disconnect") {
        setRedirect(true);
      }
    };

    newSocket.onclose = () => {
      setServerAvailable(false);
    };

    newSocket.onerror = () => {
      setServerAvailable(false);
    };

    setSocket(newSocket);
  }

  useEffect(() => {
    // Cleanup function to close the WebSocket when the component unmounts
    return () => {
      console.log("Cleaning up WebSocket");
      if (!socket) {
        return;
      }
      if (socket.readyState === WebSocket.OPEN) {
        socket.close(1000, "Closing WebSocket before unmounting");
        console.log("WebSocket closed");
      }
    };
  }, []);

  function startMsg() {
    if (!micAvailable) {
      setRealtimeText("🎤  please allow microphone access  🎤");
    } else if (!serverAvailable) {
      setRealtimeText("🖥️  please start server  🖥️");
    } else {
      setRealtimeText("start speaking...");
    }
  }

  function toggleMicStream(enable: boolean) {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.enabled = enable;
      });
    }
  }

  function stopSending() {
    toggleMicStream(false);
    setIsSending(false);
  }

  function startSending() {
    toggleMicStream(true);
    setIsSending(true);
    setNeedsSleep(false);
  }

  return (
    <div className="flex flex-col items-center justify-center h-[100svh] w-screen">
      <div className="w-full max-w-3xl xl:my-[2.5dvh] xl:border-2 border-gray-200 rounded-lg xl:h-[95dvh] h-full">
        <Chat
          key={fullSentences.length}
          isMobile={isMobile}
          selectedUser={selectedUser}
          messages={fullSentences}
          chatBoxText={realtimeText}
        />
      </div>
    </div>
  );
}
