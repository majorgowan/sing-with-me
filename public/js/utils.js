import WaveSurfer from "https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.esm.js";
import RecordPlugin from "https://unpkg.com/wavesurfer.js@7/dist/plugins/record.esm.js";
// import TimelinePlugin from "https://unpkg.com/wavesurfer.js@7/dist/plugins/timeline.esm.js";
import encode from "https://esm.sh/@audio/encode"

// import essentia library
import Essentia from 'https://cdn.jsdelivr.net/npm/essentia.js@0.1.1/dist/essentia.js-core.es.js';
// import essentia-wasm-module
import { EssentiaWASM } from 'https://cdn.jsdelivr.net/npm/essentia.js@0.1.1/dist/essentia-wasm.es.js';

// import Tone.js library
import * as Tone from "https://esm.sh/tone@15.5.54";

const essentia = new Essentia(EssentiaWASM);

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
    });

    wavesurfer.on("timeupdate", (t) => {
        const delay = songTrack.delay ? songTrack.delay : 0.0;
        songTrack.closest("song-div").syncTimeline(t + delay);
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
    });

    newRecorder.on("ready", () => {
        newTrack.setDuration(newRecorder.getDuration());
        // set width of containing div proportional to duration
        const container =  songTrack.querySelector(".waveform-track");
        container.style.width = `${wavesurfer.getDuration() * MINPXPERSEC * 1.01}px`;
        newTrack.closest("song-div").updateTimeline();
    });

    newRecorder.on("timeupdate", (t) => {
        const delay = newTrack.delay ? newTrack.delay : 0.0;
        songTrack.closest("song-div").syncTimeline(t + delay);
    });

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


const analyzeTrack = async (songTrack) => {
    console.log(essentia.version);
    const audioBuffer = songTrack.wavesurfer.getDecodedData();

    try {
        // Step 1: test arrayToVector alone
        const channelData = audioBuffer.getChannelData(0);
        console.log("Channel data length:", channelData.length, "bytes:", channelData.length * 4);

        const signal = essentia.arrayToVector(channelData);
        console.log("arrayToVector: OK");

        // Step 2: test the algorithm
        console.log("sample rate: ", audioBuffer.sampleRate);
        const rhythm = essentia.RhythmExtractor2013(signal);
        console.log("RhythmExtractor2013: OK, BPM:", rhythm.bpm);
        const key = essentia.KeyExtractor(signal);
        console.log("Key: ", key);

        // Melody → MIDI notes
        const melodia = essentia.PredominantPitchMelodia(signal);
        const segments = essentia.PitchContourSegmentation(melodia.pitch, signal);

        const notes = essentia.vectorToArray(segments.MIDIpitch);
        const onsets = essentia.vectorToArray(segments.onset);
        const durations = essentia.vectorToArray(segments.duration);

        const cleanNotes = Array.from(notes).map((n, i) => durations[i] > 0.1 && n > 0 ? n : null).filter(n => n !== null);
        const cleanOnsets = Array.from(onsets).map((t, i) => durations[i] > 0.1 && notes[i] > 0 ? t : null).filter(t => t !== null);
        const cleanDurations = Array.from(durations).map((d, i) => durations[i] > 0.1 && notes[i] > 0 ? d : null).filter(d => d !== null);

        // console.log({
        //     bpm: rhythm.bpm,
        //     key: `${key.key} ${key.scale}`,
        //     notes,
        //     onsets,
        //     durations,
        //     clean
        // });

        console.log(Array.from(cleanNotes).map((n, i) => `(${n}, ${cleanOnsets[i].toFixed(1)})`).join(", "));

        return {
            "bpm": rhythm.bpm,
            "key": `${key.key} ${key.scale}`,
            "notes": cleanNotes,
            "onsets": cleanOnsets,
            "durations": cleanDurations
        };

    } catch (e) {
        console.error("FAILED at:", e);
    }

    // console.log(audioBuffer.sampleRate, audioBuffer.duration, audioBuffer.numberOfChannels);
    //
    // const signal = essentia.arrayToVector(audioBuffer.getChannelData(0));
    //
    // const rhythm = essentia.RhythmExtractor2013(signal, audioBuffer.sampleRate);
    // console.log("BPM:", rhythm.bpm);
};


async function midiToBlob(midiData) {

    const totalDuration = midiData.onsets.at(-1) + 2;

    // use Tone.js to build audio buffer out of notes, onsets, durations
    const buffer = await Tone.Offline(({ transport }) => {
        const synth = new Tone.Synth().toDestination();

        midiData.notes.forEach((midi, i) => {
            transport.schedule((t) => {
                synth.triggerAttackRelease(Tone.Frequency(midi, "midi").toNote(), midiData.durations[i], t);
            }, midiData.onsets[i]);
            // console.log(midi, "yo!");
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


export const midifyTrack = async (songTrack) => {
    console.log(essentia.version);

    const midiData = await analyzeTrack(songTrack);

    const url = await midiToBlob(midiData);

    return url;

};


export const aiTrack = async (midiData, csrfToken) => {
    console.log(essentia.version);

    const midiString = Array.from(midiData.notes).map(
        (n, i) => `(${n}, ${midiData.onsets[i].toFixed(1)}), ${midiData.durations[i].toFixed(1)}`
    ).join(", ");

    console.log(midiString);

    // TODO: have server call GPT to compose harmony
    const response = await fetch("/api/compose", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken
        },
        body: JSON.stringify({ midiData })
    });

    if (!response.ok) {
        throw new Error(`Compose failed: ${response.status}`);
    }

    const cerebrasResponse = await response.json();

    console.log(cerebrasResponse);

    const cerebrasMidiData = {
        "notes": cerebrasResponse.cerebras.midiSequence.map(([note, onset]) => note),
        "onsets": cerebrasResponse.cerebras.midiSequence.map(([note, onset]) => onset),
        "durations": cerebrasResponse.cerebras.midiSequence.map(([note, onset]) => 0.25)
    };

    console.log(cerebrasMidiData);

    const url = await midiToBlob(cerebrasMidiData);

    return {
        "blobUrl": url,
        "cerebras": cerebrasResponse.cerebras
    };

};

