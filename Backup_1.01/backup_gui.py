import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import os
from backup_tool import BackupTool
import threading
import configparser
import re
import logging

class BackupGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Server Backup Tool")
        self.backup_running = False
        self.scheduling = False
        self.schedule_event = threading.Event()
        self.archive_lock = threading.Lock()
        try:
            self.backup_tool = BackupTool(progress_callback=self.update_status)
        except Exception as e:
            messagebox.showerror("Error", f"Failed to initialize: {str(e)}")
            raise
        self.status_lines = []
        self.max_status_lines = 1000
        self.email_enabled_var = tk.BooleanVar(value=self.backup_tool.email_enabled)
        self.sort_column = 'Path'
        self.sort_reverse = False
        self.logger = self.backup_tool.logger  # Use same logger as backup_tool
        self.create_widgets()
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)

    def create_widgets(self):
        """Create GUI widgets"""
        self.notebook = ttk.Notebook(self.root)
        self.notebook.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), padx=10, pady=10)

        # Main Settings Tab
        self.main_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.main_frame, text="Main Settings")

        # Source Directories
        ttk.Label(self.main_frame, text="Source Directories (comma-separated):").grid(row=0, column=0, sticky=tk.W, pady=2)
        self.source_dirs = ttk.Entry(self.main_frame, width=50)
        self.source_dirs.insert(0, ','.join(self.backup_tool.source_dirs))
        self.source_dirs.grid(row=0, column=1, sticky=(tk.W, tk.E), pady=2)
        self.browse_source_btn = ttk.Button(self.main_frame, text="Browse", command=self.browse_source)
        self.browse_source_btn.grid(row=0, column=2, padx=5)

        # Backup Directory
        ttk.Label(self.main_frame, text="Backup Directory:").grid(row=1, column=0, sticky=tk.W, pady=2)
        self.backup_dir = ttk.Entry(self.main_frame, width=50)
        self.backup_dir.insert(0, self.backup_tool.backup_dir)
        self.backup_dir.grid(row=1, column=1, sticky=(tk.W, tk.E), pady=2)
        self.browse_backup_btn = ttk.Button(self.main_frame, text="Browse", command=self.browse_backup)
        self.browse_backup_btn.grid(row=1, column=2, padx=5)

        # Backup Type
        ttk.Label(self.main_frame, text="Backup Type:").grid(row=2, column=0, sticky=tk.W, pady=2)
        self.backup_type = ttk.Combobox(self.main_frame, values=["incremental", "full"], state="readonly")
        self.backup_type.set(self.backup_tool.backup_type)
        self.backup_type.grid(row=2, column=1, sticky=tk.W, pady=2)

        # Max Backups
        ttk.Label(self.main_frame, text="Max Backups:").grid(row=3, column=0, sticky=tk.W, pady=2)
        self.max_backups = ttk.Entry(self.main_frame, width=10)
        self.max_backups.insert(0, str(self.backup_tool.max_backups))
        self.max_backups.grid(row=3, column=1, sticky=tk.W, pady=2)

        # Exclude Patterns
        ttk.Label(self.main_frame, text="Exclude Patterns (comma-separated):").grid(row=4, column=0, sticky=tk.W, pady=2)
        self.exclude_patterns = ttk.Entry(self.main_frame, width=50)
        self.exclude_patterns.insert(0, ','.join(self.backup_tool.exclude_patterns))
        self.exclude_patterns.grid(row=4, column=1, sticky=(tk.W, tk.E), pady=2)

        # Schedule Time
        ttk.Label(self.main_frame, text="Schedule Time (HH:MM):").grid(row=5, column=0, sticky=tk.W, pady=2)
        self.schedule_time = ttk.Entry(self.main_frame, width=10)
        self.schedule_time.insert(0, self.backup_tool.schedule_time)
        self.schedule_time.grid(row=5, column=1, sticky=tk.W, pady=2)

        # Email Settings Tab
        self.email_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.email_frame, text="Email Settings")

        ttk.Label(self.email_frame, text="Enable Email:").grid(row=0, column=0, sticky=tk.W, pady=2)
        self.email_enabled = ttk.Checkbutton(self.email_frame, variable=self.email_enabled_var)
        self.email_enabled.grid(row=0, column=1, sticky=tk.W, pady=2)

        ttk.Label(self.email_frame, text="SMTP Server:").grid(row=1, column=0, sticky=tk.W, pady=2)
        self.smtp_server = ttk.Entry(self.email_frame, width=50)
        self.smtp_server.insert(0, self.backup_tool.smtp_server)
        self.smtp_server.grid(row=1, column=1, sticky=(tk.W, tk.E), pady=2)

        ttk.Label(self.email_frame, text="SMTP Port:").grid(row=2, column=0, sticky=tk.W, pady=2)
        self.smtp_port = ttk.Entry(self.email_frame, width=10)
        self.smtp_port.insert(0, str(self.backup_tool.smtp_port))
        self.smtp_port.grid(row=2, column=1, sticky=tk.W, pady=2)

        ttk.Label(self.email_frame, text="SMTP User:").grid(row=3, column=0, sticky=tk.W, pady=2)
        self.smtp_user = ttk.Entry(self.email_frame, width=50)
        self.smtp_user.insert(0, self.backup_tool.smtp_user)
        self.smtp_user.grid(row=3, column=1, sticky=(tk.W, tk.E), pady=2)

        ttk.Label(self.email_frame, text="SMTP Password:").grid(row=4, column=0, sticky=tk.W, pady=2)
        self.smtp_password = ttk.Entry(self.email_frame, width=50, show="*")
        self.smtp_password.insert(0, self.backup_tool.smtp_password)
        self.smtp_password.grid(row=4, column=1, sticky=(tk.W, tk.E), pady=2)

        ttk.Label(self.email_frame, text="Email To:").grid(row=5, column=0, sticky=tk.W, pady=2)
        self.email_to = ttk.Entry(self.email_frame, width=50)
        self.email_to.insert(0, self.backup_tool.email_to)
        self.email_to.grid(row=5, column=1, sticky=(tk.W, tk.E), pady=2)

        ttk.Label(self.email_frame, text="Email Timezone:").grid(row=6, column=0, sticky=tk.W, pady=2)
        self.email_timezone = ttk.Entry(self.email_frame, width=50)
        self.email_timezone.insert(0, self.backup_tool.email_timezone)
        self.email_timezone.grid(row=6, column=1, sticky=(tk.W, tk.E), pady=2)

        # Archive Viewer Tab
        self.archive_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.archive_frame, text="Archive Viewer")

        ttk.Label(self.archive_frame, text="Select Backup Archive:").grid(row=0, column=0, sticky=tk.W, pady=2)
        self.archive_select = ttk.Combobox(self.archive_frame, width=50, state="readonly")
        self.archive_select.grid(row=0, column=1, sticky=(tk.W, tk.E), pady=2)
        self.archive_select.bind('<<ComboboxSelected>>', self.view_archive)
        self.refresh_archive_btn = ttk.Button(self.archive_frame, text="Refresh", command=self.refresh_archives)
        self.refresh_archive_btn.grid(row=0, column=2, padx=5)

        self.archive_tree = ttk.Treeview(self.archive_frame, columns=('Path', 'Size', 'Modified'), show='headings')
        self.archive_tree.heading('Path', text='File Path', command=lambda: self.sort_treeview('Path'))
        self.archive_tree.heading('Size', text='Size (Bytes)', command=lambda: self.sort_treeview('Size'))
        self.archive_tree.heading('Modified', text='Modified Time', command=lambda: self.sort_treeview('Modified'))
        self.archive_tree.column('Path', width=400)
        self.archive_tree.column('Size', width=100)
        self.archive_tree.column('Modified', width=150)
        self.archive_tree.grid(row=1, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S), pady=2)
        self.archive_scroll = ttk.Scrollbar(self.archive_frame, orient=tk.VERTICAL, command=self.archive_tree.yview)
        self.archive_tree.configure(yscrollcommand=self.archive_scroll.set)
        self.archive_scroll.grid(row=1, column=3, sticky=(tk.N, tk.S))
        self.refresh_archives()

        # Status Display
        ttk.Label(self.main_frame, text="Status:").grid(row=6, column=0, sticky=tk.W, pady=2)
        self.status_text = tk.Text(self.main_frame, height=10, width=60)
        self.status_text.grid(row=6, column=1, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S), pady=2)
        self.status_scroll = ttk.Scrollbar(self.main_frame, orient=tk.VERTICAL, command=self.status_text.yview)
        self.status_text.config(yscrollcommand=self.status_scroll.set)
        self.status_scroll.grid(row=6, column=3, sticky=(tk.N, tk.S))

        # Buttons
        self.save_btn = ttk.Button(self.main_frame, text="Save Config", command=self.save_config)
        self.save_btn.grid(row=7, column=0, pady=5)
        self.run_btn = ttk.Button(self.main_frame, text="Run Backup", command=self.run_backup)
        self.run_btn.grid(row=7, column=1, pady=5)
        self.log_btn = ttk.Button(self.main_frame, text="View Log", command=self.view_log)
        self.log_btn.grid(row=7, column=2, pady=5)
        self.schedule_button = ttk.Button(self.main_frame, text="Start Schedule", command=self.toggle_schedule)
        self.schedule_button.grid(row=8, column=1, pady=5)

        # Configure grid weights
        self.main_frame.columnconfigure(1, weight=1)
        self.main_frame.rowconfigure(6, weight=1)
        self.email_frame.columnconfigure(1, weight=1)
        self.archive_frame.columnconfigure(1, weight=1)
        self.archive_frame.rowconfigure(1, weight=1)

    def browse_source(self):
        """Browse for source directories"""
        try:
            # Check Tkinter version for multiple directory support (Tk 8.6.10+)
            if tk.TkVersion >= 8.6:
                dirs = filedialog.askdirectory(multiple=True)
                if dirs:
                    self.source_dirs.delete(0, tk.END)
                    self.source_dirs.insert(0, ','.join(dirs))
            else:
                raise AttributeError("Multiple directory selection not supported")
        except (AttributeError, Exception):
            directory = filedialog.askdirectory()
            if directory:
                current = self.source_dirs.get()
                new_dirs = [d.strip() for d in current.split(',') if d.strip()] + [directory]
                new_dirs = list(dict.fromkeys(new_dirs))  # Remove duplicates
                self.source_dirs.delete(0, tk.END)
                self.source_dirs.insert(0, ','.join(new_dirs))

    def browse_backup(self):
        """Browse for backup directory"""
        directory = filedialog.askdirectory()
        if directory:
            self.backup_dir.delete(0, tk.END)
            self.backup_dir.insert(0, directory)

    def update_status(self, message):
        """Update status text area with buffer limit"""
        self.status_lines.append(message)
        if len(self.status_lines) > self.max_status_lines:
            self.status_lines.pop(0)
        self.status_text.delete(1.0, tk.END)
        self.status_text.insert(tk.END, '\n'.join(self.status_lines) + '\n')
        self.status_text.see(tk.END)
        self.root.update()

    def refresh_archives(self):
        """Refresh the list of available backup archives"""
        with self.archive_lock:
            if self.backup_running:
                self.update_status("Cannot refresh archives during backup")
                return
            try:
                backups = sorted([f for f in os.listdir(self.backup_tool.backup_dir) if f.endswith('.zip')])
                self.archive_select['values'] = backups
                if backups:
                    self.archive_select.current(0)
                else:
                    self.archive_select.set('')
                    self.archive_select.config(state='disabled')
                    self.archive_tree.delete(*self.archive_tree.get_children())
            except Exception as e:
                self.update_status(f"Error refreshing archives: {str(e)}")
                return
        if backups:  # Call view_archive outside lock
            self.view_archive(None)

    def sort_treeview(self, column):
        """Sort the archive treeview by the specified column"""
        if column == self.sort_column:
            self.sort_reverse = not self.sort_reverse
        else:
            self.sort_column = column
            self.sort_reverse = False

        items = [(self.archive_tree.set(item, column), item) for item in self.archive_tree.get_children('')]
        if column == 'Size':
            def size_key(x):
                try:
                    return int(x[0])
                except ValueError:
                    self.logger.warning(f"Non-numeric size in archive: {x[0]}")
                    self.update_status(f"Warning: Non-numeric size detected in archive: {x[0]}")
                    return 0
            items.sort(key=size_key, reverse=self.sort_reverse)
        else:
            items.sort(key=lambda x: x[0].lower(), reverse=self.sort_reverse)

        for index, (value, item) in enumerate(items):
            self.archive_tree.move(item, '', index)

    def view_archive(self, event):
        """Display the contents of the selected archive"""
        self.notebook.select(self.archive_frame)
        selected = self.archive_select.get()
        if not selected:
            return
        zip_path = os.path.join(self.backup_tool.backup_dir, selected)
        contents = self.backup_tool.list_archive_contents(zip_path)
        self.archive_tree.delete(*self.archive_tree.get_children())
        for item in contents:
            self.archive_tree.insert('', 'end', values=(item['path'], item['size'], item['mtime']))
        self.sort_treeview(self.sort_column)

    def save_config(self):
        """Save configuration to file with validation"""
        try:
            max_backups = self.max_backups.get()
            try:
                max_backups = int(max_backups)
                if max_backups <= 0:
                    raise ValueError("Max Backups must be positive")
            except ValueError:
                raise ValueError("Max Backups must be a positive integer")
            schedule_time = self.schedule_time.get()
            datetime.datetime.strptime(schedule_time, '%H:%M')
            smtp_port = self.smtp_port.get()
            try:
                smtp_port = int(smtp_port)
                if smtp_port <= 0:
                    raise ValueError("SMTP Port must be positive")
            except ValueError:
                raise ValueError("SMTP Port must be a positive integer")
            email_to = self.email_to.get()
            if self.email_enabled_var.get() and email_to and not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email_to):
                raise ValueError("Invalid Email To format")
            smtp_server = self.smtp_server.get()
            if self.email_enabled_var.get() and smtp_server and not re.match(r'^(localhost|[\w\.-]+\.[a-zA-Z]{2,}|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$', smtp_server):
                raise ValueError("Invalid SMTP Server format (use hostname, localhost, or IP address)")
            config_data = {
                'SourceDirs': self.source_dirs.get(),
                'BackupDir': self.backup_dir.get(),
                'BackupType': self.backup_type.get(),
                'MaxBackups': str(max_backups),
                'ExcludePatterns': self.exclude_patterns.get(),
                'ScheduleTime': schedule_time,
                'EmailEnabled': str(self.email_enabled_var.get()),
                'SMTPServer': smtp_server,
                'SMTPPort': str(smtp_port),
                'SMTPUser': self.smtp_user.get(),
                'SMTPPassword': self.smtp_password.get(),
                'EmailTo': email_to,
                'UseProgressBar': str(self.backup_tool.use_progress_bar),
                'EmailTimezone': self.email_timezone.get()
            }
            self.backup_tool.save_config('backup_config.ini', config_data)
            self.update_status("Configuration saved successfully")
            self.refresh_archives()
        except ValueError as e:
            self.update_status(f"Invalid input: {str(e)}")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save config: {str(e)}")
            self.update_status(f"Error saving config: {str(e)}")

    def run_backup(self):
        """Run backup in a separate thread"""
        if self.backup_running:
            self.update_status("Backup is already running")
            return
        self.backup_running = True
        self.set_buttons_state('disabled')
        def backup_thread():
            try:
                self.backup_tool.run_backup()
                self.refresh_archives()
            except Exception as e:
                self.update_status(f"Backup failed: {str(e)}")
                messagebox.showerror("Error", f"Backup failed: {str(e)}")
            finally:
                self.backup_running = False
                self.set_buttons_state('normal')
        threading.Thread(target=backup_thread, daemon=True).start()

    def set_buttons_state(self, state):
        """Enable or disable buttons"""
        self.save_btn.config(state=state)
        self.run_btn.config(state=state)
        self.log_btn.config(state=state)
        self.browse_source_btn.config(state=state)
        self.browse_backup_btn.config(state=state)
        self.schedule_button.config(state=state)
        self.refresh_archive_btn.config(state=state)
        self.archive_select.config(state='readonly' if state == 'normal' and self.archive_select['values'] else 'disabled')

    def view_log(self):
        """Display the latest 1000 lines of log file"""
        log_file = os.path.join('logs', 'backup.log')
        try:
            with open(log_file, 'r') as f:
                lines = f.readlines()[-1000:]
            self.status_text.delete(1.0, tk.END)
            self.status_text.insert(tk.END, ''.join(lines))
            self.status_text.see(tk.END)
        except Exception as e:
            self.update_status(f"Error reading log: {str(e)}")

    def toggle_schedule(self):
        """Toggle scheduled backups"""
        if self.scheduling:
            self.schedule_event.clear()
            self.backup_tool.schedule_backup(False)
            self.schedule_button.config(text="Start Schedule")
            self.scheduling = False
            self.update_status("Schedule stopped")
        else:
            try:
                self.backup_tool.schedule_backup(True)
                self.schedule_event.set()
                self.schedule_button.config(text="Stop Schedule")
                self.scheduling = True
                threading.Thread(target=self.schedule_loop, daemon=True).start()
            except Exception as e:
                self.update_status(f"Failed to start schedule: {str(e)}")
                messagebox.showerror("Error", f"Failed to start schedule: {str(e)}")

    def schedule_loop(self):
        """Run schedule in a separate thread"""
        while self.schedule_event.is_set():
            try:
                schedule.run_pending()
                time.sleep(60)
            except Exception as e:
                self.update_status(f"Schedule error: {str(e)}")
                messagebox.showerror("Error", f"Schedule error: {str(e)}")
                self.schedule_event.clear()
                self.scheduling = False
                self.schedule_button.config(text="Start Schedule")
                break

    def on_closing(self):
        """Handle window close event"""
        if self.backup_running:
            if not messagebox.askokcancel("Quit", "Backup is running. Quit anyway?"):
                return
        self.schedule_event.clear()
        self.backup_tool.schedule_backup(False)
        self.backup_tool.release_lock()
        self.root.destroy()

if __name__ == "__main__":
    root = tk.Tk()
    app = BackupGUI(root)
    root.mainloop()