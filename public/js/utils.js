import WaveSurfer from "https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.esm.js";
// import RecordPlugin from "https://unpkg.com/wavesurfer.js@7/dist/plugins/record.esm.js";
// import TimelinePlugin from "https://unpkg.com/wavesurfer.js@7/dist/plugins/timeline.esm.js";
import encode from "https://esm.sh/@audio/encode"

// import Tone.js library
import * as Tone from "https://esm.sh/tone@15.5.54";

// ─── Sample registry ───────────────────────────────────────────────
const SAMPLE_SOURCES = {
    piano: {
        baseUrl: "https://tonejs.github.io/audio/salamander/",
        notes: {
            36: "C2.mp3", 39: "Ds2.mp3", 42: "Fs2.mp3", 45: "A2.mp3",
            48: "C3.mp3", 51: "Ds3.mp3", 54: "Fs3.mp3", 57: "A3.mp3",
            60: "C4.mp3", 63: "Ds4.mp3", 66: "Fs4.mp3", 69: "A4.mp3",
            72: "C5.mp3", 75: "Ds5.mp3", 78: "Fs5.mp3", 81: "A5.mp3",
            84: "C6.mp3", 87: "Ds6.mp3", 90: "Fs6.mp3", 93: "A6.mp3",
            96: "C7.mp3", 99: "Ds7.mp3", 102: "Fs7.mp3", 105: "A7.mp3",
            108: "C8.mp3",
        },
        release: 1,
    },
    violin: {
        baseUrl: "https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples/violin/",
        notes: {
            55: "G3.mp3",  57: "A3.mp3", 60: "C4.mp3",  64: "E4.mp3",
            67: "G4.mp3",  69: "A4.mp3", 72: "C5.mp3",  76: "E5.mp3",
            79: "G5.mp3",  81: "A5.mp3", 84: "C6.mp3",  88: "E6.mp3",
            91: "G6.mp3",  93: "A6.mp3", 96: "C7.mp3",
        },
        release: 0.8,
    },
    cello: {
        baseUrl: "https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples/cello/",
        notes: {
            36: "C2.mp3", 40: "E2.mp3", 43: "G2.mp3", 48: "B2.mp3",
            51: "Ds3.mp3", 54: "Fs3.mp3", 58: "A3.mp3", 60: "C4.mp3",
            64: "E4.mp3", 67: "G4.mp3", 71: "B4.mp3",
        },
        release: 0.6,
    },
    saxophone: {
        baseUrl: "https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples/saxophone/",
        notes: {
            // might be an octave shift
            49: "Cs3.mp3", 52: "E3.mp3", 55: "G3.mp3", 58: "As3.mp3",
            60: "C4.mp3", 64: "E4.mp3", 67: "G4.mp3", 70: "As4.mp3",
            72: "C5.mp3", 76: "E5.mp3", 79: "G5.mp3", 81: "A5.mp3",
        },
        release: 0.5
    },
    flute: {
        baseUrl: "https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples/flute/",
        notes: {
            60: "C4.mp3",   // sounds as C5
            64: "E4.mp3",   // sounds as E5
            69: "A4.mp3",   // sounds as A5  (there's an octave shift in the flute data)
            72: "C5.mp3",   // sounds as C6
            76: "E5.mp3",   // sounds as E6
            81: "A5.mp3",   // sounds as A6
            84: "C6.mp3",   // sounds as C7
            88: "E6.mp3",   // sounds as E7
            93: "A6.mp3",   // sounds as A7
        },
        release: 0.4,
    },
    guitar_acoustic: {
        baseUrl: "https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples/guitar-acoustic/",
        notes: {
                          40: "E2.mp3", 43: "G2.mp3", 45: "A2.mp3",
            48: "C3.mp3", 52: "E3.mp3", 55: "G3.mp3", 57: "A3.mp3",
            60: "C4.mp3", 64: "E4.mp3", 67: "G4.mp3", 69: "A4.mp3",
            72: "C5.mp3",
        },
        release: 0.6,
    },
    guitar_nylon: {
        baseUrl: "https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples/guitar-nylon/",
        notes: {
                           40: "E2.mp3", 42: "Fs2.mp3", 44: "Gs2.mp3", 45: "A2.mp3",
            49: "Cs3.mp3", 52: "E3.mp3", 54: "Fs3.mp3",                57: "A3.mp3",
            61: "Cs4.mp3", 64: "E4.mp3", 66: "Fs4.mp3",                69: "A4.mp3",
            73: "Cs5.mp3",
        },
        release: 0.3,
    },
    // add more instruments here...
};

