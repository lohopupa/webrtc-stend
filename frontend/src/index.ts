const startCallButton = document.getElementById('start-call') as HTMLButtonElement
const nicknameInput = document.getElementById('nickname') as HTMLInputElement
const activeUsersList = document.getElementById('active-users') as HTMLUListElement


// const stopCallButton = document.getElementById('stop-call') as HTMLButtonElement

let localStream: MediaStream
let ws: WebSocket

startCallButton.onclick = async () => {
    getUserAudioAndStream('wss://stend.lhpa.ru/ws')
}

async function getUserAudioAndStream(wsUrl: string) {
    if(nicknameInput.value == ""){
        alert("TELL ME YOUR NAME!!!")
        return
    }

    const ws = new WebSocket(wsUrl)
    ws.binaryType = 'arraybuffer'
    const audioContext = new AudioContext()

    ws.onopen = () => {
        ws.send(JSON.stringify({
            type: 'nickname',
            nickname: nicknameInput.value
        }))
    }

    ws.onmessage = async (message: MessageEvent) => {

        if (typeof message.data === 'string') {
            try {
                const data = JSON.parse(message.data)
                if (data.type === 'users') {
                    updateUsersList(data.users)
                }
                return
            } catch (e) {
                // Не JSON, значит это аудио данные
            }
        }

        // console.log(message.data)
        const samples = new Float32Array(message.data)
        // console.log(samples)
        const playbackNode = audioContext.createBufferSource()
        const audioBuffer = audioContext.createBuffer(1, samples.length, audioContext.sampleRate)
        audioBuffer.copyToChannel(samples, 0)
        playbackNode.buffer = audioBuffer
        // console.log(decodedData)
        playbackNode.connect(audioContext.destination)
        playbackNode.start()
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const source = audioContext.createMediaStreamSource(stream)
    const processor = audioContext.createScriptProcessor(4096, 1, 1)

    processor.onaudioprocess = (event) => {
        const samples = event.inputBuffer.getChannelData(0)
        ws.send(samples.buffer)
    }

    source.connect(processor)
    processor.connect(audioContext.destination)
}

function updateUsersList(users: string[]) {
    activeUsersList.innerHTML = ''
    users.forEach(user => {
        const li = document.createElement('li')
        li.textContent = user
        activeUsersList.appendChild(li)
    })
}