#!/usr/bin/env python3
"""
Server Backup Tool - GUI Interface
Provides graphic interface for backup configuration and management
"""

import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import os
import sys
import threading
import re
from pathlib import Path

# Check for required packages
try:
    import schedule
    import time
except ImportError:
    messagebox.showerror("Missing Dependencies", 
                        "Required packages missing.\nInstall with: pip install schedule")
    sys.exit(1)

# Import backup tool
try:
    from backup_tool import BackupTool
except ImportError:
    messagebox.showerror("Error", "backup_tool.py not found in current directory")
    sys.exit(1)


class BackupGUI:
    def __init__(self, root):
        """Initialize GUI application"""
        self.root = root
        self.root.title("Server Backup Tool")
        self.root.geometry("800x600")
        
        # State variables
        self.backup_running = False
        self.schedule_running = False
        self.schedule_thread = None
        self.status_messages = []
        
        # Initialize backup tool
        try:
            self.backup_tool = BackupTool(progress_callback=self.update_status)
        except Exception as e:
            messagebox.showerror("Initialization Error", f"Failed to initialize: {e}")
            sys.exit(1)
        
        # Create GUI
        self.create_widgets()
        
        # Handle window close
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        
        # Initial refresh
        self.refresh_archives()

    def create_widgets(self):
        """Create all GUI widgets"""
        # Create notebook for tabs
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill='both', expand=True, padx=5, pady=5)
        
        # Create tabs
        self.create_main_tab()
        self.create_email_tab()
        self.create_archive_tab()
        
        # Status bar at bottom
        self.status_bar = ttk.Label(self.root, text="Ready", relief=tk.SUNKEN)
        self.status_bar.pack(side='bottom', fill='x')

    def create_main_tab(self):
        """Create main settings tab"""
        main_frame = ttk.Frame(self.notebook)
        self.notebook.add(main_frame, text="Settings")
        
        # Create grid
        settings_frame = ttk.LabelFrame(main_frame, text="Backup Settings", padding=10)
        settings_frame.pack(fill='both', expand=True, padx=10, pady=10)
        
        # Source directories
        row = 0
        ttk.Label(settings_frame, text="Source Directories:").grid(row=row, column=0, sticky='w', pady=5)
        
        source_frame = ttk.Frame(settings_frame)
        source_frame.grid(row=row, column=1, columnspan=2, sticky='ew', pady=5)
        
        self.source_text = tk.Text(source_frame, height=3, width=50)
        self.source_text.pack(side='left', fill='both', expand=True)
        self.source_text.insert('1.0', '\n'.join(self.backup_tool.source_dirs))
        
        source_scroll = ttk.Scrollbar(source_frame, command=self.source_text.yview)
        source_scroll.pack(side='right', fill='y')
        self.source_text.config(yscrollcommand=source_scroll.set)
        
        ttk.Button(settings_frame, text="Add Directory", 
                  command=self.add_source_dir).grid(row=row, column=3, padx=5)
        
        # Backup directory
        row += 1
        ttk.Label(settings_frame, text="Backup Directory:").grid(row=row, column=0, sticky='w', pady=5)
        self.backup_dir_var = tk.StringVar(value=self.backup_tool.backup_dir)
        ttk.Entry(settings_frame, textvariable=self.backup_dir_var, 
                 width=50).grid(row=row, column=1, columnspan=2, pady=5)
        ttk.Button(settings_frame, text="Browse", 
                  command=self.browse_backup_dir).grid(row=row, column=3, padx=5)
        
        # Backup type
        row += 1
        ttk.Label(settings_frame, text="Backup Type:").grid(row=row, column=0, sticky='w', pady=5)
        self.backup_type_var = tk.StringVar(value=self.backup_tool.backup_type)
        backup_combo = ttk.Combobox(settings_frame, textvariable=self.backup_type_var,
                                    values=['incremental', 'full'], state='readonly', width=20)
        backup_combo.grid(row=row, column=1, sticky='w', pady=5)
        
        # Max backups
        row += 1
        ttk.Label(settings_frame, text="Max Backups:").grid(row=row, column=0, sticky='w', pady=5)
        self.max_backups_var = tk.StringVar(value=str(self.backup_tool.max_backups))
        ttk.Spinbox(settings_frame, textvariable=self.max_backups_var,
                   from_=1, to=100, width=10).grid(row=row, column=1, sticky='w', pady=5)
        
        # Exclude patterns
        row += 1
        ttk.Label(settings_frame, text="Exclude Patterns:").grid(row=row, column=0, sticky='w', pady=5)
        self.exclude_var = tk.StringVar(value=','.join(self.backup_tool.exclude_patterns))
        ttk.Entry(settings_frame, textvariable=self.exclude_var,
                 width=50).grid(row=row, column=1, columnspan=2, pady=5)
        
        # Schedule time
        row += 1
        ttk.Label(settings_frame, text="Schedule Time (HH:MM):").grid(row=row, column=0, sticky='w', pady=5)
        self.schedule_var = tk.StringVar(value=self.backup_tool.schedule_time)
        ttk.Entry(settings_frame, textvariable=self.schedule_var,
                 width=10).grid(row=row, column=1, sticky='w', pady=5)
        
        # Configure column weights
        settings_frame.columnconfigure(1, weight=1)
        
        # Control buttons
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill='x', padx=10, pady=5)
        
        ttk.Button(button_frame, text="Save Configuration",
                  command=self.save_config).pack(side='left', padx=5)
        
        self.backup_btn = ttk.Button(button_frame, text="Run Backup Now",
                                     command=self.run_backup)
        self.backup_btn.pack(side='left', padx=5)
        
        self.schedule_btn = ttk.Button(button_frame, text="Start Schedule",
                                       command=self.toggle_schedule)
        self.schedule_btn.pack(side='left', padx=5)
        
        ttk.Button(button_frame, text="View Log",
                  command=self.view_log).pack(side='left', padx=5)
        
        # Status display
        status_frame = ttk.LabelFrame(main_frame, text="Status", padding=10)
        status_frame.pack(fill='both', expand=True, padx=10, pady=5)
        
        self.status_text = tk.Text(status_frame, height=8, width=70)
        self.status_text.pack(side='left', fill='both', expand=True)
        
        status_scroll = ttk.Scrollbar(status_frame, command=self.status_text.yview)
        status_scroll.pack(side='right', fill='y')
        self.status_text.config(yscrollcommand=status_scroll.set)

    def create_email_tab(self):
        """Create email settings tab"""
        email_frame = ttk.Frame(self.notebook)
        self.notebook.add(email_frame, text="Email")
        
        settings_frame = ttk.LabelFrame(email_frame, text="Email Settings", padding=10)
        settings_frame.pack(fill='both', expand=True, padx=10, pady=10)
        
        # Email enabled checkbox
        self.email_enabled_var = tk.BooleanVar(value=self.backup_tool.email_enabled)
        ttk.Checkbutton(settings_frame, text="Enable Email Notifications",
                       variable=self.email_enabled_var,
                       command=self.toggle_email_fields).grid(row=0, column=0, columnspan=2, pady=10)
        
        # Email fields
        self.email_widgets = {}
        
        fields = [
            ('SMTP Server:', 'smtp_server', self.backup_tool.smtp_server, False),
            ('SMTP Port:', 'smtp_port', str(self.backup_tool.smtp_port), False),
            ('Email From:', 'smtp_user', self.backup_tool.smtp_user, False),
            ('Password:', 'smtp_password', self.backup_tool.smtp_password, True),
            ('Email To:', 'email_to', self.backup_tool.email_to, False),
        ]
        
        for i, (label, key, default, is_password) in enumerate(fields, 1):
            ttk.Label(settings_frame, text=label).grid(row=i, column=0, sticky='w', pady=5)
            
            var = tk.StringVar(value=default)
            entry = ttk.Entry(settings_frame, textvariable=var, width=40,
                            show='*' if is_password else '')
            entry.grid(row=i, column=1, pady=5, padx=5)
            
            self.email_widgets[key] = {'widget': entry, 'var': var}
        
        # Test email button
        self.test_email_btn = ttk.Button(settings_frame, text="Send Test Email",
                                         command=self.send_test_email)
        self.test_email_btn.grid(row=len(fields)+1, column=1, pady=10)
        
        # Configure column weight
        settings_frame.columnconfigure(1, weight=1)
        
        # Enable/disable fields based on checkbox
        self.toggle_email_fields()

    def create_archive_tab(self):
        """Create archive viewer tab"""
        archive_frame = ttk.Frame(self.notebook)
        self.notebook.add(archive_frame, text="Archives")
        
        # Archive selection
        select_frame = ttk.Frame(archive_frame)
        select_frame.pack(fill='x', padx=10, pady=10)
        
        ttk.Label(select_frame, text="Select Archive:").pack(side='left', padx=5)
        
        self.archive_var = tk.StringVar()
        self.archive_combo = ttk.Combobox(select_frame, textvariable=self.archive_var,
                                         state='readonly', width=50)
        self.archive_combo.pack(side='left', padx=5)
        self.archive_combo.bind('<<ComboboxSelected>>', self.view_archive)
        
        ttk.Button(select_frame, text="Refresh",
                  command=self.refresh_archives).pack(side='left', padx=5)
        
        ttk.Button(select_frame, text="Delete Selected",
                  command=self.delete_archive).pack(side='left', padx=5)
        
        # Archive contents tree
        tree_frame = ttk.LabelFrame(archive_frame, text="Archive Contents", padding=10)
        tree_frame.pack(fill='both', expand=True, padx=10, pady=5)
        
        # Create treeview with scrollbars
        tree_container = ttk.Frame(tree_frame)
        tree_container.pack(fill='both', expand=True)
        
        self.archive_tree = ttk.Treeview(tree_container, 
                                        columns=('Size', 'Modified'),
                                        show='tree headings',
                                        height=15)
        
        self.archive_tree.heading('#0', text='File Path')
        self.archive_tree.heading('Size', text='Size')
        self.archive_tree.heading('Modified', text='Modified')
        
        self.archive_tree.column('#0', width=400)
        self.archive_tree.column('Size', width=100)
        self.archive_tree.column('Modified', width=150)
        
        # Scrollbars
        vsb = ttk.Scrollbar(tree_container, orient='vertical', command=self.archive_tree.yview)
        hsb = ttk.Scrollbar(tree_container, orient='horizontal', command=self.archive_tree.xview)
        self.archive_tree.configure(yscrollcommand=vsb.set, xscrollcommand=hsb.set)
        
        # Grid layout
        self.archive_tree.grid(row=0, column=0, sticky='nsew')
        vsb.grid(row=0, column=1, sticky='ns')
        hsb.grid(row=1, column=0, sticky='ew')
        
        tree_container.grid_rowconfigure(0, weight=1)
        tree_container.grid_columnconfigure(0, weight=1)

    def add_source_dir(self):
        """Add source directory"""
        directory = filedialog.askdirectory(title="Select Source Directory")
        if directory:
            current = self.source_text.get('1.0', 'end-1c')
            if current and not current.endswith('\n'):
                current += '\n'
            self.source_text.insert('end', directory + '\n')
            self.update_status(f"Added source: {directory}")

    def browse_backup_dir(self):
        """Browse for backup directory"""
        directory = filedialog.askdirectory(title="Select Backup Directory")
        if directory:
            self.backup_dir_var.set(directory)

    def toggle_email_fields(self):
        """Enable/disable email fields based on checkbox"""
        state = 'normal' if self.email_enabled_var.get() else 'disabled'
        for widget_info in self.email_widgets.values():
            widget_info['widget'].config(state=state)
        self.test_email_btn.config(state=state)

    def send_test_email(self):
        """Send test email"""
        try:
            # Update backup tool with current email settings
            self.backup_tool.email_enabled = True
            self.backup_tool.smtp_server = self.email_widgets['smtp_server']['var'].get()
            self.backup_tool.smtp_port = int(self.email_widgets['smtp_port']['var'].get())
            self.backup_tool.smtp_user = self.email_widgets['smtp_user']['var'].get()
            self.backup_tool.smtp_password = self.email_widgets['smtp_password']['var'].get()
            self.backup_tool.email_to = self.email_widgets['email_to']['var'].get()
            
            # Send test email
            self.backup_tool.send_email("Test Email", "This is a test email from Backup Tool")
            messagebox.showinfo("Success", "Test email sent successfully")
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to send test email: {e}")

    def save_config(self):
        """Save configuration"""
        try:
            # Get source directories
            sources = self.source_text.get('1.0', 'end-1c')
            source_dirs = [s.strip() for s in sources.split('\n') if s.strip()]
            
            if not source_dirs:
                raise ValueError("At least one source directory is required")
            
            # Validate max backups
            max_backups = int(self.max_backups_var.get())
            if max_backups < 1:
                raise ValueError("Max backups must be at least 1")
            
            # Validate schedule time
            schedule_time = self.schedule_var.get()
            time.strptime(schedule_time, '%H:%M')
            
            # Build config dictionary
            config_data = {
                'SourceDirs': ','.join(source_dirs),
                'BackupDir': self.backup_dir_var.get(),
                'BackupType': self.backup_type_var.get(),
                'MaxBackups': str(max_backups),
                'ExcludePatterns': self.exclude_var.get(),
                'ScheduleTime': schedule_time,
                'EmailEnabled': str(self.email_enabled_var.get()),
                'SMTPServer': self.email_widgets['smtp_server']['var'].get(),
                'SMTPPort': self.email_widgets['smtp_port']['var'].get(),
                'SMTPUser': self.email_widgets['smtp_user']['var'].get(),
                'SMTPPassword': self.email_widgets['smtp_password']['var'].get(),
                'EmailTo': self.email_widgets['email_to']['var'].get(),
                'EmailTimezone': 'UTC'
            }
            
            # Save configuration
            self.backup_tool.save_config('backup_config.ini', config_data)
            
            self.update_status("Configuration saved successfully")
            messagebox.showinfo("Success", "Configuration saved successfully")
            
        except ValueError as e:
            messagebox.showerror("Validation Error", str(e))
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save configuration: {e}")

    def run_backup(self):
        """Run backup in separate thread"""
        if self.backup_running:
            messagebox.showwarning("Backup Running", "A backup is already in progress")
            return
        
        self.backup_running = True
        self.backup_btn.config(state='disabled')
        self.status_bar.config(text="Backup running...")
        
        def backup_thread():
            try:
                self.backup_tool.run_backup()
                self.root.after(0, self.refresh_archives)
                self.root.after(0, lambda: self.status_bar.config(text="Backup completed"))
            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror("Backup Error", str(e)))
                self.root.after(0, lambda: self.status_bar.config(text="Backup failed"))
            finally:
                self.backup_running = False
                self.root.after(0, lambda: self.backup_btn.config(state='normal'))
        
        thread = threading.Thread(target=backup_thread, daemon=True)
        thread.start()

    def toggle_schedule(self):
        """Toggle scheduled backups"""
        if self.schedule_running:
            # Stop schedule
            self.schedule_running = False
            self.backup_tool.schedule_backup(False)
            self.schedule_btn.config(text="Start Schedule")
            self.update_status("Schedule stopped")
            self.status_bar.config(text="Schedule stopped")
        else:
            # Start schedule
            try:
                self.backup_tool.schedule_backup(True)
                self.schedule_running = True
                self.schedule_btn.config(text="Stop Schedule")
                self.update_status(f"Schedule started at {self.backup_tool.schedule_time}")
                self.status_bar.config(text=f"Scheduled at {self.backup_tool.schedule_time}")
                
                # Start schedule thread
                def schedule_loop():
                    while self.schedule_running:
                        schedule.run_pending()
                        time.sleep(60)
                
                self.schedule_thread = threading.Thread(target=schedule_loop, daemon=True)
                self.schedule_thread.start()
                
            except Exception as e:
                messagebox.showerror("Schedule Error", str(e))
                self.schedule_running = False

    def view_log(self):
        """View backup log in new window"""
        try:
            log_path = Path('logs') / 'backup.log'
            
            if not log_path.exists():
                messagebox.showinfo("No Log", "No log file found")
                return
            
            # Create log window
            log_window = tk.Toplevel(self.root)
            log_window.title("Backup Log")
            log_window.geometry("800x600")
            
            # Create text widget with scrollbar
            text_frame = ttk.Frame(log_window)
            text_frame.pack(fill='both', expand=True, padx=5, pady=5)
            
            log_text = tk.Text(text_frame, wrap='none')
            log_text.pack(side='left', fill='both', expand=True)
            
            vsb = ttk.Scrollbar(text_frame, orient='vertical', command=log_text.yview)
            vsb.pack(side='right', fill='y')
            
            hsb = ttk.Scrollbar(log_window, orient='horizontal', command=log_text.xview)
            hsb.pack(side='bottom', fill='x')
            
            log_text.config(yscrollcommand=vsb.set, xscrollcommand=hsb.set)
            
            # Read and display log
            with open(log_path, 'r') as f:
                log_text.insert('1.0', f.read())
            
            log_text.config(state='disabled')
            
            # Add close button
            ttk.Button(log_window, text="Close", 
                      command=log_window.destroy).pack(pady=5)
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to open log: {e}")

    def refresh_archives(self):
        """Refresh archive list"""
        try:
            backup_dir = Path(self.backup_tool.backup_dir)
            
            if not backup_dir.exists():
                self.archive_combo['values'] = []
                return
            
            # Get all backup files
            backups = sorted([f.name for f in backup_dir.glob('backup_*.zip')], reverse=True)
            
            self.archive_combo['values'] = backups
            
            if backups and not self.archive_var.get():
                self.archive_combo.current(0)
                self.view_archive(None)
                
        except Exception as e:
            self.update_status(f"Failed to refresh archives: {e}")

    def view_archive(self, event):
        """View selected archive contents"""
        # Clear tree
        self.archive_tree.delete(*self.archive_tree.get_children())
        
        selected = self.archive_var.get()
        if not selected:
            return
        
        try:
            zip_path = Path(self.backup_tool.backup_dir) / selected
            contents = self.backup_tool.list_archive_contents(str(zip_path))
            
            # Add items to tree
            for item in contents:
                # Format size
                size = item['size']
                if size < 1024:
                    size_str = f"{size} B"
                elif size < 1024*1024:
                    size_str = f"{size/1024:.1f} KB"
                else:
                    size_str = f"{size/(1024*1024):.1f} MB"
                
                self.archive_tree.insert('', 'end', text=item['path'],
                                       values=(size_str, item['mtime']))
                
        except Exception as e:
            self.update_status(f"Failed to view archive: {e}")

    def delete_archive(self):
        """Delete selected archive"""
        selected = self.archive_var.get()
        if not selected:
            messagebox.showwarning("No Selection", "Please select an archive to delete")
            return
        
        if not messagebox.askyesno("Confirm Delete", f"Delete archive: {selected}?"):
            return
        
        try:
            archive_path = Path(self.backup_tool.backup_dir) / selected
            archive_path.unlink()
            self.update_status(f"Deleted: {selected}")
            self.refresh_archives()
            
        except Exception as e:
            messagebox.showerror("Delete Error", f"Failed to delete: {e}")

    def update_status(self, message):
        """Update status display"""
        timestamp = time.strftime('%H:%M:%S')
        self.status_text.insert('end', f"[{timestamp}] {message}\n")
        self.status_text.see('end')
        
        # Keep only last 100 messages
        lines = self.status_text.get('1.0', 'end').split('\n')
        if len(lines) > 100:
            self.status_text.delete('1.0', f"{len(lines)-100}.0")

    def on_closing(self):
        """Handle window close event"""
        if self.backup_running:
            if not messagebox.askyesno("Confirm Exit", 
                                       "A backup is running. Exit anyway?"):
                return
        
        # Stop schedule
        self.schedule_running = False
        
        # Release lock
        self.backup_tool.release_lock()
        
        # Destroy window
        self.root.destroy()


def main():
    """Main entry point"""
    root = tk.Tk()
    app = BackupGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
