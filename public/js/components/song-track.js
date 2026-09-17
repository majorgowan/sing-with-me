import { loadAudioBlob, uploadAudioToS3, deleteAudioFromS3, makeWaveSurfer, makeWaveRecorder } from "../utils.js";


class SongTrack extends HTMLElement {
    // can omit constructor if not using Shadow DOM
    // constructor() {
    //    super();
    //}

    connectedCallback() {
        this.render();
        this.initWaveform();
        this.attachListeners();
        this.selectStartPct = null;
        this.selectEndPct = null;
    }

    disconnectedCallback() {
        clearInterval(this._countDown);
        clearTimeout(this._confirmTimeout);
    }

    render() {
        const trackId = this.getAttribute("trackId");
        const filename = this.getAttribute("filename");
        const description = this.getAttribute("description");
        const createdBy = this.getAttribute("created-by");

        this.innerHTML = `
            <div class="track-div" data-track-id="${trackId}">
                <div class="waveform-wrapper">
                    <div class="waveform-track" data-filename="${filename}"></div>
                    <div class="waveform-range-select hidden-div"></div>
                </div>
                <div class="track-detail">
                    <div class="track-detail-head-div">
                        <div>
                            <div>
                                <input class="description-input" type="text" value="${description}" ${this.setReadOnly()}>
                            </div>
                            <div>
                                By: ${createdBy}
                            </div>
                        </div>
                        <div class="count-down-div hidden-div">
                        </div>
                    </div>
                    <div class="track-buttons-div">
                        <button class="swm-button delete-track-button">Delete</button>
                        <button class="swm-button confirm-delete-track-button hidden-button">Confirm</div>
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
        this.wavesurfer = makeWaveSurfer(this, blobUrl);
    }

    getTrackData() {
        return {
            "trackId": this.getAttribute("trackId"),
            "filename": this.getAttribute("filename"),
            "description": this.getAttribute("description"),
            "saved": this.getAttribute("saved"),
            "createdBy": this.getAttribute("created-by")
        };
    }

    setReadOnly() {
        // saved track can't be edited
        return "readonly";
    }

    hasAudio() {
        return this.wavesurfer.getSrc().startsWith("blob:");
    }

    setDuration(duration) {
        this.duration = duration;
        this.querySelector(".waveform-track").style.width = (40 * duration) + "px";
    }

    playTrack(volume) {
        if (this.hasAudio()) {
            if (volume) {
                this.wavesurfer.setVolume(volume);
            }
            if (this.selectStartPct && this.selectEndPct) {
                this.wavesurfer.play(this.selectStartPct * this.duration, this.selectEndPct * this.duration);
            }
            this.wavesurfer.play();
        }
    }

    stopTrack() {
        if (this.wavesurfer && this.wavesurfer.isPlaying()) {
            this.wavesurfer.stop();
        }
    }

    attachListeners() {
        let offsetX;
        // for moving the track
        let dragging = false;
        // for selecting a range in the track
        let selecting = false;
        // flag to distinguish click from range set
        let moved = false;

        let selectLeft, selectRight;
        const rangeSelectDiv = this.querySelector(".waveform-range-select");
        const waveformTrack = this.querySelector(".waveform-track");

        this.addEventListener("click", async (e) => {
            if (e.target.closest(".play-track-button")) {
                e.preventDefault();
                if (this.wavesurfer) {
                    this.playTrack();
                }
            } else if (e.target.closest(".stop-track-button")) {
                e.preventDefault();
                this.stopTrack();
            } else if (e.target.closest(".delete-track-button")) {
                e.preventDefault();
                const deleteTrackButton = this.querySelector(".delete-track-button");
                const confirmDeleteTrackButton = this.querySelector(".confirm-delete-track-button");
                deleteTrackButton.classList.add("hidden-button");
                confirmDeleteTrackButton.classList.remove("hidden-button");
                // clear any pending Timeouts (shouldn't happen)
                if (this._confirmTimeout) clearTimeout(this._confirmTimeout);
                this._confirmTimeout = setTimeout(() => {
                    deleteTrackButton.classList.remove("hidden-button");
                    confirmDeleteTrackButton.classList.add("hidden-button");
                }, 2000);
            } else if (e.target.closest(".confirm-delete-track-button")) {
                e.preventDefault();
                if (this.getAttribute("saved") === "true") {
                    await deleteAudioFromS3(this.getAttribute("filename"));
                }
                // remove the track from the Song
                this.remove();
            }
        });
        this.addEventListener("pointerdown", (e) => {
            if (e.target.closest(".track-detail")) {
                e.preventDefault();
                dragging = true;
                this.style.cursor = "grabbing";
                console.log("I've been grabbed yo!!!!!");
                offsetX = e.clientX - this.offsetLeft;
                console.log(offsetX, e.clientX, this.offsetLeft, this.style.left);
            } else if (e.target.closest(".waveform-track") || e.target.closest(".waveform-range-select")) {
                e.preventDefault();
                // set moved to false until pointer moves (i.e. not just a click)
                moved = false;
                selecting = true;
                // set selecting start
                const waveformTrackRect = waveformTrack.getBoundingClientRect();
                selectLeft = e.clientX - waveformTrackRect.left;
            }
        });
        this.addEventListener("pointerup", (e) => {
            if (e.target.closest(".track-detail")) {
                dragging = false;
                this.style.cursor = null;
                console.log("It's okay she let go!!!!!", e.clientX - offsetX);
            } else if (e.target.closest(".waveform-track") || e.target.closest(".waveform-range-select")) {
                e.preventDefault();
                selecting = false;
                if (moved) {
                    // fix the selection
                    // calculate start/end times
                    // enable editing buttons (clip, crop)
                    const waveformTrackRect = waveformTrack.getBoundingClientRect();
                    this.selectStartPct = selectLeft / waveformTrackRect.width;
                    this.selectEndPct = selectRight / waveformTrackRect.width;
                    console.log(this.selectStartPct * this.duration, this.selectEndPct * this.duration);
                } else {
                    // treat as a click: clear selection if any
                    e.preventDefault();
                    rangeSelectDiv.classList.add("hidden-div");
                    selectLeft = null;
                    selectRight = null;
                    this.selectStartPct = null;
                    this.selectEndPct = null;
                    rangeSelectDiv.style.left = 0;
                    rangeSelectDiv.style.width = 0;
                }
            }
        });
        this.addEventListener("pointermove", (e) => {
            if (selecting) {
                e.preventDefault();
                moved = true;
                const waveformTrackRect = waveformTrack.getBoundingClientRect();
                selectRight = Math.min(parseFloat(waveformTrack.style.width), e.clientX - waveformTrackRect.left);
                rangeSelectDiv.classList.remove("hidden-div");
                rangeSelectDiv.style.left = selectLeft + "px";
                rangeSelectDiv.style.width = (selectRight - selectLeft) + "px";
            } else if (e.target.closest(".track-detail")) {
                if (!dragging) return;
                let x = Math.max(0, e.clientX - offsetX);
                this.style.left = x + "px";
            }
        });
        this.addEventListener("change", (e) => {
            if (e.target.closest(".description-input")) {
                this.setAttribute("description", e.target.value);
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

    async initWaveform() {
        this.wavesurfer = null;
    }

    async initRecorder() {
        this.wavesurfer = await makeWaveRecorder(this, this.wavesurfer);
    }

    setReadOnly() {
        // new track can have description etc. edited
        return "";
    }

    stopTrack() {
        super.stopTrack();
        if (this.wavesurfer && this.wavesurfer.plugins[0].isRecording()) {
            this.wavesurfer.plugins[0].stopRecording();
        }
    }

    attachListeners() {
        super.attachListeners();

        const parentSong = this.closest("song-div");

        // prepare to play other tracks
        const playOtherTracks = parentSong.querySelector(".play-record-checkbox");
        const playOtherTracksVolume = Number(parentSong.querySelector(".play-record-volume-slider").value / 100);
        const bpmInput = parentSong.querySelector(".bpm-input");
        const timeSignatureSelect = parentSong.querySelector(".time-signature-select");

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
                let countDownValue = Number(timeSignatureSelect.value);
                const countDownDiv = this.querySelector(".count-down-div");
                countDownDiv.classList.remove("hidden-div");
                countDownDiv.textContent = countDownValue;
                const tempo = 1000 * 60 / Math.floor(Math.abs(Number(bpmInput.value)));
                this._countDown = setInterval(async () => {
                    countDownValue--;
                    countDownDiv.textContent = countDownValue;
                    if (countDownValue === 0) {
                        await this.wavesurfer.plugins[0].startRecording(recordingConstraints);
                        if (playOtherTracks) {
                            parentSong.tracks.forEach((track) => {
                                if (track !== this) {
                                    track.playTrack(playOtherTracksVolume);
                                }
                            });
                        }
                        clearInterval(this._countDown);
                        countDownDiv.classList.add("hidden-div");
                    }
                }, tempo);
            } else if (e.target.closest(".stop-track-button")) {
                if (playOtherTracks) {
                    parentSong.tracks.forEach((track) => {
                        if (track !== this) {
                            track.stopTrack();
                        }
                    });
                }
            } else if (e.target.closest(".save-recording-button")) {
                await uploadAudioToS3(this.recordedBlob, this.getAttribute("filename"));
                this.setAttribute("saved", "true");
            }

        });
    }

}

customElements.define("new-track", NewTrack);