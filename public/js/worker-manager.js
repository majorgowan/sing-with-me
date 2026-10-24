let worker;

function getWorker() {
    if (!worker) worker = new Worker("/js/essentia-worker.js", { "type": "module" });
    return worker;
}

function runEssentiaTask(type, channelData, onProgress) {
    const w = getWorker();
    console.log(`running task of type ${type}`);

    return new Promise((resolve, reject) => {

        w.onmessage = (e) => {

            if (e.data.type === "progress") {
                console.log("Got a progress update incoming . . .");
                onProgress?.(e.data.value);
                return;
            } else if (e.data.type !== type) return;

            if (e.data.error) reject(new Error(e.data.error));
            else resolve(e.data.result);
        };

        // post a message to the worker with data and [transferables]
        // the transferables must be _reachable_ from the data but are
        // transferred rather than copied (more efficient) between the
        // main thread and the web worker; problem is the data gets detached
        // from the original object so can't be used twice
        // w.postMessage({ type, channelData }, [channelData.buffer]);

        // actually copy the audio data to the worker
        w.postMessage({ type, channelData });
    });

}


export const analyzeRhythm = (ch, onProgress) => runEssentiaTask("rhythm", ch, onProgress);
export const analyzeKey = (ch, onProgress) => runEssentiaTask("key", ch, onProgress);
export const analyzeMelody = (ch, onProgress) => runEssentiaTask("melody", ch, onProgress);
