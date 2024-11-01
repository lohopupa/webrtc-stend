const localVideo = document.getElementById('localVideo') as HTMLVideoElement
const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement
const startCallButton = document.getElementById('start-call') as HTMLButtonElement

let localStream: MediaStream
let peerConnection: RTCPeerConnection
let ws: WebSocket

startCallButton.onclick = async () => {
    ws = new WebSocket('wss://stend.lhpa.ru/ws')

    ws.onmessage = async (message) => {
        const data = JSON.parse(message.data)
        if (data.sdp) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp))
            if (data.sdp.type === 'offer') {
                const answer = await peerConnection.createAnswer()
                await peerConnection.setLocalDescription(answer)
                ws.send(JSON.stringify({ sdp: answer }))
            }
        } else if (data.candidate) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
        }
    }

    localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
    localVideo.srcObject = localStream

    peerConnection = new RTCPeerConnection()
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream))

    peerConnection.onicecandidate = ({ candidate }) => {
        if (candidate) {
            ws.send(JSON.stringify({ candidate }))
        }
    }

    peerConnection.ontrack = (event) => {
        if (remoteVideo.srcObject !== event.streams[0]) {
            remoteVideo.srcObject = event.streams[0]
        }
    }

    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)
    ws.onopen = async (w)=>{
        ws.send(JSON.stringify({ sdp: offer }))
    }
}
