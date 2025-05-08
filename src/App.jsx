import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const App = () => {
  const socketRef = useRef(null);
  const [schedule, setSchedule] = useState(null)
  const [blist, setBlist] = useState([])
  const [wlist, setWlist] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const socketUrl = "wss://instructorapi.ftlgym.com";
  const httpsUrl = "https://instructorapi.ftlgym.com";

  useEffect(() => {
    const setup = async () => {
      socketRef.current = await initSocket();
    };
    setup();
  
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        console.log("🔌 Socket disconnected on unmount");
      }
    };
  }, []);
  
  const initToken = async (reinit = false) => {
    let token = localStorage.getItem("token");
    if (!token || reinit) {
      const studio_id = prompt("Please enter your token:");
      if (!studio_id || isNaN(Number(studio_id))) {
        console.warn("❌ Invalid or empty token input.");
        return null;
      }
  
      try {
        const response = await fetch(`${httpsUrl}/v1/setting/update`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ studio_id: Number(studio_id) }),
        });
        const result = await response.json();
        console.log(result)
        if (result.data) {
          localStorage.setItem("token", result.data);
          return result.data;
        } else {
          console.warn("❌ Token not provided. Socket connection aborted.");
          return null;
        }
      } catch (error) {
        console.error("❌ Failed to fetch token:", error);
        return null;
      }
    }
    return token;
  };
  
  const initSocket = async (reinit = false) => {
    setSchedule(null)
    setBlist([]);
    setWlist([]);
    
    const token = await initToken(reinit);
    if (!token) return;
  
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      auth: { token },
    });
  
    socket.off("connect");
    socket.off("updateSchedule");
    socket.off("updateAttendanceSchedule");
  
    socket.on("connect", () => {
      setIsLoading(true)
      socket.emit("getSchedule", { isPilates: true });
      console.log("✅ Connected to socket server!", socket.id);
      setIsLoading(false)
    });
  
    socket.on("updateSchedule", (schedule) => {
      setIsLoading(true)
      console.log(schedule);
      setSchedule(schedule);
  
      if (schedule.id) {
        socket.emit("getAttendanceSchedule", { schedule_id: schedule.id });
      } else {
        setBlist([]);
        setWlist([]);
      }
      setIsLoading(false)
    });
  
    socket.on("updateAttendanceSchedule", (attendance) => {
      setIsLoading(true)
      setBlist(attendance.blist);
      setWlist(attendance.wlist);
      setIsLoading(false)
    });
  
    return socket;
  };
  
  const handleReconnect = async () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      console.log("🔄 Old socket disconnected before re-init");
    }
  
    console.log("🔁 Reinitializing socket with refreshed token...");
    socketRef.current = await initSocket(true);
  };

  return (
    <div>
      {!isLoading && schedule ? <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        <button onClick={handleReconnect}>
          Refresh Token & Reconnect
        </button>
        <br />
        <br />
        <div>
          <span>Schedule </span>
          {JSON.stringify(schedule, null, 2)}
        </div>
        <div>
          <span>Blist </span>
          {JSON.stringify(blist, null, 2)}
        </div>
        <div>
          <span>Wlist </span>
          {JSON.stringify(wlist, null, 2)}
        </div>
      </pre> : "Loading...."}
    </div>
  );
}

export default App