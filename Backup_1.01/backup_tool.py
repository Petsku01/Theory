import os
import shutil
import zipfile
import datetime
import logging
import logging.handlers
import configparser
import platform
import schedule
import time
import smtplib
import sys
import fcntl  # Unix only
import msvcrt  # Windows only
import signal
import socket
from email.mime.text import MIMEText
from pathlib import Path
import fnmatch
from tqdm import tqdm
import pytz

try:
    import schedule
    import tqdm
    import pytz
except ImportError as e:
    print(f"Missing required package: {str(e)}. Install with 'pip install configparser schedule tqdm pytz'")
    sys.exit(1)

class BackupTool:
    def __init__(self, config_file='backup_config.ini', progress_callback=None, progress_interval=100):
        self.progress_callback = progress_callback  # Note: Called from multiple threads, relies on Tkinter's thread safety
        self.progress_interval = progress_interval  # Files processed before callback
        self.setup_logging()
        self.lock_file = 'backup_tool.lock'
        self.lock_acquired = False
        self.acquire_lock()
        try:
            self.load_config(config_file)
            self.system = platform.system().lower()
            self.interactive = sys.stdout.isatty()
            if self.system == 'windows':
                self.enable_long_paths()
        except Exception as e:
            self.release_lock()
            raise

    def setup_logging(self):
        """Configure logging with rotation"""
        log_dir = 'logs'
        os.makedirs(log_dir, exist_ok=True)
        if not os.access(log_dir, os.W_OK):
            raise PermissionError(f"No write permission for log directory: {log_dir}")
        log_file = os.path.join(log_dir, 'backup.log')
        handler = logging.handlers.RotatingFileHandler(log_file, maxBytes=10*1024*1024, backupCount=5)
        logging.basicConfig(
            handlers=[handler],
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)

    def acquire_lock(self):
        """Acquire a file lock to prevent concurrent runs (optional for GUI)"""
        if self.progress_callback:  # Skip lock for GUI
            return
        if self.system == 'linux':
            try:
                self.lock_fd = os.open(self.lock_file, os.O_CREAT | os.O_WRONLY | os.O_EXCL, 0o600)
                fcntl.flock(self.lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                self.lock_acquired = True
            except (IOError, OSError) as e:
                if hasattr(self, 'lock_fd'):
                    os.close(self.lock_fd)
                    try:
                        os.remove(self.lock_file)
                    except OSError:
                        pass
                self.logger.error(f"Another backup instance is running: {str(e)}")
                sys.exit(1)
        elif self.system == 'windows':
            try:
                self.lock_fd = os.open(self.lock_file, os.O_CREAT | os.O_WRONLY | os.O_EXCL | os.O_BINARY)
                msvcrt.locking(self.lock_fd, msvcrt.LK_NBLCK, 1)
                self.lock_acquired = True
            except (IOError, OSError) as e:
                if hasattr(self, 'lock_fd'):
                    os.close(self.lock_fd)
                    try:
                        os.remove(self.lock_file)
                    except OSError:
                        pass
                self.logger.error(f"Another backup instance is running: {str(e)}")
                sys.exit(1)

    def release_lock(self):
        """Release the file lock"""
        if not self.lock_acquired:
            return
        if self.system == 'linux':
            fcntl.flock(self.lock_fd, fcntl.LOCK_UN)
            os.close(self.lock_fd)
        elif self.system == 'windows':
            try:
                os.lseek(self.lock_fd, 0, os.SEEK_SET)
                msvcrt.locking(self.lock_fd, msvcrt.LK_UNLCK, 1)
            except OSError:
                pass
            finally:
                os.close(self.lock_fd)
        try:
            os.remove(self.lock_file)
        except OSError:
            pass
        self.lock_acquired = False

    def enable_long_paths(self):
        """Enable long path support on Windows"""
        if self.system == 'windows':
            try:
                import ctypes
                kernel32 = ctypes.WinDLL('kernel32')
                kernel32.SetErrorMode(0x8000)
            except Exception as e:
                self.logger.warning(f"Could not enable long path support: {str(e)}")

    def load_config(self, config_file):
        """Load and validate configuration from INI file"""
        config = configparser.ConfigParser()
        if not os.path.exists(config_file):
            self.create_default_config(config_file)
        config.read(config_file)
        
        self.source_dirs = [d.strip() for d in config['DEFAULT']['SourceDirs'].split(',')]
        self.backup_dir = config['DEFAULT']['BackupDir']
        self.backup_type = config['DEFAULT']['BackupType'].lower()
        self.max_backups = int(config['DEFAULT']['MaxBackups'])
        self.exclude_patterns = [p.strip() for p in config['DEFAULT'].get('ExcludePatterns', '').split(',') if p.strip()]
        self.schedule_time = config['DEFAULT'].get('ScheduleTime', '02:00')
        self.email_enabled = config['DEFAULT'].getboolean('EmailEnabled', False)
        self.smtp_server = config['DEFAULT'].get('SMTPServer', '')
        self.smtp_port = config['DEFAULT'].getint('SMTPPort', 587)
        self.smtp_user = config['DEFAULT'].get('SMTPUser', '')
        self.smtp_password = config['DEFAULT'].get('SMTPPassword', '')
        self.email_to = config['DEFAULT'].get('EmailTo', '')
        self.use_progress_bar = config['DEFAULT'].getboolean('UseProgressBar', True)
        self.email_timezone = config['DEFAULT'].get('EmailTimezone', 'UTC')
        
        # Create backup directory
        os.makedirs(self.backup_dir, exist_ok=True)
        if not os.access(self.backup_dir, os.W_OK | os.X_OK):
            raise PermissionError(f"No write permission for backup directory: {self.backup_dir}")
        
        # Validate source directories
        valid_source_dirs = []
        for source_dir in self.source_dirs:
            if os.path.exists(source_dir) and os.access(source_dir, os.R_OK):
                if self.system == 'windows' and len(source_dir) > 260:
                    self.logger.warning(f"Source path exceeds 260 characters but may work with long path support enabled: {source_dir}")
                valid_source_dirs.append(source_dir)
            else:
                self.logger.warning(f"Skipping invalid or inaccessible source directory: {source_dir}")
        if not valid_source_dirs:
            raise ValueError("No valid source directories specified")
        self.source_dirs = valid_source_dirs
        
        # Validates the email configuration
        if self.email_enabled:
            if not all([self.smtp_server, self.smtp_user, self.smtp_password, self.email_to]):
                self.logger.warning("Incomplete email configuration; disabling email notifications")
                self.email_enabled = False
        
        # Validates schedule times
        try:
            datetime.datetime.strptime(self.schedule_time, '%H:%M')
        except ValueError:
            self.logger.warning(f"Invalid ScheduleTime format: {self.schedule_time}. Using default '02:00'")
            self.schedule_time = '02:00'
        
        # Validate email timezone
        try:
            self.tz = pytz.timezone(self.email_timezone)
            self.email_timezone = self.tz.zone  # Ensure consistency
        except pytz.exceptions.UnknownTimeZoneError:
            self.logger.warning(f"Invalid EmailTimezone: {self.email_timezone}. Using UTC")
            self.email_timezone = 'UTC'
            self.tz = pytz.UTC
        
        self.logger.info(f"Loaded config: Source={self.source_dirs}, Destination={self.backup_dir}")

    def save_config(self, config_file, config_data):
        """Save configuration to INI file"""
        config = configparser.ConfigParser()
        config['DEFAULT'] = config_data
        with open(config_file, 'w') as f:
            config.write(f)
        self.logger.info(f"Saved config to {config_file}")
        self.load_config(config_file)

    def create_default_config(self, config_file):
        """Create a default configuration file"""
        config = configparser.ConfigParser()
        config['DEFAULT'] = {
            'SourceDirs': '/home/user/data,/var/www' if self.system == 'linux' else 'C:\\Users\\user\\Documents,D:\\Data',
            'BackupDir': '/backups' if self.system == 'linux' else 'D:\\Backups',
            'BackupType': 'incremental',
            'MaxBackups': '5',
            'ExcludePatterns': '*.log,*.tmp,*.bak',
            'ScheduleTime': '02:00',
            'EmailEnabled': 'False',
            'SMTPServer': 'smtp.gmail.com',
            'SMTPPort': '587',
            'SMTPUser': 'your.email@gmail.com',
            'SMTPPassword': 'your_password',
            'EmailTo': 'admin@domain.com',
            'UseProgressBar': 'True',
            'EmailTimezone': 'UTC'
        }
        with open(config_file, 'w') as f:
            config.write(f)
        self.logger.info(f"Created default config at {config_file}")

    def create_zip(self, files, backup_name):
        """Create a zip archive of specified files with batched progress updates"""
        if not files:
            self.logger.info("No files to include in zip")
            if self.progress_callback:
                self.progress_callback("No files to backup")
            return None
        zip_path = os.path.join(self.backup_dir, f"{backup_name}.zip")
        file_count = len(files)
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            iterable = tqdm(files, desc="Compressing files") if self.use_progress_bar and self.interactive else files
            for i, file in enumerate(iterable):
                if os.path.exists(file):
                    try:
                        rel_path = file
                        try:
                            common_path = os.path.dirname(os.path.commonpath([file]))
                            rel_path = os.path.relpath(file, common_path)
                        except ValueError:
                            pass
                        zipf.write(file, rel_path)
                        self.logger.info(f"Added {file} to backup")
                        if self.progress_callback and (i % self.progress_interval == 0 or i == file_count - 1):
                            self.progress_callback(f"Processed {i + 1}/{file_count} files")
                    except PermissionError as e:
                        self.logger.error(f"Permission denied for file {file}: {str(e)}")
                        if self.progress_callback:
                            self.progress_callback(f"Error: Permission denied for {file}")
                    except OSError as e:
                        self.logger.error(f"Failed to add file {file} to backup: {str(e)}")
                        if self.progress_callback:
                            self.progress_callback(f"Error: Failed to add {file}")
        return zip_path

    def verify_backup(self, zip_path, files):
        """Verify backup integrity and contents"""
        if not zip_path or not os.path.exists(zip_path):
            return False
        try:
            with zipfile.ZipFile(zip_path, 'r') as zipf:
                if zipf.testzip() is not None:
                    self.logger.error(f"Backup integrity check failed for {zip_path}")
                    if self.progress_callback:
                        self.progress_callback(f"Backup integrity check failed for {zip_path}")
                    return False
                zip_files = {os.path.normpath(f) for f in zipf.namelist()}
                expected_files = set()
                for f in files:
                    try:
                        common_path = os.path.dirname(os.path.commonpath([f]))
                        expected_files.add(os.path.normpath(os.path.relpath(f, common_path)))
                    except ValueError:
                        expected_files.add(os.path.normpath(f))
                missing_files = expected_files - zip_files
                if missing_files:
                    self.logger.error(f"Missing files in backup {zip_path}: {missing_files}")
                    if self.progress_callback:
                        self.progress_callback(f"Missing files in {zip_path}: {missing_files}")
                    return False
                self.logger.info(f"Backup verification successful for {zip_path}")
                if self.progress_callback:
                    self.progress_callback(f"Backup verification successful for {zip_path}")
                return True
        except zipfile.BadZipFile as e:
            self.logger.error(f"Invalid zip file {zip_path}: {str(e)}")
            if self.progress_callback:
                self.progress_callback(f"Invalid zip file: {zip_path}")
            return False
        except Exception as e:
            self.logger.error(f"Backup verification error for {zip_path}: {str(e)}")
            if self.progress_callback:
                self.progress_callback(f"Verification error for {zip_path}: {str(e)}")
            return False

    def should_exclude(self, file_path):
        """Check if file should be excluded based on patterns (case-insensitive)"""
        file_name = os.path.basename(file_path).lower()
        return any(fnmatch.fnmatch(file_name, pattern.strip().lower(), flags=fnmatch.FNM_CASEFOLD) 
                  for pattern in self.exclude_patterns if pattern.strip())

    def get_files_to_backup(self, source_dir, last_backup_time=None):
        """Get list of files to backup with batched progress updates"""
        files_to_backup = []
        file_count = 0
        found_files = False
        for root, _, files in os.walk(source_dir):
            found_files = True
            for file in files:
                file_path = os.path.join(root, file)
                if self.should_exclude(file_path):
                    continue
                try:
                    if self.backup_type == 'incremental' and last_backup_time:
                        file_mtime = datetime.datetime.fromtimestamp(os.path.getmtime(file_path), tz=pytz.UTC)
                        if file_mtime > last_backup_time:
                            files_to_backup.append(file_path)
                    else:
                        files_to_backup.append(file_path)
                    file_count += 1
                    if self.progress_callback and file_count % self.progress_interval == 0:
                        self.progress_callback(f"Scanned {file_count} files in {source_dir}")
                except (PermissionError, OSError) as e:
                    self.logger.error(f"Cannot access file {file_path}: {str(e)}")
                    if self.progress_callback:
                        self.progress_callback(f"Error: Cannot access {file_path}")
        if not found_files:
            self.logger.info(f"No files found in source directory: {source_dir}")
            if self.progress_callback:
                self.progress_callback(f"No files found in {source_dir}")
        return files_to_backup

    def cleanup_old_backups(self):
        """Remove old backups if exceeding max_backups limit"""
        backups = sorted([f for f in os.listdir(self.backup_dir) if f.endswith('.zip')])
        while len(backups) > self.max_backups:
            oldest_backup = backups.pop(0)
            backup_path = os.path.join(self.backup_dir, oldest_backup)
            try:
                os.remove(backup_path)
                self.logger.info(f"Removed old backup: {oldest_backup}")
                if self.progress_callback:
                    self.progress_callback(f"Removed old backup: {oldest_backup}")
            except Exception as e:
                self.logger.error(f"Failed to remove old backup {oldest_backup}: {str(e)}")
                if self.progress_callback:
                    self.progress_callback(f"Error: Failed to remove {oldest_backup}")

    def send_email_notification(self, status, message):
        """Send email notification about backup status"""
        if not self.email_enabled:
            return
        try:
            timestamp = datetime.datetime.now(self.tz).strftime('%Y-%m-%d %H:%M:%S %Z')
            msg = MIMEText(message)
            msg['Subject'] = f"Backup {status} - {timestamp}"
            msg['From'] = self.smtp_user
            msg['To'] = self.email_to

            # Set socket timeout for all SMTP operations
            socket.setdefaulttimeout(10)
            try:
                with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                    server.starttls()
                    server.login(self.smtp_user, self.smtp_password)
                    server.send_message(msg)
                self.logger.info(f"Sent {status} email notification")
                if self.progress_callback:
                    self.progress_callback(f"Sent {status} email notification")
            finally:
                socket.setdefaulttimeout(None)
        except Exception as e:
            self.logger.error(f"Email notification failed: {str(e)}")
            if self.progress_callback:
                self.progress_callback(f"Email notification failed: {str(e)}")

    def list_archive_contents(self, zip_path):
        """List contents of a backup zip archive"""
        try:
            with zipfile.ZipFile(zip_path, 'r') as zipf:
                contents = []
                for info in zipf.infolist():
                    if not info.is_dir():
                        # Sanitize filename to prevent path traversal
                        safe_path = os.path.normpath(info.filename).lstrip(os.sep).lstrip(os.pardir)
                        if '..' in safe_path or safe_path.startswith(os.sep) or safe_path.startswith(os.pardir):
                            self.logger.warning(f"Suspicious path in archive {zip_path}: {info.filename}")
                            continue
                        size = info.file_size
                        date_time = datetime.datetime(*info.date_time, tzinfo=pytz.UTC).astimezone(self.tz)
                        contents.append({
                            'path': safe_path,
                            'size': size,
                            'mtime': date_time.strftime('%Y-%m-%d %H:%M:%S %Z')
                        })
                return contents
        except zipfile.BadZipFile as e:
            self.logger.error(f"Invalid zip file {zip_path}: {str(e)}")
            if self.progress_callback:
                self.progress_callback(f"Invalid zip file: {zip_path}")
            return []
        except Exception as e:
            self.logger.error(f"Failed to read archive {zip_path}: {str(e)}")
            if self.progress_callback:
                self.progress_callback(f"Error reading archive {zip_path}: {str(e)}")
            return []

    def run_backup(self):
        """Execute the backup process"""
        try:
            if self.progress_callback:
                self.progress_callback("Starting backup...")
            timestamp = datetime.datetime.now(tz=pytz.UTC).strftime("%Y%m%d_%H%M%S")
            last_backup_time = None
            
            if self.backup_type == 'incremental':
                backups = [f for f in os.listdir(self.backup_dir) if f.endswith('.zip')]
                if backups:
                    latest_backup = max(backups)
                    last_backup_time = datetime.datetime.fromtimestamp(
                        os.path.getmtime(os.path.join(self.backup_dir, latest_backup)), tz=pytz.UTC)

            all_files = []
            for source_dir in self.source_dirs:
                files = self.get_files_to_backup(source_dir, last_backup_time)
                all_files.extend(files)

            if not all_files:
                self.logger.info("No files to backup across all source directories")
                self.send_email_notification("Info", "No files needed backup")
                if self.progress_callback:
                    self.progress_callback("No files to backup")
                return

            backup_name = f"backup_{timestamp}"
            zip_path = self.create_zip(all_files, backup_name)
            
            if zip_path and self.verify_backup(zip_path, all_files):
                self.logger.info(f"Created and verified backup: {zip_path}")
                self.cleanup_old_backups()
                self.send_email_notification("Success", f"Backup completed: {zip_path}")
            else:
                self.send_email_notification("Failure", f"Backup verification failed: {zip_path}")
                if self.progress_callback:
                    self.progress_callback(f"Backup failed: Verification error for {zip_path}")
                raise Exception("Backup verification failed")

            self.logger.info("Backup completed successfully")
            if self.progress_callback:
                self.progress_callback("Backup completed successfully")

        except Exception as e:
            self.logger.error(f"Backup failed: {str(e)}")
            self.send_email_notification("Failure", f"Backup failed: {str(e)}")
            if self.progress_callback:
                self.progress_callback(f"Backup failed: {str(e)}")
            raise
        finally:
            self.release_lock()

    def schedule_backup(self, enable=True):
        """Enable or disable scheduled backup"""
        if enable:
            schedule.every().day.at(self.schedule_time).do(self.run_backup)
            self.logger.info(f"Scheduled daily backup at {self.schedule_time}")
            if self.progress_callback:
                self.progress_callback(f"Scheduled backup at {self.schedule_time}")
        else:
            schedule.clear()
            self.logger.info("Scheduled backup disabled")
            if self.progress_callback:
                self.progress_callback("Scheduled backup disabled")

    def run_scheduled_backup(self):
        """Run a single scheduled backup for external schedulers"""
        try:
            self.run_backup()
        except Exception as e:
            self.logger.error(f"Scheduled backup failed: {str(e)}")
            if self.progress_callback:
                self.progress_callback(f"Scheduled backup failed: {str(e)}")
            raise

    def handle_signal(self, signum, frame):
        """Handle termination signals"""
        self.logger.info(f"Received signal {signum}, shutting down")
        # Close logging handlers
        for handler in self.logger.handlers:
            try:
                handler.close()
            except Exception:
                pass
        self.release_lock()
        sys.exit(0)

if __name__ == "__main__":
    try:
        backup = BackupTool()
        # Register signal handlers
        signal.signal(signal.SIGINT, backup.handle_signal)
        signal.signal(signal.SIGTERM, backup.handle_signal)
        if len(sys.argv) > 1 and sys.argv[1] == '--schedule':
            backup.schedule_backup()
            while True:
                try:
                    schedule.run_pending()
                    time.sleep(60)
                except Exception as e:
                    logging.error(f"Schedule error: {str(e)}")
                    time.sleep(60)
        elif len(sys.argv) > 1 and sys.argv[1] == '--single-schedule':
            backup.run_scheduled_backup()
        else:
            backup.run_backup()
    except Exception as e:
        logging.error(f"Startup failed: {str(e)}")
        sys.exit(1)
