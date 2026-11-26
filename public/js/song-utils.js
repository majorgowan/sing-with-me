window.addEventListener("pageshow", (e) => {
    // make sure we have the up-to-date song list
    if (e.persisted) {
        console.log("refreshing to get updated state");
        location.reload();
    }
});
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM Content Loaded!");

    const letsGoButton = document.getElementById("lets-go-button");
    if (letsGoButton) {
        const welcomeOverlay = document.getElementById("welcome-overlay");
        letsGoButton.addEventListener("click", (e) => {
            e.preventDefault();
            console.log("let's friggin' go!!");
            welcomeOverlay.classList.add("hidden-div");
        });
    }
});