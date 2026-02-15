import { useEffect, useRef, useState } from "react";
import Client from "../components/Client";
import Editor from "../components/Editor";
import { initSocket } from "../socket";
import { ACTIONS } from "../Actions";
import { Navigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import MusicPlayer from "../components/MusicPlayer";

const EditorPage = () => {
  const socketRef = useRef(null);
  const codeRef = useRef(null);
  const location = useLocation();
  const reactNavigator = useNavigate();
  const { roomId } = useParams();
  const [clients, setClients] = useState([]);

  // Song & Player States
  const [currentSong, setCurrentSong] = useState(null);
  const [songHistory, setSongHistory] = useState([]);
  const [isConnecting, setIsConnecting] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        socketRef.current = await initSocket();
      } catch (err) {
        console.error("Socket Init Failed", err);
        toast.error("Socket initialization failed");
        reactNavigator("/");
        return;
      }

      // Connection successful, turn off loader
      setIsConnecting(false);

      socketRef.current.on("connect_error", (err) => handleErrors(err));
      socketRef.current.on("connect_failed", (err) => handleErrors(err));

      function handleErrors(e) {
        console.log("Socket Connection failed!", e);
        toast.error("Socket connection failed, try again later.");
        reactNavigator("/");
      }

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state?.username,
      });

      //  listening for joined event
      socketRef.current.on(
        ACTIONS.JOINED,
        ({ clients, username, socketId }) => {
          setClients(clients);
          if (username !== location.state?.username) {
            toast.success(`${username} joined the room`);
          }

          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
            socketId,
          });
        }
      );

      // Listening for initial song sync
      socketRef.current.on(ACTIONS.SYNC_SONGS, ({ songs }) => {
        setSongHistory(songs);
      });

      //  listening for disconnected event
      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left the room.`);
        setClients((prev) => {
          return prev.filter((client) => client.socketId !== socketId);
        });
      });

      //  listening for song upload event
      socketRef.current.on(ACTIONS.UPLOAD_SONG, (songData) => {
        setSongHistory(prev => [...prev, {
          songName: songData.songName,
          songPath: songData.songPath, // Cloudinary URL
          addedBy: songData.username || "Unknown" // We need to send username from backend/frontend
        }]);

        // If it's the first song or we want to auto-play (optional), we could set it here. 
        // For now, just add to history.
        // toast.success(`${songData.username || "Someone"} added ${songData.songName}`);
      });

      //  listening for stream event
      socketRef.current.on(ACTIONS.START_STREAM, (song) => {
        setCurrentSong(song);
      });

      //  listening for stop stream event
      socketRef.current.on(ACTIONS.STOP_STREAM, () => {
        setCurrentSong(null);
        toast.success("Streaming stopped.");
      });
    }
    init();

    // prevention from memory leaks
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.SYNC_SONGS);
        socketRef.current.off(ACTIONS.DISCONNECTED);
        socketRef.current.off(ACTIONS.UPLOAD_SONG);
        socketRef.current.off(ACTIONS.START_STREAM);
        socketRef.current.off(ACTIONS.STOP_STREAM);
      }
    }
  }, [])

  async function copyRoomId() {
    try {
      await navigator?.clipboard?.writeText(roomId);
      toast.success("Room ID Copied to your clipboard.")
    }
    catch (err) {
      toast.error("Please try after sometime.")
    }
  }

  function leaveRoom() {
    reactNavigator("/")
  }

  function uploadSong(audioFile, coverFile) {
    if (!audioFile) return;

    const toastId = toast.loading("Uploading song...");

    // Ensure no trailing slash
    const backendUrl = (import.meta.env.VITE_APP_BACKEND_URL || "").replace(/\/$/, "");

    const uploadFile = async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${backendUrl}/upload`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      return await response.json();
    };

    const promises = [uploadFile(audioFile)];
    if (coverFile) {
      promises.push(uploadFile(coverFile));
    }

    Promise.all(promises)
      .then((results) => {
        const audioData = results[0];
        const coverData = results.length > 1 ? results[1] : null;

        toast.dismiss(toastId);
        toast.success("Song uploaded!");

        // Emit event to server
        socketRef.current.emit(ACTIONS.UPLOAD_SONG, {
          roomId,
          songName: audioData.originalName,
          songPath: audioData.filePath, // Cloudinary URL
          coverImage: coverData ? coverData.filePath : null,
          username: location.state?.username // Send who uploaded it
        });
      })
      .catch((err) => {
        toast.dismiss(toastId);
        toast.error("Failed to upload song.");
        console.error(err);
      });
  }

  function startStream(song) {
    if (song && song.songPath) {
      // We need to ensure we send the roomId so backend can broadcast
      const songPayload = { ...song, roomId };
      socketRef.current.emit(ACTIONS.START_STREAM, songPayload);
    } else {
      toast.error("Cannot play this song.");
    }
  }

  function stopStream() {
    socketRef.current.emit(ACTIONS.STOP_STREAM, roomId);
  }


  if (!location.state) {
    return <Navigate to={"/"} />
  }

  // Loader for Socket Connection
  if (isConnecting) {
    return (
      <div className="homePageWrapper">
        <div style={{ textAlign: 'center' }}>
          <h3>Connecting to Server...</h3>
          <p>This may take a moment if the server is waking up.</p>
          {/* Simple CSS Loader could be added here */}
        </div>
      </div>
    )
  }

  return (
    <div className="mainWrap">
      <div className="aside">
        <div className="asideInner">
          <div className="logo">
            <img
              src="/app_logo.png"
              alt="share-code-logo"
              className="logoImage"
            />
          </div>
          <h3>Connected</h3>
          <div className="clientsList">
            {clients.map((client) => {
              return (
                <Client key={client.socketId} username={client.username} />
              );
            })}
          </div>
        </div>
        <button className="btn copyBtn" onClick={copyRoomId}>
          COPY ROOM ID
        </button>
        <button className="btn leaveBtn" onClick={leaveRoom}>
          Leave
        </button>
      </div>

      <div className="editorWrap">
        <Editor
          socketRef={socketRef}
          roomId={roomId}
          onCodeChange={(code) => {
            codeRef.current = code;
          }}
        />
      </div>

      <div className="rightAside">
        <MusicPlayer
          currentSong={currentSong}
          onUpload={uploadSong}
          onStartStream={startStream}
          onStopStream={stopStream}
          songHistory={songHistory}
        />
      </div>
    </div>
  );
};

export default EditorPage;
