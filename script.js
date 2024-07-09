document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    let mediaRecorder;
    let audioChunks = [];
    let audioContext;
    let processor;

    async function loadVADProcessor() {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        await audioContext.audioWorklet.addModule('vad-processor.js');
        processor = new AudioWorkletNode(audioContext, 'vad-processor');

        processor.port.onmessage = (event) => {
            const isSilent = event.data;
            if (isSilent) {
                if (mediaRecorder && mediaRecorder.state === 'recording') {
                    stopRecording();
                }
            } else {
                if (!mediaRecorder || mediaRecorder.state === 'inactive') {
                    startRecording();
                }
            }
        };
    }

    function startRecording() {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(processor);

                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    const reader = new FileReader();
                    reader.readAsArrayBuffer(audioBlob);
                    reader.onloadend = () => {
                        const audioArrayBuffer = reader.result;
                        socket.emit('send_audio', audioArrayBuffer);
                        audioChunks = [];
                    };
                };
                mediaRecorder.start();
                console.log('Recording started...');
            })
            .catch(error => {
                console.error('Error accessing microphone:', error);
            });
    }

    function stopRecording() {
        if (mediaRecorder) {
            mediaRecorder.stop();
            console.log('Recording stopped...');
        }
    }

    loadVADProcessor();

    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });

    socket.on('receive_audio', data => {
        const audioBlob = new Blob([data], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const responseAudio = document.getElementById('responseAudio');
        responseAudio.src = audioUrl;
    });

    window.addEventListener('beforeunload', stopRecording);
});