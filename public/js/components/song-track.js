import {
    loadAudioBlob,
    uploadAudioToS3,
    deleteAudioFromS3,
    makeWaveSurfer,
    makeWaveRecorder,
    editTrack
} from "../utils.js";


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
        this.delay = this.getAttribute("delay");
        this.modified = false;
    }

    disconnectedCallback() {
        clearInterval(this._countDown);
        clearTimeout(this._confirmTimeout);
        clearTimeout(this._delayTimeout);
    }

    render() {
        const trackId = this.getAttribute("trackId");
        const filename = this.getAttribute("filename");
        const description = this.getAttribute("description");
        const createdBy = this.getAttribute("created-by");
        // get the username of the logged in user (certain features only if track owned by that user)
        const userName = document.querySelector('meta[name="username"]').content;
        const isOwner = userName === createdBy;

        this.innerHTML = `
            <div class="track-div" data-track-id="${trackId}">
                <div class="waveform-wrapper">
                    <div class="waveform-track" data-filename="${filename}"></div>
                    <div class="waveform-range-select hidden-div"></div>
                </div>
                <div class="track-edit-div hidden-div">
                    <div>
                        <span class="select-time-range"></span>
                    </div>
                    <button class="swm-button clear-button">Clear</button>
                    <button class="swm-button copy-button">Copy</button>
                    <button class="swm-button loop-button">Loop</button>
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
                        <div class="modified-div hidden-div">
                        MODIFIED
                        </div>
                    </div>
                    <div class="track-buttons-div">
                        <div class="dots-menu-wrap">
                            <button class="swm-button dots-button">&#x22EE;</button>
                            <div class="dots-menu">
                                <button class="duplicate-button">Duplicate</button>
                                <button class="delete-track-button ${!isOwner ? 'hidden-menu-button' : ''}">Delete</button>
                                <button class="confirm-delete-track-button hidden-menu-button">Confirm</button>
                            </div> 
                        </div>
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
            "duration": this.duration,
            "delay": this.delay,
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
        // set left position if there is a delay
        if (this.delay) {
            const waveformTrack = this.querySelector('.waveform-track');
            this.style.left = this.delay / this.duration * parseFloat(waveformTrack.style.width) + "px";
        }
    }

    setModified(unset) {
        if (unset) {
            this.modified = false;
        } else {
            this.modified = true;
            this.querySelector(".modified-div").classList.remove("hidden-div");
        }
    }

    setSelection(clear) {
        const rangeSelectDiv = this.querySelector(".waveform-range-select");
        const waveformTrack = this.querySelector(".waveform-track");

        if (clear) {
            rangeSelectDiv.classList.add("hidden-div");
            rangeSelectDiv.style.left = 0;
            rangeSelectDiv.style.width = 0;
        } else {
            rangeSelectDiv.classList.remove("hidden-div");
            rangeSelectDiv.style.left = this.selectStartPct * parseFloat(waveformTrack.style.width) + "px";
            rangeSelectDiv.style.width = (this.selectEndPct - this.selectStartPct) * parseFloat(waveformTrack.style.width) + "px";
        }
    }

    toggleEditDiv(mode) {
        if (mode === "show") {
            this.querySelector(".track-edit-div").classList.remove("hidden-div");
        } else if (mode === "hide") {
            this.querySelector(".track-edit-div").classList.add("hidden-div");
        }
    }

    playTrack(volume, withDelay) {
        if (this.hasAudio()) {
            if (volume) {
                this.wavesurfer.setVolume(volume);
            }
            if (this.selectStartPct && this.selectEndPct) {
                this.wavesurfer.play(this.selectStartPct * this.duration, this.selectEndPct * this.duration);
            }
            if (withDelay && this.delay) {
                console.log(this.delay);
                this._delayTimeout = setTimeout(() => {
                    this.wavesurfer.play();
                }, this.delay * 1000);
            } else {
                this.wavesurfer.play();
            }
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
        const waveformTrack = this.querySelector(".waveform-track");

        // dots menu
        const dotsMenuWrap = this.querySelector(".dots-menu-wrap");

        this.addEventListener("click", async (e) => {
            if (e.target.closest(".play-track-button")) {
                e.preventDefault();
                if (this.wavesurfer) {
                    this.playTrack();
                }
            } else if (e.target.closest(".stop-track-button")) {
                e.preventDefault();
                this.stopTrack();
            } else if (e.target.closest(".dots-button")) {
                e.preventDefault();
                dotsMenuWrap.classList.toggle("open-menu");
            } else if (e.target.closest(".duplicate-button")) {
                e.preventDefault();
                // TODO: IMPLEMENT THIS
                console.log("duplicate the whole track please");
                const dupTrack = document.createElement("song-track");
                const timeStamp = `${Date.now()}`;
                const createdBy = this.getAttribute("created-by");
                dupTrack.setAttribute("trackId", timeStamp);
                // TODO: this only works if it's a saved track
                //       what we really want is to clone the wavesurfer object
                //       and create a new filename
                dupTrack.setAttribute("filename", this.getAttribute("filename"));
                dupTrack.setAttribute("description", this.getAttribute("description") + " (copy)");
                dupTrack.setAttribute("created-by", createdBy);
                dupTrack.setAttribute("delay", this.getAttribute("delay"));
                dupTrack.setAttribute("saved", "false");
                // add the dupTrack below this track
                console.log(dupTrack);
                this.after(dupTrack);
                // close the dots menu
                dotsMenuWrap.classList.remove("open-menu");
            } else if (e.target.closest(".delete-track-button")) {
                e.preventDefault();
                const deleteTrackButton = this.querySelector(".delete-track-button");
                const confirmDeleteTrackButton = this.querySelector(".confirm-delete-track-button");
                deleteTrackButton.classList.add("hidden-menu-button");
                confirmDeleteTrackButton.classList.remove("hidden-menu-button");
                // clear any pending Timeouts (shouldn't happen)
                if (this._confirmTimeout) clearTimeout(this._confirmTimeout);
                this._confirmTimeout = setTimeout(() => {
                    deleteTrackButton.classList.remove("hidden-menu-button");
                    confirmDeleteTrackButton.classList.add("hidden-menu-button");
                }, 2000);
            } else if (e.target.closest(".confirm-delete-track-button")) {
                e.preventDefault();
                if (this.getAttribute("saved") === "true") {
                    await deleteAudioFromS3(this.getAttribute("filename"));
                }
                // remove the track from the Song
                this.remove();
            } else if (e.target.closest(".loop-button")) {
                e.preventDefault();
                editTrack(this, this.selectStartPct, this.selectEndPct, "loop");
            } else if (e.target.closest(".clear-button")) {
                e.preventDefault();
                editTrack(this, this.selectStartPct, this.selectEndPct, "clear");
            }
        });
        this.addEventListener("pointerdown", (e) => {
            if (e.target.closest(".track-detail")) {
                // e.preventDefault();
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
                this.delay = parseFloat(this.style.left) / parseFloat(waveformTrack.style.width) * this.duration;
                console.log("It's okay she let go!!!!!", e.clientX - offsetX);
            } else if (e.target.closest(".waveform-track") || e.target.closest(".waveform-range-select")) {
                e.preventDefault();
                selecting = false;
                if (moved) {
                    // fix the selection
                    console.log(this.selectStartPct * this.duration, this.selectEndPct * this.duration);
                    // show edit div:
                    this.toggleEditDiv("show");
                } else {
                    // treat as a click: clear selection if any
                    e.preventDefault();
                    this.setSelection(true);
                    selectLeft = null;
                    selectRight = null;
                    this.selectStartPct = null;
                    this.selectEndPct = null;
                    // hide edit div:
                    this.toggleEditDiv("hide");
                }
            }
        });
        this.addEventListener("pointermove", (e) => {
            if (selecting) {
                e.preventDefault();
                const waveformTrackRect = waveformTrack.getBoundingClientRect();
                if (e.clientX > selectLeft + waveformTrackRect.left) {
                    moved = true;
                    selectRight = Math.min(parseFloat(waveformTrack.style.width), e.clientX - waveformTrackRect.left);
                    // enable editing buttons (clip, crop)
                    this.selectStartPct = selectLeft / waveformTrackRect.width;
                    this.selectEndPct = selectRight / waveformTrackRect.width;
                    this.setSelection();
                    // calculate start/end times
                    const startTime = this.selectStartPct * this.duration;
                    const endTime = this.selectEndPct * this.duration;
                    this.querySelector(".select-time-range").innerHTML = `${startTime.toFixed(1)} s&ensp;-&ensp;${endTime.toFixed(1)} s`;
                    this.toggleEditDiv("show");
                } else {
                    // cancel region
                    moved = false;
                    this.setSelection(true);
                    selectRight = null;
                    this.selectStartPct = null;
                    this.selectEndPct = null;
                    // hide edit div:
                    this.toggleEditDiv("hide");
                }
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

    connectedCallback() {
        super.connectedCallback();
        this.delay = 0;
    }

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
                        this.setModified();
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