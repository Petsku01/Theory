#!/usr/bin/env python3
"""
- Server Backup Tool – Modern Tkinter GUI 
- pk 

"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import threading
import time
from pathlib import Path
import sys

# --------------------------------------------------------------------------- #
# Verify dependenciesv
# --------------------------------------------------------------------------- #
try:
    import schedule
except ImportError:
    messagebox.showerror("Missing Dependency", "Please install 'schedule':\n\npip install schedule")
    sys.exit(1)

try:
    from backup_tool import BackupTool
except ImportError:
    messagebox.showerror("Missing File", "backup_tool.py not found in the current directory")
    sys.exit(1)


# --------------------------------------------------------------------------- #
# GUI Application
# --------------------------------------------------------------------------- #
class BackupGUI:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Server Backup Tool")
        self.root.geometry("900x650")
        self.root.minsize(800, 600)

        self.backup_running = False
        self.scheduler_running = False
        self.scheduler_thread: threading.Thread | None = None

        # Initialize core tool with GUI progress callback
        self.tool = BackupTool(progress_callback=self.log)

        self._build_ui()
        self.refresh_archive_list()

        # Graceful shutdown
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

    def _build_ui(self):
        style = ttk.Style()
        style.theme_use('clam')  # looks good on all platforms

        notebook = ttk.Notebook(self.root)
        notebook.pack(fill='both', expand=True, padx=10, pady=10)

        self._create_settings_tab(notebook)
        self._create_email_tab(notebook)
        self._create_archives_tab(notebook)

        # Bottom status bar + buttons
        bottom = ttk.Frame(self.root)
        bottom.pack(fill='x', side='bottom', padx=10, pady=(0, 10))

        self.status_var = tk.StringVar(value="Ready")
        status_bar = ttk.Label(bottom, textvariable=self.status_var, relief='sunken', anchor='w')
        status_bar.pack(fill='x', side='bottom')

        btn_frame = ttk.Frame(bottom)
        btn_frame.pack(pady=5)

        ttk.Button(btn_frame, text="Run Backup Now", command=self.start_backup).pack(side='left', padx=5)
        self.schedule_btn = ttk.Button(btn_frame, text="Start Scheduler", command=self.toggle_scheduler)
        self.schedule_btn.pack(side='left', padx=5)
        ttk.Button(btn_frame, text="View Log", command=self.show_log).pack(side='left', padx=5)

        # Log area (shared across tabs)
        log_frame = ttk.LabelFrame(self.root, text="Log Output")
        log_frame.pack(fill='both', expand=True, padx=10, pady=(0, 10))

        self.log_text = tk.Text(log_frame, height=10, state='disabled', wrap='word')
        self.log_text.pack(side='left', fill='both', expand=True)

        scrollbar = ttk.Scrollbar(log_frame, command=self.log_text.yview)
        scrollbar.pack(side='right', fill='y')
        self.log_text.config(yscrollcommand=scrollbar.set)

    # ----------------------------------------------------------------------- #
    # Tabs
    # ----------------------------------------------------------------------- #
    def _create_settings_tab(self, parent):
        frame = ttk.Frame(parent)
        parent.add(frame, text="Settings")

        lf = ttk.LabelFrame(frame, text="Backup Configuration")
        lf.pack(fill='both', expand=True, padx=15, pady=15)

        # Source directories
        ttk.Label(lf, text="Source Directories (one per line):").grid(row=0, column=0, sticky='w', pady=5)
        src_frame = ttk.Frame(lf)
        src_frame.grid(row=1, column=0, columnspan=3, sticky='ew', pady=5)
        self.src_text = tk.Text(src_frame, height=5)
        self.src_text.pack(side='left', fill='both', expand=True)
        self.src_text.insert('1.0', '\n'.join(self.tool.source_dirs))

        src_sb = ttk.Scrollbar(src_frame, command=self.src_text.yview)
        src_sb.pack(side='right', fill='y')
        self.src_text.config(yscrollcommand=src_sb.set)

        ttk.Button(lf, text="Add Folder", command=self.add_source_folder).grid(row=0, column=3, padx=10)

        # Backup directory
        ttk.Label(lf, text="Backup Directory:").grid(row=2, column=0, sticky='w', pady=8)
        self.backup_dir_var = tk.StringVar(value=self.tool.backup_dir)
        ttk.Entry(lf, textvariable=self.backup_dir_var, width=60).grid(row=2, column=1, columnspan=2, sticky='ew', pady=8)
        ttk.Button(lf, text="Browse", command=self.browse_backup_dir).grid(row=2, column=3, padx=10)

        # Other settings
        row = 3
        for label, var, values in [
            ("Backup Type:", ("incremental", "full"), self.tool.backup_type),
            ("Max Backups:", None, str(self.tool.max_backups)),
            ("Exclude Patterns (comma-separated):", None, ', '.join(self.tool.exclude_patterns)),
            ("Daily Schedule (HH:MM 24h):", None, self.tool.schedule_time),
        ]:
            ttk.Label(lf, text=label).grid(row=row, column=0, sticky='w', pady=6)
            if values is None:
                var = tk.StringVar(value=var)
                ttk.Entry(lf, textvariable=var, width=30).grid(row=row, column=1, sticky='w')
                setattr(self, f"var_{row}", var)
            else:
                var = tk.StringVar(value=var)
                cb = ttk.Combobox(lf, textvariable=var, values=values, state='readonly', width=20)
                cb.grid(row=row, column=1, sticky='w')
                setattr(self, f"var_{row}", var)
            row += 1

        lf.columnconfigure(1, weight=1)

        ttk.Button(lf, text="Save Configuration", command=self.save_config).grid(row=10, column=0, columnspan=4, pady=20)

    def _create_email_tab(self, parent):
        frame = ttk.Frame(parent)
        parent.add(frame, text="Email Notifications")

        lf = ttk.LabelFrame(frame, text="SMTP Settings")
        lf.pack(fill='both', expand=True, padx=15, pady=15)

        self.email_enabled_var = tk.BooleanVar(value=self.tool.email_enabled)
        ttk.Checkbutton(lf, text="Enable email notifications", variable=self.email_enabled_var,
                        command=self._toggle_email_fields).grid(row=0, column=0, columnspan=2, sticky='w', pady=10)

        fields = [
            ("SMTP Server:", "smtp_server", self.tool.smtp_server),
            ("Port:", "smtp_port", str(self.tool.smtp_port)),
            ("Username (From):", "smtp_user", self.tool.smtp_user),
            ("Password:", "smtp_password", self.tool.smtp_password),
            ("Send To:", "email_to", self.tool.email_to),
        ]

        self.email_vars = {}
        for r, (label, key, default) in enumerate(fields, 1):
            ttk.Label(lf, text=label).grid(row=r, column=0, sticky='w', pady=4, padx=5)
            var = tk.StringVar(value=default)
            entry = ttk.Entry(lf, textvariable=var, width=40, show='*' if 'password' in key else '')
            entry.grid(row=r, column=1, sticky='ew', pady=4, padx=5)
            self.email_vars[key] = var

        ttk.Button(lf, text="Send Test Email", command=self.send_test_email).grid(row=10, column=1, pady=15)

        lf.columnconfigure(1, weight=1)
        self._toggle_email_fields()  # initial state

    def _create_archives_tab(self, parent):
        frame = ttk.Frame(parent)
        parent.add(frame, text="Archives")

        top = ttk.Frame(frame)
        top.pack(fill='x', padx=15, pady=10)

        ttk.Label(top, text="Archive:").pack(side='left')
        self.archive_combo = ttk.Combobox(top, state='readonly', width=60)
        self.archive_combo.pack(side='left', padx=10)
        self.archive_combo.bind('<<ComboboxSelected>>', self.load_archive_contents)

        ttk.Button(top, text="Refresh", command=self.refresh_archive_list).pack(side='left', padx=5)
        ttk.Button(top, text="Delete Selected", command=self.delete_selected_archive).pack(side='left', padx=5)

        tree_frame = ttk.Frame(frame)
        tree_frame.pack(fill='both', expand=True, padx=15, pady=10)

        self.tree = ttk.Treeview(tree_frame, columns=('Size', 'Date'), show='headings')
        self.tree.heading('Size', text='Size')
        self.tree.heading('Date', text='Modified')
        self.tree.column('Size', width=100, anchor='e')
        self.tree.column('Date', width=150, anchor='center')

        vsb = ttk.Scrollbar(tree_frame, orient='vertical', command=self.tree.yview)
        hsb = ttk.Scrollbar(frame, orient='horizontal', command=self.tree.xview)
        self.tree.configure(yscrollcommand=vsb.set, xscrollcommand=hsb.set)

        self.tree.pack(side='left', fill='both', expand=True)
        vsb.pack(side='right', fill='y')
        hsb.pack(side='bottom', fill='x')

    # ----------------------------------------------------------------------- #
    # Helpers
    # ----------------------------------------------------------------------- #
    def log(self, message: str):
        """Thread-safe log append"""
        def _do():
            timestamp = time.strftime("%H:%M:%S")
            self.log_text.config(state='normal')
            self.log_text.insert('end', f"[{timestamp}] {message}\n")
            self.log_text.see('end')
            self.log_text.config(state='disabled')
        self.root.after(0, _do)

    def add_source_folder(self):
        folder = filedialog.askdirectory()
        if folder:
            self.src_text.insert('end', folder + '\n')
            self.log(f"Added source folder: {folder}")

    def browse_backup_dir(self):
        folder = filedialog.askdirectory()
        if folder:
            self.backup_dir_var.set(folder)

    def _toggle_email_fields(self):
        state = 'normal' if self.email_enabled_var.get() else 'disabled'
        for var in self.email_vars.values():
            var.widget.config(state=state)

    def save_config(self):
        try:
            sources = [line.strip() for line in self.src_text.get('1.0', 'end-1c').splitlines() if line.strip()]
            if not sources:
                raise ValueError("At least one source directory required")

            config_data = {
                'SourceDirs': ','.join(sources),
                'BackupDir': self.backup_dir_var.get(),
                'BackupType': self.var_3.get(),           # backup type
                'MaxBackups': self.var_4.get(),
                'ExcludePatterns': self.var_5.get(),
                'ScheduleTime': self.var_6.get(),
                'EmailEnabled': str(self.email_enabled_var.get()),
                'SMTPServer': self.email_vars['smtp_server'].get(),
                'SMTPPort': self.email_vars['smtp_port'].get(),
                'SMTPUser': self.email_vars['smtp_user'].get(),
                'SMTPPassword': self.email_vars['smtp_password'].get(),
                'EmailTo': self.email_vars['email_to'].get(),
                'EmailTimezone': 'UTC',
            }

            self.tool.save_config('backup_config.ini', config_data)
            self.log("Configuration saved")
            messagebox.showinfo("Success", "Configuration saved successfully")
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def send_test_email(self):
        if not self.email_enabled_var.get():
            return
        try:
            self.tool.email_enabled = True
            self.tool.smtp_server = self.email_vars['smtp_server'].get()
            self.tool.smtp_port = int(self.email_vars['smtp_port'].get())
            self.tool.smtp_user = self.email_vars['smtp_user'].get()
            self.tool.smtp_password = self.email_vars['smtp_password'].get()
            self.tool.email_to = self.email_vars['email_to'].get()

            self.tool.send_email("Backup Tool – Test", "Test email sent from GUI at " + time.strftime("%c"))
            messagebox.showinfo("Success", "Test email sent")
        except Exception as e:
            messagebox.showerror("Failed", f"Could not send test email:\n{e}")

    # ----------------------------------------------------------------------- #
    # Backup & Scheduler
    # ----------------------------------------------------------------------- #
    def start_backup(self):
        if self.backup_running:
            return
        self.backup_running = True
        self.schedule_btn.config(state='disabled')

        def run():
            try:
                self.tool.run_backup()
            finally:
                self.backup_running = False
                self.root.after(0, lambda: self.schedule_btn.config(state='normal'))
                self.root.after(0, self.refresh_archive_list)

        threading.Thread(target=run, daemon=True).start()

    def toggle_scheduler(self):
        if self.scheduler_running:
            self.scheduler_running = False
            self.schedule_btn.config(text="Start Scheduler")
            self.log("Scheduler stopped")
            self.status_var.set("Scheduler stopped")
        else:
            try:
                time.strptime(self.var_6.get(), "%H:%M")  # validate format
                self.tool.schedule_backup(True)
                self.scheduler_running = True
                self.schedule_btn.config(text="Stop Scheduler")
                self.log(f"Scheduler started – daily at {self.var_6.get()}")
                self.status_var.set(f"Scheduled daily at {self.var_6.get()}")

                def loop():
                    while self.scheduler_running:
                        schedule.run_pending()
                        time.sleep(1)
                threading.Thread(target=loop, daemon=True).start()
            except ValueError:
                messagebox.showerror("Invalid Time", "Schedule time must be HH:MM (24h)")

    # ----------------------------------------------------------------------- #
    # Archives tab
    # ----------------------------------------------------------------------- #
    def refresh_archive_list(self):
        path = Path(self.tool.backup_dir)
        if not path.exists():
            self.archive_combo['values'] = []
            return
        archives = sorted(path.glob("backup_*.zip"), key=lambda p: p.stat().st_mtime, reverse=True)
        names = [p.name for p in archives]
        self.archive_combo['values'] = names
        if names:
            self.archive_combo.current(0)
            self.load_archive_contents()

    def load_archive_contents(self, _=None):
        for item in self.tree.get_children():
            self.tree.delete(item)

        name = self.archive_combo.get()
        if not name:
            return

        zip_path = Path(self.tool.backup_dir) / name
        try:
            contents = self.tool.list_archive_contents(str(zip_path))
            for info in contents:
                size_mb = info['size'] / (1024 * 1024)
                size_str = f"{size_mb:.2f} MB" if size_mb >= 1 else f"{info['size']/1024:.1f} KB"
                self.tree.insert('', 'end', values=(size_str, info['mtime']), text=info['path'])
        except Exception as e:
            self.log(f"Error reading archive: {e}")

    def delete_selected_archive(self):
        name = self.archive_combo.get()
        if not name or not messagebox.askyesno("Confirm Delete", f"Delete {name}?"):
            return
        try:
            (Path(self.tool.backup_dir) / name).unlink()
            self.log(f"Deleted {name}")
            self.refresh_archive_list()
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def show_log(self):
        try:
            log_path = Path("logs/backup.log")
            if log_path.exists():
                win = tk.Toplevel(self.root)
                win.title("Backup Log")
                win.geometry("1000x700")
                txt = tk.Text(win, wrap='none')
                txt.pack(fill='both', expand=True)
                with open(log_path, encoding="utf-8") as f:
                    txt.insert('1.0', f.read())
                txt.config(state='disabled')
            else:
                messagebox.showinfo("Log", "No log file yet")
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def _on_close(self):
        if self.backup_running and not messagebox.askyesno("Backup running", "Backup in progress. Exit anyway?"):
            return
        self.scheduler_running = False
        self.tool._release_lock()
        self.root.destroy()


# --------------------------------------------------------------------------- #
if __name__ == "__main__":
    root = tk.Tk()
    app = BackupGUI(root)
    root.mainloop()
