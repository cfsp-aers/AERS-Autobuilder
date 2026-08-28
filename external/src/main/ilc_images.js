/**
 * ilc_images.js -- fetch product images for the ILC codes in a brief.
 *
 * A brief may carry ILC columns (ILC_01, ILC_02, ...) holding product codes.
 * Each is looked up against Petbarn's search endpoint to find the product's
 * image, which is then saved next to the others for that module.
 *
 * Ported from v2.5, where it did not work. Three things were wrong:
 *
 *   - `await emailData.forEach(async ...)`. forEach ignores the promises its
 *     callback returns, so the await returned immediately and the function
 *     reported success while nothing had been fetched.
 *   - `download_image` was fire-and-forget -- `dl.start().catch(...)` was never
 *     awaited -- so a failed download was logged to a console nobody reads.
 *   - the lookup returned a *string* on failure, which the caller then treated
 *     as a product object. `product_data.image` was undefined, and the string
 *     itself was passed to the downloader as a URL.
 *
 * The result was a UI that opened a folder after a fixed three-second wait
 * whether or not anything was in it. This version awaits everything and returns
 * what happened, per code.
 */

const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("xlsx");

const { load } = require("./utils/load.js");
const { app_dir } = require("./constants.js");

const aers = load(app_dir, "main/utils/aers utilities.js");

/** Petbarn's search-suggest endpoint. The lookup is live: nothing is cached. */
const ILC_LOOKUP_URL = "https://www.petbarn.com.au/search/ajax/suggest/?q=";

/**
 * Requests in flight at once. Enough to keep a slow round-trip from dominating,
 * low enough not to look like an attack to the far end.
 */
const CONCURRENCY = 4;

/** Per request. Without one an unreachable host hangs the app indefinitely. */
const TIMEOUT_MS = 20000;

function is_url(value) {
    return String(value).startsWith("http");
}

/** Columns holding ILC codes, in the camelCased form sheet_to_objects produces. */
function ilc_columns(row) {
    return Object.keys(row).filter((key) => key.toLowerCase().startsWith("ilc"));
}

async function fetch_with_timeout(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        return await fetch(url, { signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

/**
 * The image URL for one ILC code.
 *
 * Always resolves. A failure comes back as { ok: false, reason }, never as a
 * string standing in for a product -- which is what made the original swallow
 * its errors.
 */
async function lookup_image(ilc) {
    if (is_url(ilc)) {
        return { ok: true, url: ilc, name: null };
    }

    try {
        const response = await fetch_with_timeout(ILC_LOOKUP_URL + encodeURIComponent(ilc));
        if (!response.ok) {
            return { ok: false, reason: `search returned ${response.status}` };
        }

        const product = (await response.json())?.data?.products?.[0];
        if (!product) {
            return { ok: false, reason: "no product found" };
        }
        if (!product.image) {
            return { ok: false, reason: `"${product.name || ilc}" has no image` };
        }

        return { ok: true, url: product.image, name: product.name };
    } catch (error) {
        return { ok: false, reason: error.name === "AbortError" ? "search timed out" : error.message };
    }
}

async function save_image(url, destination) {
    const response = await fetch_with_timeout(url);
    if (!response.ok) {
        throw new Error(`image returned ${response.status}`);
    }

    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, Buffer.from(await response.arrayBuffer()));
}

/** Every ILC code in the selected sheets, with where its image should land. */
function collect_jobs(brief_location, selected_sheets, save_to) {
    const wb = XLSX.readFile(brief_location);
    const jobs = [];

    selected_sheets.forEach((sheet) => {
        const rows = aers.sheet_to_objects(wb.Sheets[sheet], "moduleType", `the "${sheet}" sheet`);

        rows.forEach((row, index) => {
            // moduleName is what a designer would look for in Finder. Not every
            // template has the column, so fall back to something identifiable.
            const folder = row.moduleName || row.moduleType || `row ${index + 1}`;

            ilc_columns(row).forEach((column) => {
                const value = row[column];
                if (!value || value === "0") return;

                jobs.push({
                    sheet: sheet,
                    ilc: value,
                    column: column,
                    // A cell holding a URL rather than a code has no code to name
                    // the file after, so the column names it instead.
                    destination: path.join(save_to, sheet, String(folder), `${is_url(value) ? column : value}.jpg`)
                });
            });
        });
    });

    return jobs;
}

/** Run tasks with at most CONCURRENCY in flight, keeping every result. */
async function in_batches(items, worker) {
    const results = [];
    for (let i = 0; i < items.length; i += CONCURRENCY) {
        results.push(...(await Promise.all(items.slice(i, i + CONCURRENCY).map(worker))));
    }
    return results;
}

/**
 * Download every ILC image in the selected sheets.
 *
 * @param {object} options
 * @param {string} options.briefLocation
 * @param {string[]} options.selectedSheets
 * @param {string} options.saveTo             folder to write into
 * @param {function} [options.onProgress]     called with (done, total)
 * @returns {{path: string, total: number, downloaded: number, failed: object[], message: string}}
 */
async function downloadImages({ briefLocation, selectedSheets, saveTo, onProgress }) {
    const jobs = collect_jobs(briefLocation, selectedSheets, saveTo);

    if (jobs.length === 0) {
        return { path: saveTo, total: 0, downloaded: 0, failed: [], message: "No ILC columns found in the selected sheets." };
    }

    let done = 0;

    const results = await in_batches(jobs, async (job) => {
        try {
            const found = await lookup_image(job.ilc);
            if (!found.ok) {
                return { ...job, ok: false, reason: found.reason };
            }
            await save_image(found.url, job.destination);
            return { ...job, ok: true };
        } catch (error) {
            return { ...job, ok: false, reason: error.name === "AbortError" ? "download timed out" : error.message };
        } finally {
            done++;
            if (typeof onProgress === "function") onProgress(done, jobs.length);
        }
    });

    const failed = results.filter((result) => !result.ok);
    const downloaded = results.length - failed.length;

    failed.forEach((result) => console.warn(`ILC ${result.ilc} (${result.sheet}): ${result.reason}`));

    return {
        path: saveTo,
        total: jobs.length,
        downloaded: downloaded,
        failed: failed.map(({ ilc, sheet, reason }) => ({ ilc, sheet, reason })),
        message: failed.length === 0 ? `Downloaded ${downloaded} image${downloaded === 1 ? "" : "s"}.` : `Downloaded ${downloaded} of ${jobs.length}. ${failed.length} failed.`
    };
}

module.exports = {
    downloadImages: downloadImages
};