// ─── Buffer cache ─────────────────────────────────────────────────
const bufferCache = {};

async function ensureBuffers(instrument) {
    if (bufferCache[instrument]) return bufferCache[instrument];

    const { baseUrl, notes } = SAMPLE_SOURCES[instrument];
    const entries = await Promise.all(
        Object.entries(notes).map(async ([midi, file]) => {
            const res = await fetch(baseUrl + file);
            const ab = await res.arrayBuffer();
            return [Number(midi), await Tone.getContext().decodeAudioData(ab)];
        })
    );

    bufferCache[instrument] = Object.fromEntries(entries);
    return bufferCache[instrument];
}


// let pianoBuffers = null;
// async function ensurePianoBuffers() {
//     if (pianoBuffers) return pianoBuffers;
//     const baseUrl = "https://tonejs.github.io/audio/salamander/";
//     const urls = {
//         36: "C2.mp3", 38: "Ds2.mp3", 41: "Fs2.mp3", 45: "A2.mp3",
//         48: "C3.mp3", 50: "Ds3.mp3", 53: "Fs3.mp3", 57: "A3.mp3",
//         60: "C4.mp3", 62: "Ds4.mp3", 65: "Fs4.mp3", 69: "A4.mp3",
//         72: "C5.mp3", 74: "Ds5.mp3", 77: "Fs5.mp3", 81: "A5.mp3",
//         84: "C6.mp3", 86: "Ds6.mp3", 89: "Fs6.mp3", 93: "A6.mp3",
//         96: "C7.mp3", 98: "Ds7.mp3", 101: "Fs7.mp3", 105: "A7.mp3",
//         108: "C8.mp3",
//     };
//     const entries = await Promise.all(
//         Object.entries(urls).map(async ([midi, file]) => {
//             const res = await fetch(baseUrl + file);
//             const ab = await res.arrayBuffer();
//             return [Number(midi), await Tone.getContext().decodeAudioData(ab)];
//         })
//     );
//     pianoBuffers = Object.fromEntries(entries);
//     return pianoBuffers;
// }


const MINPXPERSEC = 8;


export const makeWaveSurfer = (songTrack, blobUrl) => {

    const wavesurfer = WaveSurfer.create({
        "container": songTrack.querySelector(".waveform-track"),
        // "sampleRate": 44100,
        "waveColor": "darkgreen",
        "progressColor": "olive",
        "barWidth": 2,
        "barRadius": 4,
        "interact": false,
        "normalize": true,
        "fillParent": false,
        "minPxPerSec": MINPXPERSEC,
        // "plugins": [
        //     TimelinePlugin.create()
        // ],
        "url": blobUrl
    });

    // wavesurfer.on("interaction", () => {
    //     wavesurfer.playPause();
    // });

    wavesurfer.on("finish", () => {
        wavesurfer.setVolume(1);
    })

    wavesurfer.on("ready", () => {
        songTrack.setDuration(wavesurfer.getDuration());
        console.log(`Ready, duration: ${songTrack.duration}`);
        // set width of containing div proportional to duration
        const container =  songTrack.querySelector(".waveform-track");
        container.style.width = `${wavesurfer.getDuration() * MINPXPERSEC * 1.01}px`;
        songTrack.closest("song-div").updateTimeline();
        // reveal control buttons
        const trackDetailButtons = songTrack.querySelector(".track-detail-buttons");
        trackDetailButtons.classList.remove("hidden-div");
        const muteLabel = songTrack.querySelector(".mute-checkbox-label");
        muteLabel.classList.remove("hidden-label");
    });

    wavesurfer.on("timeupdate", (t) => {
        if (songTrack.closest("song-div")) songTrack.closest("song-div").syncTimeline(t);
    });

    return wavesurfer;
};


