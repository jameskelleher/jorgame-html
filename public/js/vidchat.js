let inboundPeerConnection;
let outboundPeerConnection;

const rtcConfig = {
    iceServers: [
        {
            "urls": "stun:stun.l.google.com:19302",
        },
        // { 
        //   "urls": "turn:TURN_IP?transport=tcp",
        //   "username": "TURN_USERNAME",
        //   "credential": "TURN_CREDENTIALS"
        // }
    ]
};

// const clientVideoElement = document.querySelector("video#clientVideo");
const clientVideoElement = createClientVideoElement();
// const peerVideoElement = document.querySelector("video#peerVideo");
const peerVideoElement = createPeerVideoElement();
const enableAudioButton = document.getElementById('enable-audio');

enableAudioButton.addEventListener("click", enableAudio);

function createVideoElement() {
    const vid = document.createElement('video');
    vid.playsInline = true;
    vid.autoplay = true;
    vid.muted = true;

    return vid
}

function createClientVideoElement() {
    const vid = createVideoElement();

    vid.id = 'clientVideo';

    document.getElementById('playerCam').appendChild(vid);

    return vid;
}

function createPeerVideoElement() {
    const vid = createVideoElement();

    vid.id = 'peerVideo';

    document.getElementById('opponentCam').appendChild(vid);

    return vid;
}

socket.on("answer", (id, description) => {
    outboundPeerConnection.setRemoteDescription(description);
});

socket.on("connectToRtc", id => {
    outboundPeerConnection = new RTCPeerConnection(rtcConfig);

    let stream = clientVideoElement.srcObject;

    console.log(`Stream: ${clientVideoElement.srcObject}`);
    stream.getTracks().forEach(track => outboundPeerConnection.addTrack(track, stream));

    outboundPeerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit("inboundCandidate", id, event.candidate);
        }
    };

    outboundPeerConnection
        .createOffer()
        .then(sdp => outboundPeerConnection.setLocalDescription(sdp))
        .then(() => {
            socket.emit("offer", id, outboundPeerConnection.localDescription);
        });
});

socket.on("offer", (id, description) => {
    inboundPeerConnection = new RTCPeerConnection(rtcConfig);
    inboundPeerConnection
        .setRemoteDescription(description)
        .then(() => inboundPeerConnection.createAnswer())
        .then(sdp => inboundPeerConnection.setLocalDescription(sdp))
        .then(() => {
        socket.emit("answer", id, inboundPeerConnection.localDescription);
    });

    inboundPeerConnection.ontrack = event => {
        peerVideoElement.srcObject = event.streams[0];
    };

    inboundPeerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit("outboundCandidate", id, event.candidate);
        }
    };
});

socket.on("inboundCandidate", (id, candidate) => {
    inboundPeerConnection
        .addIceCandidate(new RTCIceCandidate(candidate))
        .catch(e => console.log(e));
});

socket.on("outboundCandidate", (id, candidate) => {
    outboundPeerConnection
        .addIceCandidate(new RTCIceCandidate(candidate))
        .catch(e => console.log(e));
});

// Get camera and microphone
const audioSelect = document.querySelector("select#audioSource");
const videoSelect = document.querySelector("select#videoSource");

audioSelect.onchange = getStream;
videoSelect.onchange = getStream;

getStream()
    .then(getDevices)
    .then(gotDevices);

function getDevices() {
    return navigator.mediaDevices.enumerateDevices();
}

function gotDevices(deviceInfos) {
    window.deviceInfos = deviceInfos;
    for (const deviceInfo of deviceInfos) {
        const option = document.createElement("option");
        option.value = deviceInfo.deviceId;
        if (deviceInfo.kind === "audioinput") {
            option.text = deviceInfo.label || `Microphone ${audioSelect.length + 1}`;
            audioSelect.appendChild(option);
        } else if (deviceInfo.kind === "videoinput") {
            option.text = deviceInfo.label || `Camera ${videoSelect.length + 1}`;
            videoSelect.appendChild(option);
        }
    }
}

function getStream() {
    if (window.stream) {
        window.stream.getTracks().forEach(track => {
            track.stop();
        });
    }
    const audioSource = audioSelect.value;
    const videoSource = videoSelect.value;
    const constraints = {
        audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
        video: { deviceId: videoSource ? { exact: videoSource } : undefined }
    };
    return navigator.mediaDevices
        .getUserMedia(constraints)
        .then(gotStream)
        .catch(handleError);
}

function gotStream(stream) {
    console.log("hello from gotStream");
    window.stream = stream;
    audioSelect.selectedIndex = [...audioSelect.options].findIndex(
        option => option.text === stream.getAudioTracks()[0].label
    );
    videoSelect.selectedIndex = [...videoSelect.options].findIndex(
        option => option.text === stream.getVideoTracks()[0].label
    );
    clientVideoElement.srcObject = stream;
    console.log("about to emit");
    socket.emit("rtcReady");
}

function enableAudio() {
    console.log("Enabling audio");
    peerVideoElement.muted = false;
}

function handleError(error) {
    console.error("Error: ", error);
}



