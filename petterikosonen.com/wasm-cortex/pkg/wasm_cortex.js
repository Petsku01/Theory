/* @ts-self-types="./wasm_cortex.d.ts" */

export class BurstSystem {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BurstSystemFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_burstsystem_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    data_ptr() {
        const ret = wasm.burstsystem_data_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {boolean}
     */
    has_spawned() {
        const ret = wasm.burstsystem_has_spawned(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    len() {
        const ret = wasm.burstsystem_len(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} count
     */
    constructor(count) {
        const ret = wasm.burstsystem_new(count);
        this.__wbg_ptr = ret;
        BurstSystemFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {number} r
     * @param {number} g
     * @param {number} b
     */
    set_color(r, g, b) {
        wasm.burstsystem_set_color(this.__wbg_ptr, r, g, b);
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    set_origin(x, y, z) {
        wasm.burstsystem_set_origin(this.__wbg_ptr, x, y, z);
    }
    /**
     * @returns {number}
     */
    stride() {
        const ret = wasm.burstsystem_stride(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Update all particles. Returns pointer to data buffer.
     * is_active: whether origin is set (node selected) or null (free drift).
     * delta: frame delta time in seconds.
     * @param {boolean} is_active
     * @param {number} delta
     * @returns {number}
     */
    update(is_active, delta) {
        const ret = wasm.burstsystem_update(this.__wbg_ptr, is_active, delta);
        return ret >>> 0;
    }
}
if (Symbol.dispose) BurstSystem.prototype[Symbol.dispose] = BurstSystem.prototype.free;

export class CameraSystem {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CameraSystemFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_camerasystem_free(ptr, 0);
    }
    /**
     * Clear target (deselect). Stops lerping.
     */
    clear_target() {
        wasm.camerasystem_clear_target(this.__wbg_ptr);
    }
    /**
     * Output data pointer
     * @returns {number}
     */
    data_ptr() {
        const ret = wasm.camerasystem_data_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Whether the system has a target
     * @returns {boolean}
     */
    has_target() {
        const ret = wasm.camerasystem_has_target(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Whether the system is currently lerping
     * @returns {boolean}
     */
    is_lerping() {
        const ret = wasm.camerasystem_is_lerping(this.__wbg_ptr);
        return ret !== 0;
    }
    constructor() {
        const ret = wasm.camerasystem_new();
        this.__wbg_ptr = ret;
        CameraSystemFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Set the internal camera position and look-at target.
     * Used to sync WASM state with current Three.js camera on init.
     * @param {number} cx
     * @param {number} cy
     * @param {number} cz
     * @param {number} tx
     * @param {number} ty
     * @param {number} tz
     */
    set_position(cx, cy, cz, tx, ty, tz) {
        wasm.camerasystem_set_position(this.__wbg_ptr, cx, cy, cz, tx, ty, tz);
    }
    /**
     * Set a new target. Resets lerp state.
     * tx/ty/tz: target position
     * @param {number} tx
     * @param {number} ty
     * @param {number} tz
     */
    set_target(tx, ty, tz) {
        wasm.camerasystem_set_target(this.__wbg_ptr, tx, ty, tz);
    }
    /**
     * Trigger a shake effect.
     * dir_x/y/z: normalized shake direction
     * current_time: performance.now() in seconds
     * @param {number} dir_x
     * @param {number} dir_y
     * @param {number} dir_z
     * @param {number} current_time
     */
    trigger_shake(dir_x, dir_y, dir_z, current_time) {
        wasm.camerasystem_trigger_shake(this.__wbg_ptr, dir_x, dir_y, dir_z, current_time);
    }
    /**
     * Per-frame update. Returns pointer to output buffer (6 f32s).
     * delta: frame delta time
     * current_time: performance.now() in seconds (for shake elapsed)
     * Returns [cam_x, cam_y, cam_z, target_x, target_y, target_z]
     * @param {number} delta
     * @param {number} current_time
     * @returns {number}
     */
    update(delta, current_time) {
        const ret = wasm.camerasystem_update(this.__wbg_ptr, delta, current_time);
        return ret >>> 0;
    }
    /**
     * Mark that user took control (stops auto-lerp).
     */
    user_controlled() {
        wasm.camerasystem_user_controlled(this.__wbg_ptr);
    }
}
if (Symbol.dispose) CameraSystem.prototype[Symbol.dispose] = CameraSystem.prototype.free;

/**
 * Edge system: computes cylinder geometry and pulse positions for network edges.
 * Matches NetworkEdges.tsx computation but runs in WASM.
 *
 * Data layout per edge (8 f32s):
 * [mid_x, mid_y, mid_z, length, quat_x, quat_y, quat_z, quat_w]
 *
 * Pulse data per edge (3 f32s):
 * [pulse_x, pulse_y, pulse_z]
 */
export class EdgeSystem {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        EdgeSystemFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_edgesystem_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    cylinder_data_ptr() {
        const ret = wasm.edgesystem_cylinder_data_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    cylinder_stride() {
        const ret = wasm.edgesystem_cylinder_stride(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Initialize edges from node positions and edge list.
     * from_positions: flat array [x0,y0,z0, x1,y1,z1, ...] for "from" nodes
     * to_positions: flat array [x0,y0,z0, x1,y1,z1, ...] for "to" nodes
     * edge_indices: indices into the position arrays (from_idx, to_idx pairs)
     * highlight_flags: 1 if this edge is highlighted (connects selected node), 0 otherwise
     * Returns pointer to cylinder data.
     * @param {number} from_positions
     * @param {number} to_positions
     * @param {number} edge_count
     * @param {number} highlight_flags
     * @returns {number}
     */
    init_edges(from_positions, to_positions, edge_count, highlight_flags) {
        const ret = wasm.edgesystem_init_edges(this.__wbg_ptr, from_positions, to_positions, edge_count, highlight_flags);
        return ret >>> 0;
    }
    /**
     * @param {number} index
     * @returns {boolean}
     */
    is_highlighted(index) {
        const ret = wasm.edgesystem_is_highlighted(this.__wbg_ptr, index);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    len() {
        const ret = wasm.edgesystem_len(this.__wbg_ptr);
        return ret >>> 0;
    }
    constructor() {
        const ret = wasm.edgesystem_new();
        this.__wbg_ptr = ret;
        EdgeSystemFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {number}
     */
    pulse_data_ptr() {
        const ret = wasm.edgesystem_pulse_data_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    pulse_stride() {
        const ret = wasm.edgesystem_pulse_stride(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Update highlight flags (called when selection changes).
     * @param {number} flags
     */
    update_highlights(flags) {
        wasm.edgesystem_update_highlights(this.__wbg_ptr, flags);
    }
    /**
     * Update pulse positions for all edges.
     * elapsed: current clock time
     * Returns pointer to pulse data (edge_count * 3 f32s).
     * @param {number} from_positions
     * @param {number} to_positions
     * @param {number} elapsed
     * @returns {number}
     */
    update_pulses(from_positions, to_positions, elapsed) {
        const ret = wasm.edgesystem_update_pulses(this.__wbg_ptr, from_positions, to_positions, elapsed);
        return ret >>> 0;
    }
}
if (Symbol.dispose) EdgeSystem.prototype[Symbol.dispose] = EdgeSystem.prototype.free;

/**
 * Grid texture generator: produces RGBA pixel data for a cyber grid.
 * Matches CyberGrid.tsx canvas drawing but generates pixels in WASM.
 * Output: flat Vec<u8> of size (width * height * 4) RGBA pixels.
 */
export class GridGenerator {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GridGeneratorFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_gridgenerator_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    data_ptr() {
        const ret = wasm.gridgenerator_data_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Generate grid texture pixels.
     * size: width = height (e.g. 1024)
     * spacing: grid line spacing in pixels (e.g. 64)
     * line_color: [r, g, b, a] for grid lines (0-255)
     * bg_gradient_center: [r, g, b, a] at gradient center (transparent)
     * bg_gradient_edge: [r, g, b, a] at gradient edge (dark)
     * Returns pointer to RGBA pixel data (size * size * 4 bytes).
     * @param {number} size
     * @param {number} spacing
     * @param {number} line_r
     * @param {number} line_g
     * @param {number} line_b
     * @param {number} line_a
     * @param {number} edge_r
     * @param {number} edge_g
     * @param {number} edge_b
     * @param {number} edge_a
     * @returns {number}
     */
    generate(size, spacing, line_r, line_g, line_b, line_a, edge_r, edge_g, edge_b, edge_a) {
        const ret = wasm.gridgenerator_generate(this.__wbg_ptr, size, spacing, line_r, line_g, line_b, line_a, edge_r, edge_g, edge_b, edge_a);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    height() {
        const ret = wasm.gridgenerator_height(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    len() {
        const ret = wasm.gridgenerator_len(this.__wbg_ptr);
        return ret >>> 0;
    }
    constructor() {
        const ret = wasm.gridgenerator_new();
        this.__wbg_ptr = ret;
        GridGeneratorFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {number}
     */
    width() {
        const ret = wasm.gridgenerator_width(this.__wbg_ptr);
        return ret >>> 0;
    }
}
if (Symbol.dispose) GridGenerator.prototype[Symbol.dispose] = GridGenerator.prototype.free;

/**
 * LayoutSystem computes Fibonacci spiral positions for cluster nodes.
 * Positions are stored in a flat Vec<f32> (count * 3).
 * JS reads via data_ptr() + Float32Array view into WASM memory.
 */
export class LayoutSystem {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        LayoutSystemFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_layoutsystem_free(ptr, 0);
    }
    /**
     * Compute positions for a single cluster of nodes.
     * seeds: per-node seed values (from JS: node.id.length * 127 + i * 31)
     * Passed as raw pointer + length into WASM linear memory.
     * center_x/y/z: cluster center position
     * Returns pointer to flat positions array (count * 3 f32s).
     * @param {number} seeds_ptr
     * @param {number} seeds_len
     * @param {number} center_x
     * @param {number} center_y
     * @param {number} center_z
     * @returns {number}
     */
    compute_cluster(seeds_ptr, seeds_len, center_x, center_y, center_z) {
        const ret = wasm.layoutsystem_compute_cluster(this.__wbg_ptr, seeds_ptr, seeds_len, center_x, center_y, center_z);
        return ret >>> 0;
    }
    /**
     * Raw pointer to positions data
     * @returns {number}
     */
    data_ptr() {
        const ret = wasm.layoutsystem_data_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of nodes (positions.len() / 3)
     * @returns {number}
     */
    len() {
        const ret = wasm.layoutsystem_len(this.__wbg_ptr);
        return ret >>> 0;
    }
    constructor() {
        const ret = wasm.layoutsystem_new();
        this.__wbg_ptr = ret;
        LayoutSystemFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}
if (Symbol.dispose) LayoutSystem.prototype[Symbol.dispose] = LayoutSystem.prototype.free;

export class NodeAnimationSystem {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NodeAnimationSystemFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_nodeanimationsystem_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    data_ptr() {
        const ret = wasm.nodeanimationsystem_data_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Initialize with node phases and tilt angles.
     * phases_ptr: per-node phase offset (count f32s)
     * tilts_ptr: per-node tilt angles (count * 5 f32s)
     * count: number of nodes
     * @param {number} phases_ptr
     * @param {number} tilts_ptr
     * @param {number} count
     */
    init(phases_ptr, tilts_ptr, count) {
        wasm.nodeanimationsystem_init(this.__wbg_ptr, phases_ptr, tilts_ptr, count);
    }
    /**
     * @returns {number}
     */
    len() {
        const ret = wasm.nodeanimationsystem_len(this.__wbg_ptr);
        return ret >>> 0;
    }
    constructor() {
        const ret = wasm.nodeanimationsystem_new();
        this.__wbg_ptr = ret;
        NodeAnimationSystemFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {number}
     */
    stride() {
        const ret = wasm.nodeanimationsystem_stride(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Update all nodes. Returns pointer to output buffer (count * 16 f32s).
     * elapsed: clock elapsed time
     * delta: frame delta time
     * active_flags: per-node 0 (idle) or 1 (active/hovered/selected)
     * @param {number} elapsed
     * @param {number} delta
     * @param {number} active_flags_ptr
     * @returns {number}
     */
    update(elapsed, delta, active_flags_ptr) {
        const ret = wasm.nodeanimationsystem_update(this.__wbg_ptr, elapsed, delta, active_flags_ptr);
        return ret >>> 0;
    }
}
if (Symbol.dispose) NodeAnimationSystem.prototype[Symbol.dispose] = NodeAnimationSystem.prototype.free;

export class ParticleSystem {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ParticleSystemFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_particlesystem_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    data_ptr() {
        const ret = wasm.particlesystem_data_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    len() {
        const ret = wasm.particlesystem_len(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} count
     * @param {number} x_bound
     * @param {number} y_bound
     * @param {number} z_bound
     */
    constructor(count, x_bound, y_bound, z_bound) {
        const ret = wasm.particlesystem_new(count, x_bound, y_bound, z_bound);
        this.__wbg_ptr = ret;
        ParticleSystemFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {number}
     */
    stride() {
        const ret = wasm.particlesystem_stride(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Update all particles. Returns pointer to position data (count * 3 f32s).
     * target_pos: [x, y, z] of attraction target, or empty for no attraction.
     * @param {number} target_x
     * @param {number} target_y
     * @param {number} target_z
     * @param {boolean} has_target
     * @returns {number}
     */
    update(target_x, target_y, target_z, has_target) {
        const ret = wasm.particlesystem_update(this.__wbg_ptr, target_x, target_y, target_z, has_target);
        return ret >>> 0;
    }
}
if (Symbol.dispose) ParticleSystem.prototype[Symbol.dispose] = ParticleSystem.prototype.free;

/**
 * Text scramble state machine.
 * Matches useScramble.ts logic but runs char generation in WASM.
 * JS handles timing (setInterval/setTimeout) and React state.
 * WASM holds: target text (as char codes), revealed flags, generates scrambled output.
 *
 * Protocol:
 * 1. init(char_codes_ptr, len) -- store target text
 * 2. tick() -> ptr to output char codes (len u8s)
 * 3. reveal_next() -- reveal one more character
 * 4. reset() -- clear all revealed
 */
export class ScrambleSystem {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ScrambleSystemFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_scramblesystem_free(ptr, 0);
    }
    /**
     * Output data pointer.
     * @returns {number}
     */
    data_ptr() {
        const ret = wasm.scramblesystem_data_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Initialize with target text (as char codes).
     * char_codes: pointer to u8 array, len: number of chars
     * @param {number} char_codes_ptr
     * @param {number} len
     */
    init(char_codes_ptr, len) {
        wasm.scramblesystem_init(this.__wbg_ptr, char_codes_ptr, len);
    }
    /**
     * Check if all characters are revealed.
     * @returns {boolean}
     */
    is_complete() {
        const ret = wasm.scramblesystem_is_complete(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Number of characters in target text.
     * @returns {number}
     */
    len() {
        const ret = wasm.scramblesystem_len(this.__wbg_ptr);
        return ret >>> 0;
    }
    constructor() {
        const ret = wasm.scramblesystem_new();
        this.__wbg_ptr = ret;
        ScrambleSystemFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Reset scramble state (clear all revealed).
     */
    reset() {
        wasm.scramblesystem_reset(this.__wbg_ptr);
    }
    /**
     * Reveal one more character (left to right).
     */
    reveal_next() {
        wasm.scramblesystem_reveal_next(this.__wbg_ptr);
    }
    /**
     * Get target char code at index.
     * @param {number} index
     * @returns {number}
     */
    target_char(index) {
        const ret = wasm.scramblesystem_target_char(this.__wbg_ptr, index);
        return ret;
    }
    /**
     * Generate one frame of scrambled text.
     * Returns pointer to output char codes (len u8s).
     * frame_counter: increments each call to produce different output per frame.
     * @returns {number}
     */
    tick() {
        const ret = wasm.scramblesystem_tick(this.__wbg_ptr);
        return ret >>> 0;
    }
}
if (Symbol.dispose) ScrambleSystem.prototype[Symbol.dispose] = ScrambleSystem.prototype.free;
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_throw_ea4887a5f8f9a9db: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./wasm_cortex_bg.js": import0,
    };
}

const BurstSystemFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_burstsystem_free(ptr, 1));
const CameraSystemFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_camerasystem_free(ptr, 1));
const EdgeSystemFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_edgesystem_free(ptr, 1));
const GridGeneratorFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_gridgenerator_free(ptr, 1));
const LayoutSystemFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_layoutsystem_free(ptr, 1));
const NodeAnimationSystemFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_nodeanimationsystem_free(ptr, 1));
const ParticleSystemFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_particlesystem_free(ptr, 1));
const ScrambleSystemFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_scramblesystem_free(ptr, 1));

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('wasm_cortex_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
