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
const startCallButton = document.getElementById('start-call');
// const stopCallButton = document.getElementById('stop-call') as HTMLButtonElement
let localStream;
let ws;
startCallButton.onclick = () => __awaiter(void 0, void 0, void 0, function* () {
    getUserAudioAndStream('wss://stend.lhpa.ru/ws');
});
function getUserAudioAndStream(wsUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        const ws = new WebSocket(wsUrl);
        ws.binaryType = 'arraybuffer';
        const audioContext = new AudioContext();
        ws.onmessage = (message) => __awaiter(this, void 0, void 0, function* () {
            // console.log(message.data)
            const samples = new Float32Array(message.data);
            // console.log(samples)
            const playbackNode = audioContext.createBufferSource();
            const audioBuffer = audioContext.createBuffer(1, samples.length, audioContext.sampleRate);
            audioBuffer.copyToChannel(samples, 0);
            playbackNode.buffer = audioBuffer;
            // console.log(decodedData)
            playbackNode.connect(audioContext.destination);
            playbackNode.start();
        });
        const stream = yield navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (event) => {
            const samples = event.inputBuffer.getChannelData(0);
            ws.send(samples.buffer);
            // console.log(samples.buffer)
            // const arrayBuffer = await message.data.arrayBuffer()
            // audioContext.decodeAudioData(arrayBuffer, (decodedData) => {
            // })
        };
        source.connect(processor);
        processor.connect(audioContext.destination);
        // const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        // const audioContext = new AudioContext()
        // const source = audioContext.createMediaStreamSource(stream)
        // const processor = audioContext.createScriptProcessor(4096, 1, 1)
        // const ws = new WebSocket(wsUrl)
        // ws.onopen = () => {
        //     const stopTime = Date.now() + durationMs
        //     processor.onaudioprocess = (event) => {
        //         if (ws.readyState === WebSocket.OPEN) {
        //             ws.send(event.inputBuffer.getChannelData(0))
        //         }
        //         if (Date.now() >= stopTime) {
        //             source.disconnect(processor)
        //             processor.disconnect(audioContext.destination)
        //             stream.getTracks().forEach(track => track.stop())
        //             ws.close()
        //         }
        //     }
        //     source.connect(processor)
        //     processor.connect(audioContext.destination)
        // }
        // ws.onmessage = async (message) => {
        //     const audioBuffer = await audioContext.decodeAudioData(message.data)
        //     const playbackSource = audioContext.createBufferSource()
        //     playbackSource.buffer = audioBuffer
        //     playbackSource.connect(audioContext.destination)
        //     playbackSource.start()
        // }
    });
}
