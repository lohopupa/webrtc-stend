"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startCallButton = document.getElementById('start-call');
let localStream;
let peerConnection;
let ws;
startCallButton.onclick = () => __awaiter(void 0, void 0, void 0, function* () {
    ws = new WebSocket('wss://stend.lhpa.ru/ws');
    ws.onmessage = (message) => __awaiter(void 0, void 0, void 0, function* () {
        const data = JSON.parse(message.data);
        if (data.sdp) {
            yield peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
            if (data.sdp.type === 'offer') {
                const answer = yield peerConnection.createAnswer();
                yield peerConnection.setLocalDescription(answer);
                ws.send(JSON.stringify({ sdp: answer }));
            }
        }
        else if (data.candidate) {
            yield peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    });
    localStream = yield navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    localVideo.srcObject = localStream;
    peerConnection = new RTCPeerConnection();
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    peerConnection.onicecandidate = ({ candidate }) => {
        if (candidate) {
            ws.send(JSON.stringify({ candidate }));
        }
    };
    peerConnection.ontrack = (event) => {
        if (remoteVideo.srcObject !== event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
        }
    };
    const offer = yield peerConnection.createOffer();
    yield peerConnection.setLocalDescription(offer);
    ws.onopen = (w) => __awaiter(void 0, void 0, void 0, function* () {
        ws.send(JSON.stringify({ sdp: offer }));
    });
});
