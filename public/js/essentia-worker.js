// import essentia library
import Essentia from "https://cdn.jsdelivr.net/npm/essentia.js@0.1.1/dist/essentia.js-core.es.js";
// import essentia-wasm-module
import { EssentiaWASM } from "https://cdn.jsdelivr.net/npm/essentia.js@0.1.1/dist/essentia-wasm.es.js";

const essentia = new Essentia(EssentiaWASM);


self.onmessage = (e) => {

    // get essentia task (type) and payload (channelData) from the event
    const { type, channelData } = e.data;

    try {
        const signal = essentia.arrayToVector(channelData);
        let result;

        // depending on the task
        switch (type) {
            case "rhythm":
                result = essentia.RhythmExtractor2013(signal);
                break;
            case "key":
                result = essentia.KeyExtractor(signal);
                break;
            case "melody": {
                // note: need { } for scoping variables declared in a case block
                console.log("in worker ... analyzing MELODY");
                self.postMessage({"type": "progress", "value": "Analyzing melodia"});
                self.postMessage({"type": "progress", "value": "I'm doing it you stupid woman!!"});
                const melodia = essentia.PredominantPitchMelodia(signal);
                self.postMessage({"type": "progress", "value": "Analyzing segments"});
                const segments = essentia.PitchContourSegmentation(melodia.pitch, signal);

                self.postMessage({"type": "progress", "value": "Analyzing notes"});
                const notes = essentia.vectorToArray(segments.MIDIpitch);
                self.postMessage({"type": "progress", "value": "Analyzing onsets"});
                const onsets = essentia.vectorToArray(segments.onset);
                self.postMessage({"type": "progress", "value": "Analyzing durations"});
                const durations = essentia.vectorToArray(segments.duration);

                const cleanNotes = Array.from(notes).map((n, i) => durations[i] > 0.1 && n > 0 ? n : null).filter(n => n !== null);
                const cleanOnsets = Array.from(onsets).map((t, i) => durations[i] > 0.1 && notes[i] > 0 ? t : null).filter(t => t !== null);
                const cleanDurations = Array.from(durations).map((d, i) => durations[i] > 0.1 && notes[i] > 0 ? d : null).filter(d => d !== null);

                result = {
                    "notes": cleanNotes,
                    "onsets": cleanOnsets,
                    "durations": cleanDurations
                };
                break;
            }
            default:
                throw new Error(`Unknown task ${type}`);

        }

        self.postMessage({
            type,
            result
        });

    } catch (err) {
        console.error(`[${type}] FAILED: ${err}`);
        self.postMessage({
            type,
            "error": err.message
        });
    }

};