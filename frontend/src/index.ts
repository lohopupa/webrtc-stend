const startCallButton = document.getElementById('start-call') as HTMLButtonElement
const nicknameInput = document.getElementById('nickname') as HTMLInputElement
const activeUsersList = document.getElementById('active-users') as HTMLUListElement


// const stopCallButton = document.getElementById('stop-call') as HTMLButtonElement

let localStream: MediaStream
let ws: WebSocket

startCallButton.onclick = async () => {
    getUserAudioAndStream('wss://stend.lhpa.ru/ws')
}

function stringToByteArray(str: string): Uint8Array {
    const encoder = new TextEncoder()
    return encoder.encode(str)
}


async function getUserAudioAndStream(wsUrl: string) {
    if (nicknameInput.value == "") {
        alert("TELL ME YOUR NAME!!!")
        return
    }

    const ws = new WebSocket(wsUrl)
    ws.binaryType = 'arraybuffer'
    const audioContext = new AudioContext()

    const msg = JSON.stringify({
        nickname: nicknameInput.value
    })
    // const byteMsg = [0, ...stringToByteArray(msg)]

    ws.onopen = () => {
        ws.send(0 + msg)
    }

    ws.onmessage = async (message: MessageEvent) => {

        switch (message.data[0]) {
            case 0: {
                console.log("HELLO")
            }
                break
            case 1: {
                console.log(message.data)
            }
                break
            case 2: {
                const samples = new Float32Array(message.data)
                // console.log(samples)
                const playbackNode = audioContext.createBufferSource()
                const audioBuffer = audioContext.createBuffer(1, samples.length, audioContext.sampleRate)
                audioBuffer.copyToChannel(samples, 0)
                playbackNode.buffer = audioBuffer
                playbackNode.connect(audioContext.destination)
                playbackNode.start()
                break
            }
        }


    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const source = audioContext.createMediaStreamSource(stream)
    const processor = audioContext.createScriptProcessor(4096, 1, 1)

    processor.onaudioprocess = (event) => {
        const samples = event.inputBuffer.getChannelData(0)
        ws.send(insertAtStart(samples.buffer, 2))
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

function insertAtStart(samples: ArrayBuffer, newElement: number): Uint8Array {
    const originalArray = new Uint8Array(samples)
    const newArray = new Uint8Array(originalArray.length + 1)
    newArray[0] = newElement
    newArray.set(originalArray, 1)
    return newArray
}
