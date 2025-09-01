/*!
 * Compression System (ENCS) v5.1.0
 * Pain // do not use wihtout testing
 */

/*
[package]
name = "encs"
version = "5.0.0"
edition = "2021"
license = "MIT OR Apache-2.0"
authors = ["ENCS Team"]
description = "Enterprise Neural Compression System - Enhanced"

[dependencies]
# Core compression - exact working versions
zstd = "0.13.0"
flate2 = "1.0.28"
lz4_flex = "0.11.1"
brotli = "3.4.0"
snap = "1.1.0"

# Crypto and hashing
blake3 = "1.5.0"
sha2 = "0.10.8"
crc32fast = "1.3.2"

# Serialization
serde = { version = "1.0.193", features = ["derive"] }
serde_json = "1.0.108"
bincode = "1.3.3"
toml = "0.8.8"

# Async runtime
tokio = { version = "1.35.0", features = ["rt-multi-thread", "macros", "fs", "io-util", "sync"] }
futures = "0.3.30"

# Parallel processing
rayon = "1.8.0"

# Thread-safe collections
parking_lot = "0.12.1"
dashmap = "5.5.3"

# Progress and UI
indicatif = { version = "0.17.7", features = ["rayon"] }
clap = { version = "4.4.11", features = ["derive"] }
dialoguer = "0.11.0"

# Error handling
thiserror = "1.0.50"
anyhow = "1.0.76"
color-eyre = "0.6.2"

# Logging
log = "0.4.20"
env_logger = "0.10.1"

# System info
sysinfo = "0.29.11"
num_cpus = "1.16.0"
infer = "0.15.0"
dirs = "5.0.1"

# Testing
tempfile = "3.8.1"

[profile.release]
opt-level = 3
lto = true

[profile.dev]
opt-level = 1
debug = true
*/

