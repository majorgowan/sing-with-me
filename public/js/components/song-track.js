import {
    loadAudioBlob,
    uploadAudioToS3,
    deleteAudioFromS3,
    makeWaveSurfer,
    makeWaveRecorder,
    editTrack,
    midifyTrack,
    aiTrack
} from "../utils.js";

import {
    analyzeRhythm,
    analyzeKey,
    analyzeMelody
} from "../worker-manager.js";


class SongTrack extends HTMLElement {
    // can omit constructor if not using Shadow DOM
    // constructor() {
    //    super();
    //}

    connectedCallback() {
        this.render();
        const blobUrl = this.getAttribute("blobUrl");
        this.initWaveform(blobUrl);
        this.attachListeners();
        this.selectStartPct = null;
        this.selectEndPct = null;
        this.midiData = this.hasAttribute("midiData")
            ? JSON.parse(this.getAttribute("midiData"))
            : undefined;
    }

    disconnectedCallback() {
        clearInterval(this._countDown);
        clearTimeout(this._confirmTimeout);
    }

    render() {
        const trackId = this.getAttribute("trackId");
        const filename = this.getAttribute("filename");
        const title = this.getAttribute("title");
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
                        <div class="select-time-range">
                            <input type="text" inputmode="decimal" pattern="\\d*\\.?\\d*"
                                   maxlength="6" class="select-time-input select-time-start">
                            &ndash;
                            <input type="text" inputmode="decimal" pattern="\\d*\\.?\\d*" 
                                   maxlength="6" class="select-time-input select-time-end">
                            s
                        </div>
                    </div>
                    <button class="swm-button clear-button">Clear</button>
                    <!-- <button class="swm-button copy-button">Copy</button> -->
                    <button class="swm-button loop-button">Loop</button>
                </div>
                <div class="track-detail">
                    <button class="move-grab-button">&parallel;</button>
                    <input type="range" min="0" max="1" step="0.1" value="1" class="volume-slider">
                    <div class="track-detail-head-div">
                        <div>
                            <div>
                                <input class="title-input" type="text" value="${title}" ${this.setReadOnly(isOwner)}>
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
                    <div class="dots-menu-wrap">
                        <button class="swm-button dots-button">&#x22EE;</button>
                        <div class="dots-menu">
                            <button class="duplicate-button">Duplicate</button>
                            <button class="save-track-button ${!this.modified ? 'hidden-menu-button' : ''}">Save</button>
                            <button class="rename-track-button ${!isOwner ? 'hidden-menu-button' : ''}">Rename</button>
                            <button class="delete-track-button ${!isOwner ? 'hidden-menu-button' : ''}">Delete</button>
                            <button class="confirm-delete-track-button hidden-menu-button">Confirm</button>
                        </div> 
                    </div>
                    <label class="swm-checkbox mute-checkbox-label hidden-label">
                        <input type="checkbox" class="mute-checkbox">
                        Mute
                    </label>
                    <div class="track-buttons-div">
                        <div class="track-detail-buttons hidden-div">
                            <button class="swm-button play-track-button" type="button">Play</button>
                            <button class="swm-button stop-track-button" type="button">Stop</button>
                            <button class="swm-button midify-track-button" type="button">Midify</button>
                            <div class="hidden-div instrument-popover popover">
                                <button data-instrument="piano">🎹 Piano</button>
                                <button data-instrument="violin">🎻 Violin</button>
                                <button data-instrument="cello">🎻 Cello</button>
                                <button data-instrument="flute">🪈 Flute</button>
                                <button data-instrument="saxophone">🎷 Sax</button>
                                <button data-instrument="synth">🎹 Synth</button>
                            </div>
                            <button class="swm-button ai-track-button" type="button">AI</button>
                            <div class="spinner-div ai-spinner-div hidden-div"></div>
                        </div>
                    </div>
                    <div class="input-overlay hidden-div">
                        <textarea class="input-overlay-input" rows="4" placeholder="instructions for AI composer"></textarea>
                        <div class="input-overlay-buttons-div">
                            <button class="swm-button ai-submit-button">Submit</button>
                            <button class="swm-button ai-cancel-button">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        `
    }

    async initWaveform(url) {
        if (url) {
            // e.g. if copied from another track
            this.blobUrl = url;
            this.recordedBlob = await fetch(url).then(r => r.blob());
            // the copy is by-definition modified
            this.setModified();
        } else {
            const filename = this.getAttribute("filename");
            if (!filename) return;
            this.recordedBlob = await loadAudioBlob(filename);
            this.blobUrl = URL.createObjectURL(this.recordedBlob);
            // loaded from disk, so initially not modified
            this.setModified(true);
        }
        this.wavesurfer = makeWaveSurfer(this, this.blobUrl);
    }

    getTrackData() {
        return {
            "trackId": this.getAttribute("trackId"),
            "filename": this.getAttribute("filename"),
            "title": this.getAttribute("title"),
            "description": this.getAttribute("description"),
            "saved": this.getAttribute("saved"),
            "duration": this.duration,
            "createdBy": this.getAttribute("created-by"),
            "midiData": this.midiData
        };
    }

    setReadOnly(dontDoIt) {
        // saved track can't be edited
        return dontDoIt ? "" : "readonly";
    }

    hasAudio() {
        if (this.wavesurfer) {
            return this.wavesurfer.getSrc().startsWith("blob:");
        }
        return false;
    }

    get volumeFactor() {
        const volumeSlider = this.querySelector(".volume-slider");
        return parseFloat(volumeSlider.value);
    }

    seek(time) {
        this.wavesurfer.setTime(time);
    }

    setDuration(duration) {
        this.duration = duration;
        this.querySelector(".waveform-track").style.width = (40 * duration) + "px";
    }

    getTimeFactor() {
        if (!this.hasAudio()) return null;
        // pixels per second
        return parseFloat(this.querySelector(".waveform-track").style.width) / this.duration;
    }

    setModified(unset) {
        if (unset) {
            this.modified = false;
        } else {
            this.modified = true;
            this.querySelector(".modified-div").classList.remove("hidden-div");
            this.querySelector(".save-track-button").classList.remove("hidden-menu-button");
        }
    }

    setSelection(clear) {
        const rangeSelectDiv = this.querySelector(".waveform-range-select");
        const waveformTrack = this.querySelector(".waveform-track");

        if (clear) {
            this.selectStartPct = null;
            this.selectEndPct = null;
            rangeSelectDiv.classList.add("hidden-div");
            rangeSelectDiv.style.left = 0;
            rangeSelectDiv.style.width = 0;
            this.toggleEditDiv("hide");
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

    setMuted(value) {
        this.querySelector(".mute-checkbox").checked = value;
    }

    isMuted() {
        console.log(this.getAttribute("title") + " muted?: " + this.querySelector(".mute-checkbox").checked);
        return this.querySelector(".mute-checkbox").checked;
    }

    playTrack(volume, withDelay) {
        if (this.hasAudio() && !this.isMuted()) {
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
        if (this.wavesurfer) {
            this.wavesurfer.stop();
        }
    }

    pauseTrack() {
        if (this.wavesurfer && this.wavesurfer.isPlaying()) {
            this.wavesurfer.pause();
        }
    }

    async midify() {
        const audioBuffer = this.wavesurfer.getDecodedData();
        const channelData = audioBuffer.getChannelData(0);
        const myRhythm = await analyzeRhythm(channelData, (value) => {
            console.log(`progress: ${value}`)
        });
        const myKey = await analyzeKey(channelData, (value) => {
            console.log(`progress: ${value}`)
        });
        const myMelody = await analyzeMelody(channelData, (value) => {
            console.log(`progress: ${value}`)
        });

        const midiData = {
            ...myMelody,
            "bpm": myRhythm.bpm,
            "key": `${myKey.key} ${myKey.scale}`
        }

        console.log(midiData);

        // save midiData!!
        this.midiData = midiData;

    }


    attachListeners() {
        let offsetX;
        // for moving the track
        let dragging = false;
        // for selecting a range in the track
        let touchTimer = null;
        let selecting = false;
        // flag to distinguish click from range set
        let moved = false;

        let selectLeft, selectRight;
        const waveformTrack = this.querySelector(".waveform-track");

        // dots menu
        const dotsMenuWrap = this.querySelector(".dots-menu-wrap");

        const instrumentPopover = this.querySelector(".instrument-popover")

        // suppress contextmenu on long touchscreen press on a waveform
        this.addEventListener("contextmenu", (e) => {
            if (e.target.closest(".waveform-track")) {
                e.preventDefault();
            }
        });

        // event for setting selection start/end on tab away
        this.addEventListener("focusout", (e) => {
            if (e.target.closest(".select-time-input")) {
                console.log("WE'VE GOT A RANGE CHANGE MEN!!!!");
                const timeStartInput = this.querySelector(".select-time-start");
                const timeEndInput = this.querySelector(".select-time-end");

                if (parseFloat(timeStartInput.value) <= parseFloat(timeEndInput.value)) {
                    this.selectStartPct = Math.max(0, parseFloat(timeStartInput.value) / this.duration);
                    this.selectEndPct = Math.min(1, parseFloat(timeEndInput.value) / this.duration);
                    console.log(this.selectStartPct, this.selectEndPct);
                    this.setSelection();
                }
            }
        });

        this.addEventListener("click", async (e) => {
            if (e.target.closest(".play-track-button")) {
                e.preventDefault();
                if (this.wavesurfer) {
                    this.playTrack(this.volumeFactor);
                }
            } else if (e.target.closest(".stop-track-button")) {
                e.preventDefault();
                this.stopTrack();
            } else if (e.target.closest(".midify-track-button")) {
                e.stopPropagation();
                instrumentPopover.classList.toggle("hidden-div");
            } else if (e.target.closest(".instrument-popover")) {
                e.preventDefault();
                console.log("midify track please!");

                instrumentPopover.classList.add("hidden-div");

                const instrumentButton = e.target.closest("[data-instrument]");
                const instrument = instrumentButton.dataset.instrument;

                if (!this.midiData) await this.midify();

                const midiBlobUrl = await midifyTrack(this.midiData, instrument);
                const midiTrack = document.createElement("song-track");
                const timeStamp = `${Date.now()}`;
                const createdBy = this.getAttribute("created-by");
                midiTrack.setAttribute("trackId", timeStamp);
                midiTrack.setAttribute("filename", this.getAttribute("filename") + `-midi-${timeStamp}`);
                // create a url for the audio blob
                midiTrack.setAttribute("blobUrl", midiBlobUrl);
                midiTrack.setAttribute("title", this.getAttribute("title") + ` (midified ${instrument})`);
                midiTrack.setAttribute("description", `Midified version of ${this.getAttribute("title")}`);
                midiTrack.setAttribute("created-by", createdBy);
                midiTrack.setAttribute("saved", "false");
                // add the dupTrack below this track
                console.log(midiTrack);
                this.after(midiTrack);
            } else if (e.target.closest(".ai-track-button")) {
                e.preventDefault();

                // reveal the overlay
                const inputOverlay = this.querySelector(".input-overlay");
                inputOverlay.classList.remove("hidden-div");

            } else if (e.target.closest(".ai-cancel-button")) {

                // remove the overlay and do nothing
                const inputOverlay = this.querySelector(".input-overlay");
                inputOverlay.classList.add("hidden-div");

            } else if (e.target.closest(".ai-submit-button")) {

                // remove the overlay and get the text
                const inputOverlay = this.querySelector(".input-overlay");
                inputOverlay.classList.add("hidden-div");

                const aiInstructionText = this.querySelector(".input-overlay-input").value;
                console.log(aiInstructionText);

                // remove the AI button and start spinning until the job is done
                const aiTrackButton = this.querySelector(".ai-track-button");
                const aiSpinnerDiv = this.querySelector(".ai-spinner-div");

                aiTrackButton.classList.add("hidden-button");
                aiSpinnerDiv.classList.remove("hidden-div");

                if (!this.midiData) await this.midify();

                const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
                const { cerebras, blobUrl } = await aiTrack(this.midiData, aiInstructionText, csrfToken);

                const midiTrack = document.createElement("song-track");
                const timeStamp = `${Date.now()}`;
                const createdBy = this.getAttribute("created-by");
                midiTrack.setAttribute("trackId", timeStamp);
                midiTrack.setAttribute("filename", this.getAttribute("filename") + `-ai-${timeStamp}`);
                // create a url for the audio blob
                midiTrack.setAttribute("blobUrl", blobUrl);
                midiTrack.setAttribute("title", this.getAttribute("title") + " (ai accompaniment)");
                midiTrack.setAttribute("description", cerebras.description);
                midiTrack.setAttribute("created-by", createdBy);
                midiTrack.setAttribute("saved", "false");
                // add the dupTrack below this track
                console.log(midiTrack);
                this.after(midiTrack);

                aiTrackButton.classList.remove("hidden-button");
                aiSpinnerDiv.classList.add("hidden-div");

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
                dupTrack.setAttribute("filename", this.getAttribute("filename") + `-copy-${timeStamp}`);
                // create a url for the audio blob
                dupTrack.setAttribute("blobUrl", URL.createObjectURL(this.recordedBlob));
                dupTrack.setAttribute("title", this.getAttribute("title") + " (copy)");
                dupTrack.setAttribute("description", this.getAttribute("description"));
                dupTrack.setAttribute("created-by", createdBy);
                dupTrack.setAttribute("saved", "false");
                // add the dupTrack below this track
                console.log(dupTrack);
                this.after(dupTrack);
                // close the dots menu
                dotsMenuWrap.classList.remove("open-menu");
            } else if (e.target.closest(".save-track-button")) {
                e.preventDefault();
                await uploadAudioToS3(this.recordedBlob, this.getAttribute("filename"));
                this.setAttribute("saved", "true");
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
            if (e.target.closest(".waveform-track") || e.target.closest(".waveform-range-select")) {
                e.preventDefault();
                // set moved to false until pointer moves (i.e. not just a click)
                moved = false;
                if (e.pointerType === "touch") {
                    // on touch screen, require a brief hold before starting select (otherwise assume just scrolling)
                    touchTimer = setTimeout(() => {
                        selecting = true;
                        // navigator.vibrate?.(10);
                    }, 250);
                } else {
                    // just mouse so start selecting
                    selecting = true;
                }
                // set selecting start
                const waveformTrackRect = waveformTrack.getBoundingClientRect();
                selectLeft = e.clientX - waveformTrackRect.left;
            }
        });
        this.addEventListener("pointerup", (e) => {
            if (e.target.closest(".waveform-track") || e.target.closest(".waveform-range-select")) {
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
                    this.querySelector(".select-time-start").value = `${startTime.toFixed(1)}`;
                    this.querySelector(".select-time-end").value = `${endTime.toFixed(1)}`;
                    this.toggleEditDiv("show");
                } else {
                    // cancel region
                    moved = false;
                    // clear the selection and hide the edit menu
                    this.setSelection(true);
                    selectRight = null;
                    // this.selectStartPct = null;
                    // this.selectEndPct = null;
                    // hide edit div:
                    // this.toggleEditDiv("hide");
                }
            } else {
                // not selecting, clear timeout if necessary
                clearTimeout(touchTimer);
            }
        });
        this.addEventListener("change", (e) => {
            if (e.target.closest(".title-input")) {
                this.setAttribute("title", e.target.value);
            }
        });
    }

}

customElements.define("song-track", SongTrack);


class NewTrack extends SongTrack {

    connectedCallback() {
        super.connectedCallback();
    }

    render() {
        super.render();
        // Add the extra bits a new track needs
        const trackButtonsDiv = this.querySelector(".track-buttons-div");
        trackButtonsDiv.innerHTML += `
            <div class="record-controls-div">
                <div class="count-down-div hidden-div"></div>
                <div>
                    <button class="swm-button record-button" type="button">Record</button>
                    <button class="swm-button record-stop-button" type="button" disabled>Stop</button>
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

                const stopButton = this.querySelector(".record-stop-button");
                if (stopButton) stopButton.disabled = false;

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
            } else if (e.target.closest(".record-stop-button")) {
                console.log("STOPPING RECORDING!!!!");
                this.stopTrack();
                if (playOtherTracks) {
                    parentSong.tracks.forEach((track) => {
                        if (track !== this) {
                            track.stopTrack();
                        }
                    });
                }
            }

        });
    }

}

customElements.define("new-track", NewTrack);