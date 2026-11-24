window.addEventListener("pageshow", (e) => {
    // make sure we have the up-to-date song list
    if (e.persisted) {
        console.log("refreshing to get song list");
        location.reload();
    }
});
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM Content Loaded!");
});