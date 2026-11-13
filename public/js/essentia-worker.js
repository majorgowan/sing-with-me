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
                self.postMessage({"type": "progress", "value": "I'm doing it you stupid woman!!"});
                self.postMessage({"type": "progress", "value": "Normalizing loudness"});
                const normalized = essentia.EqualLoudness(signal).signal;
                self.postMessage({"type": "progress", "value": "Analyzing melodia"});
                // docs: https://mtg.github.io/essentia.js/docs/api/Essentia.html#PredominantPitchMelodia
                //      PredominantPitchMelodia( signal [, binResolution [, filterIterations [, frameSize
                //                                      [, guessUnvoiced [, harmonicWeight [, hopSize
                //                                      [, magnitudeCompression [, magnitudeThreshold
                //                                      [, maxFrequency [, minDuration [, minFrequency
                //                                      [, numberHarmonics [, peakDistributionThreshold
                //                                      [, peakFrameThreshold [, pitchContinuity
                //                                      [, referenceFrequency [, sampleRate [, timeContinuity
                //                                      [, voiceVibrato [, voicingTolerance
                //                                      ] ] ] ] ] ] ] ] ] ] ] ] ] ] ] ] ] ] ] ] )
                // defaults:
                // const melodia = essentia.PredominantPitchMelodia(
                //     normalized, 10, 3, 2048, false, 0.8, 128, 1, 40, 20000, 100,
                //     80, 20, 0.9, 0.9, 27.5625, 55, 44100, 100, false, 0.2
                // );
                const melodia = essentia.PredominantPitchMelodia(
                    normalized, 10, 3, 2048, false, 0.8, 128, 1, 40, 20000, 100, 80, 20, 0.9, 0.9, // defaults
                    40,  // pitchContinuity (not default)
                    55, 44100, 100, false, // defaults
                    0.5   // voicingTolerance (not default)
                );
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

                // TODO: implement volumes ("velocities")
                const volumes = cleanDurations.map(d => 1.0);

                result = {
                    "notes": cleanNotes,
                    "onsets": cleanOnsets,
                    "durations": cleanDurations,
                    "volumes": volumes
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
        console.error(err);
        // console.error(`[${type}] FAILED: ${err}`);
        self.postMessage({
            type,
            "error": err.message
        });
    }

};