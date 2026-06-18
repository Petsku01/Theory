/* tslint:disable */
/* eslint-disable */

export class BurstSystem {
    free(): void;
    [Symbol.dispose](): void;
    data_ptr(): number;
    has_spawned(): boolean;
    len(): number;
    constructor(count: number);
    set_color(r: number, g: number, b: number): void;
    set_origin(x: number, y: number, z: number): void;
    stride(): number;
    /**
     * Update all particles. Returns pointer to data buffer.
     * is_active: whether origin is set (node selected) or null (free drift).
     * delta: frame delta time in seconds.
     */
    update(is_active: boolean, delta: number): number;
}

export class CameraSystem {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Clear target (deselect). Stops lerping.
     */
    clear_target(): void;
    /**
     * Output data pointer
     */
    data_ptr(): number;
    /**
     * Whether the system has a target
     */
    has_target(): boolean;
    /**
     * Whether the system is currently lerping
     */
    is_lerping(): boolean;
    constructor();
    /**
     * Set the internal camera position and look-at target.
     * Used to sync WASM state with current Three.js camera on init.
     */
    set_position(cx: number, cy: number, cz: number, tx: number, ty: number, tz: number): void;
    /**
     * Set a new target. Resets lerp state.
     * tx/ty/tz: target position
     */
    set_target(tx: number, ty: number, tz: number): void;
    /**
     * Trigger a shake effect.
     * dir_x/y/z: normalized shake direction
     * current_time: performance.now() in seconds
     */
    trigger_shake(dir_x: number, dir_y: number, dir_z: number, current_time: number): void;
    /**
     * Per-frame update. Returns pointer to output buffer (6 f32s).
     * delta: frame delta time
     * current_time: performance.now() in seconds (for shake elapsed)
     * Returns [cam_x, cam_y, cam_z, target_x, target_y, target_z]
     */
    update(delta: number, current_time: number): number;
    /**
     * Mark that user took control (stops auto-lerp).
     */
    user_controlled(): void;
}

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
    free(): void;
    [Symbol.dispose](): void;
    cylinder_data_ptr(): number;
    cylinder_stride(): number;
    /**
     * Initialize edges from node positions and edge list.
     * from_positions: flat array [x0,y0,z0, x1,y1,z1, ...] for "from" nodes
     * to_positions: flat array [x0,y0,z0, x1,y1,z1, ...] for "to" nodes
     * edge_indices: indices into the position arrays (from_idx, to_idx pairs)
     * highlight_flags: 1 if this edge is highlighted (connects selected node), 0 otherwise
     * Returns pointer to cylinder data.
     */
    init_edges(from_positions: number, to_positions: number, edge_count: number, highlight_flags: number): number;
    is_highlighted(index: number): boolean;
    len(): number;
    constructor();
    pulse_data_ptr(): number;
    pulse_stride(): number;
    /**
     * Update highlight flags (called when selection changes).
     */
    update_highlights(flags: number): void;
    /**
     * Update pulse positions for all edges.
     * elapsed: current clock time
     * Returns pointer to pulse data (edge_count * 3 f32s).
     */
    update_pulses(from_positions: number, to_positions: number, elapsed: number): number;
}

/**
 * Grid texture generator: produces RGBA pixel data for a cyber grid.
 * Matches CyberGrid.tsx canvas drawing but generates pixels in WASM.
 * Output: flat Vec<u8> of size (width * height * 4) RGBA pixels.
 */
export class GridGenerator {
    free(): void;
    [Symbol.dispose](): void;
    data_ptr(): number;
    /**
     * Generate grid texture pixels.
     * size: width = height (e.g. 1024)
     * spacing: grid line spacing in pixels (e.g. 64)
     * line_color: [r, g, b, a] for grid lines (0-255)
     * bg_gradient_center: [r, g, b, a] at gradient center (transparent)
     * bg_gradient_edge: [r, g, b, a] at gradient edge (dark)
     * Returns pointer to RGBA pixel data (size * size * 4 bytes).
     */
    generate(size: number, spacing: number, line_r: number, line_g: number, line_b: number, line_a: number, edge_r: number, edge_g: number, edge_b: number, edge_a: number): number;
    height(): number;
    len(): number;
    constructor();
    width(): number;
}

/**
 * LayoutSystem computes Fibonacci spiral positions for cluster nodes.
 * Positions are stored in a flat Vec<f32> (count * 3).
 * JS reads via data_ptr() + Float32Array view into WASM memory.
 */
export class LayoutSystem {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Compute positions for a single cluster of nodes.
     * seeds: per-node seed values (from JS: node.id.length * 127 + i * 31)
     * Passed as raw pointer + length into WASM linear memory.
     * center_x/y/z: cluster center position
     * Returns pointer to flat positions array (count * 3 f32s).
     */
    compute_cluster(seeds_ptr: number, seeds_len: number, center_x: number, center_y: number, center_z: number): number;
    /**
     * Raw pointer to positions data
     */
    data_ptr(): number;
    /**
     * Number of nodes (positions.len() / 3)
     */
    len(): number;
    constructor();
}

export class NodeAnimationSystem {
    free(): void;
    [Symbol.dispose](): void;
    data_ptr(): number;
    /**
     * Initialize with node phases and tilt angles.
     * phases_ptr: per-node phase offset (count f32s)
     * tilts_ptr: per-node tilt angles (count * 5 f32s)
     * count: number of nodes
     */
    init(phases_ptr: number, tilts_ptr: number, count: number): void;
    len(): number;
    constructor();
    stride(): number;
    /**
     * Update all nodes. Returns pointer to output buffer (count * 16 f32s).
     * elapsed: clock elapsed time
     * delta: frame delta time
     * active_flags: per-node 0 (idle) or 1 (active/hovered/selected)
     */
    update(elapsed: number, delta: number, active_flags_ptr: number): number;
}

