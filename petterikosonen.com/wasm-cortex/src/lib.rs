mod particle_system;
mod burst_system;
mod layout;
mod edge_system;
mod camera_system;
mod scramble;
mod grid_generator;
mod node_animation;
mod spring_cursor;
mod particle_field_2d;

pub use particle_system::ParticleSystem;
pub use burst_system::BurstSystem;
pub use layout::LayoutSystem;
pub use edge_system::EdgeSystem;
pub use camera_system::CameraSystem;
pub use scramble::ScrambleSystem;
pub use grid_generator::GridGenerator;
pub use node_animation::NodeAnimationSystem;
pub use spring_cursor::SpringCursor;
pub use particle_field_2d::ParticleField2D;

use wasm_bindgen::prelude::*;

/// Exported allocator: JS calls this to allocate WASM memory for array transfer.
/// Returns a pointer (as usize) to the allocated block.
/// JS writes data via TypedArray view into wasm.memory.buffer at this offset.
#[wasm_bindgen]
pub fn wasm_alloc(size: usize) -> usize {
    let layout = std::alloc::Layout::from_size_align(size, 4).unwrap();
    unsafe { std::alloc::alloc(layout) as usize }
}

/// Exported deallocator: JS calls this to free WASM memory allocated by wasm_alloc.
#[wasm_bindgen]
pub fn wasm_free(ptr: usize, size: usize) {
    let layout = std::alloc::Layout::from_size_align(size, 4).unwrap();
    unsafe { std::alloc::dealloc(ptr as *mut u8, layout) }
}