export const detectMarkerSignal = (buffer) => {
    // Find the 10 kHz marker in the recording
    const data = buffer.getChannelData(0);

    // console.log(data);

    // Go through the first 1 second, look for a burst of energy at 10 kHz
    const startIdx = 0; // Math.floor(0.4 * buffer.sampleRate);
    const endIdx = buffer.sampleRate; // Math.floor(0.6 * buffer.sampleRate);
    let markerIdx = 0;
    let peakVal = 0;
    for (let i = startIdx; i < endIdx; i++) {
        if (Math.abs(data[i]) > peakVal) {
            peakVal = Math.abs(data[i]);
            // console.log("Found a biggie ... ", i, data[i]);
            markerIdx = i;
        }
    }

    console.log(markerIdx, `${markerIdx / buffer.sampleRate}`, `lag: ${markerIdx / buffer.sampleRate - 0.5} s`);

    // The marker was injected at 0.5 s, but it appears at markerIdx/sampleRate
    // The difference is the dest→file latency
    const destToFileOffset = (markerIdx / buffer.sampleRate) - 0.5;
    return destToFileOffset;
};


export const makeRecorder = async (songTrack) => {

    // TODO: (MAJOR) The recording is lagging the existing tracks.  AI says:
    //       For a music recording app where sync matters, the automated probe is the right answer.
    //       It's what openDAW ships, and it's the only approach that's both automatic and accurate across devices.

    // 0. Create a new WaveSurfer object
    const wavesurfer = WaveSurfer.create({
        container: songTrack.querySelector(".waveform-track"),
        waveColor: "darkgreen",
        progressColor: "olive",
        barWidth: 2,
        barRadius: 4,
        interact: false,
        normalize: true,
        fillParent: false,
        minPxPerSec: MINPXPERSEC
    });

    const stream = await navigator.mediaDevices.getUserMedia({
        "audio": {
            // "sampleRate": 44100,
            "echoCancellation": false,
            "noiseSuppression": true,
            "autoGainControl": false
        }
    });

    // audio context for real-time processing and visualizing
    const audioCtx = new AudioContext({
        "latencyHint": "playback"
    });
    const source = audioCtx.createMediaStreamSource(stream);
    const gain = audioCtx.createGain();
    const dest = audioCtx.createMediaStreamDestination();
    source.connect(gain).connect(dest);

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.9;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.fftSize);

    // 2. Set up MediaRecorder
    const mimeType = ["audio/webm", "audio/wav", "audio/mpeg", "audio/mp4"]
        .find(m => MediaRecorder.isTypeSupported(m)) || "";
    const mediaRecorder = new MediaRecorder(dest.stream, {
        mimeType,
        audioBitsPerSecond: 128000
    });

    // record chunks
    const chunks = [];
    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
        console.log("Media Recorder stopped");

        const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
        // keep mic open in case of rerecording
        chunks.length = 0;

        // 3. Render the final waveform in WaveSurfer
        wavesurfer.load(URL.createObjectURL(blob)); // ← just load new audio

        wavesurfer.on("ready", () => {
            console.log("WAVE FORM READY TO ROCK & ROLL!!!!");
            songTrack.wavesurfer = wavesurfer;
            songTrack.setDuration(wavesurfer.getDuration());
            const container = songTrack.querySelector('.waveform-track');
            container.style.width = `${wavesurfer.getDuration() * MINPXPERSEC * 1.01 + 2}px`;
            songTrack.closest("song-div").updateTimeline();

            // detect the inserted marker at 500 ms
            const audioBuffer = wavesurfer.getDecodedData();
            detectMarkerSignal(audioBuffer);
        });

        // 4. Fire your "record-end" logic
        const recButton = songTrack.querySelector(".save-recording-button");
        if (recButton) recButton.disabled = false;
        songTrack.recordedBlob = blob;
        songTrack.querySelector(".track-detail-buttons").classList.remove("hidden-div");
        songTrack.querySelector(".mute-checkbox-label").classList.remove("hidden-label");
    };

    // visualizer
    const canvas = songTrack.querySelector(".recording-visualizer-canvas");
    const ctx2d = canvas.getContext("2d");
    let rafId;   // frame ID for visualizer (needed to cancel recursive loop in stop())
    let frame = 0;

    const drawVisualizer = () => {
        rafId = requestAnimationFrame(drawVisualizer);
        if (++frame % 2 === 0) return; // draw only every other frame (~30 fps)

        // analyser.getByteTimeDomainData(dataArray);   // draw a wave representation of instantaneous signal
        analyser.getByteFrequencyData(dataArray);       // draw frequency spectrum

        ctx2d.clearRect(0, 0, canvas.width, canvas.height);

        const START = 20;
        const END = Math.min(100, dataArray.length - 1);
        const barWidth = canvas.width / (END + 1);

        for (let i = START; i < END; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;
            // Log-scaled x position (0 at left, canvas.width at right)
            // const x = (Math.log(1 + i) / Math.log(1 + dataArray.length)) * canvas.width;
            // linear visualizer with low-pass filter
            const x = ((i - START) / (END - START + 1)) * canvas.width;

            ctx2d.fillStyle = "darkgreen";
            ctx2d.fillRect(
                x,
                canvas.height - barHeight,  // ← bars grow upward
                barWidth - 1,
                barHeight
            );
        }
    };

    // --- Handle ---
    return {
        async start() {
            console.log("STARTING RECORDER. . . ");

            if (audioCtx.state === "suspended") audioCtx.resume();
            if (mediaRecorder.state === "recording") return;

            gain.gain.setValueAtTime(0, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.05);
            mediaRecorder.start(200);

            // schedule injection of marker signal to correct lag in post
            // should happen at 500 ms
            const markerTime = audioCtx.currentTime + 0.5; // 500 ms into the recording
            const osc = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            osc.frequency.value = 1000; // 10 kHz — above musical range, won't clash
            g.gain.setValueAtTime(0.5, markerTime);
            g.gain.setValueAtTime(0, markerTime + 0.2);
            osc.connect(g).connect(dest);
            osc.start(markerTime);
            osc.stop(markerTime + 0.2);

            // start visualizing
            canvas.classList.remove("invisible-div");
            drawVisualizer();
        },
        isRecording() {
            return mediaRecorder.state === "recording";
        },
        stop() {
            console.log("STOPPING RECORDER. . . ");

            if (mediaRecorder.state === "inactive") return;
            gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.03);
            setTimeout(() => mediaRecorder.stop(), 50);
            // stop visualizing
            cancelAnimationFrame(rafId);
            canvas.classList.add("invisible-div");
        },
        destroy() {
            console.log("DESTROYING RECORDER. . . ");
            this.stop();

            // Stop the mic tracks
            stream.getTracks().forEach(t => t.stop());

            // clean up audiocontext
            source.disconnect();
            gain.disconnect();
            audioCtx.close();
            stream.getTracks().forEach(t => t.stop());

            // destroy wavesurfer
            wavesurfer.destroy();
        }
    };

};


