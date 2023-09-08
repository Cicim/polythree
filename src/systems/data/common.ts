import { resetMapNames } from "./map_names";

/** Resets all the stored data on Rom close */
export function resetData() {
    resetMapNames();
}