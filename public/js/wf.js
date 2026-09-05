document.addEventListener("DOMContentLoaded", () => {

    const addNewTrackDiv = document.getElementById("add-new-track-div");
    const addNewTrackButton = document.getElementById("add-new-track-button");
    if (addNewTrackButton) {
        const userName = addNewTrackButton.dataset.user;
        addNewTrackButton.addEventListener("click", async (e) => {
            e.preventDefault();
            const timeStamp = `${Date.now()}`;
            const el = document.createElement("new-track");
            el.setAttribute("id", timeStamp);
            el.setAttribute("filename", `${userName}-${timeStamp}.webm`);
            el.setAttribute("description", "New track");
            el.setAttribute("created-by", userName);
            el.setAttribute("saved", "false");
            addNewTrackDiv.prepend(el); // your track container
        });
    }

    const playAllButton = document.getElementById("play-all-button");
    if (playAllButton) {
        playAllButton.addEventListener("click", async (e) => {
            e.preventDefault();
            const songTracks = document.querySelectorAll("song-track, new-track");
            songTracks.forEach(songTrack => {
                songTrack.playTrack();
            });
        });
    }

    const saveSongButton = document.getElementById("save-song-button");
    if (saveSongButton) {
        saveSongButton.addEventListener("click", async (e) => {
            e.preventDefault();
            const songTracks = document.querySelectorAll("song-track, new-track");
            console.log(songTracks);
            const songTrackInfo = Array.from(songTracks)
                .map(el => el.getTrackData())
                .filter(trackData => trackData["saved"] === "true");
            console.log(songTrackInfo);

            const songInfo = {
                "id": document.getElementById("song-id").value,
                "title": document.getElementById("song-title-input").value,
                "createdBy": document.getElementById("created-by-input").value,
                "bpm": Number(document.getElementById("bpm-input").value),
                "timeSignature": Number(document.getElementById("time-select").value),
                "tracks": songTrackInfo
            }

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
                document.getElementById("song-id").value = data.songId;
                console.log("updated song id");
                console.log(document.getElementById("song-id").value);
            }
        })
    }

});