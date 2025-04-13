# Theory, never used an never will be.
# Done in 2021, updated 2025
# For personal use only (e.g., your own videos or Creative Commons content)
# YouTube's Terms of Service prohibit unauthorized downloading: https://www.youtube.com/tos
# Run with: python youtube_downloader_gui_extended.py

import os
import re
import sys
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from pytube import YouTube, Playlist
from pytube.exceptions import PytubeError
import threading
try:
    from googleapiclient.discovery import build
    GOOGLE_API_AVAILABLE = True
except ImportError:
    GOOGLE_API_AVAILABLE = False

# Optional: Set your YouTube Data API key here for search functionality
YOUTUBE_API_KEY = ""  # Replace with your API key, or leave empty for basic search

class YouTubeDownloaderApp:
    def __init__(self, root):
        self.root = root
        self.root.title("YouTube Downloader")
        self.root.geometry("700x500")
        self.yt = None
        self.streams = []
        self.videos = []  # For search results or playlist videos
        self.output_path = os.path.join(os.path.expanduser("~"), "Downloads")
        
        # GUI elements
        self.setup_gui()

    def setup_gui(self):
        # Input type selection
        tk.Label(self.root, text="Input Type:").pack(pady=5)
        self.input_type = tk.StringVar(value="URL")
        input_types = ["URL", "Video ID", "Search Query", "Playlist URL"]
        tk.OptionMenu(self.root, self.input_type, *input_types).pack(pady=5)
        
        # Input entry
        tk.Label(self.root, text="Enter Input:").pack(pady=5)
        self.input_entry = tk.Entry(self.root, width=60)
        self.input_entry.pack(pady=5)
        
        # Load button
        tk.Button(self.root, text="Load", command=self.load_input).pack(pady=5)
        
        # Video selection (for search/playlist)
        tk.Label(self.root, text="Select Video:").pack(pady=5)
        self.video_listbox = tk.Listbox(self.root, width=60, height=5)
        self.video_listbox.pack(pady=5)
        self.video_listbox.bind('<<ListboxSelect>>', self.load_selected_video)
        
        # Video info
        self.info_label = tk.Label(self.root, text="", wraplength=600)
        self.info_label.pack(pady=5)
        
        # Stream selection
        tk.Label(self.root, text="Select Stream:").pack(pady=5)
        self.stream_listbox = tk.Listbox(self.root, width=60, height=5)
        self.stream_listbox.pack(pady=5)
        
        # Output path
        tk.Button(self.root, text="Choose Output Folder", command=self.choose_output).pack(pady=5)
        self.output_label = tk.Label(self.root, text=f"Output: {self.output_path}")
        self.output_label.pack(pady=5)
        
        # Download button
        self.download_button = tk.Button(self.root, text="Download", command=self.start_download, state=tk.DISABLED)
        self.download_button.pack(pady=10)
        
        # Status
        self.status_label = tk.Label(self.root, text="", wraplength=600)
        self.status_label.pack(pady=5)

    def validate_url(self, url):
        """Check if the input is a valid YouTube URL."""
        youtube_regex = (
            r'(https?://)?(www\.)?(youtube|youtu|youtube-nocookie)\.(com|be)/'
            r'(watch\?v=|embed/|v/|.+\?v=)?([^&=%\?]{11})'
        )
        return re.match(youtube_regex, url) is not None

    def validate_playlist_url(self, url):
        """Check if the input is a valid YouTube playlist URL."""
        playlist_regex = (
            r'(https?://)?(www\.)?(youtube|youtu|youtube-nocookie)\.(com|be)/'
            r'(playlist\?list=)([^&=%\?]+)'
        )
        return re.match(playlist_regex, url) is not None

    def validate_video_id(self, video_id):
        """Check if the input is a valid YouTube video ID."""
        return len(video_id) == 11 and re.match(r'^[A-Za-z0-9_-]+$', video_id)

    def search_youtube(self, query):
        """Search YouTube using Google API or fallback method."""
        self.videos = []
        if GOOGLE_API_AVAILABLE and YOUTUBE_API_KEY:
            try:
                youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)
                request = youtube.search().list(
                    part="snippet",
                    q=query,
                    type="video",
                    maxResults=5
                )
                response = request.execute()
                for item in response.get('items', []):
                    video_id = item['id']['videoId']
                    title = item['snippet']['title']
                    self.videos.append({'id': video_id, 'title': title})
            except Exception as e:
                self.status_label.config(text=f"API search failed: {e}. Trying fallback.")
        else:
            # Fallback: Mock search (pytube doesn't have native search)
            self.status_label.config(text="API key missing. Limited search results.")
            # Placeholder: Add a single video ID (not ideal, but avoids external scraping)
            self.videos.append({'id': '', 'title': 'Search not fully supported without API key'})
        
        return self.videos

    def load_input(self):
        """Process the user input based on type."""
        input_value = self.input_entry.get().strip()
        input_type = self.input_type.get()
        self.video_listbox.delete(0, tk.END)
        self.stream_listbox.delete(0, tk.END)
        self.streams = []
        self.videos = []
        self.yt = None
        self.download_button.config(state=tk.DISABLED)
        self.info_label.config(text="")
        
        if not input_value:
            self.status_label.config(text="Input cannot be empty.")
            return
        
        self.status_label.config(text="Processing input...")
        
        try:
            if input_type == "URL":
                if not self.validate_url(input_value):
                    self.status_label.config(text="Invalid YouTube URL.")
                    return
                self.load_video(input_value)
            
            elif input_type == "Video ID":
                if not self.validate_video_id(input_value):
                    self.status_label.config(text="Invalid Video ID (must be 11 characters, alphanumeric).")
                    return
                url = f"https://www.youtube.com/watch?v={input_value}"
                self.load_video(url)
            
            elif input_type == "Search Query":
                videos = self.search_youtube(input_value)
                if not videos:
                    self.status_label.config(text="No search results found.")
                    return
                for video in videos:
                    self.video_listbox.insert(tk.END, video['title'])
                self.status_label.config(text="Select a video from the list.")
            
            elif input_type == "Playlist URL":
                if not self.validate_playlist_url(input_value):
                    self.status_label.config(text="Invalid Playlist URL.")
                    return
                playlist = Playlist(input_value)
                self.videos = [{'id': url.split('v=')[1][:11], 'title': YouTube(url).title} for url in playlist.video_urls[:5]]  # Limit to 5
                if not self.videos:
                    self.status_label.config(text="No videos found in playlist.")
                    return
                for video in self.videos:
                    self.video_listbox.insert(tk.END, video['title'])
                self.status_label.config(text="Select a video from the playlist.")
        
        except Exception as e:
            self.status_label.config(text=f"Error processing input: {e}")

    def load_selected_video(self, event):
        """Load streams for the selected video from search or playlist."""
        selected = self.video_listbox.curselection()
        if not selected:
            return
        
        video = self.videos[selected[0]]
        if not video['id']:
            self.status_label.config(text="Cannot load this video (search limited).")
            return
        
        url = f"https://www.youtube.com/watch?v={video['id']}"
        self.load_video(url)

    def load_video(self, url):
        """Load video details and streams."""
        self.stream_listbox.delete(0, tk.END)
        self.streams = []
        
        try:
            self.yt = YouTube(url)
            self.info_label.config(text=f"Title: {self.yt.title}\n"
                                     f"Author: {self.yt.author}\n"
                                     f"Duration: {self.yt.length // 60}m {self.yt.length % 60}s")
            
            # Get streams
            video_streams = self.yt.streams.filter(progressive=True)
            audio_streams = self.yt.streams.filter(only_audio=True)
            
            index = 1
            for stream in video_streams:
                size_mb = (stream.filesize / 1024 / 1024) if stream.filesize else 0
                self.stream_listbox.insert(tk.END, 
                    f"{index}. Video: {stream.resolution or 'N/A'}, {stream.mime_type}, {size_mb:.2f} MB")
                self.streams.append(stream)
                index += 1
            
            for stream in audio_streams:
                size_mb = (stream.filesize / 1024 / 1024) if stream.filesize else 0
                self.stream_listbox.insert(tk.END, 
                    f"{index}. Audio: {stream.abr or 'N/A'}, {stream.mime_type}, {size_mb:.2f} MB")
                self.streams.append(stream)
                index += 1
            
            self.download_button.config(state=tk.NORMAL)
            self.status_label.config(text="Select a stream to download.")
        except PytubeError as e:
            self.status_label.config(text=f"Error: {e}. Video may be private or restricted.")
            self.download_button.config(state=tk.DISABLED)

    def choose_output(self):
        """Open file dialog to choose output folder."""
        folder = filedialog.askdirectory(initialdir=self.output_path)
        if folder:
            self.output_path = folder
            self.output_label.config(text=f"Output: {self.output_path}")

    def start_download(self):
        """Start download in a separate thread."""
        selected = self.stream_listbox.curselection()
        if not selected:
            self.status_label.config(text="Please select a stream.")
            return
        
        stream = self.streams[selected[0]]
        self.download_button.config(state=tk.DISABLED)
        self.status_label.config(text="Starting download...")
        
        threading.Thread(target=self.download_stream, args=(stream,), daemon=True).start()

    def download_stream(self, stream):
        """Download the selected stream."""
        try:
            safe_title = re.sub(r'[^\w\s-]', '', self.yt.title).replace(' ', '_')
            stream.download(output_path=self.output_path, filename=safe_title)
            self.root.after(0, lambda: self.status_label.config(
                text=f"Downloaded to: {os.path.join(self.output_path, safe_title + '.' + stream.subtype)}"))
            self.root.after(0, lambda: self.download_button.config(state=tk.NORMAL))
        except Exception as e:
            self.root.after(0, lambda: self.status_label.config(text=f"Download failed: {e}"))
            self.root.after(0, lambda: self.download_button.config(state=tk.NORMAL))

def main():
    root = tk.Tk()
    app = YouTubeDownloaderApp(root)
    root.mainloop()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        messagebox.showerror("Error", f"An unexpected error occurred: {e}")
        sys.exit(1)
