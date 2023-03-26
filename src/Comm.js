import React, { Fragment, useState, useEffect, useRef } from "react";
import {
  Header,
  Icon,
  Input,
  Grid,
  Segment,
  Button,
  Loader
} from "semantic-ui-react";
import SweetAlert from "react-bootstrap-sweetalert";
import ReactSwitch from 'react-switch';
import "./App.css";
import UsersList from "./UsersList";
import Canvas from './Canvas';

// Use for remote connections
const configuration = {
  iceServers: [{ url: "stun:stun.1.google.com:19302" }]
};

// Use for local connections
// const configuration = null;

// useRef: The useRef Hook allows you to persist values between renders.
// It can be used to store a mutable value that does not cause a re-render when updated.
const Comm = ({ connection, updateConnection, channel, updateChannel }) => {
  const [socketOpen, setSocketOpen] = useState(false);
  const [socketMessages, setSocketMessages] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [name, setName] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [users, setUsers] = useState([]);
  const [connectedTo, setConnectedTo] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [alert, setAlert] = useState(null);
  const connectedRef = useRef();
  const webSocket = useRef(null);
  const messagesRef = useRef({});
  const [messages, setMessages] = useState({});
  const [isSending, setIsSending] = useState(true);

  // connect to websocket, receive messages and push it to socketMessages
  useEffect(() => {
    webSocket.current = new WebSocket('ws://localhost:3030');
    webSocket.current.onmessage = message => {
      const data = JSON.parse(message.data);
      setSocketMessages(prev => [...prev, data]);
    };
    webSocket.current.onclose = () => {
      webSocket.current.close();
    };
    return () => webSocket.current.close();
  }, []);

  // handle socket messages on receive, delegate each to appropriate function
  useEffect(() => {
    let data = socketMessages.pop();
    // console.log(data);
    if (data) {
      switch (data.type) {
        case "connect":
          setSocketOpen(true);
          break;
        case "login":
          onLogin(data);
          break;
        case "updateUsers":
          updateUsersList(data);
          break;
        case "removeUser":
          removeUser(data);
          break;
        case "offer":
          onOffer(data);
          break;
        case "answer":
          onAnswer(data);
          break;
        case "candidate":
          onCandidate(data);
          break;
        default:
          break;
      }
    }
  }, [socketMessages]);

  // close alert popup (press ok on alert popup)
  const closeAlert = () => {
    setAlert(null);
  };

  // send arbitrary json data on socket
  const send = data => {
    webSocket.current.send(JSON.stringify(data));
  };

  // send login msg to server
  const handleLogin = () => {
    setLoggingIn(true);
    send({
      type: "login",
      name
    });
  };

  // add user to users list
  const updateUsersList = ({ user }) => {
    setUsers(prev => [...prev, user]);
  };

  // remove user from users list
  const removeUser = ({ user }) => {
    setUsers(prev => prev.filter(u => u.userName !== user.userName));
  }

  // receive msg from peer, add it to peer existing msgs if any
  // update msgs state to force re-render
  const handleDataChannelMessageReceived = ({ data }) => {
    setMessages(data);
  };

  // receive login response from server, handle if success or fail
  // create peer connections and add handlers for it
  const onLogin = ({ success, message, users: loggedIn }) => {
    setLoggingIn(false);
    if (success) {
      setAlert(
        <SweetAlert
          success
          title="Success!"
          onConfirm={closeAlert}
          onCancel={closeAlert}
        >
          Logged in successfully!
        </SweetAlert>
      );
      setIsLoggedIn(true);
      setUsers(loggedIn);
      let localConnection = new RTCPeerConnection(configuration);
      //when the browser finds an ice candidate we send it to another peer
      localConnection.onicecandidate = ({ candidate }) => {
        let connectedTo = connectedRef.current;

        if (candidate && !!connectedTo) {
          send({
            name: connectedTo,
            type: "candidate",
            candidate
          });
        }
      };
      localConnection.ondatachannel = event => {
        console.log("Data channel is created!");
        let receiveChannel = event.channel;
        receiveChannel.onopen = () => {
          console.log("Data channel is open and ready to be used.");
        };
        receiveChannel.onmessage = handleDataChannelMessageReceived;
        updateChannel(receiveChannel);
      };
      updateConnection(localConnection);
    } else {
      setAlert(
        <SweetAlert
          warning
          confirmBtnBsStyle="danger"
          title="Failed"
          onConfirm={closeAlert}
          onCancel={closeAlert}
        >
          {message}
        </SweetAlert>
      );
    }
  };

  // accept incoming offers and send an answer back to them
  //when somebody wants to message us
  const onOffer = ({ offer, name }) => {
    setConnectedTo(name);
    connectedRef.current = name;

    connection
      .setRemoteDescription(new RTCSessionDescription(offer))
      .then(() => connection.createAnswer())
      .then(answer => connection.setLocalDescription(answer))
      .then(() =>
        send({ type: "answer", answer: connection.localDescription, name })
      )
      .catch(e => {
        console.log({ e });
        setAlert(
          <SweetAlert
            warning
            confirmBtnBsStyle="danger"
            title="Failed"
            onConfirm={closeAlert}
            onCancel={closeAlert}
          >
            An error has occurred.
          </SweetAlert>
        );
      });
  };

  //when another user answers to our offer
  const onAnswer = ({ answer }) => {
    connection.setRemoteDescription(new RTCSessionDescription(answer));
  };

  //when we got ice candidate from another user
  const onCandidate = ({ candidate }) => {
    connection.addIceCandidate(new RTCIceCandidate(candidate));
  };

  // retrieve existing msgs and append new msgs on it
  // then update message state to force re-render and display new messages
  // also send msgs to connected peer
  //when a user clicks the send message button
  const sendMsg = (binary) => {
    if (channel && isSending) {
      channel.send(binary);
    }
  };

  // connect with peer, create new data channel and send offer
  const handleConnection = name => {
    var dataChannelOptions = {
      reliable: true
    };

    let dataChannel = connection.createDataChannel("messenger");

    dataChannel.onerror = error => {
      setAlert(
        <SweetAlert
          warning
          confirmBtnBsStyle="danger"
          title="Failed"
          onConfirm={closeAlert}
          onCancel={closeAlert}
        >
          An error has occurred.
        </SweetAlert>
      );
    };

    dataChannel.onmessage = handleDataChannelMessageReceived;
    updateChannel(dataChannel);

    connection
      .createOffer()
      .then(offer => connection.setLocalDescription(offer))
      .then(() =>
        send({ type: "offer", offer: connection.localDescription, name })
      )
      .catch(e =>
        setAlert(
          <SweetAlert
            warning
            confirmBtnBsStyle="danger"
            title="Failed"
            onConfirm={closeAlert}
            onCancel={closeAlert}
          >
            An error has occurred.
          </SweetAlert>
        )
      );
  };

  // connect or disconnect to user, based on previous state
  const toggleConnection = userName => {
    if (connectedRef.current === userName) {
      setConnecting(true);
      setConnectedTo("");
      connectedRef.current = "";
      connection.close();
      setConnecting(false);
    } else {
      setConnecting(true);
      setConnectedTo(userName);
      connectedRef.current = userName;
      handleConnection(userName);
      setConnecting(false);
    }
  };

  return (
    <div className="App">
      {alert}
      <Header as="h2" icon>
        <Icon name="users" />
        WebRTC Whiteboard
      </Header>
      {(true && (
        <Fragment>
          <Grid centered columns={4}>
            <Grid.Column>
              {(!isLoggedIn && (
                <Input
                  fluid
                  disabled={loggingIn}
                  type="text"
                  onChange={e => setName(e.target.value)}
                  placeholder="Username..."
                  action
                >
                  <input />
                  <Button
                    color="teal"
                    disabled={!name || loggingIn}
                    onClick={handleLogin}
                  >
                    <Icon name="sign-in" />
                    Login
                  </Button>
                </Input>
              )) || (
                  <Segment raised textAlign="center" color="olive">
                    Logged In as: {name}
                  </Segment>
                )}

              <div className="app" style={{ textAlign: "center", marginTop: '30px' }}>
                <h4>Send updates</h4>
                <ReactSwitch
                  checked={isSending}
                  onChange={(e) => { setIsSending(e); }}
                />
              </div>
            </Grid.Column>
            <UsersList
              users={users}
              toggleConnection={toggleConnection}
              connectedTo={connectedTo}
              connection={connecting}
            />
          </Grid>
          <Grid>

            <Canvas
              messages={messages}
              sendMsg={sendMsg}
            ></Canvas>

          </Grid>
        </Fragment>
      )) || (
          <Loader size="massive" active inline="centered">
            Loading
          </Loader>
        )}
    </div>
  );
};

export default Comm;
