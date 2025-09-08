#!/usr/bin/env python3
"""
Server Backup Tool - Core backup functionality

"""

import os
import sys
import zipfile
import datetime
import logging
import logging.handlers
import configparser
import platform
import time
import signal
import fnmatch
from pathlib import Path

# Check for required packages
required_packages = []
try:
    import schedule
except ImportError:
    required_packages.append('schedule')

try:
    import pytz
except ImportError:
    required_packages.append('pytz')

if required_packages:
    print(f"Missing required packages: {', '.join(required_packages)}")
    print(f"Install with: pip install {' '.join(required_packages)}")
    sys.exit(1)

# Platform-specific imports for file locking
if platform.system() == 'Windows':
    try:
        import msvcrt
    except ImportError:
        msvcrt = None
else:
    try:
        import fcntl
    except ImportError:
        fcntl = None


class BackupTool:
    def __init__(self, config_file='backup_config.ini', progress_callback=None):
        """Initialize backup tool with configuration"""
        self.progress_callback = progress_callback
        self.system = platform.system().lower()
        self.lock_fd = None
        self.config_file = config_file
        
        # Setup logging first
        self.setup_logging()
        
        # Initialize with defaults
        self.set_defaults()
        
        # Try to acquire lock (skip for GUI)
        if not progress_callback:
            self.acquire_lock()
        
        # Load configuration
        try:
            self.load_config(config_file)
        except Exception as e:
            self.logger.error(f"Config load failed: {e}")
            if not progress_callback:
                self.release_lock()
            raise

    def set_defaults(self):
        """Set default values for all attributes"""
        self.source_dirs = []
        self.backup_dir = './backups'
        self.backup_type = 'incremental'
        self.max_backups = 5
        self.exclude_patterns = []
        self.schedule_time = '02:00'
        self.email_enabled = False
        self.smtp_server = ''
        self.smtp_port = 587
        self.smtp_user = ''
        self.smtp_password = ''
        self.email_to = ''
        self.tz = pytz.UTC

    def setup_logging(self):
        """Configure logging with rotation"""
        log_dir = Path('logs')
        log_dir.mkdir(exist_ok=True)
        
        log_file = log_dir / 'backup.log'
        
        # Create formatter
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        
        # Setup rotating file handler
        try:
            handler = logging.handlers.RotatingFileHandler(
                str(log_file), maxBytes=10*1024*1024, backupCount=5
            )
            handler.setFormatter(formatter)
            
            # Setup logger
            self.logger = logging.getLogger('BackupTool')
            self.logger.setLevel(logging.INFO)
            self.logger.addHandler(handler)
            
        except Exception as e:
            # Fallback to console logging if file logging fails
            self.logger = logging.getLogger('BackupTool')
            self.logger.setLevel(logging.INFO)
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(formatter)
            self.logger.addHandler(console_handler)
            self.logger.warning(f"File logging failed, using console: {e}")

    def acquire_lock(self):
        """Prevent concurrent runs using file lock"""
        lock_file = Path('backup.lock')
        
        try:
            # Try to create lock file exclusively
            self.lock_fd = os.open(str(lock_file), os.O_CREAT | os.O_WRONLY | os.O_EXCL, 0o600)
            
            # Platform-specific locking
            if self.system == 'windows' and msvcrt:
                msvcrt.locking(self.lock_fd, msvcrt.LK_NBLCK, 1)
            elif fcntl:
                fcntl.flock(self.lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                
        except (IOError, OSError) as e:
            if self.lock_fd:
                try:
                    os.close(self.lock_fd)
                except:
                    pass
            self.logger.error("Another backup instance is already running")
            sys.exit(1)

    def release_lock(self):
        """Release file lock"""
        if not self.lock_fd:
            return
            
        try:
            # Release lock
            if self.system == 'windows' and msvcrt:
                try:
                    os.lseek(self.lock_fd, 0, os.SEEK_SET)
                    msvcrt.locking(self.lock_fd, msvcrt.LK_UNLCK, 1)
                except:
                    pass
            elif fcntl:
                try:
                    fcntl.flock(self.lock_fd, fcntl.LOCK_UN)
                except:
                    pass
            
            # Close and remove lock file
            os.close(self.lock_fd)
            try:
                os.remove('backup.lock')
            except:
                pass
                
        except Exception:
            pass
        
        self.lock_fd = None

    def load_config(self, config_file):
        """Load configuration from INI file"""
        config_path = Path(config_file)
        
        # Create default config if doesn't exist
        if not config_path.exists():
            self.create_default_config(config_file)
        
        # Read configuration
        config = configparser.ConfigParser()
        config.read(str(config_path))
        
        # Load and validate settings
        try:
            # Source directories
            source_str = config['DEFAULT'].get('SourceDirs', '')
            self.source_dirs = [d.strip() for d in source_str.split(',') if d.strip()]
            
            # Backup directory
            self.backup_dir = config['DEFAULT'].get('BackupDir', './backups')
            Path(self.backup_dir).mkdir(parents=True, exist_ok=True)
            
            # Backup settings
            self.backup_type = config['DEFAULT'].get('BackupType', 'incremental').lower()
            if self.backup_type not in ['incremental', 'full']:
                self.backup_type = 'incremental'
            
            self.max_backups = max(1, config['DEFAULT'].getint('MaxBackups', 5))
            
            # Exclude patterns
            exclude_str = config['DEFAULT'].get('ExcludePatterns', '')
            self.exclude_patterns = [p.strip() for p in exclude_str.split(',') if p.strip()]
            
            # Schedule
            self.schedule_time = config['DEFAULT'].get('ScheduleTime', '02:00')
            
            # Email settings
            self.email_enabled = config['DEFAULT'].getboolean('EmailEnabled', False)
            
            if self.email_enabled:
                self.smtp_server = config['DEFAULT'].get('SMTPServer', '')
                self.smtp_port = config['DEFAULT'].getint('SMTPPort', 587)
                self.smtp_user = config['DEFAULT'].get('SMTPUser', '')
                self.smtp_password = config['DEFAULT'].get('SMTPPassword', '')
                self.email_to = config['DEFAULT'].get('EmailTo', '')
            
            # Timezone
            tz_name = config['DEFAULT'].get('EmailTimezone', 'UTC')
            try:
                self.tz = pytz.timezone(tz_name)
            except:
                self.tz = pytz.UTC
            
        except Exception as e:
            self.logger.error(f"Config parsing error: {e}")
            # Continue with defaults
        
        # Validate source directories
        valid_dirs = []
        for src_dir in self.source_dirs:
            src_path = Path(src_dir)
            if src_path.exists() and src_path.is_dir():
                valid_dirs.append(str(src_path))
            else:
                self.logger.warning(f"Invalid source directory: {src_dir}")
        
        self.source_dirs = valid_dirs
        
        if not self.source_dirs:
            self.logger.warning("No valid source directories configured")

    def save_config(self, config_file, config_data):
        """Save configuration to INI file"""
        config = configparser.ConfigParser()
        config['DEFAULT'] = config_data
        
        try:
            with open(config_file, 'w') as f:
                config.write(f)
            self.logger.info(f"Configuration saved to {config_file}")
            
            # Reload configuration
            self.load_config(config_file)
            
        except Exception as e:
            self.logger.error(f"Failed to save config: {e}")
            raise

    def create_default_config(self, config_file):
        """Create default configuration file"""
        is_windows = self.system == 'windows'
        
        config = configparser.ConfigParser()
        config['DEFAULT'] = {
            'SourceDirs': 'C:\\Users\\Documents' if is_windows else '/home/user/documents',
            'BackupDir': 'C:\\Backups' if is_windows else './backups',
            'BackupType': 'incremental',
            'MaxBackups': '5',
            'ExcludePatterns': '*.tmp,*.log,*.cache,thumbs.db,.DS_Store',
            'ScheduleTime': '02:00',
            'EmailEnabled': 'False',
            'SMTPServer': 'smtp.gmail.com',
            'SMTPPort': '587',
            'SMTPUser': '',
            'SMTPPassword': '',
            'EmailTo': '',
            'EmailTimezone': 'UTC'
        }
        
        try:
            with open(config_file, 'w') as f:
                config.write(f)
            self.logger.info(f"Created default config: {config_file}")
        except Exception as e:
            self.logger.error(f"Failed to create default config: {e}")

    def get_files_to_backup(self, source_dir, last_backup_time=None):
        """Get list of files to backup from source directory"""
        files = []
        source_path = Path(source_dir)
        
        if not source_path.exists():
            return files
        
        # Convert patterns to lowercase for case-insensitive matching
        exclude_patterns = [p.lower() for p in self.exclude_patterns]
        
        try:
            for item in source_path.rglob('*'):
                if not item.is_file():
                    continue
                
                # Check exclusions
                item_name = item.name.lower()
                if any(fnmatch.fnmatch(item_name, pattern) for pattern in exclude_patterns):
                    continue
                
                # Check modification time for incremental backup
                if self.backup_type == 'incremental' and last_backup_time:
                    try:
                        mtime = datetime.datetime.fromtimestamp(item.stat().st_mtime, tz=pytz.UTC)
                        if mtime <= last_backup_time:
                            continue
                    except:
                        continue
                
                files.append(str(item))
                
        except Exception as e:
            self.logger.error(f"Error scanning {source_dir}: {e}")
        
        return files

    def create_zip(self, files, backup_name):
        """Create zip archive of files"""
        if not files:
            self.logger.info("No files to backup")
            return None
        
        zip_path = Path(self.backup_dir) / f"{backup_name}.zip"
        
        try:
            with zipfile.ZipFile(str(zip_path), 'w', zipfile.ZIP_DEFLATED) as zf:
                for i, file_path in enumerate(files):
                    try:
                        # Create archive name preserving directory structure
                        file_obj = Path(file_path)
                        
                        # Find which source dir this file belongs to
                        archive_name = file_obj.name
                        for src_dir in self.source_dirs:
                            src_path = Path(src_dir)
                            try:
                                archive_name = str(file_obj.relative_to(src_path.parent))
                                break
                            except ValueError:
                                continue
                        
                        zf.write(file_path, archive_name)
                        
                        # Progress callback every 100 files
                        if self.progress_callback and (i + 1) % 100 == 0:
                            self.progress_callback(f"Archived {i + 1}/{len(files)} files")
                            
                    except Exception as e:
                        self.logger.error(f"Failed to add {file_path}: {e}")
            
            # Final progress
            if self.progress_callback:
                self.progress_callback(f"Created backup: {backup_name}.zip ({len(files)} files)")
            
            self.logger.info(f"Created backup: {zip_path}")
            return str(zip_path)
            
        except Exception as e:
            self.logger.error(f"Failed to create zip: {e}")
            return None

    def cleanup_old_backups(self):
        """Remove old backups exceeding max_backups limit"""
        try:
            backup_dir = Path(self.backup_dir)
            backups = sorted([f for f in backup_dir.glob('backup_*.zip')])
            
            while len(backups) > self.max_backups:
                old_backup = backups.pop(0)
                try:
                    old_backup.unlink()
                    self.logger.info(f"Removed old backup: {old_backup.name}")
                except Exception as e:
                    self.logger.error(f"Failed to remove {old_backup}: {e}")
                    
        except Exception as e:
            self.logger.error(f"Cleanup failed: {e}")

    def send_email(self, subject, message):
        """Send email notification"""
        if not self.email_enabled:
            return
        
        # Check required fields
        if not all([self.smtp_server, self.smtp_user, self.smtp_password, self.email_to]):
            self.logger.warning("Email configuration incomplete")
            return
        
        try:
            import smtplib
            from email.mime.text import MIMEText
            
            msg = MIMEText(message)
            msg['Subject'] = subject
            msg['From'] = self.smtp_user
            msg['To'] = self.email_to
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=10) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
                
            self.logger.info(f"Email sent: {subject}")
            
        except Exception as e:
            self.logger.error(f"Email failed: {e}")

    def list_archive_contents(self, zip_path):
        """List contents of backup archive"""
        contents = []
        
        try:
            with zipfile.ZipFile(zip_path, 'r') as zf:
                for info in zf.infolist():
                    if not info.is_dir():
                        contents.append({
                            'path': info.filename,
                            'size': info.file_size,
                            'mtime': datetime.datetime(*info.date_time).strftime('%Y-%m-%d %H:%M:%S')
                        })
        except Exception as e:
            self.logger.error(f"Failed to read archive {zip_path}: {e}")
        
        return contents

    def run_backup(self):
        """Execute backup process"""
        start_time = datetime.datetime.now(tz=self.tz)
        
        try:
            # Check if we have source directories
            if not self.source_dirs:
                error_msg = "No valid source directories configured"
                self.logger.error(error_msg)
                if self.progress_callback:
                    self.progress_callback(error_msg)
                return
            
            # Progress update
            if self.progress_callback:
                self.progress_callback(f"Starting backup at {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
            
            # Get last backup time for incremental
            last_backup_time = None
            if self.backup_type == 'incremental':
                try:
                    backup_dir = Path(self.backup_dir)
                    backups = sorted(backup_dir.glob('backup_*.zip'))
                    if backups:
                        latest = backups[-1]
                        last_backup_time = datetime.datetime.fromtimestamp(
                            latest.stat().st_mtime, tz=pytz.UTC
                        )
                        self.logger.info(f"Last backup: {latest.name}")
                except Exception as e:
                    self.logger.warning(f"Could not determine last backup time: {e}")
            
            # Collect files from all sources
            all_files = []
            for src_dir in self.source_dirs:
                if self.progress_callback:
                    self.progress_callback(f"Scanning {src_dir}...")
                    
                files = self.get_files_to_backup(src_dir, last_backup_time)
                all_files.extend(files)
                
                self.logger.info(f"Found {len(files)} files in {src_dir}")
            
            # Check if there are files to backup
            if not all_files:
                msg = "No new files to backup" if self.backup_type == 'incremental' else "No files to backup"
                self.logger.info(msg)
                if self.progress_callback:
                    self.progress_callback(msg)
                return
            
            # Create backup
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"backup_{timestamp}"
            
            if self.progress_callback:
                self.progress_callback(f"Creating backup with {len(all_files)} files...")
            
            zip_path = self.create_zip(all_files, backup_name)
            
            if zip_path:
                # Cleanup old backups
                self.cleanup_old_backups()
                
                # Calculate duration
                duration = (datetime.datetime.now(tz=self.tz) - start_time).total_seconds()
                
                # Success message
                success_msg = f"Backup completed: {backup_name}.zip ({len(all_files)} files, {duration:.1f}s)"
                self.logger.info(success_msg)
                
                if self.progress_callback:
                    self.progress_callback(success_msg)
                
                # Send email notification
                self.send_email(
                    f"Backup Success - {backup_name}",
                    f"Backup completed successfully\n\n"
                    f"Files: {len(all_files)}\n"
                    f"Duration: {duration:.1f} seconds\n"
                    f"Location: {zip_path}"
                )
            else:
                raise Exception("Failed to create backup archive")
                
        except Exception as e:
            error_msg = f"Backup failed: {e}"
            self.logger.error(error_msg)
            
            if self.progress_callback:
                self.progress_callback(error_msg)
            
            self.send_email("Backup Failed", str(e))
            
        finally:
            # Always release lock
            self.release_lock()

    def schedule_backup(self, enable=True):
        """Enable or disable scheduled backup"""
        schedule.clear()
        
        if enable:
            try:
                # Validate time format
                time.strptime(self.schedule_time, '%H:%M')
                
                # Schedule daily backup
                schedule.every().day.at(self.schedule_time).do(self.run_backup)
                self.logger.info(f"Scheduled daily backup at {self.schedule_time}")
                
                if self.progress_callback:
                    self.progress_callback(f"Scheduled backup at {self.schedule_time}")
                    
            except ValueError:
                self.logger.error(f"Invalid schedule time format: {self.schedule_time}")
                raise
        else:
            self.logger.info("Schedule cleared")
            if self.progress_callback:
                self.progress_callback("Schedule stopped")


def main():
    """Main entry point for command-line usage"""
    # Setup signal handlers
    def signal_handler(signum, frame):
        print("\nShutdown signal received")
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Parse command line arguments
    if len(sys.argv) > 1 and sys.argv[1] == '--schedule':
        # Run in schedule mode
        try:
            backup = BackupTool()
            backup.schedule_backup(True)
            
            print(f"Backup scheduled at {backup.schedule_time}")
            print("Press Ctrl+C to stop")
            
            while True:
                schedule.run_pending()
                time.sleep(60)
                
        except KeyboardInterrupt:
            print("\nSchedule stopped")
        except Exception as e:
            print(f"Error: {e}")
            sys.exit(1)
    else:
        # Run single backup
        try:
            backup = BackupTool()
            backup.run_backup()
        except Exception as e:
            print(f"Backup failed: {e}")
            sys.exit(1)


if __name__ == "__main__":
    main()
