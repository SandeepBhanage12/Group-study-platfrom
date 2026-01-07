import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";
import Gemini from "../components/Gemini";
import { useName } from "../context/NameContext";

const Wrapper = styled.div`
  display: flex;
  height: 100vh;
  width: 100%;
  justify-content: space-evenly;
  padding: 1rem;
  background-color: #f4f6f9;
`;

const Container = styled.div`
  flex: 0 0 65%;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem;
  height: fit-content;
  justify-content: space-evenly;
  background-color: #ffffff;
  border-radius: 10px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
      height: 90%;
`;

const MessageBox = styled.div`
  flex: 0 0 25%;
  max-height: 100vh;
  overflow: hidden;
  position: relative;
  padding: 0;
  background-color: #ffffff;
  border-radius: 10px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);

  &::-webkit-scrollbar {
    display: none;
  }

  scrollbar-width: none;
  -ms-overflow-style: none;
`;

const StyledVideo = styled.video`
  height: 17rem;
  width: 23rem;
  border-radius: 10px;
  object-fit: cover;
  border: 3px solid ${(props) => (props.active ? '#4CAF50' : '#ddd')};
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
`;

const Video = React.memo((props) => {
  const ref = useRef();

  useEffect(() => {
    props.peer.on("stream", (stream) => {
      if (ref.current) {
        ref.current.srcObject = stream;
      }
    });
  }, [props.peer]);

  return <StyledVideo playsInline autoPlay ref={ref} active={props.active} />;
});

const videoConstraints = {
  height: window.innerHeight / 2,
  width: window.innerWidth / 2,
};

const LeaveButton = styled.button`
  position: fixed;
  bottom: 1rem;
  left: 1rem;
  padding: 1rem 2rem;
  background-color: #ff4d4f;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #d13d3b;
  }
`;

const MessageDiv = styled.div`
  margin: 1rem;
  padding: 1rem;
  border-radius: 8px;
  background-color: #f1f1f1;
  box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);
  max-width: 100%; /* Ensures the div doesn’t exceed its container */
  word-wrap: break-word; /* Break long words to fit the width */
  overflow-wrap: break-word; /* Modern equivalent for wrapping */
  box-sizing: border-box; /* Include padding in the width */
`;

const MessageHeader = styled.h5`
  margin-bottom: 0.5rem;
  font-weight: bold;
`;

const MessageInput = styled.input`
  width: 75%;
  padding: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  outline: none;

  &:focus {
    border-color: #007bff;
  }
`;

const SendButton = styled.button`
  width: 20%;
  padding: 0.8rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #0056b3;
  }
`;

const GlowingButton = styled.button`
  position: absolute;
  right: 1rem;
  top: 1rem;
  padding: 10px 20px;
  background-color: transparent;
  color: #ff4d4f;
  font-size: 1rem;
  font-weight: bold;
  border: none;
  cursor: pointer;
  text-shadow: 0 0 5px rgba(255, 77, 79, 0.8);
  transition: text-shadow 0.3s ease, transform 0.3s ease;
  z-index: 2;

  &:hover {
    text-shadow: 0 0 15px rgba(255, 77, 79, 1);
    transform: scale(1.1);
  }

  &:focus {
    outline: none;
  }
`;

const ScreenShareButton = styled.button`
  position: fixed;
  bottom: 1rem;
  left: 12rem;
  padding: 1rem 1.5rem;
  background-color: ${props => props.active ? '#0f9d58' : '#1890ff'};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: ${props => props.active ? '#0b7d45' : '#1272c3'};
  }
`;

const ReactionToast = styled.div`
  position: fixed;
  top: 1rem;
  right: 1rem;
  background: rgba(0,0,0,0.7);
  color: #fff;
  padding: 0.6rem 0.9rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  z-index: 5;
`;

const PointerDot = styled.div`
  position: fixed;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(255, 64, 129, 0.9);
  border: 2px solid white;
  pointer-events: none;
  transform: translate(-50%, -50%);
  z-index: 6;
`;

