document.addEventListener("DOMContentLoaded", () => {

    const addNewTrackDiv = document.getElementById("add-new-track-div");
    const addNewTrackButton = document.getElementById("add-new-track-button");
    if (addNewTrackButton) {
        addNewTrackButton.addEventListener("click", async (e) => {
            e.preventDefault();
            const el = document.createElement("new-track");
            el.setAttribute("filename", "");
            el.setAttribute("description", "New track");
            el.setAttribute("created-by", "You");
            addNewTrackDiv.appendChild(el); // your track container
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

});