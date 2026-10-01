

class Song extends HTMLElement {

    #observer = null;

    connectedCallback() {
        this.render();
        this.attachListeners();
        this.globalTime = 0;
        this.leftTimelineMargin = 0;
    }

    disconnectedCallback() {
        this.#observer.disconnect();
    }

    get tracks() {
        return this.querySelectorAll("song-track");
    }

    render() {
        // set DOM element values based on attributes passed to <song-div>
        const songTitleInput = this.querySelector(".song-title-input");
        songTitleInput.value = this.getAttribute("song-title");
        const createdByInput = this.querySelector(".created-by-input");
        createdByInput.value = this.getAttribute("created-by");
        const bpmInput = this.querySelector(".bpm-input");
        bpmInput.value = this.getAttribute("bpm");
        const timeSignatureSelect = this.querySelector(".time-signature-select");
        timeSignatureSelect.value = this.getAttribute("time-signature");
    }

    attachListeners() {
        this.addEventListener("click", async (e) => {
            if (e.target.closest(".play-all-button")) {
                e.preventDefault();
                this.tracks.forEach(songTrack => {
                    songTrack.playTrack(null, true);
                });
            } else if (e.target.closest(".add-new-track-button")) {
                e.preventDefault();
                console.log(e.target.dataset.username);
                const userName = e.target.dataset.username;
                const addNewTrackDiv = this.querySelector(".add-new-track-div");
                const timeStamp = `${Date.now()}`;
                // create new track (NewTrack object) and add it to the DOM
                const el = document.createElement("new-track");
                el.setAttribute("trackId", timeStamp);
                el.setAttribute("filename", `${userName}-${timeStamp}.webm`);
                el.setAttribute("description", "New track");
                el.setAttribute("created-by", userName);
                el.setAttribute("saved", "false");
                // add this track to the DOM
                addNewTrackDiv.prepend(el); // your track container
            } else if (e.target.closest(".save-song-button")) {
                e.preventDefault();
                const songInfo = this.getSongData(true);
                console.log(songInfo);
                // TODO: SAVE ALL NEW BZW. MODIFIED TRACKS

                const requestBody = {"songInfo": songInfo};

                const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

                const postResult = await fetch("/savesong", {
                    "method": "POST",
                    "credentials": "same-origin",
                    "headers": {
                        "Content-Type": "application/json",
                        "X-CSRF-Token": csrfToken,
                    },
                    "body": JSON.stringify(requestBody),
                });
                const data = await postResult.json();

                console.log(data);
                // set song id value
                if (data.songId) {
                    this.setAttribute("song-id", data.songId);
                    console.log("updated song id", data.songId);
                }
            }
        });
    }

    getSongData(onlySaved) {
        const songTrackInfo = this.tracks
            .map(track => track.getTrackData())
            .filter(trackData => {
                return (!onlySaved || trackData.saved === "true")
            });
        return {
            "songId": this.getAttribute("song-id"),
            "title": this.querySelector(".song-title-input").value,
            "bpm": this.querySelector(".bpm-input").value,
            "timeSignature": this.querySelector(".time-signature-select").value,
            "createdBy": this.getAttribute("created-by"),
            "forkedFrom": "",
            "impressions": 0,
            "tracks": songTrackInfo
        };
    }

    updateTimeline() {
        const tracks = this.tracks;
        const timeLine = this.querySelector(".timeline");
        if (tracks.length < 1) {
            timeLine.classList.add("hidden-div");
            return;
        }

        timeLine.classList.remove("hidden-div");
        this.timeFactor = tracks[0].getTimeFactor();
        this.leftTimelineMargin = parseFloat(getComputedStyle(tracks[0]).marginLeft);
        console.log(`time factor: ${this.timeFactor} pixels per second`);
    }

    syncTimeline(t) {
        // update the timeline
        if (this.timeFactor && (t === 0 || t > this.globalTime)) {
            // console.log(t);
            const timelineTimer = this.querySelector(".timeline-timer");
            timelineTimer.style.width = (this.leftTimelineMargin + this.timeFactor * t) + "px";
            this.globalTime = t;
        }
    }

}

customElements.define("song-div", Song);