export const deleteAudioFromS3 = async (fileName) => {
    const urlResponse = await fetch(`/s3/delete-url?fileName=${encodeURIComponent(fileName)}`, {
        method: "GET",
        // headers: {
        //     "Content-Type": "application/json",
        //     // Include auth headers here if your route is protected
        // }
    });

    if (!urlResponse.ok) {
        const error = await urlResponse.json();
        throw new Error(`Failed to get delete URL: ${error.error}`);
    }

    const { url } = await urlResponse.json();

    const deleteResponse = await fetch(url, {
        method: "DELETE"
    });

    if (!deleteResponse.ok) {
        throw new Error(`Failed to delete from S3: ${deleteResponse.statusText}`);
    }

    console.log("Delete successful!");
};


export const uploadAudioToS3 = async (audioBlob, fileName) => {
    // 1. Request the presigned URL from your Express server
    const urlResponse = await fetch(`/s3/upload-url?fileName=${encodeURIComponent(fileName)}`, {
        method: "GET",
        // headers: {
        //     "Content-Type": "application/json",
        //     // Include auth headers here if your route is protected
        // }
    });

    if (!urlResponse.ok) {
        const error = await urlResponse.json();
        throw new Error(`Failed to get upload URL: ${error.error}`);
    }

    const { url } = await urlResponse.json();

    // 2. Upload the blob directly to S3 using the presigned URL
    // Note: We use PUT method and pass the blob directly as the body
    const uploadResponse = await fetch(url, {
        method: "PUT",
        body: audioBlob,
        headers: {
            "Content-Type": "audio/webm" // Must match the ContentType used in the backend command
        }
    });

    if (!uploadResponse.ok) {
        throw new Error(`Failed to upload to S3: ${uploadResponse.statusText}`);
    }

    console.log("Upload successful!");
    // The file is now available at the URL constructed from your bucket and key
    // e.g., https://<bucket>.s3.<region>.amazonaws.com/recordings/<fileName>
};


