export const uploadAudioToS3 = async (audioBlob, fileName) => {
    // 1. Request the presigned URL from your Express server
    const urlResponse = await fetch(`/s3/upload-url?fileName=${encodeURIComponent(fileName)}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            // Include auth headers here if your route is protected
        }
    });

    if (!urlResponse.ok) {
        const error = await urlResponse.json();
        throw new Error(`Failed to get upload URL: ${error.error}`);
    }

    const { url } = await urlResponse.json();

    // 2. Upload the blob directly to S3 using the presigned URL
    // Note: We use PUT method and pass the blob directly as the body
    const uploadResponse = await fetch(url, {
        method: "PUT",
        body: audioBlob,
        headers: {
            "Content-Type": "audio/webm" // Must match the ContentType used in the backend command
        }
    });

    if (!uploadResponse.ok) {
        throw new Error(`Failed to upload to S3: ${uploadResponse.statusText}`);
    }

    console.log("Upload successful!");
    // The file is now available at the URL constructed from your bucket and key
    // e.g., https://<bucket>.s3.<region>.amazonaws.com/recordings/<fileName>
}


export const loadAudioBlob = async (fileName) => {
    // 1. Request the presigned playback URL from your Express server
    const response = await fetch(`/s3/playback-url?key=${encodeURIComponent(fileName)}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            // Include auth headers here if your route is protected
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get playback URL: ${error.error}`);
    }

    const { url } = await response.json();

    // 2. Fetch the audio data from S3 and convert to Blob
    // The URL is signed, so you can fetch it directly from the client
    const audioResponse = await fetch(url, {
        method: 'GET'
    });

    if (!audioResponse.ok) {
        throw new Error(`Failed to fetch audio from S3: ${audioResponse.statusText}`);
    }

    // Convert response to Blob object
    const audioBlob = await audioResponse.blob();

    console.log("Audio loaded from S3!");

    return audioBlob;
}

