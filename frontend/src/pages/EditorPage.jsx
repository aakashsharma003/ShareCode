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
  const location = useLocation();
  const navigator = useNavigate();
  const {roomId} = useParams();
   const [clients, setClients] = useState([]);
  useEffect(() => {
    async function init(){
      socketRef.current = await initSocket();
      socketRef.current.on("connect_error", (err) => handleErrors(err));
      socketRef.current.on("connect_failed", (err) => handleErrors(err));

      function handleErrors(e) {
        console.error("Socket Connection failed!", e);
        toast.error("Socket connection failed, try again later.");
        navigator("/");
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
            console.log(`${username} joined the room`);
          }

          socketRef.current.emit(ACTIONS.SYNC_CODE,{code:codeRef.current, socketId})
        }
      );

      //  listening for disconnected event
      socketRef.current.on(ACTIONS.DISCONNECTED, ({socketId, username}) => {
        toast.success(`${username} left the room.`);
        setClients((prev) => {
          return prev.filter(client => client.socketId !== socketId)
        })

      })
    }
    init();
    // prevention from memory leaks
    return () => {
      socketRef.current.disconnect();
      socketRef.current.off(ACTIONS.JOINED);
      socketRef.current.off(ACTIONS.DISCONNECTED);
    }
  },[])

  async function copyRoomId(roomId){
    try{
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID Copied to your clipboard.")
    }
    catch(err){
       console.error("Error while copying roomId", err);
       toast.error("Please try after sometime.")
    }
  }

  function leaveRoom(){
    navigator("/")
  }
 
  if(!location.state){
    return <Navigate to={"/"}/>
  }
  return (
    <div className="mainWrap">
      <div className="aside">
        <div className="asideInner">
          <div className="logo">
            <img src="/app_logo.png" alt="share-code-logo" className="logoImage" />
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
        <button className="btn copyBtn" onClick={copyRoomId(roomId)}>COPY ROOM ID</button>
        <button className="btn leaveBtn" onClick={leaveRoom}>Leave</button>
      </div>
      <div className="editorWrap">
        <Editor socketRef={socketRef} roomId={roomId} onCodeChange={(code) => {
          codeRef.current = code;
        }}/>
      </div>
    </div>
  );
};

export default EditorPage;