export class ParticleSystem {
    free(): void;
    [Symbol.dispose](): void;
    data_ptr(): number;
    len(): number;
    constructor(count: number, x_bound: number, y_bound: number, z_bound: number);
    stride(): number;
    /**
     * Update all particles. Returns pointer to position data (count * 3 f32s).
     * target_pos: [x, y, z] of attraction target, or empty for no attraction.
     */
    update(target_x: number, target_y: number, target_z: number, has_target: boolean): number;
}

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
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Output data pointer.
     */
    data_ptr(): number;
    /**
     * Initialize with target text (as char codes).
     * char_codes: pointer to u8 array, len: number of chars
     */
    init(char_codes_ptr: number, len: number): void;
    /**
     * Check if all characters are revealed.
     */
    is_complete(): boolean;
    /**
     * Number of characters in target text.
     */
    len(): number;
    constructor();
    /**
     * Reset scramble state (clear all revealed).
     */
    reset(): void;
    /**
     * Reveal one more character (left to right).
     */
    reveal_next(): void;
    /**
     * Get target char code at index.
     */
    target_char(index: number): number;
    /**
     * Generate one frame of scrambled text.
     * Returns pointer to output char codes (len u8s).
     * frame_counter: increments each call to produce different output per frame.
     */
    tick(): number;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_burstsystem_free: (a: number, b: number) => void;
    readonly burstsystem_data_ptr: (a: number) => number;
    readonly burstsystem_has_spawned: (a: number) => number;
    readonly burstsystem_len: (a: number) => number;
    readonly burstsystem_new: (a: number) => number;
    readonly burstsystem_set_color: (a: number, b: number, c: number, d: number) => void;
    readonly burstsystem_set_origin: (a: number, b: number, c: number, d: number) => void;
    readonly burstsystem_stride: (a: number) => number;
    readonly burstsystem_update: (a: number, b: number, c: number) => number;
    readonly __wbg_gridgenerator_free: (a: number, b: number) => void;
    readonly __wbg_scramblesystem_free: (a: number, b: number) => void;
    readonly gridgenerator_data_ptr: (a: number) => number;
    readonly gridgenerator_generate: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => number;
    readonly gridgenerator_height: (a: number) => number;
    readonly gridgenerator_len: (a: number) => number;
    readonly gridgenerator_new: () => number;
    readonly gridgenerator_width: (a: number) => number;
    readonly scramblesystem_data_ptr: (a: number) => number;
    readonly scramblesystem_init: (a: number, b: number, c: number) => void;
    readonly scramblesystem_is_complete: (a: number) => number;
    readonly scramblesystem_new: () => number;
    readonly scramblesystem_reset: (a: number) => void;
    readonly scramblesystem_reveal_next: (a: number) => void;
    readonly scramblesystem_target_char: (a: number, b: number) => number;
    readonly scramblesystem_tick: (a: number) => number;
    readonly scramblesystem_len: (a: number) => number;
    readonly __wbg_camerasystem_free: (a: number, b: number) => void;
    readonly camerasystem_clear_target: (a: number) => void;
    readonly camerasystem_data_ptr: (a: number) => number;
    readonly camerasystem_has_target: (a: number) => number;
    readonly camerasystem_is_lerping: (a: number) => number;
    readonly camerasystem_new: () => number;
    readonly camerasystem_set_position: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly camerasystem_set_target: (a: number, b: number, c: number, d: number) => void;
    readonly camerasystem_trigger_shake: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly camerasystem_update: (a: number, b: number, c: number) => number;
    readonly camerasystem_user_controlled: (a: number) => void;
    readonly __wbg_layoutsystem_free: (a: number, b: number) => void;
    readonly layoutsystem_compute_cluster: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly layoutsystem_data_ptr: (a: number) => number;
    readonly layoutsystem_len: (a: number) => number;
    readonly layoutsystem_new: () => number;
    readonly __wbg_nodeanimationsystem_free: (a: number, b: number) => void;
    readonly nodeanimationsystem_data_ptr: (a: number) => number;
    readonly nodeanimationsystem_init: (a: number, b: number, c: number, d: number) => void;
    readonly nodeanimationsystem_len: (a: number) => number;
    readonly nodeanimationsystem_new: () => number;
    readonly nodeanimationsystem_stride: (a: number) => number;
    readonly nodeanimationsystem_update: (a: number, b: number, c: number, d: number) => number;
    readonly __wbg_particlesystem_free: (a: number, b: number) => void;
    readonly particlesystem_data_ptr: (a: number) => number;
    readonly particlesystem_len: (a: number) => number;
    readonly particlesystem_new: (a: number, b: number, c: number, d: number) => number;
    readonly particlesystem_stride: (a: number) => number;
    readonly particlesystem_update: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly __wbg_edgesystem_free: (a: number, b: number) => void;
    readonly edgesystem_cylinder_data_ptr: (a: number) => number;
    readonly edgesystem_cylinder_stride: (a: number) => number;
    readonly edgesystem_init_edges: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly edgesystem_is_highlighted: (a: number, b: number) => number;
    readonly edgesystem_len: (a: number) => number;
    readonly edgesystem_new: () => number;
    readonly edgesystem_pulse_data_ptr: (a: number) => number;
    readonly edgesystem_pulse_stride: (a: number) => number;
    readonly edgesystem_update_highlights: (a: number, b: number) => void;
    readonly edgesystem_update_pulses: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
