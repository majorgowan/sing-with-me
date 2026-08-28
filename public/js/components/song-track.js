import { loadAudioBlob, uploadAudioToS3, makeWaveSurfer, makeWaveRecorder } from "../utils.js";


class SongTrack extends HTMLElement {
    // can omit constructor if not using Shadow DOM
    // constructor() {
    //    super();
    //}

    connectedCallback() {
        this.render();
        this.initWaveform();
        this.attachListeners();
    }

    render() {
        const trackId = this.getAttribute("id");
        const filename = this.getAttribute("filename");
        const description = this.getAttribute("description");
        const createdBy = this.getAttribute("created-by");

        this.innerHTML = `
            <div class="track-div" data-track-id="${trackId}">
                <div class="waveform-track" data-filename="${filename}"></div>
                <div class="track-detail">
                    <div class="track-detail-head-div">
                        <div>
                            <div>
                                ${description}
                            </div>
                            <div>
                                By: ${createdBy}
                            </div>
                        </div>
                        <div class="count-down-div hidden-div">
                        </div>
                    </div>
                    <div class="track-buttons-div">
                        <div>
                            <button class="swm-button play-track-button" type="button">Play</button>
                            <button class="swm-button stop-track-button" type="button">Stop</button>
                        </div>
                    </div>
                </div>
            </div>
        `
    }

    async initWaveform() {
        const filename = this.getAttribute("filename");
        if (!filename) return;
        const blob = await loadAudioBlob(filename);
        const blobUrl = URL.createObjectURL(blob);
        this.wavesurfer = makeWaveSurfer(this.querySelector(".waveform-track"), blobUrl);
    }

    playTrack() {
        this.wavesurfer.play();
    }

    stopTrack() {
        if (this.wavesurfer && this.wavesurfer.isPlaying()) {
            this.wavesurfer.stop();
        }
    }

    attachListeners() {
        this.addEventListener("click", (e) => {
            if (e.target.closest(".play-track-button")) {
                e.preventDefault();
                if (this.wavesurfer) {
                    this.playTrack();
                }
            } else if (e.target.closest(".stop-track-button")) {
                e.preventDefault();
                this.stopTrack();
            }
        });
    }

}

customElements.define("song-track", SongTrack);


class NewTrack extends SongTrack {

    render() {
        super.render();
        // Add the extra bits a new track needs
        const trackButtonsDiv = this.querySelector(".track-buttons-div");
        trackButtonsDiv.innerHTML += `
            <div>
                <div class="count-down-div hidden-div"></div>
                <div>
                    <button class="swm-button record-button" type="button">Record</button>
                    <button class="swm-button save-recording-button" type="button" disabled>Save</button>
                </div>
            </div>
        `;
    }

    async initRecorder() {
        this.wavesurfer = await makeWaveRecorder(this.querySelector('.waveform-track'), this.wavesurfer);
    }

    stopTrack() {
        super.stopTrack();
        if (this.wavesurfer && this.wavesurfer.plugins[0].isRecording()) {
            this.wavesurfer.plugins[0].stopRecording();
        }
    }

    attachListeners() {
        super.attachListeners();

        this.addEventListener("click", async (e) => {
            if (e.target.closest(".record-button")) {
                e.preventDefault();
                await this.initRecorder();

                const recordingConstraints = {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000
                };

                // start count down
                let countDownValue = 4;
                const countDownDiv = this.querySelector(".count-down-div");
                countDownDiv.classList.remove("hidden-div");
                countDownDiv.textContent = countDownValue;
                const tempo = 1000 * 60 / Math.floor(Math.abs(Number(100)));
                const countDown = setInterval(async () => {
                    countDownValue--;
                    countDownDiv.textContent = countDownValue;
                    if (countDownValue === 0) {
                        await this.wavesurfer.plugins[0].startRecording(recordingConstraints);
                        clearInterval(countDown);
                        countDownDiv.classList.add("hidden-div");
                    }
                }, tempo);

            }
        });
    }

}

customElements.define("new-track", NewTrack);