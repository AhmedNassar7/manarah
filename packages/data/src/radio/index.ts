import type { RadioStation } from "@manarah/core";
import stationsData from "./stations.json";

/**
 * The live Quran radio stations — a snapshot of MP3Quran.net's public catalogue
 * (https://mp3quran.net/api/v3/radios), taken 2026-11-07 and then **each stream was opened and
 * read**: 172 of the catalogue's 177 answered with live audio and are kept; the five that did not
 * (404 / 401 / 500) are left out — Muftah Al-Saltany's third station, the Korean translation,
 * Sahih al-Bukhari, "Gharib al-Quran", and one more reciter. Names were tidied (the source
 * decorates some with dashes and asterisks, and repeats one name for different readings, which
 * are told apart by `variant` — taken from the reading names MP3Quran lists for each reciter, and
 * from the stream's own name; for Muftah Al-Saltany's station named only "al-Doori" (92) the
 * reading is Al-Doori from Al-Kisai, by elimination: his other Doori station is named Abi Amr).
 *
 * Why a snapshot and not a live fetch: the list is small (~25 KB), works offline (the stations
 * themselves need a connection, the list does not), and a change at the source cannot silently
 * change what a person is about to listen to. Why the Saudi Quran Radio is among them: it is the
 * catalogue's own entry for it (a radiojar stream). A station that stops working later shows
 * "this station is not available right now" rather than failing silently.
 *
 * Four national radios MP3Quran does not carry were added (ids from 900001, ours): Cairo, Sharjah,
 * Algeria and Pakistan's Sawt-ul-Quran, found in the community Radio Browser directory — chosen
 * only where the stream's own host names the broadcaster (a government or broadcaster domain), and
 * each opened **from a real https page** in Chrome (the radiojar ones redirect to http; Chrome
 * upgrades it, which was checked rather than assumed). The directory's *labels* are not trusted: the
 * same Saudi stream is filed there under Algeria, Egypt and the UAE.
 *
 * Not here, and the reason: Kuwait, Jordan, Oman and Bahrain broadcast only as HLS (.m3u8), which
 * Chrome cannot play in an audio element; Morocco, Qatar, Sudan and others had no usable stream
 * found; Faisal bin Judhyan and Abdullah Al-Asmari are not in this catalogue.
 */
export const RADIO_STATIONS = stationsData as RadioStation[];
