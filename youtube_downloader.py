#!/usr/bin/env python3
"""
YouTube Downloader - Testing Purpose Only
For personal use only (e.g., your own videos or Creative Commons content)
YouTube's Terms of Service prohibit unauthorized downloading: https://www.youtube.com/tos
"""

import os
import re
import sys
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from pathlib import Path
import threading

try:
    from pytube import YouTube, Playlist
    from pytube.exceptions import PytubeError, VideoUnavailable
except ImportError:
    messagebox.showerror("Error", "pytube not installed. Run: pip install pytube")
    sys.exit(1)

# Optional Google API for search functionality
try:
    from googleapiclient.discovery import build
    GOOGLE_API_AVAILABLE = True
except ImportError:
    GOOGLE_API_AVAILABLE = False

# Optional: YouTube Data API key for search (leave empty if not using search)
YOUTUBE_API_KEY = ""


class YouTubeDownloaderApp:
    def __init__(self, root):
        self.root = root
        self.root.title("YouTube Downloader - Educational Use")
        self.root.geometry("700x550")
        self.root.resizable(False, False)
        
        # Instance variables
        self.yt = None
        self.streams = []
        self.videos = []
        self.output_path = str(Path.home() / "Downloads")
        self.is_downloading = False
        
        self.setup_gui()

    def setup_gui(self):
        """Create and layout GUI elements."""
        main_frame = tk.Frame(self.root, padx=10, pady=10)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Input type selection
        tk.Label(main_frame, text="Input Type:", font=("Arial", 10, "bold")).pack(pady=5)
        self.input_type = tk.StringVar(value="URL")
        input_types = ["URL", "Video ID", "Playlist URL"]
        if GOOGLE_API_AVAILABLE and YOUTUBE_API_KEY:
            input_types.append("Search Query")
        
        tk.OptionMenu(main_frame, self.input_type, *input_types).pack(pady=5)
        
        # Input entry
        tk.Label(main_frame, text="Enter Input:").pack(pady=5)
        entry_frame = tk.Frame(main_frame)
        entry_frame.pack(pady=5)
        
        self.input_entry = tk.Entry(entry_frame, width=50)
        self.input_entry.pack(side=tk.LEFT, padx=5)
        self.input_entry.bind('<Return>', lambda e: self.load_input())
        
        tk.Button(entry_frame, text="Load", command=self.load_input, width=10).pack(side=tk.LEFT)
        
        # Video selecton (for playlists)
        self.video_frame = tk.LabelFrame(main_frame, text="Playlist Videos", padx=5, pady=5)
        self.video_listbox = tk.Listbox(self.video_frame, width=65, height=4)
        self.video_listbox.pack()
        self.video_listbox.bind('<<ListboxSelect>>', self.on_video_select)
        
        # Video information
        info_frame = tk.LabelFrame(main_frame, text="Video Information", padx=5, pady=5)
        info_frame.pack(fill=tk.X, pady=10)
        
        self.info_label = tk.Label(info_frame, text="No video loaded", justify=tk.LEFT)
        self.info_label.pack(pady=5)
        
        # Stream selection
        stream_frame = tk.LabelFrame(main_frame, text="Available Streams", padx=5, pady=5)
        stream_frame.pack(fill=tk.X, pady=5)
        
        self.stream_listbox = tk.Listbox(stream_frame, width=65, height=5)
        self.stream_listbox.pack(pady=5)
        
        # Output path
        output_frame = tk.Frame(main_frame)
        output_frame.pack(pady=10)
        
        tk.Button(output_frame, text=" Output Folder", command=self.choose_output).pack(side=tk.LEFT, padx=5)
        self.output_label = tk.Label(output_frame, text=self._truncate_path(self.output_path))
        self.output_label.pack(side=tk.LEFT)
        
        # Download button and progress
        download_frame = tk.Frame(main_frame)
        download_frame.pack(pady=10)
        
        self.download_button = tk.Button(
            download_frame, 
            text="⬇ Download", 
            command=self.start_download,
            state=tk.DISABLED,
            bg="#4CAF50",
            fg="white",
            font=("Arial", 10, "bold"),
            padx=20
        )
        self.download_button.pack()
        
        # Status bar
        self.status_label = tk.Label(main_frame, text="Ready", relief=tk.SUNKEN, anchor=tk.W)
        self.status_label.pack(fill=tk.X, pady=5)

    def _truncate_path(self, path, max_len=50):
        """Truncate long paths for display."""
        if len(path) <= max_len:
            return path
        return "..." + path[-(max_len-3):]

    def _sanitize_filename(self, filename):
        """Create a safe filename by removing invalid characters."""
        # Remove invalid characters for Windows/Unix filesystems
        filename = re.sub(r'[<>:"/\\|?*]', '', filename)
        filename = filename.strip('. ')  # Remove trailing dots and spaces
        return filename[:200] if filename else "download"  # Limit length

    def _format_size(self, bytes_size):
        """Convert bytes to human readable format."""
        if bytes_size is None:
            return "Unknown"
        for unit in ['B', 'KB', 'MB', 'GB']:
            if bytes_size < 1024.0:
                return f"{bytes_size:.2f} {unit}"
            bytes_size /= 1024.0
        return f"{bytes_size:.2f} TB"

    def validate_youtube_url(self, url):
        """Validate YouTube video URL."""
        patterns = [
            r'(?:https?://)?(?:www\.)?youtube\.com/watch\?v=[\w-]{11}',
            r'(?:https?://)?(?:www\.)?youtu\.be/[\w-]{11}',
            r'(?:https?://)?(?:www\.)?youtube\.com/embed/[\w-]{11}'
        ]
        return any(re.match(pattern, url) for pattern in patterns)

    def validate_playlist_url(self, url):
        """Validate YouTube playlist URL."""
        pattern = r'(?:https?://)?(?:www\.)?youtube\.com/playlist\?list=[\w-]+'
        return bool(re.match(pattern, url))

    def validate_video_id(self, video_id):
        """Validate YouTube video ID (11 characters)."""
        return bool(re.match(r'^[\w-]{11}$', video_id))

    def search_youtube(self, query):
        """Search YouTube using Google API."""
        if not GOOGLE_API_AVAILABLE or not YOUTUBE_API_KEY:
            messagebox.showwarning("Search Unavailable", 
                                  "YouTube search requires Google API.\n"
                                  "Please use URL or Video ID instead.")
            return []
        
        try:
            youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)
            request = youtube.search().list(
                part="snippet",
                q=query,
                type="video",
                maxResults=10
            )
            response = request.execute()
            
            self.videos = []
            for item in response.get('items', []):
                self.videos.append({
                    'id': item['id']['videoId'],
                    'title': item['snippet']['title']
                })
            return self.videos
            
        except Exception as e:
            messagebox.showerror("Search Error", f"Search failed: {str(e)}")
            return []

    def load_input(self):
        """Process user input based on selected type."""
        if self.is_downloading:
            self.status_label.config(text="Please wait for current download to finish")
            return
        
        input_value = self.input_entry.get().strip()
        if not input_value:
            self.status_label.config(text="Please enter a valid input")
            return
        
        # Reset UI
        self.video_listbox.delete(0, tk.END)
        self.stream_listbox.delete(0, tk.END)
        self.video_frame.pack_forget()
        self.streams = []
        self.videos = []
        self.yt = None
        self.download_button.config(state=tk.DISABLED)
        self.info_label.config(text="Loading...")
        self.status_label.config(text="Processing...")
        
        # Process based on input type
        input_type = self.input_type.get()
        
        try:
            if input_type == "URL":
                if not self.validate_youtube_url(input_value):
                    raise ValueError("Invalid YouTube URL format")
                self.load_video(input_value)
                
            elif input_type == "Video ID":
                if not self.validate_video_id(input_value):
                    raise ValueError("Invalid Video ID (must be 11 characters)")
                url = f"https://www.youtube.com/watch?v={input_value}"
                self.load_video(url)
                
            elif input_type == "Playlist URL":
                if not self.validate_playlist_url(input_value):
                    raise ValueError("Invalid Playlist URL format")
                self.load_playlist(input_value)
                
            elif input_type == "Search Query":
                videos = self.search_youtube(input_value)
                if videos:
                    self.video_frame.pack(fill=tk.X, pady=10)
                    for video in videos:
                        self.video_listbox.insert(tk.END, video['title'])
                    self.status_label.config(text=f"Found {len(videos)} videos. Select one to continue.")
                else:
                    self.status_label.config(text="No search results found")
                    
        except ValueError as e:
            self.status_label.config(text=str(e))
            self.info_label.config(text="No video loaded")
        except Exception as e:
            self.status_label.config(text=f"Error: {str(e)}")
            self.info_label.config(text="Failed to load")

    def load_playlist(self, url):
        """Load videos from a playlist."""
        try:
            playlist = Playlist(url)
            playlist._video_regex = re.compile(r"\"url\":\"(/watch\?v=[\w-]*)")
            
            video_urls = list(playlist.video_urls)[:20]  # Limit to 20 videos
            if not video_urls:
                raise ValueError("No videos found in playlist")
            
            self.videos = []
            self.video_frame.pack(fill=tk.X, pady=10)
            
            for i, video_url in enumerate(video_urls, 1):
                video_id = video_url.split('v=')[1][:11]
                title = f"Video {i} - {video_id}"  # Basic title
                self.videos.append({'id': video_id, 'title': title})
                self.video_listbox.insert(tk.END, title)
            
            self.status_label.config(text=f"Loaded {len(self.videos)} videos. Select one to download.")
            self.info_label.config(text="Select a video from the playlist")
            
        except Exception as e:
            raise ValueError(f"Failed to load playlist: {str(e)}")

    def on_video_select(self, event):
        """Handle video selection from list."""
        selection = self.video_listbox.curselection()
        if not selection:
            return
        
        video = self.videos[selection[0]]
        url = f"https://www.youtube.com/watch?v={video['id']}"
        self.load_video(url)

    def load_video(self, url):
        """Load video information and available streams."""
        self.stream_listbox.delete(0, tk.END)
        self.streams = []
        
        try:
            self.status_label.config(text="Loading video information...")
            self.yt = YouTube(url, on_progress_callback=self.on_progress)
            
            # Display video info
            duration = f"{self.yt.length // 60}:{self.yt.length % 60:02d}" if self.yt.length else "Unknown"
            self.info_label.config(text=f"Title: {self.yt.title}\n"
                                      f"Author: {self.yt.author}\n"
                                      f"Duration: {duration}")
            
            # Load streams
            self.status_label.config(text="Loading available streams...")
            
            # Get progressive streams (video + audio)
            progressive = self.yt.streams.filter(progressive=True).order_by('resolution').desc()
            for stream in progressive:
                size = self._format_size(stream.filesize)
                info = f"📹 {stream.resolution or 'Default'} - {stream.mime_type.split('/')[1].upper()} - {size}"
                self.stream_listbox.insert(tk.END, info)
                self.streams.append(stream)
            
            # Get audio-only streams
            audio = self.yt.streams.filter(only_audio=True).order_by('abr').desc()
            for stream in audio:
                size = self._format_size(stream.filesize)
                info = f"🎵 Audio Only - {stream.abr or 'Default'} - {stream.mime_type.split('/')[1].upper()} - {size}"
                self.stream_listbox.insert(tk.END, info)
                self.streams.append(stream)
            
            if self.streams:
                self.download_button.config(state=tk.NORMAL)
                self.status_label.config(text=f"Found {len(self.streams)} streams. Select one to download.")
            else:
                self.status_label.config(text="No downloadable streams found")
                
        except VideoUnavailable:
            self.status_label.config(text="Video unavailable (private, deleted, or restricted)")
            self.info_label.config(text="Video not accessible")
        except Exception as e:
            self.status_label.config(text=f"Failed to load video: {str(e)}")
            self.info_label.config(text="Error loading video")

    def choose_output(self):
        """Select output directory."""
        folder = filedialog.askdirectory(initialdir=self.output_path, title="Select Download Folder")
        if folder:
            self.output_path = folder
            self.output_label.config(text=self._truncate_path(self.output_path))

    def on_progress(self, stream, chunk, bytes_remaining):
        """Update download progress."""
        if stream.filesize:
            percent = int((1 - bytes_remaining / stream.filesize) * 100)
            self.root.after(0, lambda: self.status_label.config(text=f"Downloading... {percent}%"))

    def start_download(self):
        """Initiate download in separate thread."""
        selection = self.stream_listbox.curselection()
        if not selection:
            messagebox.showwarning("No Selection", "Please select a stream to download")
            return
        
        stream = self.streams[selection[0]]
        self.is_downloading = True
        self.download_button.config(state=tk.DISABLED)
        self.status_label.config(text="Starting download...")
        
        # Start download in background thread
        thread = threading.Thread(target=self.download_stream, args=(stream,), daemon=True)
        thread.start()

    def download_stream(self, stream):
        """Download the selected stream."""
        try:
            # Generate safe filename
            safe_title = self._sanitize_filename(self.yt.title)
            extension = stream.mime_type.split('/')[1]
            if extension == 'mp4':
                extension = 'mp4'
            elif extension in ['webm', '3gpp']:
                extension = extension
            else:
                extension = 'mp4'  # Default
            
            filename = f"{safe_title}.{extension}"
            
            # Download
            output_file = stream.download(output_path=self.output_path, filename=filename)
            
            # Update UI on success
            self.root.after(0, lambda: self.status_label.config(
                text=f"✓ Downloaded: {os.path.basename(output_file)}"
            ))
            self.root.after(0, lambda: messagebox.showinfo(
                "Download Complete", 
                f"File saved to:\n{output_file}"
            ))
            
        except Exception as e:
            self.root.after(0, lambda: self.status_label.config(text=f"Download failed: {str(e)}"))
            self.root.after(0, lambda: messagebox.showerror("Download Error", str(e)))
            
        finally:
            self.is_downloading = False
            self.root.after(0, lambda: self.download_button.config(state=tk.NORMAL))


def main():
    """Main entry point."""
    root = tk.Tk()
    try:
        app = YouTubeDownloaderApp(root)
        root.mainloop()
    except Exception as e:
        messagebox.showerror("Fatal Error", f"Application error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