// Comprehensive imports
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{self, Read, Write, BufReader, BufWriter, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::{Arc, atomic::{AtomicU32, AtomicU64, AtomicUsize, Ordering}};
use std::time::{Instant, SystemTime, Duration};
use std::fmt;
use std::hash::{Hash, Hasher, DefaultHasher};

// Async I/O
use tokio::fs::File as AsyncFile;
use tokio::io::{AsyncRead, AsyncWrite, AsyncReadExt, AsyncWriteExt, BufWriter as AsyncBufWriter};
use tokio::sync::{mpsc, Mutex as AsyncMutex};
use futures::stream::{Stream, StreamExt};

// Parallel processing
use rayon::prelude::*;

// Serialization
use serde::{Serialize, Deserialize};

// Crypto and hashing
use blake3::Hasher as Blake3Hasher;
use sha2::{Sha256, Digest};
use crc32fast::Hasher as Crc32Hasher;

// Thread-safe structures
use parking_lot::RwLock;
use dashmap::DashMap;

// Progress tracking
use indicatif::{ProgressBar, ProgressStyle, MultiProgress};

// Error handling
use thiserror::Error;
use anyhow::{Result, anyhow, Context};

// Logging
use log::{info, warn, error, debug};

// System info
use sysinfo::{System, SystemExt, CpuExt};
use num_cpus;

// File detection
use infer;

// CLI
use clap::{Parser, Subcommand, ValueEnum};
use dialoguer::Confirm;

// ================================================================================================
// CONSTANTS
// ================================================================================================

const MAGIC_BYTES: &[u8] = b"ENCS";
const VERSION: u32 = 5;

const CHUNK_SIZE_SMALL: usize = 1024 * 1024;          // 1MB
const CHUNK_SIZE_MEDIUM: usize = 4 * 1024 * 1024;     // 4MB  
const CHUNK_SIZE_LARGE: usize = 16 * 1024 * 1024;     // 16MB

const SMALL_FILE_THRESHOLD: u64 = 16 * 1024 * 1024;   // 16MB
const LARGE_FILE_THRESHOLD: u64 = 1024 * 1024 * 1024; // 1GB

const DETECTION_SAMPLE_SIZE: usize = 64 * 1024;       // 64KB
const MAX_MEMORY_PER_THREAD: usize = 64 * 1024 * 1024; // 64MB limit

// ================================================================================================
// ENHANCED ERROR HANDLING
// ================================================================================================

#[derive(Error, Debug)]
pub enum CompressionError {
    #[error("Failed to read file '{path}': {source}")]
    FileRead { 
        path: PathBuf, 
        #[source] 
        source: std::io::Error 
    },
    
    #[error("Failed to write file '{path}': {source}")]
    FileWrite { 
        path: PathBuf, 
        #[source] 
        source: std::io::Error 
    },
    
    #[error("Compression failed for chunk {chunk_id} using {algorithm}: {message}")]
    ChunkCompression { 
        chunk_id: u32,
        algorithm: String,
        message: String,
    },
    
    #[error("Decompression failed: {message}")]
    Decompression { message: String },
    
    #[error("Invalid file format: {message}")]
    InvalidFormat { message: String },
    
    #[error("Configuration error: {message}")]
    Configuration { message: String },
    
    #[error("Memory limit exceeded: requested {requested} bytes, limit is {limit} bytes")]
    MemoryLimit { requested: usize, limit: usize },
    
    #[error("Feature unavailable: {feature}")]
    FeatureUnavailable { feature: String },
    
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Serialization error: {0}")]
    Serialization(#[from] bincode::Error),
}

pub type CompressionResult<T> = Result<T, CompressionError>;

// ================================================================================================
// DATA STRUCTURES
// ================================================================================================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Hash)]
pub enum CompressionAlgorithm {
    Store,
    Zstd { level: i32 },
    Lz4 { high_compression: bool },
    Snappy,
    Brotli { quality: u32 },
    Deflate { level: u32 },
}

impl CompressionAlgorithm {
    pub fn name(&self) -> &str {
        match self {
            Self::Store => "store",
            Self::Zstd { .. } => "zstd",
            Self::Lz4 { .. } => "lz4",
            Self::Snappy => "snappy",
            Self::Brotli { .. } => "brotli",
            Self::Deflate { .. } => "deflate",
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum OptimizationTarget {
    Speed,
    Ratio,
    Memory,
    Balanced,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionMetrics {
    pub compression_time_ms: u64,
    pub decompression_time_ms: Option<u64>,
    pub compression_ratio: f64,
    pub compression_speed_mbps: f64,
    pub decompression_speed_mbps: Option<f64>,
    pub original_size: u64,
    pub compressed_size: u64,
    pub chunk_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentAnalysis {
    pub entropy: f64,
    pub file_type: DetectedFileType,
    pub type_confidence: f64,
    pub compressibility_score: f64,
    pub contains_executable: bool,
    pub text_ratio: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Hash)]
pub enum DetectedFileType {
    Text,
    Binary,
    Image,
    Archive,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub format_version: u32,
    pub created_at: SystemTime,
    pub algorithm: CompressionAlgorithm,
    pub metrics: CompressionMetrics,
    pub analysis: ContentAnalysis,
    pub file_hash: FileHash,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileHash {
    pub sha256: [u8; 32],
    pub blake3: [u8; 32],
    pub crc32: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchmarkResult {
    pub algorithm: CompressionAlgorithm,
    pub compression_ratio: f64,
    pub compression_speed_mbps: f64,
    pub decompression_speed_mbps: f64,
    pub compressed_size: usize,
}

// ================================================================================================
// COMPRESSION OPTIONS WITH BUILDER PATTERN
// ================================================================================================

#[derive(Debug, Clone)]
pub struct CompressionOptions {
    pub algorithm: Option<CompressionAlgorithm>,
    pub optimization_target: OptimizationTarget,
    pub chunk_size: usize,
    pub thread_count: Option<usize>,
    pub verify: bool,
    pub streaming: bool,
}

impl Default for CompressionOptions {
    fn default() -> Self {
        Self {
            algorithm: None,
            optimization_target: OptimizationTarget::Balanced,
            chunk_size: CHUNK_SIZE_MEDIUM,
            thread_count: None,
            verify: false,
            streaming: false,
        }
    }
}

impl CompressionOptions {
    pub fn builder() -> CompressionOptionsBuilder {
        CompressionOptionsBuilder::default()
    }
}

#[derive(Default)]
pub struct CompressionOptionsBuilder {
    algorithm: Option<CompressionAlgorithm>,
    optimization_target: Option<OptimizationTarget>,
    chunk_size: Option<usize>,
    thread_count: Option<usize>,
    verify: Option<bool>,
    streaming: Option<bool>,
}

impl CompressionOptionsBuilder {
    pub fn algorithm(mut self, algorithm: CompressionAlgorithm) -> Self {
        self.algorithm = Some(algorithm);
        self
    }
    
    pub fn optimize_for(mut self, target: OptimizationTarget) -> Self {
        self.optimization_target = Some(target);
        self
    }
    
    pub fn chunk_size(mut self, size: usize) -> Self {
        self.chunk_size = Some(size);
        self
    }
    
    pub fn threads(mut self, count: usize) -> Self {
        self.thread_count = Some(count);
        self
    }
    
    pub fn verify(mut self, verify: bool) -> Self {
        self.verify = Some(verify);
        self
    }
    
    pub fn streaming(mut self, streaming: bool) -> Self {
        self.streaming = Some(streaming);
        self
    }
    
    pub fn build(self) -> CompressionOptions {
        CompressionOptions {
            algorithm: self.algorithm,
            optimization_target: self.optimization_target.unwrap_or(OptimizationTarget::Balanced),
            chunk_size: self.chunk_size.unwrap_or(CHUNK_SIZE_MEDIUM),
            thread_count: self.thread_count,
            verify: self.verify.unwrap_or(false),
            streaming: self.streaming.unwrap_or(false),
        }
    }
}

// ================================================================================================
// STREAMING COMPRESSION SUPPORT
// ================================================================================================

pub struct StreamingCompressor {
    writer: AsyncMutex<Box<dyn AsyncWrite + Unpin + Send>>,
    algorithm: CompressionAlgorithm,
    chunk_id: AtomicU32,
    bytes_processed: AtomicU64,
    bytes_written: AtomicU64,
}

impl StreamingCompressor {
    pub fn new<W: AsyncWrite + Unpin + Send + 'static>(
        writer: W,
        algorithm: CompressionAlgorithm,
    ) -> Self {
        Self {
            writer: AsyncMutex::new(Box::new(writer)),
            algorithm,
            chunk_id: AtomicU32::new(0),
            bytes_processed: AtomicU64::new(0),
            bytes_written: AtomicU64::new(0),
        }
    }
    
    pub async fn write_chunk(&self, data: &[u8]) -> CompressionResult<()> {
        let chunk_id = self.chunk_id.fetch_add(1, Ordering::SeqCst);
        let compressed = tokio::task::spawn_blocking({
            let data = data.to_vec();
            let algorithm = self.algorithm.clone();
            move || CompressionEngine::compress_chunk(&data, &algorithm, chunk_id)
        }).await
        .map_err(|e| CompressionError::Configuration { 
            message: format!("Task error: {}", e) 
        })??;
        
        let mut writer = self.writer.lock().await;
        writer.write_all(&(compressed.len() as u32).to_le_bytes()).await?;
        writer.write_all(&compressed).await?;
        
        self.bytes_processed.fetch_add(data.len() as u64, Ordering::Relaxed);
        self.bytes_written.fetch_add(compressed.len() as u64, Ordering::Relaxed);
        
        Ok(())
    }
    
    pub async fn finish(self) -> CompressionResult<CompressionMetrics> {
        let mut writer = self.writer.lock().await;
        writer.flush().await?;
        
        Ok(CompressionMetrics {
            compression_time_ms: 0, // Would need timing
            decompression_time_ms: None,
            compression_ratio: self.bytes_processed.load(Ordering::Relaxed) as f64 
                / self.bytes_written.load(Ordering::Relaxed).max(1) as f64,
            compression_speed_mbps: 0.0, // Would need timing
            decompression_speed_mbps: None,
            original_size: self.bytes_processed.load(Ordering::Relaxed),
            compressed_size: self.bytes_written.load(Ordering::Relaxed),
            chunk_count: self.chunk_id.load(Ordering::Relaxed),
        })
    }
}

// ================================================================================================
// COMPRESSION ENGINE - Enhanced with decompression and streaming
// ================================================================================================

pub struct CompressionEngine {
    config: Arc<RwLock<EngineConfig>>,
    progress_manager: Arc<MultiProgress>,
    content_cache: Arc<DashMap<u64, ContentAnalysis>>,
    processing_stats: Arc<AtomicU64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineConfig {
    pub max_threads: usize,
    pub memory_limit: u64,
    pub optimization_target: OptimizationTarget,
    pub auto_detect: bool,
}

impl Default for EngineConfig {
    fn default() -> Self {
        Self {
            max_threads: num_cpus::get().min(8),
            memory_limit: 2 * 1024 * 1024 * 1024, // 2GB
            optimization_target: OptimizationTarget::Balanced,
            auto_detect: true,
        }
    }
}

impl EngineConfig {
    pub fn load() -> Result<Self> {
        let config_path = dirs::config_dir()
            .ok_or_else(|| anyhow!("Cannot find config directory"))?
            .join("encs")
            .join("config.toml");
        
        if config_path.exists() {
            let contents = fs::read_to_string(config_path)?;
            Ok(toml::from_str(&contents)?)
        } else {
            Ok(Self::default())
        }
    }
    
    pub fn save(&self) -> Result<()> {
        let config_dir = dirs::config_dir()
            .ok_or_else(|| anyhow!("Cannot find config directory"))?
            .join("encs");
        
        fs::create_dir_all(&config_dir)?;
        let config_path = config_dir.join("config.toml");
        let contents = toml::to_string_pretty(self)?;
        fs::write(config_path, contents)?;
        Ok(())
    }
}

impl CompressionEngine {
    pub fn new() -> CompressionResult<Self> {
        Self::with_config(EngineConfig::default())
    }
    
    pub fn with_config(config: EngineConfig) -> CompressionResult<Self> {
        Ok(Self {
            config: Arc::new(RwLock::new(config)),
            progress_manager: Arc::new(MultiProgress::new()),
            content_cache: Arc::new(DashMap::new()),
            processing_stats: Arc::new(AtomicU64::new(0)),
        })
    }
    
    // Unified compress_file that detects async context
    pub fn compress_file<P: AsRef<Path>>(
        &self,
        input_path: P,
        output_path: P,
        options: CompressionOptions,
    ) -> CompressionResult<FileMetadata> {
        match tokio::runtime::Handle::try_current() {
            Ok(handle) => {
                // We're already in async context
                handle.block_on(self.compress_file_async(input_path, output_path, options))
            }
            Err(_) => {
                // Create runtime only if not in async context
                let rt = tokio::runtime::Runtime::new()
                    .map_err(|e| CompressionError::Configuration { 
                        message: format!("Failed to create runtime: {}", e) 
                    })?;
                rt.block_on(self.compress_file_async(input_path, output_path, options))
            }
        }
    }
    
    pub async fn compress_file_async<P: AsRef<Path>>(
        &self,
        input_path: P,
        output_path: P,
        options: CompressionOptions,
    ) -> CompressionResult<FileMetadata> {
        let start_time = Instant::now();
        let input_path = input_path.as_ref();
        let output_path = output_path.as_ref();
        
        info!("Starting compression: {} -> {}", input_path.display(), output_path.display());
        
        // Validate inputs
        self.validate_inputs(input_path, output_path).await?;
        
        // Get file info
        let file_info = self.get_file_info(input_path).await?;
        
        // Check memory requirements
        self.check_memory_requirements(&file_info, &options)?;
        
        // Analyze content
        let analysis = self.analyze_content(&file_info).await?;
        
        // Select algorithm
        let algorithm = self.select_algorithm(&analysis, &options)?;
        
        // Create progress tracking
        let progress_bar = self.create_progress_bar(
            file_info.size,
            &format!("Compressing with {}", algorithm.name())
        )?;
        
        // Perform compression
        let compression_result = if options.streaming && file_info.size > LARGE_FILE_THRESHOLD {
            self.compress_streaming(&file_info, output_path, &algorithm, &progress_bar).await?
        } else {
            self.compress_internal(&file_info, output_path, &algorithm, &progress_bar).await?
        };
        
        progress_bar.finish_with_message("Compression complete");
        
        // Verify if requested
        if options.verify {
            self.verify_compression(output_path, &file_info).await?;
        }
        
        // Create metadata
        let metadata = self.create_metadata(
            &file_info,
            &compression_result,
            &analysis,
            &algorithm,
            start_time.elapsed(),
        ).await?;
        
        info!("Compression completed successfully");
        Ok(metadata)
    }
    
    // NEW: Decompression support
    pub async fn decompress_file<P: AsRef<Path>>(
        &self,
        input_path: P,
        output_path: P,
    ) -> CompressionResult<()> {
        let input_path = input_path.as_ref();
        let output_path = output_path.as_ref();
        
        info!("Starting decompression: {} -> {}", input_path.display(), output_path.display());
        
        let mut reader = AsyncFile::open(input_path).await
            .map_err(|e| CompressionError::FileRead { 
                path: input_path.to_path_buf(), 
                source: e 
            })?;
        
        // Read and validate header
        let header = self.read_header(&mut reader).await?;
        
        // Create output file
        let mut writer = AsyncFile::create(output_path).await
            .map_err(|e| CompressionError::FileWrite { 
                path: output_path.to_path_buf(), 
                source: e 
            })?;
        
        // Read chunk count
        let mut chunk_count_bytes = [0u8; 4];
        reader.read_exact(&mut chunk_count_bytes).await?;
        let chunk_count = u32::from_le_bytes(chunk_count_bytes);
        
        let progress_bar = self.create_progress_bar(chunk_count as u64, "Decompressing")?;
        
        // Decompress chunks
        for _ in 0..chunk_count {
            let chunk = self.read_compressed_chunk(&mut reader).await?;
            let decompressed = self.decompress_chunk(&chunk, &header.algorithm)?;
            writer.write_all(&decompressed).await?;
            progress_bar.inc(1);
        }
        
        writer.flush().await?;
        progress_bar.finish_with_message("Decompression complete");
        
        info!("Decompression completed successfully");
        Ok(())
    }
    
    // NEW: Benchmarking support
    pub async fn benchmark_algorithms(&self, data: &[u8]) -> Vec<BenchmarkResult> {
        let algorithms = vec![
            CompressionAlgorithm::Lz4 { high_compression: false },
            CompressionAlgorithm::Lz4 { high_compression: true },
            CompressionAlgorithm::Zstd { level: 3 },
            CompressionAlgorithm::Zstd { level: 9 },
            CompressionAlgorithm::Snappy,
            CompressionAlgorithm::Brotli { quality: 4 },
            CompressionAlgorithm::Deflate { level: 6 },
        ];
        
        let mut results = Vec::new();
        
        for algorithm in algorithms {
            let comp_start = Instant::now();
            let compressed = match Self::compress_chunk(data, &algorithm, 0) {
                Ok(c) => c,
                Err(_) => continue,
            };
            let comp_time = comp_start.elapsed();
            
            let decomp_start = Instant::now();
            if let Ok(_) = self.decompress_chunk(&compressed, &algorithm) {
                let decomp_time = decomp_start.elapsed();
                
                results.push(BenchmarkResult {
                    algorithm: algorithm.clone(),
                    compression_ratio: data.len() as f64 / compressed.len() as f64,
                    compression_speed_mbps: (data.len() as f64 / (1024.0 * 1024.0)) 
                        / comp_time.as_secs_f64(),
                    decompression_speed_mbps: (data.len() as f64 / (1024.0 * 1024.0)) 
                        / decomp_time.as_secs_f64(),
                    compressed_size: compressed.len(),
                });
            }
        }
        
        results.sort_by(|a, b| b.compression_ratio.partial_cmp(&a.compression_ratio).unwrap());
        results
    }
    
    // ===========================================================================================
    // PRIVATE METHODS - Enhanced
    // ===========================================================================================
    
    async fn validate_inputs(&self, input_path: &Path, output_path: &Path) -> CompressionResult<()> {
        if !input_path.exists() {
            return Err(CompressionError::FileRead { 
                path: input_path.to_path_buf(),
                source: io::Error::new(io::ErrorKind::NotFound, "File not found"),
            });
        }
        
        if let Some(parent) = output_path.parent() {
            if !parent.exists() {
                tokio::fs::create_dir_all(parent).await
                    .map_err(|e| CompressionError::FileWrite { 
                        path: parent.to_path_buf(),
                        source: e,
                    })?;
            }
        }
        
        let metadata = tokio::fs::metadata(input_path).await
            .map_err(|e| CompressionError::FileRead { 
                path: input_path.to_path_buf(),
                source: e,
            })?;
        
        if !metadata.is_file() {
            return Err(CompressionError::Configuration { 
                message: format!("{} is not a regular file", input_path.display())
            });
        }
        
        if metadata.len() == 0 {
            return Err(CompressionError::Configuration { 
                message: "Cannot compress empty file".to_string() 
            });
        }
        
        Ok(())
    }
    
    async fn get_file_info(&self, path: &Path) -> CompressionResult<FileInfo> {
        let metadata = tokio::fs::metadata(path).await
            .map_err(|e| CompressionError::FileRead { 
                path: path.to_path_buf(),
                source: e,
            })?;
        
        Ok(FileInfo {
            path: path.to_path_buf(),
            size: metadata.len(),
            modified: metadata.modified().ok(),
        })
    }
    
    fn check_memory_requirements(&self, file_info: &FileInfo, options: &CompressionOptions) -> CompressionResult<()> {
        let config = self.config.read();
        
        let chunk_size = options.chunk_size.min(CHUNK_SIZE_LARGE);
        let thread_count = options.thread_count.unwrap_or(config.max_threads);
        let estimated_memory = chunk_size * thread_count * 3; // Input + output + working
        
        if estimated_memory > config.memory_limit as usize {
            return Err(CompressionError::MemoryLimit { 
                requested: estimated_memory,
                limit: config.memory_limit as usize,
            });
        }
        
        if chunk_size > MAX_MEMORY_PER_THREAD {
            return Err(CompressionError::MemoryLimit { 
                requested: chunk_size,
                limit: MAX_MEMORY_PER_THREAD,
            });
        }
        
        Ok(())
    }
    
    async fn compress_streaming(
        &self,
        file_info: &FileInfo,
        output_path: &Path,
        algorithm: &CompressionAlgorithm,
        progress_bar: &ProgressBar,
    ) -> CompressionResult<InternalCompressionResult> {
        let chunk_size = self.determine_chunk_size(file_info.size);
        let output_file = AsyncFile::create(output_path).await?;
        let mut writer = AsyncBufWriter::new(output_file);
        
        // Write header
        self.write_header(&mut writer, algorithm).await?;
        
        // Create streaming compressor
        let (tx, mut rx) = mpsc::channel::<Vec<u8>>(4);
        let algorithm_clone = algorithm.clone();
        
        // Compression task
        let compress_task = tokio::spawn(async move {
            let mut compressed_chunks = Vec::new();
            let mut chunk_id = 0u32;
            
            while let Some(chunk_data) = rx.recv().await {
                let algorithm = algorithm_clone.clone();
                let compressed = tokio::task::spawn_blocking(move || {
                    CompressionEngine::compress_chunk(&chunk_data, &algorithm, chunk_id)
                }).await
                .map_err(|e| CompressionError::Configuration { 
                    message: format!("Task join error: {}", e) 
                })??;
                
                compressed_chunks.push(compressed);
                chunk_id += 1;
            }
            
            Ok::<Vec<Vec<u8>>, CompressionError>(compressed_chunks)
        });
        
        // Read and send chunks
        let mut file = AsyncFile::open(&file_info.path).await?;
        let mut total_read = 0u64;
        
        loop {
            let mut buffer = vec![0u8; chunk_size];
            let bytes_read = file.read(&mut buffer).await?;
            if bytes_read == 0 { break; }
            
            buffer.truncate(bytes_read);
            total_read += bytes_read as u64;
            tx.send(buffer).await.map_err(|_| CompressionError::Configuration { 
                message: "Channel send failed".to_string() 
            })?;
            
            progress_bar.set_position(total_read);
        }
        
        drop(tx); // Signal completion
        
        // Get compressed chunks
        let compressed_chunks = compress_task.await
            .map_err(|e| CompressionError::Configuration { 
                message: format!("Task join error: {}", e) 
            })??;
        
        // Write chunks
        let total_size = self.write_chunks(&mut writer, &compressed_chunks).await?;
        writer.flush().await?;
        
        Ok(InternalCompressionResult {
            original_size: file_info.size,
            compressed_size: total_size,
            chunk_count: compressed_chunks.len() as u32,
        })
    }
    
    async fn compress_internal(
        &self,
        file_info: &FileInfo,
        output_path: &Path,
        algorithm: &CompressionAlgorithm,
        progress_bar: &ProgressBar,
    ) -> CompressionResult<InternalCompressionResult> {
        let chunk_size = self.determine_chunk_size(file_info.size);
        
        let output_file = AsyncFile::create(output_path).await
            .map_err(|e| CompressionError::FileWrite { 
                path: output_path.to_path_buf(),
                source: e 
            })?;
        let mut writer = AsyncBufWriter::new(output_file);
        
        self.write_header(&mut writer, algorithm).await?;
        
        let chunks_result = self.compress_chunks_async(
            &file_info.path,
            chunk_size,
            algorithm,
            progress_bar
        ).await?;
        
        let total_size = self.write_chunks(&mut writer, &chunks_result.chunks).await?;
        writer.flush().await?;
        
        Ok(InternalCompressionResult {
            original_size: file_info.size,
            compressed_size: total_size,
            chunk_count: chunks_result.chunks.len() as u32,
        })
    }
    
    async fn compress_chunks_async(
        &self,
        file_path: &Path,
        chunk_size: usize,
        algorithm: &CompressionAlgorithm,
        progress_bar: &ProgressBar,
    ) -> CompressionResult<ChunkedResult> {
        let mut file = AsyncFile::open(file_path).await
            .map_err(|e| CompressionError::FileRead { 
                path: file_path.to_path_buf(),
                source: e 
            })?;
        
        let mut chunks = Vec::new();
        let mut chunk_id = 0u32;
        
        loop {
            let mut buffer = vec![0u8; chunk_size];
            let bytes_read = file.read(&mut buffer).await?;
            if bytes_read == 0 { break; }
            
            buffer.truncate(bytes_read);
            
            // Compress in blocking task to avoid blocking async runtime
            let algorithm = algorithm.clone();
            let compressed = tokio::task::spawn_blocking(move || {
                CompressionEngine::compress_chunk(&buffer, &algorithm, chunk_id)
            }).await
            .map_err(|e| CompressionError::Configuration { 
                message: format!("Task error: {}", e) 
            })??;
            
            chunks.push(compressed);
            chunk_id += 1;
            progress_bar.inc(1);
        }
        
        Ok(ChunkedResult { chunks })
    }
    
    fn compress_chunk(data: &[u8], algorithm: &CompressionAlgorithm, chunk_id: u32) -> CompressionResult<Vec<u8>> {
        if data.is_empty() {
            return Ok(Vec::new());
        }
        
        let compressed = match algorithm {
            CompressionAlgorithm::Store => data.to_vec(),
            
            CompressionAlgorithm::Zstd { level } => {
                zstd::bulk::compress(data, *level)
                    .map_err(|e| CompressionError::ChunkCompression { 
                        chunk_id,
                        algorithm: "zstd".to_string(), 
                        message: e.to_string() 
                    })?
            },
            
            CompressionAlgorithm::Lz4 { .. } => {
                lz4_flex::compress_prepend_size(data)
            },
            
            CompressionAlgorithm::Snappy => {
                snap::raw::Encoder::new().compress_vec(data)
                    .map_err(|e| CompressionError::ChunkCompression { 
                        chunk_id,
                        algorithm: "snappy".to_string(), 
                        message: e.to_string() 
                    })?
            },
            
            CompressionAlgorithm::Brotli { quality } => {
                let mut output = Vec::new();
                {
                    let mut encoder = brotli::CompressorWriter::new(&mut output, 4096, *quality, 22);
                    encoder.write_all(data)
                        .map_err(|e| CompressionError::ChunkCompression { 
                            chunk_id,
                            algorithm: "brotli".to_string(), 
                            message: e.to_string() 
                        })?;
                }
                output
            },
            
            CompressionAlgorithm::Deflate { level } => {
                let mut encoder = flate2::write::DeflateEncoder::new(
                    Vec::new(), 
                    flate2::Compression::new(*level)
                );
                encoder.write_all(data)
                    .map_err(|e| CompressionError::ChunkCompression { 
                        chunk_id,
                        algorithm: "deflate".to_string(), 
                        message: e.to_string() 
                    })?;
                encoder.finish()
                    .map_err(|e| CompressionError::ChunkCompression { 
                        chunk_id,
                        algorithm: "deflate".to_string(), 
                        message: e.to_string() 
                    })?
            },
        };
        
        // Create chunk with metadata
        let mut result = Vec::new();
        result.extend_from_slice(&(data.len() as u32).to_le_bytes());
        result.extend_from_slice(&(compressed.len() as u32).to_le_bytes());
        
        // Add CRC32 checksum
        let mut crc_hasher = Crc32Hasher::new();
        crc_hasher.update(data);
        let crc32 = crc_hasher.finalize();
        result.extend_from_slice(&crc32.to_le_bytes());
        
        result.extend_from_slice(&compressed);
        
        Ok(result)
    }
    
    fn decompress_chunk(&self, chunk_data: &[u8], algorithm: &CompressionAlgorithm) -> CompressionResult<Vec<u8>> {
        if chunk_data.len() < 12 {
            return Err(CompressionError::InvalidFormat { 
                message: "Chunk too small".to_string() 
            });
        }
        
        let original_size = u32::from_le_bytes([chunk_data[0], chunk_data[1], chunk_data[2], chunk_data[3]]) as usize;
        let compressed_size = u32::from_le_bytes([chunk_data[4], chunk_data[5], chunk_data[6], chunk_data[7]]) as usize;
        let stored_crc = u32::from_le_bytes([chunk_data[8], chunk_data[9], chunk_data[10], chunk_data[11]]);
        
        let compressed_data = &chunk_data[12..];
        
        if compressed_data.len() != compressed_size {
            return Err(CompressionError::InvalidFormat { 
                message: "Compressed size mismatch".to_string() 
            });
        }
        
        let decompressed = match algorithm {
            CompressionAlgorithm::Store => compressed_data.to_vec(),
            
            CompressionAlgorithm::Zstd { .. } => {
                zstd::bulk::decompress(compressed_data, original_size)
                    .map_err(|e| CompressionError::Decompression { 
                        message: format!("Zstd decompression failed: {}", e)
                    })?
            },
            
            CompressionAlgorithm::Lz4 { .. } => {
                lz4_flex::decompress_size_prepended(compressed_data)
                    .map_err(|e| CompressionError::Decompression { 
                        message: format!("LZ4 decompression failed: {}", e)
                    })?
            },
            
            CompressionAlgorithm::Snappy => {
                snap::raw::Decoder::new().decompress_vec(compressed_data)
                    .map_err(|e| CompressionError::Decompression { 
                        message: format!("Snappy decompression failed: {}", e)
                    })?
            },
            
            CompressionAlgorithm::Brotli { .. } => {
                let mut decompressed = Vec::new();
                let mut decoder = brotli::Decompressor::new(compressed_data, 4096);
                decoder.read_to_end(&mut decompressed)
                    .map_err(|e| CompressionError::Decompression { 
                        message: format!("Brotli decompression failed: {}", e)
                    })?;
                decompressed
            },
            
            CompressionAlgorithm::Deflate { .. } => {
                let mut decoder = flate2::read::DeflateDecoder::new(compressed_data);
                let mut decompressed = Vec::new();
                decoder.read_to_end(&mut decompressed)
                    .map_err(|e| CompressionError::Decompression { 
                        message: format!("Deflate decompression failed: {}", e)
                    })?;
                decompressed
            },
        };
        
        // Verify CRC
        let mut crc_hasher = Crc32Hasher::new();
        crc_hasher.update(&decompressed);
        let calculated_crc = crc_hasher.finalize();
        
        if calculated_crc != stored_crc {
            return Err(CompressionError::InvalidFormat { 
                message: "CRC mismatch".to_string() 
            });
        }
        
        Ok(decompressed)
    }
    
    async fn read_header<R: AsyncRead + Unpin>(&self, reader: &mut R) -> CompressionResult<FileHeader> {
        let mut magic = [0u8; 4];
        reader.read_exact(&mut magic).await?;
        
        if magic != MAGIC_BYTES {
            return Err(CompressionError::InvalidFormat { 
                message: "Invalid file format".to_string() 
            });
        }
        
        let mut version_bytes = [0u8; 4];
        reader.read_exact(&mut version_bytes).await?;
        let version = u32::from_le_bytes(version_bytes);
        
        if version != VERSION {
            return Err(CompressionError::InvalidFormat { 
                message: format!("Unsupported version: {}", version)
            });
        }
        
        let mut algo_len_bytes = [0u8; 4];
        reader.read_exact(&mut algo_len_bytes).await?;
        let algo_len = u32::from_le_bytes(algo_len_bytes) as usize;
        
        let mut algo_data = vec![0u8; algo_len];
        reader.read_exact(&mut algo_data).await?;
        
        let algorithm: CompressionAlgorithm = bincode::deserialize(&algo_data)?;
        
        Ok(FileHeader { version, algorithm })
    }
    
    async fn read_compressed_chunk<R: AsyncRead + Unpin>(&self, reader: &mut R) -> CompressionResult<Vec<u8>> {
        let mut chunk_len_bytes = [0u8; 4];
        reader.read_exact(&mut chunk_len_bytes).await?;
        let chunk_len = u32::from_le_bytes(chunk_len_bytes) as usize;
        
        let mut chunk_data = vec![0u8; chunk_len];
        reader.read_exact(&mut chunk_data).await?;
        
        Ok(chunk_data)
    }
    
    async fn verify_compression(&self, compressed_path: &Path, original_info: &FileInfo) -> CompressionResult<()> {
        // Basic verification - check file exists and is smaller
        let compressed_metadata = tokio::fs::metadata(compressed_path).await
            .map_err(|e| CompressionError::FileRead { 
                path: compressed_path.to_path_buf(),
                source: e 
            })?;
        
        info!("Verification: Original size: {}, Compressed size: {}", 
            original_info.size, compressed_metadata.len());
        
        if compressed_metadata.len() >= original_info.size {
            warn!("Compressed file is not smaller than original");
        }
        
        Ok(())
    }
    
    fn create_progress_bar(&self, total: u64, operation: &str) -> CompressionResult<ProgressBar> {
        let pb = self.progress_manager.add(ProgressBar::new(total.max(1)));
        pb.set_style(
            ProgressStyle::default_bar()
                .template(&format!("{}\n{{spinner:.green}} [{{elapsed_precise}}] [{{wide_bar:.cyan/blue}}] {{bytes}}/{{total_bytes}} ({{bytes_per_sec}}, {{eta}})", operation))
                .map_err(|e| CompressionError::Configuration { 
                    message: format!("Progress bar style error: {}", e) 
                })?
                .progress_chars("#+- ")
        );
        Ok(pb)
    }
    
    async fn write_header<W: AsyncWrite + Unpin>(
        &self, 
        writer: &mut W, 
        algorithm: &CompressionAlgorithm
    ) -> CompressionResult<()> {
        writer.write_all(MAGIC_BYTES).await?;
        writer.write_all(&VERSION.to_le_bytes()).await?;
        
        let algorithm_data = bincode::serialize(algorithm)?;
        writer.write_all(&(algorithm_data.len() as u32).to_le_bytes()).await?;
        writer.write_all(&algorithm_data).await?;
        
        Ok(())
    }
    
    async fn write_chunks<W: AsyncWrite + Unpin>(
        &self, 
        writer: &mut W, 
        chunks: &[Vec<u8>]
    ) -> CompressionResult<u64> {
        writer.write_all(&(chunks.len() as u32).to_le_bytes()).await?;
        
        let mut total_size = 4;
        
        for chunk in chunks {
            writer.write_all(&(chunk.len() as u32).to_le_bytes()).await?;
            writer.write_all(chunk).await?;
            total_size += 4 + chunk.len() as u64;
        }
        
        Ok(total_size)
    }
    
    fn determine_chunk_size(&self, file_size: u64) -> usize {
        match file_size {
            0..=SMALL_FILE_THRESHOLD => CHUNK_SIZE_SMALL,
            SMALL_FILE_THRESHOLD..=LARGE_FILE_THRESHOLD => CHUNK_SIZE_MEDIUM,
            _ => CHUNK_SIZE_LARGE,
        }
    }
    
    async fn analyze_content(&self, file_info: &FileInfo) -> CompressionResult<ContentAnalysis> {
        let sample_size = DETECTION_SAMPLE_SIZE.min(file_info.size as usize);
        let mut file = AsyncFile::open(&file_info.path).await
            .map_err(|e| CompressionError::FileRead { 
                path: file_info.path.clone(),
                source: e 
            })?;
        
        let mut buffer = vec![0u8; sample_size];
        let bytes_read = file.read(&mut buffer).await?;
        buffer.truncate(bytes_read);
        
        Ok(self.analyze_content_detailed(&buffer))
    }
    
    fn analyze_content_detailed(&self, data: &[u8]) -> ContentAnalysis {
        let entropy = self.calculate_entropy(data);
        let file_type = self.detect_file_type(data);
        let compressibility = self.estimate_compressibility(data, &file_type);
        let contains_executable = self.check_executable(data);
        let text_ratio = self.calculate_text_ratio(data);
        
        ContentAnalysis {
            entropy,
            file_type: file_type.clone(),
            type_confidence: 0.8,
            compressibility_score: compressibility,
            contains_executable,
            text_ratio,
        }
    }
    
    fn calculate_entropy(&self, data: &[u8]) -> f64 {
        if data.is_empty() { return 0.0; }
        
        let mut counts = [0u64; 256];
        for &byte in data {
            counts[byte as usize] += 1;
        }
        
        let len = data.len() as f64;
        let mut entropy = 0.0;
        
        for &count in &counts {
            if count > 0 {
                let p = count as f64 / len;
                entropy -= p * p.log2();
            }
        }
        
        entropy / 8.0
    }
    
    fn detect_file_type(&self, data: &[u8]) -> DetectedFileType {
        if let Some(file_type) = infer::get(data) {
            match file_type.mime_type() {
                mime if mime.starts_with("text/") => DetectedFileType::Text,
                mime if mime.starts_with("image/") => DetectedFileType::Image,
                mime if mime.contains("zip") || mime.contains("tar") || mime.contains("gz") => {
                    DetectedFileType::Archive
                },
                _ => DetectedFileType::Binary,
            }
        } else if self.is_text_heuristic(data) {
            DetectedFileType::Text
        } else {
            DetectedFileType::Unknown
        }
    }
    
    fn is_text_heuristic(&self, data: &[u8]) -> bool {
        if data.is_empty() { return false; }
        
        let sample_size = data.len().min(4096);
        let printable_count = data[..sample_size].iter()
            .filter(|&&b| b.is_ascii_graphic() || b.is_ascii_whitespace())
            .count();
        
        printable_count as f64 / sample_size as f64 > 0.7
    }
    
    fn calculate_text_ratio(&self, data: &[u8]) -> f64 {
        if data.is_empty() { return 0.0; }
        
        let text_bytes = data.iter()
            .filter(|&&b| b.is_ascii_graphic() || b.is_ascii_whitespace())
            .count();
        
        text_bytes as f64 / data.len() as f64
    }
    
    fn estimate_compressibility(&self, data: &[u8], file_type: &DetectedFileType) -> f64 {
        let entropy = self.calculate_entropy(data);
        let base_compressibility = 1.0 - entropy;
        
        let type_factor = match file_type {
            DetectedFileType::Text => 1.3,
            DetectedFileType::Binary => 0.8,
            DetectedFileType::Image => 0.2,
            DetectedFileType::Archive => 0.05,
            DetectedFileType::Unknown => 1.0,
        };
        
        (base_compressibility * type_factor).min(1.0).max(0.0)
    }
    
    fn check_executable(&self, data: &[u8]) -> bool {
        if data.len() < 4 { return false; }
        
        data.starts_with(b"MZ") ||
        data.starts_with(b"\x7fELF") ||
        data.starts_with(b"\xfe\xed\xfa\xce") ||
        data.starts_with(b"#!")
    }
    
    fn select_algorithm(&self, analysis: &ContentAnalysis, options: &CompressionOptions) -> CompressionResult<CompressionAlgorithm> {
        if let Some(ref algorithm) = options.algorithm {
            return Ok(algorithm.clone());
        }
        
        let algorithm = match (&analysis.file_type, analysis.compressibility_score) {
            (DetectedFileType::Text, score) if score > 0.8 => {
                match options.optimization_target {
                    OptimizationTarget::Ratio => CompressionAlgorithm::Zstd { level: 15 },
                    OptimizationTarget::Speed => CompressionAlgorithm::Lz4 { high_compression: false },
                    OptimizationTarget::Memory => CompressionAlgorithm::Deflate { level: 6 },
                    OptimizationTarget::Balanced => CompressionAlgorithm::Zstd { level: 6 },
                }
            },
            
            (DetectedFileType::Binary, score) if score > 0.5 => {
                match options.optimization_target {
                    OptimizationTarget::Ratio => CompressionAlgorithm::Zstd { level: 12 },
                    OptimizationTarget::Speed => CompressionAlgorithm::Lz4 { high_compression: false },
                    OptimizationTarget::Memory => CompressionAlgorithm::Snappy,
                    OptimizationTarget::Balanced => CompressionAlgorithm::Zstd { level: 3 },
                }
            },
            
            (DetectedFileType::Image | DetectedFileType::Archive, _) => {
                CompressionAlgorithm::Store
            },
            
            (_, score) if analysis.entropy > 0.95 && score < 0.1 => {
                CompressionAlgorithm::Store
            },
            
            _ => {
                match options.optimization_target {
                    OptimizationTarget::Speed => CompressionAlgorithm::Lz4 { high_compression: false },
                    OptimizationTarget::Ratio => CompressionAlgorithm::Zstd { level: 9 },
                    OptimizationTarget::Memory => CompressionAlgorithm::Snappy,
                    OptimizationTarget::Balanced => CompressionAlgorithm::Zstd { level: 3 },
                }
            }
        };
        
        Ok(algorithm)
    }
    
    async fn create_metadata(
        &self,
        file_info: &FileInfo,
        compression_result: &InternalCompressionResult,
        analysis: &ContentAnalysis,
        algorithm: &CompressionAlgorithm,
        compression_time: Duration,
    ) -> CompressionResult<FileMetadata> {
        let metrics = CompressionMetrics {
            compression_time_ms: compression_time.as_millis() as u64,
            decompression_time_ms: None,
            compression_ratio: if compression_result.compressed_size > 0 {
                file_info.size as f64 / compression_result.compressed_size as f64
            } else {
                1.0
            },
            compression_speed_mbps: if compression_time.as_secs_f64() > 0.0 {
                (file_info.size as f64 / (1024.0 * 1024.0)) / compression_time.as_secs_f64()
            } else {
                0.0
            },
            decompression_speed_mbps: None,
            original_size: file_info.size,
            compressed_size: compression_result.compressed_size,
            chunk_count: compression_result.chunk_count,
        };
        
        let file_hash = self.calculate_file_hash(file_info).await?;
        
        Ok(FileMetadata {
            format_version: VERSION,
            created_at: SystemTime::now(),
            algorithm: algorithm.clone(),
            metrics,
            analysis: analysis.clone(),
            file_hash,
        })
    }
    
    async fn calculate_file_hash(&self, file_info: &FileInfo) -> CompressionResult<FileHash> {
        let mut file = AsyncFile::open(&file_info.path).await
            .map_err(|e| CompressionError::FileRead { 
                path: file_info.path.clone(),
                source: e 
            })?;
        
        let mut sha256_hasher = Sha256::new();
        let mut blake3_hasher = Blake3Hasher::new();
        let mut crc32_hasher = Crc32Hasher::new();
        
        let mut buffer = vec![0u8; 64 * 1024];
        
        loop {
            let bytes_read = file.read(&mut buffer).await?;
            if bytes_read == 0 { break; }
            
            let data = &buffer[..bytes_read];
            sha256_hasher.update(data);
            blake3_hasher.update(data);
            crc32_hasher.update(data);
        }
        
        let sha256_result = sha256_hasher.finalize();
        let blake3_result = blake3_hasher.finalize();
        let crc32_result = crc32_hasher.finalize();
        
        let mut sha256_array = [0u8; 32];
        sha256_array.copy_from_slice(&sha256_result);
        
        Ok(FileHash {
            sha256: sha256_array,
            blake3: blake3_result.into(),
            crc32: crc32_result,
        })
    }
    
    pub async fn analyze_file_async<P: AsRef<Path>>(&self, file_path: P) -> CompressionResult<ContentAnalysis> {
        let file_path = file_path.as_ref();
        
        // Check cache
        let file_hash = self.calculate_file_hash_fast(file_path).await?;
        if let Some(cached_analysis) = self.content_cache.get(&file_hash) {
            debug!("Using cached analysis");
            return Ok(cached_analysis.clone());
        }
        
        let file_info = self.get_file_info(file_path).await?;
        let analysis = self.analyze_content(&file_info).await?;
        
        self.content_cache.insert(file_hash, analysis.clone());
        
        Ok(analysis)
    }
    
    async fn calculate_file_hash_fast(&self, file_path: &Path) -> CompressionResult<u64> {
        let metadata = tokio::fs::metadata(file_path).await?;
        let mut hasher = DefaultHasher::new();
        
        file_path.hash(&mut hasher);
        metadata.len().hash(&mut hasher);
        if let Ok(modified) = metadata.modified() {
            modified.hash(&mut hasher);
        }
        
        Ok(hasher.finish())
    }
}

// ================================================================================================
// HELPER STRUCTURES
// ================================================================================================

#[derive(Debug)]
struct FileInfo {
    path: PathBuf,
    size: u64,
    modified: Option<SystemTime>,
}

#[derive(Debug)]
struct FileHeader {
    version: u32,
    algorithm: CompressionAlgorithm,
}

#[derive(Debug)]
struct InternalCompressionResult {
    original_size: u64,
    compressed_size: u64,
    chunk_count: u32,
}

#[derive(Debug)]
struct ChunkedResult {
    chunks: Vec<Vec<u8>>,
}

// ================================================================================================
// TESTS
// ================================================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    
    #[tokio::test]
    async fn test_compression_roundtrip() {
        let engine = CompressionEngine::new().unwrap();
        let temp_dir = TempDir::new().unwrap();
        
        // Create test file
        let input_path = temp_dir.path().join("test.txt");
        let data = b"Hello World! This is a test file for compression.".repeat(100);
        tokio::fs::write(&input_path, &data).await.unwrap();
        
        // Compress
        let compressed_path = temp_dir.path().join("test.compressed");
        let options = CompressionOptions::builder()
            .algorithm(CompressionAlgorithm::Zstd { level: 3 })
            .verify(true)
            .build();
        
        let metadata = engine.compress_file_async(&input_path, &compressed_path, options).await.unwrap();
        
        // Verify compression worked
        assert!(metadata.metrics.compressed_size < metadata.metrics.original_size);
        assert!(metadata.metrics.compression_ratio > 1.0);
        
        // Decompress
        let decompressed_path = temp_dir.path().join("test.decompressed");
        engine.decompress_file(&compressed_path, &decompressed_path).await.unwrap();
        
        // Verify content matches
        let original = tokio::fs::read(&input_path).await.unwrap();
        let decompressed = tokio::fs::read(&decompressed_path).await.unwrap();
        assert_eq!(original, decompressed);
    }
    
    #[tokio::test]
    async fn test_multiple_algorithms() {
        let engine = CompressionEngine::new().unwrap();
        let data = b"Test data for benchmarking different algorithms".repeat(50);
        
        let results = engine.benchmark_algorithms(&data).await;
        
        assert!(!results.is_empty());
        for result in &results {
            assert!(result.compression_ratio > 0.0);
            assert!(result.compression_speed_mbps > 0.0);
            assert!(result.decompression_speed_mbps > 0.0);
        }
    }
    
    #[tokio::test]
    async fn test_builder_pattern() {
        let options = CompressionOptions::builder()
            .algorithm(CompressionAlgorithm::Lz4 { high_compression: true })
            .optimize_for(OptimizationTarget::Speed)
            .chunk_size(CHUNK_SIZE_SMALL)
            .threads(4)
            .verify(true)
            .streaming(false)
            .build();
        
        assert_eq!(options.optimization_target, OptimizationTarget::Speed);
        assert_eq!(options.chunk_size, CHUNK_SIZE_SMALL);
        assert_eq!(options.thread_count, Some(4));
        assert!(options.verify);
        assert!(!options.streaming);
    }
    
    #[test]
    fn test_content_analysis() {
        let engine = CompressionEngine::new().unwrap();
        
        // Test text detection
        let text_data = b"This is plain text content with normal ASCII characters.";
        let text_analysis = engine.analyze_content_detailed(text_data);
        assert_eq!(text_analysis.file_type, DetectedFileType::Text);
        assert!(text_analysis.text_ratio > 0.9);
        
        // Test binary detection
        let binary_data = vec![0xFF, 0x00, 0x01, 0x02, 0xFE, 0xFD];
        let binary_analysis = engine.analyze_content_detailed(&binary_data);
        assert!(binary_analysis.text_ratio < 0.5);
    }
}

// ================================================================================================
// CLI IMPLEMENTATION - Enhanced
// ================================================================================================

#[derive(Parser)]
#[command(name = "encs")]
#[command(version = "5.0.0")]
#[command(about = "Enterprise Neural Compression System - Enhanced")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
    
    #[arg(short, long, global = true)]
    verbose: bool,
    
    #[arg(short, long, global = true, default_value = "0")]
    threads: usize,
    
    #[arg(long, global = true, value_enum, default_value = "human")]
    output_format: OutputFormat,
}

#[derive(Subcommand)]
enum Commands {
    Compress {
        input: PathBuf,
        output: PathBuf,
        #[arg(short, long, value_enum)]
        algorithm: Option<CliAlgorithm>,
        #[arg(short = 'O', long, value_enum, default_value = "balanced")]
        optimization: CliOptimization,
        #[arg(short, long, value_parser = clap::value_parser!(u8).range(1..=22))]
        level: Option<u8>,
        #[arg(short, long)]
        force: bool,
        #[arg(long)]
        verify: bool,
        #[arg(long)]
        streaming: bool,
    },
    
    Decompress {
        input: PathBuf,
        output: PathBuf,
        #[arg(short, long)]
        force: bool,
    },
    
    Analyze {
        file: PathBuf,
        #[arg(long)]
        detailed: bool,
    },
    
    Benchmark {
        file: PathBuf,
    },
    
    Info {
        #[arg(long)]
        all: bool,
    },
}

#[derive(ValueEnum, Clone, Debug)]
enum CliAlgorithm {
    Store, Lz4, Lz4hc, Snappy, Deflate, Zstd, Brotli,
}

#[derive(ValueEnum, Clone, Debug)]
enum CliOptimization {
    Speed, Ratio, Balanced, Memory,
}

#[derive(ValueEnum, Clone, Debug)]
enum OutputFormat {
    Human, Json,
}

#[tokio::main]
async fn main() -> Result<()> {
    color_eyre::install()?;
    
    let cli = Cli::parse();
    
    env_logger::Builder::from_env(
        env_logger::Env::default().default_filter_or(if cli.verbose { "debug" } else { "info" })
    ).init();
    
    info!("Starting ENCS v{}", env!("CARGO_PKG_VERSION"));
    
    let mut config = EngineConfig::load().unwrap_or_default();
    if cli.threads > 0 {
        config.max_threads = cli.threads;
    }
    
    let engine = CompressionEngine::with_config(config.clone())
        .map_err(|e| anyhow!("Failed to create engine: {}", e))?;
    
    match cli.command {
        Commands::Compress { input, output, algorithm, optimization, level, force, verify, streaming } => {
            handle_compress_command(&engine, input, output, algorithm, optimization, level, force, verify, streaming, &cli).await
        },
        Commands::Decompress { input, output, force } => {
            handle_decompress_command(&engine, input, output, force).await
        },
        Commands::Analyze { file, detailed } => {
            handle_analyze_command(&engine, file, detailed, &cli).await
        },
        Commands::Benchmark { file } => {
            handle_benchmark_command(&engine, file).await
        },
        Commands::Info { all } => {
            handle_info_command(all).await
        },
    }
}

async fn handle_compress_command(
    engine: &CompressionEngine,
    input: PathBuf,
    output: PathBuf,
    algorithm: Option<CliAlgorithm>,
    optimization: CliOptimization,
    level: Option<u8>,
    force: bool,
    verify: bool,
    streaming: bool,
    cli: &Cli,
) -> Result<()> {
    if output.exists() && !force {
        if !Confirm::new()
            .with_prompt(format!("Overwrite {}?", output.display()))
            .interact()? 
        {
            return Ok(());
        }
    }
    
    let options = CompressionOptions::builder()
        .algorithm(algorithm.map(|a| convert_cli_algorithm(a, level)).unwrap_or(CompressionAlgorithm::Zstd { level: 3 }))
        .optimize_for(convert_cli_optimization(optimization))
        .threads(cli.threads)
        .verify(verify)
        .streaming(streaming)
        .build();
    
    println!("Starting compression...");
    println!("   Input: {}", input.display());
    println!("   Output: {}", output.display());
    
    let metadata = engine.compress_file_async(&input, &output, options).await
        .map_err(|e| anyhow!("Compression failed: {}", e))?;
    
    match cli.output_format {
        OutputFormat::Human => print_compression_results_human(&metadata),
        OutputFormat::Json => println!("{}", serde_json::to_string_pretty(&metadata)?),
    }
    
    Ok(())
}

async fn handle_decompress_command(
    engine: &CompressionEngine,
    input: PathBuf,
    output: PathBuf,
    force: bool,
) -> Result<()> {
    if output.exists() && !force {
        if !Confirm::new()
            .with_prompt(format!("Overwrite {}?", output.display()))
            .interact()? 
        {
            return Ok(());
        }
    }
    
    println!("Starting decompression...");
    println!("   Input: {}", input.display());
    println!("   Output: {}", output.display());
    
    engine.decompress_file(&input, &output).await
        .map_err(|e| anyhow!("Decompression failed: {}", e))?;
    
    println!("Decompression complete!");
    
    Ok(())
}

async fn handle_analyze_command(
    engine: &CompressionEngine,
    file: PathBuf,
    detailed: bool,
    cli: &Cli,
) -> Result<()> {
    println!("Analyzing: {}", file.display());
    
    let analysis = engine.analyze_file_async(&file).await
        .map_err(|e| anyhow!("Analysis failed: {}", e))?;
    
    match cli.output_format {
        OutputFormat::Human => print_analysis_results_human(&analysis, detailed),
        OutputFormat::Json => println!("{}", serde_json::to_string_pretty(&analysis)?),
    }
    
    Ok(())
}

async fn handle_benchmark_command(
    engine: &CompressionEngine,
    file: PathBuf,
) -> Result<()> {
    println!("Benchmarking algorithms on: {}", file.display());
    
    let data = tokio::fs::read(&file).await?;
    let results = engine.benchmark_algorithms(&data).await;
    
    println!("\nBenchmark Results:");
    println!("   Algorithm           Ratio    Comp Speed   Decomp Speed   Size");
    println!("   -----------------------------------------------------------------");
    
    for result in results {
        println!("   {:<18} {:.2}:1   {:>8.1} MB/s   {:>8.1} MB/s   {} bytes",
            format!("{:?}", result.algorithm),
            result.compression_ratio,
            result.compression_speed_mbps,
            result.decompression_speed_mbps,
            result.compressed_size
        );
    }
    
    Ok(())
}

async fn handle_info_command(all: bool) -> Result<()> {
    println!("ENCS System Information:");
    println!("   Version: {}", env!("CARGO_PKG_VERSION"));
    
    let mut system = System::new_all();
    system.refresh_all();
    
    println!("   CPU cores: {}", num_cpus::get());
    println!("   Memory: {:.1} GB total", system.total_memory() as f64 / (1024.0 * 1024.0 * 1024.0));
    
    println!("\nAvailable Algorithms:");
    println!("   - Store, LZ4, LZ4-HC, Snappy, Deflate, Zstd, Brotli");
    
    if all {
        let test_data = b"Hello, World!".repeat(100);
        println!("\nAlgorithm Test ({}B input):", test_data.len());
        
        let algorithms = [
            ("Store", CompressionAlgorithm::Store),
            ("LZ4", CompressionAlgorithm::Lz4 { high_compression: false }),
            ("Snappy", CompressionAlgorithm::Snappy),
            ("Zstd", CompressionAlgorithm::Zstd { level: 3 }),
        ];
        
        for (name, algo) in algorithms {
            match CompressionEngine::compress_chunk(&test_data, &algo, 0) {
                Ok(compressed) => {
                    let ratio = test_data.len() as f64 / compressed.len() as f64;
                    println!("   [OK] {}: {:.2}:1", name, ratio);
                },
                Err(_) => println!("   [FAIL] {}: failed", name),
            }
        }
    }
    
    Ok(())
}

fn convert_cli_algorithm(algorithm: CliAlgorithm, level: Option<u8>) -> CompressionAlgorithm {
    match algorithm {
        CliAlgorithm::Store => CompressionAlgorithm::Store,
        CliAlgorithm::Lz4 => CompressionAlgorithm::Lz4 { high_compression: false },
        CliAlgorithm::Lz4hc => CompressionAlgorithm::Lz4 { high_compression: true },
        CliAlgorithm::Snappy => CompressionAlgorithm::Snappy,
        CliAlgorithm::Deflate => CompressionAlgorithm::Deflate { level: level.unwrap_or(6) as u32 },
        CliAlgorithm::Zstd => CompressionAlgorithm::Zstd { level: level.unwrap_or(3) as i32 },
        CliAlgorithm::Brotli => CompressionAlgorithm::Brotli { quality: level.unwrap_or(6) as u32 },
    }
}

fn convert_cli_optimization(optimization: CliOptimization) -> OptimizationTarget {
    match optimization {
        CliOptimization::Speed => OptimizationTarget::Speed,
        CliOptimization::Ratio => OptimizationTarget::Ratio,
        CliOptimization::Balanced => OptimizationTarget::Balanced,
        CliOptimization::Memory => OptimizationTarget::Memory,
    }
}

fn print_compression_results_human(metadata: &FileMetadata) {
    println!("\nResults:");
    println!("   Original:  {} bytes ({:.2} MB)", 
        metadata.metrics.original_size, 
        metadata.metrics.original_size as f64 / (1024.0 * 1024.0));
    println!("   Compressed: {} bytes ({:.2} MB)", 
        metadata.metrics.compressed_size, 
        metadata.metrics.compressed_size as f64 / (1024.0 * 1024.0));
    println!("   Ratio:     {:.2}:1", metadata.metrics.compression_ratio);
    
    let savings = if metadata.metrics.original_size > 0 {
        (1.0 - metadata.metrics.compressed_size as f64 / metadata.metrics.original_size as f64) * 100.0
    } else { 0.0 };
    println!("   Saved:     {:.1}%", savings);
    println!("   Speed:     {:.1} MB/s", metadata.metrics.compression_speed_mbps);
    println!("   Algorithm: {:?}", metadata.algorithm);
}

fn print_analysis_results_human(analysis: &ContentAnalysis, detailed: bool) {
    println!("\nAnalysis:");
    println!("   Type:           {:?}", analysis.file_type);
    println!("   Entropy:        {:.3}", analysis.entropy);
    println!("   Compressibility: {:.1}%", analysis.compressibility_score * 100.0);
    println!("   Text ratio:     {:.1}%", analysis.text_ratio * 100.0);
    
    if analysis.contains_executable {
        println!("   [WARNING] Executable detected");
    }
    
    if detailed {
        println!("\nRecommendations:");
        if analysis.compressibility_score > 0.8 {
            println!("   Best: Zstd (excellent compression expected)");
        } else if analysis.compressibility_score > 0.5 {
            println!("   Best: Zstd/LZ4 (good compression expected)");
        } else {
            println!("   Best: Store/LZ4 (minimal compression expected)");
        }
    }
}