const Room = (props) => {
  const [peers, setPeers] = useState([]);
  const socketRef = useRef();
  const userVideo = useRef();
  const cameraStreamRef = useRef(null);
  const displayStreamRef = useRef(null);
  var peersRef = useRef([]);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const roomID = props.match.params.roomID;
  const [isGeminiOpen, setIsGeminiOpen] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [reactionQueue, setReactionQueue] = useState([]);
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0, visible: false });
  const [activeSpeakerId, setActiveSpeakerId] = useState(null);

  const {nameInContext, setNameInContext} = useName();
  const [emailThroughInput, setEmailThroughInput] = useState('');

  const [userName, setUserName] = useState("Unknown");
  const [userWhoJoined, setUserWhoJoined] = useState(false);


  useEffect(() => {
    
    const storedMessages = JSON.parse(localStorage.getItem(`chatMessages_${roomID}`)) || [];
    setMessages(storedMessages);

    const socketUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin
      : `${process.env.REACT_APP_BASE_URL || 'http://localhost:8181'}`;

    socketRef.current = io.connect(socketUrl, { transports: ['websocket'] });
    socketRef.current.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      alert('Unable to connect to the room server. Please check the backend URL and try again.');
    });
    navigator.mediaDevices
      .getUserMedia({ video: videoConstraints, audio: true })
      .then((stream) => {
        cameraStreamRef.current = stream;
        userVideo.current.srcObject = stream;
        attachAudioMeter(stream, 'local');
        socketRef.current.emit("join room", roomID);

        socketRef.current.on('room full', ()=>{
          alert("plz select name which is more accurate to your interest cause the room with this name is full");
          window.location.href = '/home';
        })
        
        

        socketRef.current.on("all users", (users) => {
          const peers = [];
          users.forEach((userID) => {
            const peer = createPeer(userID, socketRef.current.id, stream);
            peersRef.current.push({ 
              peerID: userID,
              peer,
            });
            peers.push(peer);
          });
          setPeers(peers);
        });

        socketRef.current.on("user joined", (payload) => {
          const peer = addPeer(payload.signal, payload.callerID, stream);
          peersRef.current.push({
            peerID: payload.callerID,
            peer,
          });
          setPeers((users) => [...users, peer]);
        });

        socketRef.current.on("receiving returned signal", (payload) => {
          const item = peersRef.current.find((p) => p.peerID === payload.id);
          item.peer.signal(payload.signal);
        });

      });

    return () => {
      localStorage.setItem(`chatMessages_${roomID}`, JSON.stringify(messages));
    };
  }, [roomID]);

  useEffect(() => {
    localStorage.setItem(`chatMessages_${roomID}`, JSON.stringify(messages));
  }, [messages, roomID]);

  useEffect(()=>{
    socketRef.current.emit('tell everyone that i arrived', {name: nameInContext, roomID});
  }, [nameInContext])

  const iceServers = [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
  ];


  function createPeer(userToSignal, callerID, stream) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      config: { iceServers },
      stream,
    });

    peer.peerSocketId = userToSignal;

    peer.on("signal", (signal) => {
      socketRef.current.emit("sending signal", { userToSignal, callerID, signal });
    });

    return peer;
  }

  function addPeer(incomingSignal, callerID, stream) {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      config: { iceServers },
      stream,
    });
    peer.peerSocketId = callerID;

    peer.on("signal", (signal) => {
      socketRef.current.emit("returning signal", { signal, callerID });
    });

    peer.signal(incomingSignal);

    peer.on("stream", (remoteStream) => {
      attachAudioMeter(remoteStream, callerID);
    });

    return peer;
  }

  function sendMessage() { 
    const newMessage = { roomID, message: inputMessage, from: nameInContext };
    socketRef.current.emit("send message", newMessage);
    setMessages((prevMessages) => [...prevMessages, newMessage]);
    setInputMessage("");
  }

  useEffect(() => {
    socketRef.current.on("receive message", (data) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    socketRef.current.on("receive reaction", (payload) => {
      const id = Date.now() + Math.random();
      setReactionQueue((prev) => [...prev, { ...payload, id }]);
      setTimeout(() => {
        setReactionQueue((prev) => prev.filter((r) => r.id !== id));
      }, 2500);
    });

    socketRef.current.on("pointer move", ({ x, y }) => {
      setPointerPos({ x, y, visible: true });
      setTimeout(() => setPointerPos((prev) => ({ ...prev, visible: false })), 800);
    });

    socketRef.current.on("remove user", (socketIdToRemove) => {
      peersRef.current = peersRef.current.filter(user => user.peerID !== socketIdToRemove);
      setPeers(prevPeers => prevPeers.filter(peer => peer.peerSocketId !== socketIdToRemove));
      window.location.reload();
    });

    socketRef.current.on('user broadcasting his name', nameOfUserWhoJoined => {
      setUserWhoJoined(nameOfUserWhoJoined);
      setTimeout(() => {
          setUserWhoJoined(false);
      }, 3000);
      
    })
  }, []);

  function leaveRoom() {
    const stream = userVideo.current.srcObject;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      userVideo.current.srcObject = null;
    }

    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach((t) => t.stop());
      displayStreamRef.current = null;
    }

    peersRef.current.forEach((peerObj) => {
      peerObj.peer.destroy();
    });

    socketRef.current.emit("leave room", roomID);
    setPeers((prevPeers) => prevPeers.filter((peer) => peer.peerSocketId !== socketRef.current.id));
    let myEmail = window.localStorage.getItem("myEmail");
    window.localStorage.clear(); // Clears all other localStorage data
    window.localStorage.setItem("myEmail", myEmail); // Restore the myEmail value
    window.location.href = `/home`;
  }

  async function startScreenShare() {
    if (isScreenSharing) return;
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });

      const displayTrack = displayStream.getVideoTracks()[0];
      const cameraTrack = cameraStreamRef.current?.getVideoTracks()?.[0];

      displayStreamRef.current = displayStream;
      setIsScreenSharing(true);
      userVideo.current.srcObject = displayStream;

      // When user stops via browser UI, revert
      displayTrack.onended = () => stopScreenShare();

      peersRef.current.forEach(({ peer }) => {
        if (!(displayTrack && peer && peer._pc)) return;
        const sender = peer._pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(displayTrack).catch(err => console.error('replaceTrack (start) failed', err));
        }
      });
    } catch (err) {
      console.error('Error starting screen share:', err);
      setIsScreenSharing(false);
    }
  }

  function stopScreenShare() {
    if (!isScreenSharing) return;

    const displayTrack = displayStreamRef.current?.getVideoTracks()?.[0];
    const cameraTrack = cameraStreamRef.current?.getVideoTracks()?.[0];

    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach((t) => t.stop());
      displayStreamRef.current = null;
    }

    if (cameraStreamRef.current) {
      userVideo.current.srcObject = cameraStreamRef.current;
    }

    peersRef.current.forEach(({ peer }) => {
      if (!(cameraTrack && peer && peer._pc)) return;
      const sender = peer._pc.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) {
        sender.replaceTrack(cameraTrack).catch(err => console.error('replaceTrack (stop) failed', err));
      }
    });

    setIsScreenSharing(false);
  }

  function handleEnter(e){
    console.log(e.key);
    if(e.key=='Enter'){
      if(inputMessage.length){
        sendMessage();
      }
    } 
  }

  function sendReaction(type){
    const payload = { roomID, from: nameInContext || 'Guest', type };
    setReactionQueue((prev) => [...prev, { ...payload, id: Date.now() + Math.random() }]);
    socketRef.current.emit("send reaction", payload);
  }

  // Pointer broadcast when screen sharing
  useEffect(() => {
    if (!isScreenSharing) return;
    let lastSent = 0;
    const handler = (e) => {
      const now = Date.now();
      if (now - lastSent < 80) return;
      lastSent = now;
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      socketRef.current.emit("pointer move", { roomID, x, y });
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [isScreenSharing, roomID]);

  // Active speaker detection (basic volume check)
  const audioContexts = useRef({});
  const analyserById = useRef({});
  const volumeById = useRef({});

  function attachAudioMeter(stream, id) {
    if (!stream) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    audioContexts.current[id] = ctx;
    analyserById.current[id] = analyser;
  }

  useEffect(() => {
    let raf;
    const dataArray = new Uint8Array(256);
    const tick = () => {
      Object.entries(analyserById.current).forEach(([id, analyser]) => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        volumeById.current[id] = avg;
      });
      // pick loudest over threshold
      let maxId = null;
      let maxVal = 0;
      Object.entries(volumeById.current).forEach(([id, val]) => {
        if (val > maxVal && val > 30) {
          maxVal = val;
          maxId = id;
        }
      });
      setActiveSpeakerId(maxId);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);




  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div>

      <GlowingButton onClick={()=>setIsGeminiOpen(prev => !prev)}>{isGeminiOpen ? "CloseGemini" : "AskGemini"}</GlowingButton>
      <LeaveButton onClick={leaveRoom}>Leave room</LeaveButton>
      <ScreenShareButton
        active={isScreenSharing}
        onClick={() => (isScreenSharing ? stopScreenShare() : startScreenShare())}
      >
        {isScreenSharing ? 'Stop Share' : 'Share Screen'}
      </ScreenShareButton>
      <div style={{ position: 'fixed', bottom: '1rem', left: '24rem', display: 'flex', gap: '0.5rem', zIndex: 5 }}>
        {['✋','👍','👏','❤️'].map((r) => (
          <button
            key={r}
            onClick={() => sendReaction(r)}
            style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer', fontSize: '1.05rem' }}
          >
            {r}
          </button>
        ))}
      </div>

      {reactionQueue.map((r) => (
        <ReactionToast key={r.id}>
          <span>{r.type}</span>
          <span>{r.from || 'Someone'}</span>
        </ReactionToast>
      ))}

      {pointerPos.visible && (
        <PointerDot style={{ left: `${pointerPos.x * 100}%`, top: `${pointerPos.y * 100}%` }} />
      )}

      {
        userWhoJoined && <h3 style={{position:'absolute', bottom:'1.8rem', left:'50rem'}}>{userWhoJoined} Joined</h3>
      }

      <Wrapper style={{display:'flex', gap:'2rem', justifyContent:'space-between'}}>
        <Container style={{maxWidth:'100%',}}>
          <StyledVideo muted ref={userVideo} autoPlay playsInline active={activeSpeakerId === 'local'} />
          {peers.map((peer, index) => <Video key={index} peer={peer} active={activeSpeakerId === peer.peerSocketId} />)}
        </Container>

        <div style={{ display: 'flex', gap:'1rem', flexDirection: 'row', height: '100%', width:'100%'}}>
        {
          !isGeminiOpen ? 
          <MessageBox style={{ height: '100%', width: '10rem', flex: 1, position: 'relative', padding:'1rem' }}>
          <div
             style={{
              overflowY: 'auto',
              height: 'calc(100% - 4rem)',
              padding: '1rem',
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none', 
            }}
          >
            {messages.map((msg) => {
              if(msg.from==socketRef.current.id) msg.from = 'You';
              return <MessageDiv key={msg.from + msg.message} style={{ marginBottom: '1rem' }}>
                <MessageHeader style={{ fontWeight: 'bold' }}>{msg.from}</MessageHeader>
                <p>{msg.message}</p>
              </MessageDiv>
            })}
            <div ref={messagesEndRef} />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              bottom: '0',
              width: '100%',
            }}
          >
            <MessageInput
              onKeyUp={handleEnter}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type a message..."
              style={{
                width: '85%',
                padding: '1rem',
                borderRadius: '5px',
                border: '1px solid #ccc',
              }}
            />
            <SendButton
              style={{
                width: 'fit-content',
                backgroundColor: '#4CAF50',
                color: 'white',
                borderRadius: '5px',
                padding: '0.5rem 1rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.3s',
              }}
              onClick={() => inputMessage.length && sendMessage()}
            >
              Send
            </SendButton>
          </div>
        </MessageBox>
        
                  :
                  <Gemini style={{flex: 1 }} />
                }
          </div>
      </Wrapper>
    </div>
  );
};

export default Room;