export const encodeBlobToWebm = async (songTrack) => {
    const audioBuffer = songTrack.wavesurfer.getDecodedData();
    const channelData = Array.from({ length: audioBuffer.numberOfChannels },
        (_, i) => audioBuffer.getChannelData(i));

    const bytes = await encode.webm(channelData, {
        sampleRate: audioBuffer.sampleRate,
        // optional: bitrate, etc.
    });

    const blob = new Blob([bytes], { type: "audio/webm" });
    songTrack.recordedBlob = blob;
};


export const loadAudioBlob = async (fileName) => {
    // 1. Request the presigned playback URL from your Express server
    const response = await fetch(`/s3/playback-url?key=${encodeURIComponent(fileName)}`, {
        method: "GET",
        // headers: {
        //     "Content-Type": "application/json",
        //     // Include auth headers here if your route is protected
        // }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get playback URL: ${error.error}`);
    }

    const { url } = await response.json();

    // 2. Fetch the audio data from S3 and convert to Blob
    // The URL is signed, so you can fetch it directly from the client
    const audioResponse = await fetch(url, {
        method: "GET"
    });

    if (!audioResponse.ok) {
        throw new Error(`Failed to fetch audio from S3: ${audioResponse.statusText}`);
    }

    // Convert response to Blob object
    const audioBlob = await audioResponse.blob();

    console.log("Audio loaded from S3!");

    return audioBlob;
};


export const encodeBufferToBlob = async (buffer, format) => {

    const channelData = [];
    for (let i = 0; i < buffer.numberOfChannels; i++) {
        channelData.push(buffer.getChannelData(i));
    }

    const options = {
        "sampleRate": buffer.sampleRate,
        "bitrate": 128
    };

    if (format === "wav") {

        const blob = await encodeChannelDataToWavBlob(channelData, buffer.sampleRate);

        return URL.createObjectURL(blob);

    } else {

        const bytes = format === "mp3"
            ? await encode.mp3(channelData, options)
            : await encode.webm(channelData, options);

        const blob = new Blob([bytes], {
            type: format === "mp3" ? encode.mime.mp3 : encode.mime.webm
        });

        return URL.createObjectURL(blob);
    }
};


function encodeChannelDataToWavBlob(channelData, sampleRate) {
    const numCh = channelData.length;
    const len = channelData[0].length;
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numCh * bytesPerSample;
    const dataSize = len * blockAlign;
    const buf = new ArrayBuffer(44 + dataSize);
    const v = new DataView(buf);

    // RIFF header
    const writeStr = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    writeStr(0, 'RIFF');
    v.setUint32(4, 36 + dataSize, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    v.setUint32(16, 16, true);           // fmt chunk size
    v.setUint16(20, 1, true);            // PCM
    v.setUint16(22, numCh, true);
    v.setUint32(24, sampleRate, true);
    v.setUint32(28, sampleRate * blockAlign, true);
    v.setUint16(32, blockAlign, true);
    v.setUint16(34, 16, true);           // bits per sample
    writeStr(36, 'data');
    v.setUint32(40, dataSize, true);

    // Interleave channels as 16-bit PCM
    let off = 44;
    for (let i = 0; i < len; i++) {
        for (let c = 0; c < numCh; c++) {
            const s = Math.max(-1, Math.min(1, channelData[c][i]));
            v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            off += 2;
        }
    }

    return new Blob([buf], { type: "audio/wav" });
}


export const mixTracks = async (songTracks) => {
    const audioCtx = new AudioContext();

    // Decode all tracks into AudioBuffers
    const buffers = await Promise.all(
        songTracks.map(w => w.wavesurfer.getDecodedData())
    );

    // Determine output dimensions
    const maxDuration = Math.max(...buffers.map(b => b.duration));
    const channels = Math.max(...buffers.map(b => b.numberOfChannels));
    const sampleRate = buffers[0].sampleRate;

    // Create the offline context (channels, length in samples, sampleRate)
    const offlineCtx = new OfflineAudioContext(
        channels,
        Math.ceil(maxDuration * sampleRate),
        sampleRate
    );

    // Wire each buffer as a source into the destination
    for (let i = 0; i < buffers.length; i++) {
        const source = offlineCtx.createBufferSource();
        source.buffer = buffers[i];

        // scale each track by its volume
        const gain = offlineCtx.createGain();
        console.log(`Track ${i} volume: ${songTracks[i].volumeFactor}`);
        gain.gain.value = songTracks[i].volumeFactor;

        source.connect(gain);
        gain.connect(offlineCtx.destination);

        source.start(0);
    }

    // Render — returns a Promise<AudioBuffer>
    const mixedBuffer = await offlineCtx.startRendering();
    return mixedBuffer;
};


function clearSection(channelData, startSection, endSection, numChannels) {
    for (let ii = startSection; ii <= endSection; ii++) {
        for (let jj = 0; jj < numChannels ; jj++) {
            channelData[jj][ii] = 0;
        }
    }
}


function shiftBuffer(shift, channelData) {
    const newLength = channelData[0].length + shift;
    return channelData.map(channel => {
        const out = new Float32Array(newLength); // already zero-filled
        if (shift > 0) {
            out.set(channel.subarray(0, newLength - shift), shift);
        } else if (shift < 0) {
            out.set(channel.subarray(-shift));
        } else {
            out.set(channel);
        }
        return out;
    });
}


function loopSection(channelData, startSection, endSection, numChannels) {
    // extend if loop extends out of length of array
    if (2 * endSection - startSection > channelData[0].length) {
        const newLength = 2 * endSection - startSection;
        const newChannelData = channelData.map(channel => {
            const newChannel = new Float32Array(newLength);
            // copy old channel
            newChannel.set(channel);
            // apply loop
            for (let ii = 0; ii <= endSection - startSection; ii++) {
                newChannel[endSection + ii] = newChannel[startSection + ii];
            }
            return newChannel;
        });

        return newChannelData;
    }

    for (let ii = 0; ii <= endSection - startSection; ii++) {
        for (let jj = 0; jj < numChannels ; jj++) {
            channelData[jj][endSection + ii] = channelData[jj][startSection + ii];
        }
    }
    return channelData;
}


export const editTrack = async (songTrack, start, end, operation) => {

    const audioBuffer = songTrack.wavesurfer.getDecodedData();

    let channelData = Array.from({ length: audioBuffer.numberOfChannels },
        (_, i) => audioBuffer.getChannelData(i));

    // console.log(channelData);

    if (operation === "clear") {
        let startClip = Math.floor(start * channelData[0].length);
        let endClip = Math.floor(end * channelData[0].length);
        clearSection(channelData, startClip, endClip, audioBuffer.numberOfChannels);
        songTrack.setModified();
    } else if (operation === "loop") {
        let startClip = Math.floor(start * channelData[0].length);
        let endClip = Math.floor(end * channelData[0].length);
        channelData = loopSection(channelData, startClip, endClip, audioBuffer.numberOfChannels);
        // shift the selection and correct percentages
        const tempStartClip = startClip;
        startClip = endClip;
        endClip = 2 * endClip - tempStartClip;
        console.log("length length length", channelData[0].length);
        songTrack.selectStartPct = startClip / channelData[0].length;
        songTrack.selectEndPct = endClip / channelData[0].length;
        console.log(songTrack.selectStartPct, songTrack.selectEndPct);
        songTrack.setModified();
        songTrack.setSelection();
    } else if (operation === "shift") {
        const shiftBy = Math.floor(start * audioBuffer.sampleRate);
        channelData = shiftBuffer(shiftBy, channelData);
    }

    // TODO: don't reencode the blob here as WebM (very slow), rather just edit the in-memory buffer
    //       and have wavesurfer rerender the display;
    //       generate the blob and URL only when saving the track to S3

    // const bytes = await encode.webm(channelData, {
    //     sampleRate: audioBuffer.sampleRate
    // });
    //
    // const blob = new Blob([bytes], { type: "audio/webm" });
    // const url = URL.createObjectURL(blob);
    //
    // songTrack.wavesurfer.load(url);

    // Actually don't do anything different except use WAV instead of webm
    // for "in-memory" editing

    const blob = encodeChannelDataToWavBlob(channelData, audioBuffer.sampleRate);
    const url = URL.createObjectURL(blob);

    // Revoke the old URL
    const oldUrl = songTrack.wavesurfer.getMediaElement().src;
    if (oldUrl.startsWith("blob:")) URL.revokeObjectURL(oldUrl);

    const newDuration = channelData[0].length / audioBuffer.sampleRate;
    await songTrack.wavesurfer.load(url, channelData, newDuration);

    // TODO: do this sort of thing:
    //
    // import encode from 'https://esm.sh/@audio/encode'
    //
    // const audioBuffer = wavesurfer.getDecodedData()
    //
    // // Build channelData (Float32Array[]) from the AudioBuffer
    // const channelData = Array.from({ length: audioBuffer.numberOfChannels },
    //     (_, i) => audioBuffer.getChannelData(i))
    //
    // // Manipulate samples here (e.g. apply a filter, change gain, etc.)
    // // ...
    //
    // // Encode to whatever format you want
    // const bytes = await encode.mp3(channelData, {
    //     sampleRate: audioBuffer.sampleRate,
    //     bitrate: 128
    // })
    //
    // // Wrap in a blob and reload
    // const blob = new Blob([bytes], { type: 'audio/mpeg' })
    // const url = URL.createObjectURL(blob)
    // wavesurfer.load(url)
    //

};


async function chordsToBlob(chordChanges, bpm, pattern, instrument) {

    const strum = (synth, time, notes, direction) => {
        const gap = 0.025; // 20 ms between strings
        const n = notes.length;
        const notes0 = (direction === "down") ? notes : [...notes].reverse();

        notes0.forEach((midi, i) => {

            const baseVelocity = direction === "down"
                ? 1.0 - (i / (n - 1)) * 0.7
                : 0.4 + (i / (n - 1)) * 0.7;

            const velocity = Math.max(0.1, Math.min(1.0, baseVelocity + (Math.random() - 0.5) * 0.15));

            synth.triggerAttackRelease(
                Tone.Frequency(midi, "midi"),
                1,
                time + (i + Math.random() * 0.1) * gap,
                velocity);
        });
    };

    const buffers = (instrument !== "synth")
        ? await ensureBuffers(instrument)
        : null;

    const release = SAMPLE_SOURCES[instrument]?.release ?? 0.5;

    const totalDuration = 20;

    const chords = [
        [[ 48, 52, 55, 60, 64], "down", 1],
        [[ 48, 52, 55, 60, 64], "down", 2],
        [[ 48, 52, 55, 60, 64], "up", 2.5],
        [[ 48, 52, 55, 60, 64], "down", 3],
        [[ 48, 52, 55, 60, 64], "up", 3.5],
        [[ 48, 52, 55, 60, 64], "down", 4],

        [[ 48, 52, 55, 60, 64], "down", 5],
        [[ 48, 52, 55, 60, 64], "down", 6],
        [[ 48, 52, 55, 60, 64], "up", 6.5],
        [[ 48, 52, 55, 60, 64], "down", 7],
        [[ 48, 52, 55, 60, 64], "up", 7.5],
        [[ 48, 52, 55, 60, 64], "down", 8],

        [[ 48, 52, 55, 60, 64], "down", 9],
        [[ 48, 52, 55, 60, 64], "down", 10],
        [[ 48, 52, 55, 60, 64], "up", 10.5],
        [[ 48, 52, 55, 60, 64], "down", 11],
        [[ 48, 52, 55, 60, 64], "up", 11.5],
        [[ 48, 52, 55, 60, 64], "down", 12],

        [[ 48, 52, 55, 60, 64], "down", 13],
        [[ 48, 52, 55, 60, 64], "down", 14],
        [[ 48, 52, 55, 60, 64], "up", 14.5],
        [[ 48, 52, 55, 60, 64], "down", 15],
        [[ 48, 52, 55, 60, 64], "up", 15.5],
        [[ 48, 52, 55, 60, 64], "down", 16],
    ];

    // use Tone.js to build audio buffer out of chords, onsets, durations
    const buffer = await Tone.Offline(({ transport }) => {

        const synth = (instrument === "synth")
            ? new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: "fatsawtooth" },
                envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 1 },
            }).toDestination()
            : new Tone.Sampler(buffers, { release }).toDestination();

        transport.bpm.value = bpm || 100;

        chords.forEach((chord, i) => {
            transport.schedule((t) => strum(synth, t, chord[0], chord[1]), chord[2]);
        });

        transport.start(0);

    }, totalDuration);

    // create audioBlob from the audioBuffer
    const audioBuffer = buffer.get(); // native AudioBuffer

    const url = encodeBufferToBlob(audioBuffer, "wav");
    return url;

    // const channelData = audioBuffer.getChannelData(0); // Float32Array
    //
    // const bytes = await encode.webm(channelData, {
    //     sampleRate: audioBuffer.sampleRate
    // });
    //
    // const blob = new Blob([bytes], { type: "audio/webm" });
    // const url = URL.createObjectURL(blob);
    //
    // return url;
    //
}


