

class Song extends HTMLElement {

    connectedCallback() {
        this.render();
        // TODO: discover child song-tracks
        this.tracks = [...this.querySelectorAll("song-track")];
        this.attachListeners();
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
                    songTrack.playTrack();
                });
            } else if (e.target.closest(".add-new-track-button")) {
                e.preventDefault();
                console.log(e.target.dataset.user);
                const userName = e.target.dataset.user;
                const addNewTrackDiv = this.querySelector(".add-new-track-div");
                const timeStamp = `${Date.now()}`;
                // create new track (NewTrack object) and add it to the DOM
                const el = document.createElement("new-track");
                el.setAttribute("trackId", timeStamp);
                el.setAttribute("filename", `${userName}-${timeStamp}.webm`);
                el.setAttribute("description", "New track");
                el.setAttribute("created-by", userName);
                el.setAttribute("saved", "false");
                addNewTrackDiv.prepend(el); // your track container
                // add this track to the object's list of tracks
                this.tracks.push(el);
                console.log(this.tracks);
            } else if (e.target.closest(".save-song-button")) {
                e.preventDefault();
                const songInfo = this.getSongData(true);
                console.log(songInfo);

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
            "tracks": songTrackInfo
        };
    }

}

customElements.define("song-div", Song);
