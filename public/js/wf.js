import WaveSurfer from "https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.esm.js";
import RecordPlugin from "https://unpkg.com/wavesurfer.js@7/dist/plugins/record.esm.js";

import { loadAudioBlob, uploadAudioToS3 } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {

    // const blob = await loadAudioBlob("recording-1787261502629.webm");
    // const blobUrl = URL.createObjectURL(blob);

    const makeWaveSurfer = (container, blobUrl) => {

        const wavesurfer = WaveSurfer.create({
            container: container,
            waveColor: "#4F4A85",
            progressColor: "#383351",
            url: blobUrl
        });

        wavesurfer.on("interaction", () => {
            wavesurfer.playPause();
        });

        return wavesurfer;
    }

    async function loadAllTracks() {
        const wavesurfers = [];
        const trackElements = document.getElementsByClassName("waveform-track");
        for (const track of trackElements) {
            const filename = track.dataset.filename;
            const blob = await loadAudioBlob(filename);
            const blobUrl = URL.createObjectURL(blob);
            const wavesurfer = makeWaveSurfer(track, blobUrl);
            wavesurfers.push(wavesurfer);
        }
        return wavesurfers;
    }


    // load existing tracks (if any)
    const wavesurfersPromise = loadAllTracks();
    console.log("Loaded all tracks!");

    async function createNewWavesurfer(container) {
        const wavesurfer = WaveSurfer.create({
            container: container,
            waveColor: "#4F4A85",
            progressColor: "#383351",
            plugins: [
                RecordPlugin.create({
                    scrollingWaveform: true, // Optional: scroll waveform while recording
                    renderRecordedAudio: true // Optional: render final audio after stop
                })
            ]
        });

        return wavesurfer;
    }

    // event listeners
    const playAllButton = document.getElementById("play-all-button");
    if (playAllButton) {
        playAllButton.addEventListener("click", async (e) => {
            const wavesurfers = await wavesurfersPromise;
            for (const wavesurfer of wavesurfers) {
                wavesurfer.play();
            }
        });
    }


});