export const midifyChords = async (chords, instrument) => {

    const url = await chordsToBlob(chords, 100, null, instrument);

    return url;

};


async function midiToBlob(midiData, instrument) {

    // const buffers = instrument === "piano" ? await ensurePianoBuffers() : null;
    const buffers = (instrument !== "synth")
        ? await ensureBuffers(instrument)
        : null;

    const release = SAMPLE_SOURCES[instrument]?.release ?? 1;

    const totalDuration = midiData.onsets.at(-1) + 2;

    // use Tone.js to build audio buffer out of notes, onsets, durations
    const buffer = await Tone.Offline(({ transport }) => {

        const synth = (instrument === "synth")
            ? new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: "fatsawtooth" },
                envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 1 },
            }).toDestination()
            : new Tone.Sampler(buffers, null, null).set({ release }).toDestination();

        midiData.notes.forEach((midi, i) => {
            transport.schedule((t) => {
                synth.triggerAttackRelease(
                    Tone.Frequency(midi, "midi"),
                    midiData.durations[i],
                    t,
                    midiData.volumes[i]
                );
            }, midiData.onsets[i]);
        });

        transport.start(0);

    }, totalDuration);

    // create audioBlob from the audioBuffer
    const audioBuffer = buffer.get(); // native AudioBuffer

    const url = encodeBufferToBlob(audioBuffer, "wav");
    return url;

    // const channelData = audioBuffer.getChannelData(0); // Float32Array
    //
    // const bytes = await encode.webm(channelData, {
    //     sampleRate: audioBuffer.sampleRate
    // });
    //
    // const blob = new Blob([bytes], { type: "audio/webm" });
    // const url = URL.createObjectURL(blob);
    //
    // return url;
    //
}


