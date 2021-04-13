let inboundPeerConnection;
let outboundPeerConnection;

let clientVideoElement, peerVideoElement, audioSelect, videoSelect;

let vidChatInitialized = false;

function initVidChat() {
    if (vidChatInitialized) return;

    vidChatInitialized = true;

    addVidOptionsToDOM();

    clientVideoElement = createClientVideoElement();
    peerVideoElement = createPeerVideoElement();

    const enableAudioButton = document.getElementById('enable-audio');

    enableAudioButton.addEventListener("click", enableAudio);

    // Get camera and microphone
    audioSelect = document.querySelector("select#audioSource");
    videoSelect = document.querySelector("select#videoSource");

    audioSelect.onchange = getStream;
    videoSelect.onchange = getStream;

    getStream()
        .then(getDevices)
        .then(gotDevices);
}

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

socket.on("connectToRtc", (id, rtcConfig) => {
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

socket.on("offer", (id, description, rtcConfig) => {
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

function addVidOptionsToDOM() {
    const audioSourceSection = document.createElement('section');
    audioSourceSection.classList.add('select');

    const audioSourceLabel = document.createElement('label');
    audioSourceLabel.for = 'audioSource';
    audioSourceLabel.innerText = 'Audio source: ';

    const audioSourceSelect = document.createElement('select');
    audioSourceSelect.id = 'audioSource';

    audioSourceSection.appendChild(audioSourceLabel);
    audioSourceSection.appendChild(audioSourceSelect);


    const videoSourceSection = document.createElement('section');
    videoSourceSection.classList.add('select');

    const videoSourceLabel = document.createElement('label');
    videoSourceLabel.for = 'videoSource';
    videoSourceLabel.innerText = 'Video source: ';

    const videoSourceSelect = document.createElement('select');
    videoSourceSelect.id = 'videoSource';

    videoSourceSection.appendChild(videoSourceLabel);
    videoSourceSection.appendChild(videoSourceSelect);


    const enableAudioButton = document.createElement('button');
    enableAudioButton.id = 'enable-audio';
    enableAudioButton.innerText = 'Enable Audio';


    const vidOptionsDiv = document.getElementById('vidOptions');
    vidOptionsDiv.appendChild(audioSourceSection);
    vidOptionsDiv.appendChild(videoSourceSection);
    vidOptionsDiv.appendChild(enableAudioButton);
}


