import { useEffect, useRef, useState } from "react";
import Client from "../components/Client";
import Editor from "../components/Editor";
import { initSocket } from "../socket";
import { ACTIONS } from "../Actions";
import { Navigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
const EditorPage = () => {
  const socketRef = useRef(null);
  const codeRef = useRef(null);
  const audioRef = useRef(null);
  const location = useLocation();
  const reactNavigator = useNavigate();
  const {roomId} = useParams();
   const [clients, setClients] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [currentSong, setCurrentSong] = useState();
  useEffect(() => {
    async function init(){
      socketRef.current = await initSocket();
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
            // console.log(`${username} joined the room`);
          }

          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
            socketId,
          });
        }
      );

      //  listening for disconnected event
      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left the room.`);
        setClients((prev) => {
          return prev.filter((client) => client.socketId !== socketId);
        });
      });
      //  listening for song upload event
      socketRef.current.on(ACTIONS.UPLOAD_SONG, (songData) => {
        // console.log("Song uploaded:", songData);
        setCurrentSong(songData);
        toast.success("Song uploaded successfully!");
      });
      //  listening for stream event
      socketRef.current.on(ACTIONS.START_STREAM, (song) => {
        // console.log("Received song to stream:", song);
        setCurrentSong(song);
        if (audioRef.current) {
          audioRef.current.src = `${import.meta.env.VITE_APP_BACKEND_URL}${
            song.songPath
          }`;
          audioRef.current.load();
          audioRef.current
            .play()
            .then(() => {
              // console.log("Audio playback started");
            })
            .catch((error) => {
              // console.error("Error playing audio:", error);
              toast.error("Failed to play audio.");
            });
        }
      });
      //  listening for stop stream event
      socketRef.current.on(ACTIONS.STOP_STREAM, () => {
        console.log("Streaming stopped.");
        setCurrentSong(null);
        toast.success("Streaming stopped.");
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
        }
      });
    }
    init();
    // prevention from memory leaks
    return () => {
      socketRef.current.disconnect();
      socketRef.current.off(ACTIONS.JOINED);
      socketRef.current.off(ACTIONS.DISCONNECTED);
       socketRef.current.off(ACTIONS.UPLOAD_SONG);
       socketRef.current.off(ACTIONS.START_STREAM);
       socketRef.current.off(ACTIONS.STOP_STREAM);
    }
  },[])

  async function copyRoomId(){
    try{
      // console.log(navigator)
     await navigator?.clipboard?.writeText(roomId);
      toast.success("Room ID Copied to your clipboard.")
    }
    catch(err){
      //  console.log("Error while copying roomId", err);
       toast.error("Please try after sometime.")
    }
  }

  function leaveRoom(){
    reactNavigator("/")
  }

  function uploadSong() {
    if (selectedFile) {
      const formData = new FormData();
      formData.append("file", selectedFile);

      fetch(`${import.meta.env.VITE_APP_BACKEND_URL}/upload`, {
        method: "POST",
        body: formData,
      })
        .then((response) => response.json())
        .then((data) => {
          // console.log("Upload response:", data);
          // console.log(socketRef.current)
          socketRef.current.emit(ACTIONS.UPLOAD_SONG, {
            roomId,
            songName: data.originalName,
            songPath: data.filePath,
          });
        })
        .catch((err) => {
          toast.error("Failed to upload song.");
          // console.log(err);
        });
    } else {
      toast.error("No file selected.");
    }
  }

  function startStream() {
    if (currentSong) {
      // console.log("Starting stream with song:", currentSong);
      if (currentSong.songPath) {
        socketRef.current.emit(ACTIONS.START_STREAM, currentSong);
      } else {
        // console.error("Missing filePath in currentSong:", currentSong);
        toast.error("Failed to start stream, missing song data.");
      }
    } else {
      toast.error("No song available to stream.");
    }
  }

  function stopStream() {
    // console.log("Stopping stream");
    socketRef.current.emit(ACTIONS.STOP_STREAM, roomId);
  }

 
  if(!location.state){
    return <Navigate to={"/"}/>
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
            {clients.map((clients) => {
              return (
                <Client key={clients.socketId} username={clients.username} />
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
        <div className="songControls">
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setSelectedFile(e.target.files[0])}
          />
          <button onClick={uploadSong}>Upload Song</button>
          <button onClick={startStream}>Start Stream</button>
          <button onClick={stopStream}>Stop Stream</button>
          {currentSong && (
            <div>
              <p>Now Streaming: {currentSong.songName}</p>
              <audio ref={audioRef} controls>
                <source src={currentSong.songPath} type="audio/mpeg" />
              </audio>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditorPage;