export const midifyTrack = async (midiData, instrument) => {

    const url = await midiToBlob(midiData, instrument);

    return url;

};


export const aiTrack = async (midiData, instruction, csrfToken) => {
    const midiString = Array.from(midiData.notes).map(
        (n, i) => `(${n}, ${midiData.onsets[i].toFixed(1)}, ${midiData.durations[i].toFixed(1)})`
    ).join(", ");

    console.log(midiString);

    const response = await fetch("/api/compose", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken
        },
        body: JSON.stringify({
            midiData,
            "instruction": instruction
        })
    });

    if (!response.ok) {
        throw new Error(`Compose failed: ${response.status}`);
    }

    const cerebrasResponse = await response.json();

    console.log(cerebrasResponse);

    const notes = cerebrasResponse.cerebras.midiSequence.map((noteData) => noteData[0]);
    const onsets = cerebrasResponse.cerebras.midiSequence.map((noteData) => noteData[1]);
    const durations = cerebrasResponse.cerebras.midiSequence.map((noteData) => noteData[2]);
    const volumes = cerebrasResponse.cerebras.midiSequence.map((noteData) => {
        return (noteData.length > 3 ? noteData[3] : 1.0);
    });

    const instrument = cerebrasResponse.cerebras.instrument || "piano";

    const cerebrasMidiData = {
        "notes": notes,
        "onsets": onsets.map((onset, i) => i > 0 ? Math.max(onset, onsets[i - 1] + 0.01) : onset),
        "durations": durations,
        // "durations": durations.map((duration, i) =>
        //     i < durations.length - 1 ? Math.min(duration, onsets[i + 1] - onsets[i] - 0.01) : duration),
        "volumes": volumes.map((volume) => Math.min(1.0, Math.max(0.0, volume)))
    };

    console.log(cerebrasMidiData);

    const url = await midiToBlob(cerebrasMidiData, instrument);

    return {
        "blobUrl": url,
        "cerebras": cerebrasResponse.cerebras
    };

};

