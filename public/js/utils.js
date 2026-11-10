import WaveSurfer from "https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.esm.js";
import RecordPlugin from "https://unpkg.com/wavesurfer.js@7/dist/plugins/record.esm.js";
// import TimelinePlugin from "https://unpkg.com/wavesurfer.js@7/dist/plugins/timeline.esm.js";
import encode from "https://esm.sh/@audio/encode"

// import Tone.js library
import * as Tone from "https://esm.sh/tone@15.5.54";

// ─── Sample registry ───────────────────────────────────────────────
const SAMPLE_SOURCES = {
    piano: {
        baseUrl: "https://tonejs.github.io/audio/salamander/",
        notes: {
            36: "C2.mp3", 38: "Ds2.mp3", 41: "Fs2.mp3", 45: "A2.mp3",
            48: "C3.mp3", 50: "Ds3.mp3", 53: "Fs3.mp3", 57: "A3.mp3",
            60: "C4.mp3", 62: "Ds4.mp3", 65: "Fs4.mp3", 69: "A4.mp3",
            72: "C5.mp3", 74: "Ds5.mp3", 77: "Fs5.mp3", 81: "A5.mp3",
            84: "C6.mp3", 86: "Ds6.mp3", 89: "Fs6.mp3", 93: "A6.mp3",
            96: "C7.mp3", 98: "Ds7.mp3", 101: "Fs7.mp3", 105: "A7.mp3",
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
            72:  "C4.mp3",   // sounds as C5
            76:  "E4.mp3",   // sounds as E5
            81:  "A4.mp3",   // sounds as A5  (there's an octave shift in the flute data)
            84:  "C5.mp3",   // sounds as C6
            88:  "E5.mp3",   // sounds as E6
            93:  "A5.mp3",   // sounds as A6
            96:  "C6.mp3",   // sounds as C7
            100: "E6.mp3",   // sounds as E7
            105: "A6.mp3",   // sounds as A7
        },
        release: 0.4,
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


const MINPXPERSEC = 10;


export const makeWaveSurfer = (songTrack, blobUrl) => {

    const wavesurfer = WaveSurfer.create({
        "container": songTrack.querySelector(".waveform-track"),
        "sampleRate": 44100,
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


export const makeWaveRecorder = async (newTrack, recorder) => {
    if (recorder) {
        // destroy() automatically calls stopRecording() and stopMic() internally
        recorder.destroy();
        recorder = null;
    }

    // Create a new Wavesurfer instance
    const newRecorder = WaveSurfer.create({
        "container": newTrack.querySelector(".waveform-track"),
        "sampleRate": 44100,
        "waveColor": "darkgreen",
        "progressColor": "olive",
        "barWidth": 2,
        "barRadius": 4,
        "interact": false,
        "normalize": true,
        "fillParent": false,
        "minPxPerSec": MINPXPERSEC,
        "plugins": [
            RecordPlugin.create({
                scrollingWaveform: true, // Optional: scroll waveform while recording
                renderRecordedAudio: true // Optional: render final audio after stop
            }),
            // TimelinePlugin.create()
        ]
    });

    newRecorder.plugins[0].on("record-end", (blob) => {
        console.log("finished recording");
        const recButton = newTrack.querySelector(".save-recording-button");
        if (recButton) recButton.disabled = false;
        newTrack.recordedBlob = blob;

        const trackDetailButtons = newTrack.querySelector(".track-detail-buttons");
        trackDetailButtons.classList.remove("hidden-div");
        const muteLabel = newTrack.querySelector(".mute-checkbox-label");
        muteLabel.classList.remove("hidden-label");

        const recordControlsDiv = newTrack.querySelector(".record-controls-div");
        recordControlsDiv.classList.add("hidden-div");
    });

    newRecorder.on("ready", () => {
        newTrack.setDuration(newRecorder.getDuration());
        // set width of containing div proportional to duration
        const container =  newTrack.querySelector(".waveform-track");
        container.style.width = `${newRecorder.getDuration() * MINPXPERSEC * 1.01}px`;
        newTrack.closest("song-div").updateTimeline();
    });

    // newRecorder.on("timeupdate", (t) => {
    //     songTrack.closest("song-div").syncTimeline(t);
    // });

    return newRecorder;
};


export const deleteAudioFromS3 = async (fileName) => {
    // TODO: implement deleteAudioFromS3 function
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


function clearSection(channelData, startSection, endSection, numChannels) {
    for (let ii = startSection; ii <= endSection; ii++) {
        for (let jj = 0; jj < numChannels ; jj++) {
            channelData[jj][ii] = 0;
        }
    }
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

    console.log(channelData);

    let startClip = Math.floor(start * channelData[0].length);
    let endClip = Math.floor(end * channelData[0].length);
    if (operation === "clear") {
        clearSection(channelData, startClip, endClip, audioBuffer.numberOfChannels);
        songTrack.setModified();
    } else if (operation === "loop") {
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
    }

    const bytes = await encode.webm(channelData, {
        sampleRate: audioBuffer.sampleRate
    });

    const blob = new Blob([bytes], { type: "audio/webm" });
    const url = URL.createObjectURL(blob);

    songTrack.wavesurfer.load(url);

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
    const channelData = audioBuffer.getChannelData(0); // Float32Array

    const bytes = await encode.webm(channelData, {
        sampleRate: audioBuffer.sampleRate
    });

    const blob = new Blob([bytes], { type: "audio/webm" });
    const url = URL.createObjectURL(blob);

    return url;

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

    // TODO: that duration restriction is unnecessary!!!  All that matters is the onsets are distinct and in order.